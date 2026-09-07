import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MapPin,
  FileDown,
  Loader2,
  Share2,
  Search,
  Calendar,
  Layers,
  RotateCcw,
  CheckCircle,
  Eye,
  Store,
  DollarSign,
  Receipt,
  ShoppingCart,
  Building2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Customer, InvoiceRecord, PaymentRecord, SalesRecord, CardCategory, POSPoint, NetworkSettings } from '../types';
import { exportElementToPdf, sharePdfToWhatsApp, printElementDocument } from '../utils/pdfExport';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { Barcode } from './Barcode';

interface CustomerStatementModalProps {
  customer: Customer;
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  sales?: SalesRecord[];
  categories?: CardCategory[];
  posPoints?: POSPoint[];
  settings?: NetworkSettings;
  onClose: () => void;
  onViewInvoiceReceipt?: (invoice: InvoiceRecord) => void;
}

interface StatementEntry {
  id: string;
  date: string;
  time?: string;
  timestamp: string;
  type: 'invoice_sale_credit' | 'invoice_sale_cash' | 'invoice_return' | 'direct_sale' | 'payment';
  typeName: string;
  description: string;
  itemsSummary?: string;
  quantity?: number;
  paymentTypeBadge?: string;
  debit: number; // مدين (عليه)
  credit: number; // دائن (له)
  balance: number; // الرصيد التراكمي
  reference: string;
  rawInvoice?: InvoiceRecord;
  rawPayment?: PaymentRecord;
  rawSale?: SalesRecord;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  invoices,
  payments,
  sales = [],
  categories = [],
  posPoints = [],
  settings,
  onClose,
  onViewInvoiceReceipt
}) => {
  const currency = settings?.currencySymbol || 'ريال';
  const networkName = settings?.networkName || 'نظام إدارة الشبكات والمبيعات';

  // State
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>('a4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'returns' | 'payments'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Invoice Modal Preview
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Compile all chronological customer transactions (Cashier invoices, Direct sales, Returns, Payments)
  const allEntries = useMemo(() => {
    const custInvoices = invoices.filter(
      (inv) => inv.customerId === customer.id && inv.status !== 'cancelled'
    );
    const custPayments = payments.filter((p) => p.customerId === customer.id);
    const custSales = sales.filter((s) => s.customerId === customer.id);

    let rawList: Omit<StatementEntry, 'balance'>[] = [];

    // 1. Process Cashier Invoices (Sales & Returns)
    custInvoices.forEach((inv) => {
      const itemsText = inv.items
        ?.map((item) => `${item.categoryName} × ${item.quantity}`)
        .join(' | ') || `${inv.totalQuantity || 0} كارت`;

      if (inv.type === 'sale') {
        const isCash = inv.paymentType === 'cash';
        rawList.push({
          id: inv.id,
          date: inv.date,
          time: inv.time || '00:00',
          timestamp: inv.timestamp || `${inv.date}T${inv.time || '00:00'}:00`,
          type: isCash ? 'invoice_sale_cash' : 'invoice_sale_credit',
          typeName: isCash ? 'فاتورة كاشير (نقدي)' : 'فاتورة كاشير (آجل)',
          description: isCash
            ? `فاتورة كاشير مسددة فوراً (${itemsText})`
            : `فاتورة مبيعات كروت بالآجل (${itemsText})`,
          itemsSummary: itemsText,
          quantity: inv.totalQuantity,
          paymentTypeBadge: isCash ? 'نقدي (مسدد)' : 'آجل على الحساب',
          debit: inv.totalWholesaleAmount || 0,
          credit: isCash ? inv.totalWholesaleAmount || 0 : 0, // In cash invoice, immediate credit settles the debit
          reference: inv.invoiceNumber,
          rawInvoice: inv
        });
      } else if (inv.type === 'return') {
        rawList.push({
          id: inv.id,
          date: inv.date,
          time: inv.time || '00:00',
          timestamp: inv.timestamp || `${inv.date}T${inv.time || '00:00'}:00`,
          type: 'invoice_return',
          typeName: 'فاتورة مرتجع كاشير',
          description: `فاتورة مرتجع كروت (${itemsText})${inv.reasonForReturn ? ` - سبب: ${inv.reasonForReturn}` : ''}`,
          itemsSummary: itemsText,
          quantity: inv.totalQuantity,
          paymentTypeBadge: 'مرتجع كروت',
          debit: 0,
          credit: inv.totalWholesaleAmount || 0,
          reference: inv.invoiceNumber,
          rawInvoice: inv
        });
      }
    });

    // 2. Process Direct POS Cashier Card Sales (if customerId matches)
    custSales.forEach((s) => {
      const cat = categories.find((c) => c.id === s.categoryId);
      const catName = cat?.name || 'كروت';
      const isCash = s.paymentType === 'cash';
      rawList.push({
        id: s.id,
        date: s.date,
        time: s.time || '00:00',
        timestamp: s.timestamp || `${s.date}T${s.time || '00:00'}:00`,
        type: 'direct_sale',
        typeName: isCash ? 'مبيعات كاشير (نقدي)' : 'مبيعات كاشير (آجل)',
        description: `مبيعات كروت مباشرة (${catName} × ${s.quantity})`,
        itemsSummary: `${catName} × ${s.quantity}`,
        quantity: s.quantity,
        paymentTypeBadge: isCash ? 'نقدي مباشر' : 'آجل على الحساب',
        debit: s.totalWholesaleAmount || 0,
        credit: isCash ? s.totalWholesaleAmount || 0 : 0,
        reference: s.invoiceNumber || 'كاشير',
        rawSale: s
      });
    });

    // 3. Process Payments & Collections
    custPayments.forEach((p) => {
      const methodText =
        p.paymentMethod === 'cash'
          ? 'نقداً'
          : p.paymentMethod === 'bank_transfer'
          ? 'تحويل بنكي'
          : p.paymentMethod === 'cheque'
          ? 'شيك'
          : 'أخرى';

      rawList.push({
        id: p.id,
        date: p.date,
        time: p.time || '00:00',
        timestamp: p.timestamp || `${p.date}T${p.time || '00:00'}:00`,
        type: 'payment',
        typeName: 'سند قبض وتحصيل',
        description: `سند قبض مالي (${methodText}) ${p.receivedBy ? `- المستلم: ${p.receivedBy}` : ''} ${p.notes ? `(${p.notes})` : ''}`,
        paymentTypeBadge: methodText,
        debit: 0,
        credit: p.amount || 0,
        reference: p.referenceNumber || 'سند قبض',
        rawPayment: p
      });
    });

    // Sort chronologically ascending
    rawList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Compute continuous running balance
    let running = 0;
    return rawList.map((item) => {
      running += item.debit - item.credit;
      return {
        ...item,
        balance: running
      };
    });
  }, [customer.id, invoices, payments, sales, categories]);

  // Overall Financial Summaries (All-time)
  const totalDebitsAllTime = allEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCreditsAllTime = allEntries.reduce((sum, e) => sum + e.credit, 0);
  const netBalanceAllTime = totalDebitsAllTime - totalCreditsAllTime;

  // Filtered transactions for the current view / period
  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      // Tab filter
      if (activeTab === 'invoices') {
        if (item.type !== 'invoice_sale_credit' && item.type !== 'invoice_sale_cash' && item.type !== 'direct_sale') {
          return false;
        }
      } else if (activeTab === 'returns') {
        if (item.type !== 'invoice_return') return false;
      } else if (activeTab === 'payments') {
        if (item.type !== 'payment') return false;
      }

      // Date filter
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;

      // Search term
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const inDesc = item.description.toLowerCase().includes(s);
        const inRef = item.reference.toLowerCase().includes(s);
        const inType = item.typeName.toLowerCase().includes(s);
        const inItems = (item.itemsSummary || '').toLowerCase().includes(s);
        if (!inDesc && !inRef && !inType && !inItems) return false;
      }

      return true;
    });
  }, [allEntries, activeTab, dateFrom, dateTo, searchTerm]);

  // Period sums
  const periodDebits = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const periodCredits = filteredEntries.reduce((sum, e) => sum + e.credit, 0);

  // Quick Date presets
  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setActiveTab('all');
  };

  // WhatsApp text template
  const getWhatsAppMessageText = () => {
    const periodLabel = dateFrom || dateTo
      ? `من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`
      : 'كافة الحركات المسجلة';

    return `*كشف حساب عميل موحد - ${networkName}*
----------------------------------------
👤 العميل: *${customer.name}*
📱 الهاتف: ${customer.phone || 'غير مسجل'}
📍 العنوان: ${customer.address || '---'}
📅 الفترة: ${periodLabel}
⏱ تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}

📊 *الملخص المالي والحسابي:*
- إجمالي مسحوبات وفواتير الكاشير: ${totalDebitsAllTime.toLocaleString()} ${currency}
- إجمالي سندات القبض والدفعات: ${totalCreditsAllTime.toLocaleString()} ${currency}
- 🔴 *الرصيد المتبقي الحالي: ${Math.abs(netBalanceAllTime).toLocaleString()} ${currency} ${netBalanceAllTime > 0 ? '(مدين / عليه)' : netBalanceAllTime < 0 ? '(دائن / له)' : '(خالص الحساب)'}*

----------------------------------------
شكراً لتعاملكم معنا ونسعد دائماً بخدمتكم 🌹
${settings?.supportPhone ? `للتواصل والاستفسار: ${settings.supportPhone}` : ''}`;
  };

  // 1. PDF Download Handler
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fileName = `كشف_حساب_${customer.name.replace(/\s+/g, '_')}_${paperFormat}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await exportElementToPdf('customer-statement-print-area', {
        filename: fileName,
        title: `كشف حساب عميل - ${customer.name}`,
        paperFormat: paperFormat,
        format: paperFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        scale: 2.4
      });

      if (ok) {
        showFeedback('تم تصدير وتحميل كشف الحساب بصيغة PDF بنجاح ✅');
      } else {
        showFeedback('تعذر تصدير PDF، يرجى المحاولة عبر زر الطباعة');
      }
    } catch (err) {
      console.error('PDF Export Error:', err);
      showFeedback('حدث خطأ أثناء تصدير ملف الـ PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. WhatsApp Share Handler
  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const fileName = `كشف_حساب_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const res = await sharePdfToWhatsApp('customer-statement-print-area', {
        filename: fileName,
        title: `كشف حساب - ${customer.name}`,
        phone: customer.phone || '',
        messageText: getWhatsAppMessageText(),
        paperFormat: paperFormat,
        format: paperFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        scale: 2.4
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال الـ PDF عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم تنزيل الـ PDF وفتح محادثة واتساب لإرفاقه ✅');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      const cleanPhone = customer.phone ? (customer.phone.startsWith('967') ? customer.phone : `967${customer.phone}`) : '';
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(getWhatsAppMessageText())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // 3. Print Handler
  const handlePrint = () => {
    printElementDocument('customer-statement-print-area', {
      title: `كشف_حساب_${customer.name}`
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 rounded-xl flex items-center justify-center">
                <Receipt size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">كشف حساب العميل</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    فواتير كاشير ومبيعات وسندات
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-200">{customer.name}</span>
                  {customer.phone && (
                    <span className="text-slate-400 font-mono">({customer.phone})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Top Actions: Paper Format Toggle, PDF, Print, Share, Close */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Paper Format Switch */}
              <div className="bg-slate-800/90 p-1 rounded-xl flex items-center border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPaperFormat('a4')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    paperFormat === 'a4'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  <span>A4 رسمي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperFormat('pos-80mm')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    paperFormat === 'pos-80mm'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Store size={14} />
                  <span>كاشير حراري 80mm</span>
                </button>
              </div>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                title="تحميل كشف الحساب بصيغة PDF"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <FileDown size={15} />
                    <span>تحميل PDF</span>
                  </>
                )}
              </button>

              {/* Share WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSharingWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                title="مشاركة الكشف كملف PDF ورسالة عبر واتساب"
              >
                {isSharingWhatsApp ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Share2 size={15} />
                )}
                <span className="hidden sm:inline">واتساب</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
                title="طباعة كشف الحساب"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">طباعة</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 transition animate-fade-in">
              <CheckCircle size={15} />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Controls Bar: Tabs, Filters, Search (Hidden in Print) */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                الكل ({allEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'invoices'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart size={13} />
                <span>فواتير الكاشير ({allEntries.filter(e => e.type.startsWith('invoice_sale') || e.type === 'direct_sale').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'payments'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <DollarSign size={13} />
                <span>سندات القبض ({allEntries.filter(e => e.type === 'payment').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('returns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'returns'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <RotateCcw size={13} />
                <span>المرتجعات ({allEntries.filter(e => e.type === 'invoice_return').length})</span>
              </button>
            </div>

            {/* Date Filters & Search */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالفاتورة أو البيان..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-44 sm:w-52 pr-9 pl-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs text-slate-600">
                <Calendar size={13} className="text-slate-400" />
                <span>من:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-hidden text-slate-800"
                />
                <span>إلى:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={handleSetThisMonth}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  الشهر
                </button>
                {(dateFrom || dateTo || searchTerm || activeTab !== 'all') && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="تفريغ التصفية"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Printable Statement Area (A4 or 80mm) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
            <div id="customer-statement-print-area" className="mx-auto">
              {paperFormat === 'a4' ? (
                /* ==================== A4 FORMAL STATEMENT VIEW ==================== */
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-4xl mx-auto font-sans">
                  {/* Official Header */}
                  <div className="pb-6 border-b-2 border-slate-900/10 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight">{networkName}</h1>
                      <p className="text-xs text-slate-500 mt-1">
                        {settings?.companyAddress || 'منظومة إدارة الكروت والمبيعات والتحصيلات'}
                      </p>
                      {settings?.supportPhone && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          هاتف الدعم: {settings.supportPhone}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black mb-1.5">
                        كشف حساب عميل موحد
                      </div>
                      <p className="text-xs text-slate-500">
                        تاريخ الإصدار: <span className="font-bold text-slate-800 font-mono">{new Date().toISOString().slice(0, 10)}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        وقت الكشف: <span className="font-bold text-slate-800 font-mono">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>

                  {/* Customer Information Box */}
                  <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">اسم العميل:</span>
                        <span className="text-sm font-black text-slate-900">{customer.name}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">رقم الهاتف:</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">{customer.phone || 'غير مسجل'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">العنوان / المنطقة:</span>
                        <span className="text-sm font-medium text-slate-800">{customer.address || 'اليمن'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-0.5">حالة الحساب:</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} />
                          <span>نشط ومفعل</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Statistics Summary Cards */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                        <span>مسحوبات الكاشير</span>
                        <ShoppingCart size={14} className="text-indigo-500" />
                      </div>
                      <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                        {totalDebitsAllTime.toLocaleString()} <span className="text-[11px] font-sans font-bold text-slate-500">{currency}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                        <span>إجمالي المقبوضات</span>
                        <DollarSign size={14} className="text-emerald-500" />
                      </div>
                      <div className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                        {totalCreditsAllTime.toLocaleString()} <span className="text-[11px] font-sans font-bold text-slate-500">{currency}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                        <span>عدد الحركات</span>
                        <Receipt size={14} className="text-amber-500" />
                      </div>
                      <div className="text-base sm:text-lg font-black text-slate-800 font-mono">
                        {filteredEntries.length} <span className="text-[11px] font-sans font-normal text-slate-500">حركة</span>
                      </div>
                    </div>

                    <div className={`rounded-xl p-3.5 border ${
                      netBalanceAllTime > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : netBalanceAllTime < 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1 opacity-80">
                        <span>الرصيد المتبقي</span>
                        <Sparkles size={14} />
                      </div>
                      <div className="text-base sm:text-lg font-black font-mono">
                        {Math.abs(netBalanceAllTime).toLocaleString()}{' '}
                        <span className="text-[11px] font-sans font-bold">{currency}</span>
                      </div>
                      <span className="text-[10px] font-bold block mt-0.5">
                        {netBalanceAllTime > 0
                          ? '● مديونية مطلوبة (عليه)'
                          : netBalanceAllTime < 0
                          ? '● رصيد مستحق (له)'
                          : '● الحساب مسدد وخالص'}
                      </span>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="py-2.5 px-3">التاريخ والوقت</th>
                          <th className="py-2.5 px-3">نوع الحركة والبيان</th>
                          <th className="py-2.5 px-3">الرقم المرجعي</th>
                          <th className="py-2.5 px-3">طريقة الدفع</th>
                          <th className="py-2.5 px-3 text-rose-300">مدين (عليه)</th>
                          <th className="py-2.5 px-3 text-emerald-300">دائن (له)</th>
                          <th className="py-2.5 px-3 text-indigo-300">الرصيد التراكمي</th>
                          <th className="py-2.5 px-2 text-center no-print">معاينة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredEntries.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                              لا توجد حركات مسجلة للعميل وفق معايير التصفية الحالية.
                            </td>
                          </tr>
                        ) : (
                          filteredEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="font-bold text-slate-800 font-mono">{entry.date}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{entry.time}</div>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                  {entry.type.startsWith('invoice_sale') || entry.type === 'direct_sale' ? (
                                    <ArrowUpRight size={14} className="text-rose-500 shrink-0" />
                                  ) : entry.type === 'invoice_return' ? (
                                    <RotateCcw size={14} className="text-amber-500 shrink-0" />
                                  ) : (
                                    <ArrowDownLeft size={14} className="text-emerald-500 shrink-0" />
                                  )}
                                  <span>{entry.typeName}</span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                  {entry.description}
                                </div>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-slate-700">
                                {entry.reference}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  entry.type === 'invoice_sale_cash'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : entry.type === 'invoice_sale_credit'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : entry.type === 'invoice_return'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {entry.paymentTypeBadge || 'نقداً'}
                                </span>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap font-bold font-mono text-rose-600">
                                {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap font-bold font-mono text-emerald-600">
                                {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap font-black font-mono text-indigo-700 bg-indigo-50/40">
                                {Math.abs(entry.balance).toLocaleString()} {entry.balance > 0 ? '(مدين)' : entry.balance < 0 ? '(دائن)' : ''}
                              </td>
                              <td className="py-2 px-2 text-center whitespace-nowrap no-print">
                                {entry.rawInvoice ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingInvoice(entry.rawInvoice || null);
                                      onViewInvoiceReceipt?.(entry.rawInvoice!);
                                    }}
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="عرض الفاتورة"
                                  >
                                    <Eye size={15} />
                                  </button>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {filteredEntries.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                          <tr>
                            <td colSpan={4} className="py-3 px-3 text-left font-black">
                              إجماليات الفترة المعروضة:
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-rose-600">
                              {periodDebits.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-emerald-600">
                              {periodCredits.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-indigo-700 bg-indigo-100/50">
                              {Math.abs(netBalanceAllTime).toLocaleString()} {currency}
                            </td>
                            <td className="no-print"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Signatures & Approvals Section */}
                  <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">أمين الصندوق / الكاشير</p>
                      <p className="text-[11px] text-slate-400">التوقيع: ............................</p>
                    </div>
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">المحاسب المالي</p>
                      <p className="text-[11px] text-slate-400">التوقيع: ............................</p>
                    </div>
                    <div className="space-y-8">
                      <p className="font-bold text-slate-800">مصادقة واستلام العميل</p>
                      <p className="text-[11px] text-slate-400">التوقيع: ............................</p>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-8 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
                    تم إصدار هذا الكشف آلياً بواسطة {networkName} بتاريخ {new Date().toLocaleString('ar-SA')} - النظام المعتمد لإدارة المبيعات والكروت
                  </div>
                </div>
              ) : (
                /* ==================== 80MM THERMAL POS RECEIPT VIEW ==================== */
                <div className="w-[315px] mx-auto bg-white p-4 rounded-xl shadow-md border border-slate-300 text-black text-xs font-mono select-none">
                  {/* Store / Network Header */}
                  <div className="text-center pb-2 border-b border-dashed border-black">
                    <h2 className="text-base font-black tracking-tight">{networkName}</h2>
                    <p className="text-[11px] font-sans mt-0.5">{settings?.companyAddress || 'كشف حساب كاشير رسمي'}</p>
                    {settings?.supportPhone && (
                      <p className="text-[10px] mt-0.5">هاتف: {settings.supportPhone}</p>
                    )}
                    <div className="mt-1.5 inline-block px-2 py-0.5 bg-black text-white rounded text-[10px] font-bold font-sans">
                      كشف حساب العميل (80mm)
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="py-2 border-b border-dashed border-black text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="font-sans font-bold">العميل:</span>
                      <span className="font-bold">{customer.name}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex justify-between">
                        <span className="font-sans">الهاتف:</span>
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px]">
                      <span className="font-sans">تاريخ التقرير:</span>
                      <span>{new Date().toISOString().slice(0, 10)} {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="py-2 border-b border-dashed border-black text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="font-sans">إجمالي المسحوبات:</span>
                      <span className="font-bold">{totalDebitsAllTime.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans">إجمالي السداد:</span>
                      <span className="font-bold">{totalCreditsAllTime.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-dotted border-black text-sm font-black">
                      <span className="font-sans">الرصيد الصافي:</span>
                      <span>{Math.abs(netBalanceAllTime).toLocaleString()} {currency}</span>
                    </div>
                    <div className="text-left text-[10px] font-sans font-bold">
                      {netBalanceAllTime > 0 ? '(مدين / عليه)' : netBalanceAllTime < 0 ? '(دائن / له)' : '(خالص)'}
                    </div>
                  </div>

                  {/* Ledger Transactions List */}
                  <div className="py-2 border-b border-dashed border-black">
                    <div className="text-[10px] font-sans font-bold mb-1.5 flex justify-between">
                      <span>البيان / التاريخ</span>
                      <span>مدين / دائن</span>
                    </div>

                    <div className="space-y-2">
                      {filteredEntries.map((e) => (
                        <div key={e.id} className="text-[10px] border-b border-dotted border-slate-200 pb-1.5">
                          <div className="flex justify-between items-start font-bold">
                            <span className="font-sans">{e.typeName}</span>
                            <span>{e.reference}</span>
                          </div>
                          <div className="text-[9px] text-slate-600 font-sans mt-0.5 line-clamp-1">
                            {e.description}
                          </div>
                          <div className="flex justify-between items-center text-[9px] mt-0.5">
                            <span className="text-slate-500">{e.date}</span>
                            <div className="space-x-2">
                              {e.debit > 0 && (
                                <span className="font-bold text-rose-700">+{e.debit.toLocaleString()}</span>
                              )}
                              {e.credit > 0 && (
                                <span className="font-bold text-emerald-700">-{e.credit.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Barcode & Footer */}
                  <div className="pt-3 text-center space-y-2">
                    <Barcode
                      value={`CUST-${customer.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`}
                      height={32}
                      width={1.4}
                      fontSize={9}
                      displayValue={true}
                    />
                    <p className="text-[9px] font-sans text-slate-600">
                      شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Receipt Modal Preview if requested */}
      {viewingInvoice && (
        <InvoiceReceiptModal
          isOpen={true}
          invoice={viewingInvoice}
          customer={customer}
          posPoint={posPoints.find(p => p.id === viewingInvoice.posPointId)}
          categories={categories}
          settings={settings || { networkName: 'إدارة الشبكات', currencySymbol: 'ريال' } as any}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </>
  );
};
