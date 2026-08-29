import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Share2,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  X,
  Receipt,
  FileDown,
  Loader2,
  Check,
  Smartphone,
  FileSpreadsheet,
  Search,
  Filter,
  ReceiptText,
  Clock,
  Building2,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import {
  POSPoint,
  CardCategory,
  SalesRecord,
  PaymentRecord,
  CardBatchDispatch,
  NetworkSettings
} from '../types';
import { calculatePOSInventory, calculatePOSBalance } from '../utils/storage';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface POSAccountStatementModalProps {
  posPoint: POSPoint;
  categories: CardCategory[];
  sales: SalesRecord[];
  payments: PaymentRecord[];
  dispatches: CardBatchDispatch[];
  settings: NetworkSettings;
  initialPaperFormat?: 'a4' | 'pos-80mm';
  onClose: () => void;
  onViewPaymentReceipt?: (payment: PaymentRecord) => void;
  onPrintSaleReceipt?: (sale: SalesRecord) => void;
}

export const POSAccountStatementModal: React.FC<POSAccountStatementModalProps> = ({
  posPoint,
  categories,
  sales,
  payments,
  dispatches,
  settings,
  initialPaperFormat = 'a4',
  onClose,
  onViewPaymentReceipt,
  onPrintSaleReceipt,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>(initialPaperFormat);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filters State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'sale' | 'payment' | 'dispatch'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Overall Inventory & Balance
  const fullInventory = useMemo(() => calculatePOSInventory(posPoint.id, dispatches, sales), [posPoint.id, dispatches, sales]);
  const fullBalance = useMemo(() => calculatePOSBalance(posPoint.id, sales, payments, dispatches), [posPoint.id, sales, payments, dispatches]);

  // Combine Dispatches, Sales, and Payments into chronological transactions
  const allPosTransactions = useMemo(() => {
    const posSales = sales.filter((s) => s.posPointId === posPoint.id);
    const posPayments = payments.filter((p) => p.posPointId === posPoint.id);
    const posDispatches = dispatches.filter((d) => d.posPointId === posPoint.id);

    const list = [
      ...posDispatches.map((d) => {
        const cat = categories.find((c) => c.id === d.categoryId);
        return {
          id: d.id,
          date: d.date,
          type: 'dispatch' as const,
          typeName: 'تسليم دفعة كروت',
          description: `تسليم دفعة كروت (${cat?.name || 'كروت'} × ${d.quantity})`,
          quantity: d.quantity,
          categoryName: cat?.name || 'غير محدد',
          unitPrice: d.wholesalePricePerCard,
          debit: d.totalWholesaleValue,
          credit: 0,
          ref: d.id,
          rawObj: d,
        };
      }),
      ...posSales.map((s) => {
        const cat = categories.find((c) => c.id === s.categoryId);
        return {
          id: s.id,
          date: s.date,
          type: 'sale' as const,
          typeName: s.paymentType === 'cash' ? 'مبيعات كروت (نقداً)' : 'مبيعات كروت (آجل)',
          description: `مبيعات كروت (${cat?.name || 'كروت'} × ${s.quantity}) - ${s.paymentType === 'cash' ? 'نقداً' : 'آجل على الحساب'}`,
          quantity: s.quantity,
          categoryName: cat?.name || 'غير محدد',
          unitPrice: s.wholesaleUnitPrice,
          debit: s.totalWholesaleAmount,
          credit: s.paymentType === 'cash' ? s.totalWholesaleAmount : 0,
          ref: s.invoiceNumber,
          rawObj: s,
        };
      }),
      ...posPayments.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        typeName: 'سداد دفعة نقدية',
        description: `سداد دفعة نقدية (${p.receivedBy || 'التحصيل'}) ${p.notes ? `- ${p.notes}` : ''}`,
        quantity: 0,
        categoryName: '-',
        unitPrice: 0,
        debit: 0,
        credit: p.amount,
        ref: p.referenceNumber || p.id,
        rawObj: p,
      })),
    ];

    // Sort chronologically (oldest first) to compute accurate running balance
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, payments, dispatches, posPoint.id, categories]);

  // Financial Ledger Math with Opening Balance for Date Ranges
  const ledgerData = useMemo(() => {
    let openingBalance = 0;
    const periodTxs: Array<(typeof allPosTransactions)[0] & { runningBalance: number }> = [];

    let runningBal = 0;

    for (const tx of allPosTransactions) {
      const isBeforeStart = dateFrom && tx.date < dateFrom;
      const isAfterEnd = dateTo && tx.date > dateTo;

      if (isBeforeStart) {
        openingBalance += (tx.debit - tx.credit);
        runningBal = openingBalance;
      } else if (!isAfterEnd) {
        if (periodTxs.length === 0 && !dateFrom) {
          runningBal = 0;
        }
        runningBal += (tx.debit - tx.credit);
        periodTxs.push({
          ...tx,
          runningBalance: runningBal,
        });
      }
    }

    // Filter by txType and search inside the period
    const filteredPeriodTxs = periodTxs.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(s);
        const matchesRef = tx.ref.toLowerCase().includes(s);
        const matchesType = tx.typeName.toLowerCase().includes(s);
        if (!matchesDesc && !matchesRef && !matchesType) return false;
      }
      return true;
    });

    const periodDebits = periodTxs.reduce((sum, tx) => sum + tx.debit, 0);
    const periodCredits = periodTxs.reduce((sum, tx) => sum + tx.credit, 0);
    const periodNet = periodDebits - periodCredits;
    const closingBalance = openingBalance + periodNet;

    return {
      openingBalance,
      periodTxs: filteredPeriodTxs,
      rawPeriodTxs: periodTxs,
      periodDebits,
      periodCredits,
      periodNet,
      closingBalance,
    };
  }, [allPosTransactions, dateFrom, dateTo, txTypeFilter, searchTerm]);

  // Date Preset Helpers
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split('T')[0];
    setDateFrom(yesterday);
    setDateTo(yesterday);
  };

  const handleSetLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const handleClearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  // WhatsApp formatted text summary
  const getFormattedWhatsAppMessage = () => {
    const periodLabel = dateFrom || dateTo
      ? `من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`
      : 'كافة الحركات التاريخية المسجلة';

    return `*كشف حساب مالي ومخزني - ${settings.networkName}*
----------------------------------------
👤 الموزع / نقطة البيع: *${posPoint.name}*
📱 المسؤول: ${posPoint.managerName} (${posPoint.phone})
📅 الفترة: ${periodLabel}
⏱ تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}

📊 *الملخص المالي:*
- الرصيد السابق المنقول: ${(ledgerData.openingBalance ?? 0).toLocaleString()} ${settings.currencySymbol}
- إجمالي مسحوبات ومبيعات الفترة: ${(ledgerData.periodDebits ?? 0).toLocaleString()} ${settings.currencySymbol}
- إجمالي المبالغ المسددة: ${(ledgerData.periodCredits ?? 0).toLocaleString()} ${settings.currencySymbol}
- 🔴 *الرصيد المتبقي (المديونية الحالية): ${(ledgerData.closingBalance ?? 0).toLocaleString()} ${settings.currencySymbol}*

📦 *جرد الكروت المتبقية لدى النقطة:*
- الكروت المستلمة إجمالاً: ${fullInventory?.totalDispatched ?? 0} كارت
- الكروت المباعة: ${fullInventory?.totalSold ?? 0} كارت
- 🟣 *الكروت المتبقية لديكم بالمحل: ${fullInventory?.totalRemaining ?? 0} كارت*

----------------------------------------
شكراً لتعاملكم ودمتم بخير 🌹
للاستفسار والدعم: ${settings.supportPhone}`;
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // 1. WhatsApp share as real PDF file + message
  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const fileName = `كشف_حساب_${posPoint.name.replace(/\s+/g, '_')}_${paperFormat}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const res = await sharePdfToWhatsApp('pos-statement-document', {
        filename: fileName,
        title: `كشف حساب - ${posPoint.name}`,
        phone: posPoint.phone,
        messageText: getFormattedWhatsAppMessage(),
        format: paperFormat,
        scale: 2.5,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال ملف الـ PDF عبر واتساب بنجاح ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم حفظ ملف الـ PDF وفتح محادثة واتساب لإرفاقه مباشرة ✅');
      }
    } catch (err) {
      console.error('WhatsApp Share Error:', err);
      const cleanPhone = posPoint.phone ? (posPoint.phone.startsWith('967') ? posPoint.phone : `967${posPoint.phone}`) : '';
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(getFormattedWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // 2. High-precision PDF export
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fileName = `كشف_حساب_${posPoint.name.replace(/\s+/g, '_')}_${paperFormat}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await exportElementToPdf('pos-statement-document', {
        filename: fileName,
        title: `كشف حساب مالي ومخزني - ${posPoint.name}`,
        format: paperFormat,
        scale: 2.5,
      });

      if (ok) {
        showFeedback('تم تصدير وتحميل كشف الحساب بصيغة PDF بنجاح ✅');
      } else {
        showFeedback('تعذر تصدير PDF، يرجى المحاولة عبر زر الطباعة المباشرة');
      }
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 3. Clean direct printing
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElementDocument('pos-statement-document', {
        filename: `كشف_حساب_${posPoint.name.replace(/\s+/g, '_')}.pdf`,
        format: paperFormat,
        scale: 2.5,
      });
    } catch (err) {
      console.error('Print Error:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // 4. Export CSV / Excel for this POS statement
  const handleExportCSV = () => {
    try {
      const headers = ['الرقم', 'التاريخ', 'النوع', 'البيان', 'مدين (+)', 'دائن (-)', 'الرصيد التراكمي', 'رقم المرجع'];
      const rows = ledgerData.periodTxs.map((tx, idx) => [
        idx + 1,
        tx.date,
        tx.typeName,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.debit || 0,
        tx.credit || 0,
        tx.runningBalance,
        `"${tx.ref}"`,
      ]);

      const csvContent =
        '\uFEFF' +
        `"كشف حساب نقطة البيع: ${posPoint.name} - ${settings.networkName}"\n` +
        `"الفترة: ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}"\n` +
        `"الرصيد الافتتاحي السابق: ${ledgerData.openingBalance} ${settings.currencySymbol}"\n` +
        `"الرصيد الختامي المتبقي: ${ledgerData.closingBalance} ${settings.currencySymbol}"\n\n` +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `كشف_حساب_${posPoint.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showFeedback('تم تصدير كشف الحساب كملف Excel / CSV بنجاح ✅');
    } catch (e) {
      console.error('CSV Export error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        
        {/* Top Control Bar: Title & Main Export Actions */}
        <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 no-print bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white truncate">كشف حساب نقطة البيع والموزع</h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                  {posPoint.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                المسؤول: {posPoint.managerName} • {posPoint.phone} • {posPoint.address || 'المركز'}
              </p>
            </div>
          </div>

          {/* Paper Format Switcher + Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-shrink-0">
            {/* Paper Mode Tabs */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setPaperFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  paperFormat === 'a4'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="عرض وتصدير كشف حساب رسمي على ورق عادي A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>تقرير A4 رسمي</span>
              </button>
              <button
                onClick={() => setPaperFormat('pos-80mm')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  paperFormat === 'pos-80mm'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="عرض وتصدير إيصال طابعة كاشير حراري (80mm)"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>كاشير حراري (80mm)</span>
              </button>
            </div>

            {/* CSV / Excel */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="تصدير كشف الحساب كملف Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title={`تحميل كشف الحساب كملف PDF بصيغة ${paperFormat === 'a4' ? 'A4' : 'كاشير 80mm'}`}
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>تحميل PDF</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="مشاركة كشف الحساب كملف PDF عبر واتساب مباشرة للموزع"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">واتساب PDF</span>
            </button>

            {/* Print Direct */}
            <button
              onClick={handlePrint}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              title="طباعة كشف الحساب فوراً"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>طباعة</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex-shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Feedback Banner */}
        {feedbackMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-bold animate-in fade-in flex items-center justify-center gap-2 no-print">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Filter Bar with Date Range, Preset Buttons, and Search (No-Print) */}
        <div className="bg-slate-950/80 p-3 sm:p-4 border-b border-slate-800 space-y-2.5 no-print text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Search within ledger */}
            <div className="lg:col-span-2 relative">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">بحث في كشف الحساب:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في البيان، رقم الفاتورة، السند..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tx Type Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">نوع الحركة:</label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as any)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">جميع الحركات والعمليات</option>
                <option value="sale">مبيعات الكروت فقط</option>
                <option value="payment">سداد دفعات نقدية فقط</option>
                <option value="dispatch">تسليم دفعات الكروت فقط</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                <span>من تاريخ:</span>
                {dateFrom && (
                  <button onClick={() => setDateFrom('')} className="text-[10px] text-rose-400 hover:underline">
                    إلغاء
                  </button>
                )}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                <span>إلى تاريخ:</span>
                {dateTo && (
                  <button onClick={() => setDateTo('')} className="text-[10px] text-rose-400 hover:underline">
                    إلغاء
                  </button>
                )}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Quick Date Presets Row */}
          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>فترة سريعة:</span>
              </span>
              <button
                onClick={handleSetToday}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  dateFrom && dateFrom === dateTo && dateFrom === new Date().toISOString().split('T')[0]
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                اليوم
              </button>
              <button
                onClick={handleSetYesterday}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                أمس
              </button>
              <button
                onClick={handleSetLast7Days}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                آخر 7 أيام
              </button>
              <button
                onClick={handleSetThisMonth}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                هذا الشهر
              </button>
              <button
                onClick={handleSetLastMonth}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                الشهر السابق
              </button>
              {(dateFrom || dateTo) && (
                <button
                  onClick={handleClearDates}
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-rose-950/50 text-rose-300 border border-rose-800/40 hover:bg-rose-900/60 transition cursor-pointer"
                >
                  عرض كامل السجل (بدون حصر تاريخ)
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              عدد الحركات المعروضة: <strong className="text-indigo-300">{ledgerData.periodTxs.length}</strong> حركة
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-6 bg-slate-950/40">
          
          {/* Main Document Body */}
          <div
            id="pos-statement-document"
            className={`mx-auto bg-white text-slate-900 shadow-xl transition-all font-sans ${
              paperFormat === 'pos-80mm'
                ? 'w-full max-w-[320px] p-2.5 sm:p-3 text-[11px] leading-tight border border-slate-300 printable-thermal-document'
                : 'w-full max-w-4xl p-6 sm:p-8 space-y-6 text-xs border border-slate-200 rounded-xl printable-document'
            }`}
            dir="rtl"
          >
            {/* ======================================================== */}
            {/* 1. THERMAL POS 80MM LAYOUT */}
            {/* ======================================================== */}
            {paperFormat === 'pos-80mm' ? (
              <div className="space-y-3 font-sans text-slate-950">
                {/* Header Centered */}
                <div className="text-center pb-2 border-b-2 border-dashed border-slate-400">
                  <h2 className="text-base font-black tracking-tight">{settings.networkName}</h2>
                  <p className="text-[10px] text-slate-600 font-bold">{settings.networkSlogan}</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">هاتف: {settings.supportPhone}</p>
                  <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-black text-[11px]">
                    كشف حساب نقطة بيع (80mm)
                  </div>
                </div>

                {/* Point Info */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] space-y-0.5 font-mono">
                  <div className="flex justify-between font-bold text-slate-950">
                    <span>نقطة البيع:</span>
                    <span>{posPoint.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>المسؤول:</span>
                    <span>{posPoint.managerName}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>الهاتف:</span>
                    <span>{posPoint.phone}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-0.5 border-t border-slate-200">
                    <span>الفترة:</span>
                    <span className="font-bold">{dateFrom || 'البداية'} إلى {dateTo || 'الآن'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>تاريخ الطباعة:</span>
                    <span>{new Date().toLocaleDateString('ar-EG')} {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Thermal Financial Summary */}
                <div className="border-y-2 border-dashed border-slate-400 py-2 space-y-1 text-[11px] font-mono">
                  {dateFrom && (
                    <div className="flex justify-between text-slate-700">
                      <span>الرصيد السابق:</span>
                      <span className="font-bold">{(ledgerData.openingBalance ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800">
                    <span>مسحوبات ومبيعات الفترة (+):</span>
                    <span className="font-bold">{(ledgerData.periodDebits ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>المسدد نقداً (-):</span>
                    <span>{(ledgerData.periodCredits ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-slate-950 font-black text-xs pt-1 border-t border-slate-300 bg-slate-100 p-1 rounded">
                    <span>الرصيد المتبقي (المطلوب):</span>
                    <span>{(ledgerData.closingBalance ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                </div>

                {/* Stock Summary */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] space-y-1">
                  <div className="font-black text-slate-900 text-center border-b border-slate-200 pb-0.5">
                    جرد كروت المحل (المتبقي: {fullInventory.totalRemaining} كارت)
                  </div>
                  <div className="space-y-0.5 font-mono">
                    {categories.map((cat) => {
                      const stats = fullInventory.byCategory[cat.id];
                      if (!stats || (stats.dispatched === 0 && stats.sold === 0)) return null;
                      return (
                        <div key={cat.id} className="flex justify-between text-slate-700">
                          <span>{cat.name}:</span>
                          <span>مستلم: {stats.dispatched} | باقي: <strong>{stats.remaining}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Transactions List (Thermal Compact) */}
                <div>
                  <div className="font-black text-slate-900 text-[10px] mb-1">
                    سجل الحركات ({ledgerData.periodTxs.length}):
                  </div>
                  <div className="space-y-1 text-[10px]">
                    {ledgerData.periodTxs.slice(0, 15).map((tx, idx) => (
                      <div key={idx} className="border-b border-slate-200 pb-1 font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>{tx.date}</span>
                          <span className="font-bold text-slate-900">{tx.typeName}</span>
                        </div>
                        <div className="text-slate-800 text-[9px] truncate">{tx.description}</div>
                        <div className="flex justify-between items-center text-slate-950 font-bold pt-0.5">
                          <span>
                            {tx.debit > 0 ? `+${(tx.debit ?? 0).toLocaleString()}` : `-${(tx.credit ?? 0).toLocaleString()}`} {settings.currencySymbol}
                          </span>
                          <span className="text-slate-500 text-[9px]">رصيد: {(tx.runningBalance ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {ledgerData.periodTxs.length === 0 && (
                      <div className="text-center text-slate-500 py-2">لا توجد حركات في الفترة المحددة</div>
                    )}
                  </div>
                </div>

                {/* Thermal Footer */}
                <div className="text-center pt-2 border-t-2 border-dashed border-slate-400 space-y-1">
                  <p className="text-[10px] font-bold text-slate-800">شكراً لتعاملكم وحسن ثقتكم</p>
                  <p className="text-[9px] text-slate-500 font-mono">يرجى مراجعة الحساب وتوقيع الاستلام</p>
                  <div className="pt-4 grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-800">
                    <div>
                      <p>المستلم / الموزع</p>
                      <div className="border-b border-slate-400 mt-4"></div>
                    </div>
                    <div>
                      <p>المحصل / الإدارة</p>
                      <div className="border-b border-slate-400 mt-4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* 2. OFFICIAL A4 DETAILED STATEMENT LAYOUT */
              /* ======================================================== */
              <>
                {/* Official Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-base">
                        {settings.networkName.charAt(0) || 'N'}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                        {settings.networkName}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 font-bold mt-1">
                      {settings.networkSlogan}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 font-medium">
                      هاتف الدعم: {settings.supportPhone} {settings.adminPhone ? `• الإدارة: ${settings.adminPhone}` : ''}
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-black text-xs shadow-xs">
                      كشف حساب مالي ومخزني لموزع
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-mono font-medium">
                      رقم الكشف: STMT-POS-{posPoint.id.slice(0, 6).toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono font-medium">
                      تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Statement Period Banner */}
                <div className="bg-indigo-50/70 border border-indigo-200/80 px-4 py-2 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-indigo-950">فترة الكشف المحددة:</span>
                    <span className="font-mono font-bold text-indigo-900">
                      {dateFrom ? `من ${dateFrom}` : 'منذ بداية التعامل'} {dateTo ? `إلى ${dateTo}` : 'حتى تاريخ اليوم'}
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-800 font-medium font-mono">
                    الحركات المسجلة: {ledgerData.periodTxs.length} حركة
                  </div>
                </div>

                {/* POS Point Information Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">اسم نقطة البيع / المحل:</span>
                    <strong className="text-slate-950 text-sm font-black">{posPoint.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">المسؤول / المستلم:</span>
                    <span className="text-slate-800 font-bold">{posPoint.managerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">رقم الهاتف:</span>
                    <span className="font-mono font-black text-slate-900">{posPoint.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">العنوان / الموقع:</span>
                    <span className="text-slate-700 font-medium">{posPoint.address || 'المركز الرئيسي'}</span>
                  </div>
                </div>

                {/* Financial KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Opening / Previous Balance */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-600 font-bold block">الرصيد السابق المنقول</span>
                    <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                      {(ledgerData.openingBalance ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-bold text-slate-600">{settings.currencySymbol}</span>
                    </span>
                  </div>

                  {/* Period Sales & Dispatches (Debits) */}
                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                    <span className="text-[11px] text-blue-900 font-bold block">مسحوبات ومبيعات الفترة</span>
                    <span className="text-base font-black text-blue-950 font-mono mt-1 block">
                      {(ledgerData.periodDebits ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-bold text-blue-800">{settings.currencySymbol}</span>
                    </span>
                  </div>

                  {/* Period Payments (Credits) */}
                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-900 font-bold block">المبالغ المسددة بالفترة</span>
                    <span className="text-base font-black text-emerald-950 font-mono mt-1 block">
                      {(ledgerData.periodCredits ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-bold text-emerald-800">{settings.currencySymbol}</span>
                    </span>
                  </div>

                  {/* Closing Debt */}
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                    <span className="text-[11px] text-amber-900 font-bold block">الرصيد المتبقي (المديونية)</span>
                    <span className="text-base font-black text-amber-950 font-mono mt-1 block">
                      {(ledgerData.closingBalance ?? 0).toLocaleString()}{' '}
                      <span className="text-xs font-bold text-amber-800">{settings.currencySymbol}</span>
                    </span>
                  </div>
                </div>

                {/* Cards Inventory Breakdown Table */}
                <div>
                  <h4 className="font-black text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>جرد وتفاصيل الكروت حسب الفئة:</span>
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-right divide-y divide-slate-200">
                      <thead className="bg-slate-100 text-slate-800 font-bold">
                        <tr>
                          <th className="py-2 px-3">فئة الكارت</th>
                          <th className="py-2 px-3">سعر البيع</th>
                          <th className="py-2 px-3">سعر التوريد (الجملة)</th>
                          <th className="py-2 px-2 text-center">المستلم</th>
                          <th className="py-2 px-2 text-center">المباع</th>
                          <th className="py-2 px-2 text-center font-black text-indigo-800 bg-indigo-50/50">المتبقي بالمحل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-mono">
                        {categories.map((cat) => {
                          const stats = fullInventory.byCategory[cat.id] || { dispatched: 0, sold: 0, remaining: 0 };
                          if (stats.dispatched === 0 && stats.sold === 0) return null;
                          return (
                            <tr key={cat.id} className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 font-bold text-slate-950 font-sans">{cat.name}</td>
                              <td className="py-2 px-3 text-slate-700">{cat.retailPrice} {settings.currencySymbol}</td>
                              <td className="py-2 px-3 text-slate-700">{cat.wholesalePrice} {settings.currencySymbol}</td>
                              <td className="py-2 px-2 text-center font-semibold text-slate-800">{stats.dispatched}</td>
                              <td className="py-2 px-2 text-center font-semibold text-slate-800">{stats.sold}</td>
                              <td className="py-2 px-2 text-center font-black text-indigo-700 bg-indigo-50/30">{stats.remaining}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detailed Financial Ledger Transactions Table */}
                <div>
                  <h4 className="font-black text-slate-900 mb-2 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>جدول الحركات المالية والتسديدات (كشف الحساب التفصيلي):</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono font-medium">
                      المعاملات المعروضة: {ledgerData.periodTxs.length}
                    </span>
                  </h4>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-right divide-y divide-slate-200">
                      <thead className="bg-slate-100 text-slate-800 font-bold">
                        <tr>
                          <th className="py-2.5 px-2 text-center w-10">#</th>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">البيان / الحركة</th>
                          <th className="py-2.5 px-3 text-left font-mono">مدين (+)</th>
                          <th className="py-2.5 px-3 text-left font-mono">دائن (-)</th>
                          <th className="py-2.5 px-3 text-left font-mono bg-slate-50">الرصيد التراكمي</th>
                          <th className="py-2.5 px-3">المرجع</th>
                          <th className="py-2.5 px-3 no-print text-center">عرض</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {/* Opening Balance Row if dateFrom is filtered */}
                        {dateFrom && (
                          <tr className="bg-slate-50 font-bold text-slate-800">
                            <td className="py-2 px-2 text-center font-mono text-[11px]">-</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{dateFrom}</td>
                            <td className="py-2 px-3 font-sans text-indigo-900" colSpan={3}>
                              ★ الرصيد السابق المنقول قبل تاريخ {dateFrom}
                            </td>
                            <td className="py-2 px-3 font-mono text-left font-black text-slate-900 bg-slate-100">
                              {(ledgerData.openingBalance ?? 0).toLocaleString()} {settings.currencySymbol}
                            </td>
                            <td className="py-2 px-3 text-[10px] text-slate-500 font-mono">افتتاحي</td>
                            <td className="py-2 px-3 no-print"></td>
                          </tr>
                        )}

                        {/* Transactions Rows */}
                        {ledgerData.periodTxs.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-2 text-center font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-slate-700 font-medium whitespace-nowrap">{row.date}</td>
                            <td className="py-2 px-3 text-slate-900 font-semibold">{row.description}</td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-800 text-left whitespace-nowrap">
                              {(row.debit || 0) > 0 ? `${(row.debit || 0).toLocaleString()} ${settings.currencySymbol}` : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-800 text-left whitespace-nowrap">
                              {(row.credit || 0) > 0 ? `${(row.credit || 0).toLocaleString()} ${settings.currencySymbol}` : '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-black text-slate-950 text-left whitespace-nowrap bg-slate-50/60">
                              {(row.runningBalance ?? 0).toLocaleString()} {settings.currencySymbol}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500 text-[10px] whitespace-nowrap font-medium">{row.ref}</td>
                            <td className="py-2 px-3 no-print text-center">
                              {row.type === 'payment' && onViewPaymentReceipt && (
                                <button
                                  onClick={() => onViewPaymentReceipt(row.rawObj as PaymentRecord)}
                                  className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold transition cursor-pointer"
                                  title="عرض سند القبض"
                                >
                                  سند قبض
                                </button>
                              )}
                              {row.type === 'sale' && onPrintSaleReceipt && (
                                <button
                                  onClick={() => onPrintSaleReceipt(row.rawObj as SalesRecord)}
                                  className="px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[10px] font-bold transition cursor-pointer"
                                  title="عرض الفاتورة"
                                >
                                  فاتورة
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {ledgerData.periodTxs.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                              لا توجد حركات مسجلة تطابق الفترة أو معايير البحث المحددة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      
                      {/* Table Footer Totals */}
                      <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-right">
                            إجمالي حركات الفترة المحددة:
                          </td>
                          <td className="py-3 px-3 font-mono text-left text-amber-900">
                            {(ledgerData.periodDebits ?? 0).toLocaleString()} {settings.currencySymbol}
                          </td>
                          <td className="py-3 px-3 font-mono text-left text-emerald-900">
                            {(ledgerData.periodCredits ?? 0).toLocaleString()} {settings.currencySymbol}
                          </td>
                          <td className="py-3 px-3 font-mono text-left text-indigo-950 bg-indigo-50">
                            {(ledgerData.closingBalance ?? 0).toLocaleString()} {settings.currencySymbol}
                          </td>
                          <td colSpan={2} className="py-3 px-3 text-[11px] text-slate-600 font-normal">
                            صافي الرصيد الختامي
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Official Signatures & Stamp for Print */}
                <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
                  <div>
                    <p className="font-bold mb-8 text-slate-900">توقيع وختم إدارة الشبكة</p>
                    <div className="w-40 border-b-2 border-slate-400 mx-auto"></div>
                  </div>
                  <div>
                    <p className="font-bold mb-8 text-slate-900">توقيع واستلام الموزع / نقطة البيع</p>
                    <div className="w-40 border-b-2 border-slate-400 mx-auto"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer (No-Print) */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>الرصيد النهائي المستحق:</span>
            <strong className="text-amber-400 font-mono text-sm">
              {(ledgerData.closingBalance ?? 0).toLocaleString()} {settings.currencySymbol}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق الكشف</span>
          </button>
        </div>
      </div>
    </div>
  );
};
