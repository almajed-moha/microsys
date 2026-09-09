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
  TenantAllowedModule,
  NetworkTenant,
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
  system_owner: {
    role: 'system_owner',
    title: 'مالك النظام (System Owner)',
    badge: 'مالك النظام',
    description: 'صلاحيات عليا للتحكم بالشبكات (Tenants) وإضافة مدراء للشبكات.',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderLight: 'border-indigo-500/30',
    icon: 'Server',
  },
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
      deleteOrder: true,
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
          viewSessions: true,
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
    systemTenants: {
      view: true,
      manage: true,
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
      deleteOrder: false,
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
          viewSessions: false,
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
    systemTenants: {
      view: false,
      manage: false,
    },
  };
}

export function getRoleDefaultPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'system_owner':
      return createFullPermissions();

    case 'super_admin':
      const perms = createFullPermissions();
      perms.systemTenants = { view: false, manage: false };
      return perms;

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
          deleteOrder: true,
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
          viewSessions: false,
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
          deleteOrder: false,
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
          viewSessions: false,
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
          deleteOrder: false,
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
          viewSessions: false,
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
          deleteOrder: false,
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
          viewSessions: false,
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
          deleteOrder: false,
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
          viewSessions: true,
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
          deleteOrder: false,
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
          viewSessions: true,
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
  actionType?: 'read' | 'add' | 'edit' | 'delete' | 'special';
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
      { key: 'view', label: 'الوصول للشاشة الرئيسية', description: 'السماح للمستخدم بالدخول لشاشة لوحة التحكم', actionType: 'read' },
      { key: 'viewFinancialMetrics', label: 'عرض مؤشرات المبيعات والتحصيل', description: 'رؤية إجمالي المبيعات، المرتجعات، والمقبوضات النقدية', actionType: 'read' },
      { key: 'viewProfits', label: 'عرض صافي الأرباح الحقيقية', description: 'إظهار هوامش الأرباح الحساسة للمالك والإدارة', isDanger: true, actionType: 'read' },
      { key: 'viewIncomeStatement', label: 'عرض قائمة الدخل والتقرير المالي للأرباح والخسائر', description: 'استعراض الحساب الختامي الشامل والمقارن', isDanger: true, actionType: 'read' },
      { key: 'viewDebtsSummary', label: 'عرض إجمالي مديونيات الموزعين', description: 'رؤية إجمالي الديون والمستحقات على نقاط التوزيع', actionType: 'read' },
      { key: 'viewRevenueCharts', label: 'استعراض الرسوم البيانية', description: 'عرض المنحنيات التحليلية للمبيعات والمصروفات', actionType: 'read' },
      { key: 'exportReports', label: 'تصدير التقارير المالية والإحصائية', description: 'تحميل التقارير بصيغة CSV و Excel', actionType: 'special' },
    ],
  },
  {
    moduleId: 'orders',
    title: 'طلبات وتوريد الكروت (Card Orders)',
    description: 'استقبال طلبات الكروت من نقاط البيع، تجهيزها، وترحيلها كفواتير تسليم.',
    iconName: 'ShoppingBag',
    color: 'text-teal-400',
    fields: [
      { key: 'view', label: 'عرض شاشة طلبات الكروت', description: 'الاطلاع على قائمة طلبات الكروت الواردة وحالاتها', actionType: 'read' },
      { key: 'createOrder', label: 'إنشاء وإرسال طلب كروت جديد', description: 'تقديم طلب كروت رسمي وتحديد الفئات والكميات', actionType: 'add' },
      { key: 'processOrder', label: 'الموافقة على الطلب وتجهيزه وتحويله لفاتورة', description: 'قبول الطلب وإنشاء فاتورة مبيعات وتسليم الكروت آلياً', isDanger: true, actionType: 'edit' },
      { key: 'rejectOrder', label: 'رفض أو إلغاء طلب الكروت', description: 'رفض الطلب مع إرسال سبب الرفض لصاحب نقطة البيع', actionType: 'delete' },
      { key: 'exportOrders', label: 'تصدير وطباعة كشف الطلبات', description: 'تصدير سجل طلبات الكروت إلى ملف Excel أو طباعته', actionType: 'special' },
    ],
  },
  {
    moduleId: 'invoices',
    title: 'الفواتير والمبيعات والمرتجع (Invoices)',
    description: 'إصدار فواتير تسليم الكروت متعددة الفئات، المرتجعات، ومعالجة المخزون.',
    iconName: 'FileText',
    color: 'text-amber-400',
    fields: [
      { key: 'view', label: 'عرض قائمة الفواتير', description: 'الاطلاع على فواتير المبيعات والمرتجع السابقة', actionType: 'read' },
      { key: 'createSaleInvoice', label: 'إنشاء فاتورة مبيعات/تسليم كروت', description: 'إصدار فاتورة جديدة متعددة الأصناف لنقطة بيع', actionType: 'add' },
      { key: 'createReturnInvoice', label: 'تسجيل فاتورة مرتجع كروت', description: 'إعادة كروت غير مباعة لمخزن الشبكة وضبط الحساب', actionType: 'add' },
      { key: 'editInvoice', label: 'تعديل الفواتير', description: 'تعديل بنود وكميات وأسعار الفاتورة المسجلة', actionType: 'edit' },
      { key: 'cancelOrDeleteInvoice', label: 'إلغاء وحذف الفواتير', description: 'إلغاء الفاتورة وإعادة ضبط أرصدة المخازن والديون', isDanger: true, actionType: 'delete' },
      { key: 'printInvoice', label: 'طباعة الفواتير الرسمية والحرارية', description: 'توليد فاتورة A4 وإيصال POS 80mm', actionType: 'special' },
      { key: 'viewCostAndProfit', label: 'رؤية أسعار التكلفة وصافي الأرباح', description: 'إظهار عمود التكلفة وربح كل صنف بالفاتورة', isDanger: true, actionType: 'read' },
      { key: 'exportInvoices', label: 'تصدير سجل الفواتير', description: 'تصدير كشف الفواتير للطباعة أو Excel', actionType: 'special' },
    ],
  },
  {
    moduleId: 'expenses',
    title: 'المصروفات وقائمة الدخل (Expenses & Income Statement)',
    description: 'تسجيل نفقات الشبكة وقائمة الدخل الختامية للأرباح والخسائر.',
    iconName: 'Receipt',
    color: 'text-amber-400',
    fields: [
      { key: 'view', label: 'عرض جدول المصروفات', description: 'الاطلاع على سندات الصرف وبنود النفقات', actionType: 'read' },
      { key: 'viewIncomeStatement', label: 'استعراض قائمة الدخل الختامية', description: 'عرض جدول قائمة الدخل للأرباح ومجمل الربح والتكاليف', isDanger: true, actionType: 'read' },
      { key: 'addExpense', label: 'إضافة سند صرف جديد', description: 'تسجيل نفقة جديدة وخصمها من أرباح الشبكة', actionType: 'add' },
      { key: 'editExpense', label: 'تعديل سندات الصرف', description: 'تعديل المبالغ والتصنيفات والبيانات', actionType: 'edit' },
      { key: 'deleteExpense', label: 'حذف سندات الصرف', description: 'حذف السند وإعادة احتساب الأرباح', isDanger: true, actionType: 'delete' },
      { key: 'manageCategories', label: 'إدارة تصنيفات وبنود المصاريف', description: 'إضافة فئات مصاريف مخصصة وتعديلها', actionType: 'edit' },
      { key: 'printReceipt', label: 'طباعة سند الصرف الفردي', description: 'طباعة السند بتنسيق A4 وحراري مع التواقيع', actionType: 'special' },
      { key: 'printExpenseReport', label: 'طباعة وتصدير تقرير المصروفات الشامل', description: 'توليد كشف مصاريف شامل حسب الفترة والتصنيف', actionType: 'special' },
      { key: 'printIncomeStatement', label: 'طباعة وتصدير قائمة الدخل الرسمية A4/PDF', description: 'توليد وثيقة قائمة الدخل والأرباح والخسائر الرسمية للمالك', actionType: 'special' },
    ],
  },
  {
    moduleId: 'payments',
    title: 'سندات القبض والتحصيلات (Payments)',
    description: 'توثيق المبالغ المالية المسددة من نقاط البيع وتخفيض مديونياتهم.',
    iconName: 'DollarSign',
    color: 'text-emerald-400',
    fields: [
      { key: 'view', label: 'عرض سجل سندات القبض', description: 'الاطلاع على جدول الدفعات والتحصيلات', actionType: 'read' },
      { key: 'addPayment', label: 'إضافة سند قبض وتحصيل جديد', description: 'قبض دفعة نقدية أو بنكية وتنزيلها من حساب الموزع', actionType: 'add' },
      { key: 'deletePayment', label: 'حذف سند قبض', description: 'إلغاء السند وإرجاع المديونية على الموزع', isDanger: true, actionType: 'delete' },
      { key: 'printReceipt', label: 'طباعة سند القبض (حراري ورسمي)', description: 'إصدار إيصال قبض فوري للموزع ومشاركته عبر واتساب', actionType: 'special' },
      { key: 'printPOSStatement', label: 'طباعة كشف حساب نقطة البيع', description: 'توليد كشف حساب تفصيلي وحراري للموزع', actionType: 'special' },
      { key: 'exportPayments', label: 'تصدير سجل التحصيلات', description: 'تصدير جدول السندات إلى CSV', actionType: 'special' },
    ],
  },
  {
    moduleId: 'pos',
    title: 'نقاط التوزيع والموزعين (POS Points)',
    description: 'إدارة الموزعين، المحلات، سقوف المديونية، والمتابعة المالية الميدانية.',
    iconName: 'Store',
    color: 'text-cyan-400',
    fields: [
      { key: 'view', label: 'عرض قائمة نقاط البيع', description: 'استعراض بيانات الموزعين والمديونيات وأرقام الهواتف', actionType: 'read' },
      { key: 'addPOS', label: 'إضافة نقطة بيع وموزع جديد', description: 'تسجيل سوبرماركت أو موزع في النظام', actionType: 'add' },
      { key: 'editPOS', label: 'تعديل بيانات الموزع وسقف الدين', description: 'تعديل الهاتف والعنوان وسقف المديونية المسموح به', actionType: 'edit' },
      { key: 'deletePOS', label: 'حذف نقطة بيع', description: 'حذف نقطة البيع من النظام مع سجلاتها', isDanger: true, actionType: 'delete' },
      { key: 'quickDispatchCards', label: 'تسليم وتوريد كروت سريعة', description: 'زر التوريد السريع للدفعات', actionType: 'special' },
      { key: 'quickPayment', label: 'قبض دفعة سريعة من الموزع', description: 'زر السداد السريع المباشر من بطاقة الموزع', actionType: 'special' },
      { key: 'viewAccountStatement', label: 'استعراض كشف الحساب التفصيلي', description: 'معاينة حركة المبيعات والسدادات ورصيد الحساب', actionType: 'read' },
      { key: 'exportPOSData', label: 'تصدير بيانات الموزعين', description: 'تصدير قائمة نقاط البيع مع أرصدة المديونية', actionType: 'special' },
    ],
  },
  {
    moduleId: 'categories',
    title: 'فئات الكروت والطباعة والمخزون (Card Categories)',
    description: 'إعداد باقات الكروت، أسعار الجملة والتجزئة، بروفايلات المايكروتك، وتوليد القوالب.',
    iconName: 'Layers',
    color: 'text-blue-400',
    fields: [
      { key: 'view', label: 'عرض فئات الكروت والمخزون', description: 'استعراض أسعار الفئات ورصيد المخزن المتاح', actionType: 'read' },
      { key: 'addCategory', label: 'إضافة فئة كروت جديدة', description: 'إنشاء باقة جديدة بوقت وحجم محدد', actionType: 'add' },
      { key: 'editCategory', label: 'تعديل الفئات والمواصفات', description: 'تعديل اسم الفئة، الباندويث، والمحدوديات', actionType: 'edit' },
      { key: 'editPrices', label: 'تعديل أسعار التكلفة والجملة والتجزئة', description: 'التحكم بالأسعار وهوامش الربح', isDanger: true, actionType: 'edit' },
      { key: 'deleteCategory', label: 'حذف فئة كروت', description: 'حذف الفئة من النظام ومخزن الكروت', isDanger: true, actionType: 'delete' },
      { key: 'generateVouchers', label: 'توليد وطباعة الكروت A4 وحراري', description: 'توليد أرقام وسيريالات الكروت وطباعتها', actionType: 'add' },
      { key: 'exportMikrotikScript', label: 'تصدير سكربتات المايكروتك و User Manager', description: 'توليد أوامر Terminal لإضافتها بالراوتر', actionType: 'special' },
      { key: 'manageTemplates', label: 'تصميم وإدارة قوالب الكروت', description: 'تخصيص خلفيات وشعارات وقوالب الطباعة', actionType: 'edit' },
    ],
  },
  {
    moduleId: 'mikrotik',
    title: 'المايكروتك والمشتركين المباشر (MikroTik Live)',
    description: 'المراقبة الحية لراوتر المايكروتك، المشتركين النشطين، والباندويث.',
    iconName: 'Activity',
    color: 'text-emerald-400',
    fields: [
      { key: 'view', label: 'عرض مركز المايكروتك المباشر', description: 'استعراض المتصلين وحالة استهلاك الموارد', actionType: 'read' },
      { key: 'disconnectUsers', label: 'فصل وطرد المشتركين النشطين', description: 'إنهاء جلسة المستخدمين من الهوتسبوت', actionType: 'special' },
      { key: 'editMikrotikConfig', label: 'تعديل بيانات وإعدادات الاتصال بالراوتر', description: 'تغيير عنوان IP ومنفذ وكلمة مرور الراوتر', isDanger: true, actionType: 'edit' },
      { key: 'viewLiveTraffic', label: 'مراقبة حركة الباندويث والمنافذ', description: 'عرض الرسوم الحية لمعدل الرفع والتنزيل', actionType: 'read' },
      { key: 'viewSessions', label: 'عرض إحصائيات المتصلين وجلسات الاستخدام', description: 'الاطلاع على تقارير تفصيلية عن المتصلين خلال فترات محددة', actionType: 'read' },
      { key: 'rebootRouter', label: 'إعادة تشغيل الراوتر عن بعد', description: 'إرسال أمر Reboot لراوتر المايكروتك', isDanger: true, actionType: 'special' },
    ],
  },
  {
    moduleId: 'usersAndPermissions',
    title: 'إدارة المستخدمين والصلاحيات (Users & RBAC)',
    description: 'إضافة موظفي النظام، إنشاء الأدوار، وتخصيص الصلاحيات الدقيقة.',
    iconName: 'ShieldCheck',
    color: 'text-purple-400',
    fields: [
      { key: 'view', label: 'عرض شاشة المستخدمين والصلاحيات', description: 'الاطلاع على مستخدمي النظام وأدوارهم', actionType: 'read' },
      { key: 'addUser', label: 'إضافة مستخدم جديد', description: 'إنشاء حساب موظف أو مندوب وتعيين صلاحياته', actionType: 'add' },
      { key: 'editUser', label: 'تعديل بيانات وصلاحيات المستخدمين', description: 'تغيير الصلاحيات، كلمات المرور، والحالة', isDanger: true, actionType: 'edit' },
      { key: 'deleteUser', label: 'حذف أو تجميد مستخدم', description: 'إيقاف حساب أو حذفه نهائياً من النظام', isDanger: true, actionType: 'delete' },
      { key: 'changeUserRoles', label: 'تطبيق وتغيير قوالب الأدوار الجاهزة', description: 'تطبيق قوالب المحاسب أو المندوب بنقرة واحدة', actionType: 'edit' },
      { key: 'switchActiveUser', label: 'التبديل وتجربة المستخدمين (Simulator)', description: 'التبديل بين الحسابات لاختبار الصلاحيات الحقيقية', actionType: 'special' },
    ],
  },
  {
    moduleId: 'settings',
    title: 'الإعدادات العامة والذكاء الاصطناعي (Settings & AI)',
    description: 'هوية الشبكة، أرقام الدعم، النسخ الاحتياطي، والمساعد الذكي.',
    iconName: 'Settings',
    color: 'text-slate-400',
    fields: [
      { key: 'view', label: 'فتح نافذة إعدادات النظام', description: 'استعراض الإعدادات العامة للشبكة', actionType: 'read' },
      { key: 'editNetworkProfile', label: 'تعديل اسم وشعار وبيانات الشبكة', description: 'تحديث هوية الشبكة وأرقام الواتساب والدعم', actionType: 'edit' },
      { key: 'backupAndRestore', label: 'النسخ الاحتياطي واستعادة البيانات', description: 'تصدير نسخة كاملة من النظام واسترجاعها', actionType: 'special' },
      { key: 'resetDatabase', label: 'تصفير وإعادة ضبط قاعدة البيانات', description: 'حذف كافة البيانات وإعادتها للوضع الافتراضي', isDanger: true, actionType: 'delete' },
      { key: 'useAIAssistant', label: 'استخدام المساعد الذكي AI', description: 'طرح الاستفسارات والتحليلات عبر الذكاء الاصطناعي', actionType: 'special' },
    ],
  },
];

