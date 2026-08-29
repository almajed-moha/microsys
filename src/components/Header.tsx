import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Wifi,
  Sparkles,
  Settings,
  PlusCircle,
  DollarSign,
  TrendingUp,
  Activity,
  Receipt,
  RotateCcw,
  LogIn,
  LogOut,
  Lock,
  UserCheck,
  Shield,
  ChevronDown,
  Sun,
  Moon,
  Search,
  Command
} from 'lucide-react';
import { NetworkSettings, POSPoint, SalesRecord, PaymentRecord, AppUser } from '../types';
import { NavView } from './Sidebar';
import { ROLE_DEFINITIONS, hasPermission } from '../utils/permissions';

interface HeaderProps {
  currentTab: NavView;
  setCurrentTab: (tab: NavView) => void;
  settings?: NetworkSettings;
  activeUser?: AppUser;
  pendingOrdersCount?: number;
  onToggleSidebar: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenQuickSale?: () => void;
  onOpenQuickPayment?: () => void;
  onOpenAI?: () => void;
  onOpenSettings?: () => void;
  onOpenLogin?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  totalDebt?: number;
  totalSalesToday?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  activeUser,
  pendingOrdersCount = 0,
  onToggleSidebar,
  onOpenGlobalSearch,
  onOpenQuickSale,
  onOpenQuickPayment,
  onOpenAI,
  onOpenSettings,
  onOpenLogin,
  onOpenChangePassword,
  onLogout,
  onToggleTheme,
  totalDebt = 0,
  totalSalesToday = 0,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const safeSettings: NetworkSettings = {
    networkName: settings?.networkName || 'شبكة الفضاء اللاسلكية | Al-Fadaa WiFi',
    networkSlogan: settings?.networkSlogan || 'سرعة فائقة وتغطية شاملة 24/7',
    currency: settings?.currency || 'YER',
    currencySymbol: settings?.currencySymbol || 'ر.ي',
    hotspotDns: settings?.hotspotDns || 'wifi.net',
    loginPageUrl: settings?.loginPageUrl || 'http://wifi.net/login',
    supportPhone: settings?.supportPhone || '770123456',
    whatsappNumber: settings?.whatsappNumber || '967770123456',
    autoReconciliation: settings?.autoReconciliation ?? true,
    enableQrCodeOnCards: settings?.enableQrCodeOnCards ?? true,
    mikrotikConfig: settings?.mikrotikConfig,
  };

  const isConnected = safeSettings.mikrotikConfig?.isLiveConnected ?? false;

  const viewTitles: Record<NavView, string> = {
    dashboard: 'لوحة التحكم وصافي الأرباح والمؤشرات',
    pos_portal: 'بوابة نقطة البيع لطلب الكروت ومتابعة الحساب',
    orders: 'إدارة طلبات الكروت الواردة من المحلات',
    invoices: 'إدارة الفواتير (مبيعات ومرتجع وتسليم الكروت)',
    expenses: 'المصروفات والنفقات التشغيلية',
    pos: 'نقاط التوزيع والموزعين والمديونيات',
    payments: 'سجل وسندات القبض والتحصيلات',
    categories: 'فئات الكروت والطباعة والمخزون',
    mikrotik: 'مراقبة المايكروتك والمشتركين المباشر',
    users: 'إدارة المستخدمين والأدوار ومصفوفة الصلاحيات',
    sales: 'حركة المبيعات وفواتير الكروت',
    dispatches: 'تسليم الدفعات وتوريد الكروت',
  };

  const roleMeta = activeUser ? ROLE_DEFINITIONS[activeUser.role] : null;

