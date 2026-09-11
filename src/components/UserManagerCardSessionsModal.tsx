import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  HardDrive,
  Wifi,
  Calendar,
  RefreshCw,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers
} from 'lucide-react';
import {
  UserManagerUser,
  UserManagerSession,
  MikroTikConfig
} from '../types';
import {
  fetchUserManagerSessions,
  formatBytesToHuman
} from '../utils/mikrotikApi';

interface UserManagerCardSessionsModalProps {
  isOpen: boolean;
  user: UserManagerUser | null;
  config: Partial<MikroTikConfig>;
  onClose: () => void;
  onEditProfile?: (user: UserManagerUser) => void;
}

export const UserManagerCardSessionsModal: React.FC<UserManagerCardSessionsModalProps> = ({
  isOpen,
  user,
  config,
  onClose,
  onEditProfile
}) => {
  if (!isOpen || !user) return null;

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await fetchUserManagerSessions(config, user.name);
    setSessions(data);
    setIsLoading(false);
    setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
  };

  useEffect(() => {
    if (isOpen && user) {
      loadSessions();
    }
  }, [isOpen, user?.name]);

  const filteredSessions = sessions.filter((s) => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (s.userIp && s.userIp.toLowerCase().includes(q)) ||
      (s.userMac && s.userMac.toLowerCase().includes(q)) ||
      (s.fromTime && s.fromTime.toLowerCase().includes(q)) ||
      (s.terminateCause && s.terminateCause.toLowerCase().includes(q))
    );
  });

  // Calculate session totals
  const totalSessionDownload = sessions.reduce((acc, s) => acc + (s.download || 0), 0);
  const totalSessionUpload = sessions.reduce((acc, s) => acc + (s.upload || 0), 0);
  const totalSessionBytes = totalSessionDownload + totalSessionUpload;
  const activeSession = sessions.find((s) => s.active);

  const handleExportCsv = () => {
    if (sessions.length === 0) return;
    const headers = ['المعرف', 'المستخدم', 'الحالة', 'بدء الجلسة', 'نهاية الجلسة', 'المدة', 'التحميل (بايت)', 'الرفع (بايت)', 'الإجمالي (بايت)', 'عنوان IP', 'الماك MAC', 'سبب الإنهاء'];
    const rows = sessions.map((s) => [
      s.id,
      s.user,
      s.active ? 'نشطة' : 'منتهية',
      s.fromTime || '',
      s.tillTime || '',
      s.uptime || '',
      s.download || 0,
      s.upload || 0,
      s.totalBytes || 0,
      s.userIp || '',
      s.userMac || '',
      s.terminateCause || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sessions_${user.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto text-right"
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">جلسات وإحصائيات الكارت</h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                  {user.name}
                </span>
                {user.actualProfile && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold">
                    بروفايل: {user.actualProfile}
                  </span>
                )}
                {activeSession && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متصل الآن</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل الاتصالات، سحب البيانات لكل جلسة، وعناوين الـ IP والـ MAC المسجلة في User Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSessions}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="تحديث الجلسات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Lifetime Stats Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span>إجمالي السحب التاريخي</span>
            </div>
            <div className="text-base font-extrabold text-white font-mono">
              {formatBytesToHuman(user.totalBytes || ((user.downloadUsed || 0) + (user.uploadUsed || 0)))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              تنزيل: {formatBytesToHuman(user.downloadUsed || 0)} | رفع: {formatBytesToHuman(user.uploadUsed || 0)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>الوقت المستهلك الكلي</span>
            </div>
            <div className="text-base font-extrabold text-amber-300 font-mono">
              {user.uptimeUsed || '0s'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              الحد: {user.limitUptime || 'غير محدد'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>عدد الجلسات المسجلة</span>
            </div>
            <div className="text-base font-extrabold text-cyan-300 font-mono">
              {sessions.length} جلسة
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              سحب الجلسات: {formatBytesToHuman(totalSessionBytes)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>حالة الاتصال الفعلي</span>
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              {activeSession ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">متصل (IP: {activeSession.userIp || 'مخصص'})</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">غير متصل حالياً</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              الماك: {activeSession?.userMac || (sessions[0]?.userMac ? sessions[0].userMac : 'لم يسجل بعد')}
            </div>
          </div>
        </div>

        {/* Sessions Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالـ IP أو MAC أو التاريخ..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCsv}
              disabled={sessions.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>تصدير Excel/CSV</span>
            </button>
            {onEditProfile && (
              <button
                onClick={() => {
                  onClose();
                  onEditProfile(user);
                }}
                className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>تعديل البروفايل والكارت</span>
              </button>
            )}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span>جارِ جلب وتدقيق سجل جلسات الكارت من الراوتر...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-8 h-8 text-slate-500" />
              <span className="font-bold text-slate-300">لا توجد جلسات مسجلة لهذا الكارت حالياً</span>
              <p className="text-xs text-slate-500 max-w-md">
                قد يكون الكارت جديداً ولم يقم المشترك بالدخول به بعد، أو تم مسح سجل الجلسات في الراوتر.
                عدادات الاستهلاك الإجمالية المسجلة في الراوتر: {formatBytesToHuman(user.totalBytes || 0)}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">#</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">بدء الجلسة</th>
                    <th className="p-3">انتهاء الجلسة</th>
                    <th className="p-3">مدة الاتصال</th>
                    <th className="p-3">التحميل (Download)</th>
                    <th className="p-3">الرفع (Upload)</th>
                    <th className="p-3">إجمالي الجلسة</th>
                    <th className="p-3">عنوان IP / MAC</th>
                    <th className="p-3">سبب الانفصال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {filteredSessions.map((s, idx) => (
                    <tr
                      key={s.id || `sess-${idx}`}
                      className={`hover:bg-slate-800/50 transition ${
                        s.active ? 'bg-emerald-950/20 border-r-2 border-emerald-500' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        {s.active ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>نشطة الآن</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                            منتهية
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-white text-[11px]">
                        {s.fromTime ? new Date(s.fromTime).toLocaleString('ar-EG') : 'غير مسجل'}
                      </td>
                      <td className="p-3 font-mono text-slate-300 text-[11px]">
                        {s.active ? (
                          <span className="text-emerald-400 font-bold">متصل الآن</span>
                        ) : s.tillTime ? (
                          new Date(s.tillTime).toLocaleString('ar-EG')
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
                        {s.terminateCause ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                            {s.terminateCause}
                          </span>
                        ) : s.active ? (
                          <span className="text-emerald-400 text-[10px]">اتصال جارٍ...</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div>
            آخر تحديث: {lastRefreshed || 'الآن'} | عدد الجلسات المعروضة: {filteredSessions.length}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
