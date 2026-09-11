import {
  MikroTikConfig,
  RouterSystemInfo,
  HotspotActiveUser,
  HotspotHost,
  RouterInterface,
  DhcpLease,
  MikrotikCallerSession,
} from '../types';

export interface ConnectionTestResult {
  success: boolean;
  protocolUsed?: string;
  version?: string;
  identity?: string;
  latencyMs?: number;
  details?: any;
  error?: string;
  diagnostics?: string;
}

export function isPrivateIp(host?: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  return false;
}

export function formatBitsToSpeed(bitsPerSec?: number): string {
  if (!bitsPerSec || bitsPerSec <= 0) return '0 bps';
  if (bitsPerSec >= 1000000000) {
    return (bitsPerSec / 1000000000).toFixed(2) + ' Gbps';
  }
  if (bitsPerSec >= 1000000) {
    return (bitsPerSec / 1000000).toFixed(2) + ' Mbps';
  }
  if (bitsPerSec >= 1000) {
    return (bitsPerSec / 1000).toFixed(1) + ' Kbps';
  }
  return Math.round(bitsPerSec) + ' bps';
}

export function formatBytesToHuman(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 1. Test Router Connection
export async function testMikroTikConnection(config: Partial<MikroTikConfig>): Promise<ConnectionTestResult> {
  try {
    const res = await fetch('/api/mikrotik/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'تعذر الاتصال بخادم التطبيق',
      diagnostics: 'تأكد من تشغيل خادم النظام وصحة الاتصال بالشبكة المحلية.',
    };
  }
}

// 2. Fetch System Info (CPU, Memory, Uptime)
export async function fetchRouterSystemInfo(config: Partial<MikroTikConfig>): Promise<RouterSystemInfo | null> {
  try {
    const res = await fetch('/api/mikrotik/system-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.warn('fetchRouterSystemInfo notice:', error);
    return null;
  }
}

// 3. Fetch Hotspot Active Users & Bandwidth
export async function fetchActiveHotspotUsers(config: Partial<MikroTikConfig>): Promise<HotspotActiveUser[]> {
  try {
    const res = await fetch('/api/mikrotik/active-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchActiveHotspotUsers notice:', error);
    return [];
  }
}

// 3b. Fetch Comprehensive Mikrotik Sessions & Real Caller Statistics
export async function fetchMikrotikSessions(config: Partial<MikroTikConfig>): Promise<{
  success: boolean;
  sessions: MikrotikCallerSession[];
  activeCount: number;
  totalCount: number;
  summary: {
    totalDownload: number;
    totalUpload: number;
    activeNow: number;
    totalSessions: number;
  };
  routerIdentity?: string;
  error?: string;
  isPrivateIp?: boolean;
}> {
  try {
    const res = await fetch('/api/mikrotik/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        sessions: data.data || [],
        activeCount: data.activeCount || 0,
        totalCount: data.totalCount || 0,
        summary: data.summary || {
          totalDownload: 0,
          totalUpload: 0,
          activeNow: 0,
          totalSessions: 0,
        },
        routerIdentity: data.routerIdentity,
      };
    } else {
      return {
        success: false,
        sessions: [],
        activeCount: 0,
        totalCount: 0,
        summary: {
          totalDownload: 0,
          totalUpload: 0,
          activeNow: 0,
          totalSessions: 0,
        },
        error: data.error || 'تعذر الاتصال بالراوتر',
        isPrivateIp: data.isPrivateIp,
      };
    }
  } catch (error: any) {
    console.warn('fetchMikrotikSessions notice:', error);
    return {
      success: false,
      sessions: [],
      activeCount: 0,
      totalCount: 0,
      summary: {
        totalDownload: 0,
        totalUpload: 0,
        activeNow: 0,
        totalSessions: 0,
      },
      error: error?.message || 'خطأ في الاتصال بالخادم',
    };
  }
}

// 4. Fetch Connected Physical Hosts & DHCP Leases
export async function fetchConnectedHosts(config: Partial<MikroTikConfig>): Promise<{
  hosts: HotspotHost[];
  leases: DhcpLease[];
}> {
  try {
    const res = await fetch('/api/mikrotik/connected-hosts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : { hosts: [], leases: [] };
  } catch (error) {
    console.warn('fetchConnectedHosts notice:', error);
    return { hosts: [], leases: [] };
  }
}

// 5. Fetch Interfaces & Live Bandwidth
export async function fetchRouterInterfaces(config: Partial<MikroTikConfig>): Promise<RouterInterface[]> {
  try {
    const res = await fetch('/api/mikrotik/interfaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchRouterInterfaces notice:', error);
    return [];
  }
}

// 6. Kick / Disconnect Hotspot User
export async function kickHotspotUser(config: Partial<MikroTikConfig>, userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/mikrotik/kick-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('kickHotspotUser notice:', error);
    return false;
  }
}

// 7. Bulk Create Users Directly on Router
export async function createMikroTikHotspotUsers(
  config: Partial<MikroTikConfig>,
  users: Array<{
    name: string;
    password?: string;
    profile?: string;
    limitUptime?: string;
    limitBytesTotal?: number;
    comment?: string;
  }>
): Promise<{ success: boolean; createdCount: number; errors?: string[] }> {
  try {
    const res = await fetch('/api/mikrotik/create-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, users }),
    });
    return await res.json();
  } catch (error: any) {
    console.error('createMikroTikHotspotUsers error:', error);
    return { success: false, createdCount: 0, errors: [error.message || 'تعذر الاتصال'] };
  }
}

