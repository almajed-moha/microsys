import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Key,
  Layers,
  Clock,
  HardDrive,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info
} from 'lucide-react';
import {
  UserManagerUser,
  UserManagerProfile,
  MikroTikConfig
} from '../types';
import {
  updateUserManagerUser,
  resetUserManagerUserCounters,
  formatBytesToHuman
} from '../utils/mikrotikApi';

interface UserManagerCardEditModalProps {
  isOpen: boolean;
  user: UserManagerUser | null;
  profiles: UserManagerProfile[];
  config: Partial<MikroTikConfig>;
  onClose: () => void;
  onSaved: (updated: UserManagerUser) => void;
  onResetCounters?: (userId: string, userName: string) => void;
}

export const UserManagerCardEditModal: React.FC<UserManagerCardEditModalProps> = ({
  isOpen,
  user,
  profiles,
  config,
  onClose,
  onSaved,
  onResetCounters
}) => {
  if (!isOpen || !user) return null;

  const [password, setPassword] = useState(user.password || '');
  const [showPassword, setShowPassword] = useState(true);
  const [actualProfile, setActualProfile] = useState(user.actualProfile || (profiles[0]?.name || 'default'));
  const [disabled, setDisabled] = useState(Boolean(user.disabled));
  const [comment, setComment] = useState(user.comment || '');
  const [limitUptime, setLimitUptime] = useState(user.limitUptime || '');
  const [limitBytesMb, setLimitBytesMb] = useState<number>(
    user.limitBytesTotal && user.limitBytesTotal > 0
      ? Math.round(user.limitBytesTotal / (1024 * 1024))
      : 0
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setPassword(user.password || '');
      setActualProfile(user.actualProfile || (profiles[0]?.name || 'default'));
      setDisabled(Boolean(user.disabled));
      setComment(user.comment || '');
      setLimitUptime(user.limitUptime || '');
      setLimitBytesMb(
        user.limitBytesTotal && user.limitBytesTotal > 0
          ? Math.round(user.limitBytesTotal / (1024 * 1024))
          : 0
      );
      setFeedback(null);
    }
  }, [user, profiles]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setFeedback(null);

    const limitBytesTotal = limitBytesMb > 0 ? limitBytesMb * 1024 * 1024 : 0;

    const res = await updateUserManagerUser(config, {
      id: user.id,
      name: user.name,
      password: password.trim(),
      actualProfile,
      disabled,
      comment: comment.trim(),
      limitUptime: limitUptime.trim(),
      limitBytesTotal,
    });

    setIsSaving(false);

    if (res.success) {
      const updated: UserManagerUser = {
        ...user,
        password: password.trim(),
        actualProfile,
        disabled,
        comment: comment.trim(),
        limitUptime: limitUptime.trim(),
        limitBytesTotal,
      };
      setFeedback({ success: true, message: res.message || 'تم تحديث بيانات الكارت في الراوتر بنجاح.' });
      setTimeout(() => {
        onSaved(updated);
        onClose();
      }, 1000);
    } else {
      setFeedback({ success: false, message: res.error || 'تعذر تحديث بيانات الكارت بالراوتر.' });
    }
  };

  const handleReset = async () => {
    if (!user) return;
    if (!confirm(`هل أنت متأكد من تصفير عدادات استهلاك الكارت (${user.name})؟`)) return;

    setIsResetting(true);
    const ok = await resetUserManagerUserCounters(config, user.id || user.name);
    setIsResetting(false);

    if (ok) {
      user.downloadUsed = 0;
      user.uploadUsed = 0;
      user.totalBytes = 0;
      user.uptimeUsed = '0s';
      setFeedback({ success: true, message: 'تم تصفير عدادات الاستهلاك للكارت بنجاح.' });
      if (onResetCounters) {
        onResetCounters(user.id, user.name);
      }
    } else {
      setFeedback({ success: false, message: 'تعذر تصفير عدادات الكارت بالراوتر.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto text-right"
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">تعديل كارت User Manager</h3>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                  {user.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل البروفايل، كلمة المرور، حدود الاستهلاك وحالة التفعيل في الراوتر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stats Banner */}
        <div className="bg-slate-950/50 px-5 py-3 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">الوقت المستهلك</span>
            <span className="font-bold text-white font-mono">{user.uptimeUsed || '0s'}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">البيانات المستهلكة</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatBytesToHuman(user.totalBytes || ((user.downloadUsed || 0) + (user.uploadUsed || 0)))}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">الحد المحدد</span>
            <span className="font-bold text-purple-300 font-mono">
              {user.limitBytesTotal && user.limitBytesTotal > 0 ? formatBytesToHuman(user.limitBytesTotal) : 'غير محدود'}
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
              feedback.success
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[60vh] text-xs">
          {/* Username (Read-Only) */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">اسم الكارت / المستخدم (Username):</label>
            <input
              type="text"
              readOnly
              value={user.name}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-400 font-mono font-bold cursor-not-allowed"
            />
          </div>

          {/* Password / PIN */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">كلمة المرور / الرمز السري (PIN / Password):</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="اتركه فارغاً إذا كان الدخول بالاسم فقط"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white font-mono font-semibold focus:outline-none focus:border-purple-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Profile Select */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>بروفايل اليوزر مانجر (Profile):</span>
              </span>
              <span className="text-[11px] text-purple-400">تغيير البروفايل يغير السرعة والحصة</span>
            </label>
            <select
              value={actualProfile}
              onChange={(e) => setActualProfile(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-purple-500 transition"
            >
              {profiles.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name} {p.nameForUsers ? `— (${p.nameForUsers})` : ''} {p.price ? `[${p.price} ريال]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Toggle (Active / Disabled) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">حالة تفعيل الكارت</span>
              <span className="text-[11px] text-slate-400">
                {disabled ? 'الكارت معطل ولن يتمكن المشترك من الاتصال بالشبكة' : 'الكارت نشط ومتاح للتسجيل والاتصال'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDisabled(!disabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                disabled
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${disabled ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              <span>{disabled ? 'معطل (Disabled)' : 'نشط (Active)'}</span>
            </button>
          </div>

          {/* Comment / Owner / Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>الملاحظات / اسم النقطة أو الزبون (Comment):</span>
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="مثال: بقالة الأمل، أو اسم المشترك..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Limits: Uptime & Bytes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>الحد الأقصى للوقت (Uptime Limit):</span>
              </label>
              <input
                type="text"
                value={limitUptime}
                onChange={(e) => setLimitUptime(e.target.value)}
                placeholder="مثال: 1d أو 3h أو 30m"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500 transition"
              />
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setLimitUptime('1h')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  1h
                </button>
                <button
                  type="button"
                  onClick={() => setLimitUptime('1d')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  1d
                </button>
                <button
                  type="button"
                  onClick={() => setLimitUptime('3d')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  3d
                </button>
                <button
                  type="button"
                  onClick={() => setLimitUptime('')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400"
                >
                  بلا حد
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>حد البيانات الإجمالي (بالميجابايت MB):</span>
              </label>
              <input
                type="number"
                min="0"
                value={limitBytesMb || ''}
                onChange={(e) => setLimitBytesMb(Number(e.target.value) || 0)}
                placeholder="0 = غير محدود"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500 transition"
              />
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => setLimitBytesMb(1024)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  1GB
                </button>
                <button
                  type="button"
                  onClick={() => setLimitBytesMb(3500)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  3.5GB
                </button>
                <button
                  type="button"
                  onClick={() => setLimitBytesMb(5120)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  5GB
                </button>
                <button
                  type="button"
                  onClick={() => setLimitBytesMb(0)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400"
                >
                  مفتوح
                </button>
              </div>
            </div>
          </div>

          {/* Reset Counters Action */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">هل ترغب بتصفير رصيد استهلاك الكارت؟</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-bold transition flex items-center gap-1.5 text-xs"
            >
              {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>تصفير عدادات الاستهلاك</span>
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>حفظ التعديلات في الراوتر</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