// ========================================================
// Tenant Allowed Modules & Owner Customization Config
// ========================================================

export interface TenantModuleMeta {
  id: TenantAllowedModule;
  title: string;
  category: 'core' | 'operations' | 'technical' | 'management';
  description: string;
  iconName: string; // Lucide icon reference
  color: string;
  bgLight: string;
  borderColor: string;
}

export const ALL_TENANT_MODULES: TenantAllowedModule[] = [
  'dashboard',
  'invoices',
  'orders',
  'expenses',
  'payments',
  'pos',
  'categories',
  'mikrotik',
  'users',
  'pos_portal',
  'settings',
  'backup',
  'ai_assistant',
];

export const TENANT_AVAILABLE_MODULES: TenantModuleMeta[] = [
  {
    id: 'dashboard',
    title: 'لوحة التحكم والتقارير المالية',
    category: 'core',
    description: 'المؤشرات المالية، إجمالي المبيعات، صافي الأرباح، والرسم البياني',
    iconName: 'LayoutDashboard',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'invoices',
    title: 'الفواتير والمبيعات والمرتجع',
    category: 'operations',
    description: 'إصدار فواتير بيع الكروت، فواتير المرتجع، وسجل المبيعات اليومي',
    iconName: 'FileText',
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'orders',
    title: 'طلبات الكروت الواردة من الموزعين',
    category: 'operations',
    description: 'استقبال طلبات نقاط البيع، اعتماد أو رفض الطلبات، وتسليم الكروت',
    iconName: 'ShoppingBag',
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'expenses',
    title: 'المصروفات والتكاليف التشغيلية',
    category: 'operations',
    description: 'تسجيل سندات الصرف، تصنيفات المصاريف، وتتبع التكاليف',
    iconName: 'Receipt',
    color: 'text-rose-400',
    bgLight: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'payments',
    title: 'سندات القبض والدفعات النقدية',
    category: 'operations',
    description: 'قبض الدفعات من الموزعين، تسوية الأرصدة، وطباعة السندات',
    iconName: 'DollarSign',
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'pos',
    title: 'نقاط التوزيع وشبكة الموزعين',
    category: 'operations',
    description: 'إدارة الوكلاء ونقاط البيع، سقوف المديونية، وكشوف الحسابات',
    iconName: 'Store',
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'categories',
    title: 'فئات الكروت والطباعة وتوليد الكروت',
    category: 'core',
    description: 'إدارة الفئات، توليد وطباعة الكروت A4 وحراري، وتصميم القوالب',
    iconName: 'Layers',
    color: 'text-violet-400',
    bgLight: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  {
    id: 'mikrotik',
    title: 'مركز المايكروتك واليوزر مانجر',
    category: 'technical',
    description: 'مراقبة الراوتر المباشرة، فحص الاتصال، وتوليد سكربتات وبروفايلات اليوزر مانجر',
    iconName: 'Activity',
    color: 'text-sky-400',
    bgLight: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    id: 'users',
    title: 'إدارة المستخدمين والصلاحيات للشبكة',
    category: 'management',
    description: 'إضافة موظفي ومحاسبي الشبكة وتوزيع الصلاحيات الدقيقة وسجل التدقيق',
    iconName: 'ShieldCheck',
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'pos_portal',
    title: 'بوابة نقطة البيع للموزعين (طلب كروت)',
    category: 'operations',
    description: 'واجهة خاصة يدخل بها الموزع لطلب كروت ومتابعة رصيده وديونه',
    iconName: 'ExternalLink',
    color: 'text-teal-400',
    bgLight: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
  },
  {
    id: 'settings',
    title: 'إعدادات وهوية الشبكة',
    category: 'management',
    description: 'تخصيص اسم وشعار الشبكة، العملة، أرقام الدعم، وهوية الهوتسبوت',
    iconName: 'Settings',
    color: 'text-slate-300',
    bgLight: 'bg-slate-700/20',
    borderColor: 'border-slate-600/30',
  },
  {
    id: 'backup',
    title: 'النسخ الاحتياطي واستعادة البيانات',
    category: 'management',
    description: 'تصدير نسخة كاملة من قاعدة بيانات الشبكة واستعادتها بأمان',
    iconName: 'Database',
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'ai_assistant',
    title: 'المستشار الذكي بالذكاء الاصطناعي (AI)',
    category: 'management',
    description: 'تحليلات ذكية للمبيعات والأرباح وتقديم التوصيات والتقارير التنفيذية',
    iconName: 'Sparkles',
    color: 'text-yellow-400',
    bgLight: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
];

export interface TenantPresetPackage {
  id: string;
  name: string;
  badge: string;
  description: string;
  modules: TenantAllowedModule[];
}

export const TENANT_PRESET_PACKAGES: TenantPresetPackage[] = [
  {
    id: 'full',
    name: '🌟 شامل كافة القوائم والواجهات',
    badge: '13 قائمة',
    description: 'وصول مطلق لكافة الميزات المحاسبية والتوليد والمايكروتك والذكاء الاصطناعي',
    modules: [...ALL_TENANT_MODULES],
  },
  {
    id: 'vouchers_pos',
    name: '🖨️ طباعة وتوزيع الكروت فقط',
    badge: '7 قوائم',
    description: 'مخصص للموزعين وشبكات الكروت الورقية (فئات، فواتير، نقاط بيع، سندات، طلبات)',
    modules: ['categories', 'pos', 'invoices', 'payments', 'orders', 'pos_portal', 'settings'],
  },
  {
    id: 'mikrotik_core',
    name: '📡 إدارة الشبكة والمايكروتك',
    badge: '6 قوائم',
    description: 'مركز المايكروتك ومراقبة الراوتر وتوليد الكروت واليوزر مانجر والإعدادات',
    modules: ['mikrotik', 'categories', 'dashboard', 'settings', 'users', 'backup'],
  },
  {
    id: 'pos_accounting',
    name: '💰 تجاري ومحاسبي متكامل',
    badge: '10 قوائم',
    description: 'لوحة التحكم، الفواتير، المصروفات، سندات القبض، نقاط التوزيع، والطلبات',
    modules: [
      'dashboard',
      'invoices',
      'expenses',
      'payments',
      'pos',
      'orders',
      'categories',
      'users',
      'settings',
      'backup',
    ],
  },
];

/**
 * Builds a granular UserPermissions object for a Network Manager (super_admin)
 * based strictly on the allowed modules configured by the System Owner.
 */
export function buildPermissionsForAllowedModules(allowed: TenantAllowedModule[]): UserPermissions {
  const allowedSet = new Set(allowed);
  const full = createFullPermissions();
  const empty = createEmptyPermissions();

  const perms: UserPermissions = {
    dashboard: allowedSet.has('dashboard') ? { ...full.dashboard } : { ...empty.dashboard },
    invoices: allowedSet.has('invoices') ? { ...full.invoices } : { ...empty.invoices },
    orders: allowedSet.has('orders') || allowedSet.has('pos_portal') ? { ...full.orders } : { ...empty.orders },
    expenses: allowedSet.has('expenses') ? { ...full.expenses } : { ...empty.expenses },
    payments: allowedSet.has('payments') ? { ...full.payments } : { ...empty.payments },
    pos: allowedSet.has('pos') ? { ...full.pos } : { ...empty.pos },
    categories: allowedSet.has('categories') ? { ...full.categories } : { ...empty.categories },
    mikrotik: allowedSet.has('mikrotik') ? { ...full.mikrotik } : { ...empty.mikrotik },
    usersAndPermissions: allowedSet.has('users') ? { ...full.usersAndPermissions } : { ...empty.usersAndPermissions },
    settings: {
      view: allowedSet.has('settings') || allowedSet.has('backup') || allowedSet.has('ai_assistant'),
      editNetworkProfile: allowedSet.has('settings'),
      backupAndRestore: allowedSet.has('backup'),
      useAIAssistant: allowedSet.has('ai_assistant'),
      resetDatabase: false,
    },
    systemTenants: {
      view: false,
      manage: false,
    },
  };

  return perms;
}

// ========================================================
// Helper Functions for Permission Check & Count
// ========================================================

export function hasPermission(
  user: AppUser | null | undefined,
  module: keyof UserPermissions,
  action?: string,
  activeTenant?: NetworkTenant | null
): boolean {
  if (!user) return false;
  // System Owner has unconstrained root access
  if (user.role === 'system_owner') return true;

  // systemTenants is strictly reserved for system_owner
  if (module === 'systemTenants') return false;

  // Tenant-level module restriction check
  if (activeTenant && activeTenant.accessMode === 'custom' && activeTenant.allowedModules) {
    let requiredTenantModule: TenantAllowedModule = module === 'usersAndPermissions' ? 'users' : (module as TenantAllowedModule);

    if (module === 'settings') {
      if (action === 'useAIAssistant') {
        requiredTenantModule = 'ai_assistant';
      } else if (action === 'backupAndRestore') {
        requiredTenantModule = 'backup';
      }
    }

    if (!activeTenant.allowedModules.includes(requiredTenantModule)) {
      // Special case: if action is view on settings, allow if settings OR backup OR ai_assistant is enabled
      if (module === 'settings' && (!action || action === 'view')) {
        const hasAnySettingsModule = activeTenant.allowedModules.some((m) => ['settings', 'backup', 'ai_assistant'].includes(m));
        if (!hasAnySettingsModule) return false;
      } else {
        return false;
      }
    }
  }

  const modulePerms = user.permissions?.[module];

  // Super Admin (Tenant Admin): Respect custom module constraints
  if (user.role === 'super_admin') {
    if (modulePerms) {
      if (modulePerms.view === false) {
        return false;
      }
      if (action && (modulePerms as any)[action] === false) {
        return false;
      }
    }
    return true;
  }

  if (!modulePerms) return false;
  if (!modulePerms.view) return false;

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
 * Determine the best default landing view for a user based on their role, granted permissions, and tenant modules.
 */
export function getDefaultLandingViewForUser(user: AppUser | null | undefined, activeTenant?: NetworkTenant | null)
: 'system_tenants' | 'dashboard' | 'orders' | 'pos_portal' | 'invoices' | 'expenses' | 'payments' | 'pos' | 'categories' | 'mikrotik' | 'users' {
  if (!user) return 'invoices';

  if (user.role === 'system_owner') {
    return 'system_tenants';
  }

  // POS Agent defaults to POS portal
  if (user.role === 'pos_agent') {
    return 'pos_portal';
  }

  // Super admin defaults to dashboard if permitted, or first permitted module
  if (user.role === 'super_admin') {
    if (hasPermission(user, 'dashboard', 'view', activeTenant)) return 'dashboard';
    if (hasPermission(user, 'categories', 'view', activeTenant)) return 'categories';
    if (hasPermission(user, 'invoices', 'view', activeTenant)) return 'invoices';
    if (hasPermission(user, 'pos', 'view', activeTenant)) return 'pos';
    if (hasPermission(user, 'orders', 'view', activeTenant)) return 'orders';
    if (hasPermission(user, 'mikrotik', 'view', activeTenant)) return 'mikrotik';
    if (hasPermission(user, 'payments', 'view', activeTenant)) return 'payments';
    if (hasPermission(user, 'expenses', 'view', activeTenant)) return 'expenses';
    if (hasPermission(user, 'usersAndPermissions', 'view', activeTenant)) return 'users';
    return 'categories';
  }

  // Accountant: prefers dashboard if permitted, or invoices
  if (user.role === 'accountant') {
    if (hasPermission(user, 'dashboard', 'view', activeTenant)) return 'dashboard';
    if (hasPermission(user, 'orders', 'view', activeTenant)) return 'orders';
    if (hasPermission(user, 'invoices', 'view', activeTenant)) return 'invoices';
    if (hasPermission(user, 'expenses', 'view', activeTenant)) return 'expenses';
    if (hasPermission(user, 'payments', 'view', activeTenant)) return 'payments';
  }

  // Sales Agent: prefers orders or pos points
  if (user.role === 'sales_agent') {
    if (hasPermission(user, 'orders', 'view', activeTenant)) return 'orders';
    if (hasPermission(user, 'invoices', 'view', activeTenant)) return 'invoices';
    if (hasPermission(user, 'pos', 'view', activeTenant)) return 'pos';
    if (hasPermission(user, 'payments', 'view', activeTenant)) return 'payments';
  }

  // Cashier: prefers invoices or payments
  if (user.role === 'cashier') {
    if (hasPermission(user, 'invoices', 'view', activeTenant)) return 'invoices';
    if (hasPermission(user, 'orders', 'view', activeTenant)) return 'orders';
    if (hasPermission(user, 'payments', 'view', activeTenant)) return 'payments';
    if (hasPermission(user, 'pos', 'view', activeTenant)) return 'pos';
  }

  // Network Admin: prefers mikrotik or categories
  if (user.role === 'network_admin') {
    if (hasPermission(user, 'mikrotik', 'view', activeTenant)) return 'mikrotik';
    if (hasPermission(user, 'categories', 'view', activeTenant)) return 'categories';
    if (hasPermission(user, 'dashboard', 'view', activeTenant)) return 'dashboard';
  }

  // Viewer: prefers dashboard or invoices
  if (user.role === 'viewer') {
    if (hasPermission(user, 'dashboard', 'view', activeTenant)) return 'dashboard';
    if (hasPermission(user, 'orders', 'view', activeTenant)) return 'orders';
    if (hasPermission(user, 'invoices', 'view', activeTenant)) return 'invoices';
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
    if (hasPermission(user, item.module, 'view', activeTenant)) {
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
