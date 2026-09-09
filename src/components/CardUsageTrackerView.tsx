import React, { useState, useMemo } from 'react';
import {
  Activity,
  Wifi,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  HardDrive,
  Server,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Radio,
  Settings,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Smartphone,
  Laptop,
  Zap,
  Scale,
  Layers,
  DollarSign,
  Clock,
  Calendar,
  Check,
  Copy,
  Trash2,
  ChevronDown,
  BarChart3,
  Info,
  SlidersHorizontal,
  X,
  ShieldAlert,
} from 'lucide-react';
import {
  NetworkSettings,
  CardCategory,
  SalesRecord,
  CardDailyUsageRecord,
  ISPSettings,
} from '../types';
import { useContinuousCardTracker } from '../hooks/useContinuousCardTracker';
import { formatBytes, formatSpeed } from '../utils/cardUsageTracker';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';

export interface CardUsageTrackerViewProps {
  settings?: NetworkSettings;
  categories?: CardCategory[];
  sales?: SalesRecord[];
  activeNetworkId?: string;
  onUpdateSettings?: (newSettings: NetworkSettings) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CardUsageTrackerView: React.FC<CardUsageTrackerViewProps> = ({
  settings,
  categories = [],
  sales = [],
  activeNetworkId = 'system',
  onUpdateSettings,
  onClose,
  isModal = false,
}) => {
  const {
    isPollingActive,
    intervalSeconds,
    countdown,
    isFetching,
    lastPolledAt,
    errorMessage,
    pollCount,
    selectedDate,
    setSelectedDate,
    activeNowCount,
    todayClientDownloadBytes,
    todayClientUploadBytes,
    todayClientTotalBytes,
    dateRecords,
    allLedgerRecords,
    currentISPSummary,
    interfaces,
    wanTraffic,
    ispSettings,
    pollNow,
    togglePolling,
    setIntervalSeconds,
    clearDayLogs,
    exportCsv,
  } = useContinuousCardTracker({
    settings,
    categories,
    sales,
    activeNetworkId,
    onUpdateSettings,
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'ledger' | 'hourly' | 'history'>('ledger');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'total' | 'download' | 'uptime' | 'newest'>('total');

  // Modals & Popovers
  const [isISPSettingsOpen, setIsISPSettingsOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Local state for editing ISP Settings form
  const [ispForm, setIspForm] = useState<ISPSettings>({ ...ispSettings });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSaveISPSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        ispSettings: { ...ispForm },
      });
    }
    setIsISPSettingsOpen(false);
  };

  // Filtered card records
  const filteredRecords = useMemo(() => {
    return dateRecords.filter((record) => {
      // Status filter
      if (statusFilter === 'active' && !record.isActive) return false;
      if (statusFilter === 'inactive' && record.isActive) return false;

      // Category filter
      if (categoryFilter !== 'all' && record.categoryId !== categoryFilter && record.categoryName !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesUser = record.cardUsername.toLowerCase().includes(query);
        const matchesIp = record.ipAddress.includes(query);
        const matchesMac = record.macAddress.toLowerCase().includes(query);
        const matchesHost = (record.hostName || '').toLowerCase().includes(query);
        const matchesCat = (record.categoryName || '').toLowerCase().includes(query);
        const matchesComment = (record.comment || '').toLowerCase().includes(query);
        if (!matchesUser && !matchesIp && !matchesMac && !matchesHost && !matchesCat && !matchesComment) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'download') return (b.downloadBytes || 0) - (a.downloadBytes || 0);
      if (sortBy === 'uptime') return (b.sessionCount || 1) - (a.sessionCount || 1);
      if (sortBy === 'newest') return new Date(b.lastSeenTime).getTime() - new Date(a.lastSeenTime).getTime();
      return (b.totalBytes || 0) - (a.totalBytes || 0);
    });
  }, [dateRecords, statusFilter, categoryFilter, searchTerm, sortBy]);

