import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  Printer,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Scale,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowDownToLine,
  Loader2,
  ChevronDown,
  Info,
  Layers,
  Search,
  BookOpen,
} from 'lucide-react';
import {
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  POSPoint,
  CardCategory,
  PaymentRecord,
  NetworkSettings,
  Customer,
  SalesRecord,
} from '../types';
import { exportTrialBalanceToExcel, TrialBalanceItem, fmtNum } from '../utils/exportAccounting';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';
import { isDateInPeriod } from '../utils/financialCalculations';

interface TrialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  posPoints: POSPoint[];
  customers: Customer[];
  categories: CardCategory[];
  payments: PaymentRecord[];
  sales?: SalesRecord[];
  settings: NetworkSettings;
}

export const TrialBalanceModal: React.FC<TrialBalanceModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  expenses = [],
  expenseCategories = [],
  posPoints = [],
  customers = [],
  categories = [],
  payments = [],
  sales = [],
  settings,
}) => {
  const currency = settings.currencySymbol || 'ر.ي';
  const networkName = settings.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  // Month & Year Auditing Period State
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'q3' | 'year' | 'all'>('this_month');

  // Selected account for drill-down modal / detail view
  const [selectedAccountForDrilldown, setSelectedAccountForDrilldown] = useState<TrialBalanceItem | null>(null);

  // Export Loading States
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Month Names in Arabic
  const monthsArabic = [
    'يناير (شهر 1)',
    'فبراير (شهر 2)',
    'مارس (شهر 3)',
    'أبريل (شهر 4)',
    'مايو (شهر 5)',
    'يونيو (شهر 6)',
    'يوليو (شهر 7)',
    'أغسطس (شهر 8)',
    'سبتمبر (شهر 9)',
    'أكتوبر (شهر 10)',
    'نوفمبر (شهر 11)',
    'ديسمبر (شهر 12)',
  ];

  // Calculate Date Boundaries based on selected period
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    if (periodPreset === 'all') {
      return {
        startDateStr: '2020-01-01',
        endDateStr: '2030-12-31',
        periodLabel: 'كافة الفترات المالية السابقة والحالية',
      };
    }
    if (periodPreset === 'year') {
      return {
        startDateStr: `${selectedYear}-01-01`,
        endDateStr: `${selectedYear}-12-31`,
        periodLabel: `السنة المالية ${selectedYear}`,
      };
    }
    if (periodPreset === 'last_month') {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const mStr = String(prevMonth).padStart(2, '0');
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      return {
        startDateStr: `${prevYear}-${mStr}-01`,
        endDateStr: `${prevYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `شهر ${monthsArabic[prevMonth - 1]} ${prevYear}`,
      };
    }

    // Default: this selected month
    const mStr = String(selectedMonth).padStart(2, '0');
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return {
      startDateStr: `${selectedYear}-${mStr}-01`,
      endDateStr: `${selectedYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: `شهر ${monthsArabic[selectedMonth - 1]} ${selectedYear}`,
    };
  }, [selectedYear, selectedMonth, periodPreset]);

  // Filter records in the chosen audit period
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv || !inv.date) return false;
      return inv.date >= startDateStr && inv.date <= endDateStr;
    });
  }, [invoices, startDateStr, endDateStr]);

  const periodExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp || !exp.date) return false;
      return exp.date >= startDateStr && exp.date <= endDateStr;
    });
  }, [expenses, startDateStr, endDateStr]);

  const periodPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!p || !p.date) return false;
      return p.date >= startDateStr && p.date <= endDateStr;
    });
  }, [payments, startDateStr, endDateStr]);

  // Monthly Invoices Audit & Reconciliation Metrics
  const reconciliationMetrics = useMemo(() => {
    const validInvoices = periodInvoices.filter((i) => i.status !== 'cancelled');
    const draftInvoices = periodInvoices.filter((i) => i.status === 'draft');
    const cancelledInvoices = periodInvoices.filter((i) => i.status === 'cancelled');

    const salesInvoices = validInvoices.filter((i) => i.type === 'sale');
    const returnInvoices = validInvoices.filter((i) => i.type === 'return');

    let totalInvoicesSales = 0;
    let totalCashSales = 0;
    let totalCreditSales = 0;
    let totalCostOfSales = 0;

    salesInvoices.forEach((inv) => {
      const amt = inv.totalWholesaleAmount || inv.totalRetailAmount || 0;
      totalInvoicesSales += amt;
      totalCostOfSales += inv.totalCostAmount || 0;
      if (inv.paymentType === 'cash') {
        totalCashSales += amt;
      } else {
        totalCreditSales += amt;
      }
    });

    let totalReturnsAmount = 0;
    let totalReturnsCost = 0;
    returnInvoices.forEach((inv) => {
      const amt = inv.totalWholesaleAmount || inv.totalRetailAmount || 0;
      totalReturnsAmount += amt;
      totalReturnsCost += inv.totalCostAmount || 0;
    });

    const netSalesRevenue = totalInvoicesSales - totalReturnsAmount;
    const netCOGS = totalCostOfSales - totalReturnsCost;

    // Payments
    const totalPaymentsAmount = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashPayments = periodPayments
      .filter((p) => p.paymentMethod !== 'bank_transfer')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const bankPayments = periodPayments
      .filter((p) => p.paymentMethod === 'bank_transfer')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Expenses
    const totalExpensesAmount = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const cashExpenses = periodExpenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const bankExpenses = periodExpenses
      .filter((e) => e.paymentMethod === 'bank_transfer')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalInvoicesCount: validInvoices.length,
      draftCount: draftInvoices.length,
      cancelledCount: cancelledInvoices.length,
      totalInvoicesSales,
      totalReturnsAmount,
      netSalesRevenue,
      netCOGS,
      totalCashSales,
      totalCreditSales,
      totalPaymentsAmount,
      cashPayments,
      bankPayments,
      totalExpensesAmount,
      cashExpenses,
      bankExpenses,
      isBalanced: true,
      difference: 0,
    };
  }, [periodInvoices, periodExpenses, periodPayments]);

  // Construct Trial Balance Accounts (ميزان المراجعة بالمجاميع والأرصدة)
  const trialBalanceItems: TrialBalanceItem[] = useMemo(() => {
    const list: TrialBalanceItem[] = [];

    // 101: الصندوق الرئيسي (الخزينة النقدية)
    // المدين: المبيعات النقدية + المقبوضات النقدية
    // الدائن: المصروفات النقدية المسددة
    const cashDebit = reconciliationMetrics.totalCashSales + reconciliationMetrics.cashPayments;
    const cashCredit = reconciliationMetrics.cashExpenses;
    const cashNet = cashDebit - cashCredit;
    list.push({
      code: '101',
      name: 'الصندوق الرئيسي (الخزينة النقدية)',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: cashDebit,
      creditMovement: cashCredit,
      debitBalance: cashNet >= 0 ? cashNet : 0,
      creditBalance: cashNet < 0 ? Math.abs(cashNet) : 0,
      notes: 'المقبوضات النقدية والمبيعات الكاش مخصوماً منها المصروفات',
    });

    // 102: الحسابات البنكية وحسابات الصرافين
    const bankDebit = reconciliationMetrics.bankPayments;
    const bankCredit = reconciliationMetrics.bankExpenses;
    const bankNet = bankDebit - bankCredit;
    list.push({
      code: '102',
      name: 'الحسابات البنكية ومحافظ الصرافين',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: bankDebit,
      creditMovement: bankCredit,
      debitBalance: bankNet >= 0 ? bankNet : 0,
      creditBalance: bankNet < 0 ? Math.abs(bankNet) : 0,
      notes: 'التحويلات المصرفية ومحافظ الدفع الإلكتروني',
    });

    // 110: مديونيات نقاط البيع والعملاء (الذمم المدينة)
    // المدين: الفواتير الآجلة الصادرة
    // الدائن: المرتجعات + سندات القبض المحصلة
    const recDebit = reconciliationMetrics.totalCreditSales;
    const recCredit = reconciliationMetrics.totalReturnsAmount + reconciliationMetrics.totalPaymentsAmount;
    const recNet = recDebit - recCredit;
    list.push({
      code: '110',
      name: 'مديونيات نقاط البيع والعملاء (الذمم المدينة)',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: recDebit,
      creditMovement: recCredit,
      debitBalance: recNet >= 0 ? recNet : 0,
      creditBalance: recNet < 0 ? Math.abs(recNet) : 0,
      notes: 'المسحوبات الآجلة مقابل السدادات والمرتجعات للفترة',
    });

    // 120: مخزون كروت الشبكة بالمستودع
    // تقدير قيمة المخزون الحالي
    const stockValuation = categories.reduce(
      (sum, cat) => sum + (cat.availableCards || 0) * (cat.costPrice || 0),
      0
    );
    list.push({
      code: '120',
      name: 'مخزون كروت الشبكة (بالمستودع)',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: stockValuation + reconciliationMetrics.netCOGS,
      creditMovement: reconciliationMetrics.netCOGS,
      debitBalance: stockValuation,
      creditBalance: 0,
      notes: 'قيمة الرصيد الحالي للكروت الجاهزة بسعر التكلفة',
    });

    // 401: إيرادات مبيعات كروت الشبكة (Gross Sales)
    list.push({
      code: '401',
      name: 'إيرادات مبيعات كروت الشبكة',
      category: 'الإيرادات التشغيلية',
      nature: 'دائن',
      debitMovement: 0,
      creditMovement: reconciliationMetrics.totalInvoicesSales,
      debitBalance: 0,
      creditBalance: reconciliationMetrics.totalInvoicesSales,
      notes: 'إجمالي قيمة الفواتير الصادرة قبل الخصم والمرتجع',
    });

    // 402: مردودات ومسموحات المبيعات (Sales Returns)
    list.push({
      code: '402',
      name: 'مردودات ومسموحات مبيعات الكروت',
      category: 'مخفضات الإيرادات',
      nature: 'مدين',
      debitMovement: reconciliationMetrics.totalReturnsAmount,
      creditMovement: 0,
      debitBalance: reconciliationMetrics.totalReturnsAmount,
      creditBalance: 0,
      notes: 'قيمة الكروت المرتجعة المسجلة بفواتير مرتجع',
    });

    // 501: تكلفة الكروت المباعة (Cost of Goods Sold - COGS)
    list.push({
      code: '501',
      name: 'تكلفة الكروت المباعة (COGS)',
      category: 'تكاليف النشاط',
      nature: 'مدين',
      debitMovement: reconciliationMetrics.netCOGS,
      creditMovement: 0,
      debitBalance: reconciliationMetrics.netCOGS,
      creditBalance: 0,
      notes: 'صافي رأس المال المدفوع في الكروت المباعة',
    });

    // 502: المصروفات التشغيلية والعمومية (Operating Expenses)
    list.push({
      code: '502',
      name: 'المصروفات التشغيلية والعمومية (OPEX)',
      category: 'المصروفات',
      nature: 'مدين',
      debitMovement: reconciliationMetrics.totalExpensesAmount,
      creditMovement: 0,
      debitBalance: reconciliationMetrics.totalExpensesAmount,
      creditBalance: 0,
      notes: 'نفقات وسندات الصرف المسجلة خلال الفترة',
    });

    // 301: حساب الأرباح والخسائر الجارية والوسيط المالي (Current P&L / Equity)
    // صافي الربح = الإيرادات - المرتجعات - التكلفة - المصروفات
    const netProfit =
      reconciliationMetrics.netSalesRevenue -
      reconciliationMetrics.netCOGS -
      reconciliationMetrics.totalExpensesAmount;

    // To balance the trial balance:
    // Debits = 101.debit + 102.debit + 110.debit + 120.debit + 402.debit + 501.debit + 502.debit
    // Credits = 101.credit + 102.credit + 110.credit + 120.credit + 401.credit
    const sumDebitMovements = list.reduce((s, i) => s + i.debitMovement, 0);
    const sumCreditMovements = list.reduce((s, i) => s + i.creditMovement, 0);
    const diffMovements = sumDebitMovements - sumCreditMovements;

    list.push({
      code: '301',
      name: 'وسيط الأرباح والخسائر الجارية وحساب التسوية',
      category: 'حقوق الملكية',
      nature: 'دائن',
      debitMovement: diffMovements < 0 ? Math.abs(diffMovements) : 0,
      creditMovement: diffMovements > 0 ? diffMovements : 0,
      debitBalance: netProfit < 0 ? Math.abs(netProfit) : 0,
      creditBalance: netProfit >= 0 ? netProfit : 0,
      notes: 'تسوية النتيجة المالية الدورية والتوازن المحاسبي',
    });

    return list;
  }, [reconciliationMetrics, categories]);

  // Overall Totals
  const totals = useMemo(() => {
    const totalDebitMovements = trialBalanceItems.reduce((s, i) => s + (i.debitMovement || 0), 0);
    const totalCreditMovements = trialBalanceItems.reduce((s, i) => s + (i.creditMovement || 0), 0);
    const totalDebitBalances = trialBalanceItems.reduce((s, i) => s + (i.debitBalance || 0), 0);
    const totalCreditBalances = trialBalanceItems.reduce((s, i) => s + (i.creditBalance || 0), 0);

    const diffMovements = Math.abs(totalDebitMovements - totalCreditMovements);
    const diffBalances = Math.abs(totalDebitBalances - totalCreditBalances);
    const isBalanced = diffMovements < 0.05 && diffBalances < 0.05;

    return {
      totalDebitMovements,
      totalCreditMovements,
      totalDebitBalances,
      totalCreditBalances,
      isBalanced,
      diff: diffBalances,
    };
  }, [trialBalanceItems]);

  // Handle Export Excel
  const handleExportExcel = () => {
    try {
      setIsExportingExcel(true);
      exportTrialBalanceToExcel({
        trialBalanceItems,
        periodLabel,
        settings,
        reconciliationMetrics,
        filename: `ميزان_المراجعة_${periodLabel.replace(/\s+/g, '_')}_${todayStr}.xlsx`,
      });
      showToast('تم تصدير ميزان المراجعة إلى ملف إكسيل منسق بنجاح ✅');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسيل');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle PDF Export
  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const ok = await exportElementToPdf('trial-balance-printable-doc', {
        filename: `ميزان_المراجعة_${networkName}_${todayStr}.pdf`,
        title: `ميزان المراجعة والتدقيق الشهري - ${networkName}`,
        format: 'a4',
        paperFormat: 'a4',
        orientation: 'landscape',
        scale: 2.0,
      });
      if (ok) {
        showToast('تم تنزيل ميزان المراجعة كملف PDF رسمي بنجاح ✅');
      }
    } catch (err) {
      console.error(err);
      showToast('تعذر تنزيل ملف PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await printElementDocument('trial-balance-printable-doc', {
        filename: `ميزان_المراجعة_${todayStr}.pdf`,
        format: 'a4',
        paperFormat: 'a4',
        orientation: 'landscape',
        scale: 2.0,
        margin: 6,
      });
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">ميزان المراجعة والتدقيق الشهري للفواتير والكشوفات</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Trial Balance & Audit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ضبط إقفال الفواتير الشهرية، مطابقة السندات، وتدقيق توازن الحسابات بالمجاميع والأرصدة
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold transition shadow-sm"
              title="تصدير ميزان المراجعة إلى مصنف إكسيل مرتب بالكامل"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingExcel ? 'جارٍ التصدير...' : 'تصدير إكسيل (.xlsx)'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-bold transition shadow-sm"
              title="تحميل كشف ميزان المراجعة بصيغة PDF معتمد"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              <span>تنزيل PDF</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
              title="طباعة التقرير"
            >
              <Printer className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-300 font-medium text-center animate-in fade-in duration-200">
            {toastMessage}
          </div>
        )}

        {/* Monthly Period Selector Bar */}
        <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>فترة التدقيق الشهري:</span>
            </span>

            {/* Quick Presets */}
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setPeriodPreset('this_month')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodPreset === 'this_month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                الشهر المختار
              </button>
              <button
                onClick={() => setPeriodPreset('last_month')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodPreset === 'last_month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                الشهر السابق
              </button>
              <button
                onClick={() => setPeriodPreset('year')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodPreset === 'year' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                السنة المالية كاملة
              </button>
              <button
                onClick={() => setPeriodPreset('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodPreset === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
            </div>

            {/* Month & Year Dropdowns */}
            {periodPreset === 'this_month' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {monthsArabic.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Equilibrium Status Indicator */}
          <div className="flex items-center gap-2">
            {totals.isBalanced ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>الميزان متوازن محاسبياً ✅ (الفارق = 0.00)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold animate-pulse shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>يوجد فارق تدقيق: {totals.diff.toFixed(2)} {currency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Invoice Audit Summary Cards */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">فواتير المبيعات الصادرة</span>
            <div className="text-sm sm:text-base font-black text-cyan-400 font-mono mt-0.5">
              {reconciliationMetrics.totalInvoicesSales.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {reconciliationMetrics.totalInvoicesCount} فاتورة معتمدة
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">المبيعات النقدية (كاش)</span>
            <div className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">
              {reconciliationMetrics.totalCashSales.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">سددت مباشرة للخزينة</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">المبيعات الآجلة (ذمم)</span>
            <div className="text-sm sm:text-base font-black text-amber-400 font-mono mt-0.5">
              {reconciliationMetrics.totalCreditSales.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">مرحلة لحسابات العملاء</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">فواتير المرتجع</span>
            <div className="text-sm sm:text-base font-black text-rose-400 font-mono mt-0.5">
              {reconciliationMetrics.totalReturnsAmount.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">كروت مرتجعة مخصومة</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">سندات القبض المحصلة</span>
            <div className="text-sm sm:text-base font-black text-indigo-400 font-mono mt-0.5">
              {reconciliationMetrics.totalPaymentsAmount.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">سدادات ديون مستلمة</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">سندات المصروفات (OPEX)</span>
            <div className="text-sm sm:text-base font-black text-purple-400 font-mono mt-0.5">
              {reconciliationMetrics.totalExpensesAmount.toLocaleString()}{' '}
              <span className="text-[10px] font-normal text-slate-400">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              {periodExpenses.length} سند صرف مسجل
            </span>
          </div>
        </div>

        {/* Trial Balance Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-bold select-none">
                <tr>
                  <th className="p-3">كود الحساب</th>
                  <th className="p-3">اسم الحساب المحاسبي</th>
                  <th className="p-3">تصنيف الحساب</th>
                  <th className="p-3">طبيعة الحساب</th>
                  <th className="p-3 text-cyan-400">حركات مدين</th>
                  <th className="p-3 text-cyan-400">حركات دائن</th>
                  <th className="p-3 text-emerald-400">رصيد مدين</th>
                  <th className="p-3 text-emerald-400">رصيد دائن</th>
                  <th className="p-3">البيان والملاحظات</th>
                  <th className="p-3 text-center">كشف تفصيلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trialBalanceItems.map((item) => {
                  return (
                    <tr key={item.code} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-indigo-400 font-bold">{item.code}</td>
                      <td className="p-3 font-sans font-bold text-white">
                        {item.name}
                      </td>
                      <td className="p-3 font-sans text-slate-400 text-[11px]">
                        {item.category}
                      </td>
                      <td className="p-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.nature === 'مدين'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {item.nature}
                        </span>
                      </td>

                      <td className="p-3 text-slate-300">
                        {item.debitMovement > 0 ? (
                          <span>
                            {item.debitMovement.toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-500 font-sans">{currency}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-300">
                        {item.creditMovement > 0 ? (
                          <span>
                            {item.creditMovement.toLocaleString()}{' '}
                            <span className="text-[10px] text-slate-500 font-sans">{currency}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="p-3 font-bold text-emerald-400">
                        {item.debitBalance > 0 ? (
                          <span>
                            {item.debitBalance.toLocaleString()}{' '}
                            <span className="text-[10px] text-emerald-300/80 font-sans">{currency}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="p-3 font-bold text-emerald-400">
                        {item.creditBalance > 0 ? (
                          <span>
                            {item.creditBalance.toLocaleString()}{' '}
                            <span className="text-[10px] text-emerald-300/80 font-sans">{currency}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="p-3 font-sans text-[11px] text-slate-400">
                        {item.notes}
                      </td>

                      <td className="p-3 font-sans text-center">
                        <button
                          onClick={() => setSelectedAccountForDrilldown(item)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px] font-bold transition border border-slate-700"
                          title="استعراض كشف الحركات اليومية للحساب"
                        >
                          كشف الحساب
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-800 text-xs">
                <tr>
                  <td colSpan={4} className="p-3 font-sans text-white">
                    الإجمالي العام لميزان المراجعة بالمجاميع والأرصدة
                  </td>
                  <td className="p-3 text-cyan-400 font-mono">
                    {totals.totalDebitMovements.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-cyan-400 font-mono">
                    {totals.totalCreditMovements.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-emerald-400 font-mono">
                    {totals.totalDebitBalances.toLocaleString()} {currency}
                  </td>
                  <td className="p-3 text-emerald-400 font-mono">
                    {totals.totalCreditBalances.toLocaleString()} {currency}
                  </td>
                  <td colSpan={2} className="p-3 font-sans text-[11px]">
                    {totals.isBalanced ? (
                      <span className="text-emerald-400 font-bold">✅ الميزان موزون ومتطابق 100%</span>
                    ) : (
                      <span className="text-rose-400 font-bold">⚠️ فارق تدقيق: {totals.diff.toFixed(2)}</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            المنشأة: <strong className="text-slate-200">{networkName}</strong> | فترة التدقيق:{' '}
            <strong className="text-indigo-400">{periodLabel}</strong>
          </span>
          <span className="text-[11px]">
            نظام الحسابات العامة ومايكروتك POS • ميزان مراجعة معتمد وفق المعايير المحاسبية
          </span>
        </div>
      </div>

      {/* Hidden Printable Document for PDF Export */}
      <div className="hidden">
        <div id="trial-balance-printable-doc" dir="rtl" className="p-8 bg-white text-slate-900 font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{networkName}</h1>
              <h2 className="text-lg font-bold text-slate-700 mt-1">ميزان المراجعة بالمجاميع والأرصدة والتدقيق الشهري</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                الفترة المحاسبية: {periodLabel} | تاريخ الإعداد: {todayStr} | العملة: {currency}
              </p>
            </div>
            <div className="text-left text-xs text-slate-600 border border-slate-200 p-2.5 rounded-lg bg-slate-50">
              <p className="font-bold text-slate-800">حالة المطابقة المحاسبية:</p>
              <p>مجموع حركات المدين: {totals.totalDebitMovements.toLocaleString()} {currency}</p>
              <p>مجموع حركات الدائن: {totals.totalCreditMovements.toLocaleString()} {currency}</p>
              <p className={totals.isBalanced ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {totals.isBalanced ? 'الميزان متزن 100% ✅' : `فارق: ${totals.diff.toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Printable Table */}
          <table className="w-full text-right text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border border-slate-300">كود الحساب</th>
                <th className="p-2 border border-slate-300">اسم الحساب المحاسبي</th>
                <th className="p-2 border border-slate-300">التصنيف</th>
                <th className="p-2 border border-slate-300">الطبيعة</th>
                <th className="p-2 border border-slate-300">حركات مدين</th>
                <th className="p-2 border border-slate-300">حركات دائن</th>
                <th className="p-2 border border-slate-300">رصيد مدين</th>
                <th className="p-2 border border-slate-300">رصيد دائن</th>
                <th className="p-2 border border-slate-300">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {trialBalanceItems.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border border-slate-300 font-mono font-bold">{item.code}</td>
                  <td className="p-2 border border-slate-300 font-bold">{item.name}</td>
                  <td className="p-2 border border-slate-300">{item.category}</td>
                  <td className="p-2 border border-slate-300">{item.nature}</td>
                  <td className="p-2 border border-slate-300 font-mono">
                    {item.debitMovement > 0 ? `${item.debitMovement.toLocaleString()} ${currency}` : '-'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono">
                    {item.creditMovement > 0 ? `${item.creditMovement.toLocaleString()} ${currency}` : '-'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-emerald-800">
                    {item.debitBalance > 0 ? `${item.debitBalance.toLocaleString()} ${currency}` : '-'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-emerald-800">
                    {item.creditBalance > 0 ? `${item.creditBalance.toLocaleString()} ${currency}` : '-'}
                  </td>
                  <td className="p-2 border border-slate-300 text-[10px] text-slate-600">{item.notes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={4} className="p-2 border border-slate-300">
                  الإجمالي العام لميزان المراجعة
                </td>
                <td className="p-2 border border-slate-300 font-mono">
                  {totals.totalDebitMovements.toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono">
                  {totals.totalCreditMovements.toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-emerald-800">
                  {totals.totalDebitBalances.toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-emerald-800">
                  {totals.totalCreditBalances.toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300">
                  {totals.isBalanced ? 'موزون 100%' : 'فارق تدقيق'}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between text-xs text-slate-700">
            <div>
              <p className="font-bold">المحاسب القانوني / المسؤول المالي:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
            <div>
              <p className="font-bold">مدير التدقيق الداخلي:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
            <div>
              <p className="font-bold">اعتماد الإدارة العامة:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Drilldown Modal */}
      {selectedAccountForDrilldown && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedAccountForDrilldown(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    كشف حساب أستاذ: {selectedAccountForDrilldown.code} - {selectedAccountForDrilldown.name}
                  </h3>
                  <p className="text-xs text-slate-400">فترة التدقيق: {periodLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAccountForDrilldown(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">حركات مدين</span>
                  <span className="text-cyan-400 font-bold font-mono">
                    {selectedAccountForDrilldown.debitMovement.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">حركات دائن</span>
                  <span className="text-cyan-400 font-bold font-mono">
                    {selectedAccountForDrilldown.creditMovement.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">رصيد مدين</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {selectedAccountForDrilldown.debitBalance.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">رصيد دائن</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {selectedAccountForDrilldown.creditBalance.toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <p className="font-bold text-white mb-1">بيان الحركات المحاسبية المكونة للرصيد:</p>
                <p className="text-slate-400 leading-relaxed">
                  {selectedAccountForDrilldown.notes}
                </p>
                {selectedAccountForDrilldown.code === '110' && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• إجمالي الفواتير الآجلة المضافة للذمم: {reconciliationMetrics.totalCreditSales.toLocaleString()} {currency}</p>
                    <p>• إجمالي السدادات المحصلة من الذمم: {reconciliationMetrics.totalPaymentsAmount.toLocaleString()} {currency}</p>
                    <p>• إجمالي فواتير المرتجع المخصومة: {reconciliationMetrics.totalReturnsAmount.toLocaleString()} {currency}</p>
                  </div>
                )}
                {selectedAccountForDrilldown.code === '101' && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• المبيعات النقدية المسلمة فوراً بالخزينة: {reconciliationMetrics.totalCashSales.toLocaleString()} {currency}</p>
                    <p>• المقبوضات النقدية من سندات القبض: {reconciliationMetrics.cashPayments.toLocaleString()} {currency}</p>
                    <p>• المصروفات النقدية المسددة من الصندوق: {reconciliationMetrics.cashExpenses.toLocaleString()} {currency}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedAccountForDrilldown(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
