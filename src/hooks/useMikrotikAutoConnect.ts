import { useEffect, useState, useRef, useCallback } from 'react';
import { AppUser, NetworkSettings, NetworkTenant } from '../types';
import {
  canUserAccessMikrotik,
  performMikrotikAutoConnect,
  AutoConnectResult,
  resolveMikrotikCandidates,
} from '../utils/mikrotikAutoConnect';

export type AutoConnectStatus =
  | 'idle'
  | 'restricted_accounting_only' // Not allowed to access MikroTik, stays purely on accounting
  | 'connecting'
  | 'connected'
  | 'failed';

export interface UseMikrotikAutoConnectReturn {
  status: AutoConnectStatus;
  isConnecting: boolean;
  canAccessMikrotik: boolean;
  autoConnectResult: AutoConnectResult | null;
  statusMessage: string;
  retryAutoConnect: () => Promise<AutoConnectResult>;
  candidates: ReturnType<typeof resolveMikrotikCandidates>;
}

export function useMikrotikAutoConnect(
  isLoggedIn: boolean,
  activeUser: AppUser | null | undefined,
  settings: NetworkSettings,
  currentTenant: NetworkTenant | null,
  onUpdateSettings?: (newSettings: NetworkSettings) => void,
  onShowFeedback?: (feedback: { title: string; subtitle: string; type?: 'success' | 'info' | 'warning' }) => void
): UseMikrotikAutoConnectReturn {
  const [status, setStatus] = useState<AutoConnectStatus>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoConnectResult, setAutoConnectResult] = useState<AutoConnectResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const hasAttemptedRef = useRef<string | null>(null);

  // Check RBAC permission for this user
  const canAccess = canUserAccessMikrotik(activeUser, currentTenant);

  // Compute candidates preview
  const candidates = resolveMikrotikCandidates(settings.mikrotikConfig, settings);

  const executeAutoConnect = useCallback(
    async (isManualRetry = false): Promise<AutoConnectResult> => {
      // 1. Guard check
      if (!isLoggedIn) {
        setStatus('idle');
        setStatusMessage('يرجى تسجيل الدخول أولاً');
        return {
          allowed: false,
          attempted: false,
          success: false,
          mode: 'none',
          activeHost: '',
          error: 'المستخدم غير مسجل دخول',
          testedCandidates: [],
        };
      }

      if (!canAccess) {
        setStatus('restricted_accounting_only');
        const msg = 'تم تفعيل الصلاحيات الحسابية فقط - الاتصال التلقائي بالمايكروتك محجوب حسب صلاحياتك';
        setStatusMessage(msg);
        return {
          allowed: false,
          attempted: false,
          success: false,
          mode: 'none',
          activeHost: '',
          error: msg,
          testedCandidates: [],
        };
      }

      // 2. Perform intelligent discovery & connection
      setIsConnecting(true);
      setStatus('connecting');
      setStatusMessage('جاري البحث والاتصال التلقائي براوتر المايكروتك...');

      try {
        const result = await performMikrotikAutoConnect(activeUser, settings, currentTenant);
        setAutoConnectResult(result);

        if (result.success && result.updatedConfig) {
          setStatus('connected');
          const connectionDesc =
            result.mode === 'local'
              ? `محلياً عبر IP الشبكة (${result.activeHost})`
              : `عن بُعد عبر رابط المايكروتك (${result.activeHost})`;

          const successMsg = `تم الاتصال بالمايكروتك ${connectionDesc} بنجاح (${result.latencyMs ?? 0}ms)`;
          setStatusMessage(successMsg);

          // Update application settings with the successful live connection
          if (onUpdateSettings) {
            onUpdateSettings({
              ...settings,
              mikrotikIp: result.activeHost,
              mikrotikConfig: result.updatedConfig,
            });
          }

          // Emit feedback banner if requested
          if (onShowFeedback) {
            onShowFeedback({
              title: `تم الاتصال بالمايكروتك بنجاح (${result.mode === 'local' ? 'اتصال محلي' : 'اتصال عن بُعد'})`,
              subtitle: `الراوتر: ${result.identity || result.activeHost} | سرعة الاستجابة: ${result.latencyMs ?? 0}ms | ${result.version || 'RouterOS'}`,
              type: 'success',
            });
          }
        } else {
          setStatus('failed');
          const failMsg = result.error || 'تعذر الاتصال براوتر المايكروتك محلياً أو عن بعد';
          setStatusMessage(failMsg);

          if (isManualRetry && onShowFeedback) {
            onShowFeedback({
              title: 'تعذر الاتصال بالمايكروتك',
              subtitle: result.diagnostics || failMsg,
              type: 'warning',
            });
          }
        }

        return result;
      } catch (err: any) {
        setStatus('failed');
        const errMsg = err.message || 'خطأ غير متوقع أثناء الاتصال بالمايكروتك';
        setStatusMessage(errMsg);
        return {
          allowed: true,
          attempted: true,
          success: false,
          mode: 'none',
          activeHost: settings.mikrotikConfig?.host || '',
          error: errMsg,
          testedCandidates: [],
        };
      } finally {
        setIsConnecting(false);
      }
    },
    [isLoggedIn, canAccess, activeUser, settings, currentTenant, onUpdateSettings, onShowFeedback]
  );

  // Trigger automatically when user logs in or switches user
  useEffect(() => {
    if (!isLoggedIn) {
      setStatus('idle');
      hasAttemptedRef.current = null;
      return;
    }

    const attemptKey = `${activeUser?.id || 'unknown'}_${settings.mikrotikConfig?.host || settings.mikrotikIp || 'default'}_${currentTenant?.id || 'sys'}`;

    if (!canAccess) {
      setStatus('restricted_accounting_only');
      setStatusMessage('تم حصر الوصول على الصلاحيات الحسابية فقط');
      return;
    }

    // Only auto-run once per user/settings session unless triggered manually
    if (hasAttemptedRef.current === attemptKey) {
      return;
    }

    hasAttemptedRef.current = attemptKey;

    // Small delay (600ms) to allow initial render & token propagation
    const timer = setTimeout(() => {
      executeAutoConnect(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoggedIn, activeUser?.id, canAccess, settings.mikrotikConfig?.host, settings.mikrotikIp, currentTenant?.id, executeAutoConnect]);

  return {
    status,
    isConnecting,
    canAccessMikrotik: canAccess,
    autoConnectResult,
    statusMessage,
    retryAutoConnect: () => executeAutoConnect(true),
    candidates,
  };
}