  // Hourly breakdown calculation
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      clientTotal: 0,
      clientDownload: 0,
      clientUpload: 0,
    }));

    for (const record of dateRecords) {
      const d = new Date(record.firstSeenTime);
      const h = d.getHours();
      if (h >= 0 && h < 24) {
        hours[h].clientTotal += record.totalBytes;
        hours[h].clientDownload += record.downloadBytes;
        hours[h].clientUpload += record.uploadBytes;
      }
    }

    const maxVal = Math.max(...hours.map((h) => h.clientTotal), 1024 * 1024);
    let peakHour = hours[0];
    for (const h of hours) {
      if (h.clientTotal > peakHour.clientTotal) {
        peakHour = h;
      }
    }

    return { hours, maxVal, peakHour };
  }, [dateRecords]);

  // Available dates in historical logs
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    const today = new Date().toISOString().split('T')[0];
    set.add(today);
    for (const r of allLedgerRecords) {
      if (r.date) set.add(r.date);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allLedgerRecords]);

  // Export handlers
  const handleExportPdf = async (format: 'a4' | 'pos-80mm') => {
    setIsExportMenuOpen(false);
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('card-usage-tracker-container', {
        filename: `تقرير_استهلاك_الكروت_ومطابقة_المزود_${selectedDate}_${format}.pdf`,
        title: `تقرير مطابقة استهلاك الكروت مع مزود الخدمة - ${selectedDate}`,
        paperFormat: format,
        scale: 2,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    setIsExportMenuOpen(false);
    await printElementDocument('card-usage-tracker-container', {
      title: `تقرير استهلاك الكروت ومطابقة مزود الخدمة (${selectedDate})`,
    });
  };

  return (
    <div
      id="card-usage-tracker-container"
      className={`space-y-6 animate-fade-in ${
        isModal
          ? 'bg-white rounded-3xl max-w-7xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200'
          : ''
      }`}
    >
      {/* Top Header & Continuous Query Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800/80 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Polling Pulse Status */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Activity className="text-white w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>الاستعلام المستمر وتتبع استهلاك الكروت</span>
                  <span className="text-teal-400 font-normal text-sm sm:text-base">| مطابقة المزود</span>
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                  تسجيل حي ومستمر لكمية التحميل والرفع لكافة الكروت المستخدمة ومقارنتها مع سحب منفذ مزود الخدمة (ISP)
                </p>
              </div>
            </div>

            {/* Heartbeat Status Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold border ${
                  isPollingActive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPollingActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {isPollingActive ? 'الاستعلام المستمر نشط ويسجل لحظياً' : 'الاستعلام المستمر متوقف مؤقتاً'}
              </span>

              {isPollingActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-mono">
                  <Clock size={12} className="text-teal-400" />
                  <span>التحديث القادم بعد: </span>
                  <strong className="text-teal-300">{countdown} ثانية</strong>
                </span>
              )}

              {lastPolledAt && (
                <span className="text-slate-400">
                  آخر فحص للراوتر:{' '}
                  <span className="text-slate-200 font-mono">
                    {lastPolledAt.toLocaleTimeString('ar-SA')}
                  </span>
                </span>
              )}

              <span className="text-slate-500">•</span>
              <span className="text-slate-400">
                الدورات المنجزة: <span className="text-slate-200 font-mono">{pollCount}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {/* Interval Selector */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-2xl p-1 text-xs text-slate-300">
              <span className="px-2 font-medium flex items-center gap-1 text-slate-400">
                <Radio size={12} className="text-teal-400" />
                التردد:
              </span>
              {[15, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setIntervalSeconds(sec)}
                  className={`px-2 py-1 rounded-xl font-medium transition-all ${
                    intervalSeconds === sec
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}ث
                </button>
              ))}
            </div>

            {/* Instant Query Button */}
            <button
              onClick={() => pollNow()}
              disabled={isFetching}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl transition-all shadow-md shadow-teal-900/30 flex items-center gap-2 text-xs sm:text-sm font-bold disabled:opacity-50"
              title="جلب أحدث قراءات العدادات وجلسات الكروت من الراوتر فوراً"
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
              <span>{isFetching ? 'جارِ الاستعلام...' : 'استعلام فوري'}</span>
            </button>

            {/* Toggle Polling Button */}
            <button
              onClick={() => togglePolling()}
              className={`px-3.5 py-2.5 border rounded-2xl transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                isPollingActive
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
            >
              {isPollingActive ? 'إيقاف مؤقت' : 'تشغيل الاستعلام'}
            </button>

            {/* ISP Settings Button */}
            <button
              onClick={() => {
                setIspForm({ ...ispSettings });
                setIsISPSettingsOpen(true);
              }}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-2xl transition-all text-xs sm:text-sm font-semibold flex items-center gap-1.5"
              title="تعديل باقة مزود الخدمة، سعة الجيجات، والمنفذ"
            >
              <Settings size={15} className="text-teal-400" />
              <span>إعدادات المزود</span>
            </button>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-2xl transition-all text-xs sm:text-sm font-semibold flex items-center gap-1.5"
              >
                <Download size={15} />
                <span>تصدير</span>
                <ChevronDown size={14} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 text-right">
                  <button
                    onClick={() => handleExportPdf('a4')}
                    className="w-full px-4 py-3 text-xs hover:bg-slate-800 border-b border-slate-800/80 flex items-center justify-between text-slate-200"
                  >
                    <span>تقرير مطابقة A4 (PDF)</span>
                    <Download size={14} className="text-teal-400" />
                  </button>
                  <button
                    onClick={() => handleExportPdf('pos-80mm')}
                    className="w-full px-4 py-3 text-xs hover:bg-slate-800 border-b border-slate-800/80 flex items-center justify-between text-slate-200"
                  >
                    <span>تقرير حراري 80mm</span>
                    <Download size={14} className="text-indigo-400" />
                  </button>
                  <button
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      exportCsv();
                    }}
                    className="w-full px-4 py-3 text-xs hover:bg-slate-800 border-b border-slate-800/80 flex items-center justify-between text-emerald-400"
                  >
                    <span>تصدير إكسل (Excel / CSV)</span>
                    <HardDrive size={14} />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full px-4 py-3 text-xs hover:bg-slate-800 flex items-center justify-between text-teal-300"
                  >
                    <span>طباعة فورية</span>
                    <Printer size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Close Button if opened in modal */}
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Date Switcher Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-teal-400" />
            <span className="text-slate-300 font-medium">سجل يوم:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1 text-xs focus:ring-1 focus:ring-teal-500 font-mono"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === new Date().toISOString().split('T')[0] ? '(اليوم)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              كروت مسجلة في هذا اليوم: <strong className="text-teal-300">{dateRecords.length} كارت</strong>
            </span>
            {dateRecords.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`هل أنت متأكد من مسح وتصفير سجل كروت يوم (${selectedDate})؟`)) {
                    clearDayLogs(selectedDate);
                  }
                }}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline text-xs"
              >
                <Trash2 size={12} />
                تصفير سجل اليوم
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => pollNow()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Analytical KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Client Cards Consumption */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <UsersIcon className="text-teal-600" />
                استهلاك كروت العملاء
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold">
                {dateRecords.length} كارت مسجل
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight" dir="ltr">
              {formatBytes(todayClientTotalBytes)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/70 p-1.5 rounded-xl">
              <ArrowDownCircle size={14} className="shrink-0" />
              <div>
                <div className="text-[10px] text-blue-500 font-semibold">تحميل (Download)</div>
                <div className="font-bold font-mono" dir="ltr">{formatBytes(todayClientDownloadBytes)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-teal-700 bg-teal-50/70 p-1.5 rounded-xl">
              <ArrowUpCircle size={14} className="shrink-0" />
              <div>
                <div className="text-[10px] text-teal-500 font-semibold">رفع (Upload)</div>
                <div className="font-bold font-mono" dir="ltr">{formatBytes(todayClientUploadBytes)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: ISP WAN Interface Traffic */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <Server className="text-indigo-600" />
                سحب منفذ مزود الخدمة (WAN)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-mono font-bold">
                {wanTraffic?.interfaceName || ispSettings.wanInterface}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight" dir="ltr">
              {formatBytes(currentISPSummary.ispWanTotalBytes)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/70 p-1.5 rounded-xl">
              <ArrowDownCircle size={14} className="shrink-0" />
              <div>
                <div className="text-[10px] text-indigo-500 font-semibold">سحب من المزود</div>
                <div className="font-bold font-mono" dir="ltr">{formatBytes(currentISPSummary.ispWanDownloadBytes)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50/70 p-1.5 rounded-xl">
              <Zap size={14} className="shrink-0" />
              <div>
                <div className="text-[10px] text-purple-500 font-semibold">سرعة السحب اللحظي</div>
                <div className="font-bold font-mono" dir="ltr">
                  {wanTraffic?.rxRateBps ? formatSpeed(wanTraffic.rxRateBps) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Variance & Overhead (الفارق والهدر) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <Scale className="text-purple-600" />
                التباين والهدر الفني
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  currentISPSummary.varianceStatus === 'optimal'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : currentISPSummary.varianceStatus === 'moderate'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                }`}
              >
                {currentISPSummary.varianceStatus === 'optimal'
                  ? 'طبيعي وممتاز'
                  : currentISPSummary.varianceStatus === 'moderate'
                  ? 'متوسط'
                  : 'اشتباه تسريب!'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 tracking-tight" dir="ltr">
                {formatBytes(currentISPSummary.varianceBytes)}
              </span>
              <span className="text-sm font-bold text-slate-500 font-mono">
                ({currentISPSummary.variancePercentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">ترويسات الحزم والشبكة</span>
            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] flex items-center gap-1 hover:underline"
            >
              <Info size={13} />
              تفاصيل التشخيص
            </button>
          </div>
        </div>

        {/* Card 4: ISP Monthly Quota & Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <HardDrive className="text-teal-600" />
                رصيد باقة مزود الخدمة
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono">
                {ispSettings.monthlyQuotaGB} GB
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-800 tracking-tight" dir="ltr">
                {currentISPSummary.quotaRemainingGB?.toFixed(1)} GB
              </span>
              <span className="text-xs text-slate-500 font-semibold">متبقي في الباقة</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      5,
                      ((currentISPSummary.ispWanTotalBytes /
                        ((ispSettings.monthlyQuotaGB || 500) * 1024 * 1024 * 1024)) *
                        100) || 0
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>المزود: {ispSettings.providerName}</span>
              <span>تجديد يوم {ispSettings.billingCycleStartDay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Bandwidth Reconciliation Progress Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Scale size={16} className="text-indigo-600" />
              ميزان المطابقة البصري: سحب كروت العملاء مقابل سحب المزود
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              توزيع حركة البيانات المسجلة عبر الراوتر لمعرفة أين تذهب كل بايت من إنترنت الشبكة
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              تحميل العملاء ({formatBytes(todayClientDownloadBytes)})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              رفع العملاء ({formatBytes(todayClientUploadBytes)})
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              هدر وترويسات ({formatBytes(currentISPSummary.varianceBytes)})
            </span>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        {(() => {
          const wanTotal = Math.max(currentISPSummary.ispWanTotalBytes, todayClientTotalBytes, 1);
          const dlPct = Math.min(100, (todayClientDownloadBytes / wanTotal) * 100);
          const ulPct = Math.min(100 - dlPct, (todayClientUploadBytes / wanTotal) * 100);
          const varPct = Math.max(0, 100 - dlPct - ulPct);

          return (
            <div className="w-full bg-slate-100 rounded-2xl h-4 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${dlPct}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`تحميل كروت العملاء: ${formatBytes(todayClientDownloadBytes)} (${dlPct.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${ulPct}%` }}
                className="bg-teal-500 h-full transition-all"
                title={`رفع كروت العملاء: ${formatBytes(todayClientUploadBytes)} (${ulPct.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${varPct}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`الفارق والهدر الطبيعي: ${formatBytes(currentISPSummary.varianceBytes)} (${varPct.toFixed(1)}%)`}
              />
            </div>
          );
        })()}
      </div>

      {/* Tabs Navigation: Ledger / Hourly / History */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Layers size={16} />
            <span>سجل كروت اليوم المفصل</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeTab === 'ledger' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hourly')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'hourly'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <BarChart3 size={16} />
            <span>ساعات الذروة (24 ساعة)</span>
          </button>
        </div>

        {/* Table Filters (Shown when activeTab is ledger) */}
        {activeTab === 'ledger' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث برقم الكرت، IP، MAC، جهاز..."
                className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">كل الحالات ({dateRecords.length})</option>
              <option value="active">متصل الآن ({activeNowCount})</option>
              <option value="inactive">منقطع ({dateRecords.length - activeNowCount})</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">كافة الفئات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="total">الأكثر استهلاكاً (إجمالي)</option>
              <option value="download">الأعلى تحميلاً</option>
              <option value="uptime">أكثر عدد جلسات</option>
              <option value="newest">الأحدث نشاطاً</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: DETAILED CARDS USAGE LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Wifi size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">لا توجد بيانات كروت مسجلة في هذا اليوم بعد</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                بمجرد تسجيل دخول العملاء إلى راوتر المايكروتك، ستقوم المنظومة آلياً بتسجيل كروت المشتركين وكمية التحميل
                والرفع وحفظها بشكل دائم حتى بعد تسجيل خروجهم.
              </p>
              <button
                onClick={() => pollNow()}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw size={14} />
                فحص الراوتر الآن
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">اسم الكرت / المشترك</th>
                    <th className="py-3 px-4 font-bold">الفئة والقيمة</th>
                    <th className="py-3 px-4 font-bold">الجهاز وعنوان IP</th>
                    <th className="py-3 px-4 font-bold">التحميل (Download)</th>
                    <th className="py-3 px-4 font-bold">الرفع (Upload)</th>
                    <th className="py-3 px-4 font-bold">إجمالي الاستهلاك</th>
                    <th className="py-3 px-4 font-bold">نسبة الباقة</th>
                    <th className="py-3 px-4 font-bold">أول / آخر ظهور</th>
                    <th className="py-3 px-4 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record, index) => {
                    const quotaBytes = record.cardQuotaBytes || 1024 * 1024 * 1024;
                    const consumedPct = Math.min(100, Math.round((record.totalBytes / quotaBytes) * 100));

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                record.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                              }`}
                              title={record.isActive ? 'متصل الآن' : 'منقطع حالياً'}
                            />
                            <div>
                              <div className="font-bold text-slate-800 font-mono text-sm">{record.cardUsername}</div>
                              {record.comment && (
                                <div className="text-[10px] text-slate-400 max-w-[140px] truncate">
                                  {record.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">
                            {record.categoryName || 'فئة قياسية'}
                          </div>
                          {record.categoryPrice ? (
                            <div className="text-[10px] text-emerald-600 font-mono">
                              {record.categoryPrice} ريال
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            {record.hostName?.toLowerCase().includes('win') ||
                            record.hostName?.toLowerCase().includes('mac') ? (
                              <Laptop size={13} className="text-blue-500" />
                            ) : (
                              <Smartphone size={13} className="text-emerald-500" />
                            )}
                            <span className="truncate max-w-[120px]">{record.hostName || 'هاتف ذكي'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{record.ipAddress}</span>
                            <button
                              onClick={() => handleCopy(record.macAddress)}
                              className="text-slate-400 hover:text-slate-600"
                              title="نسخ عنوان MAC"
                            >
                              {copiedText === record.macAddress ? (
                                <Check size={10} className="text-emerald-500" />
                              ) : (
                                <Copy size={10} />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-blue-700 font-semibold" dir="ltr">
                          {formatBytes(record.downloadBytes)}
                        </td>

                        <td className="py-3 px-4 font-mono text-teal-700 font-semibold" dir="ltr">
                          {formatBytes(record.uploadBytes)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 font-mono" dir="ltr">
                            {formatBytes(record.totalBytes)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-0.5">
                              <span>{consumedPct}%</span>
                              <span dir="ltr">{formatBytes(quotaBytes)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  consumedPct >= 95
                                    ? 'bg-rose-500'
                                    : consumedPct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-teal-500'
                                }`}
                                style={{ width: `${consumedPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                          <div>
                            دخول: {new Date(record.firstSeenTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            آخر نشاط: {new Date(record.lastSeenTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              record.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {record.isActive ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                متصل الآن
                              </>
                            ) : (
                              'منقطع'
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOURLY PEAK DISTRIBUTION (24 HOURS) */}
      {activeTab === 'hourly' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="text-teal-600" />
                ساعات الذروة وتوزيع سحب البيانات على مدار 24 ساعة
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                توزيع استهلاك الكروت خلال ساعات اليوم لكشف أوقات الضغط على راوتر المايكروتك ومزود الخدمة
              </p>
            </div>

            <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl text-xs text-teal-800 flex items-center gap-2">
              <Zap size={14} className="text-teal-600" />
              <span>ساعة الذروة القصوى:</span>
              <strong className="font-mono text-teal-900">{hourlyData.peakHour.label}</strong>
              <span className="text-[11px] font-mono" dir="ltr">
                ({formatBytes(hourlyData.peakHour.clientTotal)})
              </span>
            </div>
          </div>

          {/* 24-Hour Bar Chart */}
          <div className="h-60 flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-2 overflow-x-auto">
            {hourlyData.hours.map((item) => {
              const heightPct = Math.max(4, Math.round((item.clientTotal / hourlyData.maxVal) * 100));
              const isPeak = item.hour === hourlyData.peakHour.hour && item.clientTotal > 0;

              return (
                <div
                  key={item.hour}
                  className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg z-30 whitespace-nowrap shadow-xl pointer-events-none">
                    <div className="font-bold">{item.label}</div>
                    <div dir="ltr">{formatBytes(item.clientTotal)}</div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-t-lg flex flex-col justify-end h-44 overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isPeak
                          ? 'bg-gradient-to-t from-teal-600 to-emerald-400 shadow-md shadow-teal-500/20'
                          : 'bg-gradient-to-t from-indigo-500 to-teal-400 hover:from-indigo-600 hover:to-teal-500'
                      }`}
                    />
                  </div>

                  <span
                    className={`text-[10px] font-mono ${
                      isPeak ? 'font-bold text-teal-600' : 'text-slate-400'
                    }`}
                  >
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ISP Settings Modal */}
      {isISPSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="text-teal-400" size={18} />
                <h3 className="font-bold text-base">إعدادات مزود الخدمة (ISP)</h3>
              </div>
              <button
                onClick={() => setIsISPSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveISPSettings} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم مزود الخدمة</label>
                <input
                  type="text"
                  value={ispForm.providerName}
                  onChange={(e) => setIspForm({ ...ispForm, providerName: e.target.value })}
                  placeholder="e.g. يمن نت / Starlink / فايبر"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">منفذ مزود الخدمة في المايكروتك (WAN)</label>
                <input
                  type="text"
                  value={ispForm.wanInterface}
                  onChange={(e) => setIspForm({ ...ispForm, wanInterface: e.target.value })}
                  placeholder="e.g. ether1 أو ether1-WAN"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  الواجهات المتاحة حالياً بالراوتر:{' '}
                  {interfaces.map((i) => i.name).join(', ') || 'ether1, ether2'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حجم الباقة الشهرية (GB)</label>
                  <input
                    type="number"
                    min="1"
                    value={ispForm.monthlyQuotaGB}
                    onChange={(e) => setIspForm({ ...ispForm, monthlyQuotaGB: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تكلفة الباقة الشهرية (ريال)</label>
                  <input
                    type="number"
                    min="0"
                    value={ispForm.monthlyCost}
                    onChange={(e) => setIspForm({ ...ispForm, monthlyCost: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">يوم التجديد الشهري (1 - 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={ispForm.billingCycleStartDay}
                    onChange={(e) => setIspForm({ ...ispForm, billingCycleStartDay: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نسبة الهدر الطبيعي المتوقعة (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={ispForm.expectedOverheadPercent ?? 12}
                    onChange={(e) => setIspForm({ ...ispForm, expectedOverheadPercent: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsISPSettingsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostics Modal: Explaining Variance & Overhead */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="text-purple-300" size={18} />
                <h3 className="font-bold text-base">التقرير الهندسي لتحليل التباين بين المزود والكروت</h3>
              </div>
              <button
                onClick={() => setIsDiagnosticsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">لماذا يسحب منفذ المزود (WAN) أكثر من استهلاك الكروت؟</div>
                <p>
                  من الناحية الهندسية والبروتوكولية، الفرق بين قراءة منفذ الإنترنت (WAN) ومجموع عدادات كروت الهوتسبوت
                  أمر حتمي وطبيعي يرجع إلى العوامل التالية:
                </p>
              </div>

              <ul className="space-y-2 pr-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-800">ترويسات الحزم (Packet Headers & TCP/IP Overhead):</strong> كل
                  حزمة بيانات تحتوي على 40 إلى 60 بايت إضافية لعنوان المصدر والوجهة والتشفير لا يتم احتسابها على رصيد
                  الكرت (تشكل 5% - 10%).
                </li>
                <li>
                  <strong className="text-slate-800">طلبات DNS وحركة النظام:</strong> استعلامات أسماء النطاقات وفحص
                  تحديثات نظام المايكروتك ومزامنة الوقت NTP.
                </li>
                <li>
                  <strong className="text-slate-800">الأجهزة المعفاة (Bypassed Hosts):</strong> أي كاميرات مراقبة أو
                  سيرفرات أو أجهزة مضافة في IP Bindings تعمل بدون كروت تسحب مباشرة من المزود.
                </li>
                <li>
                  <strong className="text-slate-800">حزم البث والقطع المفاجئ (Retransmissions):</strong> إعادة إرسال
                  الحزم المفقودة في الشبكة اللاسلكية.
                </li>
              </ul>

              <div
                className={`p-3 rounded-2xl border ${
                  currentISPSummary.varianceStatus === 'optimal'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <strong>التقييم الحالي لشبكتك: </strong>
                {currentISPSummary.varianceStatus === 'optimal' ? (
                  <span>
                    النسبة الحالية ({currentISPSummary.variancePercentage.toFixed(1)}%) ممتازة وضمن المعايير العالمية
                    (أقل من {ispSettings.expectedOverheadPercent}%). شبكتك خالية من التسريب.
                  </span>
                ) : (
                  <span>
                    النسبة الحالية ({currentISPSummary.variancePercentage.toFixed(1)}%) أعلى من المتوقع. يرجى فحص قائمة
                    Bypassed Hosts والتأكد من عدم وجود أجهزة تسحب إنترنت بدون تسجيل دخول.
                  </span>
                )}
              </div>

              <div className="text-right">
                <button
                  onClick={() => setIsDiagnosticsOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold"
                >
                  فهمت ذلك
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
