import { AppUser, AuditHistoryEntry, EntityAuditMetadata, UserRole } from '../types';

/**
 * Maps role to clean Arabic title
 */
export function getUserRoleArabic(user?: { role?: UserRole | string; customRoleName?: string } | null): string {
  if (!user) return 'المسؤول';
  if (user.customRoleName && user.customRoleName.trim()) {
    return user.customRoleName.trim();
  }
  switch (user.role) {
    case 'system_owner':
      return 'المالك والمشرف العام';
    case 'system_admin':
      return 'مدير النظام التنفيذي';
    case 'network_manager':
      return 'مدير الشبكة';
    case 'accountant':
      return 'المحاسب المالي';
    case 'sales_agent':
      return 'مسؤول التوزيع والمبيعات';
    case 'technician':
      return 'مهندس الشبكة والمايكروتك';
    case 'viewer':
      return 'مراقب ومراجع بيانات';
    case 'pos_agent':
      return 'وكيل / نقطة بيع';
    default:
      return user.role || 'المستخدم';
  }
}

/**
 * Format ISO datetime string to localized Arabic datetime
 */
export function formatAuditDateTime(isoOrDateStr?: string, includeTime: boolean = true): string {
  if (!isoOrDateStr) return '—';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) {
      return isoOrDateStr;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const datePart = `${year}/${month}/${day}`;

    if (!includeTime) return datePart;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    const timePart = `${hours}:${minutes} ${period}`;

    return `${datePart} - ${timePart}`;
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Format relative time (e.g. 'منذ دقيقة', 'اليوم', إلخ)
 */
export function formatRelativeAuditTime(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '—';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 30) return 'الآن';
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    if (diffMin === 1) return 'منذ دقيقة';
    if (diffMin === 2) return 'منذ دقيقتين';
    if (diffMin < 11) return `منذ ${diffMin} دقائق`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours < 11) return `منذ ${diffHours} ساعات`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    return formatAuditDateTime(isoOrDateStr, false);
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Generates a short tamper-evident verification hash code for audit trail integrity
 */
export function generateAuditIntegrityCode(recordId: string, timestamp: string, userId: string): string {
  const str = `${recordId}-${timestamp}-${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `TRG-${hex}`;
}

/**
 * Trigger: Automatically attaches creation audit stamps to any new entity
 */
export function applyCreationAudit<T extends Record<string, any>>(
  data: T,
  user?: AppUser | null,
  options?: {
    actionTitle?: string;
    actionType?: AuditHistoryEntry['actionType'];
    details?: string;
    customTimestamp?: string;
  }
): T & EntityAuditMetadata {
  const now = options?.customTimestamp || new Date().toISOString();
  const userName = user?.name || 'مدير النظام';
  const userId = user?.id || 'sys-admin';
  const userRole = getUserRoleArabic(user);
  const userUsername = user?.username ? `@${user.username}` : '@admin';

  const initialHistoryEntry: AuditHistoryEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: options?.actionTitle || 'إنشاء السجل في النظام',
    actionType: options?.actionType || 'create',
    userId,
    userName,
    userRole,
    userUsername,
    timestamp: now,
    details: options?.details,
    changesSummary: 'الإنشاء الأولي للسجل وبياناته الأساسية',
  };

  return {
    ...data,
    createdAt: (data as any).createdAt || now,
    createdBy: (data as any).createdBy || userId,
    createdByName: (data as any).createdByName || userName,
    createdByRole: (data as any).createdByRole || userRole,
    createdByUsername: (data as any).createdByUsername || userUsername,
    auditHistory: (data as any).auditHistory && Array.isArray((data as any).auditHistory)
      ? [(data as any).auditHistory, initialHistoryEntry]
      : [initialHistoryEntry],
  };
}

/**
 * Trigger: Automatically attaches update audit stamps and appends to audit trail history
 */
export function applyUpdateAudit<T extends Record<string, any>>(
  existing: T,
  updates: Partial<T>,
  user?: AppUser | null,
  options?: {
    actionTitle?: string;
    actionType?: AuditHistoryEntry['actionType'];
    details?: string;
    changesSummary?: string;
  }
): T & EntityAuditMetadata {
  const now = new Date().toISOString();
  const userName = user?.name || 'مدير النظام';
  const userId = user?.id || 'sys-admin';
  const userRole = getUserRoleArabic(user);
  const userUsername = user?.username ? `@${user.username}` : '@admin';

  const prevHistory: AuditHistoryEntry[] = Array.isArray((existing as any).auditHistory)
    ? (existing as any).auditHistory
    : [];

  const updateHistoryEntry: AuditHistoryEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: options?.actionTitle || 'تعديل بيانات السجل',
    actionType: options?.actionType || 'update',
    userId,
    userName,
    userRole,
    userUsername,
    timestamp: now,
    details: options?.details,
    changesSummary: options?.changesSummary || 'تحديث البيانات وحفظ التعديلات في النظام',
  };

  return {
    ...existing,
    ...updates,
    createdAt: (existing as any).createdAt || (updates as any).createdAt || now,
    createdBy: (existing as any).createdBy || (updates as any).createdBy || userId,
    createdByName: (existing as any).createdByName || (updates as any).createdByName || userName,
    createdByRole: (existing as any).createdByRole || (updates as any).createdByRole || userRole,
    createdByUsername: (existing as any).createdByUsername || (updates as any).createdByUsername || userUsername,
    updatedAt: now,
    updatedBy: userId,
    updatedByName: userName,
    updatedByRole: userRole,
    updatedByUsername: userUsername,
    auditHistory: [updateHistoryEntry, ...prevHistory],
  };
}
