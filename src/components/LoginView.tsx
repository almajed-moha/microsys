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
import firebaseConfig from '../firebase-applet-config.json';
import { fetchUsersFromCloud } from '../services/cloudSync';
import {
  ROLE_DEFINITIONS,
  getDefaultLandingViewForUser,
  getViewNameArabic,
} from '../utils/permissions';
import { NavView } from './Sidebar';
import { AboutProgramModal } from './AboutProgramModal';
import { signInWithGoogle, auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
  const [showAboutModal, setShowAboutModal] = useState(false);

  const supportPhone = settings?.supportPhone || settings?.whatsappNumber || '770123456';
  const networkName = settings?.networkName || 'إدارة شبكات المايكروتك ونقاط البيع السحابية MicroSys';
  const networkSlogan = settings?.networkSlogan || 'المنظومة السحابية المتكاملة للتحكم المالي، الفواتير، ونقاط البيع';
  const logoUrl = settings?.logoUrl;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Find user by email
        let targetUser = users.find((u) => u.email && u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        
        if (!targetUser) {
          // Sign out immediately so they aren't stuck logged into Firebase auth
          try {
            
            await signOut(auth);
          } catch (e) {
            console.error('Failed to sign out unauthorized user', e);
          }
          setErrorMessage('البريد الإلكتروني غير مسجل لدينا. يرجى التواصل مع إدارة النظام.');
          setIsLoggingIn(false);
          return;
        }

        if (targetUser) {
          if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
             try {
               
               await signOut(auth);
             } catch (e) {}
             setErrorMessage('حسابك موقوف حالياً. يرجى مراجعة إدارة النظام.');
             setIsLoggingIn(false);
             return;
          }
          executeSuccess(targetUser);
        }
      }
    });

    return () => unsubscribe();
  }, [users]);

  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage('');
      setIsLoggingIn(true);
      await signInWithGoogle();
    } catch (error) {
      setIsLoggingIn(false);
      setErrorMessage('فشل تسجيل الدخول بواسطة جوجل.');
    }
  };

  // Handle Username & Password Submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoggingIn(true);

    let targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
        (u.phone && u.phone.trim() === usernameInput.trim())
    );

    if (!targetUser) {
      try {
        const cloudUsers = await fetchUsersFromCloud();
        
        targetUser = cloudUsers.find(
          (u) =>
            u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
            (u.phone && u.phone.trim() === usernameInput.trim())
        );

        if (!targetUser) {
           setErrorMessage(`تم الاتصال بالسحابة بنجاح ووجدنا ${cloudUsers.length} مستخدمين، لكن لم نعثر على المستخدم: ${usernameInput}. الأسماء المتوفرة: ${cloudUsers.map(u => u.username).join(', ')}`);
           setIsShaking(true);
           setIsLoggingIn(false);
           setTimeout(() => setIsShaking(false), 500);
           return;
        }
      } catch (err: any) {
        console.warn('Fallback fetch failed:', err);
        setErrorMessage('تعذر الاتصال بالسحابة: ' + (err.message || err.toString()));
        setIsLoggingIn(false);
        return;
      }
    }

    if (!targetUser) {
      setErrorMessage('اسم المستخدم أو رقم الهاتف غير مسجل في النظام!');
      setIsShaking(true);
      setIsLoggingIn(false);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
      setErrorMessage('هذا الحساب معطل حالياً من قبل إدارة الشبكة. يرجى التواصل مع المدير العام.');
      setIsLoggingIn(false);
      return;
    }

    const expectedPass = targetUser.password || '123456';
    if (passwordInput.trim() !== expectedPass) {
      setErrorMessage('كلمة المرور غير صحيحة! يرجى إعادة المحاولة أو طلب إعادة ضبطها من الإدارة.');
      setIsShaking(true);
      setIsLoggingIn(false);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsLoggingIn(false);
    executeSuccess(targetUser);
  };

  // Handle PIN Submission
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!pinUsernameInput.trim()) {
      setErrorMessage('يرجى كتابة اسم المستخدم أو رقم الهاتف أولاً.');
      return;
    }

    setIsLoggingIn(true);
    let targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === pinUsernameInput.trim().toLowerCase() ||
        (u.phone && u.phone.trim() === pinUsernameInput.trim())
    );

    if (!targetUser) {
      try {
        const cloudUsers = await fetchUsersFromCloud();
        
        targetUser = cloudUsers.find(
          (u) =>
            u.username.toLowerCase() === pinUsernameInput.trim().toLowerCase() ||
            (u.phone && u.phone.trim() === pinUsernameInput.trim())
        );

        if (!targetUser) {
           setErrorMessage(`تم الاتصال بالسحابة بنجاح ووجدنا ${cloudUsers.length} مستخدمين، لكن لم نعثر على المستخدم: ${pinUsernameInput}`);
           setIsShaking(true);
           setIsLoggingIn(false);
           setTimeout(() => setIsShaking(false), 500);
           return;
        }
      } catch (err: any) {
        console.warn('Fallback fetch failed:', err);
        setErrorMessage('تعذر الاتصال بالسحابة: ' + (err.message || err.toString()));
        setIsLoggingIn(false);
        return;
      }
    }

    if (!targetUser) {
      setErrorMessage('اسم المستخدم أو رقم الهاتف غير مسجل في النظام!');
      setIsShaking(true);
      setIsLoggingIn(false);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (targetUser.status === 'inactive' || targetUser.status === 'suspended') {
      setErrorMessage('هذا الحساب معطل حالياً من قبل إدارة الشبكة.');
      setIsLoggingIn(false);
      return;
    }

    const expectedPin = targetUser.pinCode || '1234';
    if (pinInput !== expectedPin) {
      setErrorMessage('رمز PIN غير صحيح! يرجى التحقق وإعادة المحاولة.');
      setIsShaking(true);
      setIsLoggingIn(false);
      setTimeout(() => {
        setIsShaking(false);
        setPinInput('');
      }, 500);
      return;
    }

    setIsLoggingIn(false);
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
          {logoUrl ? (
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-3xl p-2 shadow-xl shadow-indigo-500/10">
              <img src={logoUrl} alt={networkName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
              <ShieldCheck className="w-9 h-9" />
            </div>
          )}
          <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
            {networkName}
          </h1>
          <p className="text-xs text-indigo-400 font-medium mt-1">
            {networkSlogan}
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

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative bg-slate-900 px-4 text-xs text-slate-500 font-bold">أو</div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-bold text-sm shadow-md transition flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>الدخول بواسطة حساب Google</span>
          </button>

          {/* Help & Support & About Program Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>نسيت كلمة المرور؟</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition bg-slate-950 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer"
            >
              <span>ℹ️ حول البرنامج</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>{networkSlogan}</span>
          <button
            type="button"
            onClick={() => setShowAboutModal(true)}
            className="hover:text-indigo-400 transition cursor-pointer font-mono"
          >
            ميراب سوفت التقنية v3.5 Pro
          </button>
        </div>
      </div>

      {/* About Program Modal */}
      <AboutProgramModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        settings={settings}
      />

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
