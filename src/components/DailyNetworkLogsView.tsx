import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Trash2,
  Plus,
  Download,
  Upload,
  Activity,
  Save,
  RefreshCw,
  Printer,
  FileText,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Database,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Zap,
  HardDrive,
  Info,
  Check,
  Share2,
  Receipt,
  FileDown,
} from 'lucide-react';
import {
  DailyNetworkLog,
  getDailyNetworkLogs,
  deleteDailyNetworkLog,
  deleteMultipleNetworkLogs,
  saveDailyNetworkLog,
  subscribeToDailyNetworkLogs,
  syncReconstructedDayLog,
} from '../services/networkLogsService';
import { HotspotActiveUser, MikroTikConfig } from '../types';
import { syncCurrentActiveUsersToDailyLog } from '../hooks/useNetworkUsageTracker';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';
import { DailyUsagePrintModal } from './DailyUsagePrintModal';
import { getLocalDateString, getYesterdayDateString } from '../utils/dateUtils';
import { fetchUserManagerDailyReport } from '../utils/mikrotikApi';

const formatBytesToHuman = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Props {
  currentDownloadBytes?: number;
  currentUploadBytes?: number;
  activeUsers?: HotspotActiveUser[];
  routerIdentity?: string;
  isConnected?: boolean;
  mikrotikConfig?: Partial<MikroTikConfig>;
  onOpenDataSync?: () => void;
}

