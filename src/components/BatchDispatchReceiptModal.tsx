import React, { useState } from 'react';
import {
  Printer,
  X,
  Truck,
  CheckCircle,
  Calendar,
  Store,
  CreditCard,
  Building2,
  FileCheck2,
  FileDown,
  Loader2,
  Share2,
  FileCode,
  Check,
  Copy,
  Receipt,
  FileText,
  Phone,
  Hash,
  Layers,
  DollarSign
} from 'lucide-react';
import { CardBatchDispatch, POSPoint, CardCategory, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';
import { generateHotspotCardsRscScript } from '../utils/mikrotikApi';

interface BatchDispatchReceiptModalProps {
  dispatch: CardBatchDispatch;
  posPoints: POSPoint[];
  categories: CardCategory[];
  settings: NetworkSettings;
  onClose: () => void;
}

// Convert numbers to Arabic words for financial dispatches
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

export const BatchDispatchReceiptModal: React.FC<BatchDispatchReceiptModalProps> = ({
  dispatch,
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
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const pos = posPoints.find((p) => p.id === dispatch.posPointId);
  const cat = categories.find((c) => c.id === dispatch.categoryId);

  // Safe numerical resolution
  const unitWholesale =
    dispatch.unitWholesalePrice ||
    (dispatch as any).wholesalePricePerCard ||
    cat?.wholesalePrice ||
    0;
  const totalWholesale =
    dispatch.totalWholesaleValue ||
    (dispatch as any).totalWholesalePrice ||
    dispatch.quantity * unitWholesale;
  const unitRetail =
    dispatch.unitRetailPrice ||
    (dispatch as any).retailPricePerCard ||
    cat?.retailPrice ||
    0;
  const totalRetail =
    dispatch.totalRetailValue ||
    (dispatch as any).totalRetailPrice ||
    dispatch.quantity * unitRetail;
  const expectedPOSProfit = Math.max(0, totalRetail - totalWholesale);

  const dispatchCode = `DSP-${dispatch.id.slice(-6).toUpperCase()}`;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getFormattedWhatsAppMessage = () => {
    return `*سند تسليم واستلام كروت - شبكة ${settings.networkName}*
----------------------------------------
📌 *رقم السند:* #${dispatchCode}
🏪 *المستلم:* ${pos?.name || 'نقطة البيع'} (${pos?.managerName || ''})
📱 *الهاتف:* ${pos?.phone || ''}
🗓️ *التاريخ:* ${dispatch.date}
🏷️ *الفئة المسلمة:* ${cat?.name || 'فئة كروت'}
📦 *الكمية:* ${dispatch.quantity} كارت
💵 *سعر الجملة للكارت:* ${(unitWholesale || 0).toLocaleString()} ${settings.currencySymbol}
💰 *إجمالي العهدة المحتسبة:* ${(totalWholesale || 0).toLocaleString()} ${settings.currencySymbol}
${dispatch.serialStart ? `🔢 *النطاق التسلسلي:* من ${dispatch.serialStart} إلى ${dispatch.serialEnd || ''}\n` : ''}----------------------------------------
يرجى تأكيد الاستلام ومراجعة الكروت. شكراً لتعاملكم! 🌹
للدعم والاستفسار: ${settings.supportPhone}`;
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId =
        targetFormat === 'pos-80mm'
          ? 'batch-dispatch-thermal-content'
          : 'batch-dispatch-receipt-content';
      await printElementDocument(containerId, {
        filename: `سند_تسليم_${pos?.name || 'موزع'}_${targetFormat}.pdf`,
        orientation: 'portrait',
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.6,
        margin: targetFormat === 'pos-80mm' ? 1.5 : 6,
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
      const containerId =
        targetFormat === 'pos-80mm'
          ? 'batch-dispatch-thermal-content'
          : 'batch-dispatch-receipt-content';
      const fileName = `سند_تسليم_كروت_${pos?.name || 'موزع'}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}_${dispatch.id.slice(-4)}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `سند تسليم كروت - ${pos?.name || 'موزع'}`,
        orientation: 'portrait',
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.6,
        margin: targetFormat === 'pos-80mm' ? 1.5 : 6,
      });

      if (ok) {
        showFeedback(
          `تم تصدير سند التسليم بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير 80mm' : 'ورق A4'}) بنجاح ✅`
        );
      }
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId =
        paperFormat === 'pos-80mm'
          ? 'batch-dispatch-thermal-content'
          : 'batch-dispatch-receipt-content';
      const fileName = `سند_تسليم_كروت_${pos?.name || 'موزع'}_${dispatch.id.slice(-4)}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `سند تسليم كروت - ${pos?.name || 'موزع'}`,
        phone: pos?.phone,
        messageText: getFormattedWhatsAppMessage(),
        format: paperFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: paperFormat,
        scale: 2.6,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال السند عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم تحميل ملف PDF وفتح محادثة واتساب لإرفاقه فوراً ✅');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      const cleanPhone = (pos?.phone || '').replace(/[^0-9]/g, '');
      window.open(
        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(getFormattedWhatsAppMessage())}`,
        '_blank'
      );
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // Generate MikroTik cards script for this batch
  const rscScript = React.useMemo(() => {
    const dummyCards = Array.from({ length: dispatch.quantity }, (_, i) => {
      const num = dispatch.serialStart ? parseInt(dispatch.serialStart) + i : 1000 + i;
      return {
        username: `${cat?.code || 'c'}${num}`,
        pin: `${Math.floor(1000 + Math.random() * 9000)}`,
      };
    });
    return generateHotspotCardsRscScript(
      cat?.name || 'Hotspot Cards',
      cat?.mikrotikProfile || 'default',
      cat?.uptimeLimit || '1h',
      cat?.quotaLimit || '500M',
      dummyCards
    );
  }, [dispatch, cat]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(rscScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadRsc = () => {
    const blob = new Blob([rscScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik_batch_${pos?.name || 'pos'}_${dispatch.id.slice(-4)}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        {/* Top Action & Mode Selector Bar */}
        <div className="sticky top-0 z-20 no-print p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Header Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold flex-shrink-0 border border-indigo-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-sm sm:text-base">
                  سند تسليم دفعة كروت شبكة
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  #{dispatchCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                المستلم: <strong className="text-slate-200">{pos?.name || 'نقطة البيع'}</strong> • {dispatch.date}
              </p>
            </div>
          </div>

          {/* Paper Format Switcher (A4 vs Thermal 80mm) */}
          <div className="flex items-center bg-slate-850 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setPaperFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                paperFormat === 'a4'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="طباعة وتصدير كـ تقرير رسمي A4"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ورق A4</span>
            </button>

            <button
              onClick={() => setPaperFormat('pos-80mm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                paperFormat === 'pos-80mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="طباعة وتصدير كـ إيصال كاشير حراري 80mm"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>كاشير (80mm)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Download PDF Button */}
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
              title={`تحميل سند التسليم كملف PDF بصيغة ${paperFormat === 'a4' ? 'A4' : 'كاشير 80mm'}`}
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>تحميل PDF</span>
            </button>

            {/* WhatsApp Share as PDF */}
            <button
              onClick={handleShareWhatsApp}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
              title="مشاركة سند التسليم كملف PDF عبر واتساب مباشرة للموزع"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">واتساب PDF</span>
            </button>

            {/* MikroTik .rsc Script */}
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer"
              title="تصدير أوامر مايكروتك لهذه الدفعة"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">سكربت مايكروتك</span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => handlePrint()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer ${
                paperFormat === 'pos-80mm'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
              title="طباعة السند فوراً"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{paperFormat === 'pos-80mm' ? 'طباعة كاشير' : 'طباعة A4'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex-shrink-0 cursor-pointer"
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

        {/* PRINTABLE RECEIPT BODY */}
        <div className="p-3 sm:p-6 bg-slate-950/50 overflow-y-auto flex-1 flex items-center justify-center">
          
          {/* ======================================================== */}
          {/* FORMAT 1: A4 STANDARD OFFICIAL DISPATCH BOND             */}
          {/* ======================================================== */}
          {paperFormat === 'a4' && (
            <div
              id="batch-dispatch-receipt-content"
              className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xl space-y-6 text-right w-full max-w-2xl mx-auto font-sans printable-document"
              dir="rtl"
            >
              {/* Header */}
              <div className="border-b-2 border-indigo-600 pb-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Right: Network Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                        M
                      </div>
                      <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                          {settings.networkName}
                        </h1>
                        <p className="text-xs text-slate-600 font-bold">{settings.networkSlogan}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      هاتف الإدارة: {settings.adminPhone || settings.supportPhone} • الدعم: {settings.supportPhone}
                    </p>
                  </div>

                  {/* Left: Dispatch Metadata */}
                  <div className="text-left space-y-1 flex flex-col items-end">
                    <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-black">
                      سند تسليم واستلام كروت
                    </div>
                    <div className="text-xs font-mono font-black text-slate-900">
                      رقم: #{dispatchCode}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dispatch.date}</span>
                    </div>
                    <div className="mt-1">
                      <Barcode value={dispatchCode} width={1.4} height={32} fontSize={9} margin={0} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipient & POS Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">نقطة البيع:</span>
                  <span className="font-bold text-slate-900 text-sm">{pos?.name || 'نقطة بيع غير محددة'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">المسؤول / المستلم:</span>
                  <span className="font-bold text-slate-900">{pos?.managerName || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-700">{pos?.phone || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">الموقع / العنوان:</span>
                  <span className="font-medium text-slate-700 truncate">{pos?.address || 'المركز الرئيسي'}</span>
                </div>
              </div>

              {/* Dispatch Items Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">بيان الفئة المسلمة</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">سعر الجملة</th>
                      <th className="p-3 text-center">سعر الجمهور</th>
                      <th className="p-3 text-left">إجمالي القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">
                        <div className="text-sm">{cat?.name || 'فئة كروت'}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          كود: {cat?.code || '-'} • السرعة: {cat?.rateLimit || '4M'} • الصلاحية: {cat?.validityDays || 30} يوم
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-black text-sm text-indigo-700 bg-indigo-50/50">
                        {dispatch.quantity} كارت
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {(unitWholesale || 0).toLocaleString()} {settings.currencySymbol}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {(unitRetail || 0).toLocaleString()} {settings.currencySymbol}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-slate-950 text-sm">
                        {(totalWholesale || 0).toLocaleString()} {settings.currencySymbol}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Serial Range & Notes */}
              {(dispatch.serialStart || dispatch.notes) && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs space-y-1.5">
                  {dispatch.serialStart && (
                    <div className="flex items-center gap-2 text-slate-800">
                      <span className="font-bold">النطاق التسلسلي للكروت:</span>
                      <span className="font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        من رقم {dispatch.serialStart} إلى رقم {dispatch.serialEnd || '-'}
                      </span>
                    </div>
                  )}
                  {dispatch.notes && (
                    <p className="text-slate-700">
                      <strong>ملاحظات التسليم:</strong> {dispatch.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Summary Box with Arabic Words */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">إجمالي المبلغ المحتسب على العهدة:</span>
                    <span className="text-[11px] text-indigo-300 font-semibold">
                      (الكمية المسلمة {dispatch.quantity} × سعر الجملة {(unitWholesale || 0).toLocaleString()})
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {(totalWholesale || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-300 mr-1.5 font-bold">{settings.currencySymbol}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>فقط: <strong>{numberToArabicWords(totalWholesale, settings.currencySymbol)}</strong></span>
                  {expectedPOSProfit > 0 && (
                    <span className="text-amber-300 text-[10px]">
                      (ربح الموزع المتوقع: +{(expectedPOSProfit || 0).toLocaleString()} {settings.currencySymbol})
                    </span>
                  )}
                </div>
              </div>

              {/* Signatures & Declarations */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-800">
                <div className="space-y-10 text-center">
                  <p className="font-bold">المسلّم (إدارة الشبكة / المستودع)</p>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-mono text-[11px] text-slate-500">
                    التوقيع والختم: .......................
                  </div>
                </div>

                <div className="space-y-10 text-center">
                  <p className="font-bold">المستلم (نقطة البيع / الموزع)</p>
                  <div className="border-t border-dashed border-slate-400 pt-1 font-mono text-[11px] text-slate-500">
                    توقيع المستلم: {pos?.managerName || '.......................'}
                  </div>
                </div>
              </div>

              {/* Bottom Disclaimer */}
              <div className="text-center pt-3 border-t border-slate-200 space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  {settings.invoiceFooterText || 'نظام إدارة شبكات مايكروتك MikroTik Management Suite • يرجى الاحتفاظ بهذا السند'}
                </p>
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>نظام إدارة شبكات مايكروتك • {settings.networkName}</span>
                  <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                  <span>سند تسليم رسمي معتمد</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMAT 2: THERMAL POS CASHIER RECEIPT (80MM ROLL)        */}
          {/* ======================================================== */}
          {paperFormat === 'pos-80mm' && (
            <div
              id="batch-dispatch-thermal-content"
              className="p-3 sm:p-4 bg-white text-black font-mono text-xs shadow-2xl rounded-lg border-2 border-slate-300 w-full max-w-[340px] mx-auto space-y-2.5 printable-thermal-document"
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
                <div className="font-black text-xs bg-black text-white py-0.5 px-2 inline-block rounded">
                  *** سـنـد تـسـلـيـم كـروت (80mm) ***
                </div>
                <div className="flex justify-between items-center text-[11px] mt-1.5 font-bold">
                  <span>رقم السند:</span>
                  <span className="font-black">#{dispatchCode}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-800">
                  <span>التاريخ: {dispatch.date}</span>
                  <span>الوقت: {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Recipient Point Info */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span className="font-semibold">المستلم / النقطة:</span>
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
              </div>

              {/* Card Details */}
              <div className="text-[11px] space-y-1.5 pb-2 border-b border-dashed border-black">
                <div className="flex justify-between font-bold">
                  <span>فئة الكروت:</span>
                  <span>{cat?.name || 'فئة كروت'}</span>
                </div>
                <div className="flex justify-between">
                  <span>الكمية المسلمة:</span>
                  <span className="font-black text-sm">{dispatch.quantity} كارت</span>
                </div>
                <div className="flex justify-between">
                  <span>سعر الجملة للكارت:</span>
                  <span>{(unitWholesale || 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="flex justify-between text-slate-700 text-[10px]">
                  <span>سعر بيع الجمهور:</span>
                  <span>{(unitRetail || 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                {dispatch.serialStart && (
                  <div className="text-[10px] bg-slate-100 p-1 rounded border border-slate-300">
                    <span className="font-bold">السيريال:</span> من {dispatch.serialStart} إلى {dispatch.serialEnd || '-'}
                  </div>
                )}
              </div>

              {/* Financial Liability Box */}
              <div className="space-y-1.5 py-1.5 border-b-2 border-dashed border-black">
                <div className="flex justify-between items-center text-sm font-black">
                  <span>إجمالي العهدة المحتسبة:</span>
                  <span className="text-base">{(totalWholesale || 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="text-[10px] font-bold text-center bg-slate-100 p-1 rounded border border-slate-300">
                  فقط: {numberToArabicWords(totalWholesale, settings.currencySymbol)}
                </div>
                {dispatch.notes && (
                  <div className="text-[10px] text-slate-800 pt-1">
                    <span className="font-bold">ملاحظات:</span> {dispatch.notes}
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-black">
                <Barcode value={dispatchCode} width={1.5} height={36} fontSize={10} margin={2} />
              </div>

              {/* Signatures */}
              <div className="pt-2 text-[10px] space-y-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="block font-bold">المسلم:</span>
                    <div className="border-b border-black mt-4"></div>
                  </div>
                  <div>
                    <span className="block font-bold">المستلم:</span>
                    <div className="border-b border-black mt-4"></div>
                  </div>
                </div>

                <div className="text-center text-[10px] font-bold text-slate-800 pt-2 leading-relaxed border-t border-dotted border-black">
                  {settings.cashierFooterText || 'يرجى الاحتفاظ بهذا السند لمطابقة الحساب والمبيعات'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Close Bar */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between no-print">
          <span className="text-xs text-slate-400">
            دفعة: <strong className="text-indigo-400 font-mono">#{dispatchCode}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق السند</span>
          </button>
        </div>
      </div>

      {/* MikroTik .rsc Script Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4 animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">سكربت إضافة الكروت في RouterOS Hotspot</h3>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              يمكنك نسخ هذا السكربت ولصقه في <strong>New Terminal</strong> في WinBox لإنشاء {dispatch.quantity} كارت مباشرة، أو تحميل ملف <strong className="text-cyan-400">.rsc</strong> وسحبه لداخل المايكروتك:
            </p>

            <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto max-h-60 flex-1">
              {rscScript}
            </pre>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                إلغاء وإغلاق
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'تم النسخ!' : 'نسخ الأوامر'}</span>
                </button>

                <button
                  onClick={handleDownloadRsc}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-lg shadow-cyan-600/30 transition cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل ملف .rsc للمايكروتك</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
