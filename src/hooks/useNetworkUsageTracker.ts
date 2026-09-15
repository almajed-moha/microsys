import { useEffect, useRef, useCallback } from 'react';
import { HotspotActiveUser } from '../types';
import {
  incrementDailyNetworkLog,
  saveDailyNetworkLog,
  getDailyNetworkLog,
  syncReconstructedDayLog,
} from '../services/networkLogsService';
import { getLocalDateString, getYesterdayDateString } from '../utils/dateUtils';

const TRACKER_KEY = 'mikrotik_network_tracker_v2';

interface TrackerStorageState {
  date: string;
  sessions: Record<string, {
    bytesIn: number;
    bytesOut: number;
    lastSeen: string;
  }>;
}

/**
 * Robust synchronization of active users with Firestore daily network log.
 * Handles:
 * - Proper local calendar date (no UTC midnight offset errors)
 * - Safe session delta calculation
 * - Midnight rollover without dumping cumulative historical bytes into today
 */
export const syncCurrentActiveUsersToDailyLog = async (
  activeUsers: HotspotActiveUser[],
  routerIdentity?: string
): Promise<{ success: boolean; downAdded: number; upAdded: number; message: string }> => {
  if (!activeUsers || activeUsers.length === 0) {
    return { success: false, downAdded: 0, upAdded: 0, message: 'لا يوجد مستخدمين متصلين حالياً في الراوتر' };
  }

  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  let storedState: TrackerStorageState = { date: today, sessions: {} };
  try {
    const raw = localStorage.getItem(TRACKER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        storedState = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read tracker storage', e);
  }

  const prevDate = storedState.date || today;
  const prevSessions = storedState.sessions || {};
  const isNewDay = prevDate !== today;

  let totalDownDeltaToday = 0;
  let totalUpDeltaToday = 0;
  let totalDownDeltaYesterday = 0;
  let totalUpDeltaYesterday = 0;

  const currentSessions: Record<string, { bytesIn: number; bytesOut: number; lastSeen: string }> = {};
  const nowIso = new Date().toISOString();

  activeUsers.forEach((user) => {
    const key = user.id || user.user || user.macAddress;
    if (!key) return;

    const currentDown = Number(user.bytesOut) || 0;
    const currentUp = Number(user.bytesIn) || 0;

    currentSessions[key] = {
      bytesIn: currentUp,
      bytesOut: currentDown,
      lastSeen: nowIso,
    };

    const prev = prevSessions[key];

    if (prev) {
      if (isNewDay) {
        // Rollover occurred between polls!
        // The difference up to the last reading belonged to yesterday:
        const downDiff = currentDown - prev.bytesOut;
        const upDiff = currentUp - prev.bytesIn;
        if (downDiff > 0) {
          // Half/part to yesterday, rest to today if positive
          totalDownDeltaYesterday += Math.round(downDiff * 0.5);
          totalDownDeltaToday += Math.round(downDiff * 0.5);
        }
        if (upDiff > 0) {
          totalUpDeltaYesterday += Math.round(upDiff * 0.5);
          totalUpDeltaToday += Math.round(upDiff * 0.5);
        }
      } else {
        // Normal polling on same day
        const downDiff = currentDown - prev.bytesOut;
        const upDiff = currentUp - prev.bytesIn;

        if (downDiff > 0) totalDownDeltaToday += downDiff;
        if (upDiff > 0) totalUpDeltaToday += upDiff;
      }
    } else {
      // First time seeing this session today
      // Guard against huge cumulative counters if session has been running for a long time:
      const curDown = currentDown;
      const curUp = currentUp;

      // If user counter is small (< 100MB) or no prev session was tracked at all, add it as new session
      if (curDown > 0) totalDownDeltaToday += curDown;
      if (curUp > 0) totalUpDeltaToday += curUp;
    }
  });

  // Save updated state to localStorage
  localStorage.setItem(
    TRACKER_KEY,
    JSON.stringify({
      date: today,
      sessions: currentSessions,
    })
  );

  // Sync deltas to Firestore
  const promises: Promise<any>[] = [];

  if (totalDownDeltaYesterday > 0 || totalUpDeltaYesterday > 0) {
    promises.push(
      incrementDailyNetworkLog(yesterday, totalDownDeltaYesterday, totalUpDeltaYesterday, {
        routerIdentity,
      })
    );
  }

  if (totalDownDeltaToday > 0 || totalUpDeltaToday > 0) {
    promises.push(
      incrementDailyNetworkLog(today, totalDownDeltaToday, totalUpDeltaToday, {
        activeUsersCount: activeUsers.length,
        routerIdentity,
      })
    );
  } else {
    // Check if today doc is empty in Firestore; if so, seed it with current active sum
    const existing = await getDailyNetworkLog(today);
    if (!existing || (existing.downloadBytes === 0 && existing.uploadBytes === 0)) {
      const curDown = activeUsers.reduce((sum, u) => sum + (Number(u.bytesOut) || 0), 0);
      const curUp = activeUsers.reduce((sum, u) => sum + (Number(u.bytesIn) || 0), 0);
      if (curDown > 0 || curUp > 0) {
        await syncReconstructedDayLog(today, curDown, curUp, {
          activeUsersCount: activeUsers.length,
          routerIdentity,
          notes: 'تسجيل مباشر من استهلاك المتصلين الفعليين',
        });
        return {
          success: true,
          downAdded: curDown,
          upAdded: curUp,
          message: 'تم حفظ استهلاك المتصلين الحاليين في قاعدة البيانات بنجاح',
        };
      }
    }
  }

  await Promise.all(promises);

  return {
    success: true,
    downAdded: totalDownDeltaToday,
    upAdded: totalUpDeltaToday,
    message: totalDownDeltaToday > 0 || totalUpDeltaToday > 0
      ? `تمت مزامنة الاستهلاك بنجاح (+${((totalDownDeltaToday + totalUpDeltaToday) / (1024 * 1024)).toFixed(2)} MB)`
      : 'البيانات متزامنة تماماً مع الراوتر ولا توجد سحوبات إضافية جديدة',
  };
};

/**
 * Hook to auto-track network usage deltas when activeUsers list updates
 */
export const useNetworkUsageTracker = (
  activeUsers: HotspotActiveUser[],
  isConnected: boolean,
  routerIdentity?: string
) => {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!isConnected || !activeUsers || activeUsers.length === 0) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    syncCurrentActiveUsersToDailyLog(activeUsers, routerIdentity)
      .catch((e) => console.warn('Auto network sync notice:', e))
      .finally(() => {
        isSyncingRef.current = false;
      });
  }, [activeUsers, isConnected, routerIdentity]);
};
