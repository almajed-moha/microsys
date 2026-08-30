import {
  MikroTikConfig,
  RouterSystemInfo,
  HotspotActiveUser,
  HotspotHost,
  RouterInterface,
  DhcpLease,
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
      script += `/user-manager user add name="${c.username}" password="${c.pin || c.username}" profile="${profileName}" comment="POS UM Batch"\n`;
    });
  } else {
    cards.forEach((c) => {
      script += `/tool user-manager user add customer="${customer}" username="${c.username}" password="${c.pin || c.username}" comment="POS UM Batch"\n`;
      script += `/tool user-manager user create-and-activate-profile numbers="${c.username}" profile="${profileName}" customer="${customer}"\n`;
    });
  }

  return script;
}

