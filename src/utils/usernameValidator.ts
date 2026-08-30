import { AppUser, POSPoint, NetworkTenant } from '../types';

export interface UsernameValidationResult {
  status: 'empty' | 'too_short' | 'invalid_format' | 'taken' | 'available';
  isValid: boolean;
  message: string;
  conflictDetails?: string;
  suggestedUsernames: string[];
}

/**
 * Validates whether a username is globally unique and valid across:
 * 1. All App Users (system owners, admins, accountants, cashiers, POS agents, etc.)
 * 2. All POS Points (dealers/agents)
 * 3. All Network Tenants (tenant super-admins)
 */
export function checkUsernameAvailability(
  rawUsername: string,
  allUsers: AppUser[] = [],
  allPosPoints: POSPoint[] = [],
  allTenants: NetworkTenant[] = [],
  options?: {
    excludeUserId?: string;
    excludePosId?: string;
    excludeTenantId?: string;
  }
): UsernameValidationResult {
  const username = (rawUsername || '').trim().toLowerCase();

  if (!username) {
    return {
      status: 'empty',
      isValid: false,
      message: 'يرجى إدخال اسم مستخدم للدخول',
      suggestedUsernames: [],
    };
  }

  if (username.length < 3) {
    return {
      status: 'too_short',
      isValid: false,
      message: 'اسم المستخدم قصير جداً (3 أحرف على الأقل)',
      suggestedUsernames: [],
    };
  }

  // Allow English letters, numbers, underscores, dashes, and periods
  const validPattern = /^[a-z0-9_.-]+$/;
  if (!validPattern.test(username)) {
    return {
      status: 'invalid_format',
      isValid: false,
      message: 'يجب استخدام أحرف إنجليزية وأرقام و (_ . -) فقط بدون مسافات',
      suggestedUsernames: [],
    };
  }

  // Reserved keywords
  const reservedUsernames = ['root', 'null', 'undefined', 'anonymous', 'guest'];
  if (reservedUsernames.includes(username)) {
    return {
      status: 'taken',
      isValid: false,
      message: 'هذا الاسم محجوز لنظام التشغيل، يرجى اختيار اسم آخر',
      suggestedUsernames: generateAlternativeUsernames(username, allUsers, allPosPoints, allTenants),
    };
  }

  // 1. Check in allUsers
  const conflictingUser = allUsers.find(
    (u) =>
      u.username?.toLowerCase() === username &&
      u.id !== options?.excludeUserId &&
      !(options?.excludePosId && u.posPointId === options.excludePosId) &&
      !(options?.excludeTenantId && u.networkId === options.excludeTenantId && u.role === 'super_admin')
  );

  if (conflictingUser) {
    const roleName = conflictingUser.customRoleName || conflictingUser.role;
    const networkInfo = conflictingUser.networkId ? ` (شبكة: ${conflictingUser.networkId})` : '';
    return {
      status: 'taken',
      isValid: false,
      message: `غير متاح! محجوز لمستخدم آخر: "${conflictingUser.name}" [${roleName}]${networkInfo}`,
      conflictDetails: `${conflictingUser.name} (${roleName})`,
      suggestedUsernames: generateAlternativeUsernames(username, allUsers, allPosPoints, allTenants),
    };
  }

  // 2. Check in allPosPoints
  const conflictingPOS = allPosPoints.find(
    (p) =>
      p.username?.toLowerCase() === username &&
      p.id !== options?.excludePosId
  );

  if (conflictingPOS) {
    return {
      status: 'taken',
      isValid: false,
      message: `غير متاح! محجوز لنقطة بيع أخرى: "${conflictingPOS.name}"`,
      conflictDetails: `نقطة بيع: ${conflictingPOS.name}`,
      suggestedUsernames: generateAlternativeUsernames(username, allUsers, allPosPoints, allTenants),
    };
  }

  // 3. Check in allTenants
  const conflictingTenant = allTenants.find(
    (t) =>
      t.adminUsername?.toLowerCase() === username &&
      t.id !== options?.excludeTenantId
  );

  if (conflictingTenant) {
    return {
      status: 'taken',
      isValid: false,
      message: `غير متاح! محجوز كاسم مستخدم إدارة لشبكة: "${conflictingTenant.name}"`,
      conflictDetails: `مدير شبكة: ${conflictingTenant.name}`,
      suggestedUsernames: generateAlternativeUsernames(username, allUsers, allPosPoints, allTenants),
    };
  }

  return {
    status: 'available',
    isValid: true,
    message: 'اسم المستخدم متاح وفريد وجاهز للاستخدام',
    suggestedUsernames: [],
  };
}

/**
 * Generate 3 smart, available alternative usernames if the desired one is taken
 */
export function generateAlternativeUsernames(
  baseUsername: string,
  allUsers: AppUser[],
  allPosPoints: POSPoint[],
  allTenants: NetworkTenant[]
): string[] {
  const cleanBase = baseUsername.replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  const candidates = [
    `${cleanBase}_${Math.floor(10 + Math.random() * 90)}`,
    `${cleanBase}${Math.floor(100 + Math.random() * 900)}`,
    `${cleanBase}_pos`,
    `${cleanBase}_net`,
    `${cleanBase}_pro`,
    `my_${cleanBase}`,
  ];

  const results: string[] = [];
  for (const candidate of candidates) {
    const res = checkUsernameAvailability(candidate, allUsers, allPosPoints, allTenants);
    if (res.isValid && !results.includes(candidate)) {
      results.push(candidate);
      if (results.length >= 3) break;
    }
  }

  return results;
}

export interface PhoneValidationResult {
  isValid: boolean;
  message: string;
}

export function checkPhoneAvailability(
  rawPhone: string | undefined,
  allUsers: AppUser[] = [],
  allPosPoints: POSPoint[] = [],
  options?: {
    excludeUserId?: string;
    excludePosId?: string;
  }
): PhoneValidationResult {
  const phone = (rawPhone || '').trim();
  if (!phone) {
    return { isValid: true, message: '' };
  }

  const conflictingUser = allUsers.find(
    (u) =>
      u.phone === phone &&
      u.id !== options?.excludeUserId &&
      !(options?.excludePosId && u.posPointId === options.excludePosId)
  );

  if (conflictingUser) {
    return {
      isValid: false,
      message: `غير متاح! رقم الهاتف محجوز لمستخدم آخر: "${conflictingUser.name}"`,
    };
  }

  const conflictingPOS = allPosPoints.find(
    (p) =>
      p.phone === phone &&
      p.id !== options?.excludePosId
  );

  if (conflictingPOS) {
    return {
      isValid: false,
      message: `غير متاح! رقم الهاتف محجوز لنقطة بيع: "${conflictingPOS.name}"`,
    };
  }

  return { isValid: true, message: 'متاح' };
}
