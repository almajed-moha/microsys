import React, { useState } from 'react';
import {
  Printer,
  FileDown,
  Share2,
  X,
  ReceiptText,
  CheckCircle,
  Building2,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  CreditCard,
  Check,
  Loader2,
  FileSpreadsheet,
  Filter,
  FileText,
  Receipt
} from 'lucide-react';
import { SalesRecord, POSPoint, CardCategory, NetworkSettings } from '../types';
import { Barcode } from './Barcode';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument
} from '../utils/pdfExport';

interface SalesReportModalProps {
  sales: SalesRecord[];
  posPoints: POSPoint[];
  categories: CardCategory[];
  settings: NetworkSettings;
  filterInfo: {
    searchTerm?: string;
    posFilterName: string;
    categoryFilterName: string;
    paymentFilterName: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  };
  totals: {
    totalQty: number;
    totalRetail: number;
    totalWholesale: number;
    totalProfit: number;
    totalCash: number;
    totalCredit: number;
  };
  initialPaperFormat?: 'a4' | 'pos-80mm';
  onClose: () => void;
  onPrintSaleReceipt?: (sale: SalesRecord) => void;
}

export const SalesReportModal: React.FC<SalesReportModalProps> = ({
  sales,
  posPoints,
  categories,
  settings,
  filterInfo,
  totals,
  initialPaperFormat = 'a4',
  onClose,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm'>(initialPaperFormat);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const reportDate = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const reportTime = new Date().toLocaleTimeString('ar-YE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const reportCode = `REP-SLS-${Date.now().toString().slice(-6)}`;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getFormattedDateRange = () => {
    if (filterInfo.startDate && filterInfo.endDate) {
      if (filterInfo.startDate === filterInfo.endDate) {
        return `بتاريخ: ${filterInfo.startDate}`;
      }
      return `من: ${filterInfo.startDate} إلى: ${filterInfo.endDate}`;
    }
    if (filterInfo.startDate) {
      return `من تاريخ: ${filterInfo.startDate}`;
    }
    if (filterInfo.endDate) {
      return `حتى تاريخ: ${filterInfo.endDate}`;
    }
    if (filterInfo.dateFilter) {
      return `بتاريخ: ${filterInfo.dateFilter}`;
    }
    return 'كافة الفترات الزمنية المسجلة';
  };

  const getFormattedWhatsAppMessage = () => {
    return `*تقرير وسجل مبيعات الكروت - شبكة ${settings.networkName}*
----------------------------------------
📄 رقم التقرير: *${reportCode}*
📅 تاريخ التقرير: ${reportDate} - ${reportTime}
🗓️ الفترة: *${getFormattedDateRange()}*
🔍 التصفية: ${filterInfo.posFilterName} | ${filterInfo.categoryFilterName} | ${filterInfo.paymentFilterName}
📊 إجمالي العمليات: *${sales.length} فاتورة*
📦 إجمالي الكروت: *${(totals.totalQty ?? 0).toLocaleString()} كارت*
💰 إجمالي مبيعات الجملة: *${(totals.totalWholesale ?? 0).toLocaleString()} ${settings.currencySymbol}*
💵 مبيعات نقدية: *${(totals.totalCash ?? 0).toLocaleString()} ${settings.currencySymbol}*
⏳ مبيعات آجلة (ديون): *${(totals.totalCredit ?? 0).toLocaleString()} ${settings.currencySymbol}*
📈 صافي أرباح الشبكة: *${(totals.totalProfit ?? 0).toLocaleString()} ${settings.currencySymbol}*
----------------------------------------
تم إصدار هذا التقرير رسمياً من نظام إدارة الشبكة
للاستفسار: ${settings.supportPhone}`;
  };

  const handlePrint = async (customFormat?: 'a4' | 'pos-80mm') => {
    const targetFormat = customFormat || paperFormat;
    setIsPrinting(true);
    try {
      const containerId = targetFormat === 'pos-80mm' ? 'official-sales-report-thermal-content' : 'official-sales-report-content';
      await printElementDocument(containerId, {
        filename: `تقرير_مبيعات_${settings.networkName}_${targetFormat}.pdf`,
        orientation: targetFormat === 'pos-80mm' ? 'portrait' : 'landscape',
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.5,
        margin: targetFormat === 'pos-80mm' ? 2 : 5,
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
      const containerId = targetFormat === 'pos-80mm' ? 'official-sales-report-thermal-content' : 'official-sales-report-content';
      const fileName = `تقرير_مبيعات_${settings.networkName}_${targetFormat === 'pos-80mm' ? 'كاشير' : 'A4'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `تقرير مبيعات - ${settings.networkName}`,
        orientation: targetFormat === 'pos-80mm' ? 'portrait' : 'landscape',
        format: targetFormat === 'pos-80mm' ? 'pos-80mm' : 'a4',
        paperFormat: targetFormat,
        scale: 2.5,
        margin: targetFormat === 'pos-80mm' ? 2 : 5,
      });

      if (ok) {
        showFeedback(`تم تصدير تقرير المبيعات بصيغة PDF (${targetFormat === 'pos-80mm' ? 'كاشير حراري 80mm' : 'ورق A4 عريض'}) بنجاح ✅`);
      }
    } catch (err) {
      console.error('PDF Export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId = paperFormat === 'pos-80mm' ? 'official-sales-report-thermal-content' : 'official-sales-report-content';
      const fileName = `تقرير_مبيعات_${settings.networkName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `تقرير مبيعات شبكة ${settings.networkName}`,
        messageText: getFormattedWhatsAppMessage(),
        orientation: paperFormat === 'pos-80mm' ? 'portrait' : 'landscape',
        paperFormat: paperFormat,
        scale: 2.5,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال التقرير عبر واتساب ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم حفظ ملف PDF وفتح محادثة واتساب لإرفاقه مباشرة ✅');
      }
    } catch (err) {
      console.error('WhatsApp error:', err);
      const url = `https://wa.me/?text=${encodeURIComponent(getFormattedWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 p-3 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 truncate">
              <ReceiptText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">تقرير وسجل المبيعات</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {sales.length} عملية
              </span>
            </h3>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper Format Selector Tabs */}
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
              <span>تقرير A4 شامل</span>
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
              <span>ملخص كاشير (80mm)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title={`تصدير التقرير كملف PDF (${paperFormat === 'pos-80mm' ? 'كاشير' : 'A4'})`}
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
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="إرسال التقرير عبر واتساب كملف PDF"
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
              className={`px-2.5 sm:px-3 py-1.5 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                paperFormat === 'pos-80mm' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="طباعة التقرير"
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

        {/* Printable Official Sales Report Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40 flex items-center justify-center">

          {/* FORMAT 1: Standard A4 Full-Width Landscape/Portrait Report */}
          {paperFormat === 'a4' && (
            <div
              id="official-sales-report-content"
              className="p-6 sm:p-8 space-y-6 text-xs bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 font-sans w-full max-w-4xl mx-auto printable-document"
              dir="rtl"
            >
              {/* 1. Official Letterhead (الترويسة الرسمية) */}
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Right Metadata */}
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>تاريخ التقرير:</span>
                      <span className="font-mono text-slate-900">{reportDate}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      الوقت: {reportTime}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      رمز التقرير: <strong className="text-indigo-900">{reportCode}</strong>
                    </div>
                  </div>

                  {/* Center Network Branding */}
                  <div className="text-center flex-1 space-y-1">
                    <div className="inline-flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-base shadow-sm">
                        M
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                        {settings.networkName}
                      </h1>
                    </div>
                    <p className="text-xs text-slate-600 font-bold">{settings.networkSlogan}</p>
                    <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>هاتف: {settings.supportPhone}</span>
                      <span>•</span>
                      <span>البوابة: {settings.hotspotDns}</span>
                    </div>
                  </div>

                  {/* Left System Stamp Badge */}
                  <div className="text-left space-y-1">
                    <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-800">
                      نظام إدارة مبيعات الكروت
                    </div>
                    <div className="text-[10px] text-slate-500">
                      إجمالي السجلات: <strong className="text-slate-900 font-mono">{sales.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Title Ribbon */}
                <div className="mt-4 text-center">
                  <div className="inline-block px-6 py-2 rounded-xl bg-slate-900 text-white font-black text-sm sm:text-base shadow-sm">
                    تـقـريـر وسـجـل حـركـة مـبـيـعـات وفـواتـيـر الـكـروت
                  </div>
                </div>
              </div>

              {/* 2. Filter Parameters Applied Banner */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block font-semibold">نقطة البيع:</span>
                  <strong className="text-slate-950 font-bold">{filterInfo.posFilterName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">فئة الكارت:</span>
                  <strong className="text-slate-950 font-bold">{filterInfo.categoryFilterName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">طريقة الدفع:</span>
                  <strong className="text-slate-950 font-bold">{filterInfo.paymentFilterName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">الفترة المحددة:</span>
                  <strong className="text-slate-950 font-bold font-mono text-indigo-900">
                    {getFormattedDateRange()}
                  </strong>
                </div>
              </div>

              {/* 3. Executive Financial Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 text-right">
                  <span className="text-[10px] text-indigo-900 block font-bold">إجمالي الكروت المباعة</span>
                  <div className="text-base sm:text-lg font-black font-mono text-indigo-950 mt-0.5">
                    {(totals.totalQty ?? 0).toLocaleString()} <span className="text-[10px] font-sans font-normal text-indigo-800">كارت</span>
                  </div>
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-right">
                  <span className="text-[10px] text-emerald-900 block font-bold">إجمالي مبيعات الجملة</span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-950 mt-0.5">
                    {(totals.totalWholesale ?? 0).toLocaleString()} <span className="text-[10px] font-sans font-normal text-emerald-800">{settings.currencySymbol}</span>
                  </div>
                </div>

                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 text-right">
                  <span className="text-[10px] text-blue-900 block font-bold">مبيعات نقدية (مسددة)</span>
                  <div className="text-base sm:text-lg font-black font-mono text-blue-950 mt-0.5">
                    {(totals.totalCash ?? 0).toLocaleString()} <span className="text-[10px] font-sans font-normal text-blue-800">{settings.currencySymbol}</span>
                  </div>
                </div>

                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-right">
                  <span className="text-[10px] text-amber-900 block font-bold">مبيعات آجلة (ديون)</span>
                  <div className="text-base sm:text-lg font-black font-mono text-amber-950 mt-0.5">
                    {(totals.totalCredit ?? 0).toLocaleString()} <span className="text-[10px] font-sans font-normal text-amber-800">{settings.currencySymbol}</span>
                  </div>
                </div>

                <div className="bg-cyan-50/80 p-3 rounded-xl border border-cyan-200 text-right col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-cyan-900 block font-bold">صافي أرباح الشبكة</span>
                  <div className="text-base sm:text-lg font-black font-mono text-cyan-950 mt-0.5">
                    +{(totals.totalProfit ?? 0).toLocaleString()} <span className="text-[10px] font-sans font-normal text-cyan-800">{settings.currencySymbol}</span>
                  </div>
                </div>
              </div>

              {/* 4. Detailed Data Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-8">#</th>
                      <th className="py-2.5 px-3">رقم الفاتورة</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">نقطة البيع / الموزع</th>
                      <th className="py-2.5 px-3">فئة الكارت</th>
                      <th className="py-2.5 px-2 text-center">الكمية</th>
                      <th className="py-2.5 px-3">سعر الجملة</th>
                      <th className="py-2.5 px-3">إجمالي الجملة</th>
                      <th className="py-2.5 px-3">الربح</th>
                      <th className="py-2.5 px-3 text-center">حالة الدفع</th>
                      <th className="py-2.5 px-3">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {sales.map((sale, idx) => {
                      const pos = posPoints.find((p) => p.id === sale.posPointId);
                      const cat = categories.find((c) => c.id === sale.categoryId);

                      return (
                        <tr key={sale.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2 px-3 text-center font-mono text-slate-500 font-semibold text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-950 whitespace-nowrap">
                            {sale.invoiceNumber}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {sale.date}
                          </td>
                          <td className="py-2 px-3">
                            <strong className="text-slate-950 block">{pos ? pos.name : 'مبيعات مباشرة'}</strong>
                            {pos?.managerName && (
                              <span className="text-[10px] text-slate-500">{pos.managerName}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {cat ? cat.name : 'فئة كارت'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-black text-slate-950 text-xs">
                            {sale.quantity}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {sale.unitWholesalePrice} {settings.currencySymbol}
                          </td>
                          <td className="py-2 px-3 font-mono font-black text-emerald-900 text-xs whitespace-nowrap">
                            {(sale.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-cyan-900 whitespace-nowrap">
                            +{(sale.profit ?? 0).toLocaleString()} {settings.currencySymbol}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                sale.paymentType === 'cash'
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                  : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}
                            >
                              {sale.paymentType === 'cash' ? 'نقدي مسدد' : 'آجل (حساب)'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[10px] max-w-xs">
                            {sale.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}

                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500 font-bold">
                          لا توجد عمليات مبيعات مطابقة لمعايير البحث والفترة المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {sales.length > 0 && (
                    <tfoot className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right">
                          الإجمالي العام ({sales.length} عملية):
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-xs">
                          {(totals.totalQty ?? 0).toLocaleString()}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-3 font-mono text-xs text-emerald-950 whitespace-nowrap">
                          {(totals.totalWholesale ?? 0).toLocaleString()} {settings.currencySymbol}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-cyan-950 whitespace-nowrap">
                          +{(totals.totalProfit ?? 0).toLocaleString()} {settings.currencySymbol}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* 5. Official Signatures and Seal */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-slate-700 block mb-10 font-bold text-xs">إعداد / مدخل البيانات</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-32 sm:w-40 mx-auto"></div>
                </div>

                <div>
                  <span className="text-slate-700 block mb-10 font-bold text-xs">المراجعة والمطابقة المالية</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-32 sm:w-40 mx-auto"></div>
                </div>

                <div>
                  <span className="text-slate-700 block mb-10 font-bold text-xs">اعتماد إدارة الشبكة والختم</span>
                  <div className="border-t-2 border-dashed border-slate-400 w-32 sm:w-40 mx-auto"></div>
                </div>
              </div>

              {/* 6. System Verification Footer */}
              <div className="text-center pt-3 border-t border-slate-200 space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  {settings.statementFooterText || 'تقرير مبيعات رسمي معتمد • نظام إدارة شبكات مايكروتك'}
                </p>
                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span>نظام إدارة شبكات مايكروتك • {settings.networkName}</span>
                  <span>تاريخ الطباعة: {reportDate} {reportTime}</span>
                  <span>تقرير رسمي معتمد</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 2: Thermal POS Cashier Sales Summary Roll (80mm Paper Size) */}
          {paperFormat === 'pos-80mm' && (
            <div
              id="official-sales-report-thermal-content"
              className="p-4 bg-white text-black font-mono text-xs shadow-2xl rounded-lg border-2 border-slate-300 w-full max-w-[340px] mx-auto space-y-3 printable-thermal-document"
              dir="rtl"
              style={{ fontFamily: 'monospace, system-ui' }}
            >
              {/* Thermal Header */}
              <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
                <div className="font-black text-base tracking-tight">{settings.networkName}</div>
                <div className="text-[11px] font-bold">{settings.networkSlogan}</div>
                <div className="text-[10px]">هاتف: {settings.supportPhone}</div>
              </div>

              {/* Title & Metadata */}
              <div className="text-center py-1 border-b border-dashed border-black">
                <div className="font-black text-sm bg-black text-white py-0.5 px-2 inline-block rounded">
                  *** ملخص مبيعات الكروت ***
                </div>
                <div className="flex justify-between items-center text-[10px] mt-2 font-bold">
                  <span>رمز التقرير:</span>
                  <span className="font-black">{reportCode}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-800">
                  <span>التاريخ: {reportDate}</span>
                  <span>الوقت: {reportTime}</span>
                </div>
              </div>

              {/* Filter Scope in Thermal Receipt */}
              <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-black">
                <div className="font-bold">الفترة: {getFormattedDateRange()}</div>
                <div>النقطة: {filterInfo.posFilterName}</div>
                <div>الفئة: {filterInfo.categoryFilterName}</div>
                <div>الدفع: {filterInfo.paymentFilterName}</div>
                <div className="font-bold">عدد العمليات: {sales.length} عملية</div>
              </div>

              {/* Thermal Summary Totals */}
              <div className="space-y-1 py-1 border-b-2 border-dashed border-black text-[11px]">
                <div className="flex justify-between">
                  <span>إجمالي الكروت المباعة:</span>
                  <span className="font-black">{(totals.totalQty ?? 0).toLocaleString()} كارت</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي مبيعات الجملة:</span>
                  <span className="font-black">{(totals.totalWholesale ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>المبيعات النقدية:</span>
                  <span className="font-bold">{(totals.totalCash ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>المبيعات الآجلة (ديون):</span>
                  <span className="font-bold text-slate-900">{(totals.totalCredit ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-dotted border-black">
                  <span>صافي أرباح الشبكة:</span>
                  <span>+{(totals.totalProfit ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                </div>
              </div>

              {/* Recent / Top Sales Mini-List */}
              <div className="py-1 border-b-2 border-dashed border-black">
                <div className="font-bold text-[10px] mb-1">تفاصيل العمليات المضمنة ({sales.length}):</div>
                <div className="space-y-1.5 text-[10px]">
                  {sales.slice(0, 15).map((sale, idx) => {
                    const pos = posPoints.find((p) => p.id === sale.posPointId);
                    const cat = categories.find((c) => c.id === sale.categoryId);
                    return (
                      <div key={sale.id} className="border-b border-dotted border-slate-300 pb-1">
                        <div className="flex justify-between font-bold">
                          <span>{idx + 1}. {pos ? pos.name : 'مبيعات مباشرة'}</span>
                          <span>{(sale.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-700">
                          <span>{cat?.name || 'كارت'} ({sale.quantity} كارت)</span>
                          <span>{sale.date} • {sale.paymentType === 'cash' ? 'نقدي' : 'آجل'}</span>
                        </div>
                      </div>
                    );
                  })}
                  {sales.length > 15 && (
                    <div className="text-center text-[9px] text-slate-600 pt-1 font-bold">
                      ... والمزيد ({sales.length - 15} عملية أخرى مضمنة في الإجمالي)
                    </div>
                  )}
                </div>
              </div>

              {/* Barcode & Footer */}
              <div className="text-center pt-2 space-y-2">
                <div className="flex flex-col items-center justify-center bg-white p-1 rounded border border-slate-200">
                  <Barcode value={reportCode} width={1.5} height={36} fontSize={10} margin={2} />
                </div>

                <div className="text-[10px] pt-2 text-center font-bold border-t border-dotted border-black leading-relaxed">
                  {settings.cashierFooterText || settings.statementFooterText || `تقرير محاسبي معتمد • ${settings.supportPhone}`}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer (Screen only) */}
        <div className="sticky bottom-0 z-20 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>النمط المختار:</span>
            <strong className="text-indigo-400">
              {paperFormat === 'pos-80mm' ? 'ورق كاشير حراري 80mm' : 'ورق A4 عريض معتمد'}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق المعاينة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