  return (
    <header className="no-print sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side (RTL Start): Sidebar Hamburger + Network Title */}
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-sm transition"
              title="فتح القائمة الجانبية"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Network Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
                <Wifi className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm sm:text-base text-white tracking-tight truncate max-w-[180px] sm:max-w-xs">
                    {safeSettings.networkName}
                  </h1>
                  <button
                    onClick={() => setCurrentTab('mikrotik')}
                    className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border transition ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="الانتقال لمركز المايكروتك المباشر"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ml-1 ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                    <span>{isConnected ? 'مايكروتك متصل' : 'مايكروتك'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-indigo-400 font-semibold hidden md:block">
                  {viewTitles[currentTab] || 'نظام إدارة شبكات مايكروتك'}
                </p>
              </div>
            </div>
          </div>

          {/* Middle/Right Side (RTL End): Search & Quick Actions & Stats */}
          <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
            {/* Global Search Button */}
            {onOpenGlobalSearch && hasPermission(activeUser, 'dashboard', 'view') && (
              <button
                onClick={onOpenGlobalSearch}
                className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 shadow-sm transition group"
                title="بحث سريع في كل النظام والتبويبات (Ctrl + K)"
              >
                <Search className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium hidden md:inline text-slate-300 group-hover:text-white">
                  بحث شامل في النظام...
                </span>
                <span className="hidden lg:flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  <kbd>Ctrl</kbd>+<kbd>K</kbd>
                </span>
              </button>
            )}

            {/* Quick Metrics */}
            {hasPermission(activeUser, 'dashboard', 'viewFinancialMetrics') && (
              <div className="hidden xl:flex items-center gap-4 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>مبيعات اليوم:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {(totalSalesToday ?? 0).toLocaleString()} {safeSettings.currencySymbol}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-slate-800"></div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>المديونيات:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {(totalDebt ?? 0).toLocaleString()} {safeSettings.currencySymbol}
                  </span>
                </div>
              </div>
            )}

            {/* Pending Orders Alert Pill */}
            {pendingOrdersCount > 0 && hasPermission(activeUser, 'orders', 'view') && (
              <button
                onClick={() => setCurrentTab('orders')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow-xs"
                title={`${pendingOrdersCount} طلبات كروت جديدة بانتظار المراجعة`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold">{pendingOrdersCount} طلبات كروت</span>
              </button>
            )}

            {/* Quick Payment Button */}
            {onOpenQuickPayment && hasPermission(activeUser, 'payments', 'addPayment') && (
              <button
                onClick={onOpenQuickPayment}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-xs"
                title="تسجيل سند قبض وسداد دفعة لنقطة بيع"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">سند قبض جديد</span>
              </button>
            )}

            {/* Quick Sale Button */}
            {onOpenQuickSale && hasPermission(activeUser, 'invoices', 'createSaleInvoice') && (
              <button
                onClick={onOpenQuickSale}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
                title="تسجيل عملية بيع كروت جديدة"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل بيع</span>
              </button>
            )}

            {/* AI Assistant Button */}
            {hasPermission(activeUser, 'settings', 'useAIAssistant') && (
              <button
                onClick={onOpenAI}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-purple-600/20 transition ring-1 ring-purple-400/40 flex items-center gap-1.5"
                title="مساعد الذكاء الاصطناعي وتحليل المبيعات"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="hidden md:inline">المستشار الذكي</span>
              </button>
            )}

            {/* Quick Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                title={safeSettings.themeMode === 'light' ? 'التبديل إلى الوضع الليلي (Dark Mode)' : 'التبديل إلى الوضع النهاري (Light Mode)'}
                aria-label="تبديل وضع السمة"
              >
                {safeSettings.themeMode === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            {/* Settings Button */}
            {hasPermission(activeUser, 'settings', 'view') && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                title="إعدادات الشبكة والمظهر والمايكروتك"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Active User Badge & Quick Profile Menu */}
            {activeUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 transition group text-right"
                  title={`المستخدم الحالي: ${activeUser.name} (${activeUser.customRoleName || roleMeta?.badge})\nانقر لخيارات الحساب وتسجيل الدخول`}
                >
                  <div className={`w-7 h-7 rounded-lg ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-xs shadow-xs shrink-0`}>
                    {activeUser.avatar || '👤'}
                  </div>
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">{activeUser.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-indigo-400 font-medium leading-tight truncate">{activeUser.customRoleName || roleMeta?.badge}</p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-right">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-2">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className={`w-8 h-8 rounded-lg ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-sm shadow-xs shrink-0`}>
                          {activeUser.avatar || '👤'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{activeUser.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">@{activeUser.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-slate-400">الدور الوظيفي:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full border ${roleMeta?.bgLight} ${roleMeta?.color} ${roleMeta?.borderLight}`}>
                          {activeUser.customRoleName || roleMeta?.badge}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {/* Change Password & PIN Modal */}
                      {onOpenChangePassword && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenChangePassword();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Lock className="w-4 h-4 text-emerald-400" />
                          <span>تغيير كلمة المرور ورمز PIN</span>
                        </button>
                      )}

                      {/* Open Login / User Switcher Screen */}
                      {onOpenLogin && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenLogin();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                        >
                          <LogIn className="w-4 h-4 text-indigo-400" />
                          <span>صفحة تسجيل الدخول والتبديل</span>
                        </button>
                      )}

                      {/* Go to Users & Permissions (if permitted) */}
                      {hasPermission(activeUser, 'usersAndPermissions', 'view') && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setCurrentTab('users');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span>إدارة المستخدمين والصلاحيات</span>
                        </button>
                      )}

                      {/* Logout / Lock Session */}
                      {onLogout && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition border-t border-slate-800/80 mt-1 pt-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل الخروج / قفل النظام</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
