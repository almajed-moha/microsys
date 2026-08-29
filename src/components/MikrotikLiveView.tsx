import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Server,
  Activity,
  Wifi,
  Cpu,
  HardDrive,
  Clock,
  RefreshCw,
  Zap,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  AlertTriangle,
  Users,
  Radio,
  Sliders,
  Terminal,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Laptop,
  Smartphone,
  Eye,
  Key,
  Globe,
  Settings,
  HelpCircle,
  Copy,
  Check,
  CreditCard,
  Plus,
  FileCode,
  FileDown,
  Loader2,
  Sparkles,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  NetworkSettings,
  MikroTikConfig,
  RouterSystemInfo,
  HotspotActiveUser,
  HotspotHost,
  RouterInterface,
  DhcpLease,
  CardCategory
} from '../types';
import {
  testMikroTikConnection,
  fetchRouterSystemInfo,
  fetchActiveHotspotUsers,
  fetchConnectedHosts,
  fetchRouterInterfaces,
  kickHotspotUser,
  createMikroTikHotspotUsers,
  generateHotspotCardsRscScript,
  formatBytesToHuman,
  formatBitsToSpeed,
  ConnectionTestResult,
} from '../utils/mikrotikApi';
import { exportElementToPdf } from '../utils/pdfExport';

interface MikrotikLiveViewProps {
  settings: NetworkSettings;
  categories?: CardCategory[];
  onUpdateSettings: (newSettings: NetworkSettings) => void;
}

