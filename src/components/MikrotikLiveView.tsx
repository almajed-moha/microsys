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
  FileSpreadsheet,
  Power,
  RotateCcw,
  Trash2,
  Edit,
  SlidersHorizontal,
  Gauge,
  Network,
  Share2,
  Layers,
  Bot,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckSquare,
  Square,
  Bookmark,
  Wrench,
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
  CardTemplate,
  POSPoint,
  MikroTikConfig,
  RouterSystemInfo,
  HotspotActiveUser,
  HotspotHost,
  RouterInterface,
  DhcpLease,
  CardCategory,
  HotspotUserProfile,
  HotspotConfiguredUser
} from '../types';
import {
  testMikroTikConnection,
  fetchRouterSystemInfo,
  fetchActiveHotspotUsers,
  fetchConnectedHosts,
  fetchRouterInterfaces,
  fetchConfiguredHotspotUsers,
  fetchHotspotUserProfiles,
  deleteConfiguredHotspotUser,
  saveHotspotUserProfile,
  executeMikrotikSystemCommand,
  kickHotspotUser,
  createMikroTikHotspotUsers,
  generateHotspotCardsRscScript,
  formatBytesToHuman,
  formatBitsToSpeed,
  ConnectionTestResult,
} from '../utils/mikrotikApi';
import { exportElementToPdf } from '../utils/pdfExport';
import { UserManagerView } from './UserManagerView';
import { MikrotikMaintenanceView } from './MikrotikMaintenanceView';
import { RemoteMikrotikWizardModal } from './RemoteMikrotikWizardModal';

function isPrivateIp(host?: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  return false;
}

