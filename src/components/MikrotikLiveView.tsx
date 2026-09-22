import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNetworkUsageTracker } from "../hooks/useNetworkUsageTracker";
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
  Terminal, Database,
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
  Folder,
  Archive,
  LayoutGrid,
  Menu,
  X,
  ChevronLeft,
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
  deleteConfiguredHotspotUsersBulk,
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
import { CircularMetricCard } from './CircularMetricGauge';
import { UserManagerView } from './UserManagerView';
import { MikrotikMaintenanceView } from './MikrotikMaintenanceView';
import { RemoteMikrotikWizardModal } from './RemoteMikrotikWizardModal';
import { MikrotikFilesManagerView } from './MikrotikFilesManagerView';

function isPrivateIp(host?: string): boolean {
  if (!host) return false;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(clean)) return true;
  return false;
}
import { DailyNetworkLogsView } from "./DailyNetworkLogsView";

interface MikrotikLiveViewProps {
  settings: NetworkSettings;
  categories?: CardCategory[];
  templates?: CardTemplate[];
  posPoints?: POSPoint[];
  onSaveTemplate?: (template: CardTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onUpdateSettings: (newSettings: NetworkSettings) => void;
  onOpenDataSync?: () => void;
  initialSubTab?: string;
  initialUmTab?: string;
}

import {
  evaluateCardExpirationStatus,
  parseMikrotikUptimeToSeconds,
  formatBytesHuman,
} from '../utils/cardExpiration';

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (text.trim().startsWith('<')) {
      return { error: 'استلم المتصفح كود HTML بدلاً من JSON من خادم النظام. يرجى تحديث الصفحة أو فتح التطبيق مباشرة.' };
    }
    return { error: 'استجابة غير صالحة من خادم النظام.' };
  }
}

