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
  Command,
  Building2,
  Globe,
  Info,
  Database,
  Cloud,
  MoreVertical,
  SlidersHorizontal,
  Bell,
  X,
} from 'lucide-react';
import { NetworkSettings, POSPoint, SalesRecord, PaymentRecord, AppUser, NetworkTenant } from '../types';
import { NavView } from './Sidebar';
import { ROLE_DEFINITIONS, hasPermission } from '../utils/permissions';

interface HeaderProps {
  currentTab: NavView;
  setCurrentTab: (tab: NavView) => void;
  settings?: NetworkSettings;
  activeUser?: AppUser;
  tenants?: NetworkTenant[];
  selectedTenantFilter?: string;
  onSelectTenantFilter?: (tenantId: string) => void;
  pendingOrdersCount?: number;
  onToggleSidebar: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenQuickSale?: () => void;
  onOpenQuickPayment?: () => void;
  onOpenAI?: () => void;
  onOpenSettings?: () => void;
  onOpenBackup?: () => void;
  onOpenLogin?: () => void;
  onOpenChangePassword?: () => void;
  onOpenAboutProgram?: () => void;
  onLogout?: () => void;
  onOpenUsers?: () => void;
  onToggleTheme?: () => void;
  totalDebt?: number;
  totalSalesToday?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  activeUser,
  tenants = [],
  selectedTenantFilter = 'all',
  onSelectTenantFilter,
  pendingOrdersCount = 0,
  onToggleSidebar,
  onOpenGlobalSearch,
  onOpenQuickSale,
  onOpenQuickPayment,
  onOpenAI,
  onOpenSettings,
  onOpenBackup,
  onOpenLogin,
  onOpenChangePassword,
  onOpenAboutProgram,
  onLogout,
  onOpenUsers,
  onToggleTheme,
  totalDebt = 0,
  totalSalesToday = 0,
}) => {
  const activeTenant = React.useMemo(() => {
    const targetId = activeUser?.role === 'system_owner'
      ? (selectedTenantFilter !== 'all' ? selectedTenantFilter : null)
      : (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : (tenants[0]?.id || null));
    if (!targetId) return null;
    return tenants.find((t) => t.id === targetId) || null;
  }, [tenants, activeUser, selectedTenantFilter]);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickToolsRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (quickToolsRef.current && !quickToolsRef.current.contains(target)) {
        setIsQuickToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tenantObj = activeUser?.networkId && activeUser.networkId !== 'system'
    ? tenants.find((t) => t.id === activeUser.networkId)
    : (selectedTenantFilter && selectedTenantFilter !== 'all' ? tenants.find((t) => t.id === selectedTenantFilter) : null);
  const currentTenantName = tenantObj?.settings?.networkName || tenantObj?.name || (activeUser?.role === 'system_owner' && selectedTenantFilter === 'all' ? 'منصة إدارة الشبكات السحابية (SaaS)' : settings?.networkName);

  const safeSettings: NetworkSettings = {
    networkName: currentTenantName || settings?.networkName || 'نظام إدارة الشبكات اللاسلكية',
    networkSlogan: tenantObj?.settings?.networkSlogan || settings?.networkSlogan || 'إدارة الشبكات ونقاط البيع السحابية',
    currency: tenantObj?.settings?.currency || settings?.currency || 'YER',
    currencySymbol: tenantObj?.settings?.currencySymbol || settings?.currencySymbol || 'ر.ي',
    hotspotDns: tenantObj?.settings?.hotspotDns || settings?.hotspotDns || 'wifi.net',
    loginPageUrl: tenantObj?.settings?.loginPageUrl || settings?.loginPageUrl || 'http://wifi.net/login',
    supportPhone: tenantObj?.settings?.supportPhone || settings?.supportPhone || '770123456',
    whatsappNumber: tenantObj?.settings?.whatsappNumber || settings?.whatsappNumber || '967770123456',
    autoReconciliation: settings?.autoReconciliation ?? true,
    enableQrCodeOnCards: settings?.enableQrCodeOnCards ?? true,
    mikrotikConfig: tenantObj?.settings?.mikrotikConfig || settings?.mikrotikConfig,
  };

  const isConnected = safeSettings.mikrotikConfig?.isLiveConnected ?? false;

  const viewTitles: Record<NavView, string> = {
    system_tenants: 'إدارة الشبكات المشتركة (SaaS Master)',
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
    customers: 'إدارة العملاء والمديونيات',
    mikrotik_sessions: 'إحصائيات المتصلين وجلسات المايكروتك',
    sales: 'حركة المبيعات وفواتير الكروت',
    dispatches: 'تسليم الدفعات وتوريد الكروت',
  };

  const roleMeta = activeUser ? ROLE_DEFINITIONS[activeUser.role] : null;

  return (
    <header className="no-print sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md w-full">
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Right Side (RTL Start): Sidebar Toggle + Network Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-xs transition shrink-0"
              title="فتح / إغلاق القائمة الجانبية"
              aria-label="القائمة الجانبية"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Network Brand & Status */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
                <Wifi className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-xs sm:text-sm md:text-base text-white tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[190px] md:max-w-xs">
                    {safeSettings.networkName}
                  </h1>
                  <button
                    onClick={() => setCurrentTab('mikrotik')}
                    className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition shrink-0 ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="الانتقال لمركز المايكروتك المباشر"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ml-1 ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                    <span className="hidden md:inline">{isConnected ? 'مايكروتك متصل' : 'مايكروتك'}</span>
                    <span className="md:hidden">{isConnected ? 'متصل' : 'روتر'}</span>
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-indigo-400 font-semibold hidden xl:block truncate max-w-xs">
                  {viewTitles[currentTab] || 'نظام إدارة شبكات مايكروتك'}
                </p>
              </div>
            </div>
          </div>

          {/* Left Side (RTL End): Responsive Toolbar & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 1. Global Search Button */}
            {onOpenGlobalSearch && hasPermission(activeUser, 'dashboard', 'view', activeTenant) && (
              <button
                onClick={onOpenGlobalSearch}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-indigo-500/50 shadow-xs transition group"
                title="بحث سريع في كل النظام والتبويبات (Ctrl + K)"
              >
                <Search className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-xs font-medium hidden md:inline text-slate-300 group-hover:text-white">
                  بحث شامل...
                </span>
                <span className="hidden xl:flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  <kbd>Ctrl</kbd>+<kbd>K</kbd>
                </span>
              </button>
            )}

            {/* 2. Quick Financial Metrics (Large Desktop Only) */}
            {hasPermission(activeUser, 'dashboard', 'viewFinancialMetrics', activeTenant) && (
              <div className="hidden 2xl:flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>المبيعات:</span>
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

            {/* 3. SaaS Master Tenant Filter Dropdown (Desktop) */}
            {activeUser?.role === 'system_owner' && onSelectTenantFilter && tenants.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-xl border border-indigo-500/30 text-xs shadow-inner">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={selectedTenantFilter}
                  onChange={(e) => onSelectTenantFilter(e.target.value)}
                  className="bg-slate-900 text-indigo-300 border border-slate-700/80 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[140px]"
                  title="تصفية وعزل بيانات شبكة محددة لمالك النظام"
                >
                  <option value="all">🏢 كافة الشبكات</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      🌐 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Pending Orders Alert Pill */}
            {pendingOrdersCount > 0 && hasPermission(activeUser, 'orders', 'view', activeTenant) && (
              <button
                onClick={() => setCurrentTab('orders')}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow-xs shrink-0 animate-bounce"
                style={{ animationDuration: '3s' }}
                title={`${pendingOrdersCount} طلبات كروت جديدة بانتظار المراجعة`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold">{pendingOrdersCount}</span>
                <span className="hidden sm:inline">طلبات</span>
              </button>
            )}

            {/* 5. Quick Payment Button (Desktop & Tablet) */}
            {onOpenQuickPayment && hasPermission(activeUser, 'payments', 'addPayment', activeTenant) && (
              <button
                onClick={onOpenQuickPayment}
                className="hidden sm:flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-xs shrink-0"
                title="تسجيل سند قبض وسداد دفعة لنقطة بيع"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="hidden lg:inline">سند قبض</span>
              </button>
            )}

            {/* 6. Quick Sale Button (High Priority - Always visible or compact) */}
            {onOpenQuickSale && hasPermission(activeUser, 'invoices', 'createSaleInvoice', activeTenant) && (
              <button
                onClick={onOpenQuickSale}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition shrink-0"
                title="تسجيل عملية بيع كروت جديدة"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden md:inline">تسجيل بيع</span>
              </button>
            )}

            {/* 7. AI Assistant Button (Tablet & Desktop) */}
            {hasPermission(activeUser, 'settings', 'useAIAssistant', activeTenant) && (
              <button
                onClick={onOpenAI}
                className="hidden sm:flex p-1.5 sm:p-2 md:px-2.5 md:py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-purple-600/20 transition ring-1 ring-purple-400/40 items-center gap-1.5 shrink-0"
                title="مساعد الذكاء الاصطناعي وتحليل المبيعات"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="hidden xl:inline">المستشار الذكي</span>
              </button>
            )}

            {/* 8. Quick Theme Toggle Button (Desktop & Tablet) */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="hidden md:flex p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
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

            {/* Cloud Realtime Sync Status Indicator */}
            <div
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-inner"
              title="قاعدة بيانات Firestore السحابية: متصلة ومتزامنة فورياً عبر جميع الأجهزة ومحمية بنظام التحقق من الهوية"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>سحابي متزامن</span>
            </div>

            {/* 9. Database & Backup Button (Desktop) */}
            {onOpenBackup && hasPermission(activeUser, 'settings', 'backupAndRestore', activeTenant) && (
              <button
                onClick={onOpenBackup}
                className="hidden lg:flex p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-slate-700 transition shrink-0"
                title="النسخ الاحتياطي واستعادة قاعدة البيانات (JSON)"
              >
                <Database className="w-4 h-4 text-indigo-400" />
              </button>
            )}

            {/* 10. Settings Button (Desktop) */}
            {hasPermission(activeUser, 'settings', 'view', activeTenant) && (
              <button
                onClick={onOpenSettings}
                className="hidden md:flex p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
                title="إعدادات الشبكة والمظهر والمايكروتك"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* 11. Quick Mobile / Tablet Overflow Menu ("المزيد" - More Tools) */}
            <div className="relative md:hidden" ref={quickToolsRef}>
              <button
                onClick={() => {
                  setIsQuickToolsOpen(!isQuickToolsOpen);
                  setIsUserMenuOpen(false);
                }}
                className={`p-1.5 sm:p-2 rounded-xl border transition shrink-0 flex items-center justify-center ${
                  isQuickToolsOpen
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="إجراءات سريعة وأدوات إضافية"
                aria-label="قائمة الإجراءات السريعة"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Quick Tools Dropdown on Small Screens */}
              {isQuickToolsOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeIn text-right">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>الإجراءات السريعة والأدوات</span>
                    </span>
                    <button
                      onClick={() => setIsQuickToolsOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Financial Stats Summary inside Mobile Menu */}
                  {hasPermission(activeUser, 'dashboard', 'viewFinancialMetrics', activeTenant) && (
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 mb-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>مبيعات اليوم:</span>
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {(totalSalesToday ?? 0).toLocaleString()} {safeSettings.currencySymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          <span>إجمالي المديونيات:</span>
                        </span>
                        <span className="font-bold text-amber-400 font-mono">
                          {(totalDebt ?? 0).toLocaleString()} {safeSettings.currencySymbol}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tenant Selector for Master Admin on Mobile */}
                  {activeUser?.role === 'system_owner' && onSelectTenantFilter && tenants.length > 0 && (
                    <div className="mb-2 p-2 bg-indigo-950/30 rounded-xl border border-indigo-500/20">
                      <label className="block text-[11px] font-bold text-indigo-300 mb-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>معاينة وتصفية الشبكات:</span>
                      </label>
                      <select
                        value={selectedTenantFilter}
                        onChange={(e) => {
                          onSelectTenantFilter(e.target.value);
                          setIsQuickToolsOpen(false);
                        }}
                        className="w-full bg-slate-900 text-indigo-200 border border-slate-700 rounded-lg p-1.5 text-xs font-bold focus:outline-none"
                      >
                        <option value="all">🏢 كافة الشبكات (نظرة شاملة)</option>
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            🌐 {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quick Action Items Grid / List */}
                  <div className="space-y-1">
                    {/* Quick Payment */}
                    {onOpenQuickPayment && hasPermission(activeUser, 'payments', 'addPayment', activeTenant) && (
                      <button
                        onClick={() => {
                          setIsQuickToolsOpen(false);
                          onOpenQuickPayment();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 transition"
                      >
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>تسجيل سند قبض ودفعات</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">قبض</span>
                      </button>
                    )}

                    {/* AI Advisor */}
                    {hasPermission(activeUser, 'settings', 'useAIAssistant', activeTenant) && (
                      <button
                        onClick={() => {
                          setIsQuickToolsOpen(false);
                          onOpenAI?.();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
                          <span>المستشار الذكي (AI)</span>
                        </span>
                        <span className="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">تحليلات</span>
                      </button>
                    )}

                    {/* Settings */}
                    {hasPermission(activeUser, 'settings', 'view', activeTenant) && (
                      <button
                        onClick={() => {
                          setIsQuickToolsOpen(false);
                          onOpenSettings?.();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                      >
                        <Settings className="w-4 h-4 text-indigo-400" />
                        <span>إعدادات الشبكة والروتر والتذييل</span>
                      </button>
                    )}

                    {/* Theme Mode Toggle */}
                    {onToggleTheme && (
                      <button
                        onClick={() => {
                          onToggleTheme();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                      >
                        <span className="flex items-center gap-2">
                          {safeSettings.themeMode === 'light' ? (
                            <Moon className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-400" />
                          )}
                          <span>المظهر والسمة</span>
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {safeSettings.themeMode === 'light' ? 'النهاري' : 'الليلي'}
                        </span>
                      </button>
                    )}

                    {/* Cloud Sync Status */}
                    <div className="px-3 py-2 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400">
                      <span className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-emerald-400" />
                        <span>سحابة Firestore</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        متصل ومحمي
                      </span>
                    </div>

                    {/* Backup */}
                    {onOpenBackup && hasPermission(activeUser, 'settings', 'backupAndRestore', activeTenant) && (
                      <button
                        onClick={() => {
                          setIsQuickToolsOpen(false);
                          onOpenBackup();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                      >
                        <Database className="w-4 h-4 text-indigo-400" />
                        <span>النسخ الاحتياطي (JSON)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 12. Active User Badge & Quick Profile Menu */}
            {activeUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(!isUserMenuOpen);
                    setIsQuickToolsOpen(false);
                  }}
                  className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition group text-right shrink-0"
                  title={`المستخدم الحالي: ${activeUser.name} (${activeUser.customRoleName || roleMeta?.badge})\nانقر لخيارات الحساب وتسجيل الدخول`}
                >
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-xs shadow-xs shrink-0`}>
                    {activeUser.avatar || '👤'}
                  </div>
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-bold text-white leading-tight truncate max-w-[90px]">{activeUser.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-indigo-400 font-medium leading-tight truncate max-w-[90px]">{activeUser.customRoleName || roleMeta?.badge}</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn text-right">
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
                      {hasPermission(activeUser, 'usersAndPermissions', 'view', activeTenant) && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (onOpenUsers) {
                              onOpenUsers();
                            } else {
                              setCurrentTab('users');
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Shield className="w-4 h-4 text-purple-400" />
                          <span>إدارة المستخدمين والصلاحيات</span>
                        </button>
                      )}

                      {/* Backup & Database (if permitted) */}
                      {onOpenBackup && hasPermission(activeUser, 'settings', 'backupAndRestore', activeTenant) && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenBackup();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                        >
                          <Database className="w-4 h-4 text-indigo-400" />
                          <span>النسخ الاحتياطي وقاعدة البيانات (JSON)</span>
                        </button>
                      )}

                      {/* About Program */}
                      {onOpenAboutProgram && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAboutProgram();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:bg-slate-800 hover:text-cyan-200 transition"
                        >
                          <Info className="w-4 h-4 text-cyan-400" />
                          <span>حول البرنامج (ميراب سوفت)</span>
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
                  className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

