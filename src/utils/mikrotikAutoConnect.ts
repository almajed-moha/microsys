import { AppUser, NetworkSettings, NetworkTenant, MikroTikConfig } from '../types';
import { hasPermission } from './permissions';
import { testMikroTikConnection, ConnectionTestResult, isPrivateIp } from './mikrotikApi';

export interface CandidateTarget {
  host: string;
  type: 'local' | 'remote';
  description: string;
}

export interface CandidateTestAttempt {
  host: string;
  type: 'local' | 'remote';
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export interface AutoConnectResult {
  allowed: boolean;
  attempted: boolean;
  success: boolean;
  mode: 'local' | 'remote' | 'none';
  activeHost: string;
  latencyMs?: number;
  protocolUsed?: string;
  identity?: string;
  version?: string;
  error?: string;
  diagnostics?: string;
  testedCandidates: CandidateTestAttempt[];
  updatedConfig?: MikroTikConfig;
}

/**
 * Check if the active user has explicit permission to access MikroTik
 * If false, user remains strictly restricted to their accounting permissions.
 */
export function canUserAccessMikrotik(
  user: AppUser | null | undefined,
  tenant?: NetworkTenant | null
): boolean {
  if (!user) return false;
  // System Owner and Super Admin have full access
  if (user.role === 'system_owner') return true;
  return hasPermission(user, 'mikrotik', 'view', tenant);
}

/**
 * Extract candidates for local IP vs remote MikroTik link / URL
 */
export function resolveMikrotikCandidates(
  config?: Partial<MikroTikConfig>,
  settings?: Partial<NetworkSettings>
): {
  localCandidate: CandidateTarget | null;
  remoteCandidate: CandidateTarget | null;
  preferredOrder: CandidateTarget[];
} {
  const currentHost = (config?.host || settings?.mikrotikIp || '').trim();
  const explicitLocal = (config?.localHost || '').trim();
  const explicitRemote = (config?.remoteHost || '').trim();

  let localHost = explicitLocal;
  if (!localHost) {
    if (isPrivateIp(currentHost)) {
      localHost = currentHost;
    } else if (settings?.mikrotikIp && isPrivateIp(settings.mikrotikIp)) {
      localHost = settings.mikrotikIp;
    } else {
      localHost = '192.168.88.1'; // Default local RouterOS gateway
    }
  }

  let remoteHost = explicitRemote;
  if (!remoteHost) {
    if (currentHost && !isPrivateIp(currentHost) && currentHost !== 'demo') {
      remoteHost = currentHost;
    } else if (settings?.loginPageUrl && !isPrivateIp(settings.loginPageUrl)) {
      try {
        const url = new URL(settings.loginPageUrl.startsWith('http') ? settings.loginPageUrl : `http://${settings.loginPageUrl}`);
        if (!isPrivateIp(url.hostname)) {
          remoteHost = url.hostname;
        }
      } catch {}
    }
  }

  const localTarget: CandidateTarget = {
    host: localHost,
    type: 'local',
    description: `الاتصال المحلي عبر الشبكة الداخلية (IP: ${localHost})`,
  };

  const remoteTarget: CandidateTarget | null = remoteHost && remoteHost !== localHost
    ? {
        host: remoteHost,
        type: 'remote',
        description: `الاتصال عن بُعد عبر الرابط / السيرفر (Host: ${remoteHost})`,
      }
    : null;

  // Determine probing order based on configuration
  const connectionMode = config?.connectionMode || 'auto_switch';
  let preferredOrder: CandidateTarget[] = [];

  if (connectionMode === 'remote_always' && remoteTarget) {
    preferredOrder = [remoteTarget, localTarget];
  } else if (connectionMode === 'local') {
    preferredOrder = [localTarget];
  } else {
    // Default 'auto_switch': Try local network first (fastest), then fallback to remote link
    preferredOrder = remoteTarget ? [localTarget, remoteTarget] : [localTarget];
  }

  return {
    localCandidate: localTarget,
    remoteCandidate: remoteTarget,
    preferredOrder,
  };
}

/**
 * Automatically searches and connects to MikroTik upon system entry / login
 * Respects network administrator permissions strictly:
 * - If user lacks MikroTik permissions (e.g. accountant/cashier), connection is NOT attempted.
 * - If user has permissions, searches local IP and remote link automatically.
 */
export async function performMikrotikAutoConnect(
  user: AppUser | null | undefined,
  settings: NetworkSettings,
  tenant?: NetworkTenant | null,
  options?: {
    customTimeoutMs?: number;
    forceRefresh?: boolean;
  }
): Promise<AutoConnectResult> {
  // 1. Strict RBAC verification
  const isAllowed = canUserAccessMikrotik(user, tenant);
  if (!isAllowed) {
    return {
      allowed: false,
      attempted: false,
      success: false,
      mode: 'none',
      activeHost: '',
      error: 'المستخدم الحالي مقيد بالصلاحيات الحسابية فقط ولا يملك إذن الوصول للمايكروتك.',
      diagnostics: 'تم حجب الاتصال التلقائي بالراوتر وفقاً للصلاحيات الممنوحة لمدير الحسابات.',
      testedCandidates: [],
    };
  }

  const baseConfig: MikroTikConfig = {
    host: settings.mikrotikConfig?.host || settings.mikrotikIp || '192.168.88.1',
    port: settings.mikrotikConfig?.port || 8728,
    protocol: settings.mikrotikConfig?.protocol || 'auto',
    username: settings.mikrotikConfig?.username || 'admin',
    password: settings.mikrotikConfig?.password || '',
    useSsl: settings.mikrotikConfig?.useSsl ?? false,
    autoRefreshInterval: settings.mikrotikConfig?.autoRefreshInterval ?? 5,
    isLiveConnected: settings.mikrotikConfig?.isLiveConnected ?? false,
    connectionMode: settings.mikrotikConfig?.connectionMode || 'auto_switch',
    localHost: settings.mikrotikConfig?.localHost,
    remoteHost: settings.mikrotikConfig?.remoteHost,
  };

  const { preferredOrder } = resolveMikrotikCandidates(baseConfig, settings);
  const timeoutMs = options?.customTimeoutMs || 3000;
  const testedCandidates: CandidateTestAttempt[] = [];

  let winningAttempt: { candidate: CandidateTarget; result: ConnectionTestResult } | null = null;

  // 2. Intelligent Candidate Testing Loop
  for (const candidate of preferredOrder) {
    try {
      const testConfig: Partial<MikroTikConfig> = {
        ...baseConfig,
        host: candidate.host,
        timeoutMs,
      };

      const result = await testMikroTikConnection(testConfig);

      testedCandidates.push({
        host: candidate.host,
        type: candidate.type,
        success: result.success,
        latencyMs: result.latencyMs,
        error: result.error,
      });

      if (result.success) {
        winningAttempt = { candidate, result };
        break; // Successfully connected to active path!
      }
    } catch (err: any) {
      testedCandidates.push({
        host: candidate.host,
        type: candidate.type,
        success: false,
        error: err.message,
      });
    }
  }

  // 3. Process outcomes
  if (winningAttempt) {
    const { candidate, result } = winningAttempt;
    const updatedConfig: MikroTikConfig = {
      ...baseConfig,
      host: candidate.host,
      isLiveConnected: true,
      lastConnectedAt: new Date().toISOString(),
      routerIdentity: result.identity || baseConfig.routerIdentity,
      routerOsVersion: result.version || baseConfig.routerOsVersion,
      // Persist the detected working candidate slots
      localHost: candidate.type === 'local' ? candidate.host : baseConfig.localHost,
      remoteHost: candidate.type === 'remote' ? candidate.host : baseConfig.remoteHost,
    };

    return {
      allowed: true,
      attempted: true,
      success: true,
      mode: candidate.type,
      activeHost: candidate.host,
      latencyMs: result.latencyMs,
      protocolUsed: result.protocolUsed,
      identity: result.identity,
      version: result.version,
      testedCandidates,
      updatedConfig,
    };
  }

  // Failed to connect to any candidate
  return {
    allowed: true,
    attempted: true,
    success: false,
    mode: 'none',
    activeHost: baseConfig.host,
    error: 'تعذر الاتصال بالمايكروتك سواء عبر IP المحلي أو رابط التحكم عن بُعد',
    diagnostics: testedCandidates.map((c) => `${c.type === 'local' ? 'محلي' : 'عن بعد'} (${c.host}): ${c.error || 'لا توجد استجابة'}`).join(' | '),
    testedCandidates,
  };
}
