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
 * Robustly parses MikroTik timestamp/date strings into Unix timestamp (milliseconds).
 * Handles ISO strings, RouterOS date formats ("sep/20/2026 11:00:00", "2026-sep-20", etc.).
 */
export function parseMikrotikDateToTimestamp(dateStr?: string | number | null): number | null {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return isNaN(dateStr) || dateStr <= 0 ? null : dateStr;
  const str = String(dateStr).trim();
  if (!str) return null;

  // Standard ISO/RFC format
  const parsedStandard = Date.parse(str);
  if (!isNaN(parsedStandard) && parsedStandard > 0) {
    return parsedStandard;
  }

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Format: "sep/20/2026 11:00:00" or "sep/20/2026"
  const match1 = str.toLowerCase().match(/^([a-z]{3})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match1) {
    const month = months[match1[1]];
    const day = parseInt(match1[2], 10);
    const year = parseInt(match1[3], 10);
    const hour = parseInt(match1[4] || '0', 10);
    const min = parseInt(match1[5] || '0', 10);
    const sec = parseInt(match1[6] || '0', 10);
    if (month !== undefined) {
      return new Date(year, month, day, hour, min, sec).getTime();
    }
  }

  // Format: "2026-sep-20 11:00:00"
  const match2 = str.toLowerCase().match(/^(\d{4})-([a-z]{3})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match2) {
    const year = parseInt(match2[1], 10);
    const month = months[match2[2]];
    const day = parseInt(match2[3], 10);
    const hour = parseInt(match2[4] || '0', 10);
    const min = parseInt(match2[5] || '0', 10);
    const sec = parseInt(match2[6] || '0', 10);
    if (month !== undefined) {
      return new Date(year, month, day, hour, min, sec).getTime();
    }
  }

  return null;
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
  return /expired|منتهي|منتهية|انتهى|انتهت|\bexp\b|خالص|خلص|مستنفذ|مستنفذة|نفذ|نفد|finished|time[\s_-]*out|quota[\s_-]*out|traffic[\s_-]*limit|over[\s_-]*quota|depleted|صفر\s*رصيد/i.test(c);
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
  | 'expired_profile'
  | 'manually_disabled'
  | 'active_quota'
  | 'unlimited';

export interface EvaluatedCardStatus {
  isExpired: boolean;
  isQuotaExpired: boolean;
  isTimeExpired: boolean;
  isCommentExpired: boolean;
  isProfileExpired: boolean;
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
 * - A card is "Expired" if:
 *   1. Its total data quota or download quota ran out (quota exhausted / نفاد الرصيد).
 *   2. Its uptime ran out (uptime limit exhausted).
 *   3. Its validity date (endsAt) has elapsed, or all assigned profiles are finished/used.
 *   4. Its comment marks it expired by script/admin.
 * - A card that was manually disabled by the admin (disabled=true) without meeting any expiration criteria
 *   is classified as "Manually Disabled" (معطل يدوياً).
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
    profilesCount?: { total?: number; waiting?: number; active?: number; used?: number };
    assignedProfiles?: Array<{
      state?: string;
      startsAt?: string;
      endsAt?: string;
      validity?: string;
      profile?: string;
    }>;
  },
  categories?: CardCategory[],
  umContext?: {
    limitations?: Array<{ name: string; downloadLimit?: any; uploadLimit?: any; totalLimit?: any; uptimeLimit?: any }>;
    profiles?: Array<{ name: string; limitations?: string[]; validity?: string }>;
  }
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

  // Cross-reference parent profile
  const parentProf = umContext?.profiles?.find((p) => p.name === profileName);

  // Cross-reference User Manager limitation if available
  const matchedLimitation = umContext?.limitations?.find((l) => {
    if (!profileName) return false;
    if (l.name === profileName || l.name === `Lim-${profileName}` || l.name === `UM-Lim-${profileName.replace(/^UM-Profile-/, '')}`) return true;
    if (parentProf && parentProf.limitations && parentProf.limitations.includes(l.name)) return true;
    return false;
  });

  // 1. Quota Limit Determination (Total and Download)
  let quotaLimitBytes = parseMikrotikBytes(user.limitBytesTotal);
  if (quotaLimitBytes === 0 && (user.limitBytesIn || user.limitBytesOut)) {
    quotaLimitBytes = parseMikrotikBytes(user.limitBytesIn) + parseMikrotikBytes(user.limitBytesOut);
  }
  if (quotaLimitBytes === 0 && matchedCategory?.quotaLimit) {
    quotaLimitBytes = parseMikrotikBytes(matchedCategory.quotaLimit);
  }
  if (quotaLimitBytes === 0 && matchedLimitation) {
    quotaLimitBytes = parseMikrotikBytes(matchedLimitation.totalLimit || matchedLimitation.downloadLimit);
  }

  const downloadLimitBytes = parseMikrotikBytes(
    user.limitBytesOut || (matchedLimitation ? matchedLimitation.downloadLimit : 0)
  );

  const hasQuota = quotaLimitBytes > 0;
  const hasDownloadLimit = downloadLimitBytes > 0;

  // Quota is expired if total bytes used >= quota limit (or remaining <= 1KB),
  // OR if download-only limit is reached
  const isQuotaExpired = Boolean(
    (hasQuota && totalBytesUsed >= quotaLimitBytes) ||
    (hasQuota && (quotaLimitBytes - totalBytesUsed) <= 1024) ||
    (hasDownloadLimit && bytesOut >= downloadLimitBytes)
  );

  const percentQuotaUsed = hasQuota
    ? Math.min(100, Math.round((totalBytesUsed / quotaLimitBytes) * 100))
    : 0;

  // 2. Uptime Limit Determination
  const effectiveUptimeLimit = user.limitUptime || matchedCategory?.uptimeLimit || matchedLimitation?.uptimeLimit;
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

  // 4. User Manager Profile Completion & Validity Date (RouterOS v7 & v6)
  // Check assigned profiles for endsAt timestamps and state
  let isDateExpired = false;
  if (user.assignedProfiles && Array.isArray(user.assignedProfiles) && user.assignedProfiles.length > 0) {
    const hasActiveOrWaiting = user.assignedProfiles.some(
      (p) => p.state === 'active' || p.state === 'waiting' || p.state === 'unused'
    );

    if (!hasActiveOrWaiting) {
      // All profiles are finished/used/expired
      const allFinished = user.assignedProfiles.every(
        (p) => p.state === 'used' || p.state === 'expired'
      );
      if (allFinished) isDateExpired = true;
    }

    // Check if any active profile's endsAt has elapsed
    const nowMs = Date.now();
    for (const p of user.assignedProfiles) {
      if (p.endsAt) {
        const endTs = parseMikrotikDateToTimestamp(p.endsAt);
        if (endTs && endTs <= nowMs) {
          const hasWaiting = user.assignedProfiles.some((item) => item.state === 'waiting' || item.state === 'unused');
          if (!hasWaiting) {
            isDateExpired = true;
            break;
          }
        }
      }
    }
  }

  const isProfileExpired = Boolean(
    isDateExpired ||
    (user.profilesCount &&
      (user.profilesCount.total ?? 0) > 0 &&
      (user.profilesCount.active ?? 0) === 0 &&
      (user.profilesCount.waiting ?? 0) === 0 &&
      (user.profilesCount.used ?? 0) > 0)
  );

  // 5. Overall Expired Status
  const isExpired = isQuotaExpired || isTimeExpired || isCommentExpired || isProfileExpired;

  // 6. Manually Disabled vs Expired
  // CRITICAL: A disabled card is ONLY "manually disabled" if it is NOT truly expired.
  // If it ran out of quota or time, it is classified as EXPIRED!
  const isManuallyDisabled = Boolean(user.disabled && !isExpired);

  // Status classification
  let statusType: CardStatusType = 'unlimited';
  let statusLabel = 'مفتوح (لا محدود)';
  let statusBadgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';

  if (isQuotaExpired) {
    statusType = 'expired_quota';
    statusLabel = 'منتهي (نفذ رصيد التحميل)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
  } else if (isTimeExpired) {
    statusType = 'expired_uptime';
    statusLabel = 'منتهي (نفذ وقت الاستخدام)';
    statusBadgeClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  } else if (isProfileExpired || isDateExpired) {
    statusType = 'expired_profile';
    statusLabel = 'منتهي (انتهت مدة الصلاحية)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
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
    isProfileExpired,
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
