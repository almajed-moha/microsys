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
  if (typeof dateStr === 'number') return isNaN(dateStr) || dateStr <= 0 ? null : dateStr > 1e11 ? dateStr : dateStr * 1000;
  const str = String(dateStr).trim();
  if (!str) return null;

  // Pure numeric string (Unix timestamp in ms or seconds)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return num > 1e11 ? num : num * 1000;
  }

  // Standard ISO/RFC format (e.g. "2026-09-20T11:00:00Z" or "2026-09-20 11:00:00")
  const standardCandidate = str.replace(' ', 'T');
  const parsedStandard = Date.parse(standardCandidate);
  if (!isNaN(parsedStandard) && parsedStandard > 0) {
    return parsedStandard;
  }

  const directParsed = Date.parse(str);
  if (!isNaN(directParsed) && directParsed > 0) {
    return directParsed;
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

  // Format: "sep/20 11:00:00" (without year - uses current year)
  const match1NoYear = str.toLowerCase().match(/^([a-z]{3})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match1NoYear) {
    const month = months[match1NoYear[1]];
    const day = parseInt(match1NoYear[2], 10);
    const currentYear = new Date().getFullYear();
    const hour = parseInt(match1NoYear[3] || '0', 10);
    const min = parseInt(match1NoYear[4] || '0', 10);
    const sec = parseInt(match1NoYear[5] || '0', 10);
    if (month !== undefined) {
      return new Date(currentYear, month, day, hour, min, sec).getTime();
    }
  }

  // Format: "2026-sep-20 11:00:00" or "20-sep-2026"
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

  // Format: "2026/09/20 11:00:00" or "2026-09-20"
  const match3 = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match3) {
    const year = parseInt(match3[1], 10);
    const month = parseInt(match3[2], 10) - 1;
    const day = parseInt(match3[3], 10);
    const hour = parseInt(match3[4] || '0', 10);
    const min = parseInt(match3[5] || '0', 10);
    const sec = parseInt(match3[6] || '0', 10);
    return new Date(year, month, day, hour, min, sec).getTime();
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
 * Checks whether a card's comment or username indicates that it was marked expired by a MikroTik script,
 * User Manager, or RADIUS workflow.
 */
export function isCommentMarkedExpired(comment?: string | null, userName?: string | null): boolean {
  if (userName) {
    const un = userName.trim().toLowerCase();
    if (/^(?:exp|expired|x|z)[-_]/.test(un) || /[-_](?:exp|expired)$/.test(un)) {
      return true;
    }
  }

  if (!comment) return false;
  // Normalize Arabic letters: replace أ إ آ with ا, ة with ه, ى with ي
  const c = comment
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  const arabicPattern = /منتهي|منتهيه|انتهاء|انتهى|انتهت|انهاء|خالص|خلص|خلصان|مستنفذ|مستنفد|نفذ|نفد|مكتمل|مستهلك|مستعمل|صفر\s*رصيد|رصيد\s*صفر|بدون\s*رصيد|صفر|نفاد/;
  const englishPattern = /\b(?:exp|expired|ended|depleted|exhausted|finished|terminate|terminated|stopped|closed|done)\b|time[\s_-]*out|quota[\s_-]*out|traffic[\s_-]*limit|over[\s_-]*quota|traffic[\s_-]*over/i;

  return arabicPattern.test(c) || englishPattern.test(c);
}

/**
 * Robustly attempts to extract quota limit bytes from a string (such as profile name, comment, or package).
 * Examples: "Profile-1G" -> 1073741824, "500MB" -> 524288000, "10GB" -> 10737418240, "فئة 500 ريال" -> matches cat
 */
export function extractQuotaBytesFromString(text?: string | null): number {
  if (!text) return 0;
  const match = text.match(/(?:^|[\s_-])(\d+(?:\.\d+)?)\s*(GB|G|GiB|MB|M|MiB|KB|K|TB|T)(?:[\s_-]|$)/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit.startsWith('T')) return Math.round(val * 1024 * 1024 * 1024 * 1024);
    if (unit.startsWith('G')) return Math.round(val * 1024 * 1024 * 1024);
    if (unit.startsWith('M')) return Math.round(val * 1024 * 1024);
    if (unit.startsWith('K')) return Math.round(val * 1024);
  }
  return 0;
}

