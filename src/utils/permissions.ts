import {
  AppUser,
  UserPermissions,
  UserRole,
  DashboardPermissions,
  InvoicesPermissions,
  OrdersPermissions,
  ExpensesPermissions,
  PaymentsPermissions,
  POSPermissions,
  CategoriesPermissions,
  MikrotikPermissions,
  UsersAndPermissionsModulePermissions,
  SettingsPermissions,
} from '../types';

// ========================================================
// Role Definitions & Visual Styling
// ========================================================

export interface RoleMeta {
  role: UserRole;
  title: string;
  badge: string;
  description: string;
  color: string;
  bgLight: string;
  borderLight: string;
  icon: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleMeta> = {
  super_admin: {
    role: 'super_admin',
    title: 'المدير العام (Super Admin)',
    badge: 'مدير عام',
    description: 'صلاحيات كاملة وغير مقيدة على كافة أقسام النظام والشبكة والإعدادات والمستخدمين.',
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderLight: 'border-purple-500/30',
    icon: 'ShieldCheck',
  },
  accountant: {
    role: 'accountant',
    title: 'المحاسب المالي (Accountant)',
    badge: 'محاسب مالي',
    description: 'إدارة الفواتير، المصروفات، سندات القبض، كشوفات الحساب، وتقارير صافي الأرباح.',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderLight: 'border-indigo-500/30',
    icon: 'DollarSign',
  },
  sales_agent: {
    role: 'sales_agent',
    title: 'مندوب التوزيع والمبيعات (Sales Agent)',
    badge: 'مندوب توزيع',
    description: 'توزيع الكروت، تحصيل المبالغ من الموزعين، وتسجيل فواتير المبيعات وسندات القبض.',
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    borderLight: 'border-cyan-500/30',
    icon: 'Truck',
  },
  cashier: {
    role: 'cashier',
    title: 'أمين الصندوق (Cashier)',
    badge: 'أمين صندوق',
    description: 'تسجيل سندات القبض النقدية، فواتير البيع المباشر، وطباعة السندات الحرارية.',
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderLight: 'border-emerald-500/30',
    icon: 'Receipt',
  },
  network_admin: {
    role: 'network_admin',
    title: 'مسؤول الشبكات والمايكروتك (Network Admin)',
    badge: 'مسؤول شبكات',
    description: 'الربط براوتر المايكروتك، مراقبة المشتركين، توليد الكروت وسكربتات User Manager.',
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    borderLight: 'border-blue-500/30',
    icon: 'Activity',
  },
  pos_agent: {
    role: 'pos_agent',
    title: 'نقطة البيع والموزع (POS Agent)',
    badge: 'نقطة بيع',
    description: 'بوابة مخصصة لنقطة البيع لطلب دفعات الكروت، متابعة حالة الطلبات، والاطلاع على رصيد المديونية والسدادات.',
    color: 'text-teal-400',
    bgLight: 'bg-teal-500/10',
    borderLight: 'border-teal-500/30',
    icon: 'Store',
  },
  viewer: {
    role: 'viewer',
    title: 'مراقب ومدقق (Viewer / Auditor)',
    badge: 'مراقب ومدقق',
    description: 'الاطلاع على التقارير والجداول وطباعتها وتصديرها فقط دون إمكانية التعديل أو الحذف.',
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderLight: 'border-amber-500/30',
    icon: 'Eye',
  },
  custom: {
    role: 'custom',
    title: 'صلاحيات مخصصة (Custom)',
    badge: 'مخصص',
    description: 'تخصيص يدوي دقيق لكل شاشة وحقل فرعي بما يناسب المهام الموكلة للمستخدم.',
    color: 'text-slate-300',
    bgLight: 'bg-slate-500/10',
    borderLight: 'border-slate-500/30',
    icon: 'Sliders',
  },
};

// ========================================================
// Factory Creators for Permissions
// ========================================================

export function createFullPermissions(): UserPermissions {
  return {
    dashboard: {
      view: true,
      viewFinancialMetrics: true,
      viewProfits: true,
      viewIncomeStatement: true,
      viewDebtsSummary: true,
      viewRevenueCharts: true,
      exportReports: true,
    },
    invoices: {
      view: true,
      createSaleInvoice: true,
      createReturnInvoice: true,
      editInvoice: true,
      cancelOrDeleteInvoice: true,
      printInvoice: true,
      viewCostAndProfit: true,
      exportInvoices: true,
    },
    orders: {
      view: true,
      createOrder: true,
      processOrder: true,
      rejectOrder: true,
      exportOrders: true,
    },
    expenses: {
      view: true,
      viewIncomeStatement: true,
      addExpense: true,
      editExpense: true,
      deleteExpense: true,
      manageCategories: true,
      printReceipt: true,
      printExpenseReport: true,
      printIncomeStatement: true,
    },
    payments: {
      view: true,
      addPayment: true,
      deletePayment: true,
      printReceipt: true,
      printPOSStatement: true,
      exportPayments: true,
    },
    pos: {
      view: true,
      addPOS: true,
      editPOS: true,
      deletePOS: true,
      quickDispatchCards: true,
      quickPayment: true,
      viewAccountStatement: true,
      exportPOSData: true,
    },
    categories: {
      view: true,
      addCategory: true,
      editCategory: true,
      editPrices: true,
      deleteCategory: true,
      generateVouchers: true,
      exportMikrotikScript: true,
      manageTemplates: true,
    },
    mikrotik: {
      view: true,
      disconnectUsers: true,
      editMikrotikConfig: true,
      viewLiveTraffic: true,
      rebootRouter: true,
    },
    usersAndPermissions: {
      view: true,
      addUser: true,
      editUser: true,
      deleteUser: true,
      changeUserRoles: true,
      switchActiveUser: true,
    },
    settings: {
      view: true,
      editNetworkProfile: true,
      backupAndRestore: true,
      resetDatabase: true,
      useAIAssistant: true,
    },
  };
}

export function createEmptyPermissions(): UserPermissions {
  return {
    dashboard: {
      view: false,
      viewFinancialMetrics: false,
      viewProfits: false,
      viewIncomeStatement: false,
      viewDebtsSummary: false,
      viewRevenueCharts: false,
      exportReports: false,
    },
    invoices: {
      view: false,
      createSaleInvoice: false,
      createReturnInvoice: false,
      editInvoice: false,
      cancelOrDeleteInvoice: false,
      printInvoice: false,
      viewCostAndProfit: false,
      exportInvoices: false,
    },
    orders: {
      view: false,
      createOrder: false,
      processOrder: false,
      rejectOrder: false,
      exportOrders: false,
    },
    expenses: {
      view: false,
      viewIncomeStatement: false,
      addExpense: false,
      editExpense: false,
      deleteExpense: false,
      manageCategories: false,
      printReceipt: false,
      printExpenseReport: false,
      printIncomeStatement: false,
    },
    payments: {
      view: false,
      addPayment: false,
      deletePayment: false,
      printReceipt: false,
      printPOSStatement: false,
      exportPayments: false,
    },
    pos: {
      view: false,
      addPOS: false,
      editPOS: false,
      deletePOS: false,
      quickDispatchCards: false,
      quickPayment: false,
      viewAccountStatement: false,
      exportPOSData: false,
    },
    categories: {
      view: false,
      addCategory: false,
      editCategory: false,
      editPrices: false,
      deleteCategory: false,
      generateVouchers: false,
      exportMikrotikScript: false,
      manageTemplates: false,
    },
    mikrotik: {
      view: false,
      disconnectUsers: false,
      editMikrotikConfig: false,
      viewLiveTraffic: false,
      rebootRouter: false,
    },
    usersAndPermissions: {
      view: false,
      addUser: false,
      editUser: false,
      deleteUser: false,
      changeUserRoles: false,
      switchActiveUser: false,
    },
    settings: {
      view: false,
      editNetworkProfile: false,
      backupAndRestore: false,
      resetDatabase: false,
      useAIAssistant: false,
    },
  };
}

export function getRoleDefaultPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'super_admin':
      return createFullPermissions();

