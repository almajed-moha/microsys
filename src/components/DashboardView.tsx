import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  Store,
  DollarSign,
  Package,
  AlertTriangle,
  Filter,
  ArrowUpRight,
  Sparkles,
  RotateCcw,
  Receipt,
  FileText,
  Calculator,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  CardCategory,
  POSPoint,
  SalesRecord,
  PaymentRecord,
  CardBatchDispatch,
  NetworkSettings,
  InvoiceRecord,
  ExpenseRecord
} from '../types';
import { calculateComprehensiveFinancials, isDateInPeriod } from '../utils/financialCalculations';

interface DashboardViewProps {
  categories: CardCategory[];
  posPoints: POSPoint[];
  sales: SalesRecord[];
  payments: PaymentRecord[];
  dispatches: CardBatchDispatch[];
  invoices?: InvoiceRecord[];
  expenses?: ExpenseRecord[];
  settings: NetworkSettings;
  onNavigateToTab: (tab: string) => void;
  onSelectPOSForStatement: (posId: string) => void;
  onOpenQuickSale: () => void;
  onOpenAI: () => void;
  onPrintSaleReceipt: (sale: SalesRecord) => void;
  onOpenIncomeStatement?: () => void;
  canViewIncomeStatement?: boolean;
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];
const EXPENSE_COLORS = ['#f43f5e', '#fb923c', '#eab308', '#a855f7', '#3b82f6', '#10b981', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  categories = [],
  posPoints = [],
  sales = [],
  payments = [],
  invoices = [],
  expenses = [],
  settings,
  onNavigateToTab,
  onSelectPOSForStatement,
  onOpenAI,
  onOpenIncomeStatement,
  canViewIncomeStatement = true,
}) => {
  const currency = settings?.currencySymbol || 'ر.ي';

  // Filters
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('all');
  const [selectedPOSFilter, setSelectedPOSFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 1. Strict Set of Active POS IDs from database to eliminate any ghost/deleted points of sale
  const validPosIds = useMemo(() => new Set(posPoints.map((p) => p.id)), [posPoints]);
  const validCatIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  // Helper date filter
  const isDateInFilter = (dateStr: string) => {
    return isDateInPeriod(dateStr, timeRange === '30days' ? 'month' : timeRange, customStartDate, customEndDate);
  };

  // 2. Filtered Invoices (Verified against real POS Points)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv || inv.status === 'cancelled') return false;
      // If invoice has posPointId, ensure it belongs to an active POS in posPoints
      if (inv.posPointId && !validPosIds.has(inv.posPointId)) return false;
      if (selectedPOSFilter !== 'all' && inv.posPointId !== selectedPOSFilter) return false;
      return isDateInFilter(inv.date);
    });
  }, [invoices, validPosIds, selectedPOSFilter, timeRange, customStartDate, customEndDate]);

  // 3. Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInFilter(e.date));
  }, [expenses, timeRange, customStartDate, customEndDate]);

  // 4. Filtered Payments (Verified against real POS Points)
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!p) return false;
      if (p.posPointId && !validPosIds.has(p.posPointId)) return false;
      if (selectedPOSFilter !== 'all' && p.posPointId !== selectedPOSFilter) return false;
      return isDateInFilter(p.date);
    });
  }, [payments, validPosIds, selectedPOSFilter, timeRange, customStartDate, customEndDate]);

  // 5. Filtered Quick Sales (Legacy sales records verified against real POS Points)
  const filteredLegacySales = useMemo(() => {
    return sales.filter((s) => {
      if (!s) return false;
      if (s.posPointId && !validPosIds.has(s.posPointId)) return false;
      if (selectedPOSFilter !== 'all' && s.posPointId !== selectedPOSFilter) return false;
      return isDateInFilter(s.date);
    });
  }, [sales, validPosIds, selectedPOSFilter, timeRange, customStartDate, customEndDate]);

  // 6. Financial Metrics Calculation using central engine
  const financialMetrics = useMemo(() => {
    const period = timeRange === '30days' ? 'month' : timeRange;
    const computed = calculateComprehensiveFinancials({
      invoices,
      expenses,
      payments,
      posPoints,
      categories,
      sales,
      datePeriod: period,
      startDate: customStartDate,
      endDate: customEndDate,
      posPointId: selectedPOSFilter,
    });

    return {
      grossSales: computed.grossSales,
      returnsTotal: computed.salesReturns,
      netSales: computed.netSales,
      costOfGoodsSold: computed.costOfGoodsSold,
      costOfGoodsReturned: computed.costOfGoodsReturned,
      netCOGS: computed.netCOGS,
      grossProfit: computed.grossProfit,
      grossProfitMargin: (computed.grossProfitMargin ?? 0).toFixed(1),
      totalExpenses: computed.totalExpenses,
      expensesCount: computed.expensesCount,
      netProfit: computed.netProfit,
      profitMargin: (computed.netProfitMargin ?? 0).toFixed(1),
      isProfitable: computed.isProfitable,
      isNetLoss: computed.isNetLoss,
      totalCardsSold: computed.totalCardsSold,
      totalCardsReturned: computed.totalCardsReturned,
      netCardsDelivered: computed.netCardsSold,
      totalCashCollected: computed.totalCashCollected,
      totalPOSDebt: computed.totalPOSDebt,
      totalWarehouseStock: computed.totalWarehouseStock,
      inventoryValuationCost: computed.inventoryValuationCost,
      inventoryValuationWholesale: computed.inventoryValuationWholesale,
      categoryAnalysisList: computed.categoryAnalysisList,
      posAnalysisList: computed.posAnalysisList,
      expenseBreakdownList: computed.expenseBreakdownList,
      dailyTrend: computed.dailyTrend,
    };
  }, [invoices, expenses, payments, posPoints, categories, sales, timeRange, customStartDate, customEndDate, selectedPOSFilter]);

  // 7. Trend Chart Data (Sales vs COGS vs Expenses vs Net Profit)
  const financialTrendData = useMemo(() => {
    return financialMetrics.dailyTrend.map((d) => ({
      date: d.date,
      sales: d.netSales,
      grossSales: d.sales,
      returns: d.returns,
      cogs: d.cogs,
      grossProfit: d.grossProfit,
      expenses: d.expenses,
      netProfit: d.netProfit,
      cashCollected: d.cashCollected,
    }));
  }, [financialMetrics.dailyTrend]);

  // 8. Expenses Category Breakdown Data
  const expensesByCategoryData = useMemo(() => {
    return financialMetrics.expenseBreakdownList.map((e, idx) => ({
      name: e.categoryName,
      amount: e.totalAmount,
      voucherCount: e.voucherCount,
      percentOfRevenue: e.percentOfRevenue,
      color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
    }));
  }, [financialMetrics.expenseBreakdownList]);

  // 9. Top Performing POS Points - Linked STRICTLY to existing active posPoints in database
  const posPerformanceData = useMemo(() => {
    const targetList = selectedPOSFilter === 'all'
      ? financialMetrics.posAnalysisList
      : financialMetrics.posAnalysisList.filter((p) => p.posId === selectedPOSFilter);

    return targetList.map((p) => ({
      id: p.posId,
      name: p.posName.length > 20 ? p.posName.slice(0, 20) + '...' : p.posName,
      sales: p.grossSales,
      returns: p.returnsAmount,
      netSales: p.netSales,
      debt: p.currentDebt,
      totalCollected: p.totalCollected,
      grossProfit: p.grossProfit,
    }));
  }, [financialMetrics.posAnalysisList, selectedPOSFilter]);

  // 10. Card Categories Sales Distribution
  const categorySalesData = useMemo(() => {
    return financialMetrics.categoryAnalysisList.map((c, idx) => ({
      id: c.categoryId,
      name: c.categoryName.length > 18 ? c.categoryName.slice(0, 18) + '...' : c.categoryName,
      quantity: c.netQty,
      amount: c.netRevenue,
      cogs: c.cogs,
      grossProfit: c.grossProfit,
      color: COLORS[idx % COLORS.length],
    }));
  }, [financialMetrics.categoryAnalysisList]);

  // Critical Alerts
  const lowStockCategories = categories.filter((c) => c.warehouseStock < 100);
  const highDebtPOS = posPoints.filter((p) => p.currentDebt > p.maxDebtLimit * 0.8 && p.maxDebtLimit > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              لوحة التحكم والمؤشرات المالية وصافي الأرباح
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              بيانات حية مباشرة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            متابعة فواتير المبيعات، المرتجعات، المصروفات التشغيلية، وصافي أرباح الشبكة ونقاط البيع الفعلية ({posPoints.length} نقاط).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {canViewIncomeStatement && onOpenIncomeStatement && (
            <button
              onClick={onOpenIncomeStatement}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>قائمة الدخل والتقرير المالي</span>
            </button>
          )}
          <button
            onClick={() => onNavigateToTab('invoices')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition"
          >
            <FileText className="w-4 h-4" />
            <span>+ فاتورة مبيعات / مرتجع</span>
          </button>
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/25 transition"
          >
            <Receipt className="w-4 h-4" />
            <span>+ سند صرف مصروف</span>
          </button>
          <button
            onClick={onOpenAI}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-600/25 transition"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>تحليل ذكي</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 text-sm font-bold">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>تصفية الرسوم البيانية والمؤشرات المالية:</span>
          </div>
          {/* Preset Period Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'كل الفترات' },
              { id: 'today', label: 'اليوم' },
              { id: '7days', label: 'آخر 7 أيام' },
              { id: '30days', label: 'هذا الشهر' },
              { id: 'custom', label: 'تاريخ مخصص' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
          {/* POS Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              تصفية بنقطة البيع الفعلية:
            </label>
            <select
              value={selectedPOSFilter}
              onChange={(e) => setSelectedPOSFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">جميع نقاط البيع المتوفرة ({posPoints.length} نقاط)</option>
              {posPoints.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name} - (دين: {(pos.currentDebt ?? 0).toLocaleString()} {currency})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Start */}
          {timeRange === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                من تاريخ:
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Custom Date End */}
          {timeRange === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                إلى تاريخ:
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* CORE FINANCIAL KPIS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Sales Revenue */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">صافي المبيعات (Net Sales)</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {(financialMetrics.netSales ?? 0).toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 font-semibold">{currency}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>إجمالي: {(financialMetrics.grossSales ?? 0).toLocaleString()}</span>
            <span className="text-rose-400 font-medium">مرتجع: {(financialMetrics.returnsTotal ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* 2. Cost of Goods Sold (COGS) */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md relative overflow-hidden group hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">تكلفة البضاعة (Net COGS)</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono">
              {(financialMetrics.netCOGS ?? 0).toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 font-semibold">{currency}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>مجمل الربح:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {(financialMetrics.grossProfit ?? 0).toLocaleString()} {currency}
            </span>
          </div>
        </div>

        {/* 3. Operating Expenses */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md relative overflow-hidden group hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">المصروفات التشغيلية (OPEX)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {(financialMetrics.totalExpenses ?? 0).toLocaleString()}
            </div>
            <span className="text-xs text-slate-400 font-semibold">{currency}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {financialMetrics.expensesCount} سندات صرف (باقات، إيجار، صيانة)
          </div>
        </div>

        {/* 4. NET PROFIT */}
        <div className={`p-4 rounded-xl border shadow-lg relative overflow-hidden group transition ${
          financialMetrics.netProfit >= 0
            ? 'bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border-emerald-500/40 hover:border-emerald-500'
            : 'bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 border-rose-500/40 hover:border-rose-500'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-200">صافي الربح الحقيقي (Net Profit)</span>
            <div className={`p-2 rounded-lg ${
              financialMetrics.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black font-mono ${
              financialMetrics.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(financialMetrics.netProfit ?? 0).toLocaleString()}
            </div>
            <span className="text-xs text-slate-300 font-semibold">{currency}</span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>مجمل الربح - المصروفات</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
              هامش {financialMetrics.profitMargin}%
            </span>
          </div>
          {canViewIncomeStatement && onOpenIncomeStatement && (
            <button
              onClick={onOpenIncomeStatement}
              className="mt-3 w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>عرض قائمة الدخل والتقرير المالي المفصل</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Financial Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cash Collected */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">التحصيلات النقدية (سندات القبض)</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-400">
            {(financialMetrics.totalCashCollected ?? 0).toLocaleString()} {currency}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">المبالغ المقبوضة فعلياً بالخزينة</div>
        </div>

        {/* POS Debt */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">إجمالي مديونية الموزعين (الآجل)</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400">
            {(financialMetrics.totalPOSDebt ?? 0).toLocaleString()} {currency}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">مستحقات معلقة لدى نقاط البيع الحالية</div>
        </div>

        {/* Warehouse Cards */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold">مخزون الكروت في المستودع</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {(financialMetrics.totalWarehouseStock ?? 0).toLocaleString()} كارت
          </div>
          <div className="text-[11px] text-slate-500 mt-1">جاهزة للتوزيع والطباعة</div>
        </div>
      </div>

      {/* Critical Alerts Banner (If any) */}
      {(highDebtPOS.length > 0 || lowStockCategories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highDebtPOS.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded-xl text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-400 mb-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>تنبيه: نقاط بيع اقتربت أو تجاوزت سقف الدين!</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {highDebtPOS.map((pos) => (
                  <div key={pos.id} className="flex items-center justify-between bg-amber-900/30 p-2 rounded-lg">
                    <span>{pos.name} ({pos.managerName})</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300">
                        {(pos.currentDebt ?? 0).toLocaleString()} / {(pos.maxDebtLimit ?? 0).toLocaleString()} {currency}
                      </span>
                      <button
                        onClick={() => onSelectPOSForStatement(pos.id)}
                        className="px-2 py-1 bg-amber-700/60 hover:bg-amber-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        كشف حساب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lowStockCategories.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-800/80 p-4 rounded-xl text-rose-200">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-400 mb-1.5">
                <Package className="w-4 h-4" />
                <span>تنبيه: فئات كروت قريبة من النفاد في المستودع!</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {lowStockCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between bg-rose-900/30 p-2 rounded-lg">
                    <span>{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-300">
                        المتبقي: {cat.warehouseStock} كارت
                      </span>
                      <button
                        onClick={() => onNavigateToTab('categories')}
                        className="px-2 py-1 bg-rose-700/60 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        إدارة الفئات
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Charts Section: Financial Trends & Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Trends (2 columns) */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">
                حركة المبيعات والمصروفات وصافي الأرباح
              </h3>
              <p className="text-xs text-slate-400">تتبع الإيرادات اليومية مقارنة بالنفقات التشغيلية وصافي العائد من واقع البيانات الفعلية</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {financialTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} ${currency}`, '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="expenses" name="المصروفات" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
                  <Area type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <span>لا توجد حركات مالية مسجلة في هذه الفترة</span>
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category Breakdown (1 column) */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-base text-white">
                توزيع المصروفات حسب البند
              </h3>
              <PieIcon className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xs text-slate-400 mb-3">نسبة الإنفاق التشغيلي على بنود الشبكة</p>
          </div>

          <div className="h-56 w-full relative">
            {expensesByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {expensesByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} ${currency}`, 'المبلغ']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                لا توجد مصروفات مسجلة في هذه الفترة
              </div>
            )}
          </div>

          {/* Expenses Legend List */}
          <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
            {expensesByCategoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-300 truncate">{cat.name}</span>
                </div>
                <span className="font-mono font-bold text-white whitespace-nowrap">
                  {(cat.amount ?? 0).toLocaleString()} {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* POS Real Ranking & Card Categories Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* POS Points Sales Leaderboard - Strictly only existing POS Points */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  أداء ومبيعات نقاط البيع الفعلية
                </h3>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                  {posPoints.length} نقاط متوفرة
                </span>
              </div>
              <p className="text-xs text-slate-400">حجم المبيعات والمديونية الحالية لنقاط البيع المسجلة بالنظام</p>
            </div>
            <button
              onClick={() => onNavigateToTab('pos')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>إدارة النقاط</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {posPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={posPerformanceData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: any, name: string) => [
                      `${Number(val).toLocaleString()} ${currency}`,
                      name === 'netSales' ? 'صافي المبيعات' : name === 'debt' ? 'المديونية الحالية' : 'المبيعات'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="netSales" fill="#6366f1" radius={[0, 6, 6, 0]} name="صافي المبيعات" />
                  <Bar dataKey="debt" fill="#f59e0b" radius={[0, 6, 6, 0]} name="المديونية الحالية" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                لا توجد نقاط بيع مسجلة في قاعدة البيانات
              </div>
            )}
          </div>

          {/* POS Points Quick Summary Footnote */}
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-400">
              إجمالي نقاط البيع: <span className="font-bold text-white">{posPoints.length}</span>
            </div>
            <div className="text-left text-slate-400">
              إجمالي الديون: <span className="font-bold text-amber-400 font-mono">{(financialMetrics.totalPOSDebt ?? 0).toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>

        {/* Card Categories Sales & Usage Breakdown */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">
                    توزيع المبيعات حسب فئات الكروت
                  </h3>
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400">الفئات الأكثر طلباً وتصريفاً لدى العملاء والموزعين</p>
              </div>
              <button
                onClick={() => onNavigateToTab('categories')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>فئات الكروت</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-60 w-full">
              {categorySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(val: any, name: string) => [
                        name === 'quantity' ? `${Number(val || 0).toLocaleString()} كارت` : `${Number(val || 0).toLocaleString()} ${currency}`,
                        name === 'quantity' ? 'عدد الكروت المباعة' : 'القيمة الإجمالية'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="quantity" fill="#10b981" radius={[6, 6, 0, 0]} name="عدد الكروت المباعة" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  لا توجد مبيعات مسجلة للفئات في هذه الفترة
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي الفئات المعرفة: {categories.length}</span>
            <span>المخزون الكلي: {(financialMetrics.totalWarehouseStock ?? 0).toLocaleString()} كارت</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Activity Table */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-white">
              آخر الفواتير الصادرة والمرتجعة المعتمدة
            </h3>
            <p className="text-xs text-slate-400">العمليات المسجلة لنقاط البيع الفعلية</p>
          </div>
          <button
            onClick={() => onNavigateToTab('invoices')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>سجل الفواتير الكامل ({invoices.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="text-slate-400 bg-slate-800/60 uppercase">
              <tr>
                <th className="py-2.5 px-3 rounded-r">رقم الفاتورة</th>
                <th className="py-2.5 px-3">التاريخ</th>
                <th className="py-2.5 px-3">نقطة البيع</th>
                <th className="py-2.5 px-3">نوع الحركة</th>
                <th className="py-2.5 px-3 text-center">عدد الكروت</th>
                <th className="py-2.5 px-3 text-center rounded-l">القيمة بالجملة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredInvoices.slice(0, 6).map((inv) => {
                const isReturn = inv.type === 'return';
                const pos = posPoints.find((p) => p.id === inv.posPointId);
                const displayName = pos ? pos.name : inv.posPointName || 'مبيعات مباشرة';

                return (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-300">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {inv.date}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white truncate max-w-[160px]">
                      {displayName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isReturn ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isReturn ? 'مرتجع كروت' : 'فاتورة مبيعات'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300 text-center">
                      {inv.totalQuantity}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-center">
                      <span className={isReturn ? 'text-rose-400' : 'text-emerald-400'}>
                        {isReturn ? '-' : ''}{(inv.totalWholesaleAmount ?? 0).toLocaleString()} {currency}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    لا توجد فواتير مسجلة لنقاط البيع المحددة في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-slate-800 mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>إجمالي الفواتير المعروضة: {filteredInvoices.length}</span>
          <button
            onClick={() => onNavigateToTab('invoices')}
            className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            + إنشاء فاتورة جديدة
          </button>
        </div>
      </div>
    </div>
  );
};
