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

// 8. Generate MikroTik RouterOS Script (.rsc) for Hotspot Users
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
