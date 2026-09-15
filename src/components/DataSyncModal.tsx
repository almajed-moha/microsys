import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Wifi,
  HardDrive,
  Play,
  Pause,
  X,
  Sparkles,
  ShieldCheck,
  Trash2,
  ArrowDown,
  ArrowUp,
  Activity,
  Zap,
} from 'lucide-react';
import { GlobalNetworkSyncResult } from '../hooks/useGlobalNetworkUsageSync';
import { formatBytesToHuman } from '../utils/mikrotikApi';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sync: GlobalNetworkSyncResult;
  routerHost?: string;
  routerIdentity?: string;
}

const INTERVAL_OPTIONS = [
  { label: '30 ثانية (فائق السرعة)', value: 30 },
  { label: '1 دقيقة (موصى به)', value: 60 },
  { label: '2 دقيقة', value: 120 },
  { label: '5 دقائق', value: 300 },
];

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  isOpen,
  onClose,
  sync,
  routerHost = 'غير متصل',
  routerIdentity = 'الراوتر الرئيسي',
}) => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setFeedback(null);
    const res = await sync.syncNow();
    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'تمت المزامنة وحفظ استهلاك البيانات بنجاح في قاعدة البيانات' });
    } else {
      setFeedback({ type: 'error', message: res.message || 'تعذر استكمال المزامنة' });
    }
  };

  const handleDeepReconcile = async () => {
    setFeedback(null);
    const res = await sync.reconcileYesterdayAndToday();
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message || 'تعذر مطابقة الاستهلاك' });
    }
  };

  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(((sync.intervalSeconds - sync.countdownSeconds) / sync.intervalSeconds) * 100))
  );

  return (
    <div
      id="data-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div
        id="data-sync-modal-container"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <RefreshCw className={`w-5 h-5 ${sync.isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  التزامن التلقائي المجدول للبيانات (Data Sync)
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    sync.isEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sync.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {sync.isEnabled ? `مجدول كل ${sync.intervalSeconds} ثانية` : 'التزامن التلقائي متوقف'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مزامنة دورية في الخلفية كل دقيقة لتحديث استهلاك اليوم وأمس في قاعدة البيانات تلقائياً
              </p>
            </div>
          </div>

          <button
            id="close-data-sync-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Action & Feedback Notification */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-sm animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div className="flex-1 font-medium">{feedback.message}</div>
              <button
                onClick={() => setFeedback(null)}
                className="text-xs text-slate-400 hover:text-white underline ml-2"
              >
                تجاهل
              </button>
            </div>
          )}

          {/* Quick Control Bar */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Toggle Enable/Disable */}
            <div className="flex items-center gap-3">
              <button
                id="toggle-data-sync-state-btn"
                type="button"
                onClick={() => sync.setIsEnabled(!sync.isEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  sync.isEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    sync.isEnabled ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  {sync.isEnabled ? <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{sync.isEnabled ? 'التزامن التلقائي قيد التشغيل' : 'التزامن التلقائي متوقف مؤقتاً'}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {sync.isEnabled
                    ? 'يتم جلب البيانات وتحديث قاعدة البيانات بالخلفية بدون تدخل منك'
                    : 'يمكنك تشغيله في أي وقت للمزامنة الدورية المستمرة'}
                </div>
              </div>
            </div>

            {/* Interval Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">دورة التكرار:</span>
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700/70">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => sync.setIntervalSeconds(opt.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      sync.intervalSeconds === opt.value
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {opt.value === 60 ? 'دقيقة (60ث)' : `${opt.value}ث`}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Sync Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="manual-sync-now-btn"
                disabled={sync.isSyncing}
                onClick={handleManualSync}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sync.isSyncing ? 'animate-spin' : ''}`} />
                <span>{sync.isSyncing ? 'جارٍ المزامنة...' : 'مزامنة فورية الآن'}</span>
              </button>

              <button
                id="deep-reconcile-btn"
                disabled={sync.isSyncing}
                onClick={handleDeepReconcile}
                title="فحص عميق لجلسات User Manager لمطابقة استهلاك أمس واليوم"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-600/80 text-xs font-semibold rounded-xl transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>مطابقة أمس واليوم</span>
              </button>
            </div>
          </div>

          {/* Top 2 Cards: Scheduler Countdown + Today's Log Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Scheduler & Live Status */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>مؤقت الجدولة بالثواني</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    الدورات: {sync.cycleCount}
                  </span>
                </div>

                {/* Big Timer Ticker */}
                <div className="flex items-center justify-between p-4 bg-slate-900/80 rounded-xl border border-slate-700/50 mb-3">
                  <div>
                    <div className="text-xs text-slate-400">المزامنة القادمة بعد</div>
                    <div className="text-3xl font-black font-mono text-cyan-400 tracking-tight flex items-baseline gap-1 mt-0.5">
                      <span>{sync.isEnabled ? sync.countdownSeconds : '--'}</span>
                      <span className="text-sm font-medium text-slate-400">ثانية</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-slate-400">حالة الاتصال</div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-1">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>{routerIdentity || routerHost}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${sync.isEnabled ? progressPercent : 0}%` }}
                  />
                </div>
              </div>

              {/* Status footer */}
              <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between">
                  <span>آخر مزامنة ناجحة:</span>
                  <span className="font-mono text-slate-200">
                    {sync.lastSyncedAt
                      ? sync.lastSyncedAt.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'لم تتم بعد'}
                  </span>
                </div>
                {sync.syncStatusMessage && (
                  <div className="text-slate-300 text-[11px] truncate" title={sync.syncStatusMessage}>
                    الحالة: {sync.syncStatusMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Today's Registered Consumption in Database */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>استهلاك اليوم في قاعدة البيانات (Firestore)</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded font-mono">
                    {sync.todayLog?.date || 'اليوم'}
                  </span>
                </div>

                {/* Total Traffic Box */}
                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/50 mb-3">
                  <div className="text-xs text-slate-400">إجمالي استهلاك الشبكة المسجل اليوم</div>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5" dir="ltr">
                    {formatBytesToHuman(sync.todayLog?.totalBytes || 0)}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-300 font-mono" dir="ltr">
                    <span className="flex items-center gap-1 text-cyan-300">
                      <ArrowDown className="w-3.5 h-3.5" />
                      {formatBytesToHuman(sync.todayLog?.downloadBytes || 0)} تحميل
                    </span>
                    <span className="flex items-center gap-1 text-indigo-300">
                      <ArrowUp className="w-3.5 h-3.5" />
                      {formatBytesToHuman(sync.todayLog?.uploadBytes || 0)} رفع
                    </span>
                  </div>
                </div>
              </div>

              {/* Log details */}
              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between">
                  <span>الكروت النشطة المرصودة:</span>
                  <span className="font-bold text-slate-200 font-mono">
                    {sync.todayLog?.activeUsersCount || 0} كرت
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>آخر تحديث لقاعدة البيانات:</span>
                  <span className="font-mono text-slate-200">
                    {sync.todayLog?.lastUpdated
                      ? new Date(sync.todayLog.lastUpdated).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                      : 'اليوم'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sync History Table / Activity Log */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>سجل عمليات المزامنة الأخيرة (Data Sync Log)</span>
              </div>
              {sync.syncHistory.length > 0 && (
                <button
                  onClick={sync.clearSyncHistory}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح السجل</span>
                </button>
              )}
            </div>

            {sync.syncHistory.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
                سيبدأ تسجيل العمليات تلقائياً مع كل دقيقة تمر بمجرد بدء التزامن.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5">الوقت</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">الكروت النشطة</th>
                      <th className="p-2.5">البيانات المضافة</th>
                      <th className="p-2.5">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                    {sync.syncHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-slate-300">{item.timestamp}</td>
                        <td className="p-2.5">
                          {item.type === 'auto' && (
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[11px]">
                              تلقائي (1د)
                            </span>
                          )}
                          {item.type === 'manual' && (
                            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[11px]">
                              يدوي
                            </span>
                          )}
                          {item.type === 'reconcile' && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[11px]">
                              مطابقة عميقة
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {item.success ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ناجح
                            </span>
                          ) : (
                            <span className="text-rose-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> خطأ
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-300">
                          {item.activeUsersCount} كرت
                        </td>
                        <td className="p-2.5 font-mono text-emerald-400" dir="ltr">
                          {item.totalAddedBytes > 0 ? `+${formatBytesToHuman(item.totalAddedBytes)}` : 'مستقر'}
                        </td>
                        <td className="p-2.5 text-slate-400 truncate max-w-xs" title={item.message}>
                          {item.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Guarantees and Architecture Notes */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-300">
              <div className="font-bold text-white">ضمان دقة القراءات اليومية:</div>
              <p className="text-slate-400 leading-relaxed">
                تقوم هذه الخدمة بجلب تحديثات الكروت المتصلة من المايكروتك كل دقيقة في الخلفية وحساب الفروقات التراكمية (Deltas) لمنع تكرار أو تصفير استهلاك اليوم. كما يتم الاحتفاظ بسجل تفصيلي في قاعدة بيانات Firestore السحابية حتى لو تم إغلاق المتصفح أو إعادة تشغيل الراوتر.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-500 font-mono">
            Firestore Collection: <span className="text-slate-400">network_daily_logs</span>
          </div>
          <button
            id="close-data-sync-footer-btn"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