interface MikrotikLiveViewProps {
  settings: NetworkSettings;
  categories?: CardCategory[];
  templates?: CardTemplate[];
  posPoints?: POSPoint[];
  onSaveTemplate?: (template: CardTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onUpdateSettings: (newSettings: NetworkSettings) => void;
}

export const MikrotikLiveView: React.FC<MikrotikLiveViewProps> = ({
  settings,
  categories = [],
  templates = [],
  posPoints = [],
  onSaveTemplate,
  onDeleteTemplate,
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
  const [configuredUsers, setConfiguredUsers] = useState<HotspotConfiguredUser[]>([]);
  const [userProfiles, setUserProfiles] = useState<HotspotUserProfile[]>([]);
  const [hosts, setHosts] = useState<HotspotHost[]>([]);
  const [dhcpLeases, setDhcpLeases] = useState<DhcpLease[]>([]);
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<{ time: string; rxMbps: number; txMbps: number }[]>([]);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'active_users' | 'all_users' | 'profiles' | 'user_manager' | 'maintenance' | 'interfaces' | 'remote_control' | 'hosts' | 'diagnostics' | 'ai_assistant' | 'settings'
  >('active_users');

  // Search & Filter States
  const [activeUserSearch, setActiveUserSearch] = useState('');
  const [allUserSearch, setAllUserSearch] = useState('');
  const [userProfileFilter, setUserProfileFilter] = useState('all');
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Remote Power / System Command Modal & Loading
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);

  // Ping Diagnostic tool
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState<any[] | null>(null);

  // Remote MikroTik Connection Wizard Modal
  const [showRemoteWizard, setShowRemoteWizard] = useState(false);

  // Profile Edit / Add Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<HotspotUserProfile>>({
    name: '',
    rateLimit: '5M/2M',
    sharedUsers: 1,
    statusAutorefresh: '1m',
    idleTimeout: '5m',
    sessionTimeout: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  // AI Assistant in MikroTik Tab
  const [aiQuery, setAiQuery] = useState('');
  const [isAiConsulting, setIsAiConsulting] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'مرحباً بك! أنا مستشارك الذكي لإدارة شبكات المايكروتك و WinBox. يمكنك سؤالي عن ضبط سرعات البروفايلات، حل مشاكل الهوتسبوت، مشاركة الكروت، حماية الراوتر، أو توليد سكربتات RouterOS مخصصة.',
    },
  ]);

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

  // Perform a full live data fetch (Active users, Configured users, Profiles, Interfaces, Hosts, System Info)
  const fetchAllLiveData = useCallback(async (currentCfg: MikroTikConfig) => {
    try {
      const [sys, actUsers, confUsers, profs, hostsData, ifaces] = await Promise.all([
        fetchRouterSystemInfo(currentCfg),
        fetchActiveHotspotUsers(currentCfg),
        fetchConfiguredHotspotUsers(currentCfg),
        fetchHotspotUserProfiles(currentCfg),
        fetchConnectedHosts(currentCfg),
        fetchRouterInterfaces(currentCfg),
      ]);

      if (sys) {
        setSystemInfo(sys);
        setIsConnected(true);
      }
      if (actUsers) setActiveUsers(actUsers);
      if (confUsers) setConfiguredUsers(confUsers);
      if (profs) setUserProfiles(profs);
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

  // Handle User Disconnect / Kick from Active Sessions
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
      setCommandFeedback({ success: true, message: `تم فصل جلسة المستخدم (${userName}) من الراوتر بنجاح.` });
      setTimeout(() => setCommandFeedback(null), 4000);
    } else {
      setCommandFeedback({ success: false, message: 'تعذر فصل المستخدم من الراوتر. تأكد من صحة الصلاحيات.' });
    }
  };

  // Handle Delete Configured User from Router
  const handleDeleteConfiguredUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الكارت/المستخدم (${userName}) نهائياً من قاعدة بيانات الراوتر؟`)) {
      return;
    }
    setIsDeletingUser(true);
    setDeleteTargetId(userId);

    const ok = await deleteConfiguredHotspotUser(config, userId);
    setIsDeletingUser(false);
    setDeleteTargetId(null);

    if (ok) {
      setConfiguredUsers((prev) => prev.filter((u) => u.id !== userId && u.name !== userId));
      setCommandFeedback({ success: true, message: `تم حذف الكارت (${userName}) نهائياً من المايكروتك.` });
      setTimeout(() => setCommandFeedback(null), 4000);
    } else {
      setCommandFeedback({ success: false, message: 'تعذر حذف الكارت من الراوتر.' });
    }
  };

  // Handle Remote System Commands (Reboot / Shutdown)
  const handleExecuteSystemCommand = async (command: 'reboot' | 'shutdown') => {
    setShowRebootConfirm(false);
    setShowShutdownConfirm(false);
    setIsExecutingCommand(true);
    setCommandFeedback(null);

    const res = await executeMikrotikSystemCommand(config, command);
    setIsExecutingCommand(false);
    setCommandFeedback(res);

    if (res.success && command === 'reboot') {
      setIsConnected(false);
      // Wait for router reboot and test again after 15 seconds
      setTimeout(() => {
        handleTestConnection();
      }, 15000);
    }
  };

  // Handle Remote Ping test
  const handleRunPing = async () => {
    if (!pingTarget.trim()) return;
    setIsPinging(true);
    setPingResults(null);

    const res = await executeMikrotikSystemCommand(config, 'ping', { address: pingTarget.trim(), count: 4 });
    setIsPinging(false);
    if (res.success && res.output) {
      setPingResults(Array.isArray(res.output) ? res.output : [res.output]);
    } else {
      setCommandFeedback({ success: false, message: res.message || 'فشل اختبار Ping' });
    }
  };

  // Handle Save / Add Hotspot User Profile
  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile.name?.trim()) {
      alert('يرجى كتابة اسم البروفايل');
      return;
    }

    setIsSavingProfile(true);
    const res = await saveHotspotUserProfile(config, {
      id: editingProfile.id,
      name: editingProfile.name.trim(),
      rateLimit: editingProfile.rateLimit || '5M/2M',
      sharedUsers: editingProfile.sharedUsers || 1,
      statusAutorefresh: editingProfile.statusAutorefresh || '1m',
      idleTimeout: editingProfile.idleTimeout || '5m',
      sessionTimeout: editingProfile.sessionTimeout,
    });
    setIsSavingProfile(false);

    if (res.success) {
      setShowProfileModal(false);
      setCommandFeedback({ success: true, message: res.message || `تم حفظ البروفايل ${editingProfile.name} بنجاح.` });
      setTimeout(() => setCommandFeedback(null), 4000);
      fetchAllLiveData(config);
    } else {
      alert(`خطأ: ${res.message}`);
    }
  };

  // Handle AI Consultation
  const handleSendAiConsultation = async () => {
    if (!aiQuery.trim() || isAiConsulting) return;

    const userText = aiQuery.trim();
    setAiQuery('');
    setAiChatHistory((prev) => [...prev, { role: 'user', text: userText }]);
    setIsAiConsulting(true);

    try {
      const res = await fetch('/api/ai/mikrotik-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          networkContext: {
            networkName: settings.networkName,
            routerModel: systemInfo?.model || config.routerModel,
            version: systemInfo?.version || config.routerOsVersion,
            activeUsersCount: activeUsers.length,
            configuredUsersCount: configuredUsers.length,
            profiles: userProfiles.map((p) => ({ name: p.name, rateLimit: p.rateLimit })),
          },
        }),
      });
      const data = await res.json();
      setIsAiConsulting(false);

      if (data.success && (data.reply || data.response)) {
        setAiChatHistory((prev) => [...prev, { role: 'assistant', text: data.reply || data.response }]);
      } else {
        setAiChatHistory((prev) => [
          ...prev,
          { role: 'assistant', text: 'عذراً، حدث خطأ أثناء معالجة الطلب عبر الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.' },
        ]);
      }
    } catch (err: any) {
      setIsAiConsulting(false);
      setAiChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: `تعذر الاتصال بخدمة الذكاء الاصطناعي: ${err.message}` },
      ]);
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
        fetchAllLiveData(config);
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
  const filteredActiveUsers = activeUsers.filter((u) => {
    const q = activeUserSearch.toLowerCase();
    return (
      u.user.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q) ||
      u.macAddress.toLowerCase().includes(q) ||
      (u.comment && u.comment.toLowerCase().includes(q))
    );
  });

  // Filtered configured users
  const filteredConfiguredUsers = configuredUsers.filter((u) => {
    const q = allUserSearch.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      (u.comment && u.comment.toLowerCase().includes(q)) ||
      (u.profile && u.profile.toLowerCase().includes(q));
    const matchesProfile = userProfileFilter === 'all' || u.profile === userProfileFilter;
    return matchesSearch && matchesProfile;
  });

  // Calculate live aggregate bandwidth
  const totalDownloadBytes = (activeUsers || []).reduce((acc, u) => acc + (u?.bytesOut || 0), 0);
  const totalUploadBytes = (activeUsers || []).reduce((acc, u) => acc + (u?.bytesIn || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Connection Controls */}
      <div className="bg-slate-900/95 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute top-0 left-1/4 w-96 h-24 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-500/40 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex flex-wrap items-center gap-2.5">
                  <span>مركز المايكروتك المباشر والتحكم عن بُعد (WinBox Web Control)</span>
                  {isConnected ? (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      متصل بالراوتر: {systemInfo?.identity || config.routerIdentity || 'MikroTik'}
                    </span>
                  ) : (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      غير متصل (يتطلب فحص الاتصال)
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  إدارة شاملة لراوتر مايكروتك: جلب المشتركين، إدارة البروفايلات، مراقبة الجلسات الحية، والتحكم بالتشغيل والإيقاف عن بُعد بنسبة 100%.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Bar & Remote Power Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Quick Remote Reboot Button */}
            <button
              onClick={() => setShowRebootConfirm(true)}
              disabled={isExecutingCommand || !isConnected}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition disabled:opacity-40"
              title="إعادة تشغيل راوتر مايكروتك عن بُعد"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة التشغيل</span>
            </button>

            {/* Quick Remote Shutdown Button */}
            <button
              onClick={() => setShowShutdownConfirm(true)}
              disabled={isExecutingCommand || !isConnected}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition disabled:opacity-40"
              title="إيقاف تشغيل الراوتر عن بُعد"
            >
              <Power className="w-3.5 h-3.5" />
              <span>إيقاف التشغيل</span>
            </button>

            {/* Auto-Refresh dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
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

            {/* Remote Connection Wizard Button */}
            <button
              onClick={() => setShowRemoteWizard(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition shrink-0"
              title="معالج ودليل إعدادات ربط المايكروتك عن بعد (Cloud DDNS & VPN)"
            >
              <Globe className="w-4 h-4 text-sky-200" />
              <span>معالج الربط عن بعد 🌐</span>
            </button>

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
                  <span>فحص الاتصال</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {commandFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 transition animate-in fade-in ${
              commandFeedback.success
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {commandFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{commandFeedback.message}</span>
          </div>
        )}

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
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition">
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
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition">
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

        {/* Active Hotspot Users & Total Registered */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">المستخدمين (Active / Total)</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-indigo-400">
              {activeUsers.length}
            </span>
            <span className="text-[11px] text-slate-400">متصل الآن / {configuredUsers.length} كارت مسجل</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            عدد بروفايلات السرعة: {userProfiles.length} بروفايل
          </p>
        </div>

        {/* Router Uptime & Model */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700 transition">
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

      {/* Sub-Navigation Tabs (WinBox Suite Features) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('active_users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'active_users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمين النشطين ({activeUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('all_users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'all_users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>جميع الكروت بالراوتر ({configuredUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profiles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'profiles'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>بروفايلات السرعة ({userProfiles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('user_manager')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            activeSubTab === 'user_manager'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
              : 'bg-slate-900 text-purple-400 border-purple-500/20 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4 text-purple-400" />
          <span>اليوزر مانجر (User Manager)</span>
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            activeSubTab === 'maintenance'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
              : settings.maintenanceSettings?.networkStatus === 'maintenance' || settings.maintenanceSettings?.enabled
              ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-slate-800'
              : settings.maintenanceSettings?.networkStatus === 'disabled'
              ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-slate-800'
              : 'bg-slate-900 text-amber-400 border-amber-500/20 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>وضع الصيانة وحالة الشبكة</span>
          {settings.maintenanceSettings?.networkStatus === 'maintenance' && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-black text-[9px] font-black rounded-full animate-pulse">نشط</span>
          )}
          {settings.maintenanceSettings?.networkStatus === 'disabled' && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">معطل</span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('remote_control')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'remote_control'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Power className="w-4 h-4 text-amber-400" />
          <span>التحكم عن بُعد والأوامر</span>
        </button>

        <button
          onClick={() => setActiveSubTab('interfaces')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'interfaces'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>واجهات الشبكة والسرعات ({interfaces.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hosts')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'hosts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>الأجهزة و DHCP ({hosts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ai_assistant')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'ai_assistant'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-purple-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>المساعد الذكي للمايكروتك</span>
        </button>

        <button
          onClick={() => setActiveSubTab('diagnostics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>سكربتات WinBox</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition mr-auto ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات الاتصال</span>
        </button>
      </div>

      {/* SUB-VIEW 1: Active Users (Hotspot Active) */}
      {activeSubTab === 'active_users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث بالمستخدم، IP، أو الماك..."
                value={activeUserSearch}
                onChange={(e) => setActiveUserSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>المتصلين الآن: <strong className="text-emerald-400 font-mono font-bold">{filteredActiveUsers.length}</strong></span>
              <span>• آخر تحديث: <strong className="font-mono text-slate-200">{lastUpdated || 'الآن'}</strong></span>
            </div>
          </div>

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
                  {filteredActiveUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        لا يوجد مستخدمين متصلين حالياً أو لا توجد نتائج مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredActiveUsers.map((user) => (
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
                            title="فصل الجلسة فوراً"
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

      {/* SUB-VIEW 2: All Configured Users (/ip/hotspot/user) */}
      {activeSubTab === 'all_users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في اسم الكارت أو الملاحظات..."
                  value={allUserSearch}
                  onChange={(e) => setAllUserSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Profile Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>تصفية بالبروفايل:</span>
                <select
                  value={userProfileFilter}
                  onChange={(e) => setUserProfileFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                >
                  <option value="all">كافة البروفايلات</option>
                  {userProfiles.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                إجمالي الكروت المسجلة: <strong className="text-indigo-400 font-mono font-bold">{filteredConfiguredUsers.length}</strong>
              </span>
              <button
                onClick={() => setActiveSubTab('cards')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة كروت جديدة</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3.5">اسم الكارت / المستخدم</th>
                    <th className="p-3.5">البروفايل المخصص</th>
                    <th className="p-3.5">الوقت المحدد (Limit Uptime)</th>
                    <th className="p-3.5">حجم البيانات (Quota)</th>
                    <th className="p-3.5">إجمالي الاستهلاك</th>
                    <th className="p-3.5">الوقت المستهلك</th>
                    <th className="p-3.5">الملاحظات</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredConfiguredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        لا توجد كروت مسجلة في الراوتر أو لا توجد نتائج مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredConfiguredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono">
                              <Key className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-white font-mono">{user.name}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                            {user.profile}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-slate-300">{user.limitUptime || 'غير محدد'}</td>

                        <td className="p-3.5 font-mono text-emerald-400">
                          {user.limitBytesTotal ? formatBytesToHuman(user.limitBytesTotal) : 'غير محدود'}
                        </td>

                        <td className="p-3.5 font-mono text-cyan-400">
                          {formatBytesToHuman((user.bytesIn || 0) + (user.bytesOut || 0))}
                        </td>

                        <td className="p-3.5 font-mono text-amber-300">{user.uptime || '0s'}</td>

                        <td className="p-3.5 text-slate-400 text-[11px]">{user.comment || '-'}</td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleDeleteConfiguredUser(user.id, user.name)}
                            disabled={isDeletingUser && deleteTargetId === user.id}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition text-xs flex items-center justify-center gap-1 mx-auto"
                            title="حذف الكارت نهائياً من الراوتر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
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

      {/* SUB-VIEW 3: User Profiles (/ip/hotspot/user/profile) */}
      {activeSubTab === 'profiles' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>بروفايلات سرعات المشتركين (Hotspot User Profiles)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد معدل السرعة (Rate Limit e.g. 5M/2M)، عدد الأجهزة المشتركة (Shared Users)، وأوقات انتهاء الجلسات.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProfile({
                  name: '',
                  rateLimit: '5M/2M',
                  sharedUsers: 1,
                  statusAutorefresh: '1m',
                  idleTimeout: '5m',
                  sessionTimeout: '',
                });
                setShowProfileModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بروفايل سرعة جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProfiles.map((prof) => (
              <div
                key={prof.id}
                className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{prof.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {prof.id}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingProfile(prof);
                      setShowProfileModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="تعديل البروفايل"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تحديد السرعة (Rate Limit):</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {prof.rateLimit || 'غير محدد (مفتوح)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">مشاركة الأجهزة (Shared Users):</span>
                    <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {prof.sharedUsers || 1} جهاز
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">مهلة الخمول (Idle Timeout):</span>
                    <span className="font-mono text-slate-300">{prof.idleTimeout || '5m'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تحديث صفحة الحالة:</span>
                    <span className="font-mono text-slate-300">{prof.statusAutorefresh || '1m'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW: User Manager (RADIUS & Vouchers Suite) */}
      {activeSubTab === 'user_manager' && (
        <UserManagerView
          settings={settings}
          config={config}
          categories={categories}
          templates={templates}
          posPoints={posPoints}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onRefreshParent={() => fetchAllLiveData(config)}
        />
      )}

      {/* SUB-VIEW 4: Remote System Control & Remote Diagnostics */}
      {activeSubTab === 'remote_control' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Remote Power & Reboot Control Box */}
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Power className="w-5 h-5 text-amber-400" />
                  <span>التحكم في تشغيل وطاقة الراوتر عن بُعد (Remote Power & Reboot)</span>
                </h3>
                <p className="text-slate-400 mt-1">
                  تنفيذ أوامر النظام الحساسة مباشرة عبر اتصال الـ API دون الحاجة للدخول إلى WinBox أو التواجد في موقع الراوتر.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="font-bold text-amber-300 text-sm block">إعادة التشغيل (Reboot)</span>
                    <p className="text-slate-400 text-[11px] mt-1">
                      إعادة تشغيل نظام RouterOS وتفريغ الذاكرة المؤقتة. يعود الراوتر للعمل خلال 30-60 ثانية.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRebootConfirm(true)}
                    disabled={isExecutingCommand || !isConnected}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إرسال أمر Reboot</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="font-bold text-rose-300 text-sm block">إيقاف التشغيل (Shutdown)</span>
                    <p className="text-slate-400 text-[11px] mt-1">
                      إيقاف تشغيل الراوتر بشكل آمن تمهيداً لفصل الكهرباء أو الصيانة المادية للراوتر.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowShutdownConfirm(true)}
                    disabled={isExecutingCommand || !isConnected}
                    className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 disabled:opacity-40"
                  >
                    <Power className="w-4 h-4" />
                    <span>إرسال أمر Shutdown</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Remote Ping Diagnostic Tool */}
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>فحص الاتصال وسرعة الاستجابة من الراوتر (Router Ping Tool)</span>
                </h3>
                <p className="text-slate-400 mt-1">
                  إرسال حزم Ping من داخل راوتر مايكروتك لفحص جودة اتصال خط الإنترنت أو فحص سيرفر محدد.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  placeholder="عنوان IP أو النطاق (مثال: 8.8.8.8 أو 1.1.1.1)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleRunPing}
                  disabled={isPinging || !isConnected}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isPinging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>فحص Ping</span>
                </button>
              </div>

              {/* Ping Results Box */}
              {pingResults && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1.5">
                  <span className="text-slate-400 block border-b border-slate-800 pb-1">
                    نتائج فحص Ping لـ ({pingTarget}):
                  </span>
                  {pingResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-emerald-400">
                      <span>حزمة {i + 1}: الرد من {r.host || pingTarget}</span>
                      <span>الحجم: {r.size || 56}B • الوقت: {r.time || '20ms'} • TTL: {r.ttl || 56}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: Network Interfaces & Live Traffic Chart */}
      {activeSubTab === 'interfaces' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>الرسم البياني الحي لسرعات الإنترنت (Live Traffic & Throughput)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  عرض لحظي لمعدل سحب التحميل (Rx Mbps) والرفع (Tx Mbps) الإجمالي على واجهات المايكروتك.
                </p>
              </div>
            </div>

            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rxColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="txColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit=" Mb" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rxMbps"
                    name="تحميل (Download)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rxColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="txMbps"
                    name="رفع (Upload)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#txColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interfaces Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                <span>واجهات الشبكة والمنافذ (Interfaces List)</span>
              </h4>
              <span className="text-slate-400">{interfaces.length} منفذ نشط</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3.5">اسم المنفذ / الواجهة</th>
                    <th className="p-3.5">النوع</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">السرعة اللحظية للتحميل</th>
                    <th className="p-3.5">السرعة اللحظية للرفع</th>
                    <th className="p-3.5">إجمالي البايتات المستلمة (Rx)</th>
                    <th className="p-3.5">إجمالي البايتات المرسلة (Tx)</th>
                    <th className="p-3.5">الوصف والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {interfaces.map((iface) => (
                    <tr key={iface.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <span className="font-bold text-white font-mono block">{iface.name}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300 border border-slate-700">
                          {iface.type}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {iface.running ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            متصل (Running)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            مفصول (Link Down)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        {formatBitsToSpeed(iface.rxRateBps)}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-cyan-400">
                        {formatBitsToSpeed(iface.txRateBps)}
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        {formatBytesToHuman(iface.rxByte)}
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        {formatBytesToHuman(iface.txByte)}
                      </td>

                      <td className="p-3.5 text-slate-400 text-[11px]">{iface.comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: Connected Hosts & DHCP Leases */}
      {activeSubTab === 'hosts' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>الأجهزة المتصلة بجدول الهوتسبوت الفيزيائي (Hotspot Hosts - {hosts.length})</span>
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3.5">عنوان IP</th>
                    <th className="p-3.5">عنوان MAC</th>
                    <th className="p-3.5">حالة التوثيق (Authorized)</th>
                    <th className="p-3.5">مدة الاتصال</th>
                    <th className="p-3.5">سحب التحميل</th>
                    <th className="p-3.5">سحب الرفع</th>
                    <th className="p-3.5">المنفذ / Bridge Port</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {hosts.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono text-white">{h.address}</td>
                      <td className="p-3.5 font-mono text-slate-400">{h.macAddress}</td>
                      <td className="p-3.5">
                        {h.authorized ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            مسجل الدخول (Authorized)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            في صفحة الدخول (Unauth)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{h.uptime}</td>
                      <td className="p-3.5 font-mono text-emerald-400">{formatBytesToHuman(h.bytesOut)}</td>
                      <td className="p-3.5 font-mono text-cyan-400">{formatBytesToHuman(h.bytesIn)}</td>
                      <td className="p-3.5 font-mono text-slate-400">{h.bridgePort || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: AI MikroTik Assistant */}
      {activeSubTab === 'ai_assistant' && (
        <div className="bg-slate-900/95 p-5 rounded-2xl border border-purple-500/30 shadow-xl space-y-4 animate-in fade-in duration-200 text-xs">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">المساعد الفني الذكي لشبكات المايكروتك و WinBox</h3>
                <p className="text-slate-400 text-[11px]">مستشارك المتخصص لحل مشاكل الهوتسبوت، توليد سكربتات RouterOS، وضبط الجودة والسرعات.</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            {aiChatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 mr-8'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 ml-8'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px]">
                  {msg.role === 'user' ? (
                    <span className="text-indigo-400">أنت:</span>
                  ) : (
                    <span className="text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      مساعد المايكروتك الذكي:
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-line leading-relaxed font-sans text-xs">{msg.text}</div>
              </div>
            ))}
            {isAiConsulting && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 flex items-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>جاري تحليل بيانات الشبكة وتوليد الاستجابة...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiConsultation()}
              placeholder="اكتب استفسارك (مثال: كيف أمنع مشاركة كروت الهوتسبوت بالبلوتوث؟ أو اعطني سكربت حماية DNS)..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendAiConsultation}
              disabled={isAiConsulting || !aiQuery.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>إرسال</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 9: Diagnostics & WinBox Scripts */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
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
        </div>
      )}

      {/* SUB-VIEW 9.5: Maintenance Mode & Network Programmatic Control */}
      {activeSubTab === 'maintenance' && (
        <MikrotikMaintenanceView
          settings={settings}
          config={config}
          onUpdateSettings={onUpdateSettings}
          onRefreshParent={() => fetchAllLiveData(config)}
        />
      )}

      {/* SUB-VIEW 10: Settings & Connection Configuration */}
      {activeSubTab === 'settings' && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200 text-xs">
          {/* Remote Connection Guide Callout */}
          <div className="bg-gradient-to-r from-indigo-950/70 via-slate-950 to-sky-950/50 p-4 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white text-xs sm:text-sm">
                  هل ترغب بربط راوترك الحقيقي عن بعد عبر الإنترنت؟
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Cloud DDNS مجاني
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed max-w-2xl">
                يتيح لك معالج الربط عن بعد توليد سكريبتات WinBox الجاهزة لتفعيل سحابة مايكروتك الرسمية المجانية (MikroTik Cloud DDNS)، أو استخدام IP عام مع Port Forwarding، أو أنفاق VPN لمودمات 4G.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRemoteWizard(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shrink-0 transition shadow-lg shadow-indigo-600/30 text-xs"
            >
              <Globe className="w-4 h-4" />
              <span>فتح معالج وسكربتات الربط عن بعد</span>
            </button>
          </div>

          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>إعدادات الاتصال والبروتوكول مع راوتر مايكروتك</span>
            </h3>
            <p className="text-slate-400 mt-0.5">
              تحديد عنوان IP أو نطاق DDNS للراوتر، بروتوكول التخاطب (REST API أو Binary API)، وبيانات تسجيل الدخول.
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
              {isPrivateIp(config.host) ? (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] leading-relaxed flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>عنوان شبكة محلية (LAN): </strong>
                    لن يتمكن السيرفر السحابي من الوصول إلى ({config.host}) عبر الإنترنت مباشرة.
                    <button
                      type="button"
                      onClick={() => setShowRemoteWizard(true)}
                      className="text-sky-400 hover:text-sky-300 underline font-bold mr-1"
                    >
                      اضغط هنا لتفعيل Cloud DDNS المجاني
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ملاحظة: يمكنك كتابة <strong className="text-indigo-400">demo</strong> لتشغيل وضع المحاكاة للاختبار دون راوتر حقيقي.
                </span>
              )}
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
                type="text" inputMode="decimal"
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

      {/* Profile Edit / Add Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>{editingProfile.id ? 'تعديل بروفايل السرعة' : 'إضافة بروفايل سرعة جديد'}</span>
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم البروفايل (Profile Name):</label>
                <input
                  type="text"
                  required
                  value={editingProfile.name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="مثال: Profile-500 أو VIP-10M"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  تحديد السرعة (Rate Limit - Rx/Tx):
                </label>
                <input
                  type="text"
                  value={editingProfile.rateLimit || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, rateLimit: e.target.value })}
                  placeholder="مثال: 5M/2M أو 8M/4M"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">تنسيق السرعة: (التحميل/الرفع) مثل 4M/2M</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">عدد الأجهزة المشتركة (Shared Users):</label>
                <input
                  type="text" inputMode="decimal"
                  
                  max="10"
                  value={editingProfile.sharedUsers || 1}
                  onChange={(e) => setEditingProfile({ ...editingProfile, sharedUsers: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مهلة الخمول (Idle Timeout):</label>
                  <input
                    type="text"
                    value={editingProfile.idleTimeout || '5m'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, idleTimeout: e.target.value })}
                    placeholder="5m"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تحديث الحالة:</label>
                  <input
                    type="text"
                    value={editingProfile.statusAutorefresh || '1m'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, statusAutorefresh: e.target.value })}
                    placeholder="1m"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ وإرسال للراوتر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reboot Confirm Modal */}
      {showRebootConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 text-xs shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تأكيد إعادة تشغيل المايكروتك</h3>
              <p className="text-slate-300 mt-1">
                هل أنت متأكد من إرسال أمر إعادة التشغيل (Reboot) لراوتر مايكروتك ({config.host})؟
                سيتم فصل جلسات المشتركين مؤقتاً حتى يكتمل إقلاع الراوتر.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRebootConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                تراجع
              </button>
              <button
                onClick={() => handleExecuteSystemCommand('reboot')}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30"
              >
                تأكيد Reboot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shutdown Confirm Modal */}
      {showShutdownConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 text-xs shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تأكيد إيقاف تشغيل الراوتر</h3>
              <p className="text-slate-300 mt-1">
                تحذير: سيتم إيقاف تشغيل الراوتر نهائياً (Shutdown). ولن تتمكن من الوصول إليه مجدداً إلا بالتشغيل اليدوي لمصدر الطاقة في الموقع.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowShutdownConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
              >
                تراجع
              </button>
              <button
                onClick={() => handleExecuteSystemCommand('shutdown')}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30"
              >
                تأكيد Shutdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote MikroTik Wizard Modal */}
      <RemoteMikrotikWizardModal
        isOpen={showRemoteWizard}
        onClose={() => setShowRemoteWizard(false)}
        currentConfig={config}
        networkName={settings.networkName}
        onApplyConfig={(updated) => {
          saveConfig({ ...config, ...updated });
        }}
      />
    </div>
  );
};
