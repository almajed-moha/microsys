import {
  NetworkTenant, AppUser, CardCategory, POSPoint, InvoiceRecord,
  ExpenseRecord, ExpenseCategory, CardBatchDispatch, SalesRecord,
  PaymentRecord, CardOrder, NetworkSettings, CardTemplate, UserActivityLog,
  SystemDatabaseBackup
} from '../types';

export function generateSystemBackup(params: {
  activeUser: AppUser | undefined;
  isMasterUser: boolean;
  exportScope: 'full' | 'current';
  effectiveNetworkId: string;
  networkDisplayName: string;
  includeAuditLogs: boolean;
  tenants: NetworkTenant[];
  users: AppUser[];
  categories: CardCategory[];
  posPoints: POSPoint[];
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  dispatches: CardBatchDispatch[];
  sales: SalesRecord[];
  payments: PaymentRecord[];
  orders: CardOrder[];
  settings: NetworkSettings;
  templates: CardTemplate[];
  activityLogs: UserActivityLog[];
}): SystemDatabaseBackup {
  const {
    activeUser, isMasterUser, exportScope, effectiveNetworkId, networkDisplayName, includeAuditLogs,
    tenants, users, categories, posPoints, invoices, expenses, expenseCategories, dispatches,
    sales, payments, orders, settings, templates, activityLogs
  } = params;

  const currentTenant = tenants.find((t) => t.id === effectiveNetworkId);

  const targetCategories = exportScope === 'full'
    ? categories
    : categories.filter((c) => !c.networkId || c.networkId === effectiveNetworkId || c.networkId === 'net-microsys');

  const targetPOSPoints = exportScope === 'full'
    ? posPoints
    : posPoints.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetInvoices = exportScope === 'full'
    ? invoices
    : invoices.filter((i) => !i.networkId || i.networkId === effectiveNetworkId || i.networkId === 'net-microsys');

  const targetExpenses = exportScope === 'full'
    ? expenses
    : expenses.filter((e) => !e.networkId || e.networkId === effectiveNetworkId || e.networkId === 'net-microsys');

  const targetExpenseCategories = exportScope === 'full'
    ? expenseCategories
    : expenseCategories.filter((c) => !c.networkId || c.networkId === effectiveNetworkId || c.networkId === 'net-microsys');

  const targetDispatches = exportScope === 'full'
    ? dispatches
    : dispatches.filter((d) => !d.networkId || d.networkId === effectiveNetworkId || d.networkId === 'net-microsys');

  const targetSales = exportScope === 'full'
    ? sales
    : sales.filter((s) => !s.networkId || s.networkId === effectiveNetworkId || s.networkId === 'net-microsys');

  const targetPayments = exportScope === 'full'
    ? payments
    : payments.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetOrders = exportScope === 'full'
    ? orders
    : orders.filter((o) => !o.networkId || o.networkId === effectiveNetworkId || o.networkId === 'net-microsys');

  const targetUsers = exportScope === 'full'
    ? users
    : users.filter((u) => u.networkId === effectiveNetworkId || (u.role === 'system_owner' && isMasterUser));

  const targetTenants = exportScope === 'full'
    ? tenants
    : (currentTenant ? [currentTenant] : []);

  const targetLogs = includeAuditLogs
    ? (exportScope === 'full'
        ? activityLogs
        : activityLogs.filter((l) => !l.networkId || l.networkId === effectiveNetworkId))
    : [];

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const isFull = exportScope === 'full';

  return {
    version: '4.0.0',
    app: 'MicroSys Cloud WiFi & POS Management',
    backupType: isFull ? 'full_system' : 'single_network',
    exportDate: dateStr,
    timestamp: now.toISOString(),
    exportedBy: {
      id: activeUser?.id || 'sys',
      name: activeUser?.name || 'System',
      username: activeUser?.username || 'admin',
      role: activeUser?.role || 'system_owner',
    },
    networkId: isFull ? undefined : effectiveNetworkId,
    networkName: isFull ? 'All Networks (System Database)' : networkDisplayName,
    counts: {
      tenants: targetTenants.length,
      users: targetUsers.length,
      categories: targetCategories.length,
      posPoints: targetPOSPoints.length,
      invoices: targetInvoices.length,
      expenses: targetExpenses.length,
      expenseCategories: targetExpenseCategories.length,
      dispatches: targetDispatches.length,
      sales: targetSales.length,
      payments: targetPayments.length,
      orders: targetOrders.length,
      templates: templates?.length || 0,
      logs: targetLogs.length,
    },
    data: {
      tenants: targetTenants,
      users: targetUsers,
      categories: targetCategories,
      posPoints: targetPOSPoints,
      invoices: targetInvoices,
      expenses: targetExpenses,
      expenseCategories: targetExpenseCategories,
      dispatches: targetDispatches,
      sales: targetSales,
      payments: targetPayments,
      orders: targetOrders,
      settings: settings,
      templates: templates || [],
      activityLogs: targetLogs,
    },
  };
}
