import React, { useState, useEffect } from 'react';
import {
  LogIn,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MessageSquare,
  HelpCircle,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppUser, NetworkSettings } from '../types';
import {
  ROLE_DEFINITIONS,
  getDefaultLandingViewForUser,
  getViewNameArabic,
} from '../utils/permissions';
import { NavView } from './Sidebar';

interface LoginViewProps {
  users: AppUser[];
  activeUser?: AppUser;
  settings?: NetworkSettings;
  isModal?: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: AppUser, targetView: NavView) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  activeUser,
  settings,
  isModal = false,
  onClose,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');

  // Credentials State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN State
  const [pinUsernameInput, setPinUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // UI States
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccessUser, setLoginSuccessUser] = useState<{ user: AppUser; view: NavView } | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(false);

  const supportPhone = settings?.supportPhone || settings?.whatsappNumber || '770123456';
  const networkName = settings?.networkName || 'شبكة المايكروتك';

  // Handle Username & Password Submission
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
        (u.phone && u.phone.trim() === usernameInput.trim())
    );

    if (!targetUser) {
      setErrorMessage('اسم المستخدم أو رقم الهاتف غير مسجل في النظام!');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
      setErrorMessage('هذا الحساب معطل حالياً من قبل إدارة الشبكة. يرجى التواصل مع المدير العام.');
      return;
    }

    const expectedPass = targetUser.password || '123456';
    if (passwordInput.trim() !== expectedPass) {
      setErrorMessage('كلمة المرور غير صحيحة! يرجى إعادة المحاولة أو طلب إعادة ضبطها من الإدارة.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    executeSuccess(targetUser);
  };

  // Handle PIN Submission
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!pinUsernameInput.trim()) {
      setErrorMessage('يرجى كتابة اسم المستخدم أو رقم الهاتف أولاً.');
      return;
    }

    const targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === pinUsernameInput.trim().toLowerCase() ||
        (u.phone && u.phone.trim() === pinUsernameInput.trim())
    );

    if (!targetUser) {
      setErrorMessage('اسم المستخدم أو رقم الهاتف غير مسجل في النظام!');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
      setErrorMessage('هذا الحساب معطل حالياً من قبل إدارة الشبكة.');
      return;
    }

    const expectedPin = targetUser.pinCode || '1234';
    if (pinInput !== expectedPin) {
      setErrorMessage('رمز PIN غير صحيح! يرجى التحقق وإعادة المحاولة.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
      }, 500);
      return;
    }

    executeSuccess(targetUser);
  };

  const handlePinDigit = (digit: string) => {
    if (isLoggingIn) return;
    if (pinInput.length >= 6) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setErrorMessage('');
  };

  const handlePinBackspace = () => {
    if (isLoggingIn) return;
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handlePinClear = () => {
    if (isLoggingIn) return;
    setPinInput('');
    setErrorMessage('');
  };

  const executeSuccess = (user: AppUser) => {
    setIsLoggingIn(true);
    setErrorMessage('');
    const targetLandingView = getDefaultLandingViewForUser(user);

    setLoginSuccessUser({ user, view: targetLandingView });

    setTimeout(() => {
      onLoginSuccess(user, targetLandingView);
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto ${
        isModal ? 'bg-slate-950/85 backdrop-blur-md p-4' : 'bg-slate-950 p-4 sm:p-6'
      }`}
      dir="rtl"
    >
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Close Button (if modal) */}
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Header & Branding */}
        <div className="p-6 sm:p-8 bg-slate-950/80 border-b border-slate-800 text-center relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
            {networkName}
          </h1>
          <p className="text-xs text-indigo-400 font-medium mt-1">
            بوابة تسجيل الدخول الآمنة • MikroTik Accounting Portal
          </p>
          <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto">
            أدخل بيانات الاعتماد الخاصة بك للوصول إلى النظام وإدارة العمليات وفق صلاحياتك المعتمدة.
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="px-6 sm:px-8 pt-6">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                authMode === 'credentials'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>اسم المستخدم وكلمة المرور</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                authMode === 'pin'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>رمز الدخول السريع (PIN)</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="px-6 sm:px-8 pt-4">
            <div className={`p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-3 text-rose-200 text-xs ${isShaking ? 'animate-shake' : ''}`}>
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {loginSuccessUser && (
          <div className="px-6 sm:px-8 pt-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 text-emerald-200 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
              <div>
                <p className="font-bold">تم التحقق من الهوية بنجاح!</p>
                <p className="text-[11px] text-emerald-300/80">
                  مرحباً بك {loginSuccessUser.user.name} ({getViewNameArabic(loginSuccessUser.view)})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Form 1: Username & Password */}
          {authMode === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 text-right">
                  اسم المستخدم أو رقم الهاتف:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="مثال: admin أو 770123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 pl-10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    autoFocus
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 text-right">
                  كلمة المرور:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 pl-10 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول للنظام</span>
              </button>
            </form>
          )}

          {/* Form 2: Quick PIN Pad */}
          {authMode === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 text-right">
                  اسم المستخدم أو رقم هاتف الحساب:
                </label>
                <input
                  type="text"
                  required
                  value={pinUsernameInput}
                  onChange={(e) => setPinUsernameInput(e.target.value)}
                  placeholder="مثال: admin أو رقم الموزع"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                  dir="ltr"
                />
              </div>

              {/* PIN Code Dots Display */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[11px] text-slate-400 mb-2">أدخل رمز PIN المكون من 4 إلى 6 أرقام</span>
                <div className="flex items-center gap-2.5 h-6">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const filled = pinInput.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          filled
                            ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-xs shadow-indigo-500/50'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-base transition flex items-center justify-center border border-slate-700"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-11 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition flex items-center justify-center border border-slate-800"
                >
                  مسح
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-base transition flex items-center justify-center border border-slate-700"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="h-11 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition flex items-center justify-center border border-slate-800"
                >
                  ⌫
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول برمز PIN</span>
              </button>
            </form>
          )}

          {/* Help & Support Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>تعذر تسجيل الدخول أو نسيت كلمة المرور؟</span>
            </button>
          </div>

          {/* Discreet Dev Helper (Accordion) */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDevAccounts(!showDevAccounts)}
              className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-300 transition py-1"
            >
              <span>حسابات النظام الافتراضية (للتجربة والإدارة)</span>
              {showDevAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDevAccounts && (
              <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px] animate-fade-in">
                <div className="flex items-center justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">المدير العام (admin):</span>
                  <span className="font-mono text-indigo-400">كلمة المرور: 123456 | PIN: 1234</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-300 font-bold">المحاسب (accountant):</span>
                  <span className="font-mono text-indigo-400">كلمة المرور: 123456 | PIN: 1234</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-300 font-bold">نقاط البيع والموزعين:</span>
                  <span className="text-slate-400">حسب اسم المستخدم المسجل في شاشة نقاط البيع</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>نظام محاسبي معتمد لشبكات الإنترنت</span>
          <span className="font-mono">RBAC Security v3.5</span>
        </div>
      </div>

      {/* Support / Contact Admin Dialog */}
      {showSupportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-black text-base text-white">المساعدة والدعم الفني</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              لأسباب تتعلق بأمان النظام وسرية البيانات المالية، يتم إعادة ضبط وتعيين كلمات المرور ورموز PIN عبر مسؤول النظام العام (المدير).
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">إدارة الشبكة:</span>
                <span className="font-bold text-white">{networkName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">هاتف الدعم المباشر:</span>
                <span className="font-mono font-bold text-indigo-300">{supportPhone}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `السلام عليكم إدارة ${networkName}، أواجه مشكلة في تسجيل الدخول وأحتاج إلى إعادة تعيين كلمة المرور الخاصة بحسابي.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
              >
                <MessageSquare className="w-4 h-4" />
                <span>مراسلة الإدارة عبر واتساب فوراً</span>
              </a>

              <a
                href={`tel:${supportPhone}`}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>الاتصال الهاتفي المباشر</span>
              </a>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                العودة لنافذة تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