    case 'accountant':
      return {
        dashboard: {
          view: true,
          viewFinancialMetrics: true,
          viewProfits: true,
          viewIncomeStatement: true,
          viewDebtsSummary: true,
          viewRevenueCharts: true,
          exportReports: true,
        },
        invoices: {
          view: true,
          createSaleInvoice: true,
          createReturnInvoice: true,
          editInvoice: true,
          cancelOrDeleteInvoice: true,
          printInvoice: true,
          viewCostAndProfit: true,
          exportInvoices: true,
        },
        orders: {
          view: true,
          createOrder: true,
          processOrder: true,
          rejectOrder: true,
          exportOrders: true,
        },
        expenses: {
          view: true,
          viewIncomeStatement: true,
          addExpense: true,
          editExpense: true,
          deleteExpense: true,
          manageCategories: true,
          printReceipt: true,
          printExpenseReport: true,
          printIncomeStatement: true,
        },
        payments: {
          view: true,
          addPayment: true,
          deletePayment: true,
          printReceipt: true,
          printPOSStatement: true,
          exportPayments: true,
        },
        pos: {
          view: true,
          addPOS: true,
          editPOS: true,
          deletePOS: false,
          quickDispatchCards: true,
          quickPayment: true,
          viewAccountStatement: true,
          exportPOSData: true,
        },
        categories: {
          view: true,
          addCategory: false,
          editCategory: false,
          editPrices: true,
          deleteCategory: false,
          generateVouchers: false,
          exportMikrotikScript: false,
          manageTemplates: false,
        },
        mikrotik: {
          view: false,
          disconnectUsers: false,
          editMikrotikConfig: false,
          viewLiveTraffic: false,
          rebootRouter: false,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: true,
          editNetworkProfile: false,
          backupAndRestore: true,
          resetDatabase: false,
          useAIAssistant: true,
        },
      };

