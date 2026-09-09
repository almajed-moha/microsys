import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  NetworkSettings,
  MikroTikConfig,
  CardCategory,
  SalesRecord,
  CardDailyUsageRecord,
  ISPComparisonDaySummary,
  RouterInterface,
  ISPSettings,
} from '../types';
import { fetchMikrotikSessions, fetchRouterInterfaces } from '../utils/mikrotikApi';
import {
  loadCardUsageLogs,
  saveCardUsageLogs,
  loadISPTrafficLogs,
  saveISPTrafficLogs,
  mergeSessionsIntoDailyLedger,
  calculateISPReconciliation,
} from '../utils/cardUsageTracker';

export interface UseContinuousCardTrackerProps {
  settings?: NetworkSettings;
  categories?: CardCategory[];
  sales?: SalesRecord[];
  activeNetworkId?: string;
  onUpdateSettings?: (newSettings: NetworkSettings) => void;
}

export const useContinuousCardTracker = ({
  settings,
  categories = [],
  sales = [],
  activeNetworkId = 'system',
  onUpdateSettings,
}: UseContinuousCardTrackerProps) => {
  // Mikrotik router config
  const mikrotikConfig: Partial<MikroTikConfig> = useMemo(() => {
    return (
      settings?.mikrotikConfig || {
        host: '192.168.88.1',
        port: 8728,
        username: 'admin',
        password: '',
        protocol: 'auto',
        useSsl: false,
      }
    );
  }, [settings]);

  // ISP configuration from network settings
  const ispSettings: ISPSettings = useMemo(() => {
    return (
      settings?.ispSettings || {
        providerName: 'يمن نت / مزود الخدمة الرئيسي',
        wanInterface: 'ether1',
        monthlyQuotaGB: 500,
        monthlyCost: 25000,
        billingCycleStartDay: 1,
        pollingIntervalSeconds: 30,
        isContinuousPollingActive: true,
        expectedOverheadPercent: 12,
        leakageAlertThresholdPercent: 20,
      }
    );
  }, [settings?.ispSettings]);

  // Polling state
  const [isPollingActive, setIsPollingActive] = useState<boolean>(
    ispSettings.isContinuousPollingActive !== false
  );
  const [intervalSeconds, setIntervalSecondsState] = useState<number>(
    ispSettings.pollingIntervalSeconds || 30
  );
  const [countdown, setCountdown] = useState<number>(intervalSeconds);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);

  // Selected date filter
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Persistent records state
  const [allLedgerRecords, setAllLedgerRecords] = useState<CardDailyUsageRecord[]>(() => {
    return loadCardUsageLogs();
  });

  const [allISPSummaries, setAllISPSummaries] = useState<Record<string, ISPComparisonDaySummary>>(() => {
    return loadISPTrafficLogs();
  });

  // Latest Router Interfaces traffic snapshot
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([]);
  const [wanTraffic, setWanTraffic] = useState<{
    interfaceName: string;
    rxByte: number; // Download from ISP
    txByte: number; // Upload to ISP
    rxRateBps?: number;
    txRateBps?: number;
  } | null>(null);

  // Filtered records for selected date
  const dateRecords = useMemo(() => {
    return allLedgerRecords
      .filter((r) => r.date === selectedDate)
      .sort((a, b) => b.totalBytes - a.totalBytes);
  }, [allLedgerRecords, selectedDate]);

  // Today's summary statistics
  const activeNowCount = useMemo(() => {
    return allLedgerRecords.filter((r) => r.date === todayStr && r.isActive).length;
  }, [allLedgerRecords, todayStr]);

  const todayClientDownloadBytes = useMemo(() => {
    return dateRecords.reduce((sum, r) => sum + (r.downloadBytes || 0), 0);
  }, [dateRecords]);

  const todayClientUploadBytes = useMemo(() => {
    return dateRecords.reduce((sum, r) => sum + (r.uploadBytes || 0), 0);
  }, [dateRecords]);

  const todayClientTotalBytes = todayClientDownloadBytes + todayClientUploadBytes;

  // Selected date ISP reconciliation summary
  const currentISPSummary = useMemo(() => {
    if (allISPSummaries[selectedDate]) {
      return allISPSummaries[selectedDate];
    }
    // Compute on-the-fly if not cached
    return calculateISPReconciliation(
      dateRecords,
      wanTraffic ? { rxByte: wanTraffic.rxByte, txByte: wanTraffic.txByte } : null,
      ispSettings,
      sales,
      categories,
      selectedDate
    );
  }, [allISPSummaries, selectedDate, dateRecords, wanTraffic, ispSettings, sales, categories]);

  // Execute a single query cycle
  const performQueryCycle = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage(null);

    try {
      // 1. Fetch live sessions
      const sessionsRes = await fetchMikrotikSessions(mikrotikConfig);
      const incomingSessions = sessionsRes.success ? sessionsRes.sessions || [] : [];

      // 2. Fetch interfaces to find WAN traffic
      const ifaces = await fetchRouterInterfaces(mikrotikConfig);
      setInterfaces(ifaces);

      // Locate WAN interface: user configured name OR match ether1/wan/starlink/sfp1
      const wanTargetName = (ispSettings.wanInterface || 'ether1').toLowerCase();
      let matchedWan = ifaces.find((i) => i.name.toLowerCase().includes(wanTargetName));
      if (!matchedWan) {
        matchedWan = ifaces.find(
          (i) =>
            i.name.toLowerCase().includes('wan') ||
            i.name.toLowerCase().includes('ether1') ||
            i.name.toLowerCase().includes('starlink') ||
            (i.type === 'ether' && i.running)
        );
      }

      let wanStats: { interfaceName: string; rxByte: number; txByte: number; rxRateBps?: number; txRateBps?: number } | null = null;
      if (matchedWan) {
        wanStats = {
          interfaceName: matchedWan.name,
          rxByte: matchedWan.rxByte || 0,
          txByte: matchedWan.txByte || 0,
          rxRateBps: matchedWan.rxRateBps,
          txRateBps: matchedWan.txRateBps,
        };
        setWanTraffic(wanStats);
      }

      // 3. Merge sessions into daily persistent ledger
      const currentToday = new Date().toISOString().split('T')[0];
      setAllLedgerRecords((prev) => {
        const { updatedLedger } = mergeSessionsIntoDailyLedger(
          prev,
          incomingSessions,
          categories,
          activeNetworkId,
          currentToday
        );
        saveCardUsageLogs(updatedLedger);

        // 4. Update ISP Reconciliation summary
        const newSummary = calculateISPReconciliation(
          updatedLedger,
          wanStats ? { rxByte: wanStats.rxByte, txByte: wanStats.txByte } : null,
          ispSettings,
          sales,
          categories,
          currentToday
        );

        setAllISPSummaries((prevSum) => {
          const nextSum = { ...prevSum, [currentToday]: newSummary };
          saveISPTrafficLogs(nextSum);
          return nextSum;
        });

        return updatedLedger;
      });

      setLastPolledAt(new Date());
      setPollCount((c) => c + 1);
    } catch (err: any) {
      console.warn('[ContinuousCardTracker] Polling warning:', err);
      setErrorMessage(err.message || 'تعذر استكمال دورة الاستعلام المستمر من الراوتر');
    } finally {
      setIsFetching(false);
      setCountdown(intervalSeconds);
    }
  }, [mikrotikConfig, ispSettings, categories, activeNetworkId, sales, intervalSeconds]);

  // Polling loop effect
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (!isPollingActive || intervalSeconds <= 0) return;

    // Reset countdown
    setCountdown(intervalSeconds);

    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          performQueryCycle();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPollingActive, intervalSeconds, performQueryCycle]);

  // Initial poll on mount
  useEffect(() => {
    performQueryCycle();
  }, []);

  // Update interval helper
  const setIntervalSeconds = (newSeconds: number) => {
    setIntervalSecondsState(newSeconds);
    setCountdown(newSeconds);
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        ispSettings: {
          ...ispSettings,
          pollingIntervalSeconds: newSeconds,
        },
      });
    }
  };

  // Toggle polling helper
  const togglePolling = (forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !isPollingActive;
    setIsPollingActive(newState);
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        ispSettings: {
          ...ispSettings,
          isContinuousPollingActive: newState,
        },
      });
    }
  };

  // Clear day logs
  const clearDayLogs = (targetDate: string) => {
    const updated = allLedgerRecords.filter((r) => r.date !== targetDate);
    setAllLedgerRecords(updated);
    saveCardUsageLogs(updated);

    const updatedSummaries = { ...allISPSummaries };
    delete updatedSummaries[targetDate];
    setAllISPSummaries(updatedSummaries);
    saveISPTrafficLogs(updatedSummaries);
  };

  // Export CSV
  const exportCsv = () => {
    const headers = [
      'اسم الكرت',
      'التاريخ',
      'الحالة',
      'الفئة',
      'التحميل (بايت)',
      'الرفع (بايت)',
      'الإجمالي (بايت)',
      'عنوان IP',
      'عنوان MAC',
      'اسم الجهاز',
      'وقت أول اتصال',
      'وقت آخر نشاط',
      'عدد الجلسات',
      'وقت التشغيل',
    ];

    const rows = dateRecords.map((r) => [
      r.cardUsername,
      r.date,
      r.isActive ? 'متصل الآن' : 'منقطع',
      r.categoryName || 'غير محدد',
      r.downloadBytes,
      r.uploadBytes,
      r.totalBytes,
      r.ipAddress,
      r.macAddress,
      r.hostName || '',
      r.firstSeenTime,
      r.lastSeenTime,
      r.sessionCount || 1,
      r.uptime,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كروت_الاستهلاك_اليومي_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    isPollingActive,
    intervalSeconds,
    countdown,
    isFetching,
    lastPolledAt,
    errorMessage,
    pollCount,
    selectedDate,
    setSelectedDate,
    activeNowCount,
    todayClientDownloadBytes,
    todayClientUploadBytes,
    todayClientTotalBytes,
    dateRecords,
    allLedgerRecords,
    currentISPSummary,
    allISPSummaries,
    interfaces,
    wanTraffic,
    ispSettings,
    pollNow: performQueryCycle,
    togglePolling,
    setIntervalSeconds,
    clearDayLogs,
    exportCsv,
  };
};
