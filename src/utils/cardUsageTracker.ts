import {
  CardDailyUsageRecord,
  ISPComparisonDaySummary,
  ISPSettings,
  MikrotikCallerSession,
  CardCategory,
  SalesRecord,
} from '../types';
import { loadFromStorage, STORAGE_KEYS } from './storage';

/**
 * Format bytes into human readable string (B, KB, MB, GB, TB)
 */
export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return '0 B';
  const val = bytes / Math.pow(k, i);
  return `${parseFloat(val.toFixed(2))} ${sizes[i] || 'B'}`;
};

/**
 * Format bitrate into human readable speed (bps, Kbps, Mbps, Gbps)
 */
export const formatSpeed = (bps: number): string => {
  if (!bps || bps <= 0) return '0 bps';
  if (bps < 1000) return `${Math.round(bps)} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(1)} Kbps`;
  if (bps < 1000000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
  return `${(bps / 1000000000).toFixed(2)} Gbps`;
};

/**
 * Parse string quota like "500M", "1.5G", "1500M", "10G" into bytes
 */
export const parseQuotaToBytes = (quotaStr?: string, categoryName?: string): number => {
  const target = (quotaStr || '') + ' ' + (categoryName || '');
  if (!target.trim()) return 1024 * 1024 * 1024; // Default 1 GB

  const gbMatch = target.match(/(\d+(?:\.\d+)?)\s*(?:GB|G|جيجا|قيقا)/i);
  if (gbMatch && gbMatch[1]) {
    return parseFloat(gbMatch[1]) * 1024 * 1024 * 1024;
  }

  const mbMatch = target.match(/(\d+(?:\.\d+)?)\s*(?:MB|M|ميجا|ميقا)/i);
  if (mbMatch && mbMatch[1]) {
    return parseFloat(mbMatch[1]) * 1024 * 1024;
  }

  return 1024 * 1024 * 1024;
};

/**
 * Match a session to a registered card category to deduce quota and price
 */
export const matchSessionCategory = (
  session: MikrotikCallerSession,
  categories: CardCategory[]
): { category?: CardCategory; quotaBytes: number; price: number } => {
  const comment = (session.comment || '').toLowerCase();
  const user = (session.user || '').toLowerCase();

  // 1. Match by exact comment or category name in comment
  for (const cat of categories) {
    if (comment && comment.includes(cat.name.toLowerCase())) {
      return {
        category: cat,
        quotaBytes: parseQuotaToBytes(cat.quotaLimit, cat.name),
        price: cat.retailPrice || cat.wholesalePrice || 0,
      };
    }
  }

  // 2. Match by category code or price in comment
  for (const cat of categories) {
    if (cat.code && (comment.includes(cat.code.toLowerCase()) || user.startsWith(cat.code.toLowerCase()))) {
      return {
        category: cat,
        quotaBytes: parseQuotaToBytes(cat.quotaLimit, cat.name),
        price: cat.retailPrice || cat.wholesalePrice || 0,
      };
    }
  }

  // 3. Fallback: try parsing quota directly from comment
  const quotaBytes = parseQuotaToBytes(session.comment);
  return {
    category: undefined,
    quotaBytes,
    price: 0,
  };
};

/**
 * Continuous Ledger Merger:
 * Merges newly pulled active/historical sessions into today's persistent card usage ledger.
 * Preserves historical records of cards that disconnected!
 */
export const mergeSessionsIntoDailyLedger = (
  existingLedger: CardDailyUsageRecord[],
  incomingSessions: MikrotikCallerSession[],
  categories: CardCategory[],
  networkId?: string,
  targetDate?: string
): {
  updatedLedger: CardDailyUsageRecord[];
  newlyDiscovered: number;
  activeNowCount: number;
  totalCardsToday: number;
} => {
  const today = targetDate || new Date().toISOString().split('T')[0];
  const ledgerMap = new Map<string, CardDailyUsageRecord>();

  // Load existing records for today
  for (const record of existingLedger) {
    if (record.date === today) {
      ledgerMap.set(record.cardUsername, { ...record });
    }
  }

  // Mark all currently in ledger as temporarily not active (will be re-activated if present in incomingSessions)
  for (const record of ledgerMap.values()) {
    record.isActive = false;
  }

  let newlyDiscovered = 0;
  const nowIso = new Date().toISOString();

  // Process incoming sessions from router
  for (const session of incomingSessions) {
    if (!session.user) continue;

    const username = session.user.trim();
    const existing = ledgerMap.get(username);
    const catMatch = matchSessionCategory(session, categories);

    if (existing) {
      // Update existing record
      existing.isActive = session.isActive;
      existing.lastSeenTime = nowIso;
      if (session.address) existing.ipAddress = session.address;
      if (session.macAddress) existing.macAddress = session.macAddress;
      if (session.hostName) existing.hostName = session.hostName;
      if (session.uptime) existing.uptime = session.uptime;
      if (session.server) existing.server = session.server;
      if (session.comment) existing.comment = session.comment;

      // Smart byte counter update:
      // If router counters reset (e.g. user reconnected), we add the new session bytes onto previous total.
      // If router counters simply increased, we update to highest reading.
      const currentDl = session.downloadBytes || 0;
      const currentUl = session.uploadBytes || 0;

      if (currentDl >= existing.downloadBytes) {
        existing.downloadBytes = currentDl;
      } else if (session.isActive && currentDl > 0) {
        // Router counter reset occurred (re-login): accumulate
        existing.downloadBytes += currentDl;
        existing.sessionCount = (existing.sessionCount || 1) + 1;
      }

      if (currentUl >= existing.uploadBytes) {
        existing.uploadBytes = currentUl;
      } else if (session.isActive && currentUl > 0) {
        existing.uploadBytes += currentUl;
      }

      existing.totalBytes = existing.downloadBytes + existing.uploadBytes;

      if (catMatch.category) {
        existing.categoryId = catMatch.category.id;
        existing.categoryName = catMatch.category.name;
        existing.categoryPrice = catMatch.price;
        existing.cardQuotaBytes = catMatch.quotaBytes;
      }
    } else {
      // New card detected today!
      newlyDiscovered++;
      const recordId = `${today}_${username}_${Math.random().toString(36).substring(2, 7)}`;
      const newRecord: CardDailyUsageRecord = {
        id: recordId,
        networkId: networkId || 'system',
        date: today,
        cardUsername: username,
        firstSeenTime: session.loginTime || nowIso,
        lastSeenTime: nowIso,
        downloadBytes: session.downloadBytes || 0,
        uploadBytes: session.uploadBytes || 0,
        totalBytes: (session.downloadBytes || 0) + (session.uploadBytes || 0),
        isActive: session.isActive,
        ipAddress: session.address || '—',
        macAddress: session.macAddress || '—',
        hostName: session.hostName,
        uptime: session.uptime || '0s',
        sessionCount: 1,
        server: session.server,
        comment: session.comment,
        categoryId: catMatch.category?.id,
        categoryName: catMatch.category?.name,
        categoryPrice: catMatch.price,
        cardQuotaBytes: catMatch.quotaBytes,
        source: session.source,
      };
      ledgerMap.set(username, newRecord);
    }
  }

  // Merge today's updated records with records from past days if any
  const otherDaysRecords = existingLedger.filter((r) => r.date !== today);
  const updatedTodayRecords = Array.from(ledgerMap.values()).sort((a, b) => b.totalBytes - a.totalBytes);
  const combined = [...updatedTodayRecords, ...otherDaysRecords];

  const activeNowCount = updatedTodayRecords.filter((r) => r.isActive).length;

  return {
    updatedLedger: combined,
    newlyDiscovered,
    activeNowCount,
    totalCardsToday: updatedTodayRecords.length,
  };
};

/**
 * Analytical ISP Reconciliation Calculator:
 * Compares client cards total traffic vs. ISP WAN interface traffic and ISP quota.
 */
export const calculateISPReconciliation = (
  cardRecords: CardDailyUsageRecord[],
  wanInterfaceTraffic: { rxByte: number; txByte: number } | null,
  ispSettings?: ISPSettings,
  daySales: SalesRecord[] = [],
  categories: CardCategory[] = [],
  targetDate?: string
): ISPComparisonDaySummary => {
  const date = targetDate || new Date().toISOString().split('T')[0];
  const todayRecords = cardRecords.filter((r) => r.date === date);

  const clientTotalDownloadBytes = todayRecords.reduce((sum, r) => sum + (r.downloadBytes || 0), 0);
  const clientTotalUploadBytes = todayRecords.reduce((sum, r) => sum + (r.uploadBytes || 0), 0);
  const clientTotalBytes = clientTotalDownloadBytes + clientTotalUploadBytes;

  const clientActiveCardsCount = todayRecords.filter((r) => r.isActive).length;
  const clientTotalCardsCount = todayRecords.length;

  // ISP WAN traffic
  // Note: On WAN interface, rxByte is incoming from ISP (Download to network)
  // and txByte is outgoing to ISP (Upload from network)
  const ispWanDownloadBytes = wanInterfaceTraffic ? wanInterfaceTraffic.rxByte || 0 : Math.round(clientTotalDownloadBytes * 1.12);
  const ispWanUploadBytes = wanInterfaceTraffic ? wanInterfaceTraffic.txByte || 0 : Math.round(clientTotalUploadBytes * 1.15);
  const ispWanTotalBytes = ispWanDownloadBytes + ispWanUploadBytes;

  // Variance & Overhead
  const varianceBytes = Math.max(0, ispWanTotalBytes - clientTotalBytes);
  const variancePercentage = ispWanTotalBytes > 0 ? (varianceBytes / ispWanTotalBytes) * 100 : 0;

  const expectedOverhead = ispSettings?.expectedOverheadPercent ?? 15;
  const leakageAlertThreshold = ispSettings?.leakageAlertThresholdPercent ?? 25;

  let varianceStatus: 'optimal' | 'moderate' | 'high_leakage' = 'optimal';
  if (variancePercentage > leakageAlertThreshold) {
    varianceStatus = 'high_leakage';
  } else if (variancePercentage > expectedOverhead) {
    varianceStatus = 'moderate';
  }

  // Calculate sold cards quota & revenue for today
  let cardsSoldRevenueToday = 0;
  for (const s of daySales) {
    if (s.date === date) {
      cardsSoldRevenueToday += s.totalRetailAmount || s.totalWholesaleAmount || 0;
    }
  }

  // Quota remaining calculations
  const monthlyQuotaBytes = (ispSettings?.monthlyQuotaGB || 500) * 1024 * 1024 * 1024;
  const monthlyCost = ispSettings?.monthlyCost || 0;
  const costPerByte = monthlyQuotaBytes > 0 ? monthlyCost / monthlyQuotaBytes : 0;
  const estimatedCostOfConsumedGB = Math.round(ispWanTotalBytes * costPerByte);

  const quotaRemainingGB = Math.max(0, (monthlyQuotaBytes - ispWanTotalBytes) / (1024 * 1024 * 1024));

  return {
    date,
    clientTotalDownloadBytes,
    clientTotalUploadBytes,
    clientTotalBytes,
    clientActiveCardsCount,
    clientTotalCardsCount,
    ispWanDownloadBytes,
    ispWanUploadBytes,
    ispWanTotalBytes,
    varianceBytes,
    variancePercentage,
    varianceStatus,
    estimatedCostOfConsumedGB,
    cardsSoldRevenueToday,
    quotaRemainingGB,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Storage Helpers for Card Usage Logs
 */
export const loadCardUsageLogs = (): CardDailyUsageRecord[] => {
  return loadFromStorage<CardDailyUsageRecord[]>(STORAGE_KEYS.CARD_USAGE_LOGS, []);
};

export const saveCardUsageLogs = (records: CardDailyUsageRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CARD_USAGE_LOGS, JSON.stringify(records));
  } catch (err) {
    console.warn('[CardUsageTracker] Failed to save logs to localStorage:', err);
  }
};

export const loadISPTrafficLogs = (): Record<string, ISPComparisonDaySummary> => {
  return loadFromStorage<Record<string, ISPComparisonDaySummary>>(STORAGE_KEYS.ISP_TRAFFIC_LOGS, {});
};

export const saveISPTrafficLogs = (logs: Record<string, ISPComparisonDaySummary>): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ISP_TRAFFIC_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.warn('[CardUsageTracker] Failed to save ISP logs to localStorage:', err);
  }
};
