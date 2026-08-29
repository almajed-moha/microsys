import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Store,
  DollarSign,
  ReceiptText,
  Truck,
  Layers,
  Printer,
  Settings,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Wifi,
  ShieldCheck,
  X,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Palette,
  Receipt,
  FileText,
  Users,
  LogIn,
  LogOut,
  ShoppingBag,
  Server,
} from 'lucide-react';
import {
  NetworkSettings,
  POSPoint,
  SalesRecord,
  PaymentRecord,
  CardCategory,
  CardBatchDispatch,
  InvoiceRecord,
  ExpenseRecord,
  AppUser,
  CardOrder,
} from '../types';
import { hasPermission, ROLE_DEFINITIONS } from '../utils/permissions';

export type NavView =
  | 'system_tenants'
  | 'dashboard'
  | 'mikrotik'
  | 'invoices'
  | 'expenses'
  | 'pos'
  | 'payments'
  | 'categories'
  | 'users'
  | 'sales'
  | 'dispatches'
  | 'orders'
  | 'pos_portal';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onCloseMobile?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeView: NavView;
  onSelectView?: (view: NavView) => void;
  onNavigate?: (view: NavView) => void;
  settings: NetworkSettings;
  posPoints?: POSPoint[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  categories?: CardCategory[];
  dispatches?: CardBatchDispatch[];
  invoices?: InvoiceRecord[];
  expenses?: ExpenseRecord[];
  users?: AppUser[];
  orders?: CardOrder[];
  activeUser?: AppUser;
  counts?: {
    posPoints?: number;
    sales?: number;
    payments?: number;
    categories?: number;
    dispatches?: number;
    invoices?: number;
    expenses?: number;
    users?: number;
    orders?: number;
    pendingOrders?: number;
  };
  onOpenSettings?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenAI?: () => void;
  onOpenAIModal?: () => void;
  onOpenNewPayment?: () => void;
  onOpenNewSale?: () => void;
  onResetData?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  activeView,
  onSelectView,
  onNavigate,
  settings,
  posPoints = [],
  sales = [],
  payments = [],
  categories = [],
  dispatches = [],
  invoices = [],
  expenses = [],
  users = [],
  orders = [],
  activeUser,
  counts,
  onOpenSettings,
  onOpenSettingsModal,
  onOpenAI,
  onOpenAIModal,
  onOpenNewPayment,
  onOpenNewSale,
  onResetData,
  onOpenLogin,
  onLogout,
}) => {
  const handleClose = onClose || onCloseMobile || (() => {});
  const handleNavigate = onSelectView || onNavigate || (() => {});
  const handleOpenSettings = onOpenSettings || onOpenSettingsModal || (() => {});
  const handleOpenAI = onOpenAI || onOpenAIModal || (() => {});

  const totalDebt = (posPoints || []).reduce((acc, p) => acc + (p?.currentDebt || 0), 0);
  const isMikrotikConnected = settings?.mikrotikConfig?.isLiveConnected || (settings as any)?.mikrotik?.isLiveConnected || false;

  const posCount = counts?.posPoints ?? posPoints?.length ?? 0;
  const paymentsCount = counts?.payments ?? payments?.length ?? 0;
  const categoriesCount = counts?.categories ?? categories?.length ?? 0;
  const invoicesCount = counts?.invoices ?? invoices?.length ?? 0;
  const expensesCount = counts?.expenses ?? expenses?.length ?? 0;
  const usersCount = counts?.users ?? users?.length ?? 0;
  const ordersCount = counts?.orders ?? orders?.length ?? 0;
  const pendingOrdersCount = counts?.pendingOrders ?? orders?.filter((o) => o.status === 'pending').length ?? 0;

  const allNavItems = [
    {
      id: 'system_tenants' as NavView,
      permissionModule: 'systemTenants' as const,
      label: 'إدارة الشبكات المشتركة',
      icon: Server,
      badge: 'SaaS',
      color: 'text-fuchsia-400',
      activeBg: 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30',
    },
    {
      id: 'dashboard' as NavView,
      permissionModule: 'dashboard' as const,
      label: 'لوحة التحكم الشاملة',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-indigo-400',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
    },
    {
      id: 'pos_portal' as NavView,
      permissionModule: 'orders' as const,
      label: 'بوابة نقطة البيع (طلب الكروت)',
      icon: Store,
      badge: activeUser?.role === 'pos_agent' ? 'بوابتي' : 'معاينة',
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
    },
    {
      id: 'orders' as NavView,
      permissionModule: 'orders' as const,
      label: 'طلبات الكروت الواردة',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} جديد ⚡` : `${ordersCount}`,
      color: 'text-amber-400',
      activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
    },
    {
      id: 'invoices' as NavView,
      permissionModule: 'invoices' as const,
      label: 'الفواتير (مبيعات ومرتجع)',
      icon: FileText,
      badge: `${invoicesCount}`,
      color: 'text-amber-400',
      activeBg: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
    },
    {
      id: 'expenses' as NavView,
      permissionModule: 'expenses' as const,
      label: 'المصروفات والمصاريف التشغيلية',
      icon: Receipt,
      badge: `${expensesCount}`,
      color: 'text-amber-400',
      activeBg: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
    },
    {
      id: 'payments' as NavView,
      permissionModule: 'payments' as const,
      label: 'سندات القبض والدفعات',
      icon: DollarSign,
      badge: `${paymentsCount}`,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
    },
    {
      id: 'pos' as NavView,
      permissionModule: 'pos' as const,
      label: 'نقاط التوزيع والموزعين',
      icon: Store,
      badge: `${posCount}`,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30',
    },
    {
      id: 'categories' as NavView,
      permissionModule: 'categories' as const,
      label: 'فئات الكروت والطباعة والمخزون',
      icon: Layers,
      badge: `${categoriesCount}`,
      color: 'text-blue-400',
      activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
    },
    {
      id: 'mikrotik' as NavView,
      permissionModule: 'mikrotik' as const,
      label: 'المايكروتك والمشتركين المباشر',
      icon: Activity,
      badge: (
        <span className={`w-2 h-2 rounded-full ${isMikrotikConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
      ),
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
    },
    {
      id: 'users' as NavView,
      permissionModule: 'usersAndPermissions' as const,
      label: 'المستخدمين والصلاحيات',
      icon: ShieldCheck,
      badge: `${usersCount}`,
      color: 'text-purple-400',
      activeBg: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
    },
  ];

  // Filter items according to active user permissions
  const navItems = allNavItems.filter((item) => {
    if (!activeUser) return true;
    
    // Restrict POS Agent to ONLY see the POS Portal
    if (activeUser.role === 'pos_agent') {
      return item.id === 'pos_portal';
    }
    
    // Hide POS Portal from other roles (optional, but requested implicitly by restricting POS agent to it, usually admins don't need to see "بوابتي" as a main nav item if they have everything else, but if they want to preview it, it's fine. Wait, the original code had a 'معاينة' badge for non-pos agents, so we let others see it if they have orders view permission).
    return hasPermission(activeUser, item.permissionModule, 'view');
  });

  const activeUserRoleMeta = activeUser ? ROLE_DEFINITIONS[activeUser.role] : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 flex flex-col bg-slate-900 border-l border-slate-800 transition-all duration-300 ease-in-out select-none shadow-2xl lg:shadow-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'w-72 sm:w-80'}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
              <Wifi className="w-5 h-5" />
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-black text-white truncate tracking-tight">
                  {settings.networkName}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isMikrotikConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {isMikrotikConnected ? 'مايكروتك متصل ومباشر' : 'نظام إدارة الشبكات'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="text-[10px] font-bold text-slate-500 px-3 pb-1 tracking-wider uppercase">
            {!isCollapsed ? 'القوائم الرئيسية' : '•••'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavigate(item.id);
                  handleClose();
                }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? item.activeBg
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                } ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.color
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  typeof item.badge === 'string' ? (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <div>{item.badge}</div>
                  )
                )}
              </button>
            );
          })}

          <div className="pt-4 text-[10px] font-bold text-slate-500 px-3 pb-1 tracking-wider uppercase border-t border-slate-800/80">
            {!isCollapsed ? 'الإعدادات والذكاء الاصطناعي' : '•••'}
          </div>

          {/* AI Assistant Button */}
          {(!activeUser || hasPermission(activeUser, 'settings', 'useAIAssistant')) && (
            <button
              onClick={() => {
                handleOpenAI();
                handleClose();
              }}
              title="المساعد الذكي والتحليلات"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 group ${
                isCollapsed ? 'lg:justify-center' : 'justify-between'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
                {!isCollapsed && <span>المساعد الذكي والتوقعات</span>}
              </div>
              {!isCollapsed && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono">
                  AI
                </span>
              )}
            </button>
          )}

          {/* Network Settings Modal Button */}
          {(!activeUser || hasPermission(activeUser, 'settings', 'view')) && (
            <button
              onClick={() => {
                handleOpenSettings();
                handleClose();
              }}
              title="إعدادات الشبكة والمايكروتك"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-800/70 group ${
                isCollapsed ? 'lg:justify-center' : 'justify-start'
              }`}
            >
              <Settings className="w-5 h-5 text-indigo-400 shrink-0 group-hover:rotate-45 transition-transform" />
              {!isCollapsed && <span>إعدادات الشبكة والراوتر</span>}
            </button>
          )}
        </div>

        {/* Sidebar Footer with Active User Badge */}
        {!isCollapsed ? (
          <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2.5">
            {/* Active User Card in Sidebar */}
            {activeUser && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group">
                <div
                  onClick={() => {
                    handleNavigate('users');
                    handleClose();
                  }}
                  className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
                  title="عرض وتعديل الصلاحيات والمستخدمين"
                >
                  <div className={`w-8 h-8 rounded-lg ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-sm shrink-0 shadow-xs`}>
                    {activeUser.avatar || '👤'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{activeUser.name}</p>
                    <p className="text-[10px] text-indigo-400 font-medium truncate">
                      {activeUser.customRoleName || activeUserRoleMeta?.badge || 'مستخدم'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenLogin && (
                    <button
                      onClick={onOpenLogin}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="تبديل المستخدم / شاشة الدخول"
                    >
                      <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      title="تسجيل الخروج"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Total Debt Quick Badge */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] text-slate-400 font-medium">المديونيات:</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {(totalDebt ?? 0).toLocaleString()} {settings.currencySymbol}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>الإصدار 3.0 Pro RBAC</span>
              {onResetData && (
                <button
                  onClick={onResetData}
                  className="text-slate-400 hover:text-rose-400 transition flex items-center gap-1 text-[10px]"
                  title="إعادة ضبط البيانات الافتراضية"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 bg-slate-950/80 border-t border-slate-800 flex flex-col items-center gap-2">
            {activeUser && (
              <button
                onClick={() => handleNavigate('users')}
                className={`w-9 h-9 rounded-xl ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-sm shadow-xs`}
                title={`${activeUser.name} (${activeUser.customRoleName || activeUserRoleMeta?.badge})`}
              >
                {activeUser.avatar || '👤'}
              </button>
            )}
            <button
              onClick={handleOpenSettings}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

