import { useEffect, useRef, useState, useCallback } from 'react';
import { MikroTikConfig, HotspotActiveUser, CardCategory } from '../types';
import { fetchActiveHotspotUsers, fetchMikrotikSessions, fetchUserManagerDailyReport } from '../utils/mikrotikApi';
import { syncCurrentActiveUsersToDailyLog } from './useNetworkUsageTracker';
import {
  syncReconstructedDayLog,
  getDailyNetworkLog,
  incrementDailyNetworkLog,
} from '../services/networkLogsService';
import { getLocalDateString, getYesterdayDateString } from '../utils/dateUtils';
import {
  loadCardUsageLogs,
  saveCardUsageLogs,
  mergeSessionsIntoDailyLedger,
} from '../utils/cardUsageTracker';

export interface GlobalNetworkSyncResult {
  isAutoSyncing: boolean;
  isManualSyncing: boolean;
  lastSyncedAt: Date | null;
  syncStatusMessage: string | null;
  syncNow: () => Promise<{ success: boolean; message: string }>;
  reconcileYesterdayAndToday: () => Promise<{ success: boolean; message: string }>;
}

export function useGlobalNetworkUsageSync(
  config?: Partial<MikroTikConfig>,
  categories: CardCategory[] = [],
  tenantId: string = 'system',
  autoIntervalSeconds: number = 25
): GlobalNetworkSyncResult {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  const isRunningRef = useRef(false);

  // Core sync cycle
  const runSyncCycle = useCallback(
    async (isManual = false): Promise<{ success: boolean; message: string }> => {
      if (!config?.host || config.host.trim() === '') {
        return { success: false, message: 'عنوان الراوتر غير مهيأ' };
      }
      if (isRunningRef.current && !isManual) {
        return { success: true, message: 'مزامنة جارية بالفعل في الخلفية' };
      }

      isRunningRef.current = true;
      if (isManual) setIsManualSyncing(true);
      else setIsAutoSyncing(true);

      try {
        // 1. Fetch live router sessions
        const res = await fetchMikrotikSessions(config);
        const sessions = res.success ? res.sessions || [] : [];
        const routerId = res.routerIdentity || 'MikroTik Router';

        // 2. Map to HotspotActiveUser shape
        const activeUsers: HotspotActiveUser[] = sessions
          .filter((s) => s.isActive)
          .map((s) => ({
            id: s.id,
            user: s.user,
            address: s.address,
            macAddress: s.macAddress,
            uptime: s.uptime,
            bytesIn: s.uploadBytes,
            bytesOut: s.downloadBytes,
            packetsIn: s.packetsIn,
            packetsOut: s.packetsOut,
            loginBy: s.loginBy,
            comment: s.comment,
            server: s.server,
          }));

        // 3. Sync to daily network logs (handles local date & deltas)
        let syncRes = { success: true, message: 'تم التحقق' };
        if (activeUsers.length > 0) {
          syncRes = await syncCurrentActiveUsersToDailyLog(activeUsers, routerId);
        }

        // 4. Also update persistent CardDailyUsage ledger in localStorage
        if (sessions.length > 0) {
          const today = getLocalDateString();
          const currentLedger = loadCardUsageLogs();
          const { updatedLedger } = mergeSessionsIntoDailyLedger(
            currentLedger,
            sessions,
            categories,
            tenantId,
            today
          );
          saveCardUsageLogs(updatedLedger);
        }

        setLastSyncedAt(new Date());
        setSyncStatusMessage(syncRes.message || 'تمت المزامنة الحية بنجاح');
        return { success: true, message: syncRes.message || 'تمت المزامنة بنجاح' };
      } catch (err: any) {
        console.warn('[GlobalNetworkSync] Cycle notice:', err.message);
        return { success: false, message: err.message || 'حدث خطأ أثناء المزامنة' };
      } finally {
        isRunningRef.current = false;
        if (isManual) setIsManualSyncing(false);
        else setIsAutoSyncing(false);
      }
    },
    [config, categories, tenantId]
  );

  // Manual Trigger
  const syncNow = useCallback(async () => {
    return await runSyncCycle(true);
  }, [runSyncCycle]);

  // Deep Reconcile Yesterday and Today from Router User Manager & Active Sessions
  const reconcileYesterdayAndToday = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!config?.host) {
      return { success: false, message: 'عنوان الراوتر غير مهيأ' };
    }

    setIsManualSyncing(true);
    try {
      const todayStr = getLocalDateString();
      const yesterdayStr = getYesterdayDateString();

      // 1. Fetch User Manager reports for yesterday and today
      const [yesterdayReportRes, todayReportRes, liveSessionsRes] = await Promise.all([
        fetchUserManagerDailyReport(config, yesterdayStr).catch(() => ({ success: false, data: null })),
        fetchUserManagerDailyReport(config, todayStr).catch(() => ({ success: false, data: null })),
        fetchMikrotikSessions(config).catch(() => ({ success: false, sessions: [] })),
      ]);

      let yesterdaySynced = false;
      let todaySynced = false;

      // Process Yesterday
      if (yesterdayReportRes.success && yesterdayReportRes.data?.summary) {
        const sum = yesterdayReportRes.data.summary;
        const dl = sum.cardsDownloadBytes || 0;
        const ul = sum.cardsUploadBytes || 0;
        if (dl > 0 || ul > 0) {
          await syncReconstructedDayLog(yesterdayStr, dl, ul, {
            activeUsersCount: sum.totalActiveCardsToday || sum.totalSessionsToday || 0,
            routerIdentity: config.host,
            notes: 'تمت مطابقة وإعادة بناء الاستهلاك من جلسات User Manager',
          });
          yesterdaySynced = true;
        }
      }

      // Process Today
      if (todayReportRes.success && todayReportRes.data?.summary) {
        const sum = todayReportRes.data.summary;
        const dl = sum.cardsDownloadBytes || 0;
        const ul = sum.cardsUploadBytes || 0;
        if (dl > 0 || ul > 0) {
          // If Firestore currently has less or 0, update it
          const curLog = await getDailyNetworkLog(todayStr);
          if (!curLog || curLog.totalBytes < (dl + ul)) {
            await syncReconstructedDayLog(todayStr, dl, ul, {
              activeUsersCount: sum.totalActiveCardsToday || sum.activeCardsNow || 0,
              routerIdentity: config.host,
              notes: 'تمت مطابقة استهلاك اليوم من User Manager والمتصلين الفعليين',
            });
            todaySynced = true;
          }
        }
      }

      // Also run normal live active users sync for right now
      if (liveSessionsRes.success && liveSessionsRes.sessions) {
        const activeUsers: HotspotActiveUser[] = liveSessionsRes.sessions
          .filter((s: any) => s.isActive)
          .map((s: any) => ({
            id: s.id,
            user: s.user,
            address: s.address,
            macAddress: s.macAddress,
            uptime: s.uptime,
            bytesIn: s.uploadBytes,
            bytesOut: s.downloadBytes,
            packetsIn: s.packetsIn,
            packetsOut: s.packetsOut,
            loginBy: s.loginBy,
            comment: s.comment,
            server: s.server,
          }));

        if (activeUsers.length > 0) {
          await syncCurrentActiveUsersToDailyLog(activeUsers, (liveSessionsRes as any)?.routerIdentity || config.host);
          todaySynced = true;
        }
      }

      setLastSyncedAt(new Date());
      const msg = `تمت مطابقة استهلاك أمس (${yesterdayStr}) واليوم (${todayStr}) بنجاح من بيانات الراوتر`;
      setSyncStatusMessage(msg);
      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('Reconcile error:', err);
      return { success: false, message: err.message || 'تعذر مطابقة بيانات الاستهلاك' };
    } finally {
      setIsManualSyncing(false);
    }
  }, [config]);

  // Background timer
  useEffect(() => {
    if (!config?.host) return;

    // Run initial sync shortly after mount
    const initialTimer = setTimeout(() => {
      runSyncCycle(false);
    }, 2000);

    const interval = Math.max(15, autoIntervalSeconds) * 1000;
    const intervalTimer = setInterval(() => {
      runSyncCycle(false);
    }, interval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [config?.host, autoIntervalSeconds, runSyncCycle]);

  return {
    isAutoSyncing,
    isManualSyncing,
    lastSyncedAt,
    syncStatusMessage,
    syncNow,
    reconcileYesterdayAndToday,
  };
}