// 8. Fetch Configured Hotspot Users
export async function fetchConfiguredHotspotUsers(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/configured-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchConfiguredHotspotUsers notice:', error);
    return [];
  }
}

// 9. Fetch Hotspot User Profiles
export async function fetchHotspotUserProfiles(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/user-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchHotspotUserProfiles notice:', error);
    return [];
  }
}

// 10. Delete Configured Hotspot User
export async function deleteConfiguredHotspotUser(config: Partial<MikroTikConfig>, userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/mikrotik/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('deleteConfiguredHotspotUser notice:', error);
    return false;
  }
}

// 10b. Delete Multiple Hotspot Users (Bulk)
export async function deleteConfiguredHotspotUsersBulk(
  config: Partial<MikroTikConfig>,
  userIds: string[]
): Promise<{ success: boolean; deletedCount: number; message?: string }> {
  try {
    const res = await fetch('/api/mikrotik/delete-users-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userIds }),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      deletedCount: data.deletedCount || 0,
      message: data.message,
    };
  } catch (error: any) {
    console.warn('deleteConfiguredHotspotUsersBulk notice:', error);
    return { success: false, deletedCount: 0, message: error?.message };
  }
}

// 11. Save or Update Hotspot User Profile
export async function saveHotspotUserProfile(
  config: Partial<MikroTikConfig>,
  profile: {
    id?: string;
    name: string;
    rateLimit?: string;
    sharedUsers?: number | string;
    statusAutorefresh?: string;
    idleTimeout?: string;
    sessionTimeout?: string;
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/mikrotik/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, profile }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'تعذر الاتصال' };
  }
}

// 12. Execute Remote System Command (Reboot, Shutdown, Ping)
export async function executeMikrotikSystemCommand(
  config: Partial<MikroTikConfig>,
  command: 'reboot' | 'shutdown' | 'ping' | 'script',
  extraParams?: Record<string, any>
): Promise<{ success: boolean; message: string; output?: any }> {
  try {
    const res = await fetch('/api/mikrotik/system-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, command, extraParams }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'فشل تنفيذ الأمر' };
  }
}

// 13. Generate MikroTik RouterOS Script (.rsc) for Hotspot Users
export function generateHotspotCardsRscScript(
  categoryName: string,
  profile: string,
  uptimeLimit: string,
  quotaLimit: string,
  users: Array<{ username: string; pin?: string }>
): string {
  const timestamp = new Date().toISOString();
  let script = `# ========================================================\n`;
  script += `# MikroTik Hotspot User Import Script (.rsc)\n`;
  script += `# Category: ${categoryName}\n`;
  script += `# Profile: ${profile}\n`;
  script += `# Generated: ${timestamp}\n`;
  script += `# Total Cards: ${users.length}\n`;
  script += `# ========================================================\n\n`;

  users.forEach((u) => {
    let line = `/ip hotspot user add name="${u.username}" password="${u.pin || u.username}" profile="${profile || 'default'}"`;
    if (uptimeLimit && uptimeLimit !== 'unlimited') {
      line += ` limit-uptime="${uptimeLimit}"`;
    }
    if (quotaLimit && quotaLimit !== 'unlimited') {
      let bytes = 0;
      if (quotaLimit.endsWith('M')) bytes = parseInt(quotaLimit) * 1024 * 1024;
      else if (quotaLimit.endsWith('G')) bytes = parseInt(quotaLimit) * 1024 * 1024 * 1024;
      if (bytes > 0) line += ` limit-bytes-total=${bytes}`;
    }
    line += ` comment="${categoryName} - POS Generated"\n`;
    script += line;
  });

  return script;
}

// ==========================================
// USER MANAGER (اليوزر مانجر) FRONTEND API
// ==========================================

// 14. Fetch User Manager Users
export async function fetchUserManagerUsers(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/um/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config }),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchUserManagerUsers notice:', error);
    return [];
  }
}

