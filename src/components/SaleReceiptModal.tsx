import React, { useState } from 'react';
import {
  Printer,
  Share2,
  X,
  Receipt,
  CheckCircle,
  Clock,
  Store,
  CreditCard,
  FileDown,
  Loader2,
  Calendar,
  Building2,
  Phone,
  FileCheck2,
  Layers,
  DollarSign,
  FileText,
  ScanBarcode
} from 'lucide-react';
import { SalesRecord, POSPoint, CardCategory, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface SaleReceiptModalProps {
  sale: SalesRecord;
  posPoints: POSPoint[];
  categories: CardCategory[];
  settings: NetworkSettings;
  onClose: () => void;
}

// Convert number to formal Arabic words for invoices
function numberToArabicWords(num: number, currency: string = 'ريال'): string {
  if (num === 0) return `صفر ${currency}`;

  const ones = [
    '',
    'واحد',
    'اثنان',
    'ثلاثة',
    'أربعة',
    'خمسة',
    'ستة',
    'سبعة',
    'ثمانية',
    'تسعة',
    'عشرة',
    'أحد عشر',
    'اثنا عشر',
    'ثلاثة عشر',
    'أربعة عشر',
    'خمسة عشر',
    'ستة عشر',
    'سبعة عشر',
    'ثمانية عشر',
    'تسعة عشر',
  ];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = [
    '',
    'مائة',
    'مئتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة',
  ];
  const thousands = [
    '',
    'ألف',
    'ألفان',
    'ثلاثة آلاف',
    'أربعة آلاف',
    'خمسة آلاف',
    'ستة آلاف',
    'سبعة آلاف',
    'ثمانية آلاف',
    'تسعة آلاف',
    'عشرة آلاف',
  ];

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

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  sale,
  posPoints,
  categories,
  settings,
  onClose,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>('a4');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const pos = posPoints.find((p) => p.id === sale.posPointId);
  const cat = categories.find((c) => c.id === sale.categoryId);

  const totalWholesale = sale.totalWholesaleAmount ?? 0;
  const totalRetail = sale.totalRetailAmount ?? 0;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getFormattedWhatsAppMessage = () => {
    return `*فاتورة مبيعات كروت - شبكة ${settings.networkName}*
----------------------------------------
📄 رقم الفاتورة: *${sale.invoiceNumber}*
📅 التاريخ: ${sale.date}
🏪 نقطة البيع: *${pos ? pos.name : 'مبيعات مباشرة'}*
👤 المسؤول: ${pos?.managerName || ''} (${pos?.phone || ''})
🏷️ فئة الكارت: *${cat ? cat.name : 'كارت شبكة'}*
📦 الكمية: *${sale.quantity} كارت*
💵 سعر التجزئة للكارت: ${sale.unitRetailPrice} ${settings.currencySymbol}
💰 إجمالي قيمة الفاتورة: *${(totalRetail ?? 0).toLocaleString()} ${settings.currencySymbol}*
📝 فقط: ${numberToArabicWords(totalRetail || 0, settings.currencySymbol)}
🏷️ إجمالي الجملة للنقطة: ${(totalWholesale ?? 0).toLocaleString()} ${settings.currencySymbol}
💳 حالة السداد: ${sale.paymentType === 'cash' ? '✅ مسدد نقداً' : '⏳ آجل على الحساب'}
${pos ? `📊 رصيد المديونية المتبقي: ${(pos.currentDebt ?? 0).toLocaleString()} ${settings.currencySymbol}` : ''}
----------------------------------------
شكراً لتعاملكم معنا 🌹
للدعم والاستفسار: ${settings.supportPhone}`;
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'sale-receipt-thermal-content' : 'sale-receipt-content';
      await printElementDocument(containerId, {
        filename: `فاتورة_مبيعات_${sale.invoiceNumber}_${targetFormat}.pdf`,
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
      const containerId = targetFormat === 'pos-80mm' ? 'sale-receipt-thermal-content' : 'sale-receipt-content';
      const fileName = `فاتورة_مبيعات_${sale.invoiceNumber}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `فاتورة مبيعات - ${settings.networkName}`,
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.8,
        margin: targetFormat === 'pos-80mm' ? 2 : 6,
      });

      if (ok) {
        showFeedback(`تم تحميل الفاتورة بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير حراري 80mm' : 'ورق عادي A4'}) بنجاح ✅`);
      }
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId = paperFormat === 'pos-80mm' ? 'sale-receipt-thermal-content' : 'sale-receipt-content';
      const fileName = `فاتورة_مبيعات_${sale.invoiceNumber}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `فاتورة مبيعات #${sale.invoiceNumber}`,
        phone: pos?.phone,
        messageText: getFormattedWhatsAppMessage(),
        paperFormat: paperFormat,
        scale: 2.8,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال الفاتورة عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم حفظ ملف PDF وفتح محادثة واتساب لإرفاقه فوراً ✅');
      }
    } catch (err) {
      console.error('WhatsApp Error:', err);
      const url = `https://wa.me/${pos?.phone ? (pos.phone.startsWith('967') ? pos.phone : `967${pos.phone}`) : ''}?text=${encodeURIComponent(getFormattedWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
              <Receipt className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">فاتورة وسند بيع كروت</span>
              <span className="font-mono text-xs text-indigo-400 font-bold">#{sale.invoiceNumber}</span>
            </h3>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper Size Selector Tabs */}
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
              <span>ورق عادي A4</span>
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
              <span>ورق كاشير (80mm)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title={`تحويل الفاتورة إلى ملف PDF (${paperFormat === 'pos-80mm' ? 'كاشير' : 'A4'})`}
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
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="إرسال الفاتورة عبر واتساب كملف PDF"
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
              className={`px-2.5 sm:px-3 py-1.5 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                paperFormat === 'pos-80mm' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title={paperFormat === 'pos-80mm' ? 'طباعة عبر طابعة الكاشير والحراري' : 'طباعة على ورق A4'}
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
              className="hidden sm:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex-shrink-0 cursor-pointer"
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

        {/* Receipt Preview Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60 flex items-center justify-center">
          
          {/* FORMAT 1: A4 Standard Document */}
          {paperFormat === 'a4' && (
            <div
              id="sale-receipt-content"
              className="p-6 sm:p-8 space-y-5 text-xs bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 font-sans w-full max-w-xl mx-auto printable-document"
              dir="rtl"
            >
              {/* 1. Official Header */}
              <div className="border-b-2 border-indigo-700 pb-4 text-center space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-600 block font-semibold">تاريخ الفاتورة:</span>
                    <span className="text-xs font-mono font-bold text-slate-950">{sale.date}</span>
                  </div>

                  <div className="text-center flex-1">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                      {settings.networkName}
                    </h1>
                    <p className="text-xs text-slate-600 font-bold">{settings.networkSlogan}</p>
                    <p className="text-[10px] text-slate-600 font-mono font-medium mt-0.5">
                      هاتف: {settings.supportPhone} • بوابة الدخول: {settings.hotspotDns}
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-slate-600 block font-semibold">رقم الفاتورة:</span>
                    <span className="text-xs font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                      {sale.invoiceNumber}
                    </span>
                  </div>
                </div>

                {/* Title Badge */}
                <div className="mt-2 text-center">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-900 text-white font-black text-xs sm:text-sm shadow-sm">
                    فـاتـورة مـبـيـعـات كـروت شـبـكـة (سـنـد بـيـع وتـسـلـيـم)
                  </div>
                </div>
              </div>

              {/* 2. Amount Summary Box */}
              <div className="bg-indigo-50/90 p-4 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-indigo-900 block font-bold">إجمالي قيمة الفاتورة:</span>
                  <span className="text-2xl font-black font-mono text-indigo-950">
                    {(totalRetail ?? 0).toLocaleString()} <span className="text-xs font-bold text-indigo-800">{settings.currencySymbol}</span>
                  </span>
                  <div className="text-[11px] font-bold text-indigo-900 mt-1">
                    فقط: {numberToArabicWords(totalRetail || 0, settings.currencySymbol)}
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <span className="text-[11px] text-indigo-900 block font-bold">حالة الدفع:</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-md text-xs font-black border ${
                      sale.paymentType === 'cash'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                        : 'bg-amber-100 text-amber-950 border-amber-300'
                    }`}
                  >
                    {sale.paymentType === 'cash' ? '✅ مسدد نقداً' : '⏳ آجل على الحساب'}
                  </span>
                </div>
              </div>

              {/* 3. Customer & POS Point Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold min-w-20">نقطة البيع:</span>
                    <strong className="text-slate-950 font-black text-sm">{pos ? pos.name : 'مبيعات مباشرة'}</strong>
                  </div>
                  {pos?.managerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-semibold min-w-20">المسؤول:</span>
                      <span className="font-bold text-slate-900">{pos.managerName}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-slate-200">
                  {pos?.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-semibold min-w-20">رقم الهاتف:</span>
                      <span className="font-mono font-bold text-slate-900">{pos.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold min-w-20">طريقة السداد:</span>
                    <span className="font-bold text-slate-900">
                      {sale.paymentType === 'cash' ? 'نقداً تم الاستلام' : 'آجل على حساب الموزع'}
                    </span>
                  </div>
                </div>

                {sale.notes && (
                  <div className="flex items-start gap-2 pt-1 text-slate-700">
                    <span className="text-slate-600 font-semibold min-w-20">ملاحظات:</span>
                    <span className="font-medium text-slate-900">{sale.notes}</span>
                  </div>
                )}
              </div>

              {/* 4. Itemized Sales Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs divide-y divide-slate-300">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">البيان / فئة الكارت</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3">سعر التجزئة</th>
                      <th className="py-2.5 px-3">سعر الجملة</th>
                      <th className="py-2.5 px-3 text-left">إجمالي الفاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="py-3 px-3">
                        <strong className="text-slate-950 block font-bold text-sm">
                          {cat ? cat.name : 'كارت شبكة'}
                        </strong>
                        <span className="text-[10px] text-slate-500 font-medium">
                          صلاحية: {cat?.validityDays || 1} يوم • باقة: {cat?.dataLimitMB ? `${cat.dataLimitMB} MB` : 'مفتوح'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-950 text-sm">
                        {sale.quantity} كارت
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {sale.unitRetailPrice} {settings.currencySymbol}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {sale.unitWholesalePrice} {settings.currencySymbol}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-black text-indigo-950 text-sm">
                        {(totalRetail ?? 0).toLocaleString()} {settings.currencySymbol}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-slate-700 text-[11px]">
                        إجمالي المستحق على الموزع (الجملة):
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-left font-mono font-black text-emerald-950 text-xs">
                        {(totalWholesale ?? 0).toLocaleString()} {settings.currencySymbol}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 5. POS Account Summary */}
              {pos && (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-600 block font-semibold">إجمالي مبيعات النقطة التراكمية:</span>
                    <span className="font-mono font-black text-slate-950 text-xs">
                      {(pos.totalCardsSold ?? 0).toLocaleString()} كارت
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-600 block font-semibold">المديونية الحالية على النقطة:</span>
                    <span className={`font-mono font-black text-xs ${(pos.currentDebt ?? 0) > 0 ? 'text-amber-950' : 'text-emerald-950'}`}>
                      {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              {/* 6. Signatures Section */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-slate-700 block mb-10 font-bold text-xs">توقيع المستلم / الموزع</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-36 mx-auto"></div>
                </div>

                <div>
                  <span className="text-slate-700 block mb-10 font-bold text-xs">توقيع وختم إدارة المبيعات</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-36 mx-auto"></div>
                </div>
              </div>

              {/* 7. Footer Note */}
              <div className="text-center pt-4 border-t border-slate-200 space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  {settings.invoiceFooterText || `نظام إدارة شبكات مايكروتك • ${settings.networkName}`}
                </p>
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>نظام إدارة شبكات مايكروتك • {settings.networkName}</span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</span>
                  <span>فاتورة معتمدة إلكترونياً</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 2: Thermal POS Cashier Receipt (80mm Paper Size) */}
          {paperFormat === 'pos-80mm' && (
            <div
              id="sale-receipt-thermal-content"
              className="p-4 bg-white text-black font-mono text-xs shadow-2xl rounded-lg border-2 border-slate-300 w-full max-w-[340px] mx-auto space-y-3 printable-thermal-document"
              dir="rtl"
              style={{ fontFamily: 'monospace, system-ui' }}
            >
              {/* Thermal Header */}
              <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
                <div className="font-black text-base tracking-tight">{settings.networkName}</div>
                <div className="text-[11px] font-bold">{settings.networkSlogan}</div>
                <div className="text-[10px]">هاتف: {settings.supportPhone}</div>
                <div className="text-[10px]">بوابة الدخول: {settings.hotspotDns}</div>
              </div>

              {/* Title & Metadata */}
              <div className="text-center py-1 border-b border-dashed border-black">
                <div className="font-black text-sm bg-black text-white py-0.5 px-2 inline-block rounded">
                  *** إيصال مبيعات كروت ***
                </div>
                <div className="flex justify-between items-center text-[11px] mt-2 font-bold">
                  <span>رقم الفاتورة:</span>
                  <span className="font-black">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-800">
                  <span>التاريخ: {sale.date}</span>
                  <span>الوقت: {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Customer / POS Info */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span className="font-semibold">نقطة البيع:</span>
                  <span className="font-black">{pos ? pos.name : 'مبيعات مباشرة'}</span>
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
                  <span className="font-bold">{sale.paymentType === 'cash' ? 'نقدي (مسدد)' : 'آجل (حساب)'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-1 border-b-2 border-dashed border-black">
                <div className="flex justify-between font-black text-[11px] pb-1 border-b border-black">
                  <span>الصنف / الفئة</span>
                  <span>الكمية × السعر</span>
                  <span>الإجمالي</span>
                </div>
                <div className="pt-1.5 space-y-1 text-[11px]">
                  <div className="font-black">{cat ? cat.name : 'كارت شبكة'}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px]">{sale.quantity} كارت × {sale.unitRetailPrice} {settings.currencySymbol}</span>
                    <span className="font-black">{(totalRetail ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                  <div className="text-[10px] text-slate-700 flex justify-between">
                    <span>(سعر الجملة: {sale.unitWholesalePrice})</span>
                    <span>جملة: {(totalWholesale ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Totals & Summary */}
              <div className="space-y-1.5 py-1.5 border-b-2 border-dashed border-black">
                <div className="flex justify-between items-center text-sm font-black">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-base">{(totalRetail ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="text-[10px] font-bold text-center bg-slate-100 p-1 rounded border border-slate-300">
                  فقط: {numberToArabicWords(totalRetail || 0, settings.currencySymbol)}
                </div>
                <div className="flex justify-between text-[11px] font-bold pt-1">
                  <span>حالة الدفع:</span>
                  <span>{sale.paymentType === 'cash' ? '[ ✅ مسدد نقداً ]' : '[ ⏳ آجل على الحساب ]'}</span>
                </div>
                {pos && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-900 pt-0.5">
                    <span>المديونية المتبقية:</span>
                    <span>{(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                  </div>
                )}
              </div>

              {/* Barcode & Signature */}
              <div className="text-center pt-2 space-y-2">
                {/* Real Scan-Ready Barcode */}
                <div className="flex flex-col items-center justify-center bg-white p-1 rounded border border-slate-200">
                  <Barcode value={sale.invoiceNumber} width={1.5} height={36} fontSize={10} margin={2} />
                </div>

                <div className="text-[10px] pt-2 border-t border-dotted border-black flex justify-between">
                  <span>توقيع المستلم: .....................</span>
                </div>

                <div className="text-[10px] font-bold pt-2 text-center leading-relaxed border-t border-dotted border-black">
                  {settings.cashierFooterText || `شكراً لتعاملكم معنا 🌹 • ${settings.supportPhone}`}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>النمط المختار:</span>
            <strong className="text-indigo-400">
              {paperFormat === 'pos-80mm' ? 'ورق كاشير حراري 80mm' : 'ورق عادي A4 رسمي'}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق الفاتورة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