    case 'sales_agent':
      return {
        dashboard: {
          view: true,
          viewFinancialMetrics: false,
          viewProfits: false,
          viewIncomeStatement: false,
          viewDebtsSummary: true,
          viewRevenueCharts: false,
          exportReports: false,
        },
        invoices: {
          view: true,
          createSaleInvoice: true,
          createReturnInvoice: true,
          editInvoice: false,
          cancelOrDeleteInvoice: false,
          printInvoice: true,
          viewCostAndProfit: false,
          exportInvoices: false,
        },
        orders: {
          view: true,
          createOrder: true,
          processOrder: true,
          rejectOrder: false,
          exportOrders: false,
        },
        expenses: {
          view: false,
          viewIncomeStatement: false,
          addExpense: false,
          editExpense: false,
          deleteExpense: false,
          manageCategories: false,
          printReceipt: false,
          printExpenseReport: false,
          printIncomeStatement: false,
        },
        payments: {
          view: true,
          addPayment: true,
          deletePayment: false,
          printReceipt: true,
          printPOSStatement: true,
          exportPayments: false,
        },
        pos: {
          view: true,
          addPOS: true,
          editPOS: false,
          deletePOS: false,
          quickDispatchCards: true,
          quickPayment: true,
          viewAccountStatement: true,
          exportPOSData: false,
        },
        categories: {
          view: true,
          addCategory: false,
          editCategory: false,
          editPrices: false,
          deleteCategory: false,
          generateVouchers: false,
          exportMikrotikScript: false,
          manageTemplates: false,
        },
        mikrotik: {
          view: false,
          disconnectUsers: false,
          editMikrotikConfig: false,
          viewLiveTraffic: false,
          rebootRouter: false,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: false,
          editNetworkProfile: false,
          backupAndRestore: false,
          resetDatabase: false,
          useAIAssistant: false,
        },
      };

    case 'pos_agent':
      return {
        dashboard: {
          view: false,
          viewFinancialMetrics: false,
          viewProfits: false,
          viewIncomeStatement: false,
          viewDebtsSummary: false,
          viewRevenueCharts: false,
          exportReports: false,
        },
        invoices: {
          view: false,
          createSaleInvoice: false,
          createReturnInvoice: false,
          editInvoice: false,
          cancelOrDeleteInvoice: false,
          printInvoice: true,
          viewCostAndProfit: false,
          exportInvoices: false,
        },
        orders: {
          view: true,
          createOrder: true,
          processOrder: false,
          rejectOrder: false,
          exportOrders: false,
        },
        expenses: {
          view: false,
          viewIncomeStatement: false,
          addExpense: false,
          editExpense: false,
          deleteExpense: false,
          manageCategories: false,
          printReceipt: false,
          printExpenseReport: false,
          printIncomeStatement: false,
        },
        payments: {
          view: false,
          addPayment: false,
          deletePayment: false,
          printReceipt: true,
          printPOSStatement: true,
          exportPayments: false,
        },
        pos: {
          view: true,
          addPOS: false,
          editPOS: false,
          deletePOS: false,
          quickDispatchCards: false,
          quickPayment: false,
          viewAccountStatement: true,
          exportPOSData: false,
        },
        categories: {
          view: true,
          addCategory: false,
          editCategory: false,
          editPrices: false,
          deleteCategory: false,
          generateVouchers: false,
          exportMikrotikScript: false,
          manageTemplates: false,
        },
        mikrotik: {
          view: false,
          disconnectUsers: false,
          editMikrotikConfig: false,
          viewLiveTraffic: false,
          rebootRouter: false,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: false,
          editNetworkProfile: false,
          backupAndRestore: false,
          resetDatabase: false,
          useAIAssistant: false,
        },
      };

    case 'cashier':
      return {
        dashboard: {
          view: false,
          viewFinancialMetrics: false,
          viewProfits: false,
          viewIncomeStatement: false,
          viewDebtsSummary: false,
          viewRevenueCharts: false,
          exportReports: false,
        },
        invoices: {
          view: true,
          createSaleInvoice: true,
          createReturnInvoice: false,
          editInvoice: false,
          cancelOrDeleteInvoice: false,
          printInvoice: true,
          viewCostAndProfit: false,
          exportInvoices: false,
        },
        orders: {
          view: true,
          createOrder: false,
          processOrder: false,
          rejectOrder: false,
          exportOrders: false,
        },
        expenses: {
          view: false,
          viewIncomeStatement: false,
          addExpense: false,
          editExpense: false,
          deleteExpense: false,
          manageCategories: false,
          printReceipt: false,
          printExpenseReport: false,
          printIncomeStatement: false,
        },
        payments: {
          view: true,
          addPayment: true,
          deletePayment: false,
          printReceipt: true,
          printPOSStatement: false,
          exportPayments: false,
        },
        pos: {
          view: true,
          addPOS: false,
          editPOS: false,
          deletePOS: false,
          quickDispatchCards: false,
          quickPayment: true,
          viewAccountStatement: true,
          exportPOSData: false,
        },
        categories: {
          view: true,
          addCategory: false,
          editCategory: false,
          editPrices: false,
          deleteCategory: false,
          generateVouchers: false,
          exportMikrotikScript: false,
          manageTemplates: false,
        },
        mikrotik: {
          view: false,
          disconnectUsers: false,
          editMikrotikConfig: false,
          viewLiveTraffic: false,
          rebootRouter: false,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: false,
          editNetworkProfile: false,
          backupAndRestore: false,
          resetDatabase: false,
          useAIAssistant: false,
        },
      };

