import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  Download,
  TrendingUp,
  Activity,
  HardDrive,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Search,
  ArrowDown,
  ArrowUp,
  Sliders,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import {
  MikroTikConfig,
  UserManagerUser
} from '../types';
import {
  fetchUserManagerDailyReport,
  formatBytesToHuman
} from '../utils/mikrotikApi';

interface UserManagerDailyUsageReportViewProps {
  config: Partial<MikroTikConfig>;
  users: UserManagerUser[];
  onViewCardSessions?: (userName: string) => void;
  onEditCard?: (user: UserManagerUser) => void;
}

export const UserManagerDailyUsageReportView: React.FC<UserManagerDailyUsageReportViewProps> = ({
  config,
  users,
  onViewCardSessions,
  onEditCard
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subView, setSubView] = useState<'cards' | 'sessions'>('cards');
  const [profileFilter, setProfileFilter] = useState('all');

  const loadDailyReport = async (dateToFetch?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    const target = dateToFetch || selectedDate;
    const res = await fetchUserManagerDailyReport(config, target);
    setIsLoading(false);

    if (res.success && res.data) {
      setReportData(res.data);
    } else {
      setErrorMsg(res.error || 'تعذر جلب تقرير السحب اليومي من الراوتر');
    }
  };

  useEffect(() => {
    loadDailyReport(selectedDate);
  }, [selectedDate]);

  const summary = reportData?.summary || {
    totalWanBytes: 0,
    wanDownloadBytes: 0,
    wanUploadBytes: 0,
    totalCardsBytes: 0,
    cardsDownloadBytes: 0,
    cardsUploadBytes: 0,
    overheadBytes: 0,
    matchPercentage: 100,
    activeCardsNow: 0,
    totalActiveCardsToday: 0,
    totalSessionsToday: 0,
    wanInterfaceName: 'WAN',
  };

  const cardsUsage: any[] = reportData?.cardsUsage || [];
  const sessions: any[] = reportData?.sessions || [];

  // Profiles list for filter
  const uniqueProfiles = Array.from(new Set(cardsUsage.map((c) => c.profile).filter(Boolean)));

  const filteredCards = cardsUsage.filter((c) => {
    const q = (searchQuery || '').toLowerCase();
    const matchSearch =
      c.user.toLowerCase().includes(q) ||
      (c.comment && c.comment.toLowerCase().includes(q)) ||
      (c.profile && c.profile.toLowerCase().includes(q));
    const matchProfile = profileFilter === 'all' || c.profile === profileFilter;
    return matchSearch && matchProfile;
  });

  const filteredSessions = sessions.filter((s) => {
    const q = (searchQuery || '').toLowerCase();
    return (
      (s.user && s.user.toLowerCase().includes(q)) ||
      (s.userIp && s.userIp.toLowerCase().includes(q)) ||
      (s.userMac && s.userMac.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    if (subView === 'cards') {
      const headers = ['الترتيب', 'اسم الكارت', 'البروفايل', 'الملاحظات', 'عدد الجلسات', 'التحميل (Download)', 'الرفع (Upload)', 'إجمالي السحب', 'متصل الآن'];
      const rows = filteredCards.map((c, i) => [
        i + 1,
        c.user,
        c.profile || '',
        c.comment || '',
        c.sessionsCount,
        formatBytesToHuman(c.downloadBytes),
        formatBytesToHuman(c.uploadBytes),
        formatBytesToHuman(c.totalBytes),
        c.isActiveNow ? 'نعم' : 'لا',
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UM_Daily_Cards_Report_${selectedDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['المعرف', 'اسم الكارت', 'بدء الجلسة', 'انتهاء الجلسة', 'المدة', 'التحميل', 'الرفع', 'الإجمالي', 'عنوان IP', 'الماك MAC', 'سبب الإنهاء'];
      const rows = filteredSessions.map((s) => [
        s.id,
        s.user,
        s.fromTime || '',
        s.tillTime || (s.active ? 'متصل الآن' : ''),
        s.uptime || '',
        formatBytesToHuman(s.download || 0),
        formatBytesToHuman(s.upload || 0),
        formatBytesToHuman(s.totalBytes || 0),
        s.userIp || '',
        s.userMac || '',
        s.terminateCause || '',
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `UM_Daily_Sessions_${selectedDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const setDateShortcut = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-5 text-right" style={{ direction: 'rtl' }}>
      {/* Header & Date Selector */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تقرير السحب اليومي وتدقيق الـ WAN</span>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-xs font-mono font-bold border border-purple-500/30">
                  User Manager Audit
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مطابقة دقيقة بين سحب الراوتر الإجمالي من مزود الخدمة (WAN) وسحب كل كارت مسجل باليوزر مانجر
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDateShortcut(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDate === todayStr ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateShortcut(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition"
            >
              الأمس
            </button>
            <button
              onClick={() => setDateShortcut(2)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition hidden sm:inline-block"
            >
              قبل يومين
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <button
            onClick={() => loadDailyReport(selectedDate)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={cardsUsage.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Reconciliation Card (ISP WAN vs Cards Usage) */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 border border-purple-900/40 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left / Stats side */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  مقارنة السحب الفعلي ليوم ({selectedDate})
                </span>
              </div>
              <span className="text-[11px] text-purple-300 font-mono bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                منفذ المزود: {summary.wanInterfaceName}
              </span>
            </div>

            {/* Reconciliation Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>سحب كروت اليوزر مانجر:</span>
                  <span className="text-emerald-400 font-mono text-sm font-extrabold">
                    {formatBytesToHuman(summary.totalCardsBytes)}
                  </span>
                </span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>سحب مزود الخدمة (WAN):</span>
                  <span className="text-white font-mono text-sm font-extrabold">
                    {formatBytesToHuman(summary.totalWanBytes)}
                  </span>
                </span>
              </div>

              {/* Visual meter */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.matchPercentage)}%` }}
                  title={`سحب الكروت: ${formatBytesToHuman(summary.totalCardsBytes)} (${summary.matchPercentage}%)`}
                />
                <div
                  className="h-full bg-amber-500/60 rounded-r-full transition-all duration-500"
                  style={{ width: `${Math.max(0, 100 - summary.matchPercentage)}%` }}
                  title={`استهلاك الشبكة والنظام: ${formatBytesToHuman(summary.overheadBytes)}`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>مطابقة بيانات الكروت: {summary.matchPercentage}% من إجمالي خط المزود</span>
                </span>
                <span className="text-amber-400/90 font-mono">
                  فارق الشبكة والمودم (Overhead): {formatBytesToHuman(summary.overheadBytes)}
                </span>
              </div>
            </div>

            {/* Reconciled Sub-counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-cyan-400" />
                  <span>تنزيل الكروت</span>
                </span>
                <span className="text-sm font-bold text-cyan-300 font-mono mt-0.5 block">
                  {formatBytesToHuman(summary.cardsDownloadBytes)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-indigo-400" />
                  <span>رفع الكروت</span>
                </span>
                <span className="text-sm font-bold text-indigo-300 font-mono mt-0.5 block">
                  {formatBytesToHuman(summary.cardsUploadBytes)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-400" />
                  <span>كروت سحبت اليوم</span>
                </span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {summary.totalActiveCardsToday} كارت
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>متصلون الآن</span>
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                  {summary.activeCardsNow} كارت نشط
                </span>
              </div>
            </div>
          </div>

          {/* Right / Explanation & Insight Side */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950/80 border border-purple-500/20 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Info className="w-4 h-4 text-purple-400" />
              <span>لماذا يختلف سحب المزود عن سحب الكروت؟</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. **ترويسات الحزم (Packet Headers & Protocols)**: سحب المزود بالراوتر يقيس الحزم الفيزيائية كاملة (Layer 2 & 3)، بينما اليوزر مانجر يحسب حمولة البيانات الصافية (Payload) لكل كارت.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              2. **حركة النظام والمودم (Background Traffic)**: استعلامات الـ DNS، ومزامنة الوقت NTP، والتحديثات وحركة الراوتر نفسه تسحب من الـ WAN بدون تسجيلها على كروت المشتركين.
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>إجمالي الجلسات اليوم: {summary.totalSessionsToday}</span>
              <span className="text-emerald-400">حالة المطابقة: ممتازة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-view Switcher & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setSubView('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
              subView === 'cards'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>كروت المشتركين اليوم ({filteredCards.length})</span>
          </button>

          <button
            onClick={() => setSubView('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial ${
              subView === 'sessions'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل جلسات اليوم ({filteredSessions.length})</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الكارت أو البروفايل أو الملاحظات..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {subView === 'cards' && uniqueProfiles.length > 0 && (
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 transition"
            >
              <option value="all">كل البروفايلات</option>
              {uniqueProfiles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      {subView === 'cards' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-white">ترتيب الكروت الأكثر استهلاكاً ليوم ({selectedDate})</span>
            <span>عدد الكروت المطابقة: {filteredCards.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">اسم الكارت (Username)</th>
                  <th className="p-3.5">البروفايل</th>
                  <th className="p-3.5">عدد الجلسات اليوم</th>
                  <th className="p-3.5">التحميل (Download)</th>
                  <th className="p-3.5">الرفع (Upload)</th>
                  <th className="p-3.5">إجمالي السحب اليومي</th>
                  <th className="p-3.5">نسبة السحب من خط المزود</th>
                  <th className="p-3.5">الحالة الآن</th>
                  <th className="p-3.5 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                        <span>جارِ جلب وتدقيق استهلاك كروت اليوزر مانجر...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-500">
                      لم يتم تسجيل أي استهلاك للكروت في هذا التاريخ ({selectedDate}).
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((c, idx) => {
                    const percentOfWan = summary.totalWanBytes > 0
                      ? Math.min(100, Math.round((c.totalBytes / summary.totalWanBytes) * 100 * 10) / 10)
                      : 0;

                    const matchingUser = users.find((u) => u.name === c.user);

                    return (
                      <tr key={`card-usage-${c.user}-${idx}`} className="hover:bg-slate-800/50 transition">
                        <td className="p-3.5 font-mono text-slate-400">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-white text-sm">{c.user}</div>
                          {c.comment && (
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{c.comment}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-purple-300 font-semibold text-[11px] border border-slate-700/80">
                            {c.profile || 'افتراضي'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {c.sessionsCount} {c.sessionsCount === 1 ? 'جلسة' : 'جلسات'}
                        </td>
                        <td className="p-3.5 font-mono text-cyan-300 font-semibold">
                          {formatBytesToHuman(c.downloadBytes)}
                        </td>
                        <td className="p-3.5 font-mono text-indigo-300">
                          {formatBytesToHuman(c.uploadBytes)}
                        </td>
                        <td className="p-3.5 font-mono font-extrabold text-emerald-400 text-sm">
                          {formatBytesToHuman(c.totalBytes)}
                        </td>
                        <td className="p-3.5">
                          <div className="w-28 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-white font-bold">{percentOfWan}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full"
                                style={{ width: `${Math.min(100, percentOfWan * 3)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {c.isActiveNow ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>متصل الآن</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                              غير متصل
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onViewCardSessions && (
                              <button
                                onClick={() => onViewCardSessions(c.user)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition flex items-center gap-1"
                                title="عرض جلسات الكارت"
                              >
                                <Activity className="w-3 h-3" />
                                <span>الجلسات</span>
                              </button>
                            )}
                            {onEditCard && matchingUser && (
                              <button
                                onClick={() => onEditCard(matchingUser)}
                                className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition"
                                title="تعديل الكارت والبروفايل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      ) : (
        /* Sessions Table */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-white">سجل جميع جلسات الاتصال المنفذة في ({selectedDate})</span>
            <span>عدد الجلسات: {filteredSessions.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <th className="p-3">#</th>
                  <th className="p-3">اسم الكارت</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">وقت البدء</th>
                  <th className="p-3">وقت الانتهاء</th>
                  <th className="p-3">مدة الجلسة</th>
                  <th className="p-3">تنزيل (Download)</th>
                  <th className="p-3">رفع (Upload)</th>
                  <th className="p-3">إجمالي الجلسة</th>
                  <th className="p-3">عنوان IP / MAC</th>
                  <th className="p-3">سبب الانفصال</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                        <span>جارِ جلب سجل الجلسات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-500">
                      لا توجد جلسات مسجلة في هذا التاريخ.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s, idx) => (
                    <tr key={s.id || `sess-day-${idx}`} className="hover:bg-slate-800/50 transition">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-white">{s.user}</td>
                      <td className="p-3">
                        {s.active ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>متصل الآن</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                            منتهية
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-white text-[11px]">
                        {s.fromTime ? new Date(s.fromTime).toLocaleTimeString('ar-EG') : '—'}
                      </td>
                      <td className="p-3 font-mono text-slate-300 text-[11px]">
                        {s.active ? (
                          <span className="text-emerald-400 font-bold">متصل الآن</span>
                        ) : s.tillTime ? (
                          new Date(s.tillTime).toLocaleTimeString('ar-EG')
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">{s.uptime || '0s'}</td>
                      <td className="p-3 font-mono text-cyan-300">{formatBytesToHuman(s.download || 0)}</td>
                      <td className="p-3 font-mono text-indigo-300">{formatBytesToHuman(s.upload || 0)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {formatBytesToHuman(s.totalBytes || (s.download || 0) + (s.upload || 0))}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <div className="text-white">{s.userIp || '—'}</div>
                        <div className="text-slate-500 text-[10px]">{s.userMac || '—'}</div>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {s.terminateCause || (s.active ? 'نشط' : '—')}
                      </td>
                      <td className="p-3 text-center">
                        {onViewCardSessions && (
                          <button
                            onClick={() => onViewCardSessions(s.user)}
                            className="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition"
                            title="عرض كامل سجلات هذا الكارت"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
