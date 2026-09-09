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
  Printer,
  Share2,
  FileDown,
  Loader2,
  Building2,
  CreditCard,
  Clock,
  ReceiptText,
  UserCheck,
  Eye,
  Phone,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import {
  InvoiceRecord,
  ExpenseRecord,
  SalesRecord,
  PaymentRecord,
  POSPoint,
  CardCategory,
  ExpenseCategory,
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
  exportPosDebtsToExcel,
  exportPosDebtsToCSV,
} from '../utils/exportAccounting';
import {
  exportElementToPdf,
  printElementDocument,
  sharePdfToWhatsApp,
} from '../utils/pdfExport';

interface FinancialExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  posPoints?: POSPoint[];
  categories?: CardCategory[];
  expenseCategories?: ExpenseCategory[];
  settings: NetworkSettings;
  defaultPeriod?: DateFilterPeriod | string;
}

export type PdfReportType = 'financial_summary' | 'pos_statement' | 'invoices_report' | 'expenses_report';

export const FinancialExportModal: React.FC<FinancialExportModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  expenses = [],
  sales = [],
  payments = [],
  posPoints = [],
  categories = [],
  expenseCategories = [],
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
  const [exportType, setExportType] = useState<'pdf_reports' | 'excel_workbook' | 'csv_files'>('pdf_reports');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // PDF Export States
  const [pdfReportType, setPdfReportType] = useState<PdfReportType>('financial_summary');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);

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

  const filteredInvoicesList = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (!inv || inv.status === 'cancelled') return false;
        if (selectedPOSId !== 'all' && inv.posPointId !== selectedPOSId) return false;
        return isDateInPeriod(inv.date, period, startDate, endDate);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [invoices, selectedPOSId, period, startDate, endDate]);

  const filteredExpensesList = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (!exp) return false;
        return isDateInPeriod(exp.date, period, startDate, endDate);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, period, startDate, endDate]);

  const filteredSalesList = useMemo(() => {
    return sales
      .filter((s) => {
        if (!s) return false;
        if (selectedPOSId !== 'all' && s.posPointId !== selectedPOSId) return false;
        return isDateInPeriod(s.date, period, startDate, endDate);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sales, selectedPOSId, period, startDate, endDate]);

  const filteredInvoicesCount = filteredInvoicesList.length;
  const filteredExpensesCount = filteredExpensesList.length;

  const filteredSalesCount = useMemo(() => {
    const directSalesCount = filteredSalesList.length;
    const invoiceLinesCount = filteredInvoicesList.reduce((acc, inv) => acc + (inv.items?.length || 0), 0);
    return directSalesCount + invoiceLinesCount;
  }, [filteredSalesList, filteredInvoicesList]);

  // Expenses grouped by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredExpensesList.forEach((exp) => {
      const catName = exp.categoryName || exp.category || 'مصروفات تشغيلية عامة';
      if (!map[catName]) {
        map[catName] = { name: catName, total: 0, count: 0 };
      }
      map[catName].total += (exp.amount || 0);
      map[catName].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredExpensesList]);

  // Active POS Point (if selected)
  const activePosPoint = useMemo(() => {
    if (selectedPOSId === 'all') return null;
    return posPoints.find((p) => p.id === selectedPOSId) || null;
  }, [selectedPOSId, posPoints]);

  // Ledger for active POS Point (Account Statement)
  const posLedgerData = useMemo(() => {
    if (!activePosPoint) return null;

    const posInvoices = invoices.filter(
      (inv) => inv && inv.status !== 'cancelled' && inv.posPointId === activePosPoint.id
    );
    const posPayments = payments.filter(
      (pay) => pay && pay.posPointId === activePosPoint.id
    );

    interface LedgerItem {
      id: string;
      date: string;
      time?: string;
      docNumber: string;
      type: 'sale' | 'return' | 'payment';
      title: string;
      debit: number;
      credit: number;
      notes?: string;
    }

    const items: LedgerItem[] = [];

    posInvoices.forEach((inv) => {
      if (inv.type === 'return') {
        items.push({
          id: inv.id,
          date: inv.date,
          time: inv.time,
          docNumber: inv.invoiceNumber || inv.id.slice(0, 8),
          type: 'return',
          title: `فاتورة مردودات مبيعات (${inv.items?.length || 0} صنف)`,
          debit: 0,
          credit: inv.finalAmount || inv.totalAmount || 0,
          notes: inv.notes,
        });
      } else {
        const isCash = inv.paymentType === 'cash';
        items.push({
          id: inv.id,
          date: inv.date,
          time: inv.time,
          docNumber: inv.invoiceNumber || inv.id.slice(0, 8),
          type: 'sale',
          title: `فاتورة مبيعات كروت (${inv.items?.length || 0} صنف)${isCash ? ' - مسددة نقداً' : ' - آجل على الحساب'}`,
          debit: inv.finalAmount || inv.totalAmount || 0,
          credit: isCash ? (inv.finalAmount || inv.totalAmount || 0) : (inv.paidAmount || 0),
          notes: inv.notes,
        });
      }
    });

    posPayments.forEach((pay) => {
      items.push({
        id: pay.id,
        date: pay.date,
        time: pay.time,
        docNumber: pay.referenceNumber || pay.receiptNumber || pay.id.slice(0, 8),
        type: 'payment',
        title: `سند قبض / دفعة مسددة (${pay.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً'})`,
        debit: 0,
        credit: pay.amount || 0,
        notes: pay.notes,
      });
    });

    // Chronological order (oldest first)
    items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let openingBalance = 0;
    let running = 0;
    const periodItems: Array<LedgerItem & { runningBalance: number }> = [];

    for (const it of items) {
      const isBefore = period === 'custom' && startDate && it.date < startDate;
      if (isBefore) {
        openingBalance += (it.debit - it.credit);
        running = openingBalance;
      } else {
        const inScope = isDateInPeriod(it.date, period, startDate, endDate);
        if (inScope) {
          running += (it.debit - it.credit);
          periodItems.push({
            ...it,
            runningBalance: running,
          });
        }
      }
    }

    const totalDebits = periodItems.reduce((acc, it) => acc + it.debit, 0);
    const totalCredits = periodItems.reduce((acc, it) => acc + it.credit, 0);
    const closingBalance = openingBalance + totalDebits - totalCredits;

    return {
      openingBalance,
      periodItems,
      totalDebits,
      totalCredits,
      closingBalance,
    };
  }, [activePosPoint, invoices, payments, period, startDate, endDate]);

  // Label for active period
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today': return 'اليوم';
      case '7days': return 'آخر 7 أيام';
      case 'month': return 'الشهر الحالي';
      case 'last_month': return 'الشهر السابق';
      case 'quarter': return 'الربع الحالي';
      case 'year': return 'السنة الحالية';
      case 'custom': return `فترة مخصصة (من ${startDate || 'البداية'} إلى ${endDate || 'اليوم'})`;
      case 'all':
      default: return 'كافة الفترات (سجل شامل)';
    }
  }, [period, startDate, endDate]);

  const selectedPOSName = useMemo(() => {
    if (selectedPOSId === 'all') return 'كافة نقاط البيع والموزعين';
    return posPoints.find((p) => p.id === selectedPOSId)?.name || 'نقطة بيع محددة';
  }, [selectedPOSId, posPoints]);

  // Report Title
  const currentReportTitle = useMemo(() => {
    switch (pdfReportType) {
      case 'financial_summary':
        return 'التقرير المالي والمحاسبي وقائمة الدخل';
      case 'pos_statement':
        return activePosPoint ? `كشف حساب نقطة البيع: ${activePosPoint.name}` : 'كشف عام بأرصدة ومديونيات الموزعين';
      case 'invoices_report':
        return 'كشف وسجل فواتير المبيعات والمردودات';
      case 'expenses_report':
        return 'كشف وسجل المصروفات التشغيلية وسندات الصرف';
    }
  }, [pdfReportType, activePosPoint]);

  // --- Actions ---

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

  const handleExportDebtsOnly = (format: 'xlsx' | 'csv') => {
    if (format === 'xlsx') {
      exportPosDebtsToExcel(posPoints, currency);
    } else {
      exportPosDebtsToCSV(posPoints, currency);
    }
    setSuccessMessage(`تم تنزيل سجل أرصدة وديون الموزعين بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportInvoicesOnly = (format: 'xlsx' | 'csv') => {
    if (format === 'xlsx') {
      exportInvoicesToExcel(filteredInvoicesList, posPoints, currency);
    } else {
      exportInvoicesToCSV(filteredInvoicesList, posPoints, currency);
    }
    setSuccessMessage(`تم تنزيل سجل الفواتير بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportSalesOnly = (format: 'xlsx' | 'csv') => {
    if (format === 'xlsx') {
      exportSalesToExcel(filteredSalesList, filteredInvoicesList, posPoints, categories, currency);
    } else {
      exportSalesToCSV(filteredSalesList, filteredInvoicesList, posPoints, categories, currency);
    }
    setSuccessMessage(`تم تنزيل سجل المبيعات والتسليمات بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportExpensesOnly = (format: 'xlsx' | 'csv') => {
    if (format === 'xlsx') {
      exportExpensesToExcel(filteredExpensesList, currency);
    } else {
      exportExpensesToCSV(filteredExpensesList, currency);
    }
    setSuccessMessage(`تم تنزيل سجل المصروفات بصيغة (${format.toUpperCase()}) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- PDF Export Handlers ---

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const cleanNetwork = (settings?.networkName || 'الشبكة').replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      let filename = '';

      if (pdfReportType === 'financial_summary') {
        filename = `التقرير_المالي_الشامل_${cleanNetwork}_${dateStr}.pdf`;
      } else if (pdfReportType === 'pos_statement') {
        const pName = (activePosPoint ? activePosPoint.name : 'كافة_الموزعين').replace(/\s+/g, '_');
        filename = `كشف_حساب_${pName}_${dateStr}.pdf`;
      } else if (pdfReportType === 'invoices_report') {
        filename = `سجل_الفواتير_${cleanNetwork}_${dateStr}.pdf`;
      } else {
        filename = `سجل_المصروفات_${cleanNetwork}_${dateStr}.pdf`;
      }

      const ok = await exportElementToPdf('financial-pdf-report-document', {
        filename,
        title: currentReportTitle,
        orientation: pdfOrientation,
        format: 'a4',
        scale: 2.4,
      });

      if (ok) {
        setSuccessMessage('تم تصدير وحفظ مستند الـ PDF بنجاح فائق الدقة!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    setIsPrintingPdf(true);
    try {
      await printElementDocument('financial-pdf-report-document', {
        orientation: pdfOrientation,
        format: 'a4',
        scale: 2.4,
      });
    } catch (err) {
      console.error('PDF print failed:', err);
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharingPdf(true);
    try {
      const targetPhone = activePosPoint?.phone || settings?.whatsappNumber || settings?.supportPhone || '';
      const cleanNetwork = (settings?.networkName || 'الشبكة').replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${currentReportTitle.replace(/\s+/g, '_')}_${cleanNetwork}_${dateStr}.pdf`;

      const messageText = `مرحباً بك، مرفق طيه *${currentReportTitle}* الصادر من *${settings?.networkName || 'إدارة الشبكة'}* للفترة (${periodLabel}).`;

      await sharePdfToWhatsApp('financial-pdf-report-document', {
        filename,
        title: currentReportTitle,
        phone: targetPhone,
        messageText,
        orientation: pdfOrientation,
        format: 'a4',
      });

      setSuccessMessage('تم تجهيز المستند للمشاركة عبر واتساب بنجاح!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error('WhatsApp share failed:', err);
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">تصدير التقارير المالية وكشوف الحسابات</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                تصدير تقارير PDF رسمية قابلة للطباعة والمشاركة، ومصنفات Excel وجداول CSV للمطابقة والترحيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          
          {/* 1. Filters & Scope Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>تحديد نطاق وتاريخ البيانات المصدرة:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1 rounded-full">
                  العملة: {currency}
                </span>
                {settings?.networkName && (
                  <span className="text-xs bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-full">
                    {settings.networkName}
                  </span>
                )}
              </div>
            </div>

            {/* Period selector */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
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

              <div className={period === 'custom' ? 'sm:col-span-2' : 'sm:col-span-4'}>
                <label className="block text-xs font-medium text-slate-600 mb-1">تصفية حسب نقطة البيع / الموزع:</label>
                <select
                  value={selectedPOSId}
                  onChange={(e) => setSelectedPOSId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">جميع نقاط البيع والموزعين (شامل كافة الموزعين)</option>
                  {posPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} - (المسؤول: {pos.managerName || 'الإدارة'} | المديونية: {(pos.currentDebt || 0).toLocaleString('ar-YE')} {currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Main Export Tabs (PDF / Excel / CSV) */}
          <div className="space-y-4">
            <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
              <button
                onClick={() => setExportType('pdf_reports')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  exportType === 'pdf_reports'
                    ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileDown className="w-4 h-4 text-rose-600" />
                <span>تقارير وكشوف حسابات PDF رسمية (طباعة ومشاركة)</span>
              </button>

              <button
                onClick={() => setExportType('excel_workbook')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
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
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  exportType === 'csv_files'
                    ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Table className="w-4 h-4 text-cyan-600" />
                <span>تصدير ملفات مستقلة (Excel / CSV)</span>
              </button>
            </div>

            {/* TAB 1: PDF EXPORT & PREVIEW */}
            {exportType === 'pdf_reports' && (
              <div className="space-y-4 pt-1">
                {/* PDF Sub-Type Selector Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: 'financial_summary' as const,
                      title: 'التقرير المالي الشامل',
                      desc: 'قائمة الدخل والأرباح والمصروفات',
                      icon: TrendingUp,
                      color: 'emerald',
                    },
                    {
                      id: 'pos_statement' as const,
                      title: activePosPoint ? `كشف حساب: ${activePosPoint.name}` : 'كشف حسابات الموزعين',
                      desc: activePosPoint ? 'سجل الحركات والرصيد التراكمي' : 'أرصدة ومديونيات كافة نقاط البيع',
                      icon: Store,
                      color: 'indigo',
                    },
                    {
                      id: 'invoices_report' as const,
                      title: 'سجل الفواتير والمبيعات',
                      desc: `${filteredInvoicesCount} فاتورة ومردودات مبيعات`,
                      icon: FileText,
                      color: 'cyan',
                    },
                    {
                      id: 'expenses_report' as const,
                      title: 'سجل المصروفات والنفقات',
                      desc: `${filteredExpensesCount} سند صرف ومصروف`,
                      icon: Receipt,
                      color: 'rose',
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = pdfReportType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setPdfReportType(tab.id)}
                        className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-rose-50/80 border-rose-400 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-slate-500'}`} />
                          {isActive && <CheckCircle className="w-3.5 h-3.5 text-rose-600" />}
                        </div>
                        <div className="text-xs font-bold truncate">{tab.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">{tab.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* PDF Action Bar (Download, Print, WhatsApp, Orientation, Signatures) */}
                <div className="bg-slate-900 rounded-xl p-3.5 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Orientation */}
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                      <button
                        onClick={() => setPdfOrientation('portrait')}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          pdfOrientation === 'portrait' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        A4 عمودي
                      </button>
                      <button
                        onClick={() => setPdfOrientation('landscape')}
                        className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                          pdfOrientation === 'landscape' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        A4 أفقي
                      </button>
                    </div>

                    {/* Include Signatures Toggle */}
                    <button
                      onClick={() => setIncludeSignatures(!includeSignatures)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        includeSignatures
                          ? 'bg-slate-800 border-slate-600 text-emerald-300'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{includeSignatures ? 'التوقيعات والختم: مفعل' : 'التوقيعات والختم: معطل'}</span>
                    </button>
                  </div>

                  {/* Primary PDF Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* WhatsApp */}
                    <button
                      onClick={handleShareWhatsApp}
                      disabled={isExportingPdf || isPrintingPdf || isSharingPdf}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      title="مشاركة كملف PDF مباشرة عبر واتساب"
                    >
                      {isSharingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>مشاركة واتساب PDF</span>
                    </button>

                    {/* Print */}
                    <button
                      onClick={handlePrintPdf}
                      disabled={isExportingPdf || isPrintingPdf || isSharingPdf}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      title="طباعة التقرير فوراً على ورق A4"
                    >
                      {isPrintingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                      <span>طباعة A4</span>
                    </button>

                    {/* Download PDF */}
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isExportingPdf || isPrintingPdf || isSharingPdf}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-rose-900/30 cursor-pointer"
                      title="توليد وتنزيل ملف PDF عالي الجودة"
                    >
                      {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      <span>تنزيل ملف PDF</span>
                    </button>
                  </div>
                </div>

                {/* Live PDF Document Preview Box */}
                <div className="border border-slate-200 rounded-xl bg-slate-100 p-3 sm:p-5 overflow-x-auto max-h-[500px] overflow-y-auto">
                  <div className="text-xs text-slate-500 mb-2 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      معاينة حية للمستند الجاهز للتصدير والطباعة:
                    </span>
                    <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      ورق A4 {pdfOrientation === 'landscape' ? 'أفقي' : 'عمودي'}
                    </span>
                  </div>

                  {/* The Document Container that is captured for PDF generation */}
                  <div
                    id="financial-pdf-report-document"
                    dir="rtl"
                    className={`bg-white border border-slate-300 rounded-lg shadow-md mx-auto p-6 sm:p-8 text-slate-900 font-sans ${
                      pdfOrientation === 'landscape' ? 'max-w-[1050px]' : 'max-w-[760px]'
                    }`}
                    style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-4 mb-5 flex items-start justify-between">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {settings?.networkName || 'شبكة لاسلكية'}
                        </h1>
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          {settings?.networkSlogan || 'نظام إدارة ونقاط بيع وتوزيع كروت الشبكة والمحاسبة المالية'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                          {settings?.supportPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {settings.supportPhone}
                            </span>
                          )}
                          <span>• العملة: {currency}</span>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs rounded-md shadow-xs">
                          {currentReportTitle}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1.5 font-mono">
                          رقم التقرير: FIN-{Date.now().toString().slice(-6)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Scope / Period Banner */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-800">فترة التقرير:</span>
                        <span className="font-semibold text-emerald-800">{periodLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-bold text-slate-800">نطاق التوزيع:</span>
                        <span className="font-semibold text-indigo-800">{selectedPOSName}</span>
                      </div>
                    </div>

                    {/* ======================================================== */}
                    {/* REPORT CONTENT 1: COMPREHENSIVE FINANCIAL STATEMENT      */}
                    {/* ======================================================== */}
                    {pdfReportType === 'financial_summary' && (
                      <div className="space-y-6">
                        {/* Financial Highlights KPIs */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            مؤشرات الأداء المالي والأرباح وقائمة الدخل:
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                            <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                              <div className="text-[11px] text-slate-500">صافي المبيعات</div>
                              <div className="text-sm font-bold text-emerald-700 mt-0.5">
                                {(filteredMetrics.netSales ?? 0).toLocaleString('ar-YE')} {currency}
                              </div>
                              <div className="text-[10px] text-slate-400">({filteredMetrics.netCardsSold ?? 0} كارت)</div>
                            </div>
                            <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                              <div className="text-[11px] text-slate-500">تكلفة الكروت (COGS)</div>
                              <div className="text-sm font-bold text-amber-700 mt-0.5">
                                {(filteredMetrics.netCOGS ?? 0).toLocaleString('ar-YE')} {currency}
                              </div>
                              <div className="text-[10px] text-slate-400">مجمل الربح: {(filteredMetrics.grossProfit ?? 0).toLocaleString('ar-YE')}</div>
                            </div>
                            <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                              <div className="text-[11px] text-slate-500">المصروفات التشغيلية</div>
                              <div className="text-sm font-bold text-rose-700 mt-0.5">
                                {(filteredMetrics.totalExpenses ?? 0).toLocaleString('ar-YE')} {currency}
                              </div>
                              <div className="text-[10px] text-slate-400">{filteredExpensesCount} سند صرف</div>
                            </div>
                            <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded-lg">
                              <div className="text-[11px] text-slate-500">صافي الربح النهائي</div>
                              <div className={`text-sm font-bold mt-0.5 ${(filteredMetrics.netProfit ?? 0) >= 0 ? 'text-cyan-700' : 'text-rose-700'}`}>
                                {(filteredMetrics.netProfit ?? 0).toLocaleString('ar-YE')} {currency}
                              </div>
                              <div className="text-[10px] text-slate-400">هامش: {(filteredMetrics.netProfitMargin ?? 0).toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Cash & Debts Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              حركة التحصيل والسيولة النقدية:
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-600 py-0.5 border-b border-slate-100">
                                <span>إجمالي النقدية المحصلة من الفواتير:</span>
                                <span className="font-bold text-slate-900">{(filteredMetrics.invoicesCashTotal ?? 0).toLocaleString('ar-YE')} {currency}</span>
                              </div>
                              <div className="flex justify-between text-slate-600 py-0.5 border-b border-slate-100">
                                <span>إجمالي سندات القبض والدفعات:</span>
                                <span className="font-bold text-slate-900">{(filteredMetrics.totalPaymentsReceived ?? 0).toLocaleString('ar-YE')} {currency}</span>
                              </div>
                              <div className="flex justify-between text-slate-800 font-bold py-1 bg-emerald-50/50 px-1 rounded mt-1">
                                <span>إجمالي التدفق النقدي الوارد:</span>
                                <span className="text-emerald-700">{(filteredMetrics.totalCashCollected ?? 0).toLocaleString('ar-YE')} {currency}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border border-slate-200 rounded-lg p-3">
                            <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5 text-indigo-600" />
                              الائتمان ومديونيات الموزعين:
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-600 py-0.5 border-b border-slate-100">
                                <span>مبيعات الفواتير الآجلة:</span>
                                <span className="font-bold text-slate-900">{(filteredMetrics.invoicesDebtTotal ?? 0).toLocaleString('ar-YE')} {currency}</span>
                              </div>
                              <div className="flex justify-between text-slate-600 py-0.5 border-b border-slate-100">
                                <span>عدد نقاط البيع المدينة:</span>
                                <span className="font-bold text-slate-900">{posPoints.filter(p => (p.currentDebt || 0) > 0).length} نقطة</span>
                              </div>
                              <div className="flex justify-between text-slate-800 font-bold py-1 bg-indigo-50/50 px-1 rounded mt-1">
                                <span>إجمالي المديونيات الحالية المستحقة:</span>
                                <span className="text-indigo-700">{(filteredMetrics.totalPOSDebt ?? 0).toLocaleString('ar-YE')} {currency}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expense Categories Breakdown Table */}
                        {expensesByCategory.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-rose-600" />
                              تحليل المصروفات التشغيلية حسب البنود:
                            </h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2">البند / التصنيف</th>
                                    <th className="p-2 text-center">عدد السندات</th>
                                    <th className="p-2 text-center">النسبة %</th>
                                    <th className="p-2 text-left">المبلغ الإجمالي</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {expensesByCategory.map((cat, idx) => {
                                    const pct = filteredMetrics.totalExpenses > 0 ? ((cat.total / filteredMetrics.totalExpenses) * 100).toFixed(1) : '0';
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2 font-medium text-slate-900">{cat.name}</td>
                                        <td className="p-2 text-center text-slate-600">{cat.count}</td>
                                        <td className="p-2 text-center text-slate-600">{pct}%</td>
                                        <td className="p-2 text-left font-bold text-slate-900">
                                          {cat.total.toLocaleString('ar-YE')} {currency}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                  <tr>
                                    <td className="p-2" colSpan={3}>إجمالي المصروفات التشغيلية:</td>
                                    <td className="p-2 text-left text-rose-700">
                                      {(filteredMetrics.totalExpenses ?? 0).toLocaleString('ar-YE')} {currency}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* REPORT CONTENT 2: POS ACCOUNT STATEMENT                  */}
                    {/* ======================================================== */}
                    {pdfReportType === 'pos_statement' && (
                      <div className="space-y-5">
                        {activePosPoint ? (
                          /* Detailed Statement for Single POS Point */
                          <>
                            {/* POS Info Card */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                              <div>
                                <span className="text-slate-500 block text-[10px]">اسم الموزع / المحل:</span>
                                <strong className="text-slate-900 text-sm font-bold">{activePosPoint.name}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">المسؤول / الهاتف:</span>
                                <span className="text-slate-800 font-medium">
                                  {activePosPoint.managerName || 'الإدارة'} {activePosPoint.phone ? `(${activePosPoint.phone})` : ''}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">سقف الائتمان المسموح:</span>
                                <span className="text-slate-800 font-bold">
                                  {(activePosPoint.creditLimit || 0).toLocaleString('ar-YE')} {currency}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">الرصيد / المديونية الحالية:</span>
                                <span className="text-rose-700 text-sm font-black">
                                  {(activePosPoint.currentDebt || 0).toLocaleString('ar-YE')} {currency}
                                </span>
                              </div>
                            </div>

                            {/* POS Ledger Math Cards */}
                            {posLedgerData && (
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                                  <div className="text-[10px] text-slate-500">الرصيد السابق المنقول</div>
                                  <div className="font-bold text-slate-800 mt-0.5">
                                    {(posLedgerData.openingBalance ?? 0).toLocaleString('ar-YE')} {currency}
                                  </div>
                                </div>
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                                  <div className="text-[10px] text-slate-500">إجمالي المسحوبات (مدين)</div>
                                  <div className="font-bold text-emerald-700 mt-0.5">
                                    {(posLedgerData.totalDebits ?? 0).toLocaleString('ar-YE')} {currency}
                                  </div>
                                </div>
                                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                                  <div className="text-[10px] text-slate-500">إجمالي المسددات (دائن)</div>
                                  <div className="font-bold text-cyan-700 mt-0.5">
                                    {(posLedgerData.totalCredits ?? 0).toLocaleString('ar-YE')} {currency}
                                  </div>
                                </div>
                                <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                                  <div className="text-[10px] text-rose-600 font-bold">الرصيد المستحق النهائي</div>
                                  <div className="font-black text-rose-800 mt-0.5">
                                    {(posLedgerData.closingBalance ?? 0).toLocaleString('ar-YE')} {currency}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Detailed Transactions Ledger Table */}
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                سجل الحركات المالية ومطابقة الحساب:
                              </h4>
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="p-2">التاريخ</th>
                                      <th className="p-2">رقم المستند</th>
                                      <th className="p-2">البيان / نوع الحركة</th>
                                      <th className="p-2 text-left">مدين (+)</th>
                                      <th className="p-2 text-left">دائن (-)</th>
                                      <th className="p-2 text-left">الرصيد</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {posLedgerData && posLedgerData.periodItems.length > 0 ? (
                                      posLedgerData.periodItems.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="p-2 text-slate-600 font-mono">{it.date}</td>
                                          <td className="p-2 font-mono font-bold text-slate-700">{it.docNumber}</td>
                                          <td className="p-2 font-medium text-slate-900">{it.title}</td>
                                          <td className="p-2 text-left font-bold text-emerald-700">
                                            {it.debit > 0 ? `${it.debit.toLocaleString('ar-YE')}` : '-'}
                                          </td>
                                          <td className="p-2 text-left font-bold text-cyan-700">
                                            {it.credit > 0 ? `${it.credit.toLocaleString('ar-YE')}` : '-'}
                                          </td>
                                          <td className="p-2 text-left font-black text-slate-900">
                                            {it.runningBalance.toLocaleString('ar-YE')}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="p-4 text-center text-slate-500">
                                          لا توجد حركات مسجلة لنقطة البيع خلال الفترة المحددة
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* General Statement of All POS Points */
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-indigo-600" />
                                جدول أرصدة ومديونيات كافة نقاط البيع والموزعين ({posPoints.length}):
                              </h4>
                              <span className="text-xs text-rose-700 font-bold">
                                إجمالي المديونيات: {posPoints.reduce((acc, p) => acc + (p.currentDebt || 0), 0).toLocaleString('ar-YE')} {currency}
                              </span>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2">#</th>
                                    <th className="p-2">نقطة البيع / المحل</th>
                                    <th className="p-2">المسؤول / الهاتف</th>
                                    <th className="p-2 text-center">سقف الائتمان</th>
                                    <th className="p-2 text-left">الرصيد المستحق (المديونية)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {posPoints.map((pos, idx) => (
                                    <tr key={pos.id} className="hover:bg-slate-50">
                                      <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                                      <td className="p-2 font-bold text-slate-900">{pos.name}</td>
                                      <td className="p-2 text-slate-600">
                                        {pos.managerName || 'الإدارة'} {pos.phone ? `• ${pos.phone}` : ''}
                                      </td>
                                      <td className="p-2 text-center font-mono text-slate-600">
                                        {(pos.creditLimit || 0).toLocaleString('ar-YE')} {currency}
                                      </td>
                                      <td className="p-2 text-left font-black text-rose-700 font-mono">
                                        {(pos.currentDebt || 0).toLocaleString('ar-YE')} {currency}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                  <tr>
                                    <td className="p-2" colSpan={4}>الإجمالي العام لمديونيات الموزعين:</td>
                                    <td className="p-2 text-left text-rose-700 font-black">
                                      {posPoints.reduce((acc, p) => acc + (p.currentDebt || 0), 0).toLocaleString('ar-YE')} {currency}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* REPORT CONTENT 3: INVOICES LEDGER REPORT                 */}
                    {/* ======================================================== */}
                    {pdfReportType === 'invoices_report' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>سجل فواتير المبيعات والمرتجعات ({filteredInvoicesCount} فاتورة):</span>
                          <span>
                            إجمالي الفواتير: {filteredInvoicesList.reduce((acc, inv) => acc + (inv.finalAmount || inv.totalAmount || 0), 0).toLocaleString('ar-YE')} {currency}
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-2">رقم الفاتورة</th>
                                <th className="p-2">التاريخ</th>
                                <th className="p-2">نقطة البيع / العميل</th>
                                <th className="p-2 text-center">نوع الدفع</th>
                                <th className="p-2 text-center">الأصناف</th>
                                <th className="p-2 text-left">الإجمالي</th>
                                <th className="p-2 text-left">المسدد</th>
                                <th className="p-2 text-left">المتبقي</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredInvoicesList.length > 0 ? (
                                filteredInvoicesList.slice(0, 50).map((inv) => {
                                  const total = inv.finalAmount || inv.totalAmount || 0;
                                  const paid = inv.paymentType === 'cash' ? total : (inv.paidAmount || 0);
                                  const remaining = Math.max(0, total - paid);
                                  const posName = posPoints.find((p) => p.id === inv.posPointId)?.name || 'مبيعات مباشرة';
                                  return (
                                    <tr key={inv.id} className="hover:bg-slate-50">
                                      <td className="p-2 font-mono font-bold text-slate-900">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                                      <td className="p-2 text-slate-600 font-mono">{inv.date}</td>
                                      <td className="p-2 text-slate-800 font-medium">{posName}</td>
                                      <td className="p-2 text-center text-slate-600">
                                        {inv.paymentType === 'cash' ? 'نقداً' : 'آجل'}
                                      </td>
                                      <td className="p-2 text-center text-slate-600">{inv.items?.length || 0}</td>
                                      <td className="p-2 text-left font-bold text-slate-900">{total.toLocaleString('ar-YE')}</td>
                                      <td className="p-2 text-left font-bold text-emerald-700">{paid.toLocaleString('ar-YE')}</td>
                                      <td className="p-2 text-left font-bold text-rose-700">
                                        {remaining > 0 ? remaining.toLocaleString('ar-YE') : '0'}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={8} className="p-4 text-center text-slate-500">
                                    لا توجد فواتير مطابقة لمعايير البحث في الفترة المحددة
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {filteredInvoicesList.length > 50 && (
                          <div className="text-[11px] text-slate-500 text-center">
                            * تم عرض أول 50 فاتورة في المعاينة — يشتمل ملف التصدير الكامل على كافة الفواتير ({filteredInvoicesList.length}).
                          </div>
                        )}
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* REPORT CONTENT 4: EXPENSES LEDGER REPORT                 */}
                    {/* ======================================================== */}
                    {pdfReportType === 'expenses_report' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>سجل المصروفات وسندات الصرف ({filteredExpensesCount} سند):</span>
                          <span className="text-rose-700">
                            إجمالي النفقات: {filteredExpensesList.reduce((acc, exp) => acc + (exp.amount || 0), 0).toLocaleString('ar-YE')} {currency}
                          </span>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-2">رقم السند</th>
                                <th className="p-2">التاريخ</th>
                                <th className="p-2">التصنيف / البند</th>
                                <th className="p-2">الجهة المستلمة</th>
                                <th className="p-2 text-center">طريقة الدفع</th>
                                <th className="p-2 text-left">المبلغ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredExpensesList.length > 0 ? (
                                filteredExpensesList.slice(0, 50).map((exp) => (
                                  <tr key={exp.id} className="hover:bg-slate-50">
                                    <td className="p-2 font-mono font-bold text-slate-900">{exp.receiptNumber || exp.id.slice(0, 8)}</td>
                                    <td className="p-2 text-slate-600 font-mono">{exp.date}</td>
                                    <td className="p-2 font-medium text-slate-900">{exp.categoryName || exp.category || 'مصروف عام'}</td>
                                    <td className="p-2 text-slate-700">{exp.recipient || 'غير محدد'}</td>
                                    <td className="p-2 text-center text-slate-600">
                                      {exp.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً'}
                                    </td>
                                    <td className="p-2 text-left font-bold text-rose-700 font-mono">
                                      {(exp.amount || 0).toLocaleString('ar-YE')} {currency}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-slate-500">
                                    لا توجد سندات صرف مطابقة لمعايير البحث في الفترة المحددة
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {filteredExpensesList.length > 50 && (
                          <div className="text-[11px] text-slate-500 text-center">
                            * تم عرض أول 50 سند صرف في المعاينة — يشتمل ملف التصدير الكامل على كافة السندات ({filteredExpensesList.length}).
                          </div>
                        )}
                      </div>
                    )}

                    {/* Official Signatures & Stamp Footer */}
                    {includeSignatures && (
                      <div className="mt-8 pt-6 border-t border-slate-300">
                        <div className="grid grid-cols-3 gap-4 text-center text-xs">
                          <div>
                            <div className="text-slate-500 text-[11px] mb-8 font-medium">إعداد المسؤول المالي / المحاسب:</div>
                            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-bold">
                              التوقيع: ................................
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-[11px] mb-8 font-medium">مراجعة وتدقيق الإدارة:</div>
                            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-bold">
                              التوقيع: ................................
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg w-28 h-16 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">
                              ختم الاعتماد الرسمي
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
                          {settings?.statementFooterText || 'مستند وتقرير مالي رسمي معتمد صادر من النظام المحاسبي للشبكة • يرجى المطابقة وإبداء أي ملاحظات خلال 3 أيام'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXCEL WORKBOOK */}
            {exportType === 'excel_workbook' && (
              <div className="space-y-4 pt-1">
                <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>حدد الأوراق وجداول البيانات التي ترغب بتضمينها داخل ملف الإكسيل الواحد (.xlsx):</span>
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
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowDownToLine className="w-5 h-5" />}
                    <span>تنزيل مصنف الإكسيل المحاسبي الشامل (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: CSV & INDIVIDUAL EXCEL */}
            {exportType === 'csv_files' && (
              <div className="space-y-4 pt-1">
                <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-cyan-600" />
                  <span>يمكنك تنزيل كل جدول مالي بشكل مستقل بصيغة Excel أو CSV (يدعم اللغة العربية مع كود UTF-8 BOM):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Debts */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <Store className="w-4 h-4 text-indigo-600" />
                      <span>ديون وأرصدة الموزعين ({posPoints.length})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      تفاصيل ديون وأرصدة ومسحوبات نقاط البيع والموزعين.
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleExportDebtsOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportDebtsOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>

                  {/* Invoices */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>سجل الفواتير ({filteredInvoicesCount})</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      بيانات الفواتير والمرتجعات مع المبالغ والأصناف والحسابات.
                    </p>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleExportInvoicesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportInvoicesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
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
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleExportSalesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportSalesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
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
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleExportExpensesOnly('xlsx')}
                        className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleExportExpensesOnly('csv')}
                        className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
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
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            يدعم النظام تصدير تقارير PDF رسمية عالية الدقة، بالإضافة إلى ملفات Microsoft Excel و Google Sheets.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
