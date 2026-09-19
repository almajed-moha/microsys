import { CardCategory } from '../types';

/**
 * Parses any MikroTik uptime duration string or numeric value into total seconds.
 * Supports:
 * - Pure seconds: "3600", 3600
 * - MikroTik duration: "1w2d3h4m5s", "2h30m", "45s", "1d"
 * - Colon time formats: "01:30:00", "45:00"
 * - Combined formats: "1d 04:30:00", "2d10:15:30"
 */
export function parseMikrotikUptimeToSeconds(uptime?: string | number | null): number {
  if (uptime === undefined || uptime === null || uptime === '') return 0;
  if (typeof uptime === 'number') return isNaN(uptime) || uptime < 0 ? 0 : Math.round(uptime);

  const str = String(uptime).trim().toLowerCase();
  if (!str || str === '0s' || str === '0') return 0;

  // Pure numeric string
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  let totalSec = 0;

  const matchW = str.match(/(\d+)\s*w/);
  const matchD = str.match(/(\d+)\s*d/);
  const matchH = str.match(/(\d+)\s*h/);
  const matchM = str.match(/(\d+)\s*m(?!s)/);
  const matchS = str.match(/(\d+)\s*s/);

  if (matchW) totalSec += parseInt(matchW[1], 10) * 7 * 86400;
  if (matchD) totalSec += parseInt(matchD[1], 10) * 86400;
  if (matchH) totalSec += parseInt(matchH[1], 10) * 3600;
  if (matchM) totalSec += parseInt(matchM[1], 10) * 60;
  if (matchS) totalSec += parseInt(matchS[1], 10);

  // Colon notation (e.g., "01:30:00" or after day marker "1d 02:15:30")
  if (str.includes(':')) {
    const parts = str.split(/[wd ]/).filter(Boolean).pop()?.split(':') || [];
    if (parts.length === 3) {
      totalSec += parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      totalSec += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
  }

  return totalSec;
}

/**
 * Robustly parses MikroTik byte limits and sizes.
 * Handles numeric values, strings with K, M, G, T, P suffixes (e.g., "500M", "1G", "1024K", "2048MiB").
 */
export function parseMikrotikBytes(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || val < 0 ? 0 : Math.round(val);

  const str = String(val).trim().toUpperCase();
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  const match = str.match(/^([\d.]+)\s*([KMGTPE]?)(?:I?B)?$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'K': return Math.round(num * 1024);
      case 'M': return Math.round(num * 1024 * 1024);
      case 'G': return Math.round(num * 1024 * 1024 * 1024);
      case 'T': return Math.round(num * 1024 * 1024 * 1024 * 1024);
      case 'P': return Math.round(num * 1024 * 1024 * 1024 * 1024 * 1024);
      default: return Math.round(num);
    }
  }

  const fallback = Number(val);
  return isNaN(fallback) || fallback < 0 ? 0 : fallback;
}

/**
 * Checks whether a card's comment indicates that it was marked expired by a MikroTik script,
 * User Manager, or RADIUS workflow.
 */
export function isCommentMarkedExpired(comment?: string | null): boolean {
  if (!comment) return false;
  const c = comment.trim().toLowerCase();
  return /expired|منتهي|انتهى|\bexp\b|خالص|finished|time\s*out|quota\s*out|traffic\s*limit|over\s*quota|depleted/i.test(c);
}

/**
 * Formats numeric byte values into a human-readable string (e.g. 512 MB, 1.5 GB).
 */