    case 'network_admin':
      return {
        dashboard: {
          view: true,
          viewFinancialMetrics: false,
          viewProfits: false,
          viewIncomeStatement: false,
          viewDebtsSummary: false,
          viewRevenueCharts: true,
          exportReports: false,
        },
        invoices: {
          view: false,
          createSaleInvoice: false,
          createReturnInvoice: false,
          editInvoice: false,
          cancelOrDeleteInvoice: false,
          printInvoice: false,
          viewCostAndProfit: false,
          exportInvoices: false,
        },
        orders: {
          view: false,
          createOrder: false,
          processOrder: false,
          rejectOrder: false,
          exportOrders: false,
        },
        expenses: {
          view: false,
          viewIncomeStatement: false,
          addExpense: false,
          editExpense: false,
          deleteExpense: false,
          manageCategories: false,
          printReceipt: false,
          printExpenseReport: false,
          printIncomeStatement: false,
        },
        payments: {
          view: false,
          addPayment: false,
          deletePayment: false,
          printReceipt: false,
          printPOSStatement: false,
          exportPayments: false,
        },
        pos: {
          view: false,
          addPOS: false,
          editPOS: false,
          deletePOS: false,
          quickDispatchCards: false,
          quickPayment: false,
          viewAccountStatement: false,
          exportPOSData: false,
        },
        categories: {
          view: true,
          addCategory: true,
          editCategory: true,
          editPrices: false,
          deleteCategory: false,
          generateVouchers: true,
          exportMikrotikScript: true,
          manageTemplates: true,
        },
        mikrotik: {
          view: true,
          disconnectUsers: true,
          editMikrotikConfig: true,
          viewLiveTraffic: true,
          rebootRouter: true,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: true,
          editNetworkProfile: true,
          backupAndRestore: true,
          resetDatabase: false,
          useAIAssistant: true,
        },
      };

    case 'viewer':
      return {
        dashboard: {
          view: true,
          viewFinancialMetrics: true,
          viewProfits: false,
          viewIncomeStatement: true,
          viewDebtsSummary: true,
          viewRevenueCharts: true,
          exportReports: true,
        },
        invoices: {
          view: true,
          createSaleInvoice: false,
          createReturnInvoice: false,
          editInvoice: false,
          cancelOrDeleteInvoice: false,
          printInvoice: true,
          viewCostAndProfit: false,
          exportInvoices: true,
        },
        orders: {
          view: true,
          createOrder: false,
          processOrder: false,
          rejectOrder: false,
          exportOrders: true,
        },
        expenses: {
          view: true,
          viewIncomeStatement: true,
          addExpense: false,
          editExpense: false,
          deleteExpense: false,
          manageCategories: false,
          printReceipt: true,
          printExpenseReport: true,
          printIncomeStatement: true,
        },
        payments: {
          view: true,
          addPayment: false,
          deletePayment: false,
          printReceipt: true,
          printPOSStatement: true,
          exportPayments: true,
        },
        pos: {
          view: true,
          addPOS: false,
          editPOS: false,
          deletePOS: false,
          quickDispatchCards: false,
          quickPayment: false,
          viewAccountStatement: true,
          exportPOSData: true,
        },
        categories: {
          view: true,
          addCategory: false,
          editCategory: false,
          editPrices: false,
          deleteCategory: false,
          generateVouchers: false,
          exportMikrotikScript: false,
          manageTemplates: false,
        },
        mikrotik: {
          view: true,
          disconnectUsers: false,
          editMikrotikConfig: false,
          viewLiveTraffic: true,
          rebootRouter: false,
        },
        usersAndPermissions: {
          view: false,
          addUser: false,
          editUser: false,
          deleteUser: false,
          changeUserRoles: false,
          switchActiveUser: false,
        },
        settings: {
          view: false,
          editNetworkProfile: false,
          backupAndRestore: false,
          resetDatabase: false,
          useAIAssistant: false,
        },
      };

    case 'custom':
    default:
      return createEmptyPermissions();
  }
}

// ========================================================
// Granular Permission Matrix Definitions for UI
// ========================================================

export interface PermissionFieldMeta {
  key: string;
  label: string;
  description: string;
  isDanger?: boolean;
}

export interface PermissionModuleMeta {
  moduleId: keyof UserPermissions;
  title: string;
  description: string;
  iconName: string;
  color: string;
  fields: PermissionFieldMeta[];
}

