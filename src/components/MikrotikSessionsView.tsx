import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  Download,
  FileText,
  Wifi,
  Clock,
  Activity,
  HardDrive,
  Printer,
  ChevronDown,
  RefreshCw,
  UserX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle,
  Server,
  Zap,
} from 'lucide-react';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';
import { NetworkSettings, MikroTikConfig, MikrotikCallerSession } from '../types';
import { fetchMikrotikSessions, kickHotspotUser } from '../utils/mikrotikApi';
import { RemoteMikrotikWizardModal } from './RemoteMikrotikWizardModal';

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (isoString?: string | null) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDeviceIcon = (hostName?: string) => {
  if (!hostName) return <Smartphone size={16} className="text-slate-400" />;
  const lower = hostName.toLowerCase();
  if (
    lower.includes('desktop') ||
    lower.includes('laptop') ||
    lower.includes('pc') ||
    lower.includes('win') ||
    lower.includes('macbook')
  ) {
    return <Laptop size={16} className="text-blue-500" />;
  }
  return <Smartphone size={16} className="text-emerald-500" />;
};

export const MikrotikSessionsView: React.FC<{ settings?: NetworkSettings }> = ({ settings }) => {
  // Config selection
  const mikrotikConfig: Partial<MikroTikConfig> = useMemo(() => {
    return (
      settings?.mikrotikConfig || {
        host: '192.168.88.1',
        port: 8728,
        username: 'admin',
        password: '',
        protocol: 'auto',
        useSsl: false,
      }
    );
  }, [settings]);

  // Remote Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Data states
  const [sessions, setSessions] = useState<MikrotikCallerSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrivateIpWarning, setIsPrivateIpWarning] = useState(false);
  const [routerIdentity, setRouterIdentity] = useState<string | undefined>();

  // Auto refresh
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // in seconds, 0 = off
  const [countdown, setCountdown] = useState<number>(15);

  // Filters
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'all'>('active');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'hotspot' | 'user-manager'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Kick user modal state
  const [userToKick, setUserToKick] = useState<MikrotikCallerSession | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [kickSuccessMessage, setKickSuccessMessage] = useState<string | null>(null);

  // Export state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Copied MAC feedback
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

  const handleCopyMac = (mac: string) => {
    navigator.clipboard.writeText(mac);
    setCopiedMac(mac);
    setTimeout(() => setCopiedMac(null), 2000);
  };

  // Fetch real sessions from router
  const loadSessions = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await fetchMikrotikSessions(mikrotikConfig);
        if (res.success) {
          setSessions(res.sessions || []);
          setLastUpdated(new Date());
          if (res.routerIdentity) setRouterIdentity(res.routerIdentity);
          setIsPrivateIpWarning(false);
        } else {
          setErrorMessage(res.error || 'تعذر الاتصال براوتر مايكروتك');
          if (res.isPrivateIp) setIsPrivateIpWarning(true);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'حدث خطأ أثناء جلب الجلسات');
      } finally {
        if (!isBackground) setIsLoading(false);
        setCountdown(autoRefreshInterval);
      }
    },
    [mikrotikConfig, autoRefreshInterval]
  );

  // Initial load
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-refresh countdown effect
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadSessions(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, loadSessions]);

  // Kick action
  const handleKickConfirm = async () => {
    if (!userToKick) return;
    setIsKicking(true);
    setKickSuccessMessage(null);

    try {
      const targetId = userToKick.id || userToKick.user;
      const success = await kickHotspotUser(mikrotikConfig, targetId);
      if (success) {
        setKickSuccessMessage(`تم قطع اتصال المستخدم (${userToKick.user}) بنجاح من الراوتر.`);
        // Optimistically remove or re-fetch
        setSessions((prev) => prev.filter((s) => s.id !== userToKick.id));
        setTimeout(() => {
          setUserToKick(null);
          setKickSuccessMessage(null);
          loadSessions(true);
        }, 1500);
      } else {
        alert('تعذر فصل المستخدم من الراوتر. تأكد من صلاحيات حساب المستخدم في مايكروتك.');
      }
    } catch (err: any) {
      alert(`حدث خطأ أثناء فصل المستخدم: ${err.message}`);
    } finally {
      setIsKicking(false);
    }
  };

  // Export handling
  const handleExportPdf = async (format: 'a4' | 'pos-80mm') => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      await exportElementToPdf('mikrotik-sessions-report', {
        filename: `تقرير_إحصائيات_المتصلين_${format}.pdf`,
        title: `تقرير إحصائيات المتصلين - ${settings?.networkName || ''}`,
        format: format,
        paperFormat: format,
        scale: 2,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    setIsExportMenuOpen(false);
    await printElementDocument('mikrotik-sessions-report', {
      title: 'تقرير إحصائيات المتصلين الفعليين',
    });
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Tab filter
      if (activeTab === 'active' && !session.isActive) return false;
      if (activeTab === 'history' && session.isActive) return false;

      // Source filter
      if (sourceFilter !== 'all' && session.source !== sourceFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesUser = session.user.toLowerCase().includes(query);
        const matchesIp = session.address.includes(query);
        const matchesMac = session.macAddress.toLowerCase().includes(query);
        const matchesHost = (session.hostName || '').toLowerCase().includes(query);
        const matchesComment = (session.comment || '').toLowerCase().includes(query);
        if (!matchesUser && !matchesIp && !matchesMac && !matchesHost && !matchesComment) {
          return false;
        }
      }

      // Date range filter
      if (fromDate || toDate) {
        const sessionDate = session.loginTime.split('T')[0];
        if (fromDate && sessionDate < fromDate) return false;
        if (toDate && sessionDate > toDate) return false;
      }

      return true;
    });
  }, [sessions, activeTab, sourceFilter, searchTerm, fromDate, toDate]);

  // Statistics
  const activeNow = useMemo(() => sessions.filter((s) => s.isActive).length, [sessions]);
  const totalDownload = useMemo(
    () => filteredSessions.reduce((sum, s) => sum + (s.downloadBytes || 0), 0),
    [filteredSessions]
  );
  const totalUpload = useMemo(
    () => filteredSessions.reduce((sum, s) => sum + (s.uploadBytes || 0), 0),
    [filteredSessions]
  );
  const totalSessionsCount = filteredSessions.length;

  return (
    <div className="space-y-6 animate-fade-in" id="mikrotik-sessions-report">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-teal-600" />
              إحصائيات المتصلين الفعليين
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              بيانات حية مباشرة من الراوتر
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            مراقبة المستخدمين المتصلين حالياً على راوتر مايكروتك (Hotspot / User Manager) مع استهلاك البيانات واسم الجهاز
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs text-slate-600">
            <span className="px-2 font-medium flex items-center gap-1">
              <Radio size={14} className={autoRefreshInterval > 0 ? 'text-teal-600 animate-pulse' : 'text-slate-400'} />
              تحديث تلقائي:
            </span>
            <button
              onClick={() => setAutoRefreshInterval(0)}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                autoRefreshInterval === 0 ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              إيقاف
            </button>
            <button
              onClick={() => {
                setAutoRefreshInterval(10);
                setCountdown(10);
              }}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                autoRefreshInterval === 10 ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              10ث
            </button>
            <button
              onClick={() => {
                setAutoRefreshInterval(30);
                setCountdown(30);
              }}
              className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                autoRefreshInterval === 30 ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              30ث
            </button>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadSessions(false)}
            disabled={isLoading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-sm flex items-center gap-2 font-medium text-sm disabled:opacity-50"
            title="تحديث البيانات فورياً من الراوتر"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            تحديث الآن
            {autoRefreshInterval > 0 && (
              <span className="text-xs bg-teal-800/60 px-1.5 py-0.5 rounded-full font-mono">
                {countdown}s
              </span>
            )}
          </button>

          {/* Remote Wizard Button */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
            title="إعدادات الربط الخارجي Starlink / DDNS"
          >
            <Zap size={16} className="text-amber-500" />
            معالج الربط
          </button>

          {/* Export & Print */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium text-sm"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Download size={16} />
              )}
              تصدير
              <ChevronDown size={14} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => handleExportPdf('a4')}
                  className="w-full text-right px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-700">PDF - A4</span>
                  <span className="text-xs text-slate-400">للطابعات العادية</span>
                </button>
                <button
                  onClick={() => handleExportPdf('pos-80mm')}
                  className="w-full text-right px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-700">PDF - حراري</span>
                  <span className="text-xs text-slate-400">كاشير 80mm</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full text-right px-4 py-3 text-sm hover:bg-slate-50 flex items-center justify-between text-indigo-600"
                >
                  <span className="font-semibold">طباعة فورية</span>
                  <Printer size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-800">راوتر المايكروتك:</span>
            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">
              {mikrotikConfig.host || '192.168.88.1'}
            </span>
          </div>
          {routerIdentity && (
            <span className="text-slate-600 flex items-center gap-1">
              <Server size={14} className="text-slate-400" />
              الاسم: <strong className="text-slate-700">{routerIdentity}</strong>
            </span>
          )}
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-500 text-xs">
            البروتوكول: <span className="font-medium text-slate-700">{mikrotikConfig.protocol || 'تلقائي (REST / Binary)'}</span>
          </span>
          {lastUpdated && (
            <>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-500 text-xs">
                آخر تحديث:{' '}
                <span className="font-medium text-slate-700">
                  {lastUpdated.toLocaleTimeString('ar-SA')}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {errorMessage ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <XCircle size={14} />
              {errorMessage}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={14} />
              متصل بالراوتر الفعلي
            </span>
          )}
        </div>
      </div>

      {/* Private IP Warning banner (if Starlink IP or local IP needs public DDNS setup) */}
      {isPrivateIpWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 mb-1">تنبيه عنوان IP محلي / خاص (Private IP)</h4>
            <p className="text-xs text-amber-800 leading-relaxed mb-2">
              العنوان المدخل هو IP محلي داخل شبكتك الداخلية. إذا كنت تريد الوصول للراوتر من أي جهاز خارجي أو عبر
              إنترنت Starlink، يمكنك استخدام معالج الربط لتوليد أمر Cloud DDNS أو إعداد IP العام في راوتر المايكروتك.
            </p>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              فتح معالج ربط Starlink / DDNS
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h2 className="text-2xl font-bold mb-1">{settings?.networkName || 'تقرير إحصائيات المتصلين الفعليين'}</h2>
        <p className="text-slate-500">راوتر مايكروتك: {mikrotikConfig.host || ''}</p>
        <p className="text-slate-500 text-sm">تاريخ الطباعة: {new Date().toLocaleString('ar-SA')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
            <Wifi size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">المتصلين حالياً (Live)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-slate-800">{activeNow}</p>
              <span className="text-xs font-semibold text-emerald-600">نشط الآن</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">إجمالي التنزيل (Download)</p>
            <p className="text-2xl font-black text-slate-800" dir="ltr">
              {formatBytes(totalDownload)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">إجمالي الرفع (Upload)</p>
            <p className="text-2xl font-black text-slate-800" dir="ltr">
              {formatBytes(totalUpload)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">الجلسات المعروضة</p>
            <p className="text-2xl font-black text-slate-800">{totalSessionsCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Main Status Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              المتصلين حالياً ({activeNow})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock size={16} />
              الجلسات السابقة المنتهية ({sessions.filter((s) => !s.isActive).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              الكل ({sessions.length})
            </button>
          </div>

          {/* Source Filter (Hotspot vs User Manager) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <span className="px-2 font-semibold">المصدر:</span>
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                sourceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSourceFilter('hotspot')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                sourceFilter === 'hotspot' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الهوتسبوت (Hotspot)
            </button>
            <button
              onClick={() => setSourceFilter('user-manager')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                sourceFilter === 'user-manager'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              يوزر مانجر (User Manager)
            </button>
          </div>
        </div>

        {/* Search Bar & Date Pickers */}
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-600 mb-1">بحث في المتصلين</label>
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="ابحث برقم الكرت / المستخدم، اسم الهاتف، عنوان الـ IP، أو الماك MAC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 text-sm font-medium bg-slate-50 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">من تاريخ</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-3 pr-9 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 text-xs font-medium bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">إلى تاريخ</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-3 pr-9 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 text-xs font-medium bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="py-2 px-3 text-xs text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
              >
                إلغاء التواريخ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider">
                  المستخدم / الكرت
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider">
                  اسم الجهاز (DHCP Host)
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider">
                  عنوان IP & MAC
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider">
                  مدة الاتصال (Uptime)
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-left">
                  التنزيل (Download)
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-left">
                  الرفع (Upload)
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-center">
                  الحالة
                </th>
                <th className="px-6 py-4 font-bold text-xs text-slate-700 uppercase tracking-wider text-center print:hidden">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={28} className="animate-spin text-teal-600" />
                      <p className="font-semibold text-slate-700">جاري الاتصال براوتر مايكروتك وجلب المتصلين الفعليين...</p>
                      <p className="text-xs text-slate-400">يتم فحص جلسات الهوتسبوت وقائمة تأجير DHCP الحية</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Wifi size={28} />
                      </div>
                      <p className="font-bold text-slate-800 text-base">
                        {errorMessage ? 'تعذر جلب بيانات المتصلين' : 'لا يوجد مستخدمون متصلون حالياً على الراوتر'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        {errorMessage
                          ? `السبب: ${errorMessage}`
                          : 'الراوتر متصل بنجاح 🟢، ولكن لا توجد هواتف أو أجهزة مسجلة دخول في هذه اللحظة. بمجرد تسجيل دخول أي كارت سيظهر هنا فوراً مع استهلاكه واسم جهازه.'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => loadSessions(false)}
                          className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw size={14} />
                          إعادة المحاولة الآن
                        </button>
                        <button
                          onClick={() => setIsWizardOpen(true)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Zap size={14} className="text-amber-500" />
                          فحص إعدادات الاتصال
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* User / Card */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="font-mono text-sm">{session.user}</span>
                        {session.source === 'user-manager' && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-sans font-medium">
                            يوزر مانجر
                          </span>
                        )}
                      </div>
                      {session.comment && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{session.comment}</div>
                      )}
                      {session.rateLimit && (
                        <div className="text-[11px] text-teal-600 font-mono mt-0.5">
                          السرعة: {session.rateLimit}
                        </div>
                      )}
                    </td>

                    {/* Host Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        {getDeviceIcon(session.hostName)}
                        <span className="font-medium">
                          {session.hostName || <span className="text-slate-400 text-xs">غير محدد (هاتف/كمبيوتر)</span>}
                        </span>
                      </div>
                      {session.loginBy && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          طريقة الدخول: <span className="font-mono">{session.loginBy}</span>
                        </div>
                      )}
                    </td>

                    {/* IP & MAC */}
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-mono text-xs font-semibold">{session.address}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                        <span>{session.macAddress}</span>
                        <button
                          onClick={() => handleCopyMac(session.macAddress)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                          title="نسخ عنوان الماك"
                        >
                          {copiedMac === session.macAddress ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Uptime / Time */}
                    <td className="px-6 py-4">
                      <div className="text-slate-700 text-xs font-medium flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>{session.uptime}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        دخول: {formatDate(session.loginTime)}
                      </div>
                      {session.sessionTimeLeft && (
                        <div className="text-[11px] text-amber-600 mt-0.5">
                          المتبقي: {session.sessionTimeLeft}
                        </div>
                      )}
                    </td>

                    {/* Download */}
                    <td className="px-6 py-4 font-semibold text-slate-700 text-left text-sm" dir="ltr">
                      {formatBytes(session.downloadBytes)}
                    </td>

                    {/* Upload */}
                    <td className="px-6 py-4 font-semibold text-slate-700 text-left text-sm" dir="ltr">
                      {formatBytes(session.uploadBytes)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      {session.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          متصل الآن
                        </span>
                      ) : (
                        <div className="text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            منتهية
                          </span>
                          {session.terminateCause && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {session.terminateCause}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center print:hidden">
                      {session.isActive ? (
                        <button
                          onClick={() => setUserToKick(session)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="فصل المستخدم من راوتر مايكروتك"
                        >
                          <UserX size={13} />
                          فصل الجلسة
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            يتم عرض <strong>{filteredSessions.length}</strong> من أصل{' '}
            <strong>{sessions.length}</strong> جلسة مسجلة في الراوتر
          </span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>
              إجمالي الاستهلاك:{' '}
              <strong className="text-slate-700" dir="ltr">
                {formatBytes(totalDownload + totalUpload)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Kick Confirmation Modal */}
      {userToKick && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserX size={24} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              فصل المستخدم من راوتر مايكروتك؟
            </h3>

            <p className="text-sm text-slate-600 text-center leading-relaxed mb-4">
              أنت على وشك قطع اتصال الجلسة النشطة للمستخدم{' '}
              <strong className="text-slate-800 font-mono">{userToKick.user}</strong> صاحب عنوان الـ IP{' '}
              <strong className="text-slate-800 font-mono">{userToKick.address}</strong>.
            </p>

            {kickSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold mb-4 text-center">
                {kickSuccessMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserToKick(null)}
                disabled={isKicking}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleKickConfirm}
                disabled={isKicking}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isKicking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري الفصل...
                  </>
                ) : (
                  'نعم، افصل الجلسة الآن'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote MikroTik Wizard Modal */}
      <RemoteMikrotikWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        currentConfig={mikrotikConfig}
        networkName={settings?.networkName || 'شبكتي'}
        onApplyConfig={(newCfg) => {
          setIsWizardOpen(false);
          loadSessions(false);
        }}
      />
    </div>
  );
};