/**
 * Robustly attempts to extract uptime limit seconds from a string (such as profile name, comment, or package).
 * Examples: "1d", "2h", "24h", "30m", "1w"
 */
export function extractUptimeSecFromString(text?: string | null): number {
  if (!text) return 0;
  const match = text.match(/(?:^|[\s_-])(\d+)\s*(w|d|h|m|s)(?:[\s_-]|$)/i);
  if (match) {
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === 'w') return val * 7 * 86400;
    if (unit === 'd') return val * 86400;
    if (unit === 'h') return val * 3600;
    if (unit === 'm') return val * 60;
    if (unit === 's') return val;
  }
  return 0;
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
  | 'expired_disabled'
  | 'manually_disabled'
  | 'active_quota'
  | 'unlimited';

export interface EvaluatedCardStatus {
  isExpired: boolean;
  isQuotaExpired: boolean;
  isTimeExpired: boolean;
  isCommentExpired: boolean;
  isProfileExpired: boolean;
  isDisabledDepleted: boolean;
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
  remainingBytes: number;
  remainingUptimeSec: number;
  expireReasonDesc: string;
  statusType: CardStatusType;
  statusLabel: string;
  statusBadgeClass: string;
}

/**
 * Evaluates the precise expiration and active status of a card or hotspot user.
 * 
 * CRITICAL TECHNICAL RULES FOR DETERMINING EXPIRED CARDS:
 * 1. Quota Exhaustion: Total bytes used >= quota limit (or <= 2KB remaining), or download used >= download limit.
 * 2. Time Exhaustion: Used uptime >= limit uptime.
 * 3. Profile / Validity Expired: All assigned User Manager profiles are finished/used, or active profile endsAt timestamp is in the past.
 * 4. Router / Script Marked Expired: Comment or username indicates expired ("منتهي", "expired", "exp", "خلص", etc.).
 * 5. Disabled with Usage (Depleted): Card is disabled in RouterOS AND has recorded traffic or uptime usage.
 *    (In MikroTik Hotspot & User Manager, exhausted cards are automatically disabled by RouterOS or cleanup scripts).
 * 6. Manually Disabled: Card is disabled by admin BUT has ZERO usage and no expiration marks (brand new paused card).
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
  const userName = user.name || user.username || '';
  const bytesIn = user.bytesIn ?? user.uploadUsed ?? 0;
  const bytesOut = user.bytesOut ?? user.downloadUsed ?? 0;
  const totalBytesUsed = user.totalBytes !== undefined && user.totalBytes > 0
    ? user.totalBytes
    : bytesIn + bytesOut;

  // Cross-reference category with smart fuzzy matching
  const profileName = (user.profile || user.actualProfile || '').trim();
  const profileClean = profileName.toLowerCase().replace(/^(?:um[-_]profile[-_]|profile[-_])/, '');

  const matchedCategory = categories?.find((c) => {
    if (!c) return false;
    const cProf = (c.mikrotikProfile || '').trim().toLowerCase();
    const cName = (c.name || '').trim().toLowerCase();
    const pLower = profileName.toLowerCase();

    // Direct profile match
    if (profileName && (cProf === pLower || cName === pLower)) return true;
    if (cProf && (cProf === `um-profile-${pLower}` || `um-profile-${cProf}` === pLower)) return true;

    // Code match
    if (c.code && userName && userName.toLowerCase().startsWith(c.code.toLowerCase())) return true;

    // Price/number in profile name e.g. "Profile-200" or "500"
    const catPrice = c.retailPrice || (c as any).price;
    if (catPrice && (profileClean === String(catPrice) || pLower.includes(String(catPrice)))) return true;
    if (c.name && profileClean && c.name.toLowerCase().includes(profileClean)) return true;

    return false;
  });

  // Cross-reference parent profile in User Manager
  const parentProf = umContext?.profiles?.find(
    (p) => p.name === profileName || p.name.toLowerCase() === profileName.toLowerCase()
  );

  // Cross-reference User Manager limitation if available
  const matchedLimitation = umContext?.limitations?.find((l) => {
    if (!profileName) return false;
    const lName = l.name.toLowerCase();
    const pName = profileName.toLowerCase();
    if (lName === pName || lName === `lim-${pName}` || lName === `um-lim-${pName.replace(/^um-profile-/, '')}`) return true;
    if (parentProf && parentProf.limitations && parentProf.limitations.some((lim) => lim.toLowerCase() === lName)) return true;
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
  // Try extracting quota from profile name or user comment (e.g. "Profile-1G" or "1024MB")
  if (quotaLimitBytes === 0) {
    quotaLimitBytes = extractQuotaBytesFromString(profileName) || extractQuotaBytesFromString(user.comment);
  }

  const downloadLimitBytes = parseMikrotikBytes(
    user.limitBytesOut || (matchedLimitation ? matchedLimitation.downloadLimit : 0)
  );

  const hasQuota = quotaLimitBytes > 0;
  const hasDownloadLimit = downloadLimitBytes > 0;

  // Quota is expired if total bytes used >= quota limit (or remaining <= 2048 B),
  // OR if download-only limit is reached
  const isQuotaExpired = Boolean(
    (hasQuota && totalBytesUsed >= quotaLimitBytes) ||
    (hasQuota && totalBytesUsed > 0 && (quotaLimitBytes - totalBytesUsed) <= 2048) ||
    (hasDownloadLimit && bytesOut >= downloadLimitBytes)
  );

  const percentQuotaUsed = hasQuota
    ? Math.min(100, Math.round((totalBytesUsed / quotaLimitBytes) * 100))
    : 0;

  // 2. Uptime Limit Determination
  let effectiveUptimeLimit = user.limitUptime || matchedCategory?.uptimeLimit || matchedLimitation?.uptimeLimit;
  if (!effectiveUptimeLimit) {
    const fromProfileSec = extractUptimeSecFromString(profileName) || extractUptimeSecFromString(user.comment);
    if (fromProfileSec > 0) effectiveUptimeLimit = fromProfileSec;
  }

  const limitUptimeSec = parseMikrotikUptimeToSeconds(effectiveUptimeLimit);
  const usedUptimeSec = parseMikrotikUptimeToSeconds(user.uptime ?? user.uptimeUsed);

  const hasTimeLimit = limitUptimeSec > 0;
  // Expired if used time >= limit time (or within 5 seconds due to RouterOS session tear-down latency)
  const isTimeExpired = Boolean(hasTimeLimit && usedUptimeSec >= Math.max(1, limitUptimeSec - 5));
  const percentTimeUsed = hasTimeLimit
    ? Math.min(100, Math.round((usedUptimeSec / limitUptimeSec) * 100))
    : 0;

  // 3. Comment or Username Expiration (Script/Winbox marked)
  const isCommentExpired = isCommentMarkedExpired(user.comment, userName);

  // 4. User Manager Profile Completion & Validity Date (RouterOS v7 & v6)
  let isDateExpired = false;
  if (user.assignedProfiles && Array.isArray(user.assignedProfiles) && user.assignedProfiles.length > 0) {
    const hasActiveOrWaiting = user.assignedProfiles.some(
      (p) => p.state === 'active' || p.state === 'waiting' || p.state === 'unused'
    );

    if (!hasActiveOrWaiting) {
      // All profiles are finished/used/expired
      const allFinished = user.assignedProfiles.every(
        (p) => p.state === 'used' || p.state === 'expired' || p.state === 'done'
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

  // 5. Disabled with Usage / Depleted Card
  // In MikroTik Hotspot & User Manager, cards that ran out are automatically disabled.
  // If a card is disabled AND has recorded traffic or uptime usage, it was disabled because it expired!
  const isDisabledDepleted = Boolean(
    user.disabled && (totalBytesUsed > 0 || usedUptimeSec > 0 || isCommentExpired || isProfileExpired)
  );

  // 6. Overall Expired Status
  const isExpired = isQuotaExpired || isTimeExpired || isCommentExpired || isProfileExpired || isDisabledDepleted;

  // 7. Manually Disabled vs Truly Expired
  // Only classify as "manually disabled" if it is disabled WITHOUT having expired or consumed quota/time.
  const isManuallyDisabled = Boolean(user.disabled && !isExpired);

  const remainingBytes = hasQuota ? Math.max(0, quotaLimitBytes - totalBytesUsed) : 0;
  const remainingUptimeSec = hasTimeLimit ? Math.max(0, limitUptimeSec - usedUptimeSec) : 0;

  // Status classification and clear reason description
  let statusType: CardStatusType = 'unlimited';
  let statusLabel = 'مفتوح (لا محدود)';
  let statusBadgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';
  let expireReasonDesc = 'كارت نشط وغير محدد';

  if (isQuotaExpired) {
    statusType = 'expired_quota';
    statusLabel = 'منتهي (نفد رصيد البيانات)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    expireReasonDesc = `استهلك ${formatBytesHuman(totalBytesUsed)} من أصل ${formatBytesHuman(quotaLimitBytes)} (100% مستنفذ)`;
  } else if (isTimeExpired) {
    statusType = 'expired_uptime';
    statusLabel = 'منتهي (نفد وقت الاستخدام)';
    statusBadgeClass = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    expireReasonDesc = `استنفذ مدة الاستخدام المحددة بالكامل (${user.uptime || user.uptimeUsed})`;
  } else if (isProfileExpired || isDateExpired) {
    statusType = 'expired_profile';
    statusLabel = 'منتهي (انتهت صلاحية الباقة)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    expireReasonDesc = 'انتهت فترة الصلاحية المحددة للبروفايل في User Manager';
  } else if (isCommentExpired) {
    statusType = 'expired_comment';
    statusLabel = 'منتهي الصلاحية (معلم في الراوتر)';
    statusBadgeClass = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    expireReasonDesc = `معلم كمنتهي في ملاحظات الراوتر: "${user.comment || 'expired'}"`;
  } else if (isDisabledDepleted) {
    statusType = 'expired_disabled';
    statusLabel = 'منتهي (معطل ومستهلك)';
    statusBadgeClass = 'bg-rose-900/30 text-rose-300 border border-rose-600/40';
    expireReasonDesc = `كارت معطل بالراوتر مع استهلاك مسجل (${formatBytesHuman(totalBytesUsed)})`;
  } else if (isManuallyDisabled) {
    statusType = 'manually_disabled';
    statusLabel = 'معطل يدوياً (جديد)';
    statusBadgeClass = 'bg-slate-500/20 text-slate-300 border border-slate-600/40';
    expireReasonDesc = 'كارت جديد تم إيقافه يدوياً من قبل المسؤول قبل الاستخدام';
  } else if (hasQuota || hasTimeLimit) {
    statusType = 'active_quota';
    statusLabel = 'نشط (متبقي رصيد/وقت)';
    statusBadgeClass = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    expireReasonDesc = `متبقي: ${hasQuota ? formatBytesHuman(remainingBytes) : ''} ${hasTimeLimit ? Math.round(remainingUptimeSec / 60) + ' دقيقة' : ''}`;
  }

  return {
    isExpired,
    isQuotaExpired,
    isTimeExpired,
    isCommentExpired,
    isProfileExpired,
    isDisabledDepleted,
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
    remainingBytes,
    remainingUptimeSec,
    expireReasonDesc,
    statusType,
    statusLabel,
    statusBadgeClass,
  };
}