export const PERMISSION_MODULES_CONFIG: PermissionModuleMeta[] = [
  {
    moduleId: 'dashboard',
    title: 'لوحة التحكم والتقارير المالية (Dashboard)',
    description: 'الاطلاع على المؤشرات العامة، حركة المبيعات، ومخططات الأداء.',
    iconName: 'LayoutDashboard',
    color: 'text-indigo-400',
    fields: [
      { key: 'view', label: 'الوصول للشاشة الرئيسية', description: 'السماح للمستخدم بالدخول لشاشة لوحة التحكم' },
      { key: 'viewFinancialMetrics', label: 'عرض مؤشرات المبيعات والتحصيل', description: 'رؤية إجمالي المبيعات، المرتجعات، والمقبوضات النقدية' },
      { key: 'viewProfits', label: 'عرض صافي الأرباح الحقيقية', description: 'إظهار هوامش الأرباح الحساسة للمالك والإدارة', isDanger: true },
      { key: 'viewIncomeStatement', label: 'عرض قائمة الدخل والتقرير المالي للأرباح والخسائر', description: 'استعراض الحساب الختامي الشامل والمقارن', isDanger: true },
      { key: 'viewDebtsSummary', label: 'عرض إجمالي مديونيات الموزعين', description: 'رؤية إجمالي الديون والمستحقات على نقاط التوزيع' },
      { key: 'viewRevenueCharts', label: 'استعراض الرسوم البيانية', description: 'عرض المنحنيات التحليلية للمبيعات والمصروفات' },
      { key: 'exportReports', label: 'تصدير التقارير المالية والإحصائية', description: 'تحميل التقارير بصيغة CSV و Excel' },
    ],
  },
  {
    moduleId: 'orders',
    title: 'طلبات وتوريد الكروت (Card Orders)',
    description: 'استقبال طلبات الكروت من نقاط البيع، تجهيزها، وترحيلها كفواتير تسليم.',
    iconName: 'ShoppingBag',
    color: 'text-teal-400',
    fields: [
      { key: 'view', label: 'عرض شاشة طلبات الكروت', description: 'الاطلاع على قائمة طلبات الكروت الواردة وحالاتها' },
      { key: 'createOrder', label: 'إنشاء وإرسال طلب كروت جديد', description: 'تقديم طلب كروت رسمي وتحديد الفئات والكميات' },
      { key: 'processOrder', label: 'الموافقة على الطلب وتجهيزه وتحويله لفاتورة', description: 'قبول الطلب وإنشاء فاتورة مبيعات وتسليم الكروت آلياً', isDanger: true },
      { key: 'rejectOrder', label: 'رفض أو إلغاء طلب الكروت', description: 'رفض الطلب مع إرسال سبب الرفض لصاحب نقطة البيع' },
      { key: 'exportOrders', label: 'تصدير وطباعة كشف الطلبات', description: 'تصدير سجل طلبات الكروت إلى ملف Excel أو طباعته' },
    ],
  },
  {
    moduleId: 'invoices',
    title: 'الفواتير والمبيعات والمرتجع (Invoices)',
    description: 'إصدار فواتير تسليم الكروت متعددة الفئات، المرتجعات، ومعالجة المخزون.',
    iconName: 'FileText',
    color: 'text-amber-400',
    fields: [
      { key: 'view', label: 'عرض قائمة الفواتير', description: 'الاطلاع على فواتير المبيعات والمرتجع السابقة' },
      { key: 'createSaleInvoice', label: 'إنشاء فاتورة مبيعات/تسليم كروت', description: 'إصدار فاتورة جديدة متعددة الأصناف لنقطة بيع' },
      { key: 'createReturnInvoice', label: 'تسجيل فاتورة مرتجع كروت', description: 'إعادة كروت غير مباعة لمخزن الشبكة وضبط الحساب' },
      { key: 'editInvoice', label: 'تعديل الفواتير', description: 'تعديل بنود وكميات وأسعار الفاتورة المسجلة' },
      { key: 'cancelOrDeleteInvoice', label: 'إلغاء وحذف الفواتير', description: 'إلغاء الفاتورة وإعادة ضبط أرصدة المخازن والديون', isDanger: true },
      { key: 'printInvoice', label: 'طباعة الفواتير الرسمية والحرارية', description: 'توليد فاتورة A4 وإيصال POS 80mm' },
      { key: 'viewCostAndProfit', label: 'رؤية أسعار التكلفة وصافي الأرباح', description: 'إظهار عمود التكلفة وربح كل صنف بالفاتورة', isDanger: true },
      { key: 'exportInvoices', label: 'تصدير سجل الفواتير', description: 'تصدير كشف الفواتير للطباعة أو Excel' },
    ],
  },
  {
    moduleId: 'expenses',
    title: 'المصروفات وقائمة الدخل (Expenses & Income Statement)',
    description: 'تسجيل نفقات الشبكة وقائمة الدخل الختامية للأرباح والخسائر.',
    iconName: 'Receipt',
    color: 'text-amber-400',
    fields: [
      { key: 'view', label: 'عرض جدول المصروفات', description: 'الاطلاع على سندات الصرف وبنود النفقات' },
      { key: 'viewIncomeStatement', label: 'استعراض قائمة الدخل الختامية', description: 'عرض جدول قائمة الدخل للأرباح ومجمل الربح والتكاليف', isDanger: true },
      { key: 'addExpense', label: 'إضافة سند صرف جديد', description: 'تسجيل نفقة جديدة وخصمها من أرباح الشبكة' },
      { key: 'editExpense', label: 'تعديل سندات الصرف', description: 'تعديل المبالغ والتصنيفات والبيانات' },
      { key: 'deleteExpense', label: 'حذف سندات الصرف', description: 'حذف السند وإعادة احتساب الأرباح', isDanger: true },
      { key: 'manageCategories', label: 'إدارة تصنيفات وبنود المصاريف', description: 'إضافة فئات مصاريف مخصصة وتعديلها' },
      { key: 'printReceipt', label: 'طباعة سند الصرف الفردي', description: 'طباعة السند بتنسيق A4 وحراري مع التواقيع' },
      { key: 'printExpenseReport', label: 'طباعة وتصدير تقرير المصروفات الشامل', description: 'توليد كشف مصاريف شامل حسب الفترة والتصنيف' },
      { key: 'printIncomeStatement', label: 'طباعة وتصدير قائمة الدخل الرسمية A4/PDF', description: 'توليد وثيقة قائمة الدخل والأرباح والخسائر الرسمية للمالك' },
    ],
  },
  {
    moduleId: 'payments',
    title: 'سندات القبض والتحصيلات (Payments)',
    description: 'توثيق المبالغ المالية المسددة من نقاط البيع وتخفيض مديونياتهم.',
    iconName: 'DollarSign',
    color: 'text-emerald-400',
    fields: [
      { key: 'view', label: 'عرض سجل سندات القبض', description: 'الاطلاع على جدول الدفعات والتحصيلات' },
      { key: 'addPayment', label: 'إضافة سند قبض وتحصيل جديد', description: 'قبض دفعة نقدية أو بنكية وتنزيلها من حساب الموزع' },
      { key: 'deletePayment', label: 'حذف سند قبض', description: 'إلغاء السند وإرجاع المديونية على الموزع', isDanger: true },
      { key: 'printReceipt', label: 'طباعة سند القبض (حراري ورسمي)', description: 'إصدار إيصال قبض فوري للموزع ومشاركته عبر واتساب' },
      { key: 'printPOSStatement', label: 'طباعة كشف حساب نقطة البيع', description: 'توليد كشف حساب تفصيلي وحراري للموزع' },
      { key: 'exportPayments', label: 'تصدير سجل التحصيلات', description: 'تصدير جدول السندات إلى CSV' },
    ],
  },
  {
    moduleId: 'pos',
    title: 'نقاط التوزيع والموزعين (POS Points)',
    description: 'إدارة الموزعين، المحلات، سقوف المديونية، والمتابعة المالية الميدانية.',
    iconName: 'Store',
    color: 'text-cyan-400',
    fields: [
      { key: 'view', label: 'عرض قائمة نقاط البيع', description: 'استعراض بيانات الموزعين والمديونيات وأرقام الهواتف' },
      { key: 'addPOS', label: 'إضافة نقطة بيع وموزع جديد', description: 'تسجيل سوبرماركت أو موزع في النظام' },
      { key: 'editPOS', label: 'تعديل بيانات الموزع وسقف الدين', description: 'تعديل الهاتف والعنوان وسقف المديونية المسموح به' },
      { key: 'deletePOS', label: 'حذف نقطة بيع', description: 'حذف نقطة البيع من النظام مع سجلاتها', isDanger: true },
      { key: 'quickDispatchCards', label: 'تسليم وتوريد كروت سريعة', description: 'زر التوريد السريع للدفعات' },
      { key: 'quickPayment', label: 'قبض دفعة سريعة من الموزع', description: 'زر السداد السريع المباشر من بطاقة الموزع' },
      { key: 'viewAccountStatement', label: 'استعراض كشف الحساب التفصيلي', description: 'معاينة حركة المبيعات والسدادات ورصيد الحساب' },
      { key: 'exportPOSData', label: 'تصدير بيانات الموزعين', description: 'تصدير قائمة نقاط البيع مع أرصدة المديونية' },
    ],
  },
  {
    moduleId: 'categories',
    title: 'فئات الكروت والطباعة والمخزون (Card Categories)',
    description: 'إعداد باقات الكروت، أسعار الجملة والتجزئة، بروفايلات المايكروتك، وتوليد القوالب.',
    iconName: 'Layers',
    color: 'text-blue-400',
    fields: [
      { key: 'view', label: 'عرض فئات الكروت والمخزون', description: 'استعراض أسعار الفئات ورصيد المخزن المتاح' },
      { key: 'addCategory', label: 'إضافة فئة كروت جديدة', description: 'إنشاء باقة جديدة بوقت وحجم محدد' },
      { key: 'editCategory', label: 'تعديل الفئات والمواصفات', description: 'تعديل اسم الفئة، الباندويث، والمحدوديات' },
      { key: 'editPrices', label: 'تعديل أسعار التكلفة والجملة والتجزئة', description: 'التحكم بالأسعار وهوامش الربح', isDanger: true },
      { key: 'deleteCategory', label: 'حذف فئة كروت', description: 'حذف الفئة من النظام ومخزن الكروت', isDanger: true },
      { key: 'generateVouchers', label: 'توليد وطباعة الكروت A4 وحراري', description: 'توليد أرقام وسيريالات الكروت وطباعتها' },
      { key: 'exportMikrotikScript', label: 'تصدير سكربتات المايكروتك و User Manager', description: 'توليد أوامر Terminal لإضافتها بالراوتر' },
      { key: 'manageTemplates', label: 'تصميم وإدارة قوالب الكروت', description: 'تخصيص خلفيات وشعارات وقوالب الطباعة' },
    ],
  },
  {
    moduleId: 'mikrotik',
    title: 'المايكروتك والمشتركين المباشر (MikroTik Live)',
    description: 'المراقبة الحية لراوتر المايكروتك، المشتركين النشطين، والباندويث.',
    iconName: 'Activity',
    color: 'text-emerald-400',
    fields: [
      { key: 'view', label: 'عرض مركز المايكروتك المباشر', description: 'استعراض المتصلين وحالة استهلاك الموارد' },
      { key: 'disconnectUsers', label: 'فصل وطرد المشتركين النشطين', description: 'إنهاء جلسة المستخدمين من الهوتسبوت' },
      { key: 'editMikrotikConfig', label: 'تعديل بيانات وإعدادات الاتصال بالراوتر', description: 'تغيير عنوان IP ومنفذ وكلمة مرور الراوتر', isDanger: true },
      { key: 'viewLiveTraffic', label: 'مراقبة حركة الباندويث والمنافذ', description: 'عرض الرسوم الحية لمعدل الرفع والتنزيل' },
      { key: 'rebootRouter', label: 'إعادة تشغيل الراوتر عن بعد', description: 'إرسال أمر Reboot لراوتر المايكروتك', isDanger: true },
    ],
  },
  {
    moduleId: 'usersAndPermissions',
    title: 'إدارة المستخدمين والصلاحيات (Users & RBAC)',
    description: 'إضافة موظفي النظام، إنشاء الأدوار، وتخصيص الصلاحيات الدقيقة.',
    iconName: 'ShieldCheck',
    color: 'text-purple-400',
    fields: [
      { key: 'view', label: 'عرض شاشة المستخدمين والصلاحيات', description: 'الاطلاع على مستخدمي النظام وأدوارهم' },
      { key: 'addUser', label: 'إضافة مستخدم جديد', description: 'إنشاء حساب موظف أو مندوب وتعيين صلاحياته' },
      { key: 'editUser', label: 'تعديل بيانات وصلاحيات المستخدمين', description: 'تغيير الصلاحيات، كلمات المرور، والحالة', isDanger: true },
      { key: 'deleteUser', label: 'حذف أو تجميد مستخدم', description: 'إيقاف حساب أو حذفه نهائياً من النظام', isDanger: true },
      { key: 'changeUserRoles', label: 'تطبيق وتغيير قوالب الأدوار الجاهزة', description: 'تطبيق قوالب المحاسب أو المندوب بنقرة واحدة' },
      { key: 'switchActiveUser', label: 'التبديل وتجربة المستخدمين (Simulator)', description: 'التبديل بين الحسابات لاختبار الصلاحيات الحقيقية' },
    ],
  },
  {
    moduleId: 'settings',
    title: 'الإعدادات العامة والذكاء الاصطناعي (Settings & AI)',
    description: 'هوية الشبكة، أرقام الدعم، النسخ الاحتياطي، والمساعد الذكي.',
    iconName: 'Settings',
    color: 'text-slate-400',
    fields: [
      { key: 'view', label: 'فتح نافذة إعدادات النظام', description: 'استعراض الإعدادات العامة للشبكة' },
      { key: 'editNetworkProfile', label: 'تعديل اسم وشعار وبيانات الشبكة', description: 'تحديث هوية الشبكة وأرقام الواتساب والدعم' },
      { key: 'backupAndRestore', label: 'النسخ الاحتياطي واستعادة البيانات', description: 'تصدير نسخة كاملة من النظام واسترجاعها' },
      { key: 'resetDatabase', label: 'تصفير وإعادة ضبط قاعدة البيانات', description: 'حذف كافة البيانات وإعادتها للوضع الافتراضي', isDanger: true },
      { key: 'useAIAssistant', label: 'استخدام المساعد الذكي AI', description: 'طرح الاستفسارات والتحليلات عبر الذكاء الاصطناعي' },
    ],
  },
];

