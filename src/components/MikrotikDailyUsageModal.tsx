import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  BarChart3,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  HardDrive,
  Users,
  Clock,
  Printer,
  Download,
  Flame,
  Smartphone,
  Laptop,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { MikrotikCallerSession } from '../types';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';

interface MikrotikDailyUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: MikrotikCallerSession[];
  routerIdentity?: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getDeviceIcon = (hostName?: string) => {
  if (!hostName) return <Smartphone size={14} className="text-slate-400" />;
  const lower = hostName.toLowerCase();
  if (
    lower.includes('desktop') ||
    lower.includes('laptop') ||
    lower.includes('pc') ||
    lower.includes('win') ||
    lower.includes('macbook')
  ) {
    return <Laptop size={14} className="text-blue-500" />;
  }
  return <Smartphone size={14} className="text-emerald-500" />;
};

export const MikrotikDailyUsageModal: React.FC<MikrotikDailyUsageModalProps> = ({
  isOpen,
  onClose,
  sessions,
  routerIdentity,
}) => {
  // Selected date (defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isExporting, setIsExporting] = useState(false);
  const [activeHourlyTab, setActiveHourlyTab] = useState<'total' | 'download' | 'upload'>('total');

  // Navigate dates
  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter sessions that were active on the selected day
  const daySessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.loginTime) return false;
      const sessionDay = s.loginTime.split('T')[0];
      return sessionDay === selectedDate;
    });
  }, [sessions, selectedDate]);

  // Aggregate stats for the selected day
  const dayStats = useMemo(() => {
    let totalDownload = 0;
    let totalUpload = 0;
    const userMap = new Map<
      string,
      {
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
      }
    >();

    // 24 hours breakdown: [0..23]
    const hourlyPull = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      download: 0,
      upload: 0,
      total: 0,
    }));

    for (const s of daySessions) {
      const dl = s.downloadBytes || 0;
      const ul = s.uploadBytes || 0;
      const tot = dl + ul;

      totalDownload += dl;
      totalUpload += ul;

      // Group by user for top consumers
      const existing = userMap.get(s.user);
      if (existing) {
        existing.download += dl;
        existing.upload += ul;
        existing.total += tot;
      } else {
        userMap.set(s.user, {
          user: s.user,
          address: s.address,
          macAddress: s.macAddress,
          hostName: s.hostName,
          download: dl,
          upload: ul,
          total: tot,
          uptime: s.uptime,
          server: s.server,
          comment: s.comment,
        });
      }

      // Hour of session login
      const hour = new Date(s.loginTime).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyPull[hour].download += dl;
        hourlyPull[hour].upload += ul;
        hourlyPull[hour].total += tot;
      }
    }

    const totalPull = totalDownload + totalUpload;
    const uniqueUsersCount = userMap.size;
    const avgPerUser = uniqueUsersCount > 0 ? totalPull / uniqueUsersCount : 0;

    // Find peak hour
    let peakHour = hourlyPull[0];
    for (const h of hourlyPull) {
      if (h.total > peakHour.total) {
        peakHour = h;
      }
    }

    // Top consumers sorted descending
    const topConsumers = Array.from(userMap.values()).sort((a, b) => b.total - a.total);

    return {
      totalPull,
      totalDownload,
      totalUpload,
      uniqueUsersCount,
      avgPerUser,
      hourlyPull,
      peakHour,
      topConsumers,
    };
  }, [daySessions]);

  // Comparison with last 7 days trend
  const sevenDaysTrend = useMemo(() => {
    const list: { dateStr: string; label: string; totalBytes: number; isSelected: boolean }[] = [];
    const baseDate = new Date(selectedDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];

      // Sum all sessions for this day
      const dayTotal = sessions
        .filter((s) => s.loginTime && s.loginTime.split('T')[0] === str)
        .reduce((sum, s) => sum + (s.downloadBytes || 0) + (s.uploadBytes || 0), 0);

      const dayLabel = d.toLocaleDateString('ar-SA', { weekday: 'short', month: 'numeric', day: 'numeric' });
      list.push({
        dateStr: str,
        label: dayLabel,
        totalBytes: dayTotal,
        isSelected: str === selectedDate,
      });
    }
    return list;
  }, [sessions, selectedDate]);

  // Max value in hourly pull for scaling the bar chart
  const maxHourlyValue = useMemo(() => {
    const values = dayStats.hourlyPull.map((h) => {
      if (activeHourlyTab === 'download') return h.download;
      if (activeHourlyTab === 'upload') return h.upload;
      return h.total;
    });
    return Math.max(...values, 1024 * 1024); // at least 1MB to avoid / 0
  }, [dayStats.hourlyPull, activeHourlyTab]);

  // Max value in 7-day trend
  const max7DayValue = useMemo(() => {
    const values = sevenDaysTrend.map((d) => d.totalBytes);
    return Math.max(...values, 1024 * 1024);
  }, [sevenDaysTrend]);

  // Export PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf('daily-usage-report-modal', {
        filename: `daily-bandwidth-pull-${selectedDate}.pdf`,
        title: `تقرير السحب والاستهلاك اليومي للإنترنت - ${selectedDate}`,
        paperFormat: 'a4',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    await printElementDocument('daily-usage-report-modal', {
      title: `تقرير السحب والاستهلاك اليومي للإنترنت - ${selectedDate}`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <TrendingUp className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">تقرير الاستهلاك والسحب اليومي للإنترنت</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                  {routerIdentity || 'راوتر مايكروتك'}
                </span>
              </div>
              <p className="text-teal-100 text-xs mt-0.5">
                متابعة مقدار السحب الإجمالي اليومي، ساعات الذروة، وأكثر الكروت استهلاكاً للبيانات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1" id="daily-usage-report-modal">
          {/* Date Selector Navigation Toolbar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => changeDateByDays(-1)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                title="اليوم السابق"
              >
                <ChevronRight size={16} />
              </button>

              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                <Calendar size={16} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-700">اليوم المختار:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => changeDateByDays(1)}
                disabled={selectedDate >= todayStr}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="اليوم التالي"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  selectedDate === todayStr
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                اليوم
              </button>

              <button
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y.toISOString().split('T')[0]);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  selectedDate ===
                  new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                أمس
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1"></div>

              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
              >
                <Download size={13} />
                <span>PDF</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
              >
                <Printer size={13} />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* MAIN DAILY CONSUMPTION HERO CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Daily Pull Hero Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md border border-slate-700 relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                    <Zap size={14} />
                    السحب الإجمالي خلال اليوم الواحد
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                    {selectedDate}
                  </span>
                </div>
                <div className="my-2">
                  <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight" dir="ltr">
                    {formatBytes(dayStats.totalPull)}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إجمالي حركة البيانات المتبادلة (تنزيل + رفع) في هذا اليوم
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
                <span>متوسط استهلاك الكارت:</span>
                <strong className="text-teal-300 font-mono" dir="ltr">
                  {formatBytes(dayStats.avgPerUser)}
                </strong>
              </div>

              {/* Subtle background decorative circle */}
              <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
            </div>

            {/* Download & Upload Breakdown */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-3">تفصيل حركة السحب في اليوم</span>

                {/* Download */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-50/70 border border-blue-100 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <ArrowDownCircle size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">إجمالي التنزيل (Download)</span>
                      <span className="text-[10px] text-blue-600">سحب المستخدمين للإنترنت</span>
                    </div>
                  </div>
                  <span className="text-base font-black text-blue-900 font-mono" dir="ltr">
                    {formatBytes(dayStats.totalDownload)}
                  </span>
                </div>

                {/* Upload */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ArrowUpCircle size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">إجمالي الرفع (Upload)</span>
                      <span className="text-[10px] text-emerald-600">حركة البيانات المرفوعة</span>
                    </div>
                  </div>
                  <span className="text-base font-black text-emerald-900 font-mono" dir="ltr">
                    {formatBytes(dayStats.totalUpload)}
                  </span>
                </div>
              </div>

              {/* Ratio bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                  <span>
                    تنزيل:{' '}
                    {dayStats.totalPull > 0
                      ? Math.round((dayStats.totalDownload / dayStats.totalPull) * 100)
                      : 0}
                    %
                  </span>
                  <span>
                    رفع:{' '}
                    {dayStats.totalPull > 0
                      ? Math.round((dayStats.totalUpload / dayStats.totalPull) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${
                        dayStats.totalPull > 0 ? (dayStats.totalDownload / dayStats.totalPull) * 100 : 0
                      }%`,
                    }}
                  ></div>
                  <div
                    className="bg-emerald-500 h-full"
                    style={{
                      width: `${
                        dayStats.totalPull > 0 ? (dayStats.totalUpload / dayStats.totalPull) * 100 : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Peak Hour & Active Users */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <span className="text-xs font-bold text-slate-500 block">إحصاءات الجلسات والذروة</span>

              <div className="space-y-2.5">
                {/* Active Users on that day */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">الكروت النشطة في اليوم</span>
                      <span className="text-[10px] text-slate-500">مستخدم فريد مسجل</span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {dayStats.uniqueUsersCount}
                  </span>
                </div>

                {/* Peak Hour */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                      <Flame size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">ساعة الذروة (أعلى سحب)</span>
                      <span className="text-[10px] text-amber-700">
                        {dayStats.peakHour ? `${dayStats.peakHour.label} - ${dayStats.peakHour.hour + 1}:00` : '—'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-amber-900 font-mono" dir="ltr">
                    {formatBytes(dayStats.peakHour?.total || 0)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                يتم حساب الإحصائيات مباشرة بناءً على سجلات المتصلين وجلسات الراوتر
              </p>
            </div>
          </div>

          {/* HOURLY DISTRIBUTION TIMELINE (00:00 - 23:00) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-teal-600" />
                  توزيع السحب على مدار ساعات اليوم (24 ساعة)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  تتبع حركة استهلاك الإنترنت في كل ساعة خلال اليوم الواحد لمعرفة أوقات الذروة
                </p>
              </div>

              {/* Filter: Total vs Download vs Upload */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 text-xs">
                <button
                  onClick={() => setActiveHourlyTab('total')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    activeHourlyTab === 'total' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  السحب الكلي
                </button>
                <button
                  onClick={() => setActiveHourlyTab('download')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    activeHourlyTab === 'download' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  التنزيل (RX)
                </button>
                <button
                  onClick={() => setActiveHourlyTab('upload')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    activeHourlyTab === 'upload' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  الرفع (TX)
                </button>
              </div>
            </div>

            {/* Chart Bars */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 sm:gap-1.5 items-end h-40 border-b border-slate-200 pb-2">
                {dayStats.hourlyPull.map((h) => {
                  const val =
                    activeHourlyTab === 'download'
                      ? h.download
                      : activeHourlyTab === 'upload'
                      ? h.upload
                      : h.total;
                  const percent = Math.min(100, Math.round((val / maxHourlyValue) * 100));
                  const isPeak = dayStats.peakHour?.hour === h.hour && val > 0;

                  return (
                    <div
                      key={h.hour}
                      className="flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                        <div className="bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 font-mono whitespace-nowrap shadow-lg">
                          <p className="font-bold border-b border-slate-700 pb-0.5 mb-0.5 text-teal-300">
                            الساعة {h.label}
                          </p>
                          <p>كلي: {formatBytes(h.total)}</p>
                          <p className="text-blue-300">تنزيل: {formatBytes(h.download)}</p>
                          <p className="text-emerald-300">رفع: {formatBytes(h.upload)}</p>
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1"></div>
                      </div>

                      {/* Bar Fill */}
                      <div className="w-full bg-slate-100 rounded-t-sm overflow-hidden h-full flex items-end">
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isPeak
                              ? 'bg-amber-500'
                              : activeHourlyTab === 'download'
                              ? 'bg-blue-500'
                              : activeHourlyTab === 'upload'
                              ? 'bg-emerald-500'
                              : 'bg-teal-600'
                          }`}
                          style={{ height: `${Math.max(percent, val > 0 ? 6 : 2)}%` }}
                        ></div>
                      </div>

                      {/* Hour Label */}
                      <span className="text-[9px] text-slate-400 font-mono mt-1 select-none">
                        {h.hour % 2 === 0 ? h.hour : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                <span>00:00 (منتصف الليل)</span>
                <span>12:00 (الظهيرة)</span>
                <span>23:00 (نهاية اليوم)</span>
              </div>
            </div>
          </div>

          {/* 7-DAY CONSUMPTION TREND COMPARISON */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              مقارنة سحب الأيام السابقة (آخر 7 أيام)
            </h4>
            <p className="text-xs text-slate-500">
              مقارنة استهلاك اليوم المختار بباقي أيام الأسبوع لمعرفة مؤشر النمو في استخدام الإنترنت
            </p>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {sevenDaysTrend.map((d) => {
                const percent = Math.round((d.totalBytes / max7DayValue) * 100);
                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`p-2.5 rounded-2xl text-center border transition flex flex-col items-center justify-between ${
                      d.isSelected
                        ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-500/20'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-slate-700 block">{d.label}</span>
                    <div className="h-14 w-full flex items-end justify-center my-1">
                      <div
                        className={`w-4 rounded-t-md transition-all ${
                          d.isSelected ? 'bg-teal-600' : 'bg-slate-300'
                        }`}
                        style={{ height: `${Math.max(percent, d.totalBytes > 0 ? 8 : 4)}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold block ${
                        d.isSelected ? 'text-teal-800' : 'text-slate-600'
                      }`}
                      dir="ltr"
                    >
                      {formatBytes(d.totalBytes)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOP BANDWIDTH CONSUMERS OF THE DAY TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <HardDrive size={16} className="text-teal-600" />
                  أعلى الكروت والمستخدمين استهلاكاً وسحباً في هذا اليوم
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  قائمة بأكثر المستخدمين سحباً لحجم البيانات خلال يوم {selectedDate}
                </p>
              </div>
              <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                {dayStats.topConsumers.length} كرت نشط
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">الكارت / المستخدم</th>
                    <th className="p-3">نسبة من سحب اليوم</th>
                    <th className="p-3">التنزيل (Download)</th>
                    <th className="p-3">الرفع (Upload)</th>
                    <th className="p-3">إجمالي السحب</th>
                    <th className="p-3">عنوان IP</th>
                    <th className="p-3">مدة الاتصال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dayStats.topConsumers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد بيانات سحب مسجلة في هذا اليوم المختار.
                      </td>
                    </tr>
                  ) : (
                    dayStats.topConsumers.map((item, idx) => {
                      const sharePercent =
                        dayStats.totalPull > 0 ? (item.total / dayStats.totalPull) * 100 : 0;

                      return (
                        <tr key={item.user} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-400 text-center w-8">{idx + 1}</td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(item.hostName)}
                              <span className="font-bold text-slate-900 font-mono">{item.user}</span>
                              {item.hostName && (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {item.hostName}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 w-40">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-teal-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(2, sharePercent))}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 w-9 text-left" dir="ltr">
                                {sharePercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-blue-700" dir="ltr">
                            {formatBytes(item.download)}
                          </td>

                          <td className="p-3 font-mono text-emerald-700" dir="ltr">
                            {formatBytes(item.upload)}
                          </td>

                          <td className="p-3 font-mono font-bold text-slate-900" dir="ltr">
                            {formatBytes(item.total)}
                          </td>

                          <td className="p-3 font-mono text-slate-500">{item.address || '—'}</td>

                          <td className="p-3 font-mono text-slate-500">{item.uptime || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            تاريخ التقرير: <strong className="text-slate-800 font-mono">{selectedDate}</strong> • إجمالي السحب:{' '}
            <strong className="text-teal-700 font-mono font-bold" dir="ltr">
              {formatBytes(dayStats.totalPull)}
            </strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
