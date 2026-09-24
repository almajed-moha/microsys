import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  Printer,
  Download,
  Store,
  User,
  TrendingUp,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  CheckCircle,
  Share2,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  ArrowDownToLine,
  Loader2,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import {
  POSPoint,
  Customer,
  InvoiceRecord,
  PaymentRecord,
  NetworkSettings,
} from '../types';
import { exportDebtsReportToExcel, DebtExportItem } from '../utils/exportAccounting';
import { printElementDocument, exportElementToPdf, sharePdfToWhatsApp } from '../utils/pdfExport';
import { CustomerStatementModal } from './CustomerStatementModal';

interface DebtsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  posPoints: POSPoint[];
  customers: Customer[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  settings: NetworkSettings;
  onOpenPaymentModal?: (id: string, type: 'pos' | 'customer') => void;
}

export const DebtsReportModal: React.FC<DebtsReportModalProps> = ({
  isOpen,
  onClose,
  posPoints = [],
  customers = [],
  invoices = [],
  payments = [],
  settings,
  onOpenPaymentModal,
}) => {
  const currency = settings.currencySymbol || 'ر.ي';
  const networkName = settings.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters State
  const [filterType, setFilterType] = useState<'all' | 'pos' | 'customer'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debtors' | 'over_limit' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for Statement Modal
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<Customer | null>(null);

  // Export Loading States
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compile Comprehensive Debt Data
  const debtEntities = useMemo(() => {
    const list: (DebtExportItem & { rawEntity: any; rawType: 'pos' | 'customer' })[] = [];

    // 1. Process POS Points
    posPoints.forEach((pos) => {
      const posInvoices = invoices.filter(
        (i) => i.posPointId === pos.id && i.status !== 'cancelled'
      );
      const posPayments = payments.filter((p) => p.posPointId === pos.id);

      let totalSalesInvoiced = 0;
      let totalReturnsInvoiced = 0;
      posInvoices.forEach((inv) => {
        const amt = inv.totalWholesaleAmount || 0;
        if (inv.type === 'sale') totalSalesInvoiced += amt;
        if (inv.type === 'return') totalReturnsInvoiced += amt;
      });

      const totalPaid = posPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const currentDebt = pos.currentDebt !== undefined ? pos.currentDebt : totalSalesInvoiced - totalReturnsInvoiced - totalPaid;
      const maxLimit = pos.maxDebtLimit || 0;
      const remainingLimit = maxLimit > 0 ? maxLimit - currentDebt : 0;

      // Find last payment date
      const sortedPayments = [...posPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPayment = sortedPayments[0];
      let agingDays: number | string = '-';
      if (lastPayment?.date) {
        const diffMs = new Date().getTime() - new Date(lastPayment.date).getTime();
        agingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      let status = 'ضمن السقف';
      if (currentDebt <= 0) {
        status = 'مسدد بالكامل';
      } else if (maxLimit > 0 && currentDebt > maxLimit) {
        status = 'متجاوز السقف ⚠️';
      } else if (maxLimit > 0 && currentDebt >= maxLimit * 0.85) {
        status = 'اقترب من السقف';
      }

      list.push({
        id: pos.id,
        name: pos.name,
        type: 'نقطة توزيع / موزع',
        phone: pos.phone,
        address: pos.address,
        maxDebtLimit: maxLimit,
        totalInvoices: totalSalesInvoiced - totalReturnsInvoiced,
        totalPaid: totalPaid,
        currentDebt: currentDebt,
        remainingLimit: remainingLimit,
        status: status,
        lastPaymentDate: lastPayment?.date,
        agingDays: agingDays,
        notes: pos.notes,
        rawEntity: pos,
        rawType: 'pos',
      });
    });

    // 2. Process Customers
    customers.forEach((cust) => {
      const custInvoices = invoices.filter(
        (i) => i.customerId === cust.id && i.status !== 'cancelled'
      );
      const custPayments = payments.filter((p) => p.customerId === cust.id);

      let totalSales = 0;
      let totalReturns = 0;
      custInvoices.forEach((inv) => {
        const amt = inv.totalRetailAmount || inv.totalWholesaleAmount || 0;
        if (inv.type === 'sale') totalSales += amt;
        if (inv.type === 'return') totalReturns += amt;
      });

      const totalPaid = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const calculatedDebt = totalSales - totalReturns - totalPaid;
      const currentDebt = cust.balance !== undefined ? cust.balance : calculatedDebt;

      const sortedPayments = [...custPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPayment = sortedPayments[0];
      let agingDays: number | string = '-';
      if (lastPayment?.date) {
        const diffMs = new Date().getTime() - new Date(lastPayment.date).getTime();
        agingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      const status = currentDebt <= 0 ? 'مسدد بالكامل' : 'مدين (مستحق)';

      list.push({
        id: cust.id,
        name: cust.name,
        type: 'عميل مباشر',
        phone: cust.phone,
        address: cust.address,
        maxDebtLimit: 0,
        totalInvoices: totalSales - totalReturns,
        totalPaid: totalPaid,
        currentDebt: currentDebt,
        remainingLimit: 0,
        status: status,
        lastPaymentDate: lastPayment?.date,
        agingDays: agingDays,
        notes: cust.notes,
        rawEntity: cust,
        rawType: 'customer',
      });
    });

    return list;
  }, [posPoints, customers, invoices, payments]);

  // Filtered List
  const filteredList = useMemo(() => {
    return debtEntities.filter((item) => {
      // Type Filter
      if (filterType === 'pos' && item.rawType !== 'pos') return false;
      if (filterType === 'customer' && item.rawType !== 'customer') return false;

      // Debt Status Filter
      if (debtFilter === 'debtors' && item.currentDebt <= 0) return false;
      if (debtFilter === 'over_limit' && (item.maxDebtLimit <= 0 || item.currentDebt <= item.maxDebtLimit)) return false;
      if (debtFilter === 'settled' && item.currentDebt > 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchPhone = item.phone && item.phone.includes(q);
        const matchAddr = item.address && item.address.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAddr) return false;
      }

      return true;
    });
  }, [debtEntities, filterType, debtFilter, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalDebt = debtEntities.reduce((sum, i) => sum + (i.currentDebt > 0 ? i.currentDebt : 0), 0);
    const debtorsCount = debtEntities.filter((i) => i.currentDebt > 0).length;
    const totalCreditLimit = debtEntities.reduce((sum, i) => sum + (i.maxDebtLimit || 0), 0);
    const totalPaid = debtEntities.reduce((sum, i) => sum + (i.totalPaid || 0), 0);
    const overLimitCount = debtEntities.filter(
      (i) => i.maxDebtLimit > 0 && i.currentDebt > i.maxDebtLimit
    ).length;

    return {
      totalDebt,
      debtorsCount,
      totalCreditLimit,
      totalPaid,
      overLimitCount,
    };
  }, [debtEntities]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      setIsExportingExcel(true);
      exportDebtsReportToExcel({
        debtItems: filteredList,
        settings,
        summaryMetrics,
        filename: `تقرير_المديونيات_${todayStr}.xlsx`,
      });
      showToast('تم تصدير تقرير المديونية إلى ملف إكسيل منسق ومجهز بالكامل ✅');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسيل');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export / Print PDF
  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await printElementDocument('debts-report-printable-doc', {
        filename: `تقرير_المديونيات_${todayStr}.pdf`,
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

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const ok = await exportElementToPdf('debts-report-printable-doc', {
        filename: `تقرير_مديونيات_${networkName}_${todayStr}.pdf`,
        title: `تقرير مديونيات نقاط البيع والعملاء - ${networkName}`,
        format: 'a4',
        paperFormat: 'a4',
        orientation: 'landscape',
        scale: 2.0,
      });
      if (ok) {
        showToast('تم تنزيل تقرير المديونية كملف PDF رسمي بنجاح ✅');
      }
    } catch (err) {
      console.error(err);
      showToast('تعذر تنزيل ملف PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `📊 تقرير مديونيات شبكة ${networkName}\nتاريخ: ${todayStr}\nإجمالي الديون القائمة: ${summaryMetrics.totalDebt.toLocaleString()} ${currency}\nعدد المدينين: ${summaryMetrics.debtorsCount}\nالحسابات المتجاوزة للسقف: ${summaryMetrics.overLimitCount}`;
    sharePdfToWhatsApp('debts-report-printable-doc', {
      filename: `تقرير_المديونيات_${todayStr}.pdf`,
      title: `تقرير مديونيات ${networkName}`,
      messageText: text,
      orientation: 'landscape',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">تقرير مديونيات الموزعين والعملاء وأعمار الديون</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  كشف المطابقة المالية
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة أرصدة الذمم المدينة، الأسقف الائتمانية، نسب التحصيل، وسندات السداد
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold transition shadow-sm"
              title="تصدير ملف إكسيل مرتب وموزون (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingExcel ? 'جارٍ التصدير...' : 'تصدير إكسيل (.xlsx)'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-bold transition shadow-sm"
              title="تحميل تقرير PDF رسمي"
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

            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition border border-emerald-500/30"
              title="مشاركة الملخص عبر واتساب"
            >
              <Share2 className="w-4 h-4" />
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

        {/* Top Statistics Cards */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/20 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">إجمالي الديون القائمة</span>
            <div className="text-base sm:text-lg font-black text-rose-400 font-mono">
              {summaryMetrics.totalDebt.toLocaleString()}{' '}
              <span className="text-xs font-normal text-rose-300">{currency}</span>
            </div>
            <span className="text-[10px] text-rose-300/80 block">مستحقات معلقة بالسوق</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">الحسابات المدينة</span>
            <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
              {summaryMetrics.debtorsCount}{' '}
              <span className="text-xs font-normal text-slate-400">من {debtEntities.length}</span>
            </div>
            <span className="text-[10px] text-slate-400 block">موزع وعميل مدين</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">سقف التسهيلات</span>
            <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
              {summaryMetrics.totalCreditLimit.toLocaleString()}{' '}
              <span className="text-xs font-normal text-cyan-300">{currency}</span>
            </div>
            <span className="text-[10px] text-slate-400 block">إجمالي الحدود المسموحة</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/20 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">إجمالي المسدد</span>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {summaryMetrics.totalPaid.toLocaleString()}{' '}
              <span className="text-xs font-normal text-emerald-300">{currency}</span>
            </div>
            <span className="text-[10px] text-emerald-300/80 block">تحصيلات وسدادات نقدية</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/20 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block font-medium">تجاوز السقف الائتماني</span>
            <div className="text-base sm:text-lg font-black text-amber-400 font-mono flex items-center gap-1">
              <span>{summaryMetrics.overLimitCount}</span>
              {summaryMetrics.overLimitCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </div>
            <span className="text-[10px] text-amber-400/80 block">حسابات تحتاج للمتابعة</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-3.5 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account Type Filter */}
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({debtEntities.length})
              </button>
              <button
                onClick={() => setFilterType('pos')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  filterType === 'pos' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>الموزعين ({posPoints.length})</span>
              </button>
              <button
                onClick={() => setFilterType('customer')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  filterType === 'customer' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                <span>العملاء ({customers.length})</span>
              </button>
            </div>

            {/* Debt Status Filter */}
            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setDebtFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  debtFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                كافة الحالات
              </button>
              <button
                onClick={() => setDebtFilter('debtors')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  debtFilter === 'debtors' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <span>المدينين فقط</span>
              </button>
              <button
                onClick={() => setDebtFilter('over_limit')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  debtFilter === 'over_limit' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>متجاوزين السقف</span>
              </button>
              <button
                onClick={() => setDebtFilter('settled')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  debtFilter === 'settled' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                مسدد بالكامل
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف أو المنطقة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-bold select-none">
                <tr>
                  <th className="p-3">الاسم / المنشأة</th>
                  <th className="p-3">نوع الحساب</th>
                  <th className="p-3">سقف الائتمان</th>
                  <th className="p-3">إجمالي المسحوبات</th>
                  <th className="p-3">إجمالي المسدد</th>
                  <th className="p-3 text-rose-400">المديونية الحالية</th>
                  <th className="p-3">المتبقي من السقف</th>
                  <th className="p-3">حالة الائتمان</th>
                  <th className="p-3">آخر سداد</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                      لا توجد حسابات مطابقة لمعايير البحث والفلترة المحددة
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const isOverLimit = item.maxDebtLimit > 0 && item.currentDebt > item.maxDebtLimit;
                    const isNearLimit = item.maxDebtLimit > 0 && item.currentDebt >= item.maxDebtLimit * 0.85 && !isOverLimit;
                    const isSettled = item.currentDebt <= 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {item.rawType === 'pos' ? (
                              <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{item.name}</span>
                          </div>
                          {(item.phone || item.address) && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                              {item.phone && <span>{item.phone}</span>}
                              {item.address && <span>• {item.address}</span>}
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-sans text-[11px] text-slate-300">
                          {item.type}
                        </td>

                        <td className="p-3 text-slate-300">
                          {item.maxDebtLimit > 0 ? (
                            <span>
                              {item.maxDebtLimit.toLocaleString()}{' '}
                              <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-sans">غير محدد</span>
                          )}
                        </td>

                        <td className="p-3 text-slate-300">
                          {item.totalInvoices.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
                        </td>

                        <td className="p-3 text-emerald-400">
                          {item.totalPaid.toLocaleString()}{' '}
                          <span className="text-[10px] text-emerald-300 font-sans">{currency}</span>
                        </td>

                        <td className="p-3 font-bold">
                          <span
                            className={
                              item.currentDebt > 0
                                ? 'text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20'
                                : 'text-emerald-400'
                            }
                          >
                            {item.currentDebt.toLocaleString()}{' '}
                            <span className="text-[10px] font-sans">{currency}</span>
                          </span>
                        </td>

                        <td className="p-3 text-slate-400">
                          {item.maxDebtLimit > 0 ? (
                            <span className={item.remainingLimit < 0 ? 'text-rose-400 font-bold' : 'text-cyan-400'}>
                              {item.remainingLimit.toLocaleString()}{' '}
                              <span className="text-[10px] font-sans">{currency}</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="p-3 font-sans">
                          {isSettled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              مسدد بالكامل ✅
                            </span>
                          ) : isOverLimit ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              متجاوز السقف ⚠️
                            </span>
                          ) : isNearLimit ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              قارب على السقف
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              ضمن السقف
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-sans text-[11px] text-slate-400">
                          {item.lastPaymentDate ? (
                            <div>
                              <span>{item.lastPaymentDate}</span>
                              {typeof item.agingDays === 'number' && (
                                <span className="block text-[10px] text-slate-500 font-mono">
                                  منذ {item.agingDays} يوم
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">لا يوجد سداد</span>
                          )}
                        </td>

                        <td className="p-3 font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.rawType === 'customer' ? (
                              <button
                                onClick={() => setSelectedStatementCustomer(item.rawEntity)}
                                className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 text-[10px] font-bold transition"
                                title="عرض كشف الحساب التفصيلي"
                              >
                                كشف حساب
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  // Can trigger POS Statement
                                  showToast(`كشف حساب موزع: ${item.name}`);
                                }}
                                className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 text-[10px] font-bold transition"
                                title="عرض كشف حساب الموزع"
                              >
                                كشف موزع
                              </button>
                            )}

                            {onOpenPaymentModal && item.currentDebt > 0 && (
                              <button
                                onClick={() => onOpenPaymentModal(item.id || '', item.rawType)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-[10px] font-bold transition flex items-center gap-0.5"
                                title="تسجيل دفعة سداد فورية"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>سداد</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredList.length > 0 && (
                <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-800 text-xs">
                  <tr>
                    <td colSpan={2} className="p-3 font-sans text-white">
                      الإجمالي العام ({filteredList.length} حساب)
                    </td>
                    <td className="p-3 text-cyan-400 font-mono">
                      {filteredList.reduce((s, i) => s + (i.maxDebtLimit || 0), 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {filteredList.reduce((s, i) => s + (i.totalInvoices || 0), 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-emerald-400 font-mono">
                      {filteredList.reduce((s, i) => s + (i.totalPaid || 0), 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-rose-400 font-mono">
                      {filteredList.reduce((s, i) => s + (i.currentDebt || 0), 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-cyan-400 font-mono">
                      {filteredList.reduce((s, i) => s + (i.remainingLimit || 0), 0).toLocaleString()} {currency}
                    </td>
                    <td colSpan={3} className="p-3 text-slate-400 font-sans text-[11px]">
                      المدينين: {filteredList.filter((i) => i.currentDebt > 0).length} حساب
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            شبكة: <strong className="text-slate-200">{networkName}</strong> | تاريخ التقرير:{' '}
            <strong className="text-slate-200">{todayStr}</strong>
          </span>
          <span className="text-[11px]">
            نظام إدارة وتوزيع كروت مايكروتك • كشف مطابق للحسابات والذمم
          </span>
        </div>
      </div>

      {/* Hidden Printable Document for PDF Export */}
      <div className="hidden">
        <div id="debts-report-printable-doc" dir="rtl" className="p-8 bg-white text-slate-900 font-sans">
          {/* Print Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{networkName}</h1>
              <h2 className="text-lg font-bold text-slate-700 mt-1">تقرير مديونيات نقاط البيع والعملاء وأعمار الديون</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تاريخ الاستخراج: {todayStr} | العملة الأساسية: {currency}
              </p>
            </div>
            <div className="text-left text-xs text-slate-500 border border-slate-200 p-2.5 rounded-lg bg-slate-50">
              <p className="font-bold text-slate-800">خلاصة المديونيات:</p>
              <p>إجمالي الديون: {summaryMetrics.totalDebt.toLocaleString()} {currency}</p>
              <p>عدد المدينين: {summaryMetrics.debtorsCount}</p>
              <p>المتجاوزين للسقف: {summaryMetrics.overLimitCount}</p>
            </div>
          </div>

          {/* Printable Table */}
          <table className="w-full text-right text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border border-slate-300">#</th>
                <th className="p-2 border border-slate-300">الاسم / المنشأة</th>
                <th className="p-2 border border-slate-300">النوع</th>
                <th className="p-2 border border-slate-300">الهاتف</th>
                <th className="p-2 border border-slate-300">سقف الائتمان</th>
                <th className="p-2 border border-slate-300">إجمالي المسحوبات</th>
                <th className="p-2 border border-slate-300">إجمالي المسدد</th>
                <th className="p-2 border border-slate-300 text-rose-700">المديونية القائمة</th>
                <th className="p-2 border border-slate-300">الحالة</th>
                <th className="p-2 border border-slate-300">آخر سداد</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border border-slate-300 font-mono">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-bold">{item.name}</td>
                  <td className="p-2 border border-slate-300">{item.type}</td>
                  <td className="p-2 border border-slate-300 font-mono">{item.phone || '-'}</td>
                  <td className="p-2 border border-slate-300 font-mono">
                    {item.maxDebtLimit > 0 ? `${item.maxDebtLimit.toLocaleString()} ${currency}` : '-'}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono">
                    {item.totalInvoices.toLocaleString()} {currency}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono text-emerald-700">
                    {item.totalPaid.toLocaleString()} {currency}
                  </td>
                  <td className="p-2 border border-slate-300 font-mono font-bold text-rose-700">
                    {item.currentDebt.toLocaleString()} {currency}
                  </td>
                  <td className="p-2 border border-slate-300">{item.status}</td>
                  <td className="p-2 border border-slate-300 font-mono">
                    {item.lastPaymentDate || 'لا يوجد سداد'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={4} className="p-2 border border-slate-300">
                  الإجمالي العام ({filteredList.length} حساب)
                </td>
                <td className="p-2 border border-slate-300 font-mono">
                  {filteredList.reduce((s, i) => s + (i.maxDebtLimit || 0), 0).toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono">
                  {filteredList.reduce((s, i) => s + (i.totalInvoices || 0), 0).toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-emerald-700">
                  {filteredList.reduce((s, i) => s + (i.totalPaid || 0), 0).toLocaleString()} {currency}
                </td>
                <td className="p-2 border border-slate-300 font-mono text-rose-700">
                  {filteredList.reduce((s, i) => s + (i.currentDebt || 0), 0).toLocaleString()} {currency}
                </td>
                <td colSpan={2} className="p-2 border border-slate-300">
                  المدينين: {filteredList.filter((i) => i.currentDebt > 0).length}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex justify-between text-xs text-slate-700">
            <div>
              <p className="font-bold">المحاسب المالي / المدقق:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
            <div>
              <p className="font-bold">المشرف العام / الإدارة:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
            <div>
              <p className="font-bold">الختم والاعتماد الرسمي:</p>
              <div className="mt-8 border-b border-dotted border-slate-400 w-44" />
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Customer Statement Modal if user clicks 'كشف حساب' */}
      {selectedStatementCustomer && (
        <CustomerStatementModal
          isOpen={!!selectedStatementCustomer}
          onClose={() => setSelectedStatementCustomer(null)}
          customer={selectedStatementCustomer}
          invoices={invoices}
          payments={payments}
          settings={settings}
        />
      )}
    </div>
  );
};
