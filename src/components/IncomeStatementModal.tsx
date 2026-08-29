import React, { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Printer,
  Download,
  X,
  Store,
  Layers,
  Receipt,
  PieChart as PieChartIcon,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  CreditCard,
  Percent,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Loader2,
  ChevronDown
} from 'lucide-react';
import {
  NetworkSettings,
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  CardCategory,
  POSPoint,
  PaymentRecord,
  SalesRecord,
  AppUser
} from '../types';
import { exportToCSV } from '../utils/storage';
import { calculateComprehensiveFinancials } from '../utils/financialCalculations';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';

interface IncomeStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  cardCategories: CardCategory[];
  posPoints: POSPoint[];
  payments: PaymentRecord[];
  sales?: SalesRecord[];
  settings: NetworkSettings;
  activeUser?: AppUser;
  canPrint?: boolean;
}

export const IncomeStatementModal: React.FC<IncomeStatementModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  expenses = [],
  expenseCategories = [],
  cardCategories = [],
  posPoints = [],
  payments = [],
  sales = [],
  settings,
  activeUser,
  canPrint = true,
}) => {
  if (!isOpen) return null;

  const currency = settings?.currencySymbol || 'ر.ي';

  // Filters
  const [period, setPeriod] = useState<
    'today' | '7days' | 'month' | 'last_month' | 'quarter' | 'year' | 'all' | 'custom'
  >('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPOSId, setSelectedPOSId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'statement' | 'categories' | 'pos_analysis' | 'visual'>(
    'statement'
  );

  // Print / PDF Export loading states
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Helper date checker
  const isDateInSelectedPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'today') {
      return dateStr === todayStr;
    } else if (period === '7days') {
      const d = new Date(dateStr);
      const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff <= 7 && diff >= 0;
    } else if (period === 'month') {
      const d = new Date(dateStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (period === 'last_month') {
      const d = new Date(dateStr);
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    } else if (period === 'quarter') {
      const d = new Date(dateStr);
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dQuarter = Math.floor(d.getMonth() / 3);
      return currentQuarter === dQuarter && d.getFullYear() === now.getFullYear();
    } else if (period === 'year') {
      const d = new Date(dateStr);
      return d.getFullYear() === now.getFullYear();
    } else if (period === 'custom') {
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    }
    return true; // 'all'
  };

  // Human readable period label
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return `اليوم (${new Date().toLocaleDateString('ar-EG')})`;
      case '7days':
        return 'آخر 7 أيام';
      case 'month':
        return `الشهر الحالي (${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })})`;
      case 'last_month':
        return 'الشهر السابق';
      case 'quarter':
        return `الربع السنوي الحالي (${new Date().getFullYear()})`;
      case 'year':
        return `السنة المالية ${new Date().getFullYear()}`;
      case 'custom':
        return `من ${startDate || 'البداية'} إلى ${endDate || 'اليوم'}`;
      case 'all':
      default:
        return 'كامل الفترة التاريخية';
    }
  }, [period, startDate, endDate]);

  // Comprehensive Financial Computations using Central Accounting Engine
  const calculations = useMemo(() => {
    const computed = calculateComprehensiveFinancials({
      invoices,
      expenses,
      payments,
      posPoints,
      categories: cardCategories,
      sales,
      datePeriod: period,
      startDate,
      endDate,
      posPointId: selectedPOSId,
    });

    const uncollectedRevenue = Math.max(0, computed.netSales - computed.totalCashCollected);

    return {
      grossSales: computed.grossSales,
      salesReturns: computed.salesReturns,
      netSalesRevenue: computed.netSales,
      totalCardsSoldQty: computed.totalCardsSold,
      totalCardsReturnedQty: computed.totalCardsReturned,
      netCardsQty: computed.netCardsSold,
      costOfGoodsSold: computed.costOfGoodsSold,
      costOfGoodsReturned: computed.costOfGoodsReturned,
      netCOGS: computed.netCOGS,
      grossProfit: computed.grossProfit,
      grossMarginPercent: computed.grossProfitMargin,
      totalOperatingExpenses: computed.totalExpenses,
      expenseBreakdownList: computed.expenseBreakdownList,
      netProfit: computed.netProfit,
      netProfitMarginPercent: computed.netProfitMargin,
      isNetLoss: computed.isNetLoss,
      categoryAnalysisList: computed.categoryAnalysisList,
      posAnalysisList: computed.posAnalysisList,
      totalCashCollected: computed.totalCashCollected,
      uncollectedRevenue,
      currentTotalPOSDebt: computed.totalPOSDebt,
      expensesCount: computed.expensesCount,
      paymentsCount: payments.length,
    };
  }, [
    invoices,
    expenses,
    payments,
    sales,
    cardCategories,
    posPoints,
    period,
    startDate,
    endDate,
    selectedPOSId,
  ]);

  // Export CSV
  const handleExportCSV = () => {
    const reportData = [
      { 'البند المحاسبي': '1. إجمالي إيرادات مبيعات الكروت (Gross Sales)', 'المبلغ': calculations.grossSales, 'العملة': currency, 'ملاحظات': `الكمية: ${calculations.totalCardsSoldQty} كرت` },
      { 'البند المحاسبي': '(-) مردودات ومسموحات المبيعات (Sales Returns)', 'المبلغ': calculations.salesReturns, 'العملة': currency, 'ملاحظات': `المرتجع: ${calculations.totalCardsReturnedQty} كرت` },
      { 'البند المحاسبي': '(=) صافي الإيرادات التشغيلية (Net Revenue)', 'المبلغ': calculations.netSalesRevenue, 'العملة': currency, 'ملاحظات': 'أساس احتساب هوامش الربح' },
      { 'البند المحاسبي': '(-) تكلفة البضاعة المباعة / رأس المال (COGS)', 'المبلغ': calculations.netCOGS, 'العملة': currency, 'ملاحظات': 'تكلفة شراء الكروت من المصدر' },
      { 'البند المحاسبي': '(=) مجمل الربح التجاري (Gross Profit)', 'المبلغ': calculations.grossProfit, 'العملة': currency, 'ملاحظات': `هامش مجمل الربح: ${(calculations.grossMarginPercent ?? 0).toFixed(1)}%` },
      { 'البند المحاسبي': '(-) إجمالي المصروفات والنفقات التشغيلية (OPEX)', 'المبلغ': calculations.totalOperatingExpenses, 'العملة': currency, 'ملاحظات': `عدد السندات: ${calculations.expensesCount}` },
      ...calculations.expenseBreakdownList.map((e) => ({
        'البند المحاسبي': `   - بند: ${e.categoryName}`,
        'المبلغ': e.totalAmount,
        'العملة': currency,
        'ملاحظات': `${(e.percentOfTotalExpenses ?? (calculations.totalOperatingExpenses > 0 ? (e.totalAmount / calculations.totalOperatingExpenses) * 100 : 0)).toFixed(1)}% من إجمالي المصاريف`,
      })),
      { 'البند المحاسبي': '(=) صافي الربح / الخسارة النهائي (Net Income)', 'المبلغ': calculations.netProfit, 'العملة': currency, 'ملاحظات': `هامش صافي الربح: ${(calculations.netProfitMarginPercent ?? 0).toFixed(1)}%` },
      { 'البند المحاسبي': 'إجمالي المقبوضات النقدية المحصلة (Cash Collected)', 'المبلغ': calculations.totalCashCollected, 'العملة': currency, 'ملاحظات': `عدد السندات: ${calculations.paymentsCount}` },
      { 'البند المحاسبي': 'إجمالي المديونيات المعلقة في السوق (Total Debt)', 'المبلغ': calculations.currentTotalPOSDebt, 'العملة': currency, 'ملاحظات': 'مستحقات على نقاط البيع' },
    ];

    exportToCSV(reportData, `قائمة_الدخل_المالية_${period}_${new Date().toISOString().split('T')[0]}`);
    showFeedback('تم تصدير قائمة الدخل إلى ملف Excel بنجاح ✅');
  };

  // Print Document Handler
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElementDocument('income-statement-document', {
        filename: `قائمة_الدخل_${period}_${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'a4',
        paperFormat: 'a4',
        orientation: 'portrait',
        scale: 2.2,
        margin: 8,
      });
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const ok = await exportElementToPdf('income-statement-document', {
        filename: `قائمة_الدخل_${settings.networkName}_${period}.pdf`,
        title: `قائمة الدخل والتقرير المالي - ${settings.networkName}`,
        format: 'a4',
        orientation: 'portrait',
        scale: 2.2,
        margin: 8,
      });
      if (ok) {
        showFeedback('تم حفظ وتحميل قائمة الدخل PDF بنجاح ✅');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-inner">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  قائمة الدخل والتقرير المالي للأرباح والخسائر
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  Income Statement
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                التقرير المحاسبي الرسمي لحساب مجمل الربح، التكاليف، النفقات التشغيلية، وصافي الدخل الفعلي لـ{' '}
                <span className="text-slate-200 font-semibold">{settings.networkName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canPrint && (
              <>
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  title="طباعة A4 رسمية"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Printer className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline">طباعة رسمية</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  title="تحميل كملف PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <Download className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="hidden sm:inline">تحميل PDF</span>
                </button>
              </>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
              title="تصدير ملف Excel"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-emerald-950/80 border-y border-emerald-500/30 px-5 py-2 text-xs font-bold text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls & View Tabs */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Period Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'today', label: 'اليوم' },
                { id: '7days', label: '7 أيام' },
                { id: 'month', label: 'الشهر الحالي' },
                { id: 'last_month', label: 'الشهر السابق' },
                { id: 'quarter', label: 'الربع السنوي' },
                { id: 'year', label: 'السنة المالية' },
                { id: 'all', label: 'كامل الفترة' },
                { id: 'custom', label: 'مخصص' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    period === p.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* POS Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">نقطة البيع:</span>
              <select
                value={selectedPOSId}
                onChange={(e) => setSelectedPOSId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">جميع نقاط البيع والموزعين</option>
                {posPoints.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} ({pos.ownerName || 'موزع'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Inputs if 'custom' */}
          {period === 'custom' && (
            <div className="flex items-center gap-3 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">من تاريخ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">إلى تاريخ:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-2.5">
            <button
              onClick={() => setActiveTab('statement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'statement'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>جدول قائمة الدخل المحاسبي</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ربحية فئات الكروت ({calculations.categoryAnalysisList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pos_analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'pos_analysis'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>أرباح نقاط البيع ({calculations.posAnalysisList.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. Quick KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Net Revenue */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">صافي المبيعات (الإيراد)</span>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {calculations.netSalesRevenue.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 mr-1 font-bold">{currency}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {calculations.netCardsQty.toLocaleString()} كرت صافي مباع
              </span>
            </div>

            {/* COGS (Cost of goods sold) */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">تكلفة البضاعة المباعة (رأس المال)</span>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-400">
                  {calculations.netCOGS.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 mr-1 font-bold">{currency}</span>
              </div>
              <span className="text-[11px] text-amber-300/80 mt-1">تكلفة الكروت الخام من المصدر</span>
            </div>

            {/* Operating Expenses */}
            <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium">المصروفات التشغيلية (OPEX)</span>
              <div className="mt-1">
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {calculations.totalOperatingExpenses.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 mr-1 font-bold">{currency}</span>
              </div>
              <span className="text-[11px] text-rose-300/80 mt-1">
                {calculations.expensesCount} سند صرف وتكلفة تشغيل
              </span>
            </div>

            {/* Net Profit */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                calculations.isNetLoss
                  ? 'bg-rose-950/40 border-rose-500/50'
                  : 'bg-emerald-950/40 border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {calculations.isNetLoss ? 'صافي الخسارة التشغيلية' : 'صافي الربح الفعلي'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-black ${
                    calculations.isNetLoss
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {(calculations.netProfitMarginPercent ?? 0).toFixed(1)}% هامش
                </span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    calculations.isNetLoss ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {calculations.netProfit.toLocaleString()}
                </span>
                <span className="text-xs text-slate-300 mr-1 font-bold">{currency}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                مجمل الربح ({calculations.grossProfit.toLocaleString()} {currency}) - المصاريف
              </span>
            </div>
          </div>

          {/* TAB 1: Structured Income Statement Table */}
          {activeTab === 'statement' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">
                    قائمة الدخل المحاسبية المعتمدة (عن فترة: {periodLabel})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">المبالغ بـ ({currency})</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800/40 text-slate-400 text-xs border-b border-slate-800">
                      <th className="py-3 px-4 font-bold">البند المحاسبي والتفاصيل</th>
                      <th className="py-3 px-4 font-bold text-left w-36">المبلغ الجزئي</th>
                      <th className="py-3 px-4 font-bold text-left w-40">المبلغ الإجمالي</th>
                      <th className="py-3 px-4 font-bold text-center w-28">النسبة %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {/* SECTION 1: REVENUES */}
                    <tr className="bg-slate-800/20 font-black text-white">
                      <td colSpan={4} className="py-2.5 px-4 text-emerald-400 text-xs tracking-wider">
                        أولاً: الإيرادات التشغيلية (OPERATING REVENUES)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 pr-8 text-slate-300">
                        إجمالي مبيعات وتسليمات الكروت (Gross Sales)
                        <span className="block text-xs text-slate-500">
                          بناءً على الفواتير المعتمدة ({calculations.totalCardsSoldQty.toLocaleString()} كرت)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-slate-300">
                        {calculations.grossSales.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-left text-slate-500">-</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-400">100%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 pr-8 text-rose-300/90">
                        (-) مردودات ومسموحات مبيعات الكروت (Sales Returns)
                        <span className="block text-xs text-slate-500">
                          كروت مرتجعة للمخزن ({calculations.totalCardsReturnedQty.toLocaleString()} كرت)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-rose-400">
                        ({calculations.salesReturns.toLocaleString()})
                      </td>
                      <td className="py-3 px-4 text-left text-slate-500">-</td>
                      <td className="py-3 px-4 text-center text-xs text-rose-400">
                        {calculations.grossSales > 0
                          ? ((calculations.salesReturns / calculations.grossSales) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                    </tr>
                    <tr className="bg-slate-800/40 font-bold">
                      <td className="py-3.5 px-4 font-black text-white">
                        (=) صافي إيرادات المبيعات التشغيلية (Net Sales Revenue)
                      </td>
                      <td className="py-3.5 px-4 text-left text-slate-500">-</td>
                      <td className="py-3.5 px-4 text-left font-black text-white text-base">
                        {calculations.netSalesRevenue.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">100%</td>
                    </tr>

                    {/* SECTION 2: COST OF GOODS SOLD */}
                    <tr className="bg-slate-800/20 font-black text-white">
                      <td colSpan={4} className="py-2.5 px-4 text-amber-400 text-xs tracking-wider">
                        ثانياً: تكلفة المبيعات ورأس المال (COST OF GOODS SOLD - COGS)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 pr-8 text-slate-300">
                        تكلفة شراء الكروت المباعة من المصدر (Raw Cards Cost)
                        <span className="block text-xs text-slate-500">
                          محسوبة بسعر التكلفة لكل باقة وفئة
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-amber-400">
                        {calculations.costOfGoodsSold.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-left text-slate-500">-</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-400">
                        {calculations.netSalesRevenue > 0
                          ? ((calculations.costOfGoodsSold / calculations.netSalesRevenue) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                    </tr>
                    {calculations.costOfGoodsReturned > 0 && (
                      <tr>
                        <td className="py-3 px-4 pr-8 text-slate-400">
                          (-) تكلفة الكروت المرتجعة المستردة
                        </td>
                        <td className="py-3 px-4 text-left font-semibold text-slate-400">
                          ({calculations.costOfGoodsReturned.toLocaleString()})
                        </td>
                        <td className="py-3 px-4 text-left text-slate-500">-</td>
                        <td className="py-3 px-4 text-center text-xs text-slate-500">-</td>
                      </tr>
                    )}
                    <tr className="bg-amber-950/20 border-y border-amber-500/20 font-bold">
                      <td className="py-3.5 px-4 font-black text-amber-300">
                        (=) مجمل الربح التجاري (GROSS PROFIT)
                        <span className="block text-xs text-slate-400 font-normal">
                          صافي المبيعات - تكلفة الكروت المباعة
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left text-slate-500">-</td>
                      <td className="py-3.5 px-4 text-left font-black text-amber-400 text-base">
                        {calculations.grossProfit.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-amber-400">
                        {(calculations.grossMarginPercent ?? 0).toFixed(1)}%
                      </td>
                    </tr>

                    {/* SECTION 3: OPERATING EXPENSES */}
                    <tr className="bg-slate-800/20 font-black text-white">
                      <td colSpan={4} className="py-2.5 px-4 text-rose-400 text-xs tracking-wider">
                        ثالثاً: المصروفات والنفقات التشغيلية (OPERATING EXPENSES - OPEX)
                      </td>
                    </tr>
                    {calculations.expenseBreakdownList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-center text-slate-500 text-xs">
                          لا توجد مصروفات مسجلة خلال هذه الفترة المحددة
                        </td>
                      </tr>
                    ) : (
                      calculations.expenseBreakdownList.map((expItem) => (
                        <tr key={expItem.categoryId}>
                          <td className="py-2.5 px-4 pr-8 text-slate-300">
                            {expItem.categoryName}
                            <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                              {expItem.voucherCount} سند
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-slate-300">
                            {expItem.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-left text-slate-500">-</td>
                          <td className="py-2.5 px-4 text-center text-xs text-slate-400">
                            {(expItem.percentOfRevenue ?? 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-rose-950/20 border-y border-rose-500/20 font-bold">
                      <td className="py-3.5 px-4 font-black text-rose-300">
                        (=) إجمالي النفقات التشغيلية (Total Operating Expenses)
                      </td>
                      <td className="py-3.5 px-4 text-left text-slate-500">-</td>
                      <td className="py-3.5 px-4 text-left font-black text-rose-400 text-base">
                        ({calculations.totalOperatingExpenses.toLocaleString()}) {currency}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-400">
                        {calculations.netSalesRevenue > 0
                          ? (
                              (calculations.totalOperatingExpenses / calculations.netSalesRevenue) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </td>
                    </tr>

                    {/* SECTION 4: NET OPERATING INCOME */}
                    <tr
                      className={`font-black text-lg ${
                        calculations.isNetLoss ? 'bg-rose-900/40 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'
                      }`}
                    >
                      <td className="py-4 px-4 font-black">
                        {calculations.isNetLoss
                          ? '(=) صافي الخسارة المالية النهائية (NET LOSS)'
                          : '(=) صافي الربح المالي النهائي (NET PROFIT / INCOME)'}
                        <span className="block text-xs font-normal text-slate-300 mt-0.5">
                          العائد الصافي القابل للتوزيع أو الاستثمار بعد كافة الاستقطاعات
                        </span>
                      </td>
                      <td className="py-4 px-4 text-left text-slate-400 text-sm">-</td>
                      <td className="py-4 px-4 text-left font-black text-xl">
                        {calculations.netProfit.toLocaleString()} {currency}
                      </td>
                      <td className="py-4 px-4 text-center font-black text-base">
                        {(calculations.netProfitMarginPercent ?? 0).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Card Categories Profitability */}
          {activeTab === 'categories' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-black text-white">
                    تحليل ربحية فئات وباقات الكروت ({periodLabel})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  مرتبة حسب الفئات الأعلى إيراداً وربحية
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800/40 text-slate-400 text-xs border-b border-slate-800">
                      <th className="py-3 px-4 font-bold">اسم الفئة</th>
                      <th className="py-3 px-4 font-bold text-center">الكمية الصافية</th>
                      <th className="py-3 px-4 font-bold text-center">سعر التكلفة</th>
                      <th className="py-3 px-4 font-bold text-center">سعر البيع</th>
                      <th className="py-3 px-4 font-bold text-left">إجمالي الإيراد</th>
                      <th className="py-3 px-4 font-bold text-left">تكلفة المخزون</th>
                      <th className="py-3 px-4 font-bold text-left">مجمل الربح</th>
                      <th className="py-3 px-4 font-bold text-center">نسبة الربح %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {calculations.categoryAnalysisList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500 text-xs">
                          لا توجد مبيعات فئات كروت مسجلة في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      calculations.categoryAnalysisList.map((cat) => (
                        <tr key={cat.categoryId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                            <span>{cat.categoryName}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-200">
                            {cat.netQty.toLocaleString()}{' '}
                            <span className="text-[11px] text-slate-500">كرت</span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-amber-400 font-semibold">
                            {cat.unitCost.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-slate-300 font-semibold">
                            {cat.unitPrice.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-left font-bold text-white">
                            {cat.netRevenue.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-left text-xs text-amber-400">
                            {cat.cogs.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-left font-bold text-emerald-400">
                            {cat.grossProfit.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                              {(cat.marginPercent ?? 0).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: POS Points Sales & Profit Contribution */}
          {activeTab === 'pos_analysis' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-black text-white">
                    أداء ومساهمة نقاط البيع والموزعين ({periodLabel})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  مقارنة المبيعات والتحصيلات وأرباح كل موزع
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800/40 text-slate-400 text-xs border-b border-slate-800">
                      <th className="py-3 px-4 font-bold">نقطة البيع / الموزع</th>
                      <th className="py-3 px-4 font-bold text-center">عدد الفواتير</th>
                      <th className="py-3 px-4 font-bold text-left">إجمالي المبيعات</th>
                      <th className="py-3 px-4 font-bold text-left">المرتجع</th>
                      <th className="py-3 px-4 font-bold text-left">صافي المبيعات</th>
                      <th className="py-3 px-4 font-bold text-left">المسدد نقداً</th>
                      <th className="py-3 px-4 font-bold text-left">مجمل الربح المحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {calculations.posAnalysisList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500 text-xs">
                          لا توجد حركات مبيعات لنقاط البيع خلال هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      calculations.posAnalysisList.map((posItem) => (
                        <tr key={posItem.posId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <Store className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>{posItem.posName}</span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-slate-400">
                            {posItem.totalInvoices} فاتورة
                          </td>
                          <td className="py-3 px-4 text-left font-medium text-slate-300">
                            {posItem.grossSales.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-left text-xs text-rose-400">
                            {posItem.returnsAmount > 0 ? `(${posItem.returnsAmount.toLocaleString()})` : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-bold text-white">
                            {posItem.netSales.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-left font-semibold text-emerald-400">
                            {posItem.totalCollected.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-left font-bold text-amber-400">
                            {posItem.grossProfit.toLocaleString()} {currency}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HIDDEN PRINTABLE A4 OFFICIAL DOCUMENT */}
          <div className="hidden">
            <div
              id="income-statement-document"
              className="bg-white text-slate-900 p-8 max-w-4xl mx-auto font-sans"
              style={{ direction: 'rtl' }}
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{settings.networkName}</h1>
                  <p className="text-sm font-bold text-slate-600">
                    {settings.networkSubtitle || 'شبكة توزيع وتزويد خدمات الإنترنت'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    هاتف الدعم: {settings.supportPhone || settings.supportPhone2 || 'غير محدد'}
                  </p>
                </div>
                <div className="text-left">
                  <div className="inline-block border-2 border-slate-900 px-3 py-1 text-center font-black text-sm rounded">
                    قائمة الدخل والتقرير المالي
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-bold">عن فترة: {periodLabel}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>

              {/* Main Accounting Table */}
              <table className="w-full text-right border-collapse border border-slate-400 text-xs mb-6">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-black text-slate-800">
                    <th className="p-2 border-l border-slate-400">البيان المحاسبي</th>
                    <th className="p-2 border-l border-slate-400 text-left w-32">المبلغ الجزئي</th>
                    <th className="p-2 border-l border-slate-400 text-left w-36">المبلغ الإجمالي</th>
                    <th className="p-2 text-center w-20">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-1.5 text-slate-800">
                      1. الإيرادات التشغيلية (Revenues)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 pr-6">
                      إجمالي مبيعات الكروت ({calculations.totalCardsSoldQty} كرت)
                    </td>
                    <td className="p-2 text-left font-semibold">{calculations.grossSales.toLocaleString()}</td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-center">100%</td>
                  </tr>
                  <tr>
                    <td className="p-2 pr-6 text-red-700">
                      (-) مردودات ومسموحات المبيعات ({calculations.totalCardsReturnedQty} كرت)
                    </td>
                    <td className="p-2 text-left font-semibold text-red-700">
                      ({calculations.salesReturns.toLocaleString()})
                    </td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-center text-red-700">
                      {calculations.grossSales > 0
                        ? ((calculations.salesReturns / calculations.grossSales) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="p-2">(=) صافي إيرادات المبيعات (Net Revenue)</td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-left font-black">
                      {calculations.netSalesRevenue.toLocaleString()} {currency}
                    </td>
                    <td className="p-2 text-center font-bold">100%</td>
                  </tr>

                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-1.5 text-slate-800">
                      2. تكلفة المبيعات ورأس المال (Cost of Goods Sold)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 pr-6">تكلفة الكروت المباعة من المصدر</td>
                    <td className="p-2 text-left font-semibold">{calculations.netCOGS.toLocaleString()}</td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-center">
                      {calculations.netSalesRevenue > 0
                        ? ((calculations.netCOGS / calculations.netSalesRevenue) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="p-2">(=) مجمل الربح التجاري (Gross Profit)</td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-left font-black text-slate-900">
                      {calculations.grossProfit.toLocaleString()} {currency}
                    </td>
                    <td className="p-2 text-center font-black">
                      {(calculations.grossMarginPercent ?? 0).toFixed(1)}%
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={4} className="p-1.5 text-slate-800">
                      3. المصروفات والنفقات التشغيلية (Operating Expenses)
                    </td>
                  </tr>
                  {calculations.expenseBreakdownList.map((e) => (
                    <tr key={e.categoryId}>
                      <td className="p-2 pr-6">
                        {e.categoryName} ({e.voucherCount} سند)
                      </td>
                      <td className="p-2 text-left">{e.totalAmount.toLocaleString()}</td>
                      <td className="p-2 text-left">-</td>
                      <td className="p-2 text-center">{(e.percentOfRevenue ?? 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-2">(=) إجمالي المصروفات التشغيلية</td>
                    <td className="p-2 text-left">-</td>
                    <td className="p-2 text-left font-bold text-red-700">
                      ({calculations.totalOperatingExpenses.toLocaleString()}) {currency}
                    </td>
                    <td className="p-2 text-center font-bold text-red-700">
                      {calculations.netSalesRevenue > 0
                        ? (
                            (calculations.totalOperatingExpenses / calculations.netSalesRevenue) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                      %
                    </td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td className="p-3">(=) صافي الربح / الخسارة النهائي (Net Profit)</td>
                    <td className="p-3 text-left">-</td>
                    <td className="p-3 text-left font-black text-base">
                      {calculations.netProfit.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-center font-black text-sm">
                      {(calculations.netProfitMarginPercent ?? 0).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures & Seal Section */}
              <div className="grid grid-cols-3 gap-6 pt-6 mt-8 border-t border-slate-400 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-8">إعداد / المحاسب المالي</p>
                  <p className="text-slate-500 font-semibold">{activeUser?.name || 'المحاسب المعتمد'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-8">المراجعة والتدقيق</p>
                  <p className="text-slate-400">........................</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-8">اعتماد الإدارة / الختم</p>
                  <p className="text-slate-400">........................</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              الحسابات مستخرجة تلقائياً من الفواتير وسندات الصرف والقبض المسجلة في النظام.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
