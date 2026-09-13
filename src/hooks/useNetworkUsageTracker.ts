import { useEffect, useRef } from 'react';
import { HotspotActiveUser } from '../types';
import { incrementDailyNetworkLog } from '../services/networkLogsService';

const TRACKER_KEY = 'mikrotik_network_tracker_v1';

export const useNetworkUsageTracker = (activeUsers: HotspotActiveUser[], isConnected: boolean) => {
  const lastProcessedRef = useRef<Record<string, { bytesIn: number; bytesOut: number }>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (!isConnected || !activeUsers || activeUsers.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Load state from local storage on first run
    if (!initialized.current) {
      try {
        const stored = localStorage.getItem(TRACKER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.date === today && parsed.sessions) {
            lastProcessedRef.current = parsed.sessions;
          }
        }
      } catch (e) {
        console.warn('Failed to parse network tracker state');
      }
      initialized.current = true;
    }

    let totalDownDelta = 0;
    let totalUpDelta = 0;
    const currentSessions: Record<string, { bytesIn: number; bytesOut: number }> = {};

    activeUsers.forEach(user => {
      const key = user.id || user.user || user.macAddress;
      if (!key) return;

      const currentDown = user.bytesOut || 0; // Download for user is bytesOut from router
      const currentUp = user.bytesIn || 0;    // Upload for user is bytesIn from router
      
      currentSessions[key] = { bytesIn: currentUp, bytesOut: currentDown };

      const prev = lastProcessedRef.current[key];
      if (prev) {
        const downDiff = currentDown - prev.bytesOut;
        const upDiff = currentUp - prev.bytesIn;
        
        if (downDiff > 0) totalDownDelta += downDiff;
        if (upDiff > 0) totalUpDelta += upDiff;
      } else {
        // New session since last check. Add its total bytes to the delta.
        // If it's a completely new session, it will be small.
        // If the user just opened the app, we include the current active session's bytes in today's total.
        if (currentDown > 0) totalDownDelta += currentDown;
        if (currentUp > 0) totalUpDelta += currentUp;
      }
    });

    // Save current state back to local storage
    localStorage.setItem(TRACKER_KEY, JSON.stringify({
      date: today,
      sessions: currentSessions
    }));
    
    lastProcessedRef.current = currentSessions;

    // If we have meaningful deltas, sync to Firestore
    if (totalDownDelta > 0 || totalUpDelta > 0) {
      incrementDailyNetworkLog(today, totalDownDelta, totalUpDelta).catch(err => {
        console.warn('Failed to auto-sync daily network log', err);
      });
    }

  }, [activeUsers, isConnected]);
};