// ========================================================
// Helper Functions for Permission Check & Count
// ========================================================

export function hasPermission(
  user: AppUser | null | undefined,
  module: keyof UserPermissions,
  action?: string
): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  const modulePerms = user.permissions?.[module];
  if (!modulePerms) return false;

  if (!action) {
    return Boolean((modulePerms as any).view);
  }

  return Boolean((modulePerms as any)[action]);
}

export function countPermissions(permissions: UserPermissions | undefined): {
  granted: number;
  total: number;
  percentage: number;
} {
  if (!permissions) return { granted: 0, total: 0, percentage: 0 };

  let granted = 0;
  let total = 0;

  PERMISSION_MODULES_CONFIG.forEach((mod) => {
    const modPerms = permissions[mod.moduleId] as unknown as Record<string, boolean> | undefined;
    mod.fields.forEach((field) => {
      total++;
      if (modPerms && modPerms[field.key]) {
        granted++;
      }
    });
  });

  const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;
  return { granted, total, percentage };
}

/**
 * Determine the best default landing view for a user based on their role and granted permissions.
 */
export function getDefaultLandingViewForUser(user: AppUser | null | undefined): 'dashboard' | 'orders' | 'pos_portal' | 'invoices' | 'expenses' | 'payments' | 'pos' | 'categories' | 'mikrotik' | 'users' {
  if (!user) return 'invoices';

  // Super admin defaults to dashboard
  if (user.role === 'super_admin') {
    return 'dashboard';
  }

  // POS Agent defaults to POS portal
  if (user.role === 'pos_agent') {
    return 'pos_portal';
  }

  // Accountant: prefers dashboard if permitted, or invoices
  if (user.role === 'accountant') {
    if (hasPermission(user, 'dashboard', 'view')) return 'dashboard';
    if (hasPermission(user, 'orders', 'view')) return 'orders';
    if (hasPermission(user, 'invoices', 'view')) return 'invoices';
    if (hasPermission(user, 'expenses', 'view')) return 'expenses';
    if (hasPermission(user, 'payments', 'view')) return 'payments';
  }

  // Sales Agent: prefers orders or pos points
  if (user.role === 'sales_agent') {
    if (hasPermission(user, 'orders', 'view')) return 'orders';
    if (hasPermission(user, 'invoices', 'view')) return 'invoices';
    if (hasPermission(user, 'pos', 'view')) return 'pos';
    if (hasPermission(user, 'payments', 'view')) return 'payments';
  }

  // Cashier: prefers invoices or payments
  if (user.role === 'cashier') {
    if (hasPermission(user, 'invoices', 'view')) return 'invoices';
    if (hasPermission(user, 'orders', 'view')) return 'orders';
    if (hasPermission(user, 'payments', 'view')) return 'payments';
    if (hasPermission(user, 'pos', 'view')) return 'pos';
  }

  // Network Admin: prefers mikrotik or categories
  if (user.role === 'network_admin') {
    if (hasPermission(user, 'mikrotik', 'view')) return 'mikrotik';
    if (hasPermission(user, 'categories', 'view')) return 'categories';
    if (hasPermission(user, 'dashboard', 'view')) return 'dashboard';
  }

  // Viewer: prefers dashboard or invoices
  if (user.role === 'viewer') {
    if (hasPermission(user, 'dashboard', 'view')) return 'dashboard';
    if (hasPermission(user, 'orders', 'view')) return 'orders';
    if (hasPermission(user, 'invoices', 'view')) return 'invoices';
  }

  // Priority check for any other role or custom permissions
  const checkOrder: Array<{ module: keyof UserPermissions; view: 'dashboard' | 'orders' | 'pos_portal' | 'invoices' | 'expenses' | 'payments' | 'pos' | 'categories' | 'mikrotik' | 'users' }> = [
    { module: 'dashboard', view: 'dashboard' },
    { module: 'orders', view: 'orders' },
    { module: 'invoices', view: 'invoices' },
    { module: 'payments', view: 'payments' },
    { module: 'pos', view: 'pos' },
    { module: 'expenses', view: 'expenses' },
    { module: 'categories', view: 'categories' },
    { module: 'mikrotik', view: 'mikrotik' },
    { module: 'usersAndPermissions', view: 'users' },
  ];

  for (const item of checkOrder) {
    if (hasPermission(user, item.module, 'view')) {
      return item.view;
    }
  }

  return 'invoices';
}

export function getViewNameArabic(view: string): string {
  const names: Record<string, string> = {
    dashboard: 'لوحة التحكم الشاملة',
    orders: 'طلبات وتوريد الكروت',
    pos_portal: 'بوابة نقطة البيع والموزع',
    invoices: 'شاشة الفواتير والمبيعات',
    expenses: 'المصروفات والمصاريف التشغيلية',
    payments: 'سندات القبض والتحصيلات',
    pos: 'نقاط التوزيع والموزعين',
    categories: 'فئات الكروت والطباعة والمخزون',
    mikrotik: 'المايكروتك والمشتركين المباشر',
    users: 'إدارة المستخدمين والصلاحيات',
    sales: 'المبيعات',
    dispatches: 'تسليم الدفعات',
  };
  return names[view] || view;
}
