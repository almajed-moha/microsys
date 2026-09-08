import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Scale,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Layers,
  Activity,
  Printer,
  Download,
  Zap,
  ShieldAlert,
  Info,
  DollarSign,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  BarChart3,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  MikrotikCallerSession,
  CardCategory,
  SalesRecord,
  InvoiceRecord,
  POSPoint,
  NetworkSettings,
  RouterInterface,
  MikroTikConfig,
} from '../types';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';
import { fetchRouterInterfaces } from '../utils/mikrotikApi';

export interface MikrotikSalesComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: MikrotikCallerSession[];
  categories?: CardCategory[];
  sales?: SalesRecord[];
  invoices?: InvoiceRecord[];
  posPoints?: POSPoint[];
  settings?: NetworkSettings;
  routerIdentity?: string;
}

// Utility: parse quota string ("1G", "500M", "2.5G", etc.) to bytes
export function parseQuotaToBytes(quota?: string, fallbackName?: string): number {
  if (!quota || quota.toLowerCase() === 'unlimited') {
    if (fallbackName) {
      const match = fallbackName.match(/(\d+(?:\.\d+)?)\s*(G|GB|M|MB|جيجا|ميجا)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit.startsWith('G') || unit.includes('جيجا')) return val * 1024 * 1024 * 1024;
        if (unit.startsWith('M') || unit.includes('ميجا')) return val * 1024 * 1024;
      }
    }
    return 1024 * 1024 * 1024; // 1 GB fallback
  }

  const clean = quota.trim().toUpperCase();
  if (clean === 'UNLIMITED' || clean === 'مفتوح' || clean === '0') return 0;

  if (clean.endsWith('GB') || clean.endsWith('G')) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val * 1024 * 1024 * 1024;
  }
  if (clean.endsWith('MB') || clean.endsWith('M')) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val * 1024 * 1024;
  }
  if (clean.endsWith('KB') || clean.endsWith('K')) {
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val * 1024;
  }

  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return num > 50 ? num * 1024 * 1024 : num * 1024 * 1024 * 1024;
  }
  return 1024 * 1024 * 1024;
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i] || 'B'}`;
};

const bytesToGB = (bytes: number) => {
  return parseFloat((bytes / (1024 * 1024 * 1024)).toFixed(2));
};

const formatDayArabic = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ar-SA', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
  });
};

export const MikrotikSalesComparisonModal: React.FC<MikrotikSalesComparisonModalProps> = ({
  isOpen,
  onClose,
  sessions,
  categories = [],
  sales = [],
  invoices = [],
  posPoints = [],
  settings,
  routerIdentity = 'MikroTik Router',
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'daily_table' | 'categories_breakdown' | 'diagnostics' | 'wan_three_way'>('daily_table');
  const [isExporting, setIsExporting] = useState(false);

  // Interfaces for WAN 3-way check
  const [interfaces, setInterfaces] = useState<RouterInterface[]>([]);
  const [isLoadingInterfaces, setIsLoadingInterfaces] = useState(false);
  const [selectedWanInterface, setSelectedWanInterface] = useState<string>('');

  const currency = settings?.currencySymbol || 'ريال';

  // Load router interfaces if user opens WAN tab
  useEffect(() => {
    if (!isOpen) return;
    const mikrotikConfig: Partial<MikroTikConfig> = settings?.mikrotikConfig || {
      host: '192.168.88.1',
      port: 8728,
      username: 'admin',
      password: '',
      protocol: 'auto',
    };

    setIsLoadingInterfaces(true);
    fetchRouterInterfaces(mikrotikConfig)
      .then((data) => {
        setInterfaces(data || []);
        if (data && data.length > 0) {
          // Auto-select likely WAN interface (ether1, sfp1, starlink, pppoe, wan)
          const likelyWan = data.find((iface) => {
            const n = iface.name.toLowerCase();
            return n.includes('wan') || n.includes('ether1') || n.includes('starlink') || n.includes('internet');
          });
          setSelectedWanInterface(likelyWan ? likelyWan.name : data[0].name);
        }
      })
      .catch((e) => console.warn('Interfaces fetch warning:', e))
      .finally(() => setIsLoadingInterfaces(false));
  }, [isOpen, settings]);

  // Determine active date range strings
  const activeDateRange = useMemo(() => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    if (dateFilterMode === 'today') {
      return [todayISO];
    }
    if (dateFilterMode === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return [y.toISOString().split('T')[0]];
    }
    if (dateFilterMode === 'custom') {
      return [customDate];
    }
    if (dateFilterMode === 'week') {
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }
    if (dateFilterMode === 'month') {
      const dates: string[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }
    return [todayISO];
  }, [dateFilterMode, customDate]);

  // Unified Sales List matching POS filter
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (selectedPosFilter !== 'all' && s.posPointId !== selectedPosFilter) {
        return false;
      }
      return true;
    });
  }, [sales, selectedPosFilter]);

  // Aggregate stats per day for the last 14 days (or active range)
  const dailyComparisonData = useMemo(() => {
    // Generate dates: 14 days list to give comprehensive historical analytics
    const dateList: string[] = [];
    const today = new Date();
    const daysToScan = dateFilterMode === 'month' ? 30 : 14;

    for (let i = 0; i < daysToScan; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    return dateList.map((day) => {
      // 1. MikroTik Sessions on this day
      const daySessions = sessions.filter((s) => {
        if (!s.loginTime) return false;
        return s.loginTime.split('T')[0] === day;
      });

      const routerDownload = daySessions.reduce((sum, s) => sum + (s.downloadBytes || 0), 0);
      const routerUpload = daySessions.reduce((sum, s) => sum + (s.uploadBytes || 0), 0);
      const routerTotal = routerDownload + routerUpload;
      const routerTotalGb = bytesToGB(routerTotal);
      const activeSessionsCount = daySessions.length;

      // 2. Sales records on this day
      const daySales = filteredSales.filter((s) => s.date === day);
      let cardsCount = 0;
      let soldQuotaBytes = 0;
      let revenue = 0;

      for (const s of daySales) {
        const cat = categories.find((c) => c.id === s.categoryId || c.name === s.categoryId);
        const quotaBytes = parseQuotaToBytes(cat?.quotaLimit, cat?.name);
        cardsCount += s.quantity || 0;
        soldQuotaBytes += (s.quantity || 0) * quotaBytes;
        revenue += s.totalRetailAmount || (s.quantity || 0) * (cat?.retailPrice || 0);
      }

      // If no sales in sales array, fallback check invoices for this day
      if (cardsCount === 0) {
        const dayInvoices = invoices.filter((inv) => inv.date === day);
        for (const inv of dayInvoices) {
          if (selectedPosFilter !== 'all' && inv.posPointId !== selectedPosFilter) continue;
          for (const item of inv.items || []) {
            const cat = categories.find((c) => c.id === item.categoryId || c.name === item.categoryName);
            const quotaBytes = parseQuotaToBytes(cat?.quotaLimit, cat?.name || item.categoryName);
            cardsCount += item.quantity || 0;
            soldQuotaBytes += (item.quantity || 0) * quotaBytes;
            revenue += item.totalPrice || 0;
          }
        }
      }

      const soldQuotaGb = bytesToGB(soldQuotaBytes);

      // 3. Difference & Discrepancy
      const diffBytes = routerTotal - soldQuotaBytes;
      const diffGb = bytesToGB(diffBytes);

      // Loss percentage relative to router total
      let lossPercentage = 0;
      if (routerTotal > 0) {
        lossPercentage = parseFloat(((diffBytes / routerTotal) * 100).toFixed(1));
      } else if (soldQuotaBytes > 0) {
        lossPercentage = -100; // 100% saved / unused quota
      }

      // Average revenue per GB for financial loss estimation
      const avgPricePerGb = soldQuotaGb > 0 ? revenue / soldQuotaGb : 250;
      const estimatedFinancialLoss = diffGb > 0 ? Math.round(diffGb * avgPricePerGb) : 0;

      // Status diagnosis
      let status: 'leakage' | 'balanced' | 'surplus' = 'balanced';
      let statusLabel = 'متوازن ومطابق';

      if (diffGb > 1.5 && lossPercentage > 15) {
        status = 'leakage';
        statusLabel = `تسريب وفاقد استهلاك (${diffGb} GB)`;
      } else if (diffGb < -1.5) {
        status = 'surplus';
        statusLabel = `رصيد باقات فائض ومتبقي (${Math.abs(diffGb)} GB)`;
      } else {
        status = 'balanced';
        statusLabel = 'تطابق طبيعي (ضمن النطاق)';
      }

      return {
        date: day,
        dayName: formatDayArabic(day),
        routerDownload,
        routerUpload,
        routerTotal,
        routerTotalGb,
        activeSessionsCount,
        cardsCount,
        soldQuotaBytes,
        soldQuotaGb,
        revenue,
        diffBytes,
        diffGb,
        lossPercentage,
        estimatedFinancialLoss,
        status,
        statusLabel,
      };
    });
  }, [sessions, filteredSales, invoices, categories, selectedPosFilter, dateFilterMode]);

  // Aggregate KPI summary for the selected period
  const periodSummary = useMemo(() => {
    const selectedDaysData = dailyComparisonData.filter((d) => activeDateRange.includes(d.date));

    const totalRouterBytes = selectedDaysData.reduce((sum, d) => sum + d.routerTotal, 0);
    const totalRouterDownload = selectedDaysData.reduce((sum, d) => sum + d.routerDownload, 0);
    const totalRouterUpload = selectedDaysData.reduce((sum, d) => sum + d.routerUpload, 0);
    const totalCardsSold = selectedDaysData.reduce((sum, d) => sum + d.cardsCount, 0);
    const totalSoldQuotaBytes = selectedDaysData.reduce((sum, d) => sum + d.soldQuotaBytes, 0);
    const totalRevenue = selectedDaysData.reduce((sum, d) => sum + d.revenue, 0);

    const totalRouterGb = bytesToGB(totalRouterBytes);
    const totalSoldQuotaGb = bytesToGB(totalSoldQuotaBytes);
    const diffBytes = totalRouterBytes - totalSoldQuotaBytes;
    const diffGb = bytesToGB(diffBytes);

    let lossPercentage = 0;
    if (totalRouterBytes > 0) {
      lossPercentage = parseFloat(((diffBytes / totalRouterBytes) * 100).toFixed(1));
    }

    const avgPricePerGb = totalSoldQuotaGb > 0 ? totalRevenue / totalSoldQuotaGb : 250;
    const estimatedFinancialLoss = diffGb > 0 ? Math.round(diffGb * avgPricePerGb) : 0;

    return {
      totalRouterBytes,
      totalRouterDownload,
      totalRouterUpload,
      totalRouterGb,
      totalCardsSold,
      totalSoldQuotaBytes,
      totalSoldQuotaGb,
      totalRevenue,
      diffBytes,
      diffGb,
      lossPercentage,
      estimatedFinancialLoss,
      daysCount: selectedDaysData.length,
      isLeakage: diffGb > 1.0,
      isSurplus: diffGb < -1.0,
    };
  }, [dailyComparisonData, activeDateRange]);

  // Breakdown by Category for the selected period
  const categoryBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        quotaLimit: string;
        quotaPerCardGb: number;
        cardsSold: number;
        totalGbSold: number;
        revenue: number;
        colorTheme: string;
      }
    >();

    // Scan sales in active range
    for (const s of filteredSales) {
      if (!activeDateRange.includes(s.date)) continue;
      const cat = categories.find((c) => c.id === s.categoryId || c.name === s.categoryId);
      const catId = cat ? cat.id : s.categoryId || 'unknown';
      const catName = cat ? cat.name : `فئة ${s.categoryId}`;
      const quotaLimit = cat?.quotaLimit || '1G';
      const quotaBytes = parseQuotaToBytes(quotaLimit, catName);
      const quotaPerCardGb = bytesToGB(quotaBytes);
      const q = s.quantity || 0;
      const rev = s.totalRetailAmount || q * (cat?.retailPrice || 0);

      const existing = map.get(catId);
      if (existing) {
        existing.cardsSold += q;
        existing.totalGbSold += bytesToGB(q * quotaBytes);
        existing.revenue += rev;
      } else {
        map.set(catId, {
          categoryId: catId,
          categoryName: catName,
          quotaLimit,
          quotaPerCardGb,
          cardsSold: q,
          totalGbSold: bytesToGB(q * quotaBytes),
          revenue: rev,
          colorTheme: cat?.colorTheme || 'blue',
        });
      }
    }

    const list = Array.from(map.values());
    const grandGb = list.reduce((sum, item) => sum + item.totalGbSold, 0);

    return list
      .map((item) => ({
        ...item,
        percentageOfTotal: grandGb > 0 ? parseFloat(((item.totalGbSold / grandGb) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalGbSold - a.totalGbSold);
  }, [filteredSales, activeDateRange, categories]);

  // Selected WAN Interface details
  const wanInterfaceData = useMemo(() => {
    if (!selectedWanInterface || interfaces.length === 0) return null;
    const iface = interfaces.find((i) => i.name === selectedWanInterface);
    if (!iface) return null;
    const rx = iface.rxByte || 0;
    const tx = iface.txByte || 0;
    const total = rx + tx;
    return {
      name: iface.name,
      type: iface.type,
      running: iface.running,
      rxBytes: rx,
      txBytes: tx,
      totalBytes: total,
      totalGb: bytesToGB(total),
      rxGb: bytesToGB(rx),
      txGb: bytesToGB(tx),
    };
  }, [selectedWanInterface, interfaces]);

  // PDF & Print
  const handlePrint = () => {
    printElementDocument('sales-consumption-comparison-report', {
      title: `تقرير مقارنة استهلاك المايكروتك ومبيعات الباقات - ${todayStr}`,
    });
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf('sales-consumption-comparison-report', {
        filename: `مقارنة_استهلاك_المايكروتك_والمبيعات_${todayStr}.pdf`,
        title: `تقرير تحليل استهلاك راوتر المايكروتك وفاقد الباقات المباعة`,
        scale: 2.2,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Scale size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  مقارنة استهلاك المايكروتك مع مبيعات الباقات
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  كشف الفاقد والتسريب
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>الراوتر: <strong className="text-slate-200">{routerIdentity}</strong></span>
                <span>•</span>
                <span>تحليل الفجوة بين السحب الفعلي وما تم بيعه للمشتركين</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="طباعة تقرير المقارنة"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50"
              title="تصدير تقرير المقارنة كـ PDF"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
              title="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Date Filter Modes */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setDateFilterMode('today')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilterMode === 'today'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم ({todayStr})
            </button>
            <button
              onClick={() => setDateFilterMode('yesterday')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilterMode === 'yesterday'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => setDateFilterMode('week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilterMode === 'week'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilterMode === 'month'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الشهر (30 يوماً)
            </button>
            <button
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg transition ${
                dateFilterMode === 'custom'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تاريخ مخصص
            </button>
          </div>

          {/* Custom Date Input */}
          {dateFilterMode === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar size={14} className="text-purple-400" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          )}

          {/* POS Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedPosFilter}
              onChange={(e) => setSelectedPosFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="all">كافة نقاط البيع والموزعين</option>
              {posPoints.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6" id="sales-consumption-comparison-report">
          {/* Executive KPI Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: MikroTik Total Recorded Pull */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Activity size={15} className="text-cyan-400" />
                  سحب المايكروتك المسجل
                </span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                  الجلسات
                </span>
              </div>
              <div className="my-1">
                <div className="text-2xl font-black text-white font-mono" dir="ltr">
                  {periodSummary.totalRouterGb.toFixed(2)}{' '}
                  <span className="text-sm font-normal text-cyan-400">GB</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2" dir="ltr">
                  <span>↓ {formatBytes(periodSummary.totalRouterDownload)}</span>
                  <span>•</span>
                  <span>↑ {formatBytes(periodSummary.totalRouterUpload)}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-700/40 pt-2 mt-2">
                إجمالي حركة المرور المسجلة لجلسات المشتركين النشطة
              </p>
            </div>

            {/* Card 2: Total Sold Packages Quota */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers size={15} className="text-emerald-400" />
                  سعة الباقات المباعة فعلياً
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  {periodSummary.totalCardsSold} كارت مباع
                </span>
              </div>
              <div className="my-1">
                <div className="text-2xl font-black text-white font-mono" dir="ltr">
                  {periodSummary.totalSoldQuotaGb.toFixed(2)}{' '}
                  <span className="text-sm font-normal text-emerald-400">GB</span>
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 font-bold">
                  إيراد المبيعات: {periodSummary.totalRevenue.toLocaleString()} {currency}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-700/40 pt-2 mt-2">
                مجموع سعات الجيجابايت لكافة الكروت الصادرة في الفواتير
              </p>
            </div>

            {/* Card 3: Discrepancy / Leakage (الفاقد في الاستهلاك) */}
            <div
              className={`rounded-2xl p-4.5 border relative overflow-hidden flex flex-col justify-between transition ${
                periodSummary.isLeakage
                  ? 'bg-rose-950/30 border-rose-700/60 shadow-lg shadow-rose-900/10'
                  : periodSummary.isSurplus
                  ? 'bg-blue-950/30 border-blue-700/60'
                  : 'bg-emerald-950/30 border-emerald-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  {periodSummary.isLeakage ? (
                    <TrendingDown size={15} className="text-rose-400" />
                  ) : (
                    <TrendingUp size={15} className="text-emerald-400" />
                  )}
                  {periodSummary.isLeakage ? 'فاقد الاستهلاك (تسريب)' : 'الفارق بين السحب والمبيعات'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    periodSummary.isLeakage
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : periodSummary.isSurplus
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {periodSummary.isLeakage
                    ? '⚠️ تسريب غير مباع'
                    : periodSummary.isSurplus
                    ? '✅ رصيد باقات ساري'
                    : '🎯 متطابق'}
                </span>
              </div>
              <div className="my-1">
                <div
                  className={`text-2xl font-black font-mono ${
                    periodSummary.isLeakage
                      ? 'text-rose-400'
                      : periodSummary.isSurplus
                      ? 'text-blue-400'
                      : 'text-emerald-400'
                  }`}
                  dir="ltr"
                >
                  {periodSummary.diffGb > 0 ? `+${periodSummary.diffGb.toFixed(2)}` : periodSummary.diffGb.toFixed(2)}{' '}
                  <span className="text-sm font-normal">GB</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-bold">
                  نسبة الفارق: {periodSummary.lossPercentage > 0 ? `+${periodSummary.lossPercentage}%` : `${periodSummary.lossPercentage}%`}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-700/40 pt-2 mt-2">
                {periodSummary.isLeakage
                  ? 'سحب الراوتر أعلى من سعة الكروت المباعة (فاقد غير مسجل)'
                  : 'المشتركون اشتروا باقات لم يستنفدوا كامل سعتها بعد'}
              </p>
            </div>

            {/* Card 4: Estimated Financial Loss or Efficiency */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-amber-400" />
                  الأثر المالي التقديري للفاقد
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                  تقدير الخسارة
                </span>
              </div>
              <div className="my-1">
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {periodSummary.estimatedFinancialLoss.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-slate-300">{currency}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  حساب تكلفة الفاقد بمتوسط سعر بيع الجيجابايت
                </div>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-700/40 pt-2 mt-2">
                المبلغ الضائع نتيجة تسريب بيانات دون تحصيل قيمتها
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('daily_table')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'daily_table'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
              <span>جدول المقارنة التحليلي اليومي</span>
              <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px]">
                {dailyComparisonData.filter((d) => activeDateRange.includes(d.date)).length} يوم
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories_breakdown')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'categories_breakdown'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={15} />
              <span>تفصيل فئات الباقات وسعاتها المباعة</span>
              <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px]">
                {categoryBreakdown.length} فئات
              </span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'diagnostics'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={15} className="text-amber-400" />
              <span>تشخيص مصادر الفاقد والحلول السريعة</span>
            </button>

            <button
              onClick={() => setActiveTab('wan_three_way')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'wan_three_way'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Zap size={15} className="text-cyan-400" />
              <span>المقارنة الثلاثية (منفذ Starlink WAN مقابل المبيعات)</span>
            </button>
          </div>

          {/* TAB 1: Daily Analytical Comparison Table */}
          {activeTab === 'daily_table' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scale size={16} className="text-purple-400" />
                    جدول المقارنة اليومي: سحب المايكروتك المسجل مقابل سعة الباقات المباعة
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    يوضح الجدول لكل يوم حجم البيانات التي سحبها الراوتر مقارنة بما تم تحصيله من كروت مباعة
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-3.5">التاريخ واليوم</th>
                      <th className="p-3.5 text-center">سحب المايكروتك (GB)</th>
                      <th className="p-3.5 text-center">الكروت المباعة</th>
                      <th className="p-3.5 text-center">سعة الباقات المباعة (GB)</th>
                      <th className="p-3.5 text-center">الفارق / الفاقد (GB)</th>
                      <th className="p-3.5 text-center">نسبة الفاقد (%)</th>
                      <th className="p-3.5 text-center">قيمة الفاقد التقديرية</th>
                      <th className="p-3.5 text-center">إيراد اليوم</th>
                      <th className="p-3.5 text-center">التشخيص والحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {dailyComparisonData
                      .filter((row) => activeDateRange.includes(row.date))
                      .map((row) => {
                        return (
                          <tr
                            key={row.date}
                            className={`hover:bg-slate-800/40 transition ${
                              row.status === 'leakage' ? 'bg-rose-950/10' : ''
                            }`}
                          >
                            {/* Date */}
                            <td className="p-3.5 font-sans">
                              <div className="font-bold text-white">{row.dayName}</div>
                              <div className="text-[10px] text-slate-400">{row.date}</div>
                            </td>

                            {/* Router Traffic */}
                            <td className="p-3.5 text-center">
                              <span className="font-bold text-cyan-400" dir="ltr">
                                {row.routerTotalGb.toFixed(2)} GB
                              </span>
                              <div className="text-[10px] text-slate-500 font-sans" dir="ltr">
                                ↓ {formatBytes(row.routerDownload)} • ↑ {formatBytes(row.routerUpload)}
                              </div>
                            </td>

                            {/* Cards Sold */}
                            <td className="p-3.5 text-center font-sans">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                                {row.cardsCount} كارت
                              </span>
                            </td>

                            {/* Sold Quota */}
                            <td className="p-3.5 text-center">
                              <span className="font-bold text-emerald-400" dir="ltr">
                                {row.soldQuotaGb.toFixed(2)} GB
                              </span>
                              <div className="text-[10px] text-slate-500 font-sans">
                                {row.cardsCount > 0 ? `متوسط ${(row.soldQuotaGb / row.cardsCount).toFixed(1)} GB/كارت` : 'لا مبيعات'}
                              </div>
                            </td>

                            {/* Difference / Leakage */}
                            <td className="p-3.5 text-center">
                              <span
                                className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                                  row.diffGb > 1.0
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    : row.diffGb < -1.0
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                }`}
                                dir="ltr"
                              >
                                {row.diffGb > 0 ? `+${row.diffGb.toFixed(2)}` : row.diffGb.toFixed(2)} GB
                              </span>
                            </td>

                            {/* Loss % */}
                            <td className="p-3.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`font-bold ${
                                    row.lossPercentage > 20
                                      ? 'text-rose-400'
                                      : row.lossPercentage > 5
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}
                                  dir="ltr"
                                >
                                  {row.lossPercentage > 0 ? `+${row.lossPercentage}%` : `${row.lossPercentage}%`}
                                </span>
                                {row.routerTotalGb > 0 && (
                                  <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        row.lossPercentage > 20
                                          ? 'bg-rose-500'
                                          : row.lossPercentage > 5
                                          ? 'bg-amber-500'
                                          : 'bg-emerald-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.max(0, row.lossPercentage))}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Estimated Financial Loss */}
                            <td className="p-3.5 text-center">
                              {row.estimatedFinancialLoss > 0 ? (
                                <span className="text-amber-400 font-bold">
                                  {row.estimatedFinancialLoss.toLocaleString()} {currency}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-sans">—</span>
                              )}
                            </td>

                            {/* Day Revenue */}
                            <td className="p-3.5 text-center text-slate-200">
                              {row.revenue > 0 ? `${row.revenue.toLocaleString()} ${currency}` : '0'}
                            </td>

                            {/* Status Diagnosis */}
                            <td className="p-3.5 text-center font-sans">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  row.status === 'leakage'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    : row.status === 'surplus'
                                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {row.status === 'leakage' && <AlertTriangle size={12} className="text-rose-400" />}
                                {row.status === 'surplus' && <CheckCircle2 size={12} className="text-blue-400" />}
                                {row.status === 'balanced' && <CheckCircle2 size={12} className="text-emerald-400" />}
                                <span>{row.statusLabel}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>

                  {/* Table Total Summary Row */}
                  <tfoot className="bg-slate-950 font-bold text-slate-200 border-t-2 border-slate-700">
                    <tr>
                      <td className="p-3.5 text-purple-400 font-sans">
                        إجمالي الفترة ({periodSummary.daysCount} يوم)
                      </td>
                      <td className="p-3.5 text-center text-cyan-400 font-mono" dir="ltr">
                        {periodSummary.totalRouterGb.toFixed(2)} GB
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {periodSummary.totalCardsSold} كارت
                      </td>
                      <td className="p-3.5 text-center text-emerald-400 font-mono" dir="ltr">
                        {periodSummary.totalSoldQuotaGb.toFixed(2)} GB
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            periodSummary.diffGb > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                          dir="ltr"
                        >
                          {periodSummary.diffGb > 0 ? `+${periodSummary.diffGb.toFixed(2)}` : periodSummary.diffGb.toFixed(2)} GB
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-purple-300 font-mono" dir="ltr">
                        {periodSummary.lossPercentage > 0 ? `+${periodSummary.lossPercentage}%` : `${periodSummary.lossPercentage}%`}
                      </td>
                      <td className="p-3.5 text-center text-amber-400 font-mono">
                        {periodSummary.estimatedFinancialLoss.toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-center text-emerald-400 font-mono">
                        {periodSummary.totalRevenue.toLocaleString()} {currency}
                      </td>
                      <td className="p-3.5 text-center font-sans text-xs text-slate-400">
                        {periodSummary.isLeakage ? 'يوجد فاقد بحاجة لسد الثغرات' : 'الوضع مستقر'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Sold Card Categories Breakdown */}
          {activeTab === 'categories_breakdown' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-emerald-400" />
                  تفصيل مبيعات فئات الكروت وسعاتها في هذه الفترة
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  توزيع استهلاك الكروت المباعة بحسب الفئة لمعرفة الفئات الأكثر استهلاكاً وإيراداً
                </p>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                  لم يتم تسجيل مبيعات كروت في الفترة المحددة ({dateFilterMode === 'today' ? 'اليوم' : 'الفترة المختارة'}).
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="p-3.5">اسم فئة الكارت</th>
                        <th className="p-3.5 text-center">سعة الكارت الواحد</th>
                        <th className="p-3.5 text-center">عدد الكروت المباعة</th>
                        <th className="p-3.5 text-center">إجمالي الجيجابايت المباعة (GB)</th>
                        <th className="p-3.5 text-center">نسبة الحصة من مبيعات السعة</th>
                        <th className="p-3.5 text-center">إجمالي الإيراد المحصل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {categoryBreakdown.map((cat) => (
                        <tr key={cat.categoryId} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-sans">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              <span>{cat.categoryName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-bold text-cyan-400">
                            {cat.quotaLimit}
                          </td>
                          <td className="p-3.5 text-center font-sans font-bold text-slate-200">
                            {cat.cardsSold} كارت
                          </td>
                          <td className="p-3.5 text-center font-bold text-emerald-400" dir="ltr">
                            {cat.totalGbSold.toFixed(2)} GB
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${cat.percentageOfTotal}%` }}
                                />
                              </div>
                              <span className="text-slate-300 font-bold" dir="ltr">
                                {cat.percentageOfTotal}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center text-amber-400 font-bold font-sans">
                            {cat.revenue.toLocaleString()} {currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950 font-bold text-slate-200 border-t-2 border-slate-700">
                      <tr>
                        <td className="p-3.5 text-purple-400 font-sans">الإجمالي</td>
                        <td className="p-3.5 text-center font-sans">—</td>
                        <td className="p-3.5 text-center font-sans">
                          {periodSummary.totalCardsSold} كارت
                        </td>
                        <td className="p-3.5 text-center text-emerald-400 font-mono" dir="ltr">
                          {periodSummary.totalSoldQuotaGb.toFixed(2)} GB
                        </td>
                        <td className="p-3.5 text-center font-mono" dir="ltr">
                          100%
                        </td>
                        <td className="p-3.5 text-center text-amber-400 font-mono">
                          {periodSummary.totalRevenue.toLocaleString()} {currency}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Leakage Diagnostics & Solutions */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert size={16} className="text-amber-400" />
                    دليل تشخيص أسباب فاقد الاستهلاك وحلول سد التسريب
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    التحليل الهندسي لمصادر تسريب البيانات بين سحب المايكروتك المسجل وبين ما يدفعه المشتركون
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reason 1: Expired Sessions */}
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      1. كروت انتهت رصيدها وفصلت (Expired Cards)
                    </span>
                    <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded">
                      60% - 70% من الفارق
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    يقوم راوتر المايكروتك تلقائياً بحذف الجلسة من جدول النشطين بمجرد نفاد رصيد الكارت أو تسجيل الخروج. هذه الجلسات سحبت جيجابايت فعلية ولكن الراوتر لا يعرضها إلا إذا راجعت نافذة الكروت المنتهية.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-xl text-[11px] text-cyan-300 font-mono border border-slate-800">
                    الحل: استخدام زر <strong>"نافذة الكروت المنتهية"</strong> في شاشة المايكروتك لعرض وحذف السجلات المنتهية واحتساب سحبها.
                  </div>
                </div>

                {/* Reason 2: Walled Garden Leakage */}
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      2. تسريب الـ Walled Garden (مواقع مجانية)
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                      15% - 25% من الفارق
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    الهواتف المتصلة بالواي فاي بدون تسجيل دخول تسحب إنترنت في الخلفية (إشعارات واتساب، خدمات آبل وجوجل، الروابط المسموح بها مجاناً في الهوتسبوت).
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-xl text-[11px] text-amber-300 font-mono border border-slate-800">
                    الحل في Winbox: الدخول إلى IP ➔ Hotspot ➔ Walled Garden وإلغاء أي روابط عشوائية مفتوحة.
                  </div>
                </div>

                {/* Reason 3: Bypassed Devices */}
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      3. أجهزة مستثناة (IP Bindings Bypassed)
                    </span>
                    <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                      10% - 20% من الفارق
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    أجهزة (كاميرات، شاشات، هواتف أصدقاء أو عمال) تم استثناؤها في المايكروتك لتعمل بدون كرت، وتسحب جيجابايت مفتوحة على مدار الساعة.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-xl text-[11px] text-blue-300 font-mono border border-slate-800">
                    الحل: مراجعة IP ➔ Hotspot ➔ IP Bindings وحذف الأجهزة غير الضرورية ووضع Rate Limit لها.
                  </div>
                </div>

                {/* Reason 4: DNS Tunneling / Port 53 */}
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      4. ثغرات الـ DNS وتطبيقات النت المجاني
                    </span>
                    <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                      تسريب خفي
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    تطبيقات مثل SlowDNS أو HTTP Custom تستغل منفذ 53 المفتوح لسحب نت مجاني بدون كرت.
                  </p>
                  <div className="p-2.5 bg-slate-900 rounded-xl text-[11px] text-purple-300 font-mono border border-slate-800 select-all" dir="ltr">
                    /ip firewall nat add chain=dstnat action=redirect to-ports=53 protocol=udp dst-port=53
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Three-Way WAN Audit (Starlink vs Hotspot vs Sales) */}
          {activeTab === 'wan_three_way' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap size={16} className="text-cyan-400" />
                    المقارنة الثلاثية: عداد منفذ الإنترنت (WAN / Starlink) مقابل الجلسات والمبيعات
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    مقارنة السحب الفيزيائي على المنفذ (مثل عداد ستارلينك) مع جلسات الهوتسبوت ومع مبيعات الكروت
                  </p>
                </div>

                {/* WAN Interface Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">منفذ الإنترنت (WAN):</span>
                  <select
                    value={selectedWanInterface}
                    onChange={(e) => setSelectedWanInterface(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-cyan-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {interfaces.map((iface) => (
                      <option key={iface.id || iface.name} value={iface.name}>
                        {iface.name} ({iface.type})
                      </option>
                    ))}
                    {interfaces.length === 0 && <option value="">جاري قراءة المنافذ...</option>}
                  </select>
                </div>
              </div>

              {/* Three Way Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Level 1: WAN Interface Traffic (Physical Cable) */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-800/40 relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Zap size={15} />
                      1. سحب الكيبل (Starlink WAN)
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
                      {selectedWanInterface || 'WAN'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono" dir="ltr">
                    {wanInterfaceData ? wanInterfaceData.totalGb.toFixed(2) : periodSummary.totalRouterGb.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-cyan-400">GB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    إجمالي كل بايت مر عبر الكيبل الفيزيائي (مطابق لتطبيق ستارلينك).
                  </p>
                </div>

                {/* Level 2: Active Hotspot Sessions Traffic */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-purple-800/40 relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Activity size={15} />
                      2. سحب جلسات الهوتسبوت
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">
                      Sessions
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono" dir="ltr">
                    {periodSummary.totalRouterGb.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-purple-400">GB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    السحب المسجل للمشتركين الذين سجلوا دخول بالكروت فقط.
                  </p>
                </div>

                {/* Level 3: Cards Quotas Sold in System */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-800/40 relative space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Layers size={15} />
                      3. سعة الباقات المباعة
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                      POS Sales
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white font-mono" dir="ltr">
                    {periodSummary.totalSoldQuotaGb.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-emerald-400">GB</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    السعات التي دفع المشتركون ثمنها في نقاط البيع.
                  </p>
                </div>
              </div>

              {/* Two Leakage Layers Explanation Box */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold text-white flex items-center gap-2">
                  <Info size={14} className="text-purple-400" />
                  شرح الفارق المزدوج (لماذا يختلف رقم ستارلينك عن جلسات المايكروتك وعن المبيعات؟)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <strong className="text-cyan-400 block mb-1">
                      الفارق الأول: (بين ستارلينك وجلسات الهوتسبوت)
                    </strong>
                    هو استهلاك أجهزة الشبكة، أجهزة البث (Access Points)، الكاميرات، والهواتف المتصلة بالواي فاي بدون تسجيل دخول (Walled Garden).
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400 block mb-1">
                      الفارق الثاني: (بين جلسات الهوتسبوت والمبيعات)
                    </strong>
                    هو كروت منتهية الصلاحية حذفت من الذاكرة اللحظية، أو كروت تم شراؤها مسبقاً وسحبت اليوم، أو كروت لم يتم قيد بيعها في النظام.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>نظام مقارنة الاستهلاك والمبيعات الذكي • متصل براوتر: {routerIdentity}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition flex items-center gap-1.5 font-bold"
            >
              <Printer size={15} />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition font-bold"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