// 15. Fetch User Manager Profiles
export async function fetchUserManagerProfiles(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/um/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config }),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchUserManagerProfiles notice:', error);
    return [];
  }
}

// 16. Fetch User Manager Limitations
export async function fetchUserManagerLimitations(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/um/limitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config }),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchUserManagerLimitations notice:', error);
    return [];
  }
}

// 17. Fetch User Manager Routers
export async function fetchUserManagerRouters(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/um/routers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config }),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchUserManagerRouters notice:', error);
    return [];
  }
}

// 18. Batch Create Users into User Manager
export async function createUserManagerBatchCards(
  config: Partial<MikroTikConfig>,
  cards: Array<{
    username: string;
    password?: string;
    profile: string;
    customer?: string;
    comment?: string;
  }>
): Promise<{ success: boolean; createdCount: number; errors?: string[] }> {
  try {
    const res = await fetch('/api/mikrotik/um/batch-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, cards }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, createdCount: 0, errors: [error.message || 'تعذر الاتصال'] };
  }
}

// 19. Save Profile & Limitation in User Manager
export async function saveUserManagerProfileAndLimitation(
  config: Partial<MikroTikConfig>,
  profileData: {
    profileName: string;
    limitationName?: string;
    nameForUsers?: string;
    price?: number;
    validityDays?: number | string;
    uptimeLimit?: string;
    quotaLimit?: string;
    rateLimit?: string;
    startsAt?: string;
    routerOsVersion?: 'v6' | 'v7';
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/mikrotik/um/save-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, profileData }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message || 'تعذر الاتصال' };
  }
}

// 19.1 Delete Profile from User Manager
export async function deleteUserManagerProfile(
  config: Partial<MikroTikConfig>,
  profileIdOrName: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/mikrotik/um/delete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, profileId: profileIdOrName, profileName: profileIdOrName }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('deleteUserManagerProfile notice:', error);
    return false;
  }
}

// 20. Delete User from User Manager
export async function deleteUserManagerUser(config: Partial<MikroTikConfig>, userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/mikrotik/um/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('deleteUserManagerUser notice:', error);
    return false;
  }
}

// 21. Reset User Manager User Counters
export async function resetUserManagerUserCounters(config: Partial<MikroTikConfig>, userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/mikrotik/um/reset-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userId }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (error) {
    console.warn('resetUserManagerUserCounters notice:', error);
    return false;
  }
}

// 21b. Update User Manager User (Edit card, password, profile, comment, disabled status)
export async function updateUserManagerUser(
  config: Partial<MikroTikConfig>,
  userData: {
    id?: string;
    name: string;
    password?: string;
    actualProfile?: string;
    disabled?: boolean;
    comment?: string;
    limitUptime?: string;
    limitBytesTotal?: number;
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/mikrotik/um/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userData }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || 'تعذر تحديث الكارت في User Manager' };
  }
}

// 21c. Fetch User Manager Sessions
export async function fetchUserManagerSessions(
  config: Partial<MikroTikConfig>,
  userName?: string
): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/um/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, userName }),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.warn('fetchUserManagerSessions notice:', error);
    return [];
  }
}