export const DailyNetworkLogsView: React.FC<Props> = ({
  currentDownloadBytes = 0,
  currentUploadBytes = 0,
  activeUsers = [],
  routerIdentity = 'MikroTik Router',
  isConnected = false,
  mikrotikConfig,
  onOpenDataSync,
}) => {
  const [logs, setLogs] = useState<DailyNetworkLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [printModalData, setPrintModalData] = useState<{
    date: string;
    download: number;
    upload: number;
    total: number;
  } | null>(null);

  // Manual Add/Edit Modal State
  const [date, setDate] = useState(() => getLocalDateString());
  const [downBytes, setDownBytes] = useState<number>(0);
  const [upBytes, setUpBytes] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Load data from Firestore
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyNetworkLogs();
      setLogs(data);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Error fetching logs from Firestore:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Firestore subscription
  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToDailyNetworkLogs(
      (freshLogs) => {
        setLogs(freshLogs);
        setLastFetchTime(new Date());
      },
      (err) => {
        console.warn('Real-time sync fallback:', err);
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  // Local calendar date strings
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // Manual Sync Now from active users
  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    try {
      const res = await syncCurrentActiveUsersToDailyLog(activeUsers, routerIdentity);
      await loadData();
      setActionFeedback({
        success: res.success,
        message: res.message,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: err.message || 'حدث خطأ أثناء المزامنة مع قاعدة البيانات',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Deep Reconcile Yesterday and Today from Router
  const handleReconcileYesterdayAndToday = async () => {
    setIsSyncingNow(true);
    try {
      if (mikrotikConfig?.host) {
        const [yReport, tReport] = await Promise.all([
          fetchUserManagerDailyReport(mikrotikConfig, yesterdayStr).catch(() => ({ success: false, data: null })),
          fetchUserManagerDailyReport(mikrotikConfig, todayStr).catch(() => ({ success: false, data: null })),
        ]);

        if (yReport.success && yReport.data?.summary) {
          const s = yReport.data.summary;
          const dl = s.cardsDownloadBytes || 0;
          const ul = s.cardsUploadBytes || 0;
          if (dl > 0 || ul > 0) {
            await syncReconstructedDayLog(yesterdayStr, dl, ul, {
              activeUsersCount: s.totalActiveCardsToday || s.totalSessionsToday || 0,
              routerIdentity: routerIdentity || mikrotikConfig.host,
              notes: 'مطابقة مباشرة من جلسات الراوتر',
            });
          }
        }

        if (tReport.success && tReport.data?.summary) {
          const s = tReport.data.summary;
          const dl = s.cardsDownloadBytes || 0;
          const ul = s.cardsUploadBytes || 0;
          if (dl > 0 || ul > 0) {
            await syncReconstructedDayLog(todayStr, dl, ul, {
              activeUsersCount: s.totalActiveCardsToday || s.activeCardsNow || 0,
              routerIdentity: routerIdentity || mikrotikConfig.host,
              notes: 'مطابقة مباشرة من جلسات الراوتر',
            });
          }
        }
      }

      // Also run normal live active users sync for right now
      if (activeUsers && activeUsers.length > 0) {
        await syncCurrentActiveUsersToDailyLog(activeUsers, routerIdentity);
      }

      await loadData();
      setActionFeedback({
        success: true,
        message: `تمت مطابقة وتصحيح استهلاك أمس (${yesterdayStr}) واليوم (${todayStr}) بنجاح!`,
      });
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        success: false,
        message: err.message || 'حدث خطأ أثناء مطابقة بيانات الاستهلاك',
      });
      setTimeout(() => setActionFeedback(null), 4500);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Save manual record
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDailyNetworkLog({
        date,
        downloadBytes: Number(downBytes) || 0,
        uploadBytes: Number(upBytes) || 0,
        totalBytes: (Number(downBytes) || 0) + (Number(upBytes) || 0),
        notes,
        routerIdentity,
      });
      setShowModal(false);
      setActionFeedback({
        success: true,
        message: `تم حفظ تقرير الاستهلاك ليوم (${date}) في قاعدة البيانات بنجاح`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
      loadData();
    } catch (err) {
      alert('تعذر حفظ السجل في قاعدة البيانات');
    }
  };

  // Delete single log
  const handleDelete = async (id: string) => {
    if (confirm(`هل أنت متأكد من حذف سجل استهلاك يوم (${id}) من قاعدة البيانات؟`)) {
      try {
        await deleteDailyNetworkLog(id);
        setActionFeedback({
          success: true,
          message: `تم حذف سجل يوم (${id}) بنجاح`,
        });
        setTimeout(() => setActionFeedback(null), 4000);
        loadData();
      } catch (e) {
        alert('تعذر الحذف من قاعدة البيانات');
      }
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} سجل استهلاك يومي من قاعدة البيانات؟`)) {
      try {
        await deleteMultipleNetworkLogs(selectedIds);
        setSelectedIds([]);
        setActionFeedback({
          success: true,
          message: `تم حذف ${selectedIds.length} سجل بنجاح من قاعدة البيانات`,
        });
        setTimeout(() => setActionFeedback(null), 4000);
        loadData();
      } catch (e) {
        alert('تعذر الحذف الجماعي');
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const fillFromCurrent = () => {
    setDownBytes(currentDownloadBytes);
    setUpBytes(currentUploadBytes);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        searchTerm === '' ||
        log.date.includes(searchTerm) ||
        (log.notes && log.notes.includes(searchTerm));
      const matchMonth =
        selectedMonth === 'all' || log.date.startsWith(selectedMonth);
      return matchSearch && matchMonth;
    });
  }, [logs, searchTerm, selectedMonth]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalAllBytes = logs.reduce((sum, l) => sum + (l.totalBytes || 0), 0);
    const totalAllDown = logs.reduce((sum, l) => sum + (l.downloadBytes || 0), 0);
    const totalAllUp = logs.reduce((sum, l) => sum + (l.uploadBytes || 0), 0);
    const todayLog = logs.find((l) => l.date === todayStr);

    const todayDown = todayLog ? todayLog.downloadBytes : currentDownloadBytes;
    const todayUp = todayLog ? todayLog.uploadBytes : currentUploadBytes;
    const todayTotal = todayDown + todayUp;

    const avgDailyBytes = logs.length > 0 ? totalAllBytes / logs.length : 0;

    return {
      totalAllBytes,
      totalAllDown,
      totalAllUp,
      todayDown,
      todayUp,
      todayTotal,
      avgDailyBytes,
      count: logs.length,
      todayLogExists: !!todayLog,
    };
  }, [logs, todayStr, currentDownloadBytes, currentUploadBytes]);

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.date && l.date.length >= 7) {
        set.add(l.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [logs]);

  // Print Report
  const handlePrint = async () => {
    await printElementDocument('daily-network-report-container', {
      title: `تقرير استهلاك وسحب الإنترنت اليومي - ${routerIdentity}`,
    });
  };

  // PDF Export
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf('daily-network-report-container', {
        filename: `daily-internet-consumption-${todayStr}.pdf`,
        title: `تقرير استهلاك وسحب الإنترنت اليومي - ${routerIdentity}`,
        paperFormat: 'a4',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg transition-all ${
            actionFeedback.success
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-red-500/20 text-red-300 border border-red-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Info className="w-5 h-5 text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Consumption */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-teal-400" />
                استهلاك وسحب اليوم ({todayStr})
              </span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                مستمر
              </span>
            </div>
            <div className="my-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white font-mono" dir="ltr">
                {formatBytesToHuman(stats.todayTotal)}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono" dir="ltr">
                <span className="text-emerald-400">↓ {formatBytesToHuman(stats.todayDown)}</span>
                <span>•</span>
                <span className="text-cyan-400">↑ {formatBytesToHuman(stats.todayUp)}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>من 00:00:00 إلى 23:59:59</span>
            {stats.todayLogExists ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> مسجل بالقاعدة
              </span>
            ) : (
              <span className="text-amber-400">قيد التجميع والمزامنة</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Recorded In DB */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                إجمالي السحب المسجل تاريخياً
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {stats.count} يوم
              </span>
            </div>
            <div className="my-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white font-mono" dir="ltr">
                {formatBytesToHuman(stats.totalAllBytes)}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono" dir="ltr">
                <span className="text-emerald-400">↓ {formatBytesToHuman(stats.totalAllDown)}</span>
                <span>•</span>
                <span className="text-cyan-400">↑ {formatBytesToHuman(stats.totalAllUp)}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            مخزّن بشكل دائم في قاعدة البيانات السحابية
          </div>
        </div>

        {/* Card 3: Daily Average */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                متوسط الاستهلاك اليومي
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                معدل عام
              </span>
            </div>
            <div className="my-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white font-mono" dir="ltr">
                {formatBytesToHuman(stats.avgDailyBytes)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                معدل الاستهلاك لكل 24 ساعة
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            حساب تلقائي بناءً على الأيام المكتملة
          </div>
        </div>

        {/* Card 4: Database Link & Auto Tracker Status */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                حالة قاعدة البيانات
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Firestore مرتبطة
              </span>
            </div>
            <div className="my-2 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>المزامنة التلقائية مفعلة 🟢</span>
              </div>
              <p className="text-[11px] text-slate-400">
                تسجيل مستمر بدون تدخل يدوي طوال اليوم
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>آخر جلب للتقرير:</span>
            <span className="font-mono">{lastFetchTime.toLocaleTimeString('ar-SA')}</span>
          </div>
        </div>
      </div>

      {/* Main Report Container */}
      <div
        id="daily-network-report-container"
        className="bg-slate-900/95 p-5 rounded-3xl border border-slate-800 shadow-2xl space-y-5"
      >
        {/* Printable Header (Visible during Print / PDF) */}
        <div className="hidden print:block p-6 border-b border-slate-300 text-slate-900 text-center space-y-2">
          <h1 className="text-xl font-black">تقرير استهلاك وسحب الإنترنت اليومي الرسمي</h1>
          <p className="text-sm">
            اسم الراوتر: {routerIdentity} • تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-SA')}
          </p>
          <div className="flex justify-center gap-6 text-xs font-mono pt-2">
            <span>إجمالي الأيام المسجلة: {stats.count}</span>
            <span>إجمالي البيانات المسحوبة: {formatBytesToHuman(stats.totalAllBytes)}</span>
          </div>
        </div>

        {/* Toolbar Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  تقرير وسجل استهلاك الإنترنت اليومي
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                    {routerIdentity}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  جلب مباشر من قاعدة البيانات السحابية (Firestore) مع حفظ الرفع والتنزيل طوال 24 ساعة
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Scheduled Data Sync Center Trigger */}
            {onOpenDataSync && (
              <button
                id="daily-logs-open-data-sync-btn"
                onClick={onOpenDataSync}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition"
                title="إدارة التزامن التلقائي المجدول للبيانات كل دقيقة وسجل العمليات"
              >
                <RefreshCw className="w-4 h-4" />
                <span>التزامن التلقائي المجدول ⏱️</span>
              </button>
            )}

            {/* Sync from Router Now */}
            <button
              onClick={handleSyncNow}
              disabled={isSyncingNow || !isConnected}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
              title="مزامنة فورية للعدادات الحالية من الراوتر إلى قاعدة البيانات"
            >
              <Zap className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'جارِ المزامنة...' : 'مزامنة الاستهلاك الحالي الآن'}</span>
            </button>

            {/* Reconcile Yesterday & Today */}
            <button
              onClick={handleReconcileYesterdayAndToday}
              disabled={isSyncingNow}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition"
              title="مطابقة وتصحيح استهلاك الأمس واليوم مباشرة من جلسات الراوتر"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'جارِ المطابقة...' : 'مطابقة استهلاك أمس واليوم'}</span>
            </button>

            {/* Fetch Fresh Report from DB */}
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
              title="جلب أحدث تقرير مخزن في قاعدة البيانات"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'جارِ الجلب...' : 'تحديث من قاعدة البيانات'}</span>
            </button>

            {/* Print and Share Modal Trigger */}
            <button
              onClick={() => {
                const todayLog = logs.find((l) => l.date === todayStr);
                setPrintModalData({
                  date: todayLog ? todayLog.date : todayStr,
                  download: todayLog ? todayLog.downloadBytes : currentDownloadBytes,
                  upload: todayLog ? todayLog.uploadBytes : currentUploadBytes,
                  total: todayLog ? todayLog.totalBytes : currentDownloadBytes + currentUploadBytes,
                });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition"
              title="طباعة على مقاسات ورق متعددة (A4، كاشير 80mm، 58mm) ومشاركة عبر واتساب"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ومشاركة الاستهلاك</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
              title="طباعة الجدول الكامل"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>طباعة الكل</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
              title="تصدير كملف PDF"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>PDF</span>
            </button>

            {/* Add Manual Record */}
            <button
              onClick={() => {
                setDate(todayStr);
                setDownBytes(currentDownloadBytes);
                setUpBytes(currentUploadBytes);
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
              title="تسجيل يدوي إضافي"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل يدوي</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 print:hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالتاريخ (مثال: 2026-09)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Month Filter */}
            {availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="all">كل الأشهر ({logs.length} يوم)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    شهر {m}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 transition w-full sm:w-auto justify-center"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedIds.length}) من قاعدة البيانات</span>
            </button>
          )}
        </div>

        {/* Visual Daily Consumption Bar Chart (Past 14 Days) */}
        {logs.length > 0 && (
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 print:hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                مخطط السحب والاستهلاك اليومي المسجل في قاعدة البيانات
              </span>
              <span className="text-[10px] text-slate-400">آخر 14 يوم مسجل</span>
            </div>

            {/* Bars */}
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-2 items-end h-28 border-b border-slate-800 pb-2">
              {logs.slice(0, 14).reverse().map((l) => {
                const maxTotal = Math.max(...logs.slice(0, 14).map((x) => x.totalBytes || 1), 1);
                const heightPercent = Math.min(100, Math.max(12, ((l.totalBytes || 0) / maxTotal) * 100));
                const isToday = l.date === todayStr;

                return (
                  <div
                    key={l.id}
                    className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    title={`${l.date}: إجمالي ${formatBytesToHuman(l.totalBytes)} (تحميل: ${formatBytesToHuman(l.downloadBytes)} | رفع: ${formatBytesToHuman(l.uploadBytes)})`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 border border-slate-700 text-white text-[10px] p-2 rounded-xl shadow-xl z-20 whitespace-nowrap pointer-events-none font-mono">
                      <span className="font-bold text-teal-300">{l.date}</span>
                      <span>إجمالي: {formatBytesToHuman(l.totalBytes)}</span>
                      <span className="text-emerald-400">↓ {formatBytesToHuman(l.downloadBytes)}</span>
                      <span className="text-cyan-400">↑ {formatBytesToHuman(l.uploadBytes)}</span>
                    </div>

                    {/* Bar Container */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all relative overflow-hidden flex flex-col justify-end ${
                        isToday
                          ? 'bg-gradient-to-t from-teal-600 to-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-gradient-to-t from-slate-700 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>

                    {/* Date label */}
                    <span className="text-[9px] font-mono text-slate-400 mt-1 truncate w-full text-center">
                      {l.date.substring(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-12 text-center print:hidden">
                  <input
                    type="checkbox"
                    checked={filteredLogs.length > 0 && selectedIds.length === filteredLogs.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filteredLogs.map((l) => l.id) : [])
                    }
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30"
                  />
                </th>
                <th className="p-3.5">تاريخ اليوم</th>
                <th className="p-3.5">إجمالي التنزيل (Download)</th>
                <th className="p-3.5">إجمالي الرفع (Upload)</th>
                <th className="p-3.5">السحب الكلي (Total)</th>
                <th className="p-3.5">الراوتر المربوط</th>
                <th className="p-3.5">ملاحظات والتزامن</th>
                <th className="p-3.5 text-center print:hidden">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Database className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-300">لا توجد سجلات استهلاك مسجلة حالياً</h4>
                      <p className="text-xs text-slate-500">
                        يقوم النظام حالياً برصد حركة البيانات تلقائياً وتوثيقها في قاعدة البيانات السحابية طوال فترة 00:00:00 إلى 23:59:59. يمكنك أيضاً الضغط على "مزامنة الاستهلاك الحالي الآن" لتسجيل العداد الحالي فوراً.
                      </p>
                      {isConnected && (
                        <button
                          onClick={handleSyncNow}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
                        >
                          مزامنة وحفظ استهلاك اليوم الآن ⚡
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isToday = log.date === todayStr;
                  const isSelected = selectedIds.includes(log.id);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-indigo-950/30' : isToday ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center print:hidden">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(log.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-indigo-300 text-sm">
                            {log.date}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                              اليوم
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Download */}
                      <td className="p-3.5 font-mono text-emerald-400 font-semibold" dir="ltr">
                        {formatBytesToHuman(log.downloadBytes)}
                      </td>

                      {/* Upload */}
                      <td className="p-3.5 font-mono text-cyan-400 font-semibold" dir="ltr">
                        {formatBytesToHuman(log.uploadBytes)}
                      </td>

                      {/* Total */}
                      <td className="p-3.5">
                        <span className="font-bold font-mono text-white text-sm bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700" dir="ltr">
                          {formatBytesToHuman(log.totalBytes)}
                        </span>
                      </td>

                      {/* Router identity */}
                      <td className="p-3.5 text-slate-400 text-xs font-mono">
                        {log.routerIdentity || routerIdentity || '—'}
                      </td>

                      {/* Notes / Sync status */}
                      <td className="p-3.5 text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {log.notes || 'سجل استهلاك موثق بقاعدة البيانات'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setPrintModalData({
                                date: log.date,
                                download: log.downloadBytes,
                                upload: log.uploadBytes,
                                total: log.totalBytes,
                              });
                            }}
                            className="p-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-xl transition"
                            title={`طباعة ومشاركة تقرير استهلاك يوم ${log.date}`}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition"
                            title={`حذف سجل يوم ${log.date}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                تسجيل وحفظ استهلاك يوم في قاعدة البيانات
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  تاريخ اليوم (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    التحميل (بالبايت)
                  </label>
                  <input
                    type="number"
                    value={downBytes}
                    onChange={(e) => setDownBytes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-emerald-400 font-mono text-sm focus:border-emerald-500 outline-none text-left"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    {formatBytesToHuman(downBytes)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    الرفع (بالبايت)
                  </label>
                  <input
                    type="number"
                    value={upBytes}
                    onChange={(e) => setUpBytes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-cyan-400 font-mono text-sm focus:border-cyan-500 outline-none text-left"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    {formatBytesToHuman(upBytes)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={fillFromCurrent}
                className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-bold flex justify-center items-center gap-2 transition border border-indigo-500/20"
              >
                <Activity className="w-4 h-4" />
                تعبئة تلقائية من قراءة الراوتر الحالية
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: استهلاك قبل إعادة تشغيل الراوتر"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex justify-center items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  حفظ السجل في قاعدة البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Advanced Paper Format Print & WhatsApp Share Modal */}
      {printModalData && (
        <DailyUsagePrintModal
          isOpen={!!printModalData}
          onClose={() => setPrintModalData(null)}
          selectedDate={printModalData.date}
          routerIdentity={routerIdentity}
          networkName="سجل استهلاك شبكة المايكروتك"
          dayStats={{
            totalPull: printModalData.total,
            totalDownload: printModalData.download,
            totalUpload: printModalData.upload,
            uniqueUsersCount: activeUsers.length || 0,
            avgPerUser: activeUsers.length > 0 ? Math.round(printModalData.total / activeUsers.length) : 0,
            hourlyPull: [],
            peakHour: {
              hour: 0,
              label: 'حسب السجل',
              download: printModalData.download,
              upload: printModalData.upload,
              total: printModalData.total
            },
            topConsumers: activeUsers.slice(0, 20).map((u) => ({
              user: u.user,
              address: u.address || '',
              macAddress: u.macAddress || '',
              hostName: u.server || '',
              download: u.bytesOut || 0,
              upload: u.bytesIn || 0,
              total: (u.bytesOut || 0) + (u.bytesIn || 0),
              uptime: u.uptime || '',
              server: u.server,
              comment: u.comment
            })),
          }}
        />
      )}
    </div>
  );
};
