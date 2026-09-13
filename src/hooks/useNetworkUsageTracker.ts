import { useEffect, useRef, useCallback } from 'react';
import { HotspotActiveUser } from '../types';
import { incrementDailyNetworkLog, saveDailyNetworkLog, getDailyNetworkLog } from '../services/networkLogsService';

const TRACKER_KEY = 'mikrotik_network_tracker_v1';

export const syncCurrentActiveUsersToDailyLog = async (
  activeUsers: HotspotActiveUser[],
  routerIdentity?: string
): Promise<{ success: boolean; downAdded: number; upAdded: number; message: string }> => {
  if (!activeUsers || activeUsers.length === 0) {
    return { success: false, downAdded: 0, upAdded: 0, message: 'لا يوجد مستخدمين نشطين حالياً في الراوتر' };
  }

  const today = new Date().toISOString().split('T')[0];
  const storedRaw = localStorage.getItem(TRACKER_KEY);
  let prevSessions: Record<string, { bytesIn: number; bytesOut: number }> = {};
  if (storedRaw) {
    try {
      const parsed = JSON.parse(storedRaw);
      if (parsed.date === today && parsed.sessions) {
        prevSessions = parsed.sessions;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  let totalDownDelta = 0;
  let totalUpDelta = 0;
  const currentSessions: Record<string, { bytesIn: number; bytesOut: number }> = {};

  activeUsers.forEach((user) => {
    const key = user.id || user.user || user.macAddress;
    if (!key) return;

    const currentDown = user.bytesOut || 0;
    const currentUp = user.bytesIn || 0;
    currentSessions[key] = { bytesIn: currentUp, bytesOut: currentDown };

    const prev = prevSessions[key];
    if (prev) {
      const downDiff = currentDown - prev.bytesOut;
      const upDiff = currentUp - prev.bytesIn;
      if (downDiff > 0) totalDownDelta += downDiff;
      if (upDiff > 0) totalUpDelta += upDiff;
    } else {
      if (currentDown > 0) totalDownDelta += currentDown;
      if (currentUp > 0) totalUpDelta += currentUp;
    }
  });

  // If no delta was detected but we have active traffic and existing doc might be empty
  if (totalDownDelta === 0 && totalUpDelta === 0) {
    // Check if doc exists in Firestore, if not seed it with current active total
    const existing = await getDailyNetworkLog(today);
    if (!existing || existing.totalBytes === 0) {
      const curDown = activeUsers.reduce((sum, u) => sum + (u.bytesOut || 0), 0);
      const curUp = activeUsers.reduce((sum, u) => sum + (u.bytesIn || 0), 0);
      if (curDown > 0 || curUp > 0) {
        await saveDailyNetworkLog({
          date: today,
          downloadBytes: curDown,
          uploadBytes: curUp,
          totalBytes: curDown + curUp,
          notes: 'تسجيل يدوي فوري من الجلسات الحالية',
          activeUsersCount: activeUsers.length,
          routerIdentity: routerIdentity || 'MikroTik Router',
        });
        localStorage.setItem(
          TRACKER_KEY,
          JSON.stringify({ date: today, sessions: currentSessions })
        );
        return {
          success: true,
          downAdded: curDown,
          upAdded: curUp,
          message: 'تم حفظ الاستهلاك الحالي في قاعدة البيانات بنجاح',
        };
      }
    }
    return {
      success: true,
      downAdded: 0,
      upAdded: 0,
      message: 'البيانات متزامنة مسبقاً مع قاعدة البيانات ولا توجد سحوبات جديدة',
    };
  }

  await incrementDailyNetworkLog(today, totalDownDelta, totalUpDelta, {
    activeUsersCount: activeUsers.length,
    routerIdentity,
  });

  localStorage.setItem(
    TRACKER_KEY,
    JSON.stringify({ date: today, sessions: currentSessions })
  );

  return {
    success: true,
    downAdded: totalDownDelta,
    upAdded: totalUpDelta,
    message: 'تمت مزامنة الاستهلاك الجديد مع قاعدة البيانات بنجاح',
  };
};

export const useNetworkUsageTracker = (
  activeUsers: HotspotActiveUser[],
  isConnected: boolean,
  routerIdentity?: string
) => {
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

    activeUsers.forEach((user) => {
      const key = user.id || user.user || user.macAddress;
      if (!key) return;

      const currentDown = user.bytesOut || 0; // Download for user is bytesOut from router
      const currentUp = user.bytesIn || 0; // Upload for user is bytesIn from router

      currentSessions[key] = { bytesIn: currentUp, bytesOut: currentDown };

      const prev = lastProcessedRef.current[key];
      if (prev) {
        const downDiff = currentDown - prev.bytesOut;
        const upDiff = currentUp - prev.bytesIn;

        if (downDiff > 0) totalDownDelta += downDiff;
        if (upDiff > 0) totalUpDelta += upDiff;
      } else {
        // New session since last check.
        if (currentDown > 0) totalDownDelta += currentDown;
        if (currentUp > 0) totalUpDelta += currentUp;
      }
    });

    // Save current state back to local storage
    localStorage.setItem(
      TRACKER_KEY,
      JSON.stringify({
        date: today,
        sessions: currentSessions,
      })
    );

    lastProcessedRef.current = currentSessions;

    // If we have meaningful deltas, sync to Firestore
    if (totalDownDelta > 0 || totalUpDelta > 0) {
      incrementDailyNetworkLog(today, totalDownDelta, totalUpDelta, {
        activeUsersCount: activeUsers.length,
        routerIdentity,
      }).catch((err) => {
        console.warn('Failed to auto-sync daily network log', err);
      });
    }
  }, [activeUsers, isConnected, routerIdentity]);
};

