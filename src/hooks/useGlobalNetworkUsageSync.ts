import { useEffect, useRef, useState, useCallback } from 'react';
import { MikroTikConfig, HotspotActiveUser, CardCategory, DataSyncHistoryItem } from '../types';
import { fetchMikrotikSessions, fetchUserManagerDailyReport } from '../utils/mikrotikApi';
import { syncCurrentActiveUsersToDailyLog } from './useNetworkUsageTracker';
import { runCumulativeSync } from './useCumulativeSync';
import {
  syncReconstructedDayLog,
  getDailyNetworkLog,
  DailyNetworkLog,
} from '../services/networkLogsService';
import { getLocalDateString, getYesterdayDateString } from '../utils/dateUtils';
import {
  loadCardUsageLogs,
  saveCardUsageLogs,
  mergeSessionsIntoDailyLedger,
} from '../utils/cardUsageTracker';

const STORAGE_SYNC_ENABLED_KEY = 'mikrotik_data_sync_enabled';
const STORAGE_SYNC_INTERVAL_KEY = 'mikrotik_data_sync_interval';
const STORAGE_SYNC_HISTORY_KEY = 'mikrotik_data_sync_history_v1';

export interface GlobalNetworkSyncResult {
  // Sync state
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  intervalSeconds: number;
  setIntervalSeconds: (seconds: number) => void;
  countdownSeconds: number;
  isSyncing: boolean;
  isAutoSyncing: boolean;
  isManualSyncing: boolean;
  lastSyncedAt: Date | null;
  syncStatusMessage: string | null;
  todayLog: DailyNetworkLog | null;
  syncHistory: DataSyncHistoryItem[];
  cycleCount: number;

  // Actions
  syncNow: () => Promise<{ success: boolean; message: string }>;
  reconcileYesterdayAndToday: () => Promise<{ success: boolean; message: string }>;
  clearSyncHistory: () => void;
}