export const MikrotikLiveView: React.FC<MikrotikLiveViewProps> = ({
  settings,
  categories = [],
  templates = [],
  posPoints = [],
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateSettings,
  onOpenDataSync,
  initialSubTab,
  initialUmTab,
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

  // Sub-tabs with smart persistence
  const validSubTabs = useMemo(() => [
    'active_users', 'all_users', 'profiles', 'user_manager', 'maintenance',
    'interfaces', 'remote_control', 'hosts', 'diagnostics', 'ai_assistant',
    'settings', 'daily_logs', 'files'
  ], []);

  // Auto-track network usage deltas and sync to Firebase
  useNetworkUsageTracker(activeUsers, isConnected, systemInfo?.model || config.routerModel);

  const [activeSubTab, setActiveSubTab] = useState<
    'active_users' | 'all_users' | 'profiles' | 'user_manager' | 'maintenance' | 'interfaces' | 'remote_control' | 'hosts' | 'diagnostics' | 'ai_assistant' | 'settings' | 'daily_logs' | 'files'
  >(() => {
    if (initialSubTab && [
      'active_users', 'all_users', 'profiles', 'user_manager', 'maintenance',
      'interfaces', 'remote_control', 'hosts', 'diagnostics', 'ai_assistant',
      'settings', 'daily_logs', 'files'
    ].includes(initialSubTab)) {
      return initialSubTab as any;
    }
    try {
      const saved = localStorage.getItem('mikrotik_last_subtab');
      if (saved && [
        'active_users', 'all_users', 'profiles', 'user_manager', 'maintenance',
        'interfaces', 'remote_control', 'hosts', 'diagnostics', 'ai_assistant',
        'settings', 'daily_logs', 'files'
      ].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'active_users';
  });

  // Watch for external initialSubTab changes
  useEffect(() => {
    if (initialSubTab && [
      'active_users', 'all_users', 'profiles', 'user_manager', 'maintenance',
      'interfaces', 'remote_control', 'hosts', 'diagnostics', 'ai_assistant',
      'settings', 'daily_logs', 'files'
    ].includes(initialSubTab)) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  // Persist current subTab
  useEffect(() => {
    try {
      localStorage.setItem('mikrotik_last_subtab', activeSubTab);
    } catch {}
  }, [activeSubTab]);
  const [showMobileTabMenu, setShowMobileTabMenu] = useState(false);
  const [copiedUserIp, setCopiedUserIp] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedUserIp(id);
      setTimeout(() => setCopiedUserIp(null), 2000);
    } catch {
      // ignore
    }
  };

  // Search & Advanced Filter States
  const [activeUserSearch, setActiveUserSearch] = useState('');
  const [allUserSearch, setAllUserSearch] = useState('');
  const [userProfileFilter, setUserProfileFilter] = useState('all');
  const [configuredUserCardStatus, setConfiguredUserCardStatus] = useState<
    'all' | 'expired_all' | 'expired_quota' | 'expired_uptime' | 'manually_disabled' | 'active_quota' | 'unlimited'
  >('all');
  const [userUsageFilter, setUserUsageFilter] = useState<'all' | 'has_usage' | 'zero_usage'>('all');
  const [userSortBy, setUserSortBy] = useState<'default' | 'usage_desc' | 'uptime_desc' | 'expired_first' | 'name_asc'>('default');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showExpiredDeleteConfirm, setShowExpiredDeleteConfirm] = useState(false);
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
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
      setCommandFeedback({ success: true, message: `تم حذف الكارت (${userName}) نهائياً من المايكروتك.` });
      setTimeout(() => setCommandFeedback(null), 4000);
    } else {
      setCommandFeedback({ success: false, message: 'تعذر حذف الكارت من الراوتر.' });
    }
  };

  // Handle Bulk Delete Selected Users
  const handleBulkDeleteSelected = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkDeleting(true);
    setShowBulkDeleteConfirm(false);

    try {
      const result = await deleteConfiguredHotspotUsersBulk(config, selectedUserIds);
      setIsBulkDeleting(false);

      if (result.success) {
        setConfiguredUsers((prev) => prev.filter((u) => !selectedUserIds.includes(u.id) && !selectedUserIds.includes(u.name)));
        setSelectedUserIds([]);
        setCommandFeedback({
          success: true,
          message: `تم حذف ${result.deletedCount} كرت بنجاح من راوتر مايكروتك.`,
        });
        setTimeout(() => setCommandFeedback(null), 5000);
      } else {
        setCommandFeedback({
          success: false,
          message: `فشل الحذف الجماعي: ${result.message || 'حدث خطأ غير متوقع'}`,
        });
      }
    } catch (err: any) {
      setIsBulkDeleting(false);
      setCommandFeedback({
        success: false,
        message: `خطأ أثناء الحذف الجماعي: ${err.message}`,
      });
    }
  };

  // Handle Bulk Delete All Expired Users
  const handleBulkDeleteExpired = async () => {
    const expiredIds = configuredUsers
      .filter((u) => {
        const st = evaluateCardExpirationStatus(u, categories);
        return st.isExpired;
      })
      .map((u) => u.id);

    if (expiredIds.length === 0) {
      setCommandFeedback({
        success: false,
        message: 'لا توجد كروت منتهية الرصيد أو الصلاحية حالياً لحذفها.',
      });
      setTimeout(() => setCommandFeedback(null), 4000);
      setShowExpiredDeleteConfirm(false);
      return;
    }

    setIsBulkDeleting(true);
    setShowExpiredDeleteConfirm(false);

    try {
      const result = await deleteConfiguredHotspotUsersBulk(config, expiredIds);
      setIsBulkDeleting(false);

      if (result.success) {
        setConfiguredUsers((prev) => prev.filter((u) => !expiredIds.includes(u.id) && !expiredIds.includes(u.name)));
        setSelectedUserIds((prev) => prev.filter((id) => !expiredIds.includes(id)));
        setCommandFeedback({
          success: true,
          message: `تم حذف ${result.deletedCount} كرت منتهي الصلاحية/الرصيد بنجاح من راوتر مايكروتك.`,
        });
        setTimeout(() => setCommandFeedback(null), 5000);
      } else {
        setCommandFeedback({
          success: false,
          message: `فشل حذف الكروت المنتهية: ${result.message || 'حدث خطأ غير متوقع'}`,
        });
      }
    } catch (err: any) {
      setIsBulkDeleting(false);
      setCommandFeedback({
        success: false,
        message: `خطأ أثناء حذف الكروت المنتهية: ${err.message}`,
      });
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
      const data = await parseJsonSafely(res);
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
    const q = (activeUserSearch || '').toLowerCase();
    return (
      (u.user || '').toLowerCase().includes(q) ||
      (u.address || '').toLowerCase().includes(q) ||
      (u.macAddress || '').toLowerCase().includes(q) ||
      (u.comment && (u.comment || '').toLowerCase().includes(q))
    );
  });

  // Summary counts across all configured users using centralized evaluator
  const configuredCardsSummary = useMemo(() => {
    let expiredTotal = 0;
    let expiredQuota = 0;
    let expiredTime = 0;
    let manuallyDisabled = 0;
    let activeQuota = 0;
    let unlimited = 0;

    for (const u of configuredUsers) {
      const st = evaluateCardExpirationStatus(u, categories);
      if (st.isExpired) expiredTotal++;
      if (st.isQuotaExpired) expiredQuota++;
      if (st.isTimeExpired) expiredTime++;
      if (st.isManuallyDisabled) manuallyDisabled++;
      if (st.statusType === 'active_quota') activeQuota++;
      if (st.statusType === 'unlimited') unlimited++;
    }

    return {
      expiredTotal,
      expiredQuota,
      expiredTime,
      manuallyDisabled,
      activeQuota,
      unlimited,
      total: configuredUsers.length,
    };
  }, [configuredUsers, categories]);

  // Backward compatibility alias for bulk delete
  const totalExpiredCardsCount = configuredCardsSummary.expiredTotal;

  // Filtered and sorted configured users
  const filteredConfiguredUsers = useMemo(() => {
    const list = configuredUsers.filter((u) => {
      const q = (allUserSearch || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.comment && (u.comment || '').toLowerCase().includes(q)) ||
        (u.profile && (u.profile || '').toLowerCase().includes(q));
      const matchesProfile = userProfileFilter === 'all' || u.profile === userProfileFilter;
      if (!matchesSearch || !matchesProfile) return false;

      const st = evaluateCardExpirationStatus(u, categories);

      // Status filter
      if (configuredUserCardStatus === 'expired_all' && !st.isExpired) return false;
      if (configuredUserCardStatus === 'expired_quota' && !st.isQuotaExpired) return false;
      if (configuredUserCardStatus === 'expired_uptime' && !st.isTimeExpired) return false;
      if (configuredUserCardStatus === 'manually_disabled' && !st.isManuallyDisabled) return false;
      if (configuredUserCardStatus === 'active_quota' && st.statusType !== 'active_quota') return false;
      if (configuredUserCardStatus === 'unlimited' && st.statusType !== 'unlimited') return false;

      // Usage filter
      if (userUsageFilter === 'has_usage' && st.totalBytesUsed === 0 && st.usedUptimeSec === 0) return false;
      if (userUsageFilter === 'zero_usage' && (st.totalBytesUsed > 0 || st.usedUptimeSec > 0)) return false;

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      const stA = evaluateCardExpirationStatus(a, categories);
      const stB = evaluateCardExpirationStatus(b, categories);

      if (userSortBy === 'usage_desc') {
        return stB.totalBytesUsed - stA.totalBytesUsed;
      }
      if (userSortBy === 'uptime_desc') {
        return stB.usedUptimeSec - stA.usedUptimeSec;
      }
      if (userSortBy === 'expired_first') {
        if (stA.isExpired && !stB.isExpired) return -1;
        if (!stA.isExpired && stB.isExpired) return 1;
        return stB.totalBytesUsed - stA.totalBytesUsed;
      }
      if (userSortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    return list;
  }, [configuredUsers, allUserSearch, userProfileFilter, configuredUserCardStatus, userUsageFilter, userSortBy, categories]);

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

            {/* Scheduled Data Sync Button */}
            {onOpenDataSync && (
              <button
                id="mikrotik-live-open-data-sync-btn"
                onClick={onOpenDataSync}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-bold shadow-md transition shrink-0"
                title="مركز التزامن التلقائي المجدول للبيانات (كل دقيقة)"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>تزامن البيانات المجدول ⏱️</span>
              </button>
            )}

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

      {/* Live System Telemetry Cards with Circular Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CPU Load - Circular Gauge */}
        <CircularMetricCard
          id="cpu-telemetry-gauge"
          title="استهلاك المعالج (CPU)"
          icon={<Cpu className="w-4 h-4 text-amber-400" />}
          percent={systemInfo?.cpuLoad ?? 0}
          type="cpu"
          centerLabel="LOAD"
          details={[
            {
              label: 'الأنوية',
              value: systemInfo?.cpuCount ? `${systemInfo.cpuCount} Cores` : '1 Core',
              valueColor: 'text-white',
            },
            ...(systemInfo?.cpuFrequency ? [{
              label: 'التردد',
              value: systemInfo.cpuFrequency,
              valueColor: 'text-amber-300',
            }] : []),
            {
              label: 'المعمارية',
              value: systemInfo?.architecture || systemInfo?.boardName || 'RouterOS',
              valueColor: 'text-slate-300',
              title: systemInfo?.boardName || systemInfo?.architecture,
            },
            ...(systemInfo?.temperature !== undefined ? [{
              label: 'الحرارة',
              value: `${systemInfo.temperature}°C`,
              valueColor: systemInfo.temperature > 65 ? 'text-rose-400' : 'text-emerald-400',
            }] : []),
          ]}
        />

        {/* RAM Memory - Circular Gauge */}
        {(() => {
          const totalMem = systemInfo?.totalMemory || 0;
          const freeMem = systemInfo?.freeMemory || 0;
          const usedMem = Math.max(0, totalMem - freeMem);
          const ramPct = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

          return (
            <CircularMetricCard
              id="ram-telemetry-gauge"
              title="الذاكرة العشوائية (RAM)"
              icon={<HardDrive className="w-4 h-4 text-cyan-400" />}
              percent={ramPct}
              type="ram"
              centerLabel="USED"
              details={[
                {
                  label: 'المستهلك',
                  value: formatBytesToHuman(usedMem),
                  valueColor: 'text-white',
                },
                {
                  label: 'المتاح',
                  value: formatBytesToHuman(freeMem),
                  valueColor: 'text-emerald-400',
                },
                {
                  label: 'الإجمالي',
                  value: formatBytesToHuman(totalMem),
                  valueColor: 'text-cyan-300',
                },
              ]}
            />
          );
        })()}

        {/* Active Hotspot Users & Total Registered */}
        <div className="bg-slate-900/90 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-slate-200 text-xs font-bold">المستخدمين (Hotspot)</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              {activeUsers.length} متصل
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">
              {activeUsers.length}
            </span>
            <span className="text-[11px] text-slate-400">نشط / {configuredUsers.length} مسجل</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>بروفايلات السرعة:</span>
            <span className="font-mono font-bold text-slate-300">{userProfiles.length} بروفايل</span>
          </div>
        </div>

        {/* Router Uptime & Model */}
        <div className="bg-slate-900/90 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between group">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-slate-200 text-xs font-bold">النظام والتشغيل</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              v{systemInfo?.version || config.routerOsVersion || '7.x'}
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-sm sm:text-base font-bold text-white block truncate" title={systemInfo?.model || config.routerModel || 'MikroTik Router'}>
              {systemInfo?.model || config.routerModel || 'MikroTik Router'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-1" dir="ltr">
              UP: {systemInfo?.uptime || 'غير متاح'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>الهوية:</span>
            <span className="font-mono font-bold text-cyan-400 truncate max-w-[120px]">
              {systemInfo?.identity || config.routerIdentity || 'MikroTik'}
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

      {/* Mobile Current Section Banner & Quick Switcher Drawer Toggle */}
      <div className="sm:hidden bg-slate-900/95 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            {activeSubTab === 'active_users' && <Users className="w-5 h-5 text-emerald-400" />}
            {activeSubTab === 'user_manager' && <Server className="w-5 h-5 text-purple-400" />}
            {activeSubTab === 'all_users' && <CreditCard className="w-5 h-5 text-indigo-400" />}
            {activeSubTab === 'profiles' && <Layers className="w-5 h-5 text-cyan-400" />}
            {activeSubTab === 'maintenance' && <Wrench className="w-5 h-5 text-amber-400" />}
            {activeSubTab === 'daily_logs' && <Database className="w-5 h-5 text-emerald-400" />}
            {activeSubTab === 'files' && <Folder className="w-5 h-5 text-sky-400" />}
            {activeSubTab === 'remote_control' && <Power className="w-5 h-5 text-amber-400" />}
            {activeSubTab === 'interfaces' && <Activity className="w-5 h-5 text-indigo-400" />}
            {activeSubTab === 'hosts' && <Laptop className="w-5 h-5 text-cyan-400" />}
            {activeSubTab === 'ai_assistant' && <Bot className="w-5 h-5 text-purple-400" />}
            {activeSubTab === 'diagnostics' && <Terminal className="w-5 h-5 text-indigo-400" />}
            {activeSubTab === 'settings' && <Sliders className="w-5 h-5 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">القسم النشط حالياً</span>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-white text-sm truncate">
                {activeSubTab === 'active_users' && `المستخدمين النشطين (${activeUsers.length})`}
                {activeSubTab === 'user_manager' && 'اليوزر مانجر (User Manager)'}
                {activeSubTab === 'all_users' && `كروت الهوتسبوت (${configuredUsers.length})`}
                {activeSubTab === 'profiles' && `بروفايلات السرعة (${userProfiles.length})`}
                {activeSubTab === 'maintenance' && 'وضع الصيانة والشبكة'}
                {activeSubTab === 'daily_logs' && 'سجل الاستهلاك اليومي'}
                {activeSubTab === 'files' && 'الملفات والنسخ الاحتياطية'}
                {activeSubTab === 'remote_control' && 'التحكم عن بُعد والأوامر'}
                {activeSubTab === 'interfaces' && `واجهات الشبكة (${interfaces.length})`}
                {activeSubTab === 'hosts' && `الأجهزة و DHCP (${hosts.length})`}
                {activeSubTab === 'ai_assistant' && 'المساعد الذكي للمايكروتك'}
                {activeSubTab === 'diagnostics' && 'سكربتات WinBox'}
                {activeSubTab === 'settings' && 'إعدادات الاتصال'}
              </h4>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMobileTabMenu(true)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/30 transition active:scale-95"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>كل الأقسام (13)</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Bottom Sheet Drawer / Modal for Easy Tab Picking */}
      {showMobileTabMenu && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowMobileTabMenu(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[88vh] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">أقسام وتبويبات المايكروتك</h3>
                  <p className="text-xs text-slate-400">اختر القسم الذي تريد الانتقال إليه بلمسة واحدة</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileTabMenu(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Grouped Tabs */}
            <div className="p-4 overflow-y-auto space-y-4 divide-y divide-slate-800/80 text-right">
              {/* Group 1: المشتركين والكروت */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-indigo-400 tracking-wider block">
                  👤 إدارة المشتركين والكروت
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setActiveSubTab('active_users');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'active_users'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>المستخدمين النشطين</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">الجلسات المتصلة الآن وسحب السرعات</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {activeUsers.length} متصل
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('user_manager');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'user_manager'
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>اليوزر مانجر (User Manager)</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">UM v6/v7</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">كروت وباقات اليوزر مانجر وطابور الانتظار</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('all_users');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'all_users'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">كروت الهوتسبوت بالراوتر</div>
                        <span className="text-[11px] text-slate-400 block">كافة الكروت والمنتهية في /ip/hotspot/user</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {configuredUsers.length} كرت
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('profiles');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'profiles'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">بروفايلات السرعة (Profiles)</div>
                        <span className="text-[11px] text-slate-400 block">تحديد سرعات التحميل والرفع والمشاركة</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {userProfiles.length} بروفايل
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 2: الصيانة والتشغيل والملفات */}
              <div className="space-y-2 pt-3">
                <span className="text-xs font-bold text-amber-400 tracking-wider block">
                  ⚡ الصيانة والتشغيل والملفات
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setActiveSubTab('maintenance');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'maintenance'
                        ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">وضع الصيانة وحالة الشبكة</div>
                        <span className="text-[11px] text-slate-400 block">إيقاف وتشغيل الشبكة وإظهار صفحة الصيانة</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('daily_logs');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'daily_logs'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">سجل الاستهلاك اليومي</div>
                        <span className="text-[11px] text-slate-400 block">تقارير سحب البيانات والـ WAN التراكمية</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('files');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'files'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>الملفات والنسخ الاحتياطية</span>
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">جديد</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">إدارة ملفات الراوتر واستعادة Backups</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-sky-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('remote_control');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'remote_control'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Power className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">التحكم عن بُعد والأوامر</div>
                        <span className="text-[11px] text-slate-400 block">إعادة التشغيل، فحص البنج، وأوامر النظام</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Group 3: أدوات الشبكة والمتقدم */}
              <div className="space-y-2 pt-3">
                <span className="text-xs font-bold text-sky-400 tracking-wider block">
                  🛠️ أدوات الشبكة والمتقدم
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setActiveSubTab('interfaces');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'interfaces'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">واجهات الشبكة والسرعات</div>
                        <span className="text-[11px] text-slate-400 block">رسم بياني حي لمعدل سحب المنافذ والـ WAN</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                      {interfaces.length} منفذ
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('hosts');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'hosts'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">الأجهزة المتصلة و DHCP</div>
                        <span className="text-[11px] text-slate-400 block">جدول Hosts وعناوين الماك المكتشفة</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                      {hosts.length} جهاز
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('ai_assistant');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'ai_assistant'
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm ring-1 ring-purple-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">المساعد الذكي للمايكروتك</div>
                        <span className="text-[11px] text-slate-400 block">استشارات وتوليد سكربتات RouterOS</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('diagnostics');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'diagnostics'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 shrink-0 flex items-center justify-center">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">سكربتات WinBox</div>
                        <span className="text-[11px] text-slate-400 block">سكربت One-Click Setup وأوامر التثبيت</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('settings');
                      setShowMobileTabMenu(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition min-h-[56px] ${
                      activeSubTab === 'settings'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 shrink-0 flex items-center justify-center">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">إعدادات الاتصال</div>
                        <span className="text-[11px] text-slate-400 block">تعديل IP الراوتر والمنافذ وبروتوكول API</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Square Cards Grid Navigation Menu (القوائم الداخلية على شكل مربعات سهلة الوصول والتحكم) */}
      <div className="bg-slate-900/70 p-2.5 sm:p-3 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2 px-1 text-xs text-slate-400">
          <span className="font-bold flex items-center gap-1.5 text-slate-300">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>أقسام وتبويبات مايكروتك (وصول سريع مباشر بدون إزاحة):</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">13 قسماً متكاملاً</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {/* 1. Active Users */}
          <button
            type="button"
            onClick={() => setActiveSubTab('active_users')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'active_users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'active_users' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">المستخدمين النشطين</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeSubTab === 'active_users'
                ? 'bg-black/30 text-white'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {activeUsers.length} نشط
            </span>
          </button>

          {/* 2. User Manager */}
          <button
            type="button"
            onClick={() => setActiveSubTab('user_manager')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'user_manager'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border-purple-400 ring-2 ring-purple-400/40'
                : 'bg-slate-900/90 text-purple-300 border-purple-500/30 hover:text-white hover:bg-slate-800/90 hover:border-purple-500/50'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'user_manager' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'
            }`}>
              <Server className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">اليوزر مانجر</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              activeSubTab === 'user_manager'
                ? 'bg-black/30 text-white'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              <span>v6 / v7</span>
            </span>
          </button>

          {/* 3. Hotspot Users */}
          <button
            type="button"
            onClick={() => setActiveSubTab('all_users')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'all_users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'all_users' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">كروت الهوتسبوت</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeSubTab === 'all_users'
                ? 'bg-black/30 text-white'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              {configuredUsers.length} كارت
            </span>
          </button>

          {/* 4. Speed Profiles */}
          <button
            type="button"
            onClick={() => setActiveSubTab('profiles')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'profiles' ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-400'
            }`}>
              <Layers className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">بروفايلات السرعة</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeSubTab === 'profiles'
                ? 'bg-black/30 text-white'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {userProfiles.length} بروفايل
            </span>
          </button>

          {/* 5. Maintenance & Network Status */}
          <button
            type="button"
            onClick={() => setActiveSubTab('maintenance')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'maintenance'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border-amber-400 ring-2 ring-amber-400/40'
                : settings.maintenanceSettings?.networkStatus === 'maintenance' || settings.maintenanceSettings?.enabled
                ? 'bg-amber-950/50 text-amber-300 border-amber-500/60 hover:bg-amber-900/50'
                : settings.maintenanceSettings?.networkStatus === 'disabled'
                ? 'bg-rose-950/50 text-rose-300 border-rose-500/60 hover:bg-rose-900/50'
                : 'bg-slate-900/90 text-amber-300 border-amber-500/30 hover:text-white hover:bg-slate-800/90'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'maintenance' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Wrench className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">وضع الصيانة</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'maintenance'
                ? 'bg-black/30 text-white'
                : settings.maintenanceSettings?.networkStatus === 'maintenance'
                ? 'bg-amber-400 text-black animate-pulse'
                : settings.maintenanceSettings?.networkStatus === 'disabled'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {settings.maintenanceSettings?.networkStatus === 'maintenance' ? 'صيانة نشطة' : settings.maintenanceSettings?.networkStatus === 'disabled' ? 'معطلة' : 'جاهزة'}
            </span>
          </button>

          {/* 6. Daily Usage Logs */}
          <button
            type="button"
            onClick={() => setActiveSubTab('daily_logs')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'daily_logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'daily_logs' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <Database className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">سجل الاستهلاك</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'daily_logs' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              يومي / شهري
            </span>
          </button>

          {/* 7. Files & Backups */}
          <button
            type="button"
            onClick={() => setActiveSubTab('files')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'files'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border-sky-400 ring-2 ring-sky-400/40'
                : 'bg-slate-900/90 text-sky-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'files' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-400'
            }`}>
              <Folder className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">الملفات والنسخ</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'files' ? 'bg-black/30 text-white' : 'bg-sky-500/20 text-sky-300'
            }`}>
              Backups
            </span>
          </button>

          {/* 8. Remote Control */}
          <button
            type="button"
            onClick={() => setActiveSubTab('remote_control')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'remote_control'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border-amber-400 ring-2 ring-amber-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'remote_control' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Power className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">التحكم بالأوامر</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'remote_control' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              أوامر سريعة
            </span>
          </button>

          {/* 9. Interfaces */}
          <button
            type="button"
            onClick={() => setActiveSubTab('interfaces')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'interfaces'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'interfaces' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              <Activity className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">واجهات الشبكة</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeSubTab === 'interfaces'
                ? 'bg-black/30 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {interfaces.length} منافذ
            </span>
          </button>

          {/* 10. Hosts & DHCP */}
          <button
            type="button"
            onClick={() => setActiveSubTab('hosts')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'hosts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'hosts' ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-400'
            }`}>
              <Laptop className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">الأجهزة و DHCP</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeSubTab === 'hosts'
                ? 'bg-black/30 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {hosts.length} جهاز
            </span>
          </button>

          {/* 11. AI Assistant */}
          <button
            type="button"
            onClick={() => setActiveSubTab('ai_assistant')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'ai_assistant'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border-purple-400 ring-2 ring-purple-400/40'
                : 'bg-slate-900/90 text-purple-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-purple-500/40'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'ai_assistant' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'
            }`}>
              <Bot className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">المساعد الذكي</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'ai_assistant' ? 'bg-black/30 text-white' : 'bg-purple-500/20 text-purple-300'
            }`}>
              AI Bot
            </span>
          </button>

          {/* 12. WinBox Scripts */}
          <button
            type="button"
            onClick={() => setActiveSubTab('diagnostics')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'diagnostics'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'diagnostics' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              <Terminal className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">سكربتات WinBox</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'diagnostics' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              أوامر جاهزة
            </span>
          </button>

          {/* 13. Settings */}
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`relative flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border text-center transition-all duration-150 min-h-[84px] sm:min-h-[88px] active:scale-95 cursor-pointer shadow-sm ${
              activeSubTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
              activeSubTab === 'settings' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}>
              <Sliders className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">إعدادات الاتصال</span>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSubTab === 'settings' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              IP & Port
            </span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: Active Users (Hotspot Active) */}
      {activeSubTab === 'active_users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="بحث بالمستخدم، IP، أو الماك..."
                value={activeUserSearch}
                onChange={(e) => setActiveUserSearch(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pr-10 pl-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-300 bg-slate-950/60 p-2 sm:p-0 rounded-xl border sm:border-0 border-slate-800">
              <div className="flex items-center gap-1.5">
                <span>المتصلين الآن:</span>
                <span className="text-emerald-400 font-mono font-black text-sm bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  {filteredActiveUsers.length}
                </span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>آخر تحديث:</span>
                <strong className="font-mono text-slate-200">{lastUpdated || 'الآن'}</strong>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredActiveUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">لا يوجد مستخدمين متصلين حالياً أو لا توجد نتائج مطابقة للبحث.</p>
                </div>
              ) : (
                filteredActiveUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3.5 transition-all"
                  >
                    {/* Top row: Avatar + Username + Status + Kick Button */}
                    <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-base tracking-wide truncate block">
                              {user.user}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              متصل
                            </span>
                          </div>
                          {user.comment && (
                            <span className="text-xs text-slate-400 truncate block mt-0.5">{user.comment}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleKickUser(user.id, user.user)}
                        disabled={isKicking && kickTargetId === user.id}
                        className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                        title="فصل الجلسة فوراً"
                      >
                        {isKicking && kickTargetId === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <LogOut className="w-4 h-4 text-rose-400" />
                        )}
                        <span>فصل</span>
                      </button>
                    </div>

                    {/* 2x2 Grid for Key Metrics (Download, Upload, Uptime, Rate Limit) */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                          <ArrowDownCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">سحب التحميل</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm block truncate">
                            {formatBytesToHuman(user.bytesOut)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                          <ArrowUpCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">سحب الرفع</span>
                          <span className="font-mono font-bold text-cyan-400 text-sm block truncate">
                            {formatBytesToHuman(user.bytesIn)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">مدة الجلسة</span>
                          <span className="font-mono font-bold text-amber-300 text-xs block truncate">
                            {user.uptime}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">السرعة المحددة</span>
                          <span className="font-mono font-bold text-slate-200 text-xs block truncate">
                            {user.rateLimit || 'حسب البروفايل'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer info: IP & MAC & LoginBy */}
                    <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                        <span className="text-slate-500">IP:</span>
                        <span className="text-slate-200 font-bold">{user.address}</span>
                        <button
                          onClick={() => handleCopyText(user.address, `ip-${user.id}`)}
                          className="text-slate-400 hover:text-white p-0.5 ml-1"
                          title="نسخ عنوان IP"
                        >
                          {copiedUserIp === `ip-${user.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px]">
                        <span className="text-slate-500">MAC:</span>
                        <span className="text-slate-300">{user.macAddress}</span>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] border border-slate-800">
                        {user.loginBy || 'http-chap'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
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
          {/* Controls Bar & Filters */}
          <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            {/* Top row: Status Tabs & Bulk Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              {/* Filter Tabs: All / Expired (All) / Expired Quota / Expired Time / Manually Disabled / Active Quota / Unlimited */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setConfiguredUserCardStatus('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    configuredUserCardStatus === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <span>كافة الكروت</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-indigo-200 font-mono">
                    {configuredUsers.length}
                  </span>
                </button>

                {/* All Expired */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'expired_all' ? 'all' : 'expired_all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    configuredUserCardStatus === 'expired_all'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                  title="عرض الكروت التي نفذ رصيدها أو انتهى وقتها تلقائياً"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                  <span>المنتهية (الكل)</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-900/60 text-rose-200 font-mono font-bold">
                    {configuredCardsSummary.expiredTotal}
                  </span>
                </button>

                {/* Quota Expired */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'expired_quota' ? 'all' : 'expired_quota')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    configuredUserCardStatus === 'expired_quota'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-rose-300'
                  }`}
                  title="كروت استهلكت كامل حجم البيانات المحدد (Data Quota)"
                >
                  <span>نفد الرصيد</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-rose-300 font-mono font-bold">
                    {configuredCardsSummary.expiredQuota}
                  </span>
                </button>

                {/* Uptime Expired */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'expired_uptime' ? 'all' : 'expired_uptime')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    configuredUserCardStatus === 'expired_uptime'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                  }`}
                  title="كروت استهلكت كامل مدة الاتصال المسموحة (Uptime Limit)"
                >
                  <span>نفد الوقت</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-amber-300 font-mono font-bold">
                    {configuredCardsSummary.expiredTime}
                  </span>
                </button>

                {/* Manually Disabled - Distinct separation */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'manually_disabled' ? 'all' : 'manually_disabled')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    configuredUserCardStatus === 'manually_disabled'
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="كروت معطلة يدوياً من قِبل المسؤول (وليست منتهية الرصيد تلقائياً)"
                >
                  <Power className="w-3 h-3 text-slate-400" />
                  <span>معطلة يدوياً</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-slate-300 font-mono">
                    {configuredCardsSummary.manuallyDisabled}
                  </span>
                </button>

                {/* Active with Quota */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'active_quota' ? 'all' : 'active_quota')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    configuredUserCardStatus === 'active_quota'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                  }`}
                >
                  <span>نشطة برصيد</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-emerald-300 font-mono">
                    {configuredCardsSummary.activeQuota}
                  </span>
                </button>

                {/* Unlimited */}
                <button
                  onClick={() => setConfiguredUserCardStatus(configuredUserCardStatus === 'unlimited' ? 'all' : 'unlimited')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
                    configuredUserCardStatus === 'unlimited'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  <span>مفتوحة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-900/60 text-slate-400 font-mono">
                    {configuredCardsSummary.unlimited}
                  </span>
                </button>
              </div>

              {/* Action Buttons: Delete Expired & Delete Selected */}
              <div className="flex flex-wrap items-center gap-2">
                {configuredCardsSummary.expiredTotal > 0 && (
                  <button
                    onClick={() => setShowExpiredDeleteConfirm(true)}
                    disabled={isBulkDeleting}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    title="حذف جميع الكروت المنتهية (رصيد أو وقت) بنقرة واحدة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المنتهية ({configuredCardsSummary.expiredTotal})</span>
                  </button>
                )}

                {selectedUserIds.length > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isBulkDeleting}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المحدد ({selectedUserIds.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveSubTab('cards')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة كروت</span>
                </button>
              </div>
            </div>

            {/* Middle row: Search & Profile Filter & Advanced Filter Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
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

                {/* Advanced Search Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    showAdvancedFilter || configuredUserCardStatus !== 'all' || userUsageFilter !== 'all' || userSortBy !== 'default'
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="فتح/إغلاق خيارات الفلترة المتقدمة للكروت"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>فلتر بحث متقدم</span>
                  {(configuredUserCardStatus !== 'all' || userUsageFilter !== 'all' || userSortBy !== 'default') && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>
                  المعروض: <strong className="text-indigo-400 font-mono font-bold">{filteredConfiguredUsers.length}</strong> من <span className="font-mono">{configuredUsers.length}</span> كرت
                </span>
                {selectedUserIds.length > 0 && (
                  <button
                    onClick={() => setSelectedUserIds([])}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    إلغاء التحديد ({selectedUserIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filter Panel */}
            {showAdvancedFilter && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
                {/* Advanced Status Selector */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">حالة الكرت الدقيقة:</label>
                  <select
                    value={configuredUserCardStatus}
                    onChange={(e) => setConfiguredUserCardStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">كافة الحالات (بدون استثناء)</option>
                    <option value="expired_all">🔴 المنتهية فقط (رصيد أو وقت أو تلقائي)</option>
                    <option value="expired_quota">🛑 منتهية الرصيد فقط (استنفذت الميجابايت)</option>
                    <option value="expired_uptime">⏱️ منتهية الوقت فقط (استنفذت الساعات)</option>
                    <option value="manually_disabled">⛔ معطلة يدوياً فقط (بواسطة المسؤول)</option>
                    <option value="active_quota">🟢 نشطة ومتبقي رصيد/وقت</option>
                    <option value="unlimited">♾️ كروت مفتوحة غير محددة</option>
                  </select>
                </div>

                {/* Usage Filter */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">مستوى الاستهلاك الفعلي:</label>
                  <select
                    value={userUsageFilter}
                    onChange={(e) => setUserUsageFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">كافة الكروت (مستهلكة وجديدة)</option>
                    <option value="has_usage">📊 كروت تم استخدامها (سحب بيانات أو وقت)</option>
                    <option value="zero_usage">✨ كروت جديدة لم تُستخدم بعد (0 بايت)</option>
                  </select>
                </div>

                {/* Smart Sorting */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">ترتيب النتائج حسب:</label>
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="default">الترتيب الافتراضي للراوتر</option>
                    <option value="expired_first">🚨 الكروت المنتهية أولاً في القمة</option>
                    <option value="usage_desc">📈 الأعلى استهلاكاً للبيانات</option>
                    <option value="uptime_desc">⏳ الأطول استخداماً للوقت</option>
                    <option value="name_asc">🔤 أبجدياً بحسب اسم الكارت</option>
                  </select>
                </div>

                {/* Reset & Quick Filter Button */}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfiguredUserCardStatus('all');
                      setUserUsageFilter('all');
                      setUserSortBy('default');
                      setAllUserSearch('');
                      setUserProfileFilter('all');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Configured Users Table & Mobile Touch Cards */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="md:hidden p-3 space-y-3">
              {/* Mobile Selection Toolbar */}
              <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2.5 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUserIds.length === filteredConfiguredUsers.length && filteredConfiguredUsers.length > 0) {
                      setSelectedUserIds([]);
                    } else {
                      setSelectedUserIds(filteredConfiguredUsers.map((u) => u.id));
                    }
                  }}
                  className="flex items-center gap-2 text-slate-300 font-bold hover:text-white"
                >
                  {selectedUserIds.length === filteredConfiguredUsers.length && filteredConfiguredUsers.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500" />
                  )}
                  <span>تحديد كل المعروض ({filteredConfiguredUsers.length})</span>
                </button>
                {selectedUserIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                    تم تحديد {selectedUserIds.length}
                  </span>
                )}
              </div>

              {filteredConfiguredUsers.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  <Key className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm text-slate-300">لا توجد كروت مسجلة</p>
                  <p className="text-xs text-slate-500 mt-1">لا توجد نتائج مطابقة لشروط البحث أو التصفية الحالية.</p>
                </div>
              ) : (
                filteredConfiguredUsers.map((user) => {
                  const st = evaluateCardExpirationStatus(user, categories);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <div
                      key={user.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                        isSelected
                          ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/30'
                          : st.isQuotaExpired
                          ? 'bg-rose-950/20 border-rose-800/40'
                          : st.isTimeExpired
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : st.isManuallyDisabled
                          ? 'bg-slate-900/60 border-slate-800 opacity-75'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Row: Selection Checkbox + User Name + Status Badge */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                              } else {
                                setSelectedUserIds((prev) => [...prev, user.id]);
                              }
                            }}
                            className="p-1 -m-1 text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500" />
                            )}
                          </button>

                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              st.isExpired
                                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                                : st.isManuallyDisabled
                                ? 'bg-slate-500/15 border border-slate-600/30 text-slate-400'
                                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {st.isManuallyDisabled ? (
                              <Power className="w-4 h-4 text-slate-400" />
                            ) : (
                              <Key className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-white font-mono text-sm block truncate">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              بروفايل: <span className="text-indigo-300 font-bold">{user.profile}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${st.statusBadgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            st.isQuotaExpired ? 'bg-rose-400' :
                            st.isTimeExpired ? 'bg-amber-400' :
                            st.isManuallyDisabled ? 'bg-slate-400' :
                            st.statusType === 'active_quota' ? 'bg-emerald-400' : 'bg-slate-400'
                          }`} />
                          {st.statusLabel}
                        </span>
                      </div>

                      {/* 2x2 Stats Grid for Mobile */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">حجم الكارت (Quota)</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs block truncate mt-0.5">
                            {st.limitBytesTotal > 0 ? formatBytesHuman(st.limitBytesTotal) : 'غير محدود'}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">الاستهلاك الفعلي</span>
                          <span className="font-mono font-bold text-cyan-400 text-xs block truncate mt-0.5">
                            {formatBytesHuman(st.totalBytesUsed)}
                            {st.percentQuotaUsed !== null && (
                              <span className="text-[10px] text-slate-400 font-sans mr-1">
                                ({st.percentQuotaUsed}%)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">الوقت المحدد</span>
                          <span className="font-mono font-bold text-slate-300 text-xs block truncate mt-0.5">
                            {user.limitUptime || 'غير محدد'}
                          </span>
                        </div>

                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">الوقت المستهلك</span>
                          <span className="font-mono font-bold text-amber-300 text-xs block truncate mt-0.5">
                            {user.uptime || '0s'}
                          </span>
                        </div>
                      </div>

                      {/* Comment & Actions Footer */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-slate-400 truncate">
                          {user.comment ? `ملاحظة: ${user.comment}` : 'بدون ملاحظات'}
                        </span>
                        <button
                          onClick={() => handleDeleteConfiguredUser(user.id, user.name)}
                          disabled={isDeletingUser && deleteTargetId === user.id}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold transition flex items-center gap-1 shrink-0"
                          title="حذف الكارت من الراوتر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الكارت</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedUserIds.length === filteredConfiguredUsers.length && filteredConfiguredUsers.length > 0) {
                            setSelectedUserIds([]);
                          } else {
                            setSelectedUserIds(filteredConfiguredUsers.map((u) => u.id));
                          }
                        }}
                        className="text-slate-400 hover:text-white transition flex items-center justify-center mx-auto"
                        title={selectedUserIds.length === filteredConfiguredUsers.length ? 'إلغاء تحديد الكل' : 'تحديد كل المعروض'}
                      >
                        {selectedUserIds.length === filteredConfiguredUsers.length && filteredConfiguredUsers.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">اسم الكارت / المستخدم</th>
                    <th className="p-3.5">حالة الكارت</th>
                    <th className="p-3.5">البروفايل المخصص</th>
                    <th className="p-3.5">حجم البيانات (Quota)</th>
                    <th className="p-3.5">إجمالي الاستهلاك</th>
                    <th className="p-3.5">الوقت المحدد (Limit Uptime)</th>
                    <th className="p-3.5">الوقت المستهلك</th>
                    <th className="p-3.5">الملاحظات</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {filteredConfiguredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        لا توجد كروت مسجلة في الراوتر أو لا توجد نتائج مطابقة للبحث والتصفية.
                      </td>
                    </tr>
                  ) : (
                    filteredConfiguredUsers.map((user) => {
                      const st = evaluateCardExpirationStatus(user, categories);
                      const isSelected = selectedUserIds.includes(user.id);

                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected
                              ? 'bg-indigo-950/20'
                              : st.isQuotaExpired
                              ? 'bg-rose-950/15'
                              : st.isTimeExpired
                              ? 'bg-amber-950/10'
                              : st.isManuallyDisabled
                              ? 'bg-slate-900/40 opacity-80'
                              : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                                } else {
                                  setSelectedUserIds((prev) => [...prev, user.id]);
                                }
                              }}
                              className="text-slate-400 hover:text-white transition flex items-center justify-center mx-auto"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono ${
                                  st.isExpired
                                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                    : st.isManuallyDisabled
                                    ? 'bg-slate-500/10 border border-slate-600/30 text-slate-400'
                                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                }`}
                              >
                                {st.isManuallyDisabled ? (
                                  <Power className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <Key className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="font-bold text-white font-mono">{user.name}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.statusBadgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                st.isQuotaExpired ? 'bg-rose-400' :
                                st.isTimeExpired ? 'bg-amber-400' :
                                st.isManuallyDisabled ? 'bg-slate-400' :
                                st.statusType === 'active_quota' ? 'bg-emerald-400' : 'bg-slate-400'
                              }`} />
                              {st.statusLabel}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              {user.profile}
                            </span>
                          </td>

                          <td className="p-3.5 font-mono text-emerald-400">
                            {st.limitBytesTotal > 0 ? formatBytesHuman(st.limitBytesTotal) : 'غير محدود'}
                          </td>

                          <td className="p-3.5 font-mono text-cyan-400">
                            <div>
                              <span>{formatBytesHuman(st.totalBytesUsed)}</span>
                              {st.percentQuotaUsed !== null && (
                                <span className="block text-[10px] text-slate-400 font-sans">
                                  ({st.percentQuotaUsed}%)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-slate-300">{user.limitUptime || 'غير محدد'}</td>

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
                      );
                    })
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
          initialTab={initialUmTab as any}
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

            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="md:hidden p-3 space-y-3">
              {interfaces.length === 0 ? (
                <div className="py-8 text-center text-slate-500">لا توجد واجهات شبكة متوفرة.</div>
              ) : (
                interfaces.map((iface) => (
                  <div
                    key={iface.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white font-mono text-sm block">{iface.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{iface.type}</span>
                        </div>
                      </div>
                      <div>
                        {iface.running ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>متصل</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            مفصول
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2-col Speeds */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">سرعة التحميل اللحظية (Rx)</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm block truncate mt-0.5">
                          {formatBitsToSpeed(iface.rxRateBps)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-1">
                          الإجمالي: {formatBytesToHuman(iface.rxByte)}
                        </span>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">سرعة الرفع اللحظية (Tx)</span>
                        <span className="font-mono font-bold text-cyan-400 text-sm block truncate mt-0.5">
                          {formatBitsToSpeed(iface.txRateBps)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-1">
                          الإجمالي: {formatBytesToHuman(iface.txByte)}
                        </span>
                      </div>
                    </div>

                    {iface.comment && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        ملاحظة: {iface.comment}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="md:hidden p-3 space-y-3">
              {hosts.length === 0 ? (
                <div className="py-8 text-center text-slate-500">لا توجد أجهزة متصلة بالهوتسبوت حالياً.</div>
              ) : (
                hosts.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-white font-bold text-sm">
                            <span>{h.address}</span>
                            <button
                              onClick={() => handleCopyText(h.address, `host-ip-${h.id}`)}
                              className="text-slate-400 hover:text-white p-0.5"
                              title="نسخ IP"
                            >
                              {copiedUserIp === `host-ip-${h.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">{h.macAddress}</span>
                        </div>
                      </div>

                      {h.authorized ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>مسجل (Auth)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          في صفحة الدخول
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">سحب التحميل</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs block truncate mt-0.5">
                          {formatBytesToHuman(h.bytesOut)}
                        </span>
                      </div>
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">سحب الرفع</span>
                        <span className="font-mono font-bold text-cyan-400 text-xs block truncate mt-0.5">
                          {formatBytesToHuman(h.bytesIn)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>مدة الاتصال: <span className="text-amber-300 font-bold">{h.uptime}</span></span>
                      <span>المنفذ: <span className="text-slate-200">{h.bridgePort || '-'}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
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

      {/* SUB-VIEW 9.8: Daily Network Logs & Bandwidth Consumption Report */}
      {activeSubTab === 'daily_logs' && (
        <DailyNetworkLogsView
          currentDownloadBytes={totalDownloadBytes}
          currentUploadBytes={totalUploadBytes}
          activeUsers={activeUsers}
          routerIdentity={systemInfo?.model || config.routerModel || 'MikroTik Router'}
          isConnected={isConnected}
          mikrotikConfig={config}
          onOpenDataSync={onOpenDataSync}
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

      {/* SUB-VIEW 13: MikroTik File System & Backup Management */}
      {activeSubTab === 'files' && (
        <MikrotikFilesManagerView
          config={config}
          isConnected={isConnected}
          routerIdentity={config.routerIdentity || systemInfo?.model || 'MikroTik'}
        />
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

      {/* Bulk Delete Selected Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">تأكيد حذف الكروت المحددة</h3>
              <p className="text-slate-300 mt-1 leading-relaxed">
                أنت على وشك حذف <strong className="text-rose-400 font-mono text-sm">{selectedUserIds.length}</strong> كرت محدد نهائياً من راوتر مايكروتك.
                هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkDeleteSelected}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>نعم، احذف المحدد</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Expired Modal */}
      {showExpiredDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">تأكيد تنظيف وحذف الكروت المنتهية</h3>
              <p className="text-slate-300 mt-1 leading-relaxed">
                سيتم حذف كافة الكروت التي استهلكت رصيد البيانات كاملاً (Quota Expired) وعددها{' '}
                <strong className="text-rose-400 font-mono text-sm">{totalExpiredCardsCount}</strong> كرت نهائياً من الراوتر لتحرير الذاكرة وتسريع النظام.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowExpiredDeleteConfirm(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkDeleteExpired}
                disabled={isBulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حذف المنتهية...</span>
                  </>
                ) : (
                  <span>نعم، نظف واحذف المنتهية</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Quick-Switch Navigation Dock (شريط التنقل السريع المثبت لسهولة وسرعة التبديل) */}
      <div className="sticky bottom-3 z-30 mx-auto max-w-2xl px-2">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveSubTab('active_users')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'active_users'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>النشطين ({activeUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('user_manager')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'user_manager'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>اليوزر مانجر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('all_users')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'all_users'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              <span>الكروت ({configuredUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('profiles')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'profiles'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>البروفايلات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('interfaces')}
              className={`px-2.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'interfaces'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>الواجهات</span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0 pl-1 border-r border-slate-800 pr-1">
            <button
              type="button"
              onClick={() => fetchAllLiveData(config)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 transition cursor-pointer"
              title="تحديث البيانات فوراً"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="العودة لأعلى الصفحة"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
