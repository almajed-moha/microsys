import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CreditCard,
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
  Info,
  CheckCheck,
  Hourglass,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import {
  UserManagerUser,
  UserManagerProfile,
  MikroTikConfig,
  UserAssignedProfile,
  UserProfilesSummary
} from '../types';
import {
  updateUserManagerUser,
  resetUserManagerUserCounters,
  assignProfileToUserManagerUser,
  fetchUserAssignedProfiles,
  removeUserAssignedProfile,
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
  const [password, setPassword] = useState(user?.password || '');
  const [showPassword, setShowPassword] = useState(true);
  const [actualProfile, setActualProfile] = useState(user?.actualProfile || (profiles[0]?.name || 'default'));
  const [disabled, setDisabled] = useState(Boolean(user?.disabled));
  const [comment, setComment] = useState(user?.comment || '');
  const [limitUptime, setLimitUptime] = useState(user?.limitUptime || '');
  const [limitBytesMb, setLimitBytesMb] = useState<number>(
    user?.limitBytesTotal && user.limitBytesTotal > 0
      ? Math.round(user.limitBytesTotal / (1024 * 1024))
      : 0
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Assigned Profiles & Queue State
  const [assignedProfiles, setAssignedProfiles] = useState<UserAssignedProfile[]>(user?.assignedProfiles || []);
  const [profilesSummary, setProfilesSummary] = useState<UserProfilesSummary>(
    user?.profilesCount || {
      total: (user?.assignedProfiles || []).length,
      used: (user?.assignedProfiles || []).filter(p => p.state === 'used' || p.state === 'expired').length,
      waiting: (user?.assignedProfiles || []).filter(p => p.state === 'waiting' || p.state === 'unused').length,
      active: (user?.assignedProfiles || []).filter(p => p.state === 'active' || p.state === 'running').length,
    }
  );
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isRemovingProfileId, setIsRemovingProfileId] = useState<string | null>(null);
  const [showProfilesDetails, setShowProfilesDetails] = useState(true);

  // Load user assigned profiles from router
  const loadAssignedProfiles = useCallback(async (username: string) => {
    if (!username) return;
    setIsLoadingProfiles(true);
    try {
      const res = await fetchUserAssignedProfiles(config, username);
      if (res.success) {
        setAssignedProfiles(res.profiles);
        setProfilesSummary(res.summary);
      }
    } catch (err) {
      console.warn('Failed to load user assigned profiles:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [config]);

  // Sync state when user prop changes
  useEffect(() => {
    if (user && isOpen) {
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

      // Initialize profiles state
      if (user.assignedProfiles && user.assignedProfiles.length > 0) {
        setAssignedProfiles(user.assignedProfiles);
      }
      if (user.profilesCount) {
        setProfilesSummary(user.profilesCount);
      }

      // Fetch fresh live profiles from router
      loadAssignedProfiles(user.name);
    }
  }, [user, isOpen, profiles, loadAssignedProfiles]);

  const handleAssignProfile = async () => {
    if (!user || !actualProfile) return;
    const hasActive = profilesSummary.active > 0;
    const confirmMessage = hasActive
      ? `الكارت (${user.name}) لديه باقة نشطة حالياً. هل تريد إضافة باقة (${actualProfile}) كباقة قيد الانتظار (Waiting Queue)؟ ستتفعّل تلقائياً فور انتهاء الباقة النشطة.`
      : `هل أنت متأكد من إضافة وتفعيل الباقة (${actualProfile}) للكارت (${user.name})؟`;

    if (!confirm(confirmMessage)) return;

    setIsAssigning(true);
    setFeedback(null);

    const ok = await assignProfileToUserManagerUser(config, user.name, actualProfile);
    setIsAssigning(false);

    if (ok) {
      setFeedback({
        success: true,
        message: hasActive
          ? `تمت إضافة الباقة (${actualProfile}) بنجاح إلى قائمة الانتظار (Waiting) للكارت.`
          : `تمت إضافة وتفعيل الباقة (${actualProfile}) بنجاح للكارت.`,
      });
      // Refresh live profiles list
      loadAssignedProfiles(user.name);
    } else {
      setFeedback({ success: false, message: 'تعذر إضافة الباقة للكارت بالراوتر.' });
    }
  };

  const handleRemoveWaitingProfile = async (profileId: string, profileName: string) => {
    if (!user) return;
    if (!confirm(`هل أنت متأكد من إلغاء وحذف الباقة (${profileName}) من قائمة انتظار الكارت (${user.name})؟`)) {
      return;
    }

    setIsRemovingProfileId(profileId);
    const ok = await removeUserAssignedProfile(config, profileId);
    setIsRemovingProfileId(null);

    if (ok) {
      setFeedback({
        success: true,
        message: `تم إلغاء الباقة (${profileName}) من قائمة الانتظار بنجاح.`,
      });
      loadAssignedProfiles(user.name);
    } else {
      setFeedback({ success: false, message: 'تعذر حذف الباقة من الراوتر.' });
    }
  };

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
        assignedProfiles,
        profilesCount: profilesSummary,
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

  if (!isOpen || !user) return null;

  const activeProfileItem = assignedProfiles.find(p => p.state === 'active' || p.state === 'running');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto text-right"
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
                إدارة باقات الكارت (المستخدمة وقيد الانتظار) وكلمة المرور وحدود الاستهلاك
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
              {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white mr-2">✕</button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[62vh] text-xs">
          
          {/* ========================================================================= */}
          {/* PROFILES STATUS & QUEUE SECTION (Used, Active & Waiting Bundles) */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-purple-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">
                    حالة باقات وبروفايلات الكارت
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    الباقات المستخدمة سابقاً، النشطة حالياً، وتلك التي قيد الانتظار
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => loadAssignedProfiles(user.name)}
                  disabled={isLoadingProfiles}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 flex items-center gap-1 text-[11px]"
                  title="تحديث حالة الباقات من الراوتر"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProfiles ? 'animate-spin text-purple-400' : ''}`} />
                  <span className="hidden sm:inline">تحديث</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfilesDetails(!showProfilesDetails)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title={showProfilesDetails ? 'طي التفاصيل' : 'عرض التفاصيل'}
                >
                  {showProfilesDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4 Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 1. Used Profiles Count */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400 font-medium">مستخدمة سابقاً</span>
                  <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-slate-400">
                    <RotateCcw className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-slate-200">
                    {profilesSummary.used}
                  </span>
                  <span className="text-[10px] text-slate-400">باقة منتهية</span>
                </div>
              </div>

              {/* 2. Active Profile */}
              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/50 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-emerald-300 font-medium">النشطة حالياً</span>
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Zap className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {profilesSummary.active}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 truncate max-w-[80px]" title={activeProfileItem?.profile || user.actualProfile}>
                    {activeProfileItem?.profile || user.actualProfile || 'نشطة'}
                  </span>
                </div>
              </div>

              {/* 3. Waiting Profiles (Queued) */}
              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:border-amber-500/50 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-amber-300 font-medium">قيد الانتظار</span>
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Hourglass className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {profilesSummary.waiting}
                  </span>
                  <span className="text-[10px] text-amber-300/80">مجدولة تلقائياً</span>
                </div>
              </div>

              {/* 4. Total Profiles */}
              <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-500/50 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-purple-300 font-medium">إجمالي الباقات</span>
                  <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <CheckCheck className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-purple-300">
                    {profilesSummary.total}
                  </span>
                  <span className="text-[10px] text-purple-300/80">مرتبطة بالكارت</span>
                </div>
              </div>
            </div>

            {/* Detailed Profiles List */}
            {showProfilesDetails && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>سجل طابور الباقات (Queue Timeline):</span>
                  <span>{assignedProfiles.length} مسجلة في الراوتر</span>
                </div>

                {isLoadingProfiles && assignedProfiles.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 bg-slate-900/60 rounded-xl flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    <span>جاري جلب سجل الباقات من المايكروتك...</span>
                  </div>
                ) : assignedProfiles.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-dashed border-slate-800">
                    <Info className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                    <span>لا توجد سجلات باقات إضافية مسجلة في قائمة انتظار هذا الكارت.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {assignedProfiles.map((item, idx) => {
                      const isActive = item.state === 'active' || item.state === 'running';
                      const isWaiting = item.state === 'waiting' || item.state === 'unused';
                      const isUsed = item.state === 'used' || item.state === 'expired';

                      return (
                        <div
                          key={item.id || `${item.profile}_${idx}`}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                            isActive
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                              : isWaiting
                              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                              : 'bg-slate-900/70 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0 relative">
                              {isActive ? (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </>
                              ) : isWaiting ? (
                                <span className="inline-flex rounded-full h-2 w-2 bg-amber-400" />
                              ) : (
                                <span className="inline-flex rounded-full h-2 w-2 bg-slate-500" />
                              )}
                            </div>

                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white font-mono text-xs">
                                  {item.profile}
                                </span>
                                {isActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans text-[10px] font-bold border border-emerald-500/30">
                                    نشطة حالياً
                                  </span>
                                )}
                                {isWaiting && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    قيد الانتظار (التالية)
                                  </span>
                                )}
                                {isUsed && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-sans text-[10px] border border-slate-700">
                                    مستخدمة / منتهية
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {isActive && (
                                  <span>بدأت الاستهلاك • تنتهي بانتهاء الوقت أو البيانات المحددة</span>
                                )}
                                {isWaiting && (
                                  <span className="text-amber-300/80">
                                    ستبدأ بالعمل تلقائياً فور انتهاء صلاحية أو رصيد الباقة النشطة
                                  </span>
                                )}
                                {isUsed && (
                                  <span>
                                    {item.startsAt ? `بدأت: ${item.startsAt}` : 'تم استهلاك رصيدها'}
                                    {item.endsAt ? ` • انتهت: ${item.endsAt}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action button: Cancel waiting profile */}
                          {isWaiting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWaitingProfile(item.id, item.profile)}
                              disabled={isRemovingProfileId === item.id}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition flex items-center gap-1 text-[10px] shrink-0"
                              title="إلغاء وحذف هذه الباقة من طابور الانتظار"
                            >
                              {isRemovingProfileId === item.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span className="hidden sm:inline">إلغاء</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Helpful Note about User Manager Profiles Queue */}
                <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-300/90 flex items-start gap-2 mt-2">
                  <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>آلية عمل طابور الباقات (Profiles Queue):</strong> عند إضافة باقة جديدة لكارت لديه باقة نشطة، تُدرج الباقة الجديدة في وضع <strong>قيد الانتظار (Waiting)</strong>. يتولى راوتر المايكروتك تفعيلها فوراً وبشكل تلقائي بمجرد انتهاء الباقة الحالية دون أي انقطاع للمشترك.
                  </p>
                </div>
              </div>
            )}
          </div>

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

          {/* Profile Select & Assign */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>بروفايل اليوزر مانجر (Profile):</span>
              </span>
              <span className="text-[11px] text-purple-400">
                {profilesSummary.active > 0 ? 'إضافة باقة جديدة لقائمة الانتظار أو تجديد' : 'تحديد باقة الكارت'}
              </span>
            </label>
            <div className="flex gap-2">
              <select
                value={actualProfile}
                onChange={(e) => setActualProfile(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-purple-500 transition"
              >
                {profiles.map((p) => (
                  <option key={p.id || p.name} value={p.name}>
                    {p.name} {p.nameForUsers ? `— (${p.nameForUsers})` : ''} {p.price ? `[${p.price} ريال]` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignProfile}
                disabled={isAssigning}
                className="flex items-center gap-1.5 justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-50 text-xs shrink-0 shadow-md shadow-indigo-600/30"
                title="إضافة هذه الباقة للكارت (تُدرج في الانتظار إذا كان الكارت نشطاً)"
              >
                {isAssigning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>إضافة باقة</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {profilesSummary.active > 0
                ? '💡 نظراً لأن الكارت يمتلك باقة نشطة، فإن النقر على "إضافة باقة" سيضعها في طابور الانتظار (Waiting) لتتفعّل تلقائياً لاحقاً.'
                : 'سيتم تعيين هذه الباقة كباقة نشطة للكارت فور الحفظ أو النقر على إضافة باقة.'}
            </p>
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