export const MikrotikLiveView: React.FC<MikrotikLiveViewProps> = ({
  settings,
  categories = [],
  onUpdateSettings,
}) => {
  // Config state
  const [config, setConfig] = useState<MikroTikConfig>(() => ({
    host: settings.mikrotikConfig?.host || settings.mikrotikIp || '192.168.88.1',
    port: settings.mikrotikConfig?.port || 8728,
    protocol: settings.mikrotikConfig?.protocol || 'auto',
    username: settings.mikrotikConfig?.username || 'admin',
    password: settings.mikrotikConfig?.password || '',
    useSsl: settings.mikrotikConfig?.useSsl ?? false,
    autoRefreshInterval: settings.mikrotikConfig?.autoRefreshInterval ?? 5,
    isLiveConnected: settings.mikrotikConfig?.isLiveConnected ?? false,
    routerModel: settings.mikrotikConfig?.routerModel,
    routerOsVersion: settings.mikrotikConfig?.routerOsVersion,
    routerIdentity: settings.mikrotikConfig?.routerIdentity,
  }));

  // Connection & Diagnostics State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isConnected, setIsConnected] = useState(config.isLiveConnected ?? false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Live Data State
  const [systemInfo, setSystemInfo] = useState<RouterSystemInfo | null>(null);
  const [activeUsers, setActiveUsers] = useState<HotspotActiveUser[]>([]);
  const [hosts, setHosts] = useState<HotspotHost[]>([]);
  const [dhcpLeases, setDhcpLeases] = useState<DhcpLease[]>([]);
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<{ time: string; rxMbps: number; txMbps: number }[]>([]);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'interfaces' | 'hosts' | 'cards' | 'diagnostics' | 'settings'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  // Direct Card Generator & MikroTik Sync State
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'custom');
  const [cardCount, setCardCount] = useState<number>(20);
  const [cardPrefix, setCardPrefix] = useState<string>('c');
  const [cardProfile, setCardProfile] = useState<string>(categories[0]?.mikrotikProfile || 'default');
  const [cardUptime, setCardUptime] = useState<string>(categories[0]?.uptimeLimit || '1h');
  const [cardQuota, setCardQuota] = useState<string>(categories[0]?.quotaLimit || '500M');
  const [cardPasswordMode, setCardPasswordMode] = useState<'same' | 'pin' | 'none'>('pin');
  const [cardSerialStart, setCardSerialStart] = useState<number>(1001);
  const [isSyncingWithRouter, setIsSyncingWithRouter] = useState(false);
  const [syncOutcome, setSyncOutcome] = useState<{ success: boolean; message: string } | null>(null);
  const [isExportingCardsPdf, setIsExportingCardsPdf] = useState(false);

  // Auto-refresh timer
  const refreshTimerRef = useRef<any>(null);

  // Synchronize config changes with master settings
  const saveConfig = (newCfg: MikroTikConfig) => {
    setConfig(newCfg);
    onUpdateSettings({
      ...settings,
      mikrotikIp: newCfg.host,
      mikrotikConfig: newCfg,
    });
  };

  // Perform a full live data fetch
  const fetchAllLiveData = useCallback(async (currentCfg: MikroTikConfig) => {
    try {
      const [sys, users, hostsData, ifaces] = await Promise.all([
        fetchRouterSystemInfo(currentCfg),
        fetchActiveHotspotUsers(currentCfg),
        fetchConnectedHosts(currentCfg),
        fetchRouterInterfaces(currentCfg),
      ]);

      if (sys) {
        setSystemInfo(sys);
        setIsConnected(true);
      }
      if (users) setActiveUsers(users);
      if (hostsData) {
        setHosts(hostsData.hosts || []);
        setDhcpLeases(hostsData.leases || []);
      }
      if (ifaces && ifaces.length > 0) {
        setInterfaces(ifaces);

        // Calculate total WAN or aggregate traffic for live chart
        const totalRxBits = ifaces.reduce((acc, i) => acc + (i.rxRateBps || 0), 0);
        const totalTxBits = ifaces.reduce((acc, i) => acc + (i.txRateBps || 0), 0);
        const rxMbps = parseFloat((totalRxBits / 1000000).toFixed(2));
        const txMbps = parseFloat((totalTxBits / 1000000).toFixed(2));

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setTrafficHistory((prev) => {
          const next = [...prev, { time: timeStr, rxMbps, txMbps }];
          return next.slice(-20); // Keep last 20 points
        });
      }

      setLastUpdated(new Date().toLocaleTimeString('ar-YE'));
    } catch (error) {
      console.error('Error polling MikroTik live data:', error);
    }
  }, []);

  // Handle Manual or Auto Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testMikroTikConnection(config);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      setIsConnected(true);
      const updated = {
        ...config,
        isLiveConnected: true,
        routerIdentity: res.identity,
        routerOsVersion: res.version,
      };
      saveConfig(updated);
      fetchAllLiveData(updated);
    } else {
      setIsConnected(false);
      saveConfig({ ...config, isLiveConnected: false });
    }
  };

  // Setup auto-refresh polling
  useEffect(() => {
    // Initial fetch if already connected or demo
    if (config.host) {
      fetchAllLiveData(config);
    }

    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

    if (config.autoRefreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchAllLiveData(config);
      }, config.autoRefreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [config.autoRefreshInterval, config.host, config.port, config.protocol, config.username, config.password, fetchAllLiveData]);

  // Handle User Disconnect / Kick
  const handleKickUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من فصل جلسة المشترك (${userName}) من الراوتر فوراً؟`)) {
      return;
    }
    setIsKicking(true);
    setKickTargetId(userId);

    const ok = await kickHotspotUser(config, userId);
    setIsKicking(false);
    setKickTargetId(null);

    if (ok) {
      setActiveUsers((prev) => prev.filter((u) => u.id !== userId && u.user !== userId));
      alert(`تم فصل المستخدم (${userName}) بنجاح.`);
    } else {
      alert('تعذر فصل المستخدم من الراوتر. تأكد من صلاحيات حساب المشرف.');
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(key);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  // Selected Category Object
  const selectedCategoryObj = categories.find((c) => c.id === selectedCatId);

  // Generate Preview Cards in memory
  const previewCards = useMemo(() => {
    const list: Array<{
      username: string;
      pin: string;
      profile: string;
      uptime: string;
      quota: string;
      price: number;
    }> = [];

    const effectivePrefix = cardPrefix || (selectedCategoryObj?.code ? `${selectedCategoryObj.code}-` : 'c');
    const effectiveProfile = cardProfile || selectedCategoryObj?.mikrotikProfile || 'default';
    const effectiveUptime = cardUptime || selectedCategoryObj?.uptimeLimit || '1h';
    const effectiveQuota = cardQuota || selectedCategoryObj?.quotaLimit || '500M';
    const effectivePrice = selectedCategoryObj?.retailPrice || 100;

    for (let i = 0; i < cardCount; i++) {
      const serialNum = cardSerialStart + i;
      const username = `${effectivePrefix}${serialNum}`;
      let pin = username;
      if (cardPasswordMode === 'pin') {
        pin = `${Math.floor(1000 + Math.random() * 9000)}`;
      } else if (cardPasswordMode === 'none') {
        pin = '';
      }

      list.push({
        username,
        pin,
        profile: effectiveProfile,
        uptime: effectiveUptime,
        quota: effectiveQuota,
        price: effectivePrice,
      });
    }

    return list;
  }, [cardCount, cardPrefix, cardProfile, cardUptime, cardQuota, cardPasswordMode, cardSerialStart, selectedCategoryObj]);

  // Sync Cards directly with MikroTik router
  const handleSyncCardsWithRouter = async () => {
    setIsSyncingWithRouter(true);
    setSyncOutcome(null);

    try {
      const formattedUsers = previewCards.map((c) => {
        let bytesTotal: number | undefined = undefined;
        if (c.quota && c.quota !== 'unlimited') {
          if (c.quota.endsWith('M')) bytesTotal = parseInt(c.quota) * 1024 * 1024;
          else if (c.quota.endsWith('G')) bytesTotal = parseInt(c.quota) * 1024 * 1024 * 1024;
        }

        return {
          name: c.username,
          password: c.pin || c.username,
          profile: c.profile || 'default',
          limitUptime: c.uptime !== 'unlimited' ? c.uptime : undefined,
          limitBytesTotal: bytesTotal,
          comment: `Created by POS App - ${new Date().toISOString().split('T')[0]}`,
        };
      });

      const res = await createMikroTikHotspotUsers(config, formattedUsers);
      setIsSyncingWithRouter(false);

      if (res.success) {
        setSyncOutcome({
          success: true,
          message: `تم بنجاح إنشاء وتفعيل ${res.createdCount} كارت في راوتر مايكروتك (${config.host})! الكروت جاهزة للعمل فوراً.`,
        });
        // Auto-increment serial start for next batch
        setCardSerialStart((prev) => prev + cardCount);
      } else {
        setSyncOutcome({
          success: false,
          message: res.errors?.join('\n') || 'تعذر إنشاء الكروت في الراوتر. يرجى مراجعة صلاحيات API في المايكروتك.',
        });
      }
    } catch (err: any) {
      setIsSyncingWithRouter(false);
      setSyncOutcome({
        success: false,
        message: err.message || 'حدث خطأ أثناء إرسال البيانات للمايكروتك.',
      });
    }
  };

  // Download .rsc script for current generated cards
  const handleDownloadCardsRsc = () => {
    const catName = selectedCategoryObj?.name || 'Hotspot Cards';
    const script = generateHotspotCardsRscScript(
      catName,
      cardProfile || selectedCategoryObj?.mikrotikProfile || 'default',
      cardUptime || selectedCategoryObj?.uptimeLimit || '1h',
      cardQuota || selectedCategoryObj?.quotaLimit || '500M',
      previewCards.map((c) => ({ username: c.username, pin: c.pin }))
    );

    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik_cards_${cardCount}_${selectedCategoryObj?.code || 'batch'}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Printable Card Sheet to PDF
  const handleExportCardsPdf = async () => {
    setIsExportingCardsPdf(true);
    try {
      const fileName = `كروت_مايكروتك_${selectedCategoryObj?.name || 'دفعة'}_${cardCount}_كارت.pdf`;
      await exportElementToPdf('mikrotik-cards-sheet-container', fileName);
    } catch (error) {
      console.error('Export cards PDF error:', error);
    } finally {
      setIsExportingCardsPdf(false);
    }
  };

  // Complete All-in-One Setup Script
  const completeSetupScript = useMemo(() => {
    return `# ========================================================
# MikroTik RouterOS Complete Setup Script for POS Web Suite
# Generated for: ${settings.networkName}
# Compatible with: RouterOS v6.x and v7.x (Hotspot & User Manager)
# ========================================================

# 1. Enable API and Management Services
/ip service set api disabled=no port=8728
/ip service set api-ssl disabled=no port=8729
/ip service set www disabled=no port=80
/ip service set www-ssl disabled=no port=443

# 2. Create POS Manager User & Permissions
/user group add name=pos-manager policy=api,read,write,test,policy,password,sensitive comment="MikroTik POS Manager Group"
/user add name=posadmin group=pos-manager password=YourSecurePassword123 comment="MikroTik POS Manager API User"

# 3. Allow API Ports in Firewall
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728,8729,80,443 comment="Allow POS Manager API" place-before=1

# 4. Create Standard Hotspot User Profiles
/ip hotspot user profile add name=Profile-100 rate-limit="4M/2M" shared-users=1 status-autorefresh=1m
/ip hotspot user profile add name=Profile-200 rate-limit="5M/2M" shared-users=1 status-autorefresh=1m
/ip hotspot user profile add name=Profile-500 rate-limit="6M/3M" shared-users=1 status-autorefresh=1m
/ip hotspot user profile add name=Profile-1000 rate-limit="8M/4M" shared-users=1 status-autorefresh=1m

# 5. Enable User Manager (if package installed)
/tool user-manager router add name=LocalHotspot address=127.0.0.1 shared-secret=123456
`;
  }, [settings.networkName]);

  // Download Complete Setup .rsc
  const handleDownloadCompleteSetupRsc = () => {
    const blob = new Blob([completeSetupScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik_complete_setup_${settings.networkName.replace(/\\s+/g, '_')}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered active users
  const filteredUsers = activeUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.user.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q) ||
      u.macAddress.toLowerCase().includes(q) ||
      (u.comment && u.comment.toLowerCase().includes(q))
    );
  });

  // Calculate live aggregate bandwidth
  const totalDownloadBytes = (activeUsers || []).reduce((acc, u) => acc + (u?.bytesOut || 0), 0);
  const totalUploadBytes = (activeUsers || []).reduce((acc, u) => acc + (u?.bytesIn || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Connection Controls */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>مركز المايكروتك المباشر والمراقبة الحية</span>
                  {isConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      متصل ومستقر
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      غير متصل (يتطلب اختبار الاتصال)
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  قراءة فورية لموارد الراوتر، المشتركين النشطين، وسرعات سحب الإنترنت مع دعم RouterOS v6 و v7 بنسبة 100%.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Auto-Refresh dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">التحديث:</span>
              <select
                value={config.autoRefreshInterval}
                onChange={(e) => saveConfig({ ...config, autoRefreshInterval: Number(e.target.value) })}
                className="bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-white text-xs font-mono focus:outline-none"
              >
                <option value={0}>يدوي (موقوف)</option>
                <option value={3}>كل 3 ثوانٍ</option>
                <option value={5}>كل 5 ثوانٍ</option>
                <option value={10}>كل 10 ثوانٍ</option>
                <option value={30}>كل 30 ثانية</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAllLiveData(config)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="تحديث البيانات الآن"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الفحص...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>فحص الاتصال والتوافق</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnostic Bar / Test Result Banner */}
        {testResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs transition animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm">
                    {testResult.success
                      ? `تم الاتصال بنجاح بـ (${testResult.identity || 'MikroTik'})`
                      : 'فشل الاتصال بالمايكروتك'}
                  </span>
                  {testResult.latencyMs !== undefined && (
                    <span className="font-mono px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700/60 text-slate-300">
                      زمن الاستجابة: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>

                <p className="text-slate-300">
                  البروتوكول المستخدم:{' '}
                  <strong className="font-mono text-white">{testResult.protocolUsed}</strong>
                  {testResult.version && ` • إصدار RouterOS: ${testResult.version}`}
                </p>

                {testResult.diagnostics && (
                  <div className="mt-2 p-2.5 bg-slate-950/80 rounded-lg font-mono text-[11px] whitespace-pre-line text-amber-300/90 border border-amber-500/20">
                    {testResult.diagnostics}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live System Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU Load */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">استهلاك المعالج (CPU)</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {systemInfo?.cpuLoad ?? 0}%
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {systemInfo?.cpuCount ? `${systemInfo.cpuCount} Cores` : '1 Core'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (systemInfo?.cpuLoad ?? 0) > 80
                  ? 'bg-rose-500'
                  : (systemInfo?.cpuLoad ?? 0) > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, systemInfo?.cpuLoad ?? 0)}%` }}
            ></div>
          </div>
        </div>

        {/* RAM Memory */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">الذاكرة العشوائية (RAM)</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {systemInfo?.totalMemory
                ? Math.round(
                    ((systemInfo.totalMemory - (systemInfo.freeMemory || 0)) /
                      systemInfo.totalMemory) *
                      100
                  )
                : 0}
              %
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              متاح: {formatBytesToHuman(systemInfo?.freeMemory || 0)}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{
                width: `${
                  systemInfo?.totalMemory
                    ? Math.round(
                        ((systemInfo.totalMemory - (systemInfo.freeMemory || 0)) /
                          systemInfo.totalMemory) *
                          100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Active Hotspot Users */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">المشتركين النشطين (Online)</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-indigo-400">
              {activeUsers.length}
            </span>
            <span className="text-[11px] text-slate-400">مستخدم متصل حالياً</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            إجمالي الأجهزة بالشبكة: {hosts.length} جهاز
          </p>
        </div>

        {/* Router Uptime & Model */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">موديل الراوتر ووقت التشغيل</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1">
            <span className="text-sm font-bold text-white block truncate">
              {systemInfo?.model || config.routerModel || 'MikroTik Router'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              تشغيل مستمر: {systemInfo?.uptime || 'غير متاح'}
            </span>
          </div>
        </div>
      </div>

      {/* Aggregate Bandwidth Consumption Banner */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">إجمالي سحب البيانات للمستخدمين المتصلين</h4>
            <p className="text-xs text-slate-400">
              مجموع استهلاك التحميل والرفع المسجل في جلسات الهوتسبوت النشطة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">إجمالي التحميل (Download):</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatBytesToHuman(totalDownloadBytes)}
              </span>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-slate-400 block text-[10px]">إجمالي الرفع (Upload):</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {formatBytesToHuman(totalUploadBytes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمين النشطين ({activeUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('interfaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'interfaces'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>حركة واجهات الشبكة والسرعات ({interfaces.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hosts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'hosts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>الأجهزة المتصلة و DHCP ({hosts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'cards'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>توليد ومزامنة الكروت بالراوتر</span>
        </button>

        <button
          onClick={() => setActiveSubTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>فحص التوافق وسكربتات التهيئة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition mr-auto ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات الاتصال والمنفذ</span>
        </button>
      </div>

      {/* SUB-VIEW 1: Active Users */}
      {activeSubTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter / Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث بالمستخدم، IP، أو الماك..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>آخر تحديث: <strong className="font-mono text-slate-200">{lastUpdated || 'الآن'}</strong></span>
            </div>
          </div>

          {/* Active Users Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3.5">اسم المشترك / الكارت</th>
                    <th className="p-3.5">عنوان IP</th>
                    <th className="p-3.5">عنوان MAC</th>
                    <th className="p-3.5">مدة الجلسة (Uptime)</th>
                    <th className="p-3.5">سحب التحميل (Download)</th>
                    <th className="p-3.5">سحب الرفع (Upload)</th>
                    <th className="p-3.5">السرعة المحددة</th>
                    <th className="p-3.5">طريقة الدخول</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        لا يوجد مستخدمين متصلين حالياً أو لا توجد نتائج مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-mono">
                              <Smartphone className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-white font-mono block">
                                {user.user}
                              </span>
                              {user.comment && (
                                <span className="text-[10px] text-slate-400 block">{user.comment}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-slate-300">{user.address}</td>
                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">{user.macAddress}</td>
                        <td className="p-3.5 font-mono text-amber-300">{user.uptime}</td>

                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {formatBytesToHuman(user.bytesOut)}
                        </td>

                        <td className="p-3.5 font-mono text-cyan-400">
                          {formatBytesToHuman(user.bytesIn)}
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                            {user.rateLimit || 'حسب البروفايل'}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                          {user.loginBy || 'http-chap'}
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleKickUser(user.id, user.user)}
                            disabled={isKicking && kickTargetId === user.id}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition text-xs flex items-center justify-center gap-1 mx-auto"
                            title="فصل الجلسة"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>فصل</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Network Interfaces & Live Traffic Chart */}
      {activeSubTab === 'interfaces' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Real-time Traffic Graph */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>الرسم البياني لحركة البيانات والسرعات اللحظية (Traffic Monitor)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  عرض مباشر لمعدل سحب التحميل (Rx) والرفع (Tx) بالميجابت في الثانية (Mbps).
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory.length > 0 ? trafficHistory : [{ time: '00:00', rxMbps: 0, txMbps: 0 }]}>
                  <defs>
                    <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 10 }} unit=" Mbps" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rxMbps"
                    name="التحميل (Download)"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rxGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="txMbps"
                    name="الرفع (Upload)"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#txGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interface Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interfaces.map((iface) => (
              <div
                key={iface.id}
                className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white font-mono text-sm">{iface.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      iface.running
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {iface.running ? 'نشط (Running)' : 'متوقف'}
                  </span>
                </div>

                {iface.comment && (
                  <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    {iface.comment}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/40">
                    <span className="text-[10px] text-slate-400 block font-sans">سرعة التحميل اللحظية:</span>
                    <span className="font-bold text-emerald-400">
                      {formatBitsToSpeed(iface.rxRateBps)}
                    </span>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/40">
                    <span className="text-[10px] text-slate-400 block font-sans">سرعة الرفع اللحظية:</span>
                    <span className="font-bold text-cyan-400">
                      {formatBitsToSpeed(iface.txRateBps)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800 font-mono">
                  <div className="flex justify-between">
                    <span>إجمالي Rx:</span>
                    <span>{formatBytesToHuman(iface.rxByte)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي Tx:</span>
                    <span>{formatBytesToHuman(iface.txByte)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Connected Physical Hosts & DHCP Leases */}
      {activeSubTab === 'hosts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>الأجهزة المتصلة بشبكة الهوتسبوت (/ip hotspot host)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {hosts.length} جهاز
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800/60 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3">عنوان IP</th>
                    <th className="p-3">عنوان MAC</th>
                    <th className="p-3">الحالة التوثيقية</th>
                    <th className="p-3">مدة الاتصال</th>
                    <th className="p-3">سحب التحميل</th>
                    <th className="p-3">سحب الرفع</th>
                    <th className="p-3">المنفذ / البورت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {hosts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        لا توجد أجهزة متصلة مسجلة في جدول الهوست.
                      </td>
                    </tr>
                  ) : (
                    hosts.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-white">{h.address}</td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">{h.macAddress}</td>
                        <td className="p-3">
                          {h.authorized ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              مسجل دخول (Authorized)
                            </span>
                          ) : h.bypassed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              مستثنى (Bypassed)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              بانتظار تسجيل الدخول
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-300">{h.uptime}</td>
                        <td className="p-3 font-mono text-emerald-400">{formatBytesToHuman(h.bytesOut)}</td>
                        <td className="p-3 font-mono text-cyan-400">{formatBytesToHuman(h.bytesIn)}</td>
                        <td className="p-3 font-mono text-slate-400">{h.bridgePort || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DHCP Leases */}
          {dhcpLeases.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>عناوين DHCP الموزعة وأسماء الأجهزة (DHCP Leases)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {dhcpLeases.length} عنوان
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/60 text-slate-300 font-semibold border-b border-slate-700/80">
                    <tr>
                      <th className="p-3">اسم الجهاز (Host Name)</th>
                      <th className="p-3">عنوان IP</th>
                      <th className="p-3">عنوان MAC</th>
                      <th className="p-3">سيرفر DHCP</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {dhcpLeases.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-white">{l.hostName || 'هاتف / جهاز غير معرف'}</td>
                        <td className="p-3 font-mono text-slate-300">{l.address}</td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">{l.macAddress}</td>
                        <td className="p-3 font-mono text-slate-400">{l.server || 'dhcp1'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: Direct Hotspot Card Generation & MikroTik Sync */}
      {activeSubTab === 'cards' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Card Generator Header / Controls Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  <span>توليد الكروت ومزامنتها مباشرة مع راوتر مايكروتك</span>
                </h3>
                <p className="text-slate-400 mt-1">
                  أنشئ دفعات كروت جديدة ثم اضغط زر "مزامنة بالراوتر" لتُحقن تلقائياً عبر الـ API في قائمة مستخدمي الهوتسبوت، أو صدّرها كملف .rsc أو PDF للطباعة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCardsRsc}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1.5 transition text-xs"
                  title="تحميل كود سكربت للمايكروتك"
                >
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>سكربت (.rsc)</span>
                </button>

                <button
                  onClick={handleExportCardsPdf}
                  disabled={isExportingCardsPdf}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5 transition text-xs"
                  title="تصدير كروت الطباعة إلى PDF"
                >
                  {isExportingCardsPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <FileDown className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>تصدير PDF</span>
                </button>

                <button
                  onClick={handleSyncCardsWithRouter}
                  disabled={isSyncingWithRouter}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition text-xs"
                  title="إرسال وإنشاء الكروت في الراوتر فوراً عبر الـ API"
                >
                  {isSyncingWithRouter ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارِ المزامنة بالراوتر...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>🚀 مزامنة وإنشاء في الراوتر ({previewCards.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sync Outcome Banner */}
            {syncOutcome && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  syncOutcome.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {syncOutcome.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {syncOutcome.success ? 'نجحت عملية المزامنة بالراوتر' : 'تنبيه المزامنة'}
                  </div>
                  <div className="text-xs mt-0.5 whitespace-pre-line">{syncOutcome.message}</div>
                </div>
              </div>
            )}

            {/* Configuration Inputs for the Batch */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">فئة الكارت:</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedCatId(catId);
                    const cat = categories.find((c) => c.id === catId);
                    if (cat) {
                      setCardPrefix(cat.code ? `${cat.code}-` : 'c');
                      setCardProfile(cat.mikrotikProfile || 'default');
                      setCardUptime(cat.uptimeLimit || '1h');
                      setCardQuota(cat.quotaLimit || '500M');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.retailPrice} ريال)
                    </option>
                  ))}
                  <option value="custom">-- فئة مخصصة --</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">عدد الكروت:</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={cardCount}
                  onChange={(e) => setCardCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">بادئة الاسم (Prefix):</label>
                <input
                  type="text"
                  value={cardPrefix}
                  onChange={(e) => setCardPrefix(e.target.value)}
                  placeholder="مثال: c100-"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">بداية التسلسل:</label>
                <input
                  type="number"
                  value={cardSerialStart}
                  onChange={(e) => setCardSerialStart(parseInt(e.target.value) || 1001)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">بروفايل الهوتسبوت:</label>
                <input
                  type="text"
                  value={cardProfile}
                  onChange={(e) => setCardProfile(e.target.value)}
                  placeholder="Profile-100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">نوع كلمة المرور:</label>
                <select
                  value={cardPasswordMode}
                  onChange={(e) => setCardPasswordMode(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pin">رمز PIN عشوائي (4 أرقام)</option>
                  <option value="same">نفس اسم المستخدم</option>
                  <option value="none">بدون كلمة سر (فارغ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards Preview Grid / Print Sheet */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>معاينة كروت الدفعة الجاهزة للإرسال والطباعة ({previewCards.length} كارت)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                قيمة الدفعة الإجمالية:{' '}
                <strong className="text-emerald-400">
                  {((previewCards?.reduce((acc, c) => acc + (c?.price || 0), 0) ?? 0)).toLocaleString()} {settings.currency || 'ريال'}
                </strong>
              </span>
            </div>

            {/* Printable Container */}
            <div id="mikrotik-cards-sheet-container" className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {previewCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                      <span className="font-bold text-[10px] text-indigo-300 truncate">{settings.networkName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {card.price} {settings.currency || 'ريال'}
                      </span>
                    </div>

                    <div className="space-y-1 my-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">اسم المستخدم:</span>
                        <span className="font-mono font-bold text-white select-all">{card.username}</span>
                      </div>
                      {card.pin && (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">الرمز السري:</span>
                          <span className="font-mono font-bold text-amber-300 select-all">{card.pin}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 mt-1 text-[9px] text-slate-400 font-mono">
                      <span>{card.uptime || 'غير محدد'}</span>
                      <span>{card.quota || 'غير محدود'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: Diagnostics & Comprehensive Compatibility Wizard */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Complete One-Click Script Downloader */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <span>سكربت التهيئة الشامل للمايكروتك (One-Click Setup .rsc)</span>
                </h3>
                <p className="text-slate-300 mt-1 text-xs">
                  يقوم هذا السكربت بفتح وتفعيل منافذ الـ API والـ REST API، وإنشاء حساب المدير المخصص (posadmin)، وقواعد جدار الحماية (Firewall)، وبروفايلات الهوتسبوت دفعة واحدة.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(completeSetupScript, 'complete_rsc')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition text-xs font-bold border border-slate-700"
                >
                  {copiedScript === 'complete_rsc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript === 'complete_rsc' ? 'تم نسخ السكربت!' : 'نسخ الكود'}</span>
                </button>

                <button
                  onClick={handleDownloadCompleteSetupRsc}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل ملف .rsc للراوتر</span>
                </button>
              </div>
            </div>

            <pre className="p-3.5 bg-slate-950 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
              {completeSetupScript}
            </pre>
          </div>

          {/* RouterOS v6 vs v7 Protocol Matrix */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>جدول التوافق المدعوم مع أنظمة MikroTik RouterOS</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">RouterOS Native API</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">منفذ 8728</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  بروتوكول ثنائي فائق السرعة متوافق مع كافة أجهزة المايكروتك (RouterOS v6.x & v7.x).
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">RouterOS API-SSL</span>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-bold">منفذ 8729</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  اتصال آمن ومشفر عبر شهادة SSL/TLS لحماية بيانات تسجيل الدخول والكروت.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">RouterOS v7 REST API</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold">منفذ 80 / 443</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  واجهة برمجة تطبيقات RESTful الحديثة المدمجة في نظام RouterOS الإصدار 7 فما فوق.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: Settings & Port Configuration */}
      {activeSubTab === 'settings' && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200 text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>إعدادات الاتصال والبروتوكول مع راوتر مايكروتك</span>
            </h3>
            <p className="text-slate-400 mt-0.5">
              تحديد عنوان IP الراوتر، بروتوكول التخاطب (REST API أو Binary API)، وبيانات تسجيل الدخول.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                عنوان IP أو نطاق الراوتر (Host / IP / DDNS):
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => saveConfig({ ...config, host: e.target.value })}
                placeholder="192.168.88.1 أو demo"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                ملاحظة: يمكنك كتابة <strong className="text-indigo-400">demo</strong> لتشغيل وضع المحاكاة للاختبار دون راوتر حقيقي.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                بروتوكول الاتصال (Communication Protocol):
              </label>
              <select
                value={config.protocol}
                onChange={(e) => saveConfig({ ...config, protocol: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">كشف تلقائي ذكي (Auto-Detect v6 & v7)</option>
                <option value="api_binary">RouterOS Native API (منفذ 8728 - لجميع الإصدارات)</option>
                <option value="api_ssl">RouterOS API-SSL مشفر (منفذ 8729)</option>
                <option value="rest_http">RouterOS v7 REST API (HTTP - منفذ 80)</option>
                <option value="rest_https">RouterOS v7 REST API (HTTPS - منفذ 443)</option>
                <option value="demo">وضع المحاكاة الافتراضية (Demo Simulator)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                منفذ الاتصال (Port):
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => saveConfig({ ...config, port: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                اسم مستخدم المشرف (Admin Username):
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => saveConfig({ ...config, username: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                كلمة المرور (Password):
              </label>
              <input
                type="password"
                value={config.password || ''}
                onChange={(e) => saveConfig({ ...config, password: e.target.value })}
                placeholder="اتركها فارغة إذا لم تكن مضبوطة"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={config.useSsl}
                  onChange={(e) => saveConfig({ ...config, useSsl: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>استخدام اتصال مشفر (SSL/TLS)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={handleTestConnection}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span>اختبار وحفظ الإعدادات</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