export function useGlobalNetworkUsageSync(
  config?: Partial<MikroTikConfig>,
  categories: CardCategory[] = [],
  tenantId: string = 'system',
  defaultIntervalSeconds: number = 60, // Default 1 minute as requested
  canSync: boolean = true // RBAC permission check
): GlobalNetworkSyncResult {
  // Persistence for user preferences
  const [isEnabled, setIsEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SYNC_ENABLED_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [intervalSeconds, setIntervalSecondsState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SYNC_INTERVAL_KEY);
      const parsed = saved ? parseInt(saved, 10) : 60;
      return parsed >= 15 ? parsed : 60;
    } catch {
      return defaultIntervalSeconds >= 15 ? defaultIntervalSeconds : 60;
    }
  });

  const [countdownSeconds, setCountdownSeconds] = useState<number>(intervalSeconds);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem('mikrotik_data_sync_last_time');
      return raw ? new Date(raw) : null;
    } catch {
      return null;
    }
  });
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [todayLog, setTodayLog] = useState<DailyNetworkLog | null>(null);
  const [cycleCount, setCycleCount] = useState<number>(0);

  // History state
  const [syncHistory, setSyncHistory] = useState<DataSyncHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SYNC_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const isRunningRef = useRef(false);

  // Setters with localStorage persistence
  const setIsEnabled = useCallback((val: boolean) => {
    setIsEnabledState(val);
    try {
      localStorage.setItem(STORAGE_SYNC_ENABLED_KEY, String(val));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const setIntervalSeconds = useCallback((sec: number) => {
    const valid = Math.max(15, sec);
    setIntervalSecondsState(valid);
    setCountdownSeconds(valid);
    try {
      localStorage.setItem(STORAGE_SYNC_INTERVAL_KEY, String(valid));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const clearSyncHistory = useCallback(() => {
    setSyncHistory([]);
    try {
      localStorage.removeItem(STORAGE_SYNC_HISTORY_KEY);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Helper to append to history
  const addHistoryItem = useCallback((item: Omit<DataSyncHistoryItem, 'id'>) => {
    const newItem: DataSyncHistoryItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    setSyncHistory((prev) => {
      const updated = [newItem, ...prev.slice(0, 14)];
      try {
        localStorage.setItem(STORAGE_SYNC_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  }, []);

  // Fetch current today's log from Firestore
  const refreshTodayLog = useCallback(async () => {
    try {
      const todayStr = getLocalDateString();
      const log = await getDailyNetworkLog(todayStr);
      if (log) setTodayLog(log);
    } catch (err) {
      console.warn('Failed to refresh today log:', err);
    }
  }, []);

  // Core sync cycle (Runs every minute in background)
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

      const syncStartTime = new Date();
      const timeFormatted = syncStartTime.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      try {
        // 1. Fetch live router sessions and active hotspot users with fastSync and .proplist optimizations
        const res = await fetchMikrotikSessions({ ...config, fastSync: true, activeOnly: true });
        const sessions = res.success ? res.sessions || [] : [];
        const routerId = (res as any)?.routerIdentity || config.routerIdentity || config.host || 'MikroTik Router';
        const cycleDurationMs = res.durationMs || Math.max(1, Date.now() - syncStartTime.getTime());

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
        let syncRes = { success: true, downAdded: 0, upAdded: 0, message: 'تم التحقق من استهلاك الشبكة' };
        if (activeUsers.length > 0) {
          syncRes = await syncCurrentActiveUsersToDailyLog(activeUsers, routerId);
        }

        // 4. Update persistent CardDailyUsage ledger in localStorage
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

        // 5. Update state & history
        const now = new Date();
        setLastSyncedAt(now);
        setSyncStatusMessage(syncRes.message || 'تمت المزامنة بنجاح');
        setCycleCount((c) => c + 1);

        try {
          localStorage.setItem('mikrotik_data_sync_last_time', now.toISOString());
        } catch (e) {
          console.warn(e);
        }

        addHistoryItem({
          timestamp: timeFormatted,
          type: isManual ? 'manual' : 'auto',
          success: true,
          downAddedBytes: syncRes.downAdded || 0,
          upAddedBytes: syncRes.upAdded || 0,
          totalAddedBytes: (syncRes.downAdded || 0) + (syncRes.upAdded || 0),
          activeUsersCount: activeUsers.length,
          message: syncRes.message,
          durationMs: cycleDurationMs,
          fastMode: true,
        });

        // 6. Refresh today log
        await refreshTodayLog();

        return { success: true, message: syncRes.message || 'تمت المزامنة بنجاح' };
      } catch (err: any) {
        console.warn('[ScheduledDataSync] Cycle notice:', err.message);
        const errMsg = err.message || 'تعذر الاتصال بالمايكروتك';
        setSyncStatusMessage(errMsg);

        addHistoryItem({
          timestamp: timeFormatted,
          type: isManual ? 'manual' : 'auto',
          success: false,
          downAddedBytes: 0,
          upAddedBytes: 0,
          totalAddedBytes: 0,
          activeUsersCount: 0,
          message: errMsg,
          durationMs: Math.max(1, Date.now() - syncStartTime.getTime()),
          fastMode: true,
        });

        return { success: false, message: errMsg };
      } finally {
        isRunningRef.current = false;
        if (isManual) setIsManualSyncing(false);
        else setIsAutoSyncing(false);
        setCountdownSeconds(intervalSeconds);
      }
    },
    [config, categories, tenantId, intervalSeconds, addHistoryItem, refreshTodayLog]
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
    const syncStartTime = new Date();
    const timeFormatted = syncStartTime.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
      let totalDown = 0;
      let totalUp = 0;

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
          totalDown += dl;
          totalUp += ul;
        }
      }

      // Process Today
      if (todayReportRes.success && todayReportRes.data?.summary) {
        const sum = todayReportRes.data.summary;
        const dl = sum.cardsDownloadBytes || 0;
        const ul = sum.cardsUploadBytes || 0;
        if (dl > 0 || ul > 0) {
          const curLog = await getDailyNetworkLog(todayStr);
          if (!curLog || curLog.totalBytes < (dl + ul)) {
            await syncReconstructedDayLog(todayStr, dl, ul, {
              activeUsersCount: sum.totalActiveCardsToday || sum.activeCardsNow || 0,
              routerIdentity: config.host,
              notes: 'تمت مطابقة استهلاك اليوم من User Manager والمتصلين الفعليين',
            });
            todaySynced = true;
            totalDown += dl;
            totalUp += ul;
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

      const now = new Date();
      setLastSyncedAt(now);
      const msg = `تمت مطابقة استهلاك أمس (${yesterdayStr}) واليوم (${todayStr}) بنجاح من بيانات الراوتر`;
      setSyncStatusMessage(msg);

      addHistoryItem({
        timestamp: timeFormatted,
        type: 'reconcile',
        success: true,
        downAddedBytes: totalDown,
        upAddedBytes: totalUp,
        totalAddedBytes: totalDown + totalUp,
        activeUsersCount: liveSessionsRes.sessions?.length || 0,
        message: msg,
      });

      await refreshTodayLog();
      return { success: true, message: msg };
    } catch (err: any) {
      console.warn('Reconcile error:', err);
      const errMsg = err.message || 'تعذر مطابقة بيانات الاستهلاك';
      addHistoryItem({
        timestamp: timeFormatted,
        type: 'reconcile',
        success: false,
        downAddedBytes: 0,
        upAddedBytes: 0,
        totalAddedBytes: 0,
        activeUsersCount: 0,
        message: errMsg,
      });
      return { success: false, message: errMsg };
    } finally {
      setIsManualSyncing(false);
      setCountdownSeconds(intervalSeconds);
    }
  }, [config, addHistoryItem, intervalSeconds, refreshTodayLog]);

  // Initial fetch of today's log
  useEffect(() => {
    refreshTodayLog();
  }, [refreshTodayLog]);

  // 1-second countdown ticker & scheduled execution
  useEffect(() => {
    if (!canSync || !isEnabled || !config?.host) {
      return;
    }

    // Run first sync shortly after mounting (3 seconds)
    const initialTimeout = setTimeout(() => {
      runSyncCycle(false);
    }, 3000);

    const ticker = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Trigger scheduled sync
          runSyncCycle(false);
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(ticker);
    };
  }, [canSync, isEnabled, config?.host, intervalSeconds, runSyncCycle]);

  // Comprehensive Cumulative Sync on Mount & every 10 cycles
  const hasRunInitialCumulative = useRef(false);
  useEffect(() => {
    if (!canSync || !config?.host) return;
    
    if (!hasRunInitialCumulative.current) {
      hasRunInitialCumulative.current = true;
      console.log('Running initial cumulative sync on mount to catch up missed data...');
      runCumulativeSync(config).then(res => {
        if (res.success && res.totalAddedBytes && res.totalAddedBytes > 0) {
          addHistoryItem({
            timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'auto',
            success: true,
            downAddedBytes: res.downAdded,
            upAddedBytes: res.upAdded,
            totalAddedBytes: res.totalAddedBytes,
            activeUsersCount: 0,
            message: res.message + ' (بعد فتح البرنامج)',
            durationMs: 0,
            fastMode: false,
          });
          refreshTodayLog();
        }
      }).catch(console.error);
    } else if (cycleCount > 0 && cycleCount % 10 === 0) {
      // Also run periodically
      runCumulativeSync(config).catch(console.error);
    }
  }, [cycleCount, config, refreshTodayLog, addHistoryItem]);

  return {
    isEnabled,
    setIsEnabled,
    intervalSeconds,
    setIntervalSeconds,
    countdownSeconds,
    isSyncing: isAutoSyncing || isManualSyncing,
    isAutoSyncing,
    isManualSyncing,
    lastSyncedAt,
    syncStatusMessage,
    todayLog,
    syncHistory,
    cycleCount,
    syncNow,
    reconcileYesterdayAndToday,
    clearSyncHistory,
  };
}