// 21d. Fetch User Manager Daily Usage Report
export async function fetchUserManagerDailyReport(
  config: Partial<MikroTikConfig>,
  date?: string
): Promise<{
  success: boolean;
  data?: {
    date: string;
    summary: {
      totalWanBytes: number;
      wanDownloadBytes: number;
      wanUploadBytes: number;
      totalCardsBytes: number;
      cardsDownloadBytes: number;
      cardsUploadBytes: number;
      overheadBytes: number;
      matchPercentage: number;
      activeCardsNow: number;
      totalActiveCardsToday: number;
      totalSessionsToday: number;
      wanInterfaceName: string;
    };
    cardsUsage: Array<{
      user: string;
      profile: string;
      sessionsCount: number;
      downloadBytes: number;
      uploadBytes: number;
      totalBytes: number;
      uptimeSeconds: number;
      isActiveNow: boolean;
      comment?: string;
    }>;
    sessions: any[];
  };
  error?: string;
}> {
  try {
    const res = await fetch('/api/mikrotik/um/daily-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config, date }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || 'تعذر إعداد تقرير السحب اليومي' };
  }
}

// 22. Generate User Manager Batch Script (.rsc) for v6 & v7
export function generateUserManagerBatchRscScript(
  profileName: string,
  cards: Array<{ username: string; pin?: string }>,
  version: 'v6' | 'v7' = 'v7',
  customer: string = 'admin'
): string {
  const timestamp = new Date().toISOString();
  let script = `# ========================================================\n`;
  script += `# MikroTik User Manager (${version.toUpperCase()}) Batch Cards Script\n`;
  script += `# Profile: ${profileName}\n`;
  script += `# Customer/Owner: ${customer}\n`;
  script += `# Cards Count: ${cards.length}\n`;
  script += `# Generated: ${timestamp}\n`;
  script += `# ========================================================\n\n`;

  if (version === 'v7') {
    cards.forEach((c) => {
      const passParam = c.pin ? `password="${c.pin}" ` : '';
      script += `/user-manager user add name="${c.username}" ${passParam}profile="${profileName}" comment="POS UM Batch"\n`;
    });
  } else {
    cards.forEach((c) => {
      const passParam = c.pin ? `password="${c.pin}"` : `password=""`;
      script += `/tool user-manager user add customer="${customer}" username="${c.username}" ${passParam} comment="POS UM Batch"\n`;
      script += `/tool user-manager user create-and-activate-profile numbers="${c.username}" profile="${profileName}" customer="${customer}"\n`;
    });
  }

  return script;
}

// 23. Fetch Hotspot Servers Status
export async function fetchHotspotServers(config: Partial<MikroTikConfig>): Promise<any[]> {
  try {
    const res = await fetch('/api/mikrotik/hotspot-servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: config }),
    });
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.warn('fetchHotspotServers notice:', error);
    return [];
  }
}

// 24. Update Router Maintenance State & Programmatic Network Control
export async function updateRouterMaintenanceAndNetworkState(
  config: Partial<MikroTikConfig>,
  params: {
    networkStatus: 'online' | 'maintenance' | 'disabled';
    kickActiveUsers?: boolean;
    maintenanceMessage?: string;
    maintenanceTitle?: string;
  }
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const res = await fetch('/api/mikrotik/maintenance-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: config,
        networkStatus: params.networkStatus,
        kickActiveUsers: params.kickActiveUsers,
        maintenanceMessage: params.maintenanceMessage,
        maintenanceTitle: params.maintenanceTitle,
      }),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'تعذر الاتصال بالخادم لتطبيق حالة الصيانة',
    };
  }
}

// 25. Generate MikroTik Terminal Script (.rsc) for Maintenance & Network Status
export function generateMaintenanceRouterScript(
  networkName: string,
  networkStatus: 'online' | 'maintenance' | 'disabled',
  maintenanceTitle: string,
  maintenanceMessage: string,
  expectedTime?: string,
  supportPhone?: string
): string {
  const timestamp = new Date().toISOString();
  let script = `# ========================================================\n`;
  script += `# MikroTik RouterOS Maintenance & Network Control Script\n`;
  script += `# Network: ${networkName}\n`;
  script += `# Status Mode: ${networkStatus.toUpperCase()}\n`;
  script += `# Date: ${timestamp}\n`;
  script += `# ========================================================\n\n`;

  if (networkStatus === 'disabled') {
    script += `# 1. Disable All Hotspot Servers (إيقاف الهوتسبوت برمجياً)\n`;
    script += `/ip hotspot disable [find]\n\n`;
    script += `# 2. Kick / Disconnect All Active Sessions (فصل جميع المتصلين)\n`;
    script += `/ip hotspot active remove [find]\n\n`;
    script += `# 3. Log System Action\n`;
    script += `:log warning "HOTSPOT NETWORK SUSPENDED: Network disabled programmatically by Admin."\n`;
  } else if (networkStatus === 'maintenance') {
    script += `# 1. Ensure Hotspot is active so clients reach captive portal\n`;
    script += `/ip hotspot enable [find]\n\n`;
    script += `# 2. Disconnect active users to force maintenance portal redirect\n`;
    script += `/ip hotspot active remove [find]\n\n`;
    script += `# 3. Add Log and Notice\n`;
    script += `:log info "HOTSPOT MAINTENANCE MODE ENABLED: ${maintenanceTitle} - Expected Return: ${expectedTime || 'Soon'}"\n`;
  } else {
    script += `# 1. Enable All Hotspot Servers (تفعيل وتشغيل الهوتسبوت)\n`;
    script += `/ip hotspot enable [find]\n\n`;
    script += `# 2. Log System Action\n`;
    script += `:log info "HOTSPOT NETWORK ONLINE: Hotspot servers re-enabled and operational."\n`;
  }

  return script;
}

