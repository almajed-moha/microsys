import React, { useState } from 'react';
import {
  Printer,
  Share2,
  X,
  DollarSign,
  CheckCircle,
  Calendar,
  Store,
  CreditCard,
  UserCheck,
  Building2,
  ShieldCheck,
  FileCheck2,
  FileDown,
  Loader2,
  FileText,
  Receipt
} from 'lucide-react';
import { PaymentRecord, POSPoint, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface OfficialPaymentReceiptModalProps {
  payment: PaymentRecord;
  posPoints: POSPoint[];
  settings: NetworkSettings;
  onClose: () => void;
}

// Convert numbers to Arabic words for financial receipts
function numberToArabicWords(num: number, currency: string = 'ريال'): string {
  if (num === 0) return `صفر ${currency}`;
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف', 'عشرة آلاف'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    
    if (h > 0) {
      result += hundreds[h];
    }
    
    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder < 20) {
        result += ones[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          result += `${ones[o]} و${tens[t]}`;
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const thousandsPart = Math.floor(num / 1000);
  const unitsPart = num % 1000;
  let text = '';

  if (thousandsPart > 0) {
    if (thousandsPart <= 10) {
      text += thousands[thousandsPart];
    } else {
      text += `${convertGroup(thousandsPart)} ألف`;
    }
  }

  if (unitsPart > 0) {
    if (text) text += ' و';
    text += convertGroup(unitsPart);
  }

  return `${text} ${currency} لا غير`;
}

export const OfficialPaymentReceiptModal: React.FC<OfficialPaymentReceiptModalProps> = ({
  payment,
  posPoints,
  settings,
  onClose,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>('a4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const pos = posPoints.find((p) => p.id === payment.posPointId);

  const paymentMethodLabel = {
    cash: 'نقداً كاش',
    bank_transfer: 'حوالة مصرفية / بنكية',
    cheque: 'شيك بنكي',
    other: 'محفظة إلكترونية / أخرى',
  }[payment.paymentMethod] || 'نقداً كاش';

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getFormattedWhatsAppMessage = () => {
    return `*سند قبض مالي رسمي - شبكة ${settings.networkName}*
----------------------------------------
📄 رقم السند: *${payment.referenceNumber || payment.id}*
📅 التاريخ: ${payment.date} ${payment.time ? `- ${payment.time}` : ''}
👤 استلمنا من الأخ/الموزع: *${pos ? pos.name : 'نقطة البيع'}*
🏢 المسؤول: ${pos?.managerName || ''} (${pos?.phone || ''})
💵 المبلغ المسدد: *${(payment.amount ?? 0).toLocaleString()} ${settings.currencySymbol}*
📝 فقط: ${numberToArabicWords(payment.amount, settings.currencySymbol)}
💳 طريقة السداد: ${paymentMethodLabel}
🏷️ المستلم: ${payment.receivedBy || 'إدارة الشبكة'}
${payment.notes ? `📌 ملاحظات: ${payment.notes}` : ''}
${pos ? `📊 المديونية المتبقية حالياً: ${(pos.currentDebt ?? 0).toLocaleString()} ${settings.currencySymbol}` : ''}
----------------------------------------
شكراً لتعاملكم ووفائكم بالسداد 🌹
للاستفسار والدعم: ${settings.supportPhone}`;
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'official-payment-thermal-content' : 'official-payment-receipt-content';
      await printElementDocument(containerId, {
        filename: `سند_قبض_${payment.referenceNumber || payment.id}_${targetFormat}.pdf`,
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
      const containerId = targetFormat === 'pos-80mm' ? 'official-payment-thermal-content' : 'official-payment-receipt-content';
      const fileName = `سند_قبض_${payment.referenceNumber || payment.id}_${pos ? pos.name.replace(/\s+/g, '_') : 'موزع'}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `سند قبض مالي - ${settings.networkName}`,
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.8,
        margin: targetFormat === 'pos-80mm' ? 2 : 6,
      });

      if (ok) {
        showFeedback(`تم تحميل سند القبض بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير 80mm' : 'ورق A4'}) بنجاح ✅`);
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
      const containerId = paperFormat === 'pos-80mm' ? 'official-payment-thermal-content' : 'official-payment-receipt-content';
      const fileName = `سند_قبض_${payment.referenceNumber || payment.id}_${pos ? pos.name.replace(/\s+/g, '_') : 'موزع'}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `سند قبض - ${pos?.name || 'موزع'}`,
        phone: pos?.phone,
        messageText: getFormattedWhatsAppMessage(),
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
      const url = `https://wa.me/${pos?.phone ? (pos.phone.startsWith('967') ? pos.phone : `967${pos.phone}`) : ''}?text=${encodeURIComponent(getFormattedWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        
        {/* Control Bar - No Print */}
        <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
              <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">سند قبض مالي رسمي</span>
            </h3>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPaperFormat('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paperFormat === 'a4'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ورق A4</span>
            </button>
            <button
              onClick={() => setPaperFormat('pos-80mm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paperFormat === 'pos-80mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>كاشير (80mm)</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="تحويل السند إلى ملف PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            <button
              onClick={handleWhatsApp}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="إرسال سند السداد عبر واتساب كملف PDF"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">واتساب PDF</span>
            </button>

            <button
              onClick={() => handlePrint()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className={`px-2.5 sm:px-3 py-1.5 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                paperFormat === 'pos-80mm' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="طباعة السند"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{paperFormat === 'pos-80mm' ? 'طباعة كاشير' : 'طباعة A4'}</span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:block p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex-shrink-0 cursor-pointer"
              title="إغلاق النافذة"
              aria-label="إغلاق"
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

        {/* Receipt Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60 flex items-center justify-center">

          {/* FORMAT 1: A4 Standard Document */}
          {paperFormat === 'a4' && (
            <div
              id="official-payment-receipt-content"
              className="p-6 sm:p-8 space-y-6 text-xs bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg mx-auto font-sans printable-document"
              dir="rtl"
            >
              {/* Header */}
              <div className="border-b-2 border-emerald-600 pb-4 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-mono font-medium">التاريخ: {payment.date} {payment.time ? ` - ${payment.time}` : ''}</span>
                    <span className="text-[10px] text-slate-500 block font-mono font-medium">
                      الوقت: {new Date(payment.timestamp || Date.now()).toLocaleTimeString('ar-YE')}
                    </span>
                  </div>

                  <div className="text-center flex-1">
                    <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                      {settings.networkName}
                    </h1>
                    <p className="text-xs text-slate-600 font-bold">{settings.networkSlogan}</p>
                    <p className="text-[10px] text-slate-500 font-mono font-medium">هاتف الدعم: {settings.supportPhone}</p>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 block font-semibold">رقم السند:</span>
                    <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      {payment.referenceNumber || payment.id}
                    </span>
                  </div>
                </div>

                <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 font-black text-sm">
                  سـنـد قـبـض مـالـي (سداد دفعة حساب)
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-900 block font-bold">المبلغ المقبوض:</span>
                  <span className="text-2xl font-black font-mono text-emerald-950">
                    {(payment?.amount ?? 0).toLocaleString()} <span className="text-xs font-bold text-emerald-800">{settings.currencySymbol}</span>
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-emerald-900 block font-bold">طريقة السداد:</span>
                  <span className="font-black text-slate-900 text-sm bg-white px-2.5 py-1 rounded-md border border-emerald-200 inline-block">{paymentMethodLabel}</span>
                </div>
              </div>

              {/* Detailed Statement Lines */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-start gap-2 border-b border-slate-200 pb-2">
                  <span className="text-slate-500 min-w-28 font-semibold">استلمنا من الأخ:</span>
                  <span className="font-black text-slate-950 text-sm flex-1">
                    {pos ? pos.name : 'نقطة البيع'} {pos?.managerName ? `(المسؤول: ${pos.managerName})` : ''}
                  </span>
                </div>

                <div className="flex items-start gap-2 border-b border-slate-200 pb-2">
                  <span className="text-slate-500 min-w-28 font-semibold">مبلغ وقدره:</span>
                  <span className="font-bold text-emerald-900 flex-1">
                    {numberToArabicWords(payment?.amount || 0, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex items-start gap-2 border-b border-slate-200 pb-2">
                  <span className="text-slate-500 min-w-28 font-semibold">وذلك عن:</span>
                  <span className="text-slate-800 flex-1 font-medium">
                    {payment.notes || 'سداد دفعة من قيمة مبيعات كروت الشبكة وتوريد الحساب'}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-slate-500 min-w-28 font-semibold">المحصل / المستلم:</span>
                  <span className="font-bold text-slate-900 flex-1">
                    {payment.receivedBy || 'إدارة الشبكة والمبيعات'}
                  </span>
                </div>
              </div>

              {/* Financial Balance Status for this POS Point */}
              {pos && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-blue-900 block font-semibold">إجمالي سداد النقطة حتى الآن:</span>
                    <span className="font-mono font-black text-blue-950 text-xs">
                      {(pos.totalCashPaid ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-700 block font-semibold">المديونية المتبقية حالياً:</span>
                    <span className={`font-mono font-black text-xs ${(pos.currentDebt ?? 0) > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                      {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Signatures & Seal */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-slate-600 block mb-8 font-bold">توقيع المسدد / الموزع</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-36 mx-auto"></div>
                </div>

                <div>
                  <span className="text-slate-600 block mb-8 font-bold">توقيع وختم المستلم (الشبكة)</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-36 mx-auto"></div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-4 border-t border-slate-200 space-y-1">
                <p className="text-[11px] text-slate-700 font-semibold">
                  {settings.invoiceFooterText || `هذا السند صادر إلكترونياً من نظام إدارة شبكات مايكروتك • ${settings.networkName}`}
                </p>
                <p className="text-[9px] text-slate-400 font-mono">
                  نظام إدارة شبكات مايكروتك • تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}
                </p>
              </div>
            </div>
          )}

          {/* FORMAT 2: Thermal POS Cashier Receipt (80mm Paper Size) */}
          {paperFormat === 'pos-80mm' && (
            <div
              id="official-payment-thermal-content"
              className="p-4 bg-white text-black font-mono text-xs shadow-2xl rounded-lg border-2 border-slate-300 w-full max-w-[340px] mx-auto space-y-3 printable-thermal-document"
              dir="rtl"
              style={{ fontFamily: 'monospace, system-ui' }}
            >
              {/* Thermal Header */}
              <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
                <div className="font-black text-base tracking-tight">{settings.networkName}</div>
                <div className="text-[11px] font-bold">{settings.networkSlogan}</div>
                <div className="text-[10px]">هاتف الدعم: {settings.supportPhone}</div>
              </div>

              {/* Title & Metadata */}
              <div className="text-center py-1 border-b border-dashed border-black">
                <div className="font-black text-sm bg-black text-white py-0.5 px-2 inline-block rounded">
                  *** سـنـد قـبـض مـالـي ***
                </div>
                <div className="flex justify-between items-center text-[11px] mt-2 font-bold">
                  <span>رقم السند:</span>
                  <span className="font-black">{payment.referenceNumber || payment.id}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-800">
                  <span>التاريخ: {payment.date} {payment.time ? ` - ${payment.time}` : ''}</span>
                  <span>الوقت: {new Date(payment.timestamp || Date.now()).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Payer Information */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span className="font-semibold">المسدد / النقطة:</span>
                  <span className="font-black">{pos ? pos.name : 'نقطة البيع'}</span>
                </div>
                {pos?.managerName && (
                  <div className="flex justify-between text-[10px]">
                    <span>المسؤول:</span>
                    <span>{pos.managerName}</span>
                  </div>
                )}
                {pos?.phone && (
                  <div className="flex justify-between text-[10px]">
                    <span>الهاتف:</span>
                    <span>{pos.phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span>طريقة السداد:</span>
                  <span className="font-bold">{paymentMethodLabel}</span>
                </div>
                {payment.receivedBy && (
                  <div className="flex justify-between text-[10px]">
                    <span>المستلم:</span>
                    <span>{payment.receivedBy}</span>
                  </div>
                )}
              </div>

              {/* Amount & Words */}
              <div className="space-y-1.5 py-1.5 border-b-2 border-dashed border-black">
                <div className="flex justify-between items-center text-sm font-black">
                  <span>المبلغ المقبوض:</span>
                  <span className="text-base">{(payment.amount ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="text-[10px] font-bold text-center bg-slate-100 p-1 rounded border border-slate-300">
                  فقط: {numberToArabicWords(payment.amount, settings.currencySymbol)}
                </div>
                {payment.notes && (
                  <div className="text-[10px] text-slate-800 pt-1">
                    <span className="font-bold">البيان:</span> {payment.notes}
                  </div>
                )}
                {pos && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-900 pt-1">
                    <span>المديونية المتبقية:</span>
                    <span>{(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                )}
              </div>

              {/* Barcode & Signature */}
              <div className="text-center pt-2 space-y-2">
                {/* Real Scan-Ready Barcode */}
                <div className="flex flex-col items-center justify-center bg-white p-1 rounded border border-slate-200">
                  <Barcode value={payment.referenceNumber || payment.id} width={1.5} height={36} fontSize={10} margin={2} />
                </div>

                <div className="text-[10px] pt-2 border-t border-dotted border-black flex justify-between">
                  <span>توقيع المسدد: ............</span>
                  <span>ختم الشبكة: ............</span>
                </div>

                <div className="text-[10px] font-bold pt-2 text-center leading-relaxed border-t border-dotted border-black">
                  {settings.cashierFooterText || `شكراً لتعاملكم ووفائكم بالسداد 🌹 • ${settings.supportPhone}`}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>النمط:</span>
            <strong className="text-emerald-400">
              {paperFormat === 'pos-80mm' ? 'ورق كاشير حراري 80mm' : 'ورق A4 رسمي'}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق النافذة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
