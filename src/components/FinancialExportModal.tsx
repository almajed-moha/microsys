import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  Store,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  CheckCircle2,
  Table,
  ArrowDownToLine,
} from 'lucide-react';
import {
  InvoiceRecord,
  ExpenseRecord,
  SalesRecord,
  PaymentRecord,
  POSPoint,
  CardCategory,
  NetworkSettings,
} from '../types';
import { DateFilterPeriod, calculateComprehensiveFinancials, isDateInPeriod } from '../utils/financialCalculations';
import {
  exportComprehensiveFinancialsExcel,
  exportInvoicesToExcel,
  exportInvoicesToCSV,
  exportExpensesToExcel,
  exportExpensesToCSV,
  exportSalesToExcel,
  exportSalesToCSV,
} from '../utils/exportAccounting';

interface FinancialExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  posPoints?: POSPoint[];
  categories?: CardCategory[];
  settings: NetworkSettings;
  defaultPeriod?: DateFilterPeriod | string;
}

export const FinancialExportModal: React.FC<FinancialExportModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  expenses = [],
  sales = [],
  payments = [],
  posPoints = [],
  categories = [],
  settings,
  defaultPeriod = 'all',
}) => {
  if (!isOpen) return null;

  const currency = settings?.currencySymbol || 'ر.ي';

  // Filters State
  const [period, setPeriod] = useState<DateFilterPeriod | string>(defaultPeriod);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPOSId, setSelectedPOSId] = useState('all');

  // Excel Sheets Toggles
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeSales, setIncludeSales] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includePOSPoints, setIncludePOSPoints] = useState(true);

  // Export Format Tab
  const [exportType, setExportType] = useState<'excel_workbook' | 'csv_files'>('excel_workbook');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtered counts & metrics
  const filteredMetrics = useMemo(() => {
    return calculateComprehensiveFinancials({
      invoices,
      expenses,
      payments,
      posPoints,
      categories,
      sales,
      datePeriod: period,
      startDate,
      endDate,
      posPointId: selectedPOSId,
    });
  }, [invoices, expenses, payments, posPoints, categories, sales, period, startDate, endDate, selectedPOSId]);

  const filteredInvoicesCount = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv || inv.status === 'cancelled') return false;
      if (selectedPOSId !== 'all' && inv.posPointId !== selectedPOSId) return false;
      return isDateInPeriod(inv.date, period, startDate, endDate);
    }).length;
  }, [invoices, selectedPOSId, period, startDate, endDate]);

  const filteredExpensesCount = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp) return false;
      return isDateInPeriod(exp.date, period, startDate, endDate);
    }).length;
  }, [expenses, period, startDate, endDate]);

  const filteredSalesCount = useMemo(() => {
    const directSalesCount = sales.filter((s) => {
      if (!s) return false;
      if (selectedPOSId !== 'all' && s.posPointId !== selectedPOSId) return false;
      return isDateInPeriod(s.date, period, startDate, endDate);
    }).length;

    const invoiceLinesCount = invoices
      .filter((inv) => {
        if (!inv || inv.status === 'cancelled') return false;
        if (selectedPOSId !== 'all' && inv.posPointId !== selectedPOSId) return false;
        return isDateInPeriod(inv.date, period, startDate, endDate);
      })
      .reduce((acc, inv) => acc + (inv.items?.length || 0), 0);

    return directSalesCount + invoiceLinesCount;
  }, [sales, invoices, selectedPOSId, period, startDate, endDate]);

  const handleExportFullWorkbook = () => {
    setIsExporting(true);
    try {
      exportComprehensiveFinancialsExcel({
        invoices,
        expenses,
        sales,
        payments,
        posPoints,
        categories,
        settings,
        filter: {
          period,
          startDate,
          endDate,
          posPointId: selectedPOSId,
          currencySymbol: currency,
        },
        includeSheets: {
          summary: includeSummary,
          invoices: includeInvoices,
          sales: includeSales,
          expenses: includeExpenses,
          posPoints: includePOSPoints,
        },
      });
      setSuccessMessage('تم توليد وتنزيل مصنف الإكسيل المحاسبي الشامل بنجاح!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportInvoicesOnly = (format: 'xlsx' | 'csv') => {
    const matchingInvoices = invoices.filter((inv) => {
      if (!inv || inv.status === 'cancelled') return false;
      if (selectedPOSId !== 'all' && inv.posPointId !== selectedPOSId) return false;
      return isDateInPeriod(inv.date, period, startDate, endDate);
    });

    if (format === 'xlsx') {
      exportInvoicesToExcel(matchingInvoices, posPoints, currency);
    } else {
      exportInvoicesToCSV(matchingInvoices, posPoints, currency);
    }
    setSuccessMessage(`تم تنزيل سجل الفواتير بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportSalesOnly = (format: 'xlsx' | 'csv') => {
    const matchingSales = sales.filter((s) => {
      if (!s) return false;
      if (selectedPOSId !== 'all' && s.posPointId !== selectedPOSId) return false;
      return isDateInPeriod(s.date, period, startDate, endDate);
    });

    const matchingInvoices = invoices.filter((inv) => {
      if (!inv || inv.status === 'cancelled') return false;
      if (selectedPOSId !== 'all' && inv.posPointId !== selectedPOSId) return false;
      return isDateInPeriod(inv.date, period, startDate, endDate);
    });

    if (format === 'xlsx') {
      exportSalesToExcel(matchingSales, matchingInvoices, posPoints, categories, currency);
    } else {
      exportSalesToCSV(matchingSales, matchingInvoices, posPoints, categories, currency);
    }
    setSuccessMessage(`تم تنزيل سجل المبيعات والتسليمات بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportExpensesOnly = (format: 'xlsx' | 'csv') => {
    const matchingExpenses = expenses.filter((exp) => {
      if (!exp) return false;
      return isDateInPeriod(exp.date, period, startDate, endDate);
    });

    if (format === 'xlsx') {
      exportExpensesToExcel(matchingExpenses, currency);
    } else {
      exportExpensesToCSV(matchingExpenses, currency);
    }
    setSuccessMessage(`تم تنزيل سجل المصروفات بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">تصدير البيانات المحاسبية والمطابقة المالية</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                تصدير فواتير المبيعات، المرتجعات، المصروفات، وأرصدة الموزعين بصيغة Excel أو CSV للمطابقة والترحيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* 1. Filters & Scope Section */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>تحديد نطاق وتاريخ البيانات المصدرة:</span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1 rounded-full">
                العملة: {currency}
              </span>
            </div>

            {/* Period selector */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'كل الفترات (الكل)' },
                { id: 'today', label: 'اليوم' },
                { id: '7days', label: 'آخر 7 أيام' },
                { id: 'month', label: 'الشهر الحالي' },
                { id: 'last_month', label: 'الشهر السابق' },
                { id: 'quarter', label: 'الربع الحالي' },
                { id: 'year', label: 'السنة الحالية' },
                { id: 'custom', label: 'فترة مخصصة' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id as DateFilterPeriod)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    period === item.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Dates & POS Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {period === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className={period === 'custom' ? 'sm:col-span-1' : 'sm:col-span-3'}>
                <label className="block text-xs font-medium text-slate-600 mb-1">تصفية حسب نقطة البيع / الموزع:</label>
                <select
                  value={selectedPOSId}
                  onChange={(e) => setSelectedPOSId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">جميع نقاط البيع والموزعين (شامل)</option>
                  {posPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} - (المديونية: {pos.currentDebt?.toLocaleString('ar-YE') || 0} {currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Financial Summary Preview */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4.5 text-white shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">معاينة الأرقام المحاسبية المشمولة في التصدير:</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {filteredInvoicesCount} فاتورة
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {filteredExpensesCount} سند صرف
                </span>
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {filteredSalesCount} بند مبيعات
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">صافي المبيعات</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {filteredMetrics.netSales.toLocaleString('ar-YE')} {currency}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">({filteredMetrics.netCardsSold} كارت)</div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">تكلفة الكروت (COGS)</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {filteredMetrics.netCOGS.toLocaleString('ar-YE')} {currency}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">مجمل الربح: {filteredMetrics.grossProfit.toLocaleString('ar-YE')}</div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">المصروفات التشغيلية</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">
                  {filteredMetrics.totalExpenses.toLocaleString('ar-YE')} {currency}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{filteredExpensesCount} بند صرف</div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">صافي الربح النهائي</div>
                <div className={`text-sm font-bold mt-0.5 ${filteredMetrics.netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {filteredMetrics.netProfit.toLocaleString('ar-YE')} {currency}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">هامش: {(filteredMetrics.netProfitMargin ?? 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* 3. Export Options & Format Selection */}
          <div className="space-y-4">
            {/* Format Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setExportType('excel_workbook')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition ${
                  exportType === 'excel_workbook'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>مصنف إكسيل متكامل متعدد الأوراق (.xlsx)</span>
              </button>
              <button
                onClick={() => setExportType('csv_files')}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition ${
                  exportType === 'csv_files'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Table className="w-4 h-4 text-cyan-600" />
                <span>تصدير ملفات مستقلة (Excel / CSV)</span>
              </button>
            </div>

            {exportType === 'excel_workbook' ? (
              <div className="space-y-4 pt-1">
                <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>حدد الأوراق وجداول البيانات التي ترغب بتضمينها داخل ملف الإكسيل الواحد:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'summary',
                      label: 'ورقة ملخص المطابقة وقائمة الدخل',
                      desc: 'تقرير شامل للأرباح، التدفق النقدي، وتقييم المخزون',
                      checked: includeSummary,
                      setter: setIncludeSummary,
                      icon: TrendingUp,
                    },
                    {
                      id: 'invoices',
                      label: 'ورقة سجل الفواتير والمردودات',
                      desc: `${filteredInvoicesCount} فاتورة مبيعات ومرتجع بتفاصيل المبالغ والأصناف`,
                      checked: includeInvoices,
                      setter: setIncludeInvoices,
                      icon: FileText,
                    },
                    {
                      id: 'sales',
                      label: 'ورقة تفاصيل مبيعات الكروت',
                      desc: `${filteredSalesCount} بند حركة كروت وسيريلات وأسعار التكلفة والجملة`,
                      checked: includeSales,
                      setter: setIncludeSales,
                      icon: Layers,
                    },
                    {
                      id: 'expenses',
                      label: 'ورقة سجل المصروفات وسندات الصرف',
                      desc: `${filteredExpensesCount} سند صرف وتصنيف وطرق الدفع والجهات المستلمة`,
                      checked: includeExpenses,
                      setter: setIncludeExpenses,
                      icon: Receipt,
                    },
                    {
                      id: 'posPoints',
                      label: 'ورقة كشف أرصدة ومديونيات نقاط البيع',
                      desc: `${posPoints.length} نقطة توزيع مع سقف الائتمان والمستحقات والمسددات`,
                      checked: includePOSPoints,
                      setter: setIncludePOSPoints,
                      icon: Store,
                    },
                  ].map((sheet) => {
                    const Icon = sheet.icon;
                    return (
                      <div
                        key={sheet.id}
                        onClick={() => sheet.setter(!sheet.checked)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 select-none ${
                          sheet.checked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 text-emerald-600">
                          {sheet.checked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-emerald-600" />
                            {sheet.label}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{sheet.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExportFullWorkbook}
                    disabled={isExporting || (!includeSummary && !includeInvoices && !includeSales && !includeExpenses && !includePOSPoints)}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-5 h-5" />
                    <span>تنزيل مصنف الإكسيل المحاسبي الشامل (.xlsx)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* CSV / Individual Tables Export */
              <div className="space-y-4 pt-1">
                <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-cyan-600" />
                  <span>يمكنك تنزيل كل جدول مالي بشكل مستقل بصيغة Excel أو CSV (يدعم اللغة العربية مع كود UTF-8 BOM):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Invoices */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>سجل الفواتير ({filteredInvoicesCount})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      بيانات الفواتير والمرتجعات مع المبالغ والأصناف والحسابات.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleExportInvoicesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportInvoicesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <Layers className="w-4 h-4 text-cyan-600" />
                      <span>تفاصيل المبيعات ({filteredSalesCount})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      حركات الكروت بنداً ببند مع التكلفة والجملة والربح والسيريال.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleExportSalesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportSalesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <Receipt className="w-4 h-4 text-rose-600" />
                      <span>سجل المصروفات ({filteredExpensesCount})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      سندات الصرف، التصنيفات، طرق الدفع، والمستلمين.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleExportExpensesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportExpensesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            تنسيق الملفات متوافق مع Microsoft Excel و Google Sheets والأنظمة المحاسبية الخارجية (ERP).
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
