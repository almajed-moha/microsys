import React, { useState, useMemo } from 'react';
import {
  Printer,
  Share2,
  X,
  FileText,
  Receipt,
  Download,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  HardDrive,
  Users,
  Clock,
  Zap,
  Calendar,
  Building2,
  Smartphone,
  Laptop,
  Check,
  Copy
} from 'lucide-react';
import {
  exportElementToPdf,
  sharePdfToWhatsApp,
  printElementDocument,
} from '../utils/pdfExport';

export interface DailyUsagePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  routerIdentity?: string;
  networkName?: string;
  supportPhone?: string;
  currencySymbol?: string;
  dayStats: {
    totalPull: number;
    totalDownload: number;
    totalUpload: number;
    uniqueUsersCount: number;
    avgPerUser: number;
    hourlyPull: {
      hour: number;
      label: string;
      download: number;
      upload: number;
      total: number;
    }[];
    peakHour: {
      hour: number;
      label: string;
      download: number;
      upload: number;
      total: number;
    };
    topConsumers: {
      user: string;
      address: string;
      macAddress: string;
      hostName?: string;
      download: number;
      upload: number;
      total: number;
      uptime: string;
      server?: string;
      comment?: string;
    }[];
    isFromDb?: boolean;
  };
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DailyUsagePrintModal: React.FC<DailyUsagePrintModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  routerIdentity = 'راوتر مايكروتك',
  networkName = 'شبكة المايكروتك',
  supportPhone = '',
  currencySymbol = 'ريال',
  dayStats,
}) => {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'pos-80mm' | 'pos-58mm'>('a4');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [includeTopConsumers, setIncludeTopConsumers] = useState(true);
  const [maxTopConsumers, setMaxTopConsumers] = useState(15);
  const [includeHourlyChart, setIncludeHourlyChart] = useState(true);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const getContainerId = () => {
    if (paperFormat === 'pos-80mm') return 'daily-usage-thermal-80-content';
    if (paperFormat === 'pos-58mm') return 'daily-usage-thermal-58-content';
    return 'daily-usage-a4-content';
  };

  const displayedConsumers = useMemo(() => {
    return dayStats.topConsumers.slice(0, maxTopConsumers);
  }, [dayStats.topConsumers, maxTopConsumers]);

  // Handle PDF Export
  const handleExportPdf = async (targetFormat?: 'a4' | 'pos-80mm' | 'pos-58mm') => {
    const fmt = targetFormat || paperFormat;
    setIsExportingPdf(true);
    try {
      const containerId =
        fmt === 'pos-80mm'
          ? 'daily-usage-thermal-80-content'
          : fmt === 'pos-58mm'
          ? 'daily-usage-thermal-58-content'
          : 'daily-usage-a4-content';

      const fileName = `تقرير_استهلاك_يومي_${selectedDate}_${
        fmt === 'pos-80mm' ? 'حراري_80mm' : fmt === 'pos-58mm' ? 'حراري_58mm' : 'A4'
      }.pdf`;

      const ok = await exportElementToPdf(containerId, {
        filename: fileName,
        title: `تقرير الاستهلاك اليومي للإنترنت - ${selectedDate}`,
        orientation: fmt === 'a4' ? pageOrientation : 'portrait',
        format: fmt === 'pos-80mm' ? 'pos-80mm' : fmt === 'pos-58mm' ? 'pos-58mm' : 'a4',
        paperFormat: fmt,
        scale: 2.5,
        margin: fmt === 'pos-58mm' ? 1 : fmt === 'pos-80mm' ? 2 : 6,
      });

      if (ok) {
        showFeedback(`تم تصدير ملف PDF بنجاح (${fmt === 'a4' ? 'ورق A4' : fmt === 'pos-80mm' ? 'حراري 80mm' : 'حراري 58mm'}) ✅`);
      }
    } catch (err) {
      console.error('Daily usage PDF export error:', err);
      showFeedback('تعذر تصدير ملف PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // WhatsApp Message Text
  const getWhatsAppMessage = () => {
    return `📊 *تقرير الاستهلاك والسحب اليومي للإنترنت*
🌐 *الشبكة:* ${networkName}
📡 *الراوتر:* ${routerIdentity}
📅 *التاريخ:* ${selectedDate}

⚡ *إجمالي السحب اليومي:* ${formatBytes(dayStats.totalPull)}
📥 *التنزيل (Download):* ${formatBytes(dayStats.totalDownload)}
📤 *الرفع (Upload):* ${formatBytes(dayStats.totalUpload)}
👥 *الكروت النشطة:* ${dayStats.uniqueUsersCount} مستخدم
📈 *متوسط استهلاك الكارت:* ${formatBytes(dayStats.avgPerUser)}
⏰ *ساعة الذروة:* ${dayStats.peakHour ? dayStats.peakHour.label : '—'} (${formatBytes(dayStats.peakHour?.total || 0)})

تم التصدير آلياً عبر نظام إدارة المايكروتك.`;
  };

  // WhatsApp Share
  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const containerId = getContainerId();
      const fileName = `تقرير_استهلاك_الإنترنت_${selectedDate}.pdf`;
      const res = await sharePdfToWhatsApp(containerId, {
        filename: fileName,
        title: `تقرير استهلاك الإنترنت اليومي - ${selectedDate}`,
        messageText: getWhatsAppMessage(),
        orientation: paperFormat === 'a4' ? pageOrientation : 'portrait',
        paperFormat: paperFormat,
        scale: 2.5,
      });

      if (res.method === 'web_share') {
        showFeedback('تم فتح نافذة المشاركة لإرسال التقرير عبر واتساب وتطبيقات المشاركة ✅');
      } else if (res.method === 'download_and_chat') {
        showFeedback('تم تنزيل ملف PDF وفتح محادثة واتساب لإرفاقه ومشاركته مباشرة ✅');
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
      const url = `https://wa.me/?text=${encodeURIComponent(getWhatsAppMessage())}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // Print Document
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const containerId = getContainerId();
      await printElementDocument(containerId, {
        title: `تقرير استهلاك وسحب الإنترنت اليومي - ${selectedDate}`,
        orientation: paperFormat === 'a4' ? pageOrientation : 'portrait',
        paperFormat: paperFormat,
        format: paperFormat,
        margin: paperFormat === 'pos-58mm' ? 1 : paperFormat === 'pos-80mm' ? 2 : 6,
      });
      showFeedback('تم إرسال التقرير إلى أمر الطباعة بنجاح 🖨️');
    } catch (err) {
      console.error('Print error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    navigator.clipboard.writeText(getWhatsAppMessage());
    showFeedback('تم نسخ ملخص الاستهلاك اليومي للحافظة بنجاح 📋');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none">
        
        {/* Top Header & Toolbar - Not Printed */}
        <div className="sticky top-0 z-20 p-3.5 sm:p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/95 backdrop-blur-md no-print">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>خيارات طباعة ومشاركة الاستهلاك اليومي</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-teal-500/20 text-teal-300 font-mono font-bold border border-teal-500/30">
                    {selectedDate}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  طباعة على ورق A4 أو بكرات حرارية (80mm / 58mm) ومشاركة عبر واتساب أو PDF
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Paper Format Selector Ribbon */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setPaperFormat('a4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paperFormat === 'a4'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ورق عادي A4</span>
            </button>

            <button
              onClick={() => setPaperFormat('pos-80mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paperFormat === 'pos-80mm'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>حراري كاشير 80mm</span>
            </button>

            <button
              onClick={() => setPaperFormat('pos-58mm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                paperFormat === 'pos-58mm'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>حراري ميني 58mm</span>
            </button>

            {/* A4 Orientation Toggle */}
            {paperFormat === 'a4' && (
              <div className="flex items-center gap-1 mr-1 border-r border-slate-700 pr-1 text-[11px]">
                <button
                  onClick={() => setPageOrientation('portrait')}
                  className={`px-2 py-1 rounded-lg font-bold transition ${
                    pageOrientation === 'portrait'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="عمودي Portrait"
                >
                  عمودي
                </button>
                <button
                  onClick={() => setPageOrientation('landscape')}
                  className={`px-2 py-1 rounded-lg font-bold transition ${
                    pageOrientation === 'landscape'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="عريض Landscape"
                >
                  أفقي
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: PDF, WhatsApp, Print, Copy */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => handleExportPdf()}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="تصدير كملف PDF عالي الدقة"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            <button
              onClick={handleWhatsApp}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="مشاركة تقرير الاستهلاك عبر واتساب"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isExportingPdf || isSharingWhatsApp || isPrinting}
              className={`px-2.5 sm:px-3 py-1.5 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                paperFormat === 'pos-80mm'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : paperFormat === 'pos-58mm'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-teal-600 hover:bg-teal-500'
              }`}
              title="طباعة فورية"
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>
                {paperFormat === 'pos-80mm'
                  ? 'طباعة 80mm'
                  : paperFormat === 'pos-58mm'
                  ? 'طباعة 58mm'
                  : 'طباعة A4'}
              </span>
            </button>

            <button
              onClick={handleCopySummary}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              title="نسخ ملخص الاستهلاك كنص"
            >
              <Copy className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">نسخ النص</span>
            </button>

            <button
              onClick={onClose}
              className="hidden md:block p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Feedback Banner */}
        {feedbackMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-bold animate-in fade-in flex items-center justify-center gap-2 no-print shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Print Configuration Bar (Options for report details) */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 no-print">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeTopConsumers}
                onChange={(e) => setIncludeTopConsumers(e.target.checked)}
                className="rounded text-teal-600 focus:ring-0 cursor-pointer"
              />
              <span>تضمين قائمة أعلى الكروت استهلاكاً</span>
            </label>

            {includeTopConsumers && (
              <div className="flex items-center gap-1">
                <span>العدد:</span>
                <select
                  value={maxTopConsumers}
                  onChange={(e) => setMaxTopConsumers(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                >
                  <option value={5}>5 كروت</option>
                  <option value={10}>10 كروت</option>
                  <option value={15}>15 كرت</option>
                  <option value={30}>30 كرت</option>
                  <option value={50}>50 كرت</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeHourlyChart}
                onChange={(e) => setIncludeHourlyChart(e.target.checked)}
                className="rounded text-teal-600 focus:ring-0 cursor-pointer"
              />
              <span>تضمين جدول ساعات الذروة والنشاط (24 ساعة)</span>
            </label>
          </div>

          <div className="text-[11px] text-teal-400 font-mono">
            {paperFormat === 'a4'
              ? 'مقاس الصفحة: ورق مكتبي قياسي A4'
              : paperFormat === 'pos-80mm'
              ? 'مقاس الصفحة: شريط طابعة حرارية 80mm'
              : 'مقاس الصفحة: شريط طابعة حرارية ميني 58mm'}
          </div>
        </div>

        {/* Printable View Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40 flex items-start justify-center">

          {/* ======================================================== */}
          {/* FORMAT 1: A4 Standard Paper Layout                        */}
          {/* ======================================================== */}
          {paperFormat === 'a4' && (
            <div
              id="daily-usage-a4-content"
              className={`bg-white text-slate-900 shadow-2xl rounded-2xl border border-slate-200 p-8 space-y-6 mx-auto ${
                pageOrientation === 'landscape' ? 'w-full max-w-[1050px]' : 'w-full max-w-[780px]'
              }`}
              dir="rtl"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Official Header */}
              <div className="flex items-start justify-between border-b-2 border-teal-700 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-lg">
                      <Zap size={22} />
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        {networkName}
                      </h1>
                      <p className="text-xs text-slate-500 font-semibold">
                        تقرير الاستهلاك اليومي لحركة البيانات والإنترنت
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left text-xs space-y-1">
                  <div className="inline-block bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-xl font-bold font-mono">
                    التاريخ: {selectedDate}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    الراوتر: <strong className="text-slate-800">{routerIdentity}</strong>
                  </div>
                  {supportPhone && (
                    <div className="text-slate-500 text-[11px]">
                      الدعم الفني: <span className="font-mono">{supportPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Main KPI Hero Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Total Pull */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-teal-400 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <Zap size={14} />
                      إجمالي السحب اليومي
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono">24 ساعة</span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight" dir="ltr">
                      {formatBytes(dayStats.totalPull)}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      تنزيل + رفع لجميع المشتركين
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                    <span>المتوسط للكارت:</span>
                    <span className="font-mono text-teal-300 font-bold" dir="ltr">{formatBytes(dayStats.avgPerUser)}</span>
                  </div>
                </div>

                {/* Download Breakdown */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-blue-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <ArrowDownCircle size={14} />
                      إجمالي التنزيل (Download)
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                      {dayStats.totalPull > 0 ? Math.round((dayStats.totalDownload / dayStats.totalPull) * 100) : 0}%
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black text-blue-950 font-mono" dir="ltr">
                      {formatBytes(dayStats.totalDownload)}
                    </div>
                    <div className="text-[11px] text-blue-700 mt-1">
                      سحب الكروت لحزم البيانات
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200 text-[10px] text-blue-800 flex justify-between">
                    <span>ساعة الذروة:</span>
                    <span className="font-mono font-bold">{dayStats.peakHour?.label || '—'}</span>
                  </div>
                </div>

                {/* Upload Breakdown */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <ArrowUpCircle size={14} />
                      إجمالي الرفع (Upload)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                      {dayStats.totalPull > 0 ? Math.round((dayStats.totalUpload / dayStats.totalPull) * 100) : 0}%
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-black text-emerald-950 font-mono" dir="ltr">
                      {formatBytes(dayStats.totalUpload)}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-1">
                      البيانات المرفوعة من الأجهزة
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 text-[10px] text-emerald-800 flex justify-between">
                    <span>الكروت النشطة:</span>
                    <span className="font-mono font-bold">{dayStats.uniqueUsersCount} مستخدم</span>
                  </div>
                </div>
              </div>

              {/* Peak Hours Breakdown (Optional) */}
              {includeHourlyChart && dayStats.hourlyPull.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock size={15} className="text-teal-700" />
                      مؤشر الاستهلاك وساعات الذروة (على مدار 24 ساعة)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ذروة السحب: <strong className="text-teal-700 font-mono">{dayStats.peakHour?.label}</strong> ({formatBytes(dayStats.peakHour?.total || 0)})
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 text-center font-mono text-[10px]">
                    {dayStats.hourlyPull.map((h) => {
                      const maxVal = Math.max(...dayStats.hourlyPull.map((x) => x.total), 1);
                      const heightPercent = Math.max(8, Math.round((h.total / maxVal) * 100));
                      const isPeak = h.hour === dayStats.peakHour?.hour && h.total > 0;

                      return (
                        <div key={h.hour} className="flex flex-col items-center justify-end h-20 p-1 bg-white rounded-lg border border-slate-200">
                          <div
                            className={`w-full rounded-sm transition-all ${
                              isPeak ? 'bg-teal-600' : h.total > 0 ? 'bg-blue-400' : 'bg-slate-200'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                            title={`${h.label}: ${formatBytes(h.total)}`}
                          />
                          <span className={`mt-1 ${isPeak ? 'font-bold text-teal-800' : 'text-slate-500'}`}>
                            {h.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Consumers Table */}
              {includeTopConsumers && displayedConsumers.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users size={15} className="text-teal-700" />
                      أعلى الكروت استهلاكاً للبيانات خلال اليوم (أعلى {displayedConsumers.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      مرتبة تنازلياً حسب إجمالي السحب
                    </span>
                  </div>

                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">اسم الكارت / المستخدم</th>
                        <th className="p-2.5">عنوان IP</th>
                        <th className="p-2.5">التنزيل (Download)</th>
                        <th className="p-2.5">الرفع (Upload)</th>
                        <th className="p-2.5">إجمالي السحب</th>
                        <th className="p-2.5 text-left">النسبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayedConsumers.map((item, idx) => {
                        const pct = dayStats.totalPull > 0 ? (item.total / dayStats.totalPull) * 100 : 0;
                        return (
                          <tr key={item.user} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-slate-900">
                              {item.user}
                              {item.hostName && (
                                <span className="text-[10px] text-slate-400 mr-1.5 font-normal">
                                  ({item.hostName})
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-mono text-slate-600">{item.address || '—'}</td>
                            <td className="p-2 font-mono text-blue-700" dir="ltr">{formatBytes(item.download)}</td>
                            <td className="p-2 font-mono text-emerald-700" dir="ltr">{formatBytes(item.upload)}</td>
                            <td className="p-2 font-mono font-bold text-slate-900" dir="ltr">{formatBytes(item.total)}</td>
                            <td className="p-2 font-mono text-slate-500 text-left" dir="ltr">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer & Timestamp */}
              <div className="pt-4 border-t-2 border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  تم توليد هذا التقرير آلياً عبر نظام إدارة المايكروتك • {networkName}
                </div>
                <div className="font-mono text-[11px]">
                  تاريخ الطباعة: {new Date().toLocaleString('ar-YE')}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMAT 2: Thermal POS Roll (80mm Width)                   */}
          {/* ======================================================== */}
          {paperFormat === 'pos-80mm' && (
            <div
              id="daily-usage-thermal-80-content"
              className="bg-white text-black font-mono text-xs shadow-2xl rounded-lg border-2 border-slate-300 w-full max-w-[340px] mx-auto p-4 space-y-3 printable-thermal-document"
              dir="rtl"
              style={{ fontFamily: 'monospace, system-ui' }}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
                <div className="font-black text-base tracking-tight">{networkName}</div>
                <div className="text-[11px] font-bold">تقرير الاستهلاك والسحب اليومي للإنترنت</div>
                <div className="text-[10px]">راوتر: {routerIdentity}</div>
                {supportPhone && <div className="text-[10px]">هاتف: {supportPhone}</div>}
              </div>

              {/* Date & Metadata */}
              <div className="text-center py-1 border-b border-dashed border-black space-y-1">
                <div className="font-black text-xs bg-black text-white py-0.5 px-2 inline-block rounded">
                  *** ملخص سحب يوم {selectedDate} ***
                </div>
                <div className="text-[10px] text-slate-800">
                  وقت الإصدار: {new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Main Totals */}
              <div className="space-y-1.5 pb-2 border-b-2 border-dashed border-black text-[11px]">
                <div className="flex justify-between items-center bg-slate-100 p-1 rounded font-black text-sm">
                  <span>إجمالي السحب:</span>
                  <span dir="ltr">{formatBytes(dayStats.totalPull)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span>إجمالي التنزيل (↓):</span>
                  <span dir="ltr" className="font-bold">{formatBytes(dayStats.totalDownload)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span>إجمالي الرفع (↑):</span>
                  <span dir="ltr" className="font-bold">{formatBytes(dayStats.totalUpload)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800 pt-1 border-t border-dotted border-slate-400">
                  <span>عدد الكروت النشطة:</span>
                  <span className="font-bold">{dayStats.uniqueUsersCount} كرت</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span>متوسط استهلاك الكارت:</span>
                  <span dir="ltr" className="font-bold">{formatBytes(dayStats.avgPerUser)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span>ساعة الذروة:</span>
                  <span className="font-bold">{dayStats.peakHour?.label || '—'} ({formatBytes(dayStats.peakHour?.total || 0)})</span>
                </div>
              </div>

              {/* Top Consumers on Thermal */}
              {includeTopConsumers && displayedConsumers.length > 0 && (
                <div className="space-y-1 pb-2 border-b border-dashed border-black">
                  <div className="font-bold text-[11px] text-center pb-1">
                    === أعلى الكروت استهلاكاً ({Math.min(10, displayedConsumers.length)}) ===
                  </div>
                  <div className="space-y-1 text-[10px]">
                    {displayedConsumers.slice(0, 10).map((c, i) => (
                      <div key={c.user} className="flex justify-between items-center border-b border-dotted border-slate-200 pb-0.5">
                        <span className="truncate max-w-[140px]">
                          {i + 1}. {c.user}
                        </span>
                        <span dir="ltr" className="font-bold shrink-0">
                          {formatBytes(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thermal Footer */}
              <div className="text-center pt-2 text-[9px] text-slate-600 space-y-0.5">
                <div>نظام إدارة شبكات مايكروتك الإلكتروني</div>
                <div>شـكـراً لـكـم</div>
                <div className="text-[8px] pt-1">*** نهاية التقرير اليومي ***</div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMAT 3: Compact Mini Thermal POS (58mm Width)           */}
          {/* ======================================================== */}
          {paperFormat === 'pos-58mm' && (
            <div
              id="daily-usage-thermal-58-content"
              className="bg-white text-black font-mono text-[10px] shadow-2xl rounded-lg border border-slate-300 w-full max-w-[240px] mx-auto p-2.5 space-y-2 printable-thermal-document"
              dir="rtl"
              style={{ fontFamily: 'monospace, system-ui' }}
            >
              <div className="text-center pb-1 border-b border-dashed border-black">
                <div className="font-black text-xs">{networkName}</div>
                <div className="text-[9px]">تقرير الاستهلاك اليومي</div>
                <div className="text-[8px]">{selectedDate}</div>
              </div>

              <div className="space-y-1 text-[10px] pb-1 border-b border-dashed border-black">
                <div className="flex justify-between font-black">
                  <span>السحب:</span>
                  <span dir="ltr">{formatBytes(dayStats.totalPull)}</span>
                </div>
                <div className="flex justify-between">
                  <span>تنزيل:</span>
                  <span dir="ltr">{formatBytes(dayStats.totalDownload)}</span>
                </div>
                <div className="flex justify-between">
                  <span>رفع:</span>
                  <span dir="ltr">{formatBytes(dayStats.totalUpload)}</span>
                </div>
                <div className="flex justify-between">
                  <span>كروت:</span>
                  <span>{dayStats.uniqueUsersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>الذروة:</span>
                  <span>{dayStats.peakHour?.label}</span>
                </div>
              </div>

              {includeTopConsumers && displayedConsumers.length > 0 && (
                <div className="space-y-1 text-[9px] pb-1 border-b border-dashed border-black">
                  <div className="text-center font-bold">أعلى الكروت:</div>
                  {displayedConsumers.slice(0, 5).map((c, i) => (
                    <div key={c.user} className="flex justify-between">
                      <span className="truncate max-w-[100px]">{i + 1}.{c.user}</span>
                      <span dir="ltr" className="font-bold">{formatBytes(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center text-[8px] pt-1">
                <div>نظام المايكروتك</div>
                <div>{new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span>الصيغة المختارة:</span>
            <strong className="text-teal-400 font-bold">
              {paperFormat === 'a4'
                ? `ورق مكتبي A4 (${pageOrientation === 'landscape' ? 'عريض' : 'عمودي'})`
                : paperFormat === 'pos-80mm'
                ? 'شريط حراري 80mm'
                : 'شريط حراري 58mm'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              <Printer size={14} />
              <span>طباعة فورية</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
