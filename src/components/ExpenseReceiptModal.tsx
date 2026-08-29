import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle,
  FileText,
  DollarSign,
  Receipt,
  User,
  Calendar,
  Building,
  CreditCard,
  FileDown,
  Loader2,
  FileCheck2
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  category?: ExpenseCategory;
  settings: NetworkSettings;
}

// Convert numbers to Arabic text (Tafqeet helper)
function tafqeetArabic(amount: number, currencyName: string = 'ريال يمني'): string {
  if (!amount || amount === 0) return `صفر ${currencyName}`;
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'آلاف', 'ألفاً'];
  const millions = ['', 'مليون', 'مليونان', 'ملايين', 'مليوناً'];

  function convertChunk(n: number): string {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) res += hundreds[h];
    if (t === 1 && o > 0) {
      const special = ['', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
      res += (res ? ' و ' : '') + special[o];
      return res;
    }
    if (o > 0) {
      res += (res ? ' و ' : '') + ones[o];
    }
    if (t > 0) {
      res += (res ? ' و ' : '') + tens[t];
    }
    return res;
  }

  let num = Math.floor(Math.abs(amount));
  if (num === 0) return `صفر ${currencyName}`;

  let parts: string[] = [];
  const mil = Math.floor(num / 1000000);
  num %= 1000000;
  const th = Math.floor(num / 1000);
  const rem = num % 1000;

  if (mil > 0) {
    if (mil === 1) parts.push('مليون');
    else if (mil === 2) parts.push('مليونان');
    else if (mil >= 3 && mil <= 10) parts.push(`${convertChunk(mil)} ملايين`);
    else parts.push(`${convertChunk(mil)} مليون`);
  }

  if (th > 0) {
    if (th === 1) parts.push('ألف');
    else if (th === 2) parts.push('ألفان');
    else if (th >= 3 && th <= 10) parts.push(`${convertChunk(th)} آلاف`);
    else parts.push(`${convertChunk(th)} ألفاً`);
  }

  if (rem > 0) {
    parts.push(convertChunk(rem));
  }

  return `فقط وقدره ${parts.join(' و ')} ${currencyName} لا غير`;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  isOpen,
  onClose,
  expense,
  category,
  settings,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>('a4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen || !expense) return null;

  const currency = settings?.currencySymbol || 'ر.ي';

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getWhatsAppMessage = () => {
    return `*${settings.networkName}*\n` +
      `💳 *سند صرف مصروفات رسمي*\n` +
      `رقم السند: *${expense.voucherNumber}*\n` +
      `التاريخ: ${expense.date}\n` +
      `نوع المصروف: *${expense.categoryName}*\n` +
      `البيان: *${expense.title}*\n` +
      `المدفوع له: *${expense.paidTo || '—'}*\n` +
      `المبلغ: *${expense.amount.toLocaleString()} ${currency}*\n` +
      `طريقة الدفع: ${expense.paymentMethod === 'cash' ? 'نقداً من الصندوق' : expense.paymentMethod === 'bank_transfer' ? 'حوالة بنكية' : 'شيك'}\n` +
      `📝 ${tafqeetArabic(expense.amount, settings?.currency || 'ريال يمني')}\n` +
      (expense.notes ? `ملاحظات: ${expense.notes}\n` : '');
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'expense-receipt-thermal-content' : 'expense-receipt-a4-content';
      await printElementDocument(containerId, {
        filename: `سند_صرف_${expense.voucherNumber}_${targetFormat}.pdf`,
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.8,
        margin: targetFormat === 'pos-80mm' ? 2 : 6,
      });
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPdf = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsExportingPdf(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'expense-receipt-thermal-content' : 'expense-receipt-a4-content';
      const fileName = `سند_صرف_${expense.voucherNumber}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `سند صرف - ${expense.voucherNumber}`,
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.8,
        margin: targetFormat === 'pos-80mm' ? 2 : 6,
      });

      if (ok) {
        showFeedback(`تم تحميل سند الصرف بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير 80mm' : 'ورق A4'}) بنجاح ✅`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId = paperFormat === 'pos-80mm' ? 'expense-receipt-thermal-content' : 'expense-receipt-a4-content';
      const fileName = `سند_صرف_${expense.voucherNumber}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `سند صرف - ${expense.voucherNumber}`,
        messageText: getWhatsAppMessage(),
        paperFormat: paperFormat,
        scale: 2.8,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال السند عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم حفظ ملف PDF وفتح محادثة واتساب لإرفاقه مباشرة ✅');
      }
    } catch (err) {
      console.error('WhatsApp Share Error:', err);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:h-auto print:overflow-visible">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none print:max-h-none">
        
        {/* Top Controls - Sticky & No-Print */}
        <div className="no-print p-3 sm:p-4 bg-slate-950/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 shadow-lg shadow-amber-600/25 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">سند صرف مصروف رسمي</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {expense.voucherNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {expense.categoryName} • {expense.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Paper Switcher */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  paperFormat === 'a4'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 ورق A4
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('pos-80mm')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  paperFormat === 'pos-80mm'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧾 كاشير (80mm)
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={() => handlePrint()}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>طباعة السند</span>
            </button>

            {/* PDF Export */}
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-amber-400" />}
              <span>تحميل PDF</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              disabled={isSharingWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSharingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span>واتساب</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="no-print bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {feedbackMessage}
            </span>
            <button onClick={() => setFeedbackMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Document Area */}
        <div className="p-4 sm:p-6 bg-slate-950 overflow-y-auto flex-1 print:p-0 print:bg-white print:overflow-visible">
          {paperFormat === 'a4' ? (
            /* ========================================================
               A4 OFFICIAL EXPENSE VOUCHER DOCUMENT
               ======================================================== */
            <div
              id="expense-receipt-a4-content"
              className="printable-document bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-6 print:rounded-none max-w-2xl mx-auto font-sans"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-900">{settings.networkName}</h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.networkSlogan}</p>
                  <p className="text-xs text-slate-500 mt-1">هاتف: {settings.supportPhone}</p>
                </div>
                <div className="text-left flex flex-col items-end">
                  <div className="inline-block px-3 py-1 rounded-lg text-sm font-black bg-amber-700 text-white shadow-sm">
                    سند صرف نقدية / مصروفات
                  </div>
                  <div className="mt-2 text-xs text-slate-700 font-mono text-left">
                    <div>رقم السند: <strong className="text-slate-900">{expense.voucherNumber}</strong></div>
                    <div>التاريخ: <strong className="text-slate-900">{expense.date}</strong></div>
                  </div>
                  <div className="mt-2">
                    <Barcode value={expense.voucherNumber} width={1.4} height={32} fontSize={9} margin={0} />
                  </div>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4 mb-6 flex justify-between items-center">
                <div>
                  <span className="text-xs text-amber-800 font-bold block">المبلغ المصروف:</span>
                  <span className="text-2xl font-black font-mono text-amber-900">
                    {expense.amount.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="text-left bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold text-slate-700">
                  طريقة الدفع: {expense.paymentMethod === 'cash' ? 'نقداً من الصندوق' : expense.paymentMethod === 'bank_transfer' ? 'حوالة بنكية' : 'شيك'}
                </div>
              </div>

              {/* Details Grid */}
              <div className="border border-slate-300 rounded-xl p-5 mb-6 space-y-3.5 text-xs">
                <div className="flex border-b border-slate-200 pb-2">
                  <span className="w-36 text-slate-500 font-medium">تصنيف وبند المصروف:</span>
                  <span className="font-bold text-slate-900 text-sm">{expense.categoryName}</span>
                </div>

                <div className="flex border-b border-slate-200 pb-2">
                  <span className="w-36 text-slate-500 font-medium">البيان والوصف التفصيلي:</span>
                  <span className="font-bold text-slate-800 flex-1">{expense.title}</span>
                </div>

                <div className="flex border-b border-slate-200 pb-2">
                  <span className="w-36 text-slate-500 font-medium">صُرف إلى الأخ / الجهة:</span>
                  <span className="font-bold text-slate-900">{expense.paidTo || 'المستفيد'}</span>
                </div>

                <div className="flex border-b border-slate-200 pb-2">
                  <span className="w-36 text-slate-500 font-medium">المبلغ كتابة وتفقيطاً:</span>
                  <span className="font-bold text-slate-900">
                    {tafqeetArabic(expense.amount, settings?.currency || 'ريال يمني')}
                  </span>
                </div>

                {expense.referenceNumber && (
                  <div className="flex border-b border-slate-200 pb-2">
                    <span className="w-36 text-slate-500 font-medium">رقم المرجع / الحوالة:</span>
                    <span className="font-mono font-bold text-slate-800">{expense.referenceNumber}</span>
                  </div>
                )}

                {expense.notes && (
                  <div className="flex">
                    <span className="w-36 text-slate-500 font-medium">ملاحظات إضافية:</span>
                    <span className="text-slate-700 flex-1">{expense.notes}</span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="border-t border-slate-300 pt-6 mt-8 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">المحاسب / الصندوق</span>
                  <span className="font-bold text-slate-800 block mb-8">{expense.createdByName || 'أمين الصندوق'}</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto"></div>
                  <span className="text-[10px] text-slate-400 mt-1 block">التوقيع</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">اعتماد الإدارة المالية</span>
                  <span className="font-bold text-slate-800 block mb-8">المدير المالي</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto"></div>
                  <span className="text-[10px] text-slate-400 mt-1 block">الختم والاعتماد</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">المستلم</span>
                  <span className="font-bold text-slate-800 block mb-8">{expense.paidTo || 'المستفيد'}</span>
                  <div className="border-b border-dashed border-slate-400 w-28 mx-auto"></div>
                  <span className="text-[10px] text-slate-400 mt-1 block">توقيع الاستلام</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-200">
                نظام إدارة شبكات المايكروتك والمبيعات • {settings.networkName} • {new Date().toLocaleString('ar-YE')}
              </div>
            </div>
          ) : (
            /* ========================================================
               THERMAL 80MM POS EXPENSE SLIP
               ======================================================== */
            <div
              id="expense-receipt-thermal-content"
              className="printable-thermal-document thermal-receipt bg-white text-black p-4 rounded-xl shadow-lg max-w-[320px] mx-auto text-xs font-mono border border-slate-300 print:shadow-none print:border-none print:p-1 print:max-w-none print:w-full"
            >
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h2 className="font-black text-sm tracking-tight">{settings.networkName}</h2>
                <div className="mt-1 font-bold inline-block px-2 py-0.5 bg-black text-white text-[11px] rounded">
                  *** سند صرف مصروف ***
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>رقم السند:</span>
                  <span className="font-bold">{expense.voucherNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{expense.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>نوع المصروف:</span>
                  <span className="font-bold truncate max-w-[140px]">{expense.categoryName}</span>
                </div>
                <div className="flex justify-between">
                  <span>المدفوع له:</span>
                  <span className="font-bold truncate max-w-[140px]">{expense.paidTo || 'المستفيد'}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع:</span>
                  <span>{expense.paymentMethod === 'cash' ? 'نقداً' : 'تحويل'}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-black">
                <div className="font-bold text-[10px] mb-1">البيان:</div>
                <div className="text-[11px] font-sans font-bold leading-snug">{expense.title}</div>
              </div>

              <div className="py-2 border-b border-dashed border-black flex justify-between items-center text-sm font-black">
                <span>المبلغ المصروف:</span>
                <span>{expense.amount.toLocaleString()} {currency}</span>
              </div>

              <div className="py-2 text-[9px] text-center border-b border-dashed border-black leading-tight">
                {tafqeetArabic(expense.amount, settings?.currency || 'ريال')}
              </div>

              {/* Barcode */}
              <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-black">
                <Barcode value={expense.voucherNumber} width={1.5} height={36} fontSize={10} margin={2} />
              </div>

              <div className="pt-3 pb-1 text-center text-[10px]">
                <div className="flex justify-between px-2">
                  <div>
                    <span>توقيع المحاسب</span>
                    <div className="mt-4 border-b border-black w-16"></div>
                  </div>
                  <div>
                    <span>توقيع المستلم</span>
                    <div className="mt-4 border-b border-black w-16"></div>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 pt-2">
                  {settings.supportPhone}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