export function formatBytesHuman(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const formatBytesToHuman = formatBytesHuman;

export type CardStatusType =
  | 'expired_quota'
  | 'expired_uptime'
  | 'expired_comment'
  | 'manually_disabled'
  | 'active_quota'
  | 'unlimited';

export interface EvaluatedCardStatus {
  isExpired: boolean;
  isQuotaExpired: boolean;
  isTimeExpired: boolean;
  isCommentExpired: boolean;
  isManuallyDisabled: boolean;
  hasQuota: boolean;
  hasTimeLimit: boolean;
  totalBytesUsed: number;
  quotaLimitBytes: number;
  limitBytesTotal: number;
  percentQuotaUsed: number;
  usedUptimeSec: number;
  limitUptimeSec: number;
  percentTimeUsed: number;
  statusType: CardStatusType;
  statusLabel: string;
  statusBadgeClass: string;
}

/**
 * Evaluates the precise expiration and active status of a card or hotspot user.
 * 
 * CRITICAL RULE:
 * - A card is "Expired" ONLY if its data quota ran out, its uptime ran out, or its comment marks it expired.
 * - A card that was manually disabled by the admin (disabled=true) without meeting quota/uptime/comment criteria
 *   is STRICTLY classified as "Manually Disabled" (معطل يدوياً), NOT expired.
 */
export function evaluateCardExpirationStatus(
  user: {
    name?: string;
    username?: string;
    profile?: string;
    actualProfile?: string;
    uptime?: string | number;
    uptimeUsed?: string | number;
    bytesIn?: number;
    bytesOut?: number;
    downloadUsed?: number;
    uploadUsed?: number;
    totalBytes?: number;
    limitUptime?: string | number;
    limitBytesTotal?: number | string;
    limitBytesIn?: number | string;
    limitBytesOut?: number | string;
    disabled?: boolean;
    comment?: string;
  },
  categories?: CardCategory[]
): EvaluatedCardStatus {
  const bytesIn = user.bytesIn ?? user.uploadUsed ?? 0;
  const bytesOut = user.bytesOut ?? user.downloadUsed ?? 0;
  const totalBytesUsed = user.totalBytes !== undefined && user.totalBytes > 0
    ? user.totalBytes
    : bytesIn + bytesOut;

  // Cross-reference category if profile matches
  const profileName = user.profile || user.actualProfile || '';
  const matchedCategory = categories?.find(
    (c) =>
      (profileName && (c.mikrotikProfile === profileName || c.name === profileName)) ||
      (c.code && user.name && user.name.toLowerCase().startsWith(c.code.toLowerCase()))
  );

  // 1. Quota Limit Determination
  let quotaLimitBytes = parseMikrotikBytes(user.limitBytesTotal);
  if (quotaLimitBytes === 0 && (user.limitBytesIn || user.limitBytesOut)) {
    quotaLimitBytes = parseMikrotikBytes(user.limitBytesIn) + parseMikrotikBytes(user.limitBytesOut);
  }
  if (quotaLimitBytes === 0 && matchedCategory?.quotaLimit) {
    quotaLimitBytes = parseMikrotikBytes(matchedCategory.quotaLimit);
  }

  const hasQuota = quotaLimitBytes > 0;
  const isQuotaExpired = Boolean(hasQuota && totalBytesUsed >= quotaLimitBytes);
  const percentQuotaUsed = hasQuota
    ? Math.min(100, Math.round((totalBytesUsed / quotaLimitBytes) * 100))
    : 0;

  // 2. Uptime Limit Determination
  const effectiveUptimeLimit = user.limitUptime || matchedCategory?.uptimeLimit;
  const limitUptimeSec = parseMikrotikUptimeToSeconds(effectiveUptimeLimit);
  const usedUptimeSec = parseMikrotikUptimeToSeconds(user.uptime ?? user.uptimeUsed);

  const hasTimeLimit = limitUptimeSec > 0;
  // Expired if used time >= limit time (or within 2 seconds due to RouterOS session tear-down latency)
  const isTimeExpired = Boolean(hasTimeLimit && usedUptimeSec >= Math.max(1, limitUptimeSec - 2));
  const percentTimeUsed = hasTimeLimit
    ? Math.min(100, Math.round((usedUptimeSec / limitUptimeSec) * 100))
    : 0;

  // 3. Comment Expiration (script/radius/winbox marked)
  const isCommentExpired = isCommentMarkedExpired(user.comment);

  // 4. Overall Expired Status
  const isExpired = isQuotaExpired || isTimeExpired || isCommentExpired;

  // 5. Manually Disabled vs Expired
  // CRITICAL: A disabled card is ONLY "manually disabled" if it is NOT truly expired by quota/time/comment.
  const isManuallyDisabled = Boolean(user.disabled && !isExpired);

  // Status classification
  let statusType: CardStatusType = 'unlimited';
  let statusLabel = 'مفتوح (لا محدود)';
  let statusBadgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';

  if (isQuotaExpired) {
    statusType = 'expired_quota';
    statusLabel = 'منتهي (نفذ الرصيد)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
  } else if (isTimeExpired) {
    statusType = 'expired_uptime';
    statusLabel = 'منتهي (نفذ الوقت)';
    statusBadgeClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  } else if (isCommentExpired) {
    statusType = 'expired_comment';
    statusLabel = 'منتهي الصلاحية';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
  } else if (isManuallyDisabled) {
    statusType = 'manually_disabled';
    statusLabel = 'معطل يدوياً';
    statusBadgeClass = 'bg-slate-500/20 text-slate-300 border border-slate-600/40';
  } else if (hasQuota || hasTimeLimit) {
    statusType = 'active_quota';
    statusLabel = 'نشط (متبقي رصيد/وقت)';
    statusBadgeClass = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  }

  return {
    isExpired,
    isQuotaExpired,
    isTimeExpired,
    isCommentExpired,
    isManuallyDisabled,
    hasQuota,
    hasTimeLimit,
    totalBytesUsed,
    quotaLimitBytes,
    limitBytesTotal: quotaLimitBytes,
    percentQuotaUsed,
    usedUptimeSec,
    limitUptimeSec,
    percentTimeUsed,
    statusType,
    statusLabel,
    statusBadgeClass,
  };
}
