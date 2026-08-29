import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Phone,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { AppUser, NetworkSettings } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  activeUser: AppUser;
  settings?: NetworkSettings;
  onClose: () => void;
  onSave: (updatedUser: AppUser) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  activeUser,
  settings,
  onClose,
  onSave,
}) => {
  const [authType, setAuthType] = useState<'password' | 'pin'>('password');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // PIN fields
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check old password
    const realPass = activeUser.password || '123456';
    if (currentPassword !== realPass) {
      setErrorMessage('كلمة المرور الحالية غير صحيحة! يرجى التحقق وإعادة المحاولة.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage('يجب أن تتكون كلمة المرور الجديدة من 4 خانات على الأقل.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
      return;
    }

    setIsSubmitting(true);
    const updated: AppUser = {
      ...activeUser,
      password: newPassword,
    };

    setTimeout(() => {
      onSave(updated);
      setIsSubmitting(false);
      setSuccessMessage('تم تحديث كلمة المرور الخاصة بك بنجاح!');
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 400);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check old PIN
    const realPin = activeUser.pinCode || '1234';
    if (currentPin !== realPin) {
      setErrorMessage('رمز PIN الحالي غير صحيح!');
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setErrorMessage('يجب أن يتكون رمز PIN من 4 إلى 6 أرقام فقط.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('رمز PIN الجديد وتأكيده غير متطابقين!');
      return;
    }

    setIsSubmitting(true);
    const updated: AppUser = {
      ...activeUser,
      pinCode: newPin,
    };

    setTimeout(() => {
      onSave(updated);
      setIsSubmitting(false);
      setSuccessMessage('تم تحديث رمز PIN الخاص بك بنجاح!');
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 400);
  };

  const supportPhone = settings?.supportPhone || settings?.whatsappNumber || '770123456';
  const networkName = settings?.networkName || 'شبكة المايكروتك';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">تغيير بيانات الدخول والأمان</h3>
              <p className="text-xs text-slate-400">
                حساب: <span className="font-mono text-indigo-300 font-bold">@{activeUser.username}</span> ({activeUser.name})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Password or PIN */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthType('password');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                authType === 'password'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>كلمة المرور</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthType('pin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                authType === 'pin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>رمز PIN السريع</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="px-5 pt-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Password Form */}
        {authType === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                كلمة المرور الحالية <span className="text-rose-400">*</span>:
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية لتأكيد الهوية..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pl-10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                كلمة المرور الجديدة <span className="text-rose-400">*</span>:
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pl-10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                تأكيد كلمة المرور الجديدة <span className="text-rose-400">*</span>:
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور الجديدة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                dir="ltr"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>حفظ كلمة المرور الجديدة</span>
              </button>
            </div>
          </form>
        )}

        {/* PIN Form */}
        {authType === 'pin' && (
          <form onSubmit={handlePinSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                رمز PIN الحالي <span className="text-rose-400">*</span>:
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="رمز PIN الحالي (4-6 أرقام)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                رمز PIN الجديد (4 إلى 6 أرقام) <span className="text-rose-400">*</span>:
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="رمز PIN الجديد"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                تأكيد رمز PIN الجديد <span className="text-rose-400">*</span>:
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="أعد إدخال رمز PIN الجديد"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>حفظ رمز PIN الجديد</span>
              </button>
            </div>
          </form>
        )}

        {/* Administration Support Contact Footnote */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400">
            في حال تعذر تذكر الرمز القديم، يرجى التواصل مع إدارة الشبكة لإعادة ضبط الحساب.
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <a
              href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `السلام عليكم إدارة ${networkName}، أرجو المساعدة في إعادة ضبط كلمة المرور للحساب @${activeUser.username}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>واتساب الإدارة ({supportPhone})</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
