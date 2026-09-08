import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  Store,
  CreditCard,
  Layers,
  FileText,
  DollarSign,
  Receipt,
  Truck,
  Users,
  Settings,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Activity,
  Printer,
  PlusCircle,
  Sun,
  Moon,
  LogIn,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Tag,
  ShieldCheck,
  AlertCircle,
  Lock,
  Database,
} from 'lucide-react';
import {
  CardCategory,
  POSPoint,
  SalesRecord,
  PaymentRecord,
  CardBatchDispatch,
  InvoiceRecord,
  ExpenseRecord,
  AppUser,
  NetworkSettings
} from '../types';
import { NavView } from './Sidebar';
import { hasPermission, ROLE_DEFINITIONS } from '../utils/permissions';

export type SearchCategory =
  | 'all'
  | 'nav'
  | 'invoices'
  | 'pos'
  | 'categories'
  | 'payments'
  | 'expenses'
  | 'dispatches'
  | 'actions';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  categoryLabel: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  amount?: number;
  date?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Navigation handler
  onNavigate: (view: NavView) => void;
  // Direct modal trigger handlers
  onOpenInvoiceReceipt?: (invoice: InvoiceRecord) => void;
  onOpenPaymentReceipt?: (payment: PaymentRecord) => void;
  onOpenExpenseReceipt?: (expense: ExpenseRecord) => void;
  onOpenPOSStatement?: (posId: string) => void;
  onOpenQuickSale?: () => void;
  onOpenQuickPayment?: (posId?: string) => void;
  onOpenAI?: () => void;
  onOpenSettings?: () => void;
  onOpenBackup?: () => void;
  onOpenIncomeStatement?: () => void;
  onOpenFinancialExport?: () => void;
  onOpenLogin?: () => void;
  onToggleTheme?: () => void;
  // Core Application Data
  categories: CardCategory[];
  posPoints: POSPoint[];
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  sales: SalesRecord[];
  dispatches: CardBatchDispatch[];
  users: AppUser[];
  settings: NetworkSettings;
  activeUser?: AppUser;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenInvoiceReceipt,
  onOpenPaymentReceipt,
  onOpenExpenseReceipt,
  onOpenPOSStatement,
  onOpenQuickSale,
  onOpenQuickPayment,
  onOpenAI,
  onOpenSettings,
  onOpenBackup,
  onOpenIncomeStatement,
  onOpenFinancialExport,
  onOpenLogin,
  onToggleTheme,
  categories,
  posPoints,
  invoices,
  expenses,
  payments,
  sales,
  dispatches,
  users,
  settings,
  activeUser,
  activeTenant,
}) => {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const currencySymbol = settings?.currencySymbol || 'ر.ي';

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedFilter('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build the complete search index with strict RBAC permission filtering
  const allSearchItems = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];

    const isSuperAdmin = activeUser?.role === 'super_admin';

    // Granular RBAC Permissions Check
    const canViewDashboard = hasPermission(activeUser, 'dashboard', 'view', activeTenant);
    const canViewFinancialMetrics = hasPermission(activeUser, 'dashboard', 'viewFinancialMetrics', activeTenant);
    const canViewProfits = hasPermission(activeUser, 'dashboard', 'viewProfits', activeTenant);
    const canViewDebtsSummary = hasPermission(activeUser, 'dashboard', 'viewDebtsSummary', activeTenant);
    const canViewIncomeStatement =
      hasPermission(activeUser, 'expenses', 'viewIncomeStatement', activeTenant) ||
      hasPermission(activeUser, 'dashboard', 'viewIncomeStatement', activeTenant);
    const canExportReports =
      hasPermission(activeUser, 'dashboard', 'exportReports', activeTenant) ||
      hasPermission(activeUser, 'invoices', 'exportInvoices', activeTenant) ||
      hasPermission(activeUser, 'payments', 'exportPayments', activeTenant) ||
      hasPermission(activeUser, 'pos', 'exportPOSData', activeTenant);

    const canViewInvoices = hasPermission(activeUser, 'invoices', 'view', activeTenant);
    const canCreateSaleInvoice = hasPermission(activeUser, 'invoices', 'createSaleInvoice', activeTenant);
    const canPrintInvoice = hasPermission(activeUser, 'invoices', 'printInvoice', activeTenant);

    const canViewExpenses = hasPermission(activeUser, 'expenses', 'view', activeTenant);
    const canAddExpense = hasPermission(activeUser, 'expenses', 'addExpense', activeTenant);
    const canPrintExpense = hasPermission(activeUser, 'expenses', 'printReceipt', activeTenant);

    const canViewPayments = hasPermission(activeUser, 'payments', 'view', activeTenant);
    const canAddPayment = hasPermission(activeUser, 'payments', 'addPayment', activeTenant);
    const canPrintPayment = hasPermission(activeUser, 'payments', 'printReceipt', activeTenant);

    const canViewPOS = hasPermission(activeUser, 'pos', 'view', activeTenant);
    const canViewPOSStatement =
      hasPermission(activeUser, 'pos', 'viewAccountStatement', activeTenant) ||
      hasPermission(activeUser, 'payments', 'printPOSStatement', activeTenant);

    const canViewCategories = hasPermission(activeUser, 'categories', 'view', activeTenant);
    const canGenerateVouchers = hasPermission(activeUser, 'categories', 'generateVouchers', activeTenant);

    const canViewMikrotik = hasPermission(activeUser, 'mikrotik', 'view', activeTenant);
    const canViewUsers = hasPermission(activeUser, 'usersAndPermissions', 'view', activeTenant);
    const canSwitchUser = hasPermission(activeUser, 'usersAndPermissions', 'switchActiveUser', activeTenant) || isSuperAdmin;
    const canViewSettings = hasPermission(activeUser, 'settings', 'view', activeTenant);
    const canUseAI = hasPermission(activeUser, 'settings', 'useAIAssistant', activeTenant);

    // Assigned POS branch filtering (e.g. for sales agents restricted to assigned stores)
    const assignedPOSIds =
      activeUser?.assignedPOSPointIds && activeUser.assignedPOSPointIds.length > 0
        ? new Set(activeUser.assignedPOSPointIds)
        : null;

    // 1. Navigation views & tabs (Filtered by user screen permissions)
    const canViewOrders = !activeUser || hasPermission(activeUser, 'orders', 'view', activeTenant);

    const navViews: {
      id: NavView;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      allowed: boolean;
      keywords: string[];
    }[] = [
      {
        id: 'dashboard',
        title: 'لوحة التحكم والمؤشرات المالية',
        subtitle: 'صافي الأرباح، الإيرادات، التدفقات النقدية، وحركة المبيعات',
        icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />,
        allowed: canViewDashboard,
        keywords: ['رئيسية', 'داشبورد', 'احصائيات', 'مؤشرات', 'مبيعات', 'dashboard', 'أرباح'],
      },
      {
        id: 'pos_portal',
        title: 'بوابة نقطة البيع (طلب الكروت والمحاسبة)',
        subtitle: 'واجهة مخصصة لنقاط التوزيع لطلب الكروت ومتابعة الديون والسندات',
        icon: <Store className="w-4 h-4 text-cyan-400" />,
        allowed: canViewOrders,
        keywords: ['بوابة', 'نقطة بيع', 'طلب كروت', 'طلب', 'محل', 'portal', 'pos_portal'],
      },
      {
        id: 'orders',
        title: 'إدارة طلبات الكروت الواردة',
        subtitle: 'استقبال طلبات المحلات، اعتمادها، وتحويلها إلى فواتير مبيعات رسمية',
        icon: <FileText className="w-4 h-4 text-amber-400" />,
        allowed: canViewOrders,
        keywords: ['طلبات', 'طلبيات', 'كروت واردة', 'orders', 'اعتماد طلب', 'توصيل'],
      },
      {
        id: 'invoices',
        title: 'إدارة الفواتير والمبيعات',
        subtitle: 'فواتير تسليم الكروت، المرتجعات، والطباعة الحرارية و A4',
        icon: <FileText className="w-4 h-4 text-blue-400" />,
        allowed: canViewInvoices,
        keywords: ['فواتير', 'فاتورة', 'مبيعات', 'مرتجع', 'تسليم', 'invoices', 'طباعة'],
      },
      {
        id: 'pos',
        title: 'نقاط التوزيع والموزعين',
        subtitle: 'إدارة الموزعين، المديونيات، وسندات التسليم وكشوفات الحساب',
        icon: <Store className="w-4 h-4 text-emerald-400" />,
        allowed: canViewPOS,
        keywords: ['نقاط', 'موزعين', 'نقطة بيع', 'عملاء', 'مديونيات', 'pos', 'وكيل'],
      },
      {
        id: 'payments',
        title: 'سندات القبض والتحصيلات',
        subtitle: 'سندات القبض الرسمية، سداد الدفعات، والتحويلات النقدية والبنكية',
        icon: <DollarSign className="w-4 h-4 text-amber-400" />,
        allowed: canViewPayments,
        keywords: ['قبض', 'سند', 'تحصيل', 'سداد', 'دفعة', 'payments', 'نقدية'],
      },
      {
        id: 'categories',
        title: 'فئات الكروت ومولد مايكروتك',
        subtitle: 'توليد كروت هوتسبوت، إدارة الفئات، الأسعار، والمخزون المركزي',
        icon: <Layers className="w-4 h-4 text-purple-400" />,
        allowed: canViewCategories,
        keywords: ['كروت', 'فئات', 'توليد', 'اسعار', 'طباعة كروت', 'categories', 'مخزون'],
      },
      {
        id: 'expenses',
        title: 'المصروفات وسندات الصرف',
        subtitle: 'تسجيل النفقات التشغيلية وسندات الصرف وبنود التكاليف',
        icon: <Receipt className="w-4 h-4 text-rose-400" />,
        allowed: canViewExpenses,
        keywords: ['مصروفات', 'صرف', 'نفقات', 'سند صرف', 'تكاليف', 'expenses'],
      },
      {
        id: 'dispatches',
        title: 'ترحيل وتسليم حزم الكروت',
        subtitle: 'تجهيز وتسليم كميات الكروت للموزعين مع سندات التسليم الرسمية',
        icon: <Truck className="w-4 h-4 text-cyan-400" />,
        allowed: canViewPOS || canViewCategories || canViewInvoices,
        keywords: ['ترحيل', 'دفعات', 'تسليم', 'حزم', 'dispatches', 'توريد'],
      },
      {
        id: 'mikrotik',
        title: 'المراقبة المباشرة للمايكروتك (Live)',
        subtitle: 'المستخدمين النشطين (Active)، البينج، استهلاك الترافيك، والراوترات',
        icon: <Activity className="w-4 h-4 text-emerald-400" />,
        allowed: canViewMikrotik,
        keywords: ['مايكروتك', 'متصلين', 'active', 'hotspot', 'traffic', 'mikrotik', 'راوتر'],
      },
      {
        id: 'users',
        title: 'إدارة المستخدمين والصلاحيات (RBAC)',
        subtitle: 'حسابات الموظفين، الأدوار، ومصفوفة الصلاحيات وسجل النشاطات',
        icon: <Users className="w-4 h-4 text-indigo-400" />,
        allowed: canViewUsers,
        keywords: ['مستخدمين', 'صلاحيات', 'ادوار', 'امان', 'users', 'موظفين', 'حسابات'],
      },
    ];

    navViews.forEach((v) => {
      if (v.allowed) {
        items.push({
          id: `nav-${v.id}`,
          category: 'nav',
          categoryLabel: 'شاشة / تبويب',
          title: v.title,
          subtitle: v.subtitle,
          icon: v.icon,
          action: () => {
            onNavigate(v.id);
            onClose();
          },
          keywords: [v.title, v.subtitle, ...v.keywords],
        });
      }
    });

    // 2. Quick Actions (Filtered by user action permissions)
    const quickActions: {
      id: string;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      badge?: string;
      badgeColor?: string;
      allowed: boolean;
      action: () => void;
      keywords: string[];
    }[] = [
      {
        id: 'action-quick-sale',
        title: 'تسجيل عملية بيع كروت جديدة',
        subtitle: 'فتح نافذة البيع السريع لخصم الكروت وتحديث مديونية الموزع',
        icon: <PlusCircle className="w-4 h-4 text-indigo-400" />,
        badge: 'عملية سريعة',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        allowed: canCreateSaleInvoice,
        action: () => {
          if (onOpenQuickSale) onOpenQuickSale();
          onClose();
        },
        keywords: ['بيع', 'تسجيل بيع', 'فاتورة جديدة', 'صرف كروت', 'sale'],
      },
      {
        id: 'action-quick-payment',
        title: 'تسجيل سند قبض وسداد دفعة',
        subtitle: 'إصدار سند قبض مالي لنقطة بيع مع طباعة حرارية فورية',
        icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
        badge: 'سند مالي',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        allowed: canAddPayment,
        action: () => {
          if (onOpenQuickPayment) onOpenQuickPayment();
          onClose();
        },
        keywords: ['قبض', 'سند قبض', 'سداد', 'دفعة', 'تحصيل', 'payment'],
      },
      {
        id: 'action-income-statement',
        title: 'قائمة الدخل والتقرير المالي المحاسبي',
        subtitle: 'عرض كشف الأرباح والخسائر، وصافي التدفق النقدي، والتصدير والطباعة',
        icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
        badge: 'تقرير محاسبي',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        allowed: canViewIncomeStatement,
        action: () => {
          if (onOpenIncomeStatement) onOpenIncomeStatement();
          onClose();
        },
        keywords: ['قائمة الدخل', 'ارباح', 'خسائر', 'تقرير مالي', 'income', 'cogs', 'ميزانية'],
      },
      {
        id: 'action-financial-export',
        title: 'تصدير البيانات الشامل (Excel / CSV)',
        subtitle: 'تصدير المبيعات، الفواتير، المصروفات، والمديونيات في ملفات جداول بيانات',
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
        badge: 'تصدير',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        allowed: canExportReports,
        action: () => {
          if (onOpenFinancialExport) onOpenFinancialExport();
          onClose();
        },
        keywords: ['تصدير', 'اكسل', 'excel', 'csv', 'تحميل', 'شيت', 'نسخ'],
      },
      {
        id: 'action-ai-assistant',
        title: 'المستشار الذكي وتحليل المبيعات (AI)',
        subtitle: 'توليد توصيات استراتيجية، تحليل الفئات الأكثر طلباً، وتوقع الإيرادات',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        badge: 'ذكاء اصطناعي',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        allowed: canUseAI,
        action: () => {
          if (onOpenAI) onOpenAI();
          onClose();
        },
        keywords: ['ذكاء', 'ai', 'مستشار', 'تحليل', 'توصيات', 'توقع', 'مساعد'],
      },
      {
        id: 'action-settings',
        title: 'إعدادات النظام والشبكة والنسخ الاحتياطي',
        subtitle: 'تخصيص اسم الشبكة، العملة، أرقام الدعم، وإدارة النسخ الاحتياطية',
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        badge: 'إعدادات',
        badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600',
        allowed: canViewSettings,
        action: () => {
          if (onOpenSettings) onOpenSettings();
          onClose();
        },
        keywords: ['اعدادات', 'نسخ احتياطي', 'اسم الشبكة', 'شعار', 'settings', 'backup'],
      },
      {
        id: 'action-theme-toggle',
        title: 'تبديل المظهر (Dark / Light Mode)',
        subtitle: 'التبديل بين الوضع الليلي المريح والوضع النهاري عالي التباين',
        icon:
          settings?.themeMode === 'light' ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          ),
        badge: 'مظهر',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        allowed: true, // Always allowed
        action: () => {
          if (onToggleTheme) onToggleTheme();
          onClose();
        },
        keywords: ['ثيم', 'مظهر', 'دارك', 'لايت', 'theme', 'dark', 'light', 'نهاري', 'ليلي'],
      },
      {
        id: 'action-login-switch',
        title: 'تبديل المستخدم / تسجيل الدخول',
        subtitle: 'تسجيل الدخول بحساب موظف آخر أو قفل الجلسة الحالية',
        icon: <LogIn className="w-4 h-4 text-cyan-400" />,
        badge: 'حسابات',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        allowed: canSwitchUser,
        action: () => {
          if (onOpenLogin) onOpenLogin();
          onClose();
        },
        keywords: ['دخول', 'تسجيل دخول', 'تبديل', 'خروج', 'login', 'قفل', 'جلسة'],
      },
    ];

    quickActions.forEach((a) => {
      if (a.allowed) {
        items.push({
          id: a.id,
          category: 'actions',
          categoryLabel: 'إجراء سريع',
          title: a.title,
          subtitle: a.subtitle,
          badge: a.badge,
          badgeColor: a.badgeColor,
          icon: a.icon,
          action: a.action,
          keywords: [a.title, a.subtitle, ...a.keywords],
        });
      }
    });

    // 3. POS Points (نقاط البيع والموزعين - تظهر فقط لمن يملك صلاحية عرض نقاط البيع)
    if (canViewPOS) {
      const allowedPOSPoints = assignedPOSIds
        ? posPoints.filter((p) => assignedPOSIds.has(p.id))
        : posPoints;

      allowedPOSPoints.forEach((pos) => {
        const showDebt = canViewDebtsSummary || canViewFinancialMetrics || isSuperAdmin;
        const debtBadge = showDebt
          ? (pos.currentDebt || 0) > 0
            ? `مديونية: ${(pos.currentDebt || 0).toLocaleString()} ${currencySymbol}`
            : 'حساب خالص'
          : 'نقطة توزيع نشطة';

        items.push({
          id: `pos-${pos.id}`,
          category: 'pos',
          categoryLabel: 'نقطة بيع',
          title: pos.name,
          subtitle: `المسؤول: ${pos.managerName || 'غير محدد'} | هاتف: ${pos.phone || 'لا يوجد'} | ${pos.address || ''}`,
          amount: showDebt ? pos.currentDebt || 0 : undefined,
          badge: debtBadge,
          badgeColor:
            (pos.currentDebt || 0) > 0 && showDebt
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <Store className="w-4 h-4 text-emerald-400" />,
          action: () => {
            if (canViewPOSStatement && onOpenPOSStatement) {
              onOpenPOSStatement(pos.id);
            } else {
              onNavigate('pos');
            }
            onClose();
          },
          keywords: [
            pos.name,
            pos.managerName || '',
            pos.phone || '',
            pos.address || '',
            pos.notes || '',
            'نقطة بيع',
            'موزع',
            pos.id,
          ],
        });
      });
    }

    // 4. Invoices (فواتير المبيعات والمرتجع - تظهر فقط لمن يملك صلاحية عرض الفواتير)
    if (canViewInvoices) {
      const allowedInvoices = assignedPOSIds
        ? invoices.filter((inv) => assignedPOSIds.has(inv.posPointId))
        : invoices;

      allowedInvoices.forEach((inv) => {
        const pos = posPoints.find((p) => p.id === inv.posPointId);
        const isReturn = inv.type === 'return';
        const itemsSummary =
          inv.items?.map((i) => `${i.quantity}x ${i.categoryName}`).join(', ') || '';

        const showAmount = canViewFinancialMetrics || isSuperAdmin;

        items.push({
          id: `inv-${inv.id}`,
          category: 'invoices',
          categoryLabel: isReturn ? 'فاتورة مرتجع' : 'فاتورة مبيعات',
          title: `فاتورة ${inv.invoiceNumber} (${isReturn ? 'مرتجع' : 'مبيعات'})`,
          subtitle: `العميل: ${pos?.name || 'مباشر'} | الأصناف: ${itemsSummary || 'كروت متنوعة'}`,
          amount: showAmount ? inv.totalWholesaleAmount || 0 : undefined,
          date: inv.date,
          badge: showAmount
            ? `${(inv.totalWholesaleAmount || 0).toLocaleString()} ${currencySymbol}`
            : `${inv.totalQuantity || 0} كرت`,
          badgeColor: isReturn
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: <FileText className={`w-4 h-4 ${isReturn ? 'text-rose-400' : 'text-blue-400'}`} />,
          action: () => {
            if (canPrintInvoice && onOpenInvoiceReceipt) {
              onOpenInvoiceReceipt(inv);
            } else {
              onNavigate('invoices');
            }
            onClose();
          },
          keywords: [
            inv.invoiceNumber,
            pos?.name || '',
            inv.date,
            itemsSummary,
            inv.notes || '',
            isReturn ? 'مرتجع' : 'مبيعات',
            'فاتورة',
            inv.id,
          ],
        });
      });
    }

    // 5. Card Categories (فئات الكروت - تظهر فقط لمن يملك صلاحية عرض الفئات)
    if (canViewCategories) {
      categories.forEach((cat) => {
        items.push({
          id: `cat-${cat.id}`,
          category: 'categories',
          categoryLabel: 'فئة كروت',
          title: cat.name,
          subtitle: `سعر الجملة: ${(cat.wholesalePrice ?? 0).toLocaleString()} ${currencySymbol} | سعر البيع: ${(cat.retailPrice ?? 0).toLocaleString()} ${currencySymbol} | الرصيد: ${(cat.warehouseStock ?? 0).toLocaleString()} كرت`,
          amount: cat.retailPrice,
          badge: `${(cat.warehouseStock ?? 0).toLocaleString()} بالمستودع`,
          badgeColor:
            (cat.warehouseStock ?? 0) < 50
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Layers className="w-4 h-4 text-purple-400" />,
          action: () => {
            onNavigate('categories');
            onClose();
          },
          keywords: [
            cat.name,
            cat.description || '',
            `${cat.wholesalePrice || 0}`,
            `${cat.retailPrice || 0}`,
            cat.validity || '',
            cat.profileName || '',
            'كروت',
            'فئة',
            cat.id,
          ],
        });
      });
    }

    // 6. Payment Receipts (سندات القبض - تظهر فقط لمن يملك صلاحية عرض سندات القبض)
    if (canViewPayments) {
      const allowedPayments = assignedPOSIds
        ? payments.filter((pay) => assignedPOSIds.has(pay.posPointId))
        : payments;

      allowedPayments.forEach((pay) => {
        const pos = posPoints.find((p) => p.id === pay.posPointId);
        items.push({
          id: `pay-${pay.id}`,
          category: 'payments',
          categoryLabel: 'سند قبض',
          title: `سند قبض ${pay.referenceNumber || pay.id}`,
          subtitle: `الموزع: ${pos?.name || 'غير محدد'} | طريقة السداد: ${
            pay.paymentMethod === 'cash'
              ? 'نقدي'
              : pay.paymentMethod === 'bank'
              ? 'حساب بنكي'
              : 'حوالة'
          } | ${pay.notes || ''}`,
          amount: pay.amount || 0,
          date: pay.date,
          badge: `${(pay.amount || 0).toLocaleString()} ${currencySymbol}`,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
          action: () => {
            if (canPrintPayment && onOpenPaymentReceipt) {
              onOpenPaymentReceipt(pay);
            } else {
              onNavigate('payments');
            }
            onClose();
          },
          keywords: [
            pay.referenceNumber || '',
            pay.id,
            pos?.name || '',
            pay.date,
            pay.notes || '',
            'سند قبض',
            'سداد',
            `${pay.amount}`,
          ],
        });
      });
    }

    // 7. Expenses (سندات الصرف والمصروفات - تظهر فقط وفقط لمن يملك صلاحية عرض المصروفات)
    if (canViewExpenses) {
      expenses.forEach((exp) => {
        items.push({
          id: `exp-${exp.id}`,
          category: 'expenses',
          categoryLabel: 'سند صرف',
          title: `سند صرف ${exp.voucherNumber || exp.id} - ${exp.title}`,
          subtitle: `الفئة: ${exp.categoryName || 'مصروفات'} | المستلم: ${
            exp.recipientName || 'غير محدد'
          } | ${exp.notes || ''}`,
          amount: exp.amount || 0,
          date: exp.date,
          badge: `${(exp.amount || 0).toLocaleString()} ${currencySymbol}`,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: <Receipt className="w-4 h-4 text-rose-400" />,
          action: () => {
            if (canPrintExpense && onOpenExpenseReceipt) {
              onOpenExpenseReceipt(exp);
            } else {
              onNavigate('expenses');
            }
            onClose();
          },
          keywords: [
            exp.voucherNumber || '',
            exp.title,
            exp.recipientName || '',
            exp.categoryName || '',
            exp.date,
            exp.notes || '',
            'مصروف',
            'سند صرف',
            `${exp.amount}`,
          ],
        });
      });
    }

    // 8. Card Dispatches (تسليم الدفعات - يظهر للمخولين)
    if (canViewPOS || canViewCategories || canViewInvoices) {
      const allowedDispatches = assignedPOSIds
        ? dispatches.filter((dsp) => assignedPOSIds.has(dsp.posPointId))
        : dispatches;

      allowedDispatches.forEach((dsp) => {
        const pos = posPoints.find((p) => p.id === dsp.posPointId);
        items.push({
          id: `dsp-${dsp.id}`,
          category: 'dispatches',
          categoryLabel: 'ترحيل كروت',
          title: `دفعة كروت ${dsp.code || dsp.id}`,
          subtitle: `المستلم: ${pos?.name || 'غير محدد'} | الكمية: ${
            dsp.totalCardsCount || dsp.quantity || 0
          } كرت | القيمة: ${(
            dsp.totalWholesaleValue ||
            dsp.totalAmount ||
            0
          ).toLocaleString()} ${currencySymbol}`,
          date: dsp.date,
          badge: `${dsp.totalCardsCount || dsp.quantity || 0} كرت`,
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          icon: <Truck className="w-4 h-4 text-cyan-400" />,
          action: () => {
            onNavigate('dispatches');
            onClose();
          },
          keywords: [
            dsp.code || '',
            dsp.id,
            pos?.name || '',
            dsp.date,
            'دفعة',
            'تسليم',
            'ترحيل',
          ],
        });
      });
    }

    return items;
  }, [
    categories,
    posPoints,
    invoices,
    expenses,
    payments,
    dispatches,
    currencySymbol,
    activeUser,
  activeTenant,
    onNavigate,
    onOpenInvoiceReceipt,
    onOpenPaymentReceipt,
    onOpenExpenseReceipt,
    onOpenPOSStatement,
    onOpenQuickSale,
    onOpenQuickPayment,
    onOpenAI,
    onOpenSettings,
    onOpenIncomeStatement,
    onOpenFinancialExport,
    onOpenLogin,
    onToggleTheme,
    settings?.themeMode,
    onClose,
  ]);

  // Filter items according to search query and category tab
  const filteredResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    return allSearchItems.filter((item) => {
      // 1. Filter Category Check
      if (selectedFilter !== 'all' && item.category !== selectedFilter) {
        return false;
      }

      // 2. Query Search Check
      if (!trimmed) {
        // When empty, show all items of the selected category, or high priority quick actions & nav
        return selectedFilter === 'all'
          ? item.category === 'actions' || item.category === 'nav'
          : true;
      }

      // Check keywords
      const matchInKeywords = (item.keywords || []).some((k) =>
        (k || '').toLowerCase().includes(trimmed)
      );

      return (
        matchInKeywords ||
        (item.title || '').toLowerCase().includes(trimmed) ||
        (item.subtitle && (item.subtitle || '').toLowerCase().includes(trimmed)) ||
        (item.badge && (item.badge || '').toLowerCase().includes(trimmed))
      );
    });
  }, [allSearchItems, query, selectedFilter]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredResults.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector(
        `[data-search-index="${selectedIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<SearchCategory, number> = {
      all: 0,
      nav: 0,
      invoices: 0,
      pos: 0,
      categories: 0,
      payments: 0,
      expenses: 0,
      dispatches: 0,
      actions: 0,
    };

    const trimmed = query.trim().toLowerCase();

    allSearchItems.forEach((item) => {
      let matches = true;
      if (trimmed) {
        matches =
          (item.keywords || []).some((k) => (k || '').toLowerCase().includes(trimmed)) ||
          (item.title || '').toLowerCase().includes(trimmed) ||
          (item.subtitle ? (item.subtitle || '').toLowerCase().includes(trimmed) : false);
      }
      if (matches) {
        counts.all++;
        if (counts[item.category] !== undefined) {
          counts[item.category]++;
        }
      }
    });

    return counts;
  }, [allSearchItems, query]);

  if (!isOpen) return null;

  // Build filter tabs dynamically based on user permissions & available results
  const canViewInvoices = hasPermission(activeUser, 'invoices', 'view', activeTenant);
  const canViewPOS = hasPermission(activeUser, 'pos', 'view', activeTenant);
  const canViewCategories = hasPermission(activeUser, 'categories', 'view', activeTenant);
  const canViewPayments = hasPermission(activeUser, 'payments', 'view', activeTenant);
  const canViewExpenses = hasPermission(activeUser, 'expenses', 'view', activeTenant);
  const canViewDispatches = canViewPOS || canViewCategories || canViewInvoices;

  const filterTabs: { id: SearchCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'الكل', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'actions', label: 'الإجراءات', icon: <PlusCircle className="w-3.5 h-3.5" /> },
    { id: 'nav', label: 'الشاشات', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  ];

  if (canViewPOS) {
    filterTabs.push({ id: 'pos', label: 'نقاط البيع', icon: <Store className="w-3.5 h-3.5" /> });
  }
  if (canViewInvoices) {
    filterTabs.push({ id: 'invoices', label: 'الفواتير', icon: <FileText className="w-3.5 h-3.5" /> });
  }
  if (canViewCategories) {
    filterTabs.push({ id: 'categories', label: 'الكروت', icon: <Layers className="w-3.5 h-3.5" /> });
  }
  if (canViewPayments) {
    filterTabs.push({ id: 'payments', label: 'سندات القبض', icon: <DollarSign className="w-3.5 h-3.5" /> });
  }
  if (canViewExpenses) {
    filterTabs.push({ id: 'expenses', label: 'المصروفات', icon: <Receipt className="w-3.5 h-3.5" /> });
  }
  if (canViewDispatches) {
    filterTabs.push({ id: 'dispatches', label: 'الترحيل', icon: <Truck className="w-3.5 h-3.5" /> });
  }

  const roleMeta = activeUser?.role ? ROLE_DEFINITIONS[activeUser.role] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-14 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-right"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Bar */}
        <div className="relative p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ابحث في كل النظام (اسم نقطة، رقم فاتورة، سند قبض، مصروف، فئة كروت، أو أمر سريع)..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none pr-1 pl-10"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="px-2 py-1 text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 transition shrink-0"
            title="إغلاق (Esc)"
          >
            ESC
          </button>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 p-2 px-3 sm:px-4 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto no-scrollbar text-xs">
          {filterTabs.map((tab) => {
            const count = categoryCounts[tab.id] || 0;
            const isSelected = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedFilter(tab.id);
                  setSelectedIndex(0);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                    isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 custom-scrollbar"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">
                لا توجد نتائج مطابقة لـ "{query}"
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                جرّب البحث باسم نقطة بيع أخرى، أو رقم الفاتورة، أو اختر تصنيفاً آخر من الفلاتر بالأعلى.
              </p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-search-index={index}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group relative p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                      : 'bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/80'
                  }`}
                >
                  {/* Left (Start RTL): Icon & Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {item.categoryLabel}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {highlightMatch(item.title, query)}
                        </h4>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {highlightMatch(item.subtitle, query)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right (End RTL): Date / Amount / Navigation hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.date && (
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        {item.date}
                      </span>
                    )}

                    <div
                      className={`p-1.5 rounded-lg border transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700 group-hover:text-white group-hover:bg-slate-700'
                      }`}
                      title="فتح"
                    >
                      <ChevronRight className="w-4 h-4 transform rotate-180" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Search Modal Footer */}
        <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-300">↓</kbd>
              <span>للتنقل</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-300">↵</kbd>
              <span>للفتح</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-300">ESC</kbd>
              <span>للإغلاق</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {activeUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>المستخدم:</span>
                <strong className="text-white font-medium">{activeUser.name}</strong>
                <span className={`px-1 rounded text-[9px] ${roleMeta?.bgLight || 'bg-slate-700'} ${roleMeta?.color || 'text-slate-300'}`}>
                  {roleMeta?.badge || activeUser.role}
                </span>
                <Lock className="w-2.5 h-2.5 text-emerald-400 ml-0.5" title="النتائج مفلترة حسب الصلاحيات الممنوحة" />
              </span>
            )}
            <span className="text-slate-400 font-medium">
              النتائج المتاحة: <strong className="text-indigo-400 font-mono">{filteredResults.length}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to highlight matched text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text || '';
  if (!query || !query.trim()) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        (part || '').toLowerCase() === (query.trim() || '').toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-400/30 text-amber-200 rounded px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