// 26. Generate High-Performance Captive Portal HTML Template (login.html / maintenance.html)
export function generateCaptivePortalMaintenanceHtml(
  networkName: string,
  networkSlogan: string,
  title: string,
  message: string,
  expectedTime: string = 'قريباً',
  supportPhone: string = '',
  whatsappNumber: string = '',
  theme: 'warning_amber' | 'danger_red' | 'tech_blue' | 'modern_dark' | 'emerald_pro' = 'warning_amber',
  showCountdown: boolean = true,
  targetTimestamp?: string
): string {
  const themeColors = {
    warning_amber: { bg: '#0f172a', cardBg: '#1e293b', border: '#f59e0b', accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', icon: '⚠️' },
    danger_red: { bg: '#09090b', cardBg: '#18181b', border: '#ef4444', accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)', icon: '🚨' },
    tech_blue: { bg: '#030712', cardBg: '#0f172a', border: '#3b82f6', accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)', icon: '🔧' },
    modern_dark: { bg: '#050505', cardBg: '#121212', border: '#a855f7', accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)', icon: '⚡' },
    emerald_pro: { bg: '#022c22', cardBg: '#064e3b', border: '#10b981', accent: '#10b981', glow: 'rgba(16, 185, 129, 0.25)', icon: '🛡️' },
  }[theme];

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${networkName} - صيانة وتحديث الشبكة</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body {
      background: ${themeColors.bg};
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }
    .card {
      background: ${themeColors.cardBg};
      border: 1px solid ${themeColors.border};
      border-radius: 20px;
      padding: 2rem 1.5rem;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 20px 40px ${themeColors.glow};
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.06);
      border: 1px solid ${themeColors.border};
      color: ${themeColors.accent};
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    .title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }
    .message {
      font-size: 0.95rem;
      color: #cbd5e1;
      line-height: 1.6;
      margin-bottom: 1.5rem;
      background: rgba(0,0,0,0.25);
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .info-box {
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-around;
      border: 1px dashed rgba(255,255,255,0.1);
    }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 0.75rem; color: #94a3b8; }
    .info-value { font-size: 1rem; font-weight: bold; color: ${themeColors.accent}; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      font-weight: bold;
      text-decoration: none;
      transition: 0.2s;
      cursor: pointer;
      font-size: 0.95rem;
      border: none;
    }
    .btn-whatsapp { background: #25d366; color: #ffffff; margin-bottom: 0.75rem; }
    .btn-whatsapp:hover { background: #1eb857; }
    .btn-retry { background: rgba(255,255,255,0.1); color: #f8fafc; }
    .btn-retry:hover { background: rgba(255,255,255,0.18); }
    .footer { margin-top: 1.5rem; font-size: 0.75rem; color: #64748b; }
    .pulse-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${themeColors.glow};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin: 0 auto 1.25rem;
      border: 2px solid ${themeColors.border};
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 0.85; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="pulse-icon">${themeColors.icon}</div>
    <div class="badge">${networkName} • تنبيه صيانة</div>
    <h1 class="title">${title}</h1>
    <p class="message">${message}</p>
    
    <div class="info-box">
      <div class="info-item">
        <span class="info-label">حالة الخدمة</span>
        <span class="info-value">صيانة دورية</span>
      </div>
      <div class="info-item">
        <span class="info-label">العودة المتوقعة</span>
        <span class="info-value">${expectedTime || 'خلال دقائق'}</span>
      </div>
    </div>

    ${whatsappNumber ? `<a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('مرحباً، أستفسر عن موعد عودة خدمة شبكة ' + networkName)}" target="_blank" class="btn btn-whatsapp">تواصل مع الدعم عبر واتساب</a>` : ''}
    <button onclick="window.location.reload();" class="btn btn-retry">إعادة فحص الاتصال 🔄</button>

    <div class="footer">
      ${networkSlogan ? `<div>${networkSlogan}</div>` : ''}
      <div>نشكركم على تفهمكم وحسن صبركم</div>
    </div>
  </div>
</body>
</html>`;
}

