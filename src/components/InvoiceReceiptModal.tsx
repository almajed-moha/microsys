import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  FileCode,
  CheckCircle,
  Clock,
  Layers,
  Store,
  DollarSign,
  Phone,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  FileDown,
  Loader2,
  Receipt
} from 'lucide-react';
import { InvoiceRecord, CardCategory, POSPoint, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import { generateMikroTikScript, downloadFile } from '../utils/storage';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  posPoint?: POSPoint;
  categories: CardCategory[];
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

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  posPoint,
  categories,
  settings,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>('a4');
  const [copiedScript, setCopiedScript] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const isReturn = invoice.type === 'return';
  const currency = settings?.currencySymbol || 'ر.ي';

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'invoice-receipt-thermal-content' : 'invoice-receipt-a4-content';
      await printElementDocument(containerId, {
        filename: `فاتورة_${invoice.invoiceNumber}_${targetFormat}.pdf`,
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
      const containerId = targetFormat === 'pos-80mm' ? 'invoice-receipt-thermal-content' : 'invoice-receipt-a4-content';
      const fileName = `فاتورة_${invoice.invoiceNumber}_${posPoint ? posPoint.name.replace(/\s+/g, '_') : 'موزع'}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `فاتورة ${invoice.invoiceNumber} - ${settings.networkName}`,
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.8,
        margin: targetFormat === 'pos-80mm' ? 2 : 6,
      });

      if (ok) {
        showFeedback(`تم تحميل الفاتورة بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير 80mm' : 'ورق A4'}) بنجاح ✅`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Generate MikroTik script for all items in the invoice
  const handleExportMikrotikScript = () => {
    const lines: string[] = [
      '# ========================================================',
      `# MikroTik RouterOS Script for Invoice: ${invoice.invoiceNumber}`,
      `# Type: ${isReturn ? 'Return Invoice' : 'Sales / Delivery Batch'}`,
      `# POS Point: ${invoice.posPointName || posPoint?.name || 'Unknown'}`,
      `# Date: ${invoice.date}`,
      `# Total Quantity: ${invoice.totalQuantity} Cards`,
      '# ========================================================',
      '',
      '/ip hotspot user',
    ];

    invoice.items.forEach((item) => {
      const cat = categories.find((c) => c.id === item.categoryId);
      const profile = cat?.mikrotikProfile || `Profile-${item.quantity}`;
      const prefix = `INV-${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      lines.push('');
      lines.push(`# Category: ${item.categoryName} (${item.quantity} cards)`);
      if (item.serialStart && item.serialEnd) {
        lines.push(`# Serials: ${item.serialStart} -> ${item.serialEnd}`);
      }

      // Generate commands
      const startNum = item.serialStart ? parseInt(item.serialStart.replace(/\D/g, '')) || 1000 : 1000;
      for (let i = 0; i < Math.min(item.quantity, 500); i++) {
        const serial = String(startNum + i);
        const username = `${serial}`;
        const pwd = `${Math.floor(100 + Math.random() * 900)}`;
        lines.push(
          `add name="${username}" password="${pwd}" profile="${profile}" comment="${prefix}-${item.categoryName}-${serial}"`
        );
      }
    });

    const scriptContent = lines.join('\n');
    downloadFile(scriptContent, `MikroTik-${invoice.invoiceNumber}.rsc`, 'text/plain');
    showFeedback('تم تصدير ملف سكربت مايكروتك .rsc بنجاح ✅');
  };

  const getWhatsAppMessage = () => {
    const itemsText = invoice.items
      .map((it) => `▫️ ${it.categoryName}: ${it.quantity} كارت × ${(it.unitWholesalePrice ?? 0).toLocaleString()} = ${(it.totalWholesalePrice ?? 0).toLocaleString()} ${currency}`)
      .join('\n');

    return `*${settings.networkName}*\n` +
      `🧾 *${isReturn ? 'سند مرتجع كروت معتمد' : 'فاتورة تسليم كروت ومبيعات'}*\n` +
      `رقم الفاتورة: *${invoice.invoiceNumber}*\n` +
      `التاريخ: ${invoice.date}\n` +
      `نقطة البيع: *${invoice.posPointName || posPoint?.name}*\n` +
      `المسؤول المستلم: ${invoice.receivedBy || posPoint?.managerName || '—'}\n` +
      `طريقة السداد: ${isReturn ? 'خصم مديونية' : invoice.paymentType === 'cash' ? 'نقداً فوري' : 'آجل على الحساب'}\n` +
      `--------------------------------\n` +
      `📦 *تفاصيل الأصناف والكميات:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `🔢 إجمالي الكروت: *${invoice.totalQuantity} كارت*\n` +
      `💰 المبلغ الإجمالي: *${(invoice.totalWholesaleAmount ?? 0).toLocaleString()} ${currency}*\n` +
      `📝 ${tafqeetArabic(invoice.totalWholesaleAmount || 0, settings?.currency || 'ريال يمني')}\n` +
      (invoice.notes ? `📌 ملاحظات: ${invoice.notes}\n` : '') +
      (posPoint ? `📊 المديونية الحالية للنقطة: ${(posPoint.currentDebt ?? 0).toLocaleString()} ${currency}\n` : '') +
      `--------------------------------\n` +
      `شكراً لتعاملكم معنا 🌹\nهاتف الدعم: ${settings.supportPhone}`;
  };

  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId = paperFormat === 'pos-80mm' ? 'invoice-receipt-thermal-content' : 'invoice-receipt-a4-content';
      const fileName = `فاتورة_${invoice.invoiceNumber}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `فاتورة ${invoice.invoiceNumber}`,
        phone: posPoint?.phone,
        messageText: getWhatsAppMessage(),
        paperFormat: paperFormat,
        scale: 2.8,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال الفاتورة عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم حفظ ملف PDF وفتح محادثة واتساب لإرفاقه مباشرة ✅');
      }
    } catch (err) {
      console.error('WhatsApp Share Error:', err);
      const waUrl = `https://wa.me/${posPoint?.phone ? (posPoint.phone.startsWith('967') ? posPoint.phone : `967${posPoint.phone}`) : ''}?text=${encodeURIComponent(getWhatsAppMessage())}`;
      window.open(waUrl, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:h-auto print:overflow-visible">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none print:max-h-none">
        
        {/* Top Controls - Sticky & No-Print */}
        <div className="no-print p-3 sm:p-4 bg-slate-950/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${
              isReturn ? 'bg-rose-600 shadow-rose-600/25' : 'bg-indigo-600 shadow-indigo-600/25'
            }`}>
              {isReturn ? <RotateCcw className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {isReturn ? 'سند مرتجع كروت رسمي' : 'فاتورة تسليم كروت ومبيعات'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isReturn ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {invoice.posPointName || posPoint?.name} • {invoice.date}
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>طباعة الفاتورة</span>
            </button>

            {/* PDF Export */}
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-indigo-400" />}
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

            {/* MikroTik Script */}
            <button
              onClick={handleExportMikrotikScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
              title="تصدير سكربت مايكروتك تلقائي لإضافة الكروت في الراوتر"
            >
              <FileCode className="w-4 h-4" />
              <span>سكربت مايكروتك</span>
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
               A4 OFFICIAL INVOICE DOCUMENT
               ======================================================== */
            <div
              id="invoice-receipt-a4-content"
              className="printable-document bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-6 print:rounded-none max-w-3xl mx-auto font-sans"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{settings.networkName}</h1>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{settings.networkSlogan}</p>
                  <p className="text-xs text-slate-500 mt-1">هاتف الإدارة: {settings.supportPhone}</p>
                </div>
                <div className="text-left flex flex-col items-end">
                  <div className={`inline-block px-4 py-1.5 rounded-lg text-sm font-black text-white shadow-sm ${
                    isReturn ? 'bg-rose-700' : 'bg-indigo-700'
                  }`}>
                    {isReturn ? 'سند مرتجع كروت (إشعار دائن)' : 'فاتورة مبيعات وتسليم كروت'}
                  </div>
                  <div className="mt-2 text-xs text-slate-700 font-mono text-left">
                    <div>رقم الفاتورة: <strong className="text-slate-900 font-bold">{invoice.invoiceNumber}</strong></div>
                    <div>تاريخ الإصدار: <strong className="text-slate-900">{invoice.date}</strong></div>
                  </div>
                  <div className="mt-2">
                    <Barcode value={invoice.invoiceNumber} width={1.4} height={32} fontSize={9} margin={0} />
                  </div>
                </div>
              </div>

              {/* Customer / POS Information Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">العميل / نقطة البيع:</span>
                  <span className="font-bold text-slate-900 text-sm">{invoice.posPointName || posPoint?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">المسؤول / الهاتف:</span>
                  <span className="font-bold text-slate-900">{posPoint?.managerName || invoice.receivedBy || '—'} ({posPoint?.phone || '—'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">طريقة السداد:</span>
                  <span className={`font-bold inline-block px-2 py-0.5 rounded text-[11px] ${
                    isReturn
                      ? 'bg-rose-100 text-rose-800'
                      : invoice.paymentType === 'cash'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isReturn ? 'خصم من المديونية' : invoice.paymentType === 'cash' ? 'نقداً (مدفوع فوري)' : 'آجل على الحساب'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">العنوان / الموقع:</span>
                  <span className="font-medium text-slate-800 truncate block">{posPoint?.address || 'المقر الرئيسي'}</span>
                </div>
              </div>

              {/* Multi-item Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">فئة الكارت / البيان</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-center">سعر الجملة</th>
                      <th className="py-2.5 px-3 text-center">الإجمالي ({currency})</th>
                      <th className="py-2.5 px-3 text-center">نطاق السيريال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.categoryName}
                          {item.notes && <span className="block text-[10px] text-slate-500 font-normal">{item.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">
                          {item.quantity} كارت
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {(item.unitWholesalePrice ?? 0).toLocaleString()} {currency}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                          {(item.totalWholesalePrice ?? 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                          {item.serialStart && item.serialEnd ? `${item.serialStart} ⟵ ${item.serialEnd}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total & Tafqeet Summary */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">المبلغ الإجمالي بالحروف والتفقيط:</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                      {tafqeetArabic(invoice.totalWholesaleAmount || 0, settings?.currency || 'ريال يمني')}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-r border-slate-300 pt-2 sm:pt-0 sm:pr-6 shrink-0">
                    <div className="text-center">
                      <span className="text-[11px] text-slate-500 block">إجمالي الكروت</span>
                      <span className="text-base font-black text-slate-900 font-mono">{invoice.totalQuantity}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[11px] text-slate-500 block">صافي الفاتورة</span>
                      <span className={`text-xl font-black font-mono ${isReturn ? 'text-rose-700' : 'text-indigo-800'}`}>
                        {(invoice.totalWholesaleAmount ?? 0).toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason / Notes */}
              {(invoice.notes || invoice.reasonForReturn) && (
                <div className="mb-6 text-xs bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 text-amber-900">
                  <strong>ملاحظات: </strong>
                  {invoice.reasonForReturn ? `سبب الإرجاع: ${invoice.reasonForReturn}. ` : ''}
                  {invoice.notes || ''}
                </div>
              )}

              {/* Signatures & Approvals */}
              <div className="border-t border-slate-300 pt-6 mt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">المسلم / أمين المستودع</span>
                  <span className="font-bold text-slate-800 block mb-8">{invoice.deliveredBy || 'إدارة الشبكة'}</span>
                  <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                  <span className="text-[10px] text-slate-400 mt-1 block">التوقيع والختم</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">المستلم / صاحب نقطة البيع</span>
                  <span className="font-bold text-slate-800 block mb-8">{invoice.receivedBy || posPoint?.managerName || 'المستلم'}</span>
                  <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                  <span className="text-[10px] text-slate-400 mt-1 block">توقيع الاستلام</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-200">
                تم استخراج هذا السند تلقائياً عبر نظام {settings.networkName} • {new Date().toLocaleString('ar-YE')}
              </div>
            </div>
          ) : (
            /* ========================================================
               THERMAL RECEIPT FORMAT (80mm POS Thermal Slip)
               ======================================================== */
            <div
              id="invoice-receipt-thermal-content"
              className="printable-thermal-document thermal-receipt bg-white text-black p-4 rounded-xl shadow-lg max-w-[320px] mx-auto text-xs font-mono border border-slate-300 print:shadow-none print:border-none print:p-1 print:max-w-none print:w-full"
            >
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h2 className="font-black text-sm tracking-tight">{settings.networkName}</h2>
                <p className="text-[10px]">{settings.networkSlogan}</p>
                <div className="mt-1 font-bold inline-block px-2 py-0.5 bg-black text-white text-[11px] rounded">
                  {isReturn ? '*** سند مرتجع كروت ***' : '*** فاتورة تسليم كروت ***'}
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>رقم الفاتورة:</span>
                  <span className="font-bold">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ:</span>
                  <span>{invoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>نقطة البيع:</span>
                  <span className="font-bold truncate max-w-[150px]">{invoice.posPointName || posPoint?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>المسؤول:</span>
                  <span>{posPoint?.managerName || invoice.receivedBy || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة السداد:</span>
                  <span>{isReturn ? 'خصم مديونية' : invoice.paymentType === 'cash' ? 'نقداً' : 'آجل'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-black">
                <div className="font-bold mb-1 flex justify-between text-[11px]">
                  <span>الصنف / الفئة</span>
                  <span>الكمية × السعر = الإجمالي</span>
                </div>
                <div className="space-y-2">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="text-[10px] leading-tight">
                      <div className="font-bold">{item.categoryName}</div>
                      <div className="flex justify-between text-slate-700">
                        <span>{item.quantity} كارت × {item.unitWholesalePrice}</span>
                        <span className="font-bold text-black">{(item.totalWholesalePrice ?? 0).toLocaleString()} {currency}</span>
                      </div>
                      {item.serialStart && item.serialEnd && (
                        <div className="text-[9px] text-slate-600">
                          السيريال: {item.serialStart} - {item.serialEnd}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Summary */}
              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>إجمالي عدد الكروت:</span>
                  <span className="font-bold">{invoice.totalQuantity} كارت</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>المبلغ الإجمالي:</span>
                  <span>{(invoice.totalWholesaleAmount ?? 0).toLocaleString()} {currency}</span>
                </div>
              </div>

              <div className="py-2 text-[9px] leading-tight text-center text-slate-800 border-b border-dashed border-black">
                {tafqeetArabic(invoice.totalWholesaleAmount || 0, settings?.currency || 'ريال')}
              </div>

              {/* Barcode */}
              <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-black">
                <Barcode value={invoice.invoiceNumber} width={1.5} height={36} fontSize={10} margin={2} />
              </div>

              {/* Signatures */}
              <div className="pt-3 pb-1 text-center text-[10px] space-y-4">
                <div className="flex justify-between px-2">
                  <div>
                    <span>توقيع الإدارة</span>
                    <div className="mt-4 border-b border-black w-20"></div>
                  </div>
                  <div>
                    <span>توقيع المستلم</span>
                    <div className="mt-4 border-b border-black w-20"></div>
                  </div>
                </div>
                <div className="text-[9px] text-slate-500 pt-2">
                  شكراً لتعاملكم معنا • {settings.supportPhone}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
