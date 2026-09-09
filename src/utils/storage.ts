import {
  CardCategory,
  POSPoint,
  CardBatchDispatch,
  SalesRecord,
  PaymentRecord,
  NetworkSettings,
  GeneratedVoucher,
  POSCardInventory,
  CardTemplate,
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  FinancialSummary,
  AppUser,
  CardOrder,
} from '../types';
import {
  initialCategories,
  initialPOSPoints,
  initialDispatches,
  initialSales,
  initialPayments,
  initialNetworkSettings,
  initialGeneratedVouchers,
  initialTemplates,
  initialExpenseCategories,
  initialExpenses,
  initialInvoices,
  initialUsers,
  initialCardOrders,
} from '../mockData';
import { syncArrayToFirestore, syncSettingsToFirestore } from '../services/cloudSync';

export const STORAGE_KEYS = {
  SETTINGS: 'mikrotik_pos_settings',
  CATEGORIES: 'mikrotik_pos_categories',
  POS_POINTS: 'mikrotik_pos_points',
  DISPATCHES: 'mikrotik_pos_dispatches',
  SALES: 'mikrotik_pos_sales',
  PAYMENTS: 'mikrotik_pos_payments',
  VOUCHERS: 'mikrotik_pos_vouchers',
  TEMPLATES: 'mikrotik_pos_templates',
  INVOICES: 'mikrotik_pos_invoices',
  EXPENSES: 'mikrotik_pos_expenses',
  EXPENSE_CATEGORIES: 'mikrotik_pos_expense_categories',
  USERS: 'mikrotik_pos_users',
  TENANTS: 'mikrotik_pos_tenants',
  ACTIVE_USER_ID: 'mikrotik_pos_active_user_id',
  ACTIVITY_LOGS: 'mikrotik_pos_activity_logs',
  ORDERS: 'mikrotik_pos_card_orders',
  CUSTOMERS: 'mikrotik_pos_customers',
};

// Safe JSON load from LocalStorage
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return defaultValue;
    const parsed = JSON.parse(item);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      defaultValue &&
      typeof defaultValue === 'object' &&
      !Array.isArray(defaultValue)
    ) {
      return { ...defaultValue, ...parsed };
    }
    return (parsed ?? defaultValue) as T;
  } catch (error) {
    console.error(`Error loading key ${key} from storage:`, error);
    return defaultValue;
  }
}

export const loadData = loadFromStorage;

// Safe JSON save to LocalStorage
export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    
    // Cloud sync if value is an array
    if (Array.isArray(value)) {
      syncArrayToFirestore(key, value).catch(err => console.warn('Cloud Sync Error:', err));
    } else if (key === STORAGE_KEYS.SETTINGS && value && typeof value === 'object') {
      syncSettingsToFirestore(value).catch(err => console.warn('Cloud Sync Error for settings:', err));
    }
  } catch (error) {
    console.error(`Error saving key ${key} to storage:`, error);
  }
}

export const saveData = saveToStorage;

// State Initializers
export function getStoredSettings(): NetworkSettings {
  return loadFromStorage<NetworkSettings>(STORAGE_KEYS.SETTINGS, initialNetworkSettings);
}

export function getStoredCategories(): CardCategory[] {
  return loadFromStorage<CardCategory[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
}

export function getStoredPOSPoints(): POSPoint[] {
  return loadFromStorage<POSPoint[]>(STORAGE_KEYS.POS_POINTS, initialPOSPoints);
}

export function getStoredDispatches(): CardBatchDispatch[] {
  return loadFromStorage<CardBatchDispatch[]>(STORAGE_KEYS.DISPATCHES, initialDispatches);
}

export function getStoredSales(): SalesRecord[] {
  return loadFromStorage<SalesRecord[]>(STORAGE_KEYS.SALES, initialSales);
}

export function getStoredPayments(): PaymentRecord[] {
  return loadFromStorage<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, initialPayments);
}

export function getStoredVouchers(): GeneratedVoucher[] {
  return loadFromStorage<GeneratedVoucher[]>(STORAGE_KEYS.VOUCHERS, initialGeneratedVouchers);
}

export function getStoredTemplates(): CardTemplate[] {
  return loadFromStorage<CardTemplate[]>(STORAGE_KEYS.TEMPLATES, initialTemplates);
}

export function getStoredExpenseCategories(): ExpenseCategory[] {
  return loadFromStorage<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, initialExpenseCategories);
}

export function getStoredExpenses(): ExpenseRecord[] {
  return loadFromStorage<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
}

export function getStoredInvoices(): InvoiceRecord[] {
  return loadFromStorage<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, initialInvoices);
}

export function getStoredUsers(): AppUser[] {
  return loadFromStorage<AppUser[]>(STORAGE_KEYS.USERS, initialUsers);
}

export function getStoredActiveUserId(): string {
  return loadFromStorage<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'user-system-owner');
}

export function resetToMockData(): void {
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.POS_POINTS);
  localStorage.removeItem(STORAGE_KEYS.DISPATCHES);
  localStorage.removeItem(STORAGE_KEYS.SALES);
  localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
  localStorage.removeItem(STORAGE_KEYS.VOUCHERS);
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  localStorage.removeItem(STORAGE_KEYS.INVOICES);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.TENANTS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
  localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOGS);
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
}

// Calculate remaining inventory at each POS Point
export function calculatePOSInventory(
  posPointId: string | null | 'all',
  dispatches: CardBatchDispatch[] = [],
  sales: SalesRecord[] = [],
  invoices: InvoiceRecord[] = []
): {
  byCategory: { [categoryId: string]: { dispatched: number; sold: number; returned: number; remaining: number } };
  totalDispatched: number;
  totalSold: number;
  totalReturned: number;
  totalRemaining: number;
} {
  const byCategory: { [categoryId: string]: { dispatched: number; sold: number; returned: number; remaining: number } } = {};
  const safeDispatches = dispatches || [];
  const safeSales = sales || [];
  const safeInvoices = invoices || [];
  const isGlobal = !posPointId || posPointId === 'all';

  // Aggregate dispatched
  safeDispatches
    .filter(d => d && (isGlobal || d.posPointId === posPointId))
    .forEach(d => {
      if (!byCategory[d.categoryId]) {
        byCategory[d.categoryId] = { dispatched: 0, sold: 0, returned: 0, remaining: 0 };
      }
      byCategory[d.categoryId].dispatched += (d.quantity || 0);
    });

  // Aggregate sales
  safeSales
    .filter(s => s && (isGlobal || s.posPointId === posPointId))
    .forEach(s => {
      if (!byCategory[s.categoryId]) {
        byCategory[s.categoryId] = { dispatched: 0, sold: 0, returned: 0, remaining: 0 };
      }
      byCategory[s.categoryId].sold += (s.quantity || 0);
    });

  // Aggregate multi-item Invoices
  safeInvoices
    .filter(inv => inv && inv.status !== 'cancelled' && (isGlobal || inv.posPointId === posPointId))
    .forEach(inv => {
      inv.items?.forEach(item => {
        if (!byCategory[item.categoryId]) {
          byCategory[item.categoryId] = { dispatched: 0, sold: 0, returned: 0, remaining: 0 };
        }
        if (inv.type === 'sale') {
          byCategory[item.categoryId].dispatched += (item.quantity || 0);
        } else if (inv.type === 'return') {
          byCategory[item.categoryId].returned += (item.quantity || 0);
        }
      });
    });

  // Calculate remaining
  let totalDispatched = 0;
  let totalSold = 0;
  let totalReturned = 0;
  let totalRemaining = 0;

  Object.keys(byCategory).forEach(catId => {
    const item = byCategory[catId];
    item.remaining = Math.max(0, item.dispatched - item.sold - item.returned);
    totalDispatched += item.dispatched;
    totalSold += item.sold;
    totalReturned += item.returned;
    totalRemaining += item.remaining;
  });

  return { byCategory, totalDispatched, totalSold, totalReturned, totalRemaining };
}

import {
  isDateInPeriod,
  calculateComprehensiveFinancials,
  calculatePOSBalance,
  synchronizePOSBalances,
} from './financialCalculations';
export type { ComprehensiveFinancialMetrics, DateFilterPeriod } from './financialCalculations';
export {
  isDateInPeriod,
  calculateComprehensiveFinancials,
  calculatePOSBalance,
  synchronizePOSBalances,
};

// Calculate Network-wide Financial Summary (Gross Sales, Returns, Net Sales, Expenses, Net Profit)
export function calculateFinancialSummary(
  invoices: InvoiceRecord[] = [],
  sales: SalesRecord[] = [],
  expenses: ExpenseRecord[] = [],
  payments: PaymentRecord[] = [],
  posPoints: POSPoint[],
  categories: CardCategory[] = []
): FinancialSummary {
  const result = calculateComprehensiveFinancials({
    invoices,
    sales,
    expenses,
    payments,
    posPoints,
    categories,
    datePeriod: 'all',
  });

  return {
    grossSales: result.grossSales,
    returnsTotal: result.salesReturns,
    netSales: result.netSales,
    totalExpenses: result.totalExpenses,
    netProfit: result.netProfit,
    totalCashCollected: result.totalCashCollected,
    totalPOSDebt: result.totalPOSDebt,
  };
}

// Generate MikroTik RouterOS Hotspot Script (/ip hotspot user)
export function generateMikroTikScript(
  vouchers: GeneratedVoucher[],
  options: {
    serverName?: string;
    addComment?: boolean;
    commentPrefix?: string;
  } = {}
): string {
  const comment = options.commentPrefix || 'POS-Generated';
  const server = options.serverName ? ` server="${options.serverName}"` : '';

  const lines: string[] = [
    '# ========================================================',
    '# MikroTik RouterOS Hotspot Users Script (/ip hotspot user)',
    `# Generated at: ${new Date().toISOString()}`,
    `# Total Vouchers: ${vouchers.length}`,
    '# ========================================================',
    '',
    '/ip hotspot user',
  ];

  vouchers.forEach(v => {
    const pwdParam = v.password ? ` password="${v.password}"` : ` password="${v.username}"`;
    const commentParam = options.addComment !== false ? ` comment="${comment}-${v.categoryName}-${v.serial}"` : '';
    lines.push(`add name="${v.username}"${pwdParam} profile="${v.profile}"${server}${commentParam}`);
  });

  return lines.join('\n');
}

// Generate MikroTik User Manager v4/v5/v6 Script (/tool user-manager)
export function generateUserManagerV6Script(
  vouchers: GeneratedVoucher[],
  options: {
    customer?: string;
    addComment?: boolean;
    commentPrefix?: string;
  } = {}
): string {
  const customer = options.customer || 'admin';
  const comment = options.commentPrefix || 'UM-POS';

  const lines: string[] = [
    '# ========================================================',
    '# MikroTik User Manager v4/v5/v6 Script (/tool user-manager)',
    `# Generated at: ${new Date().toISOString()}`,
    `# Customer: ${customer}`,
    `# Total Users: ${vouchers.length}`,
    '# ========================================================',
    '',
    '/tool user-manager user',
  ];

  vouchers.forEach(v => {
    const pwdParam = v.password ? ` password="${v.password}"` : ` password="${v.username}"`;
    const commentParam = options.addComment !== false ? ` comment="${comment}-${v.categoryName}-${v.serial}"` : '';
    lines.push(`add customer="${customer}" username="${v.username}"${pwdParam}${commentParam}`);
    lines.push(`create-and-activate-profile "${v.username}" customer="${customer}" profile="${v.profile}"`);
  });

  return lines.join('\n');
}

// Generate MikroTik User Manager v7 Script (/user-manager)
export function generateUserManagerV7Script(
  vouchers: GeneratedVoucher[],
  options: {
    addComment?: boolean;
    commentPrefix?: string;
  } = {}
): string {
  const comment = options.commentPrefix || 'UM7-POS';

  const lines: string[] = [
    '# ========================================================',
    '# MikroTik RouterOS v7 User Manager Script (/user-manager)',
    `# Generated at: ${new Date().toISOString()}`,
    `# Total Users: ${vouchers.length}`,
    '# ========================================================',
    '',
    '/user-manager user',
  ];

  vouchers.forEach(v => {
    const pwdParam = v.password ? ` password="${v.password}"` : ` password="${v.username}"`;
    const commentParam = options.addComment !== false ? ` comment="${comment}-${v.categoryName}-${v.serial}"` : '';
    lines.push(`add name="${v.username}"${pwdParam}${commentParam}`);
  });

  lines.push('');
  lines.push('/user-manager user-profile');
  vouchers.forEach(v => {
    lines.push(`add user="${v.username}" profile="${v.profile}"`);
  });

  return lines.join('\n');
}

// Generate MikroTik User Manager Profiles & Limitations Setup Script
export function generateUserManagerProfilesSetup(categories: CardCategory[]): string {
  const lines: string[] = [
    '# ========================================================',
    '# MikroTik User Manager Profiles & Limitations Auto-Setup',
    `# Generated at: ${new Date().toISOString()}`,
    '# Run this once in MikroTik Terminal to create all profiles',
    '# ========================================================',
    '',
    '# 1. User Manager v4/v5/v6 Setup:',
    '/tool user-manager profile',
  ];

  categories.forEach(cat => {
    const profName = cat.userManagerProfile || cat.mikrotikProfile || `UM-${cat.name}`;
    const limName = cat.userManagerLimitation || `Lim-${cat.code}`;
    const validity = `${cat.validityDays}d`;
    lines.push(`add name="${profName}" name-for-users="${cat.name}" validity="${validity}" starts-at=logon`);
    lines.push(`/tool user-manager profile limitation add profile="${profName}" limitation="${limName}"`);
  });

  lines.push('');
  lines.push('# 2. User Manager v7 Setup:');
  lines.push('/user-manager profile');
  categories.forEach(cat => {
    const profName = cat.userManagerProfile || cat.mikrotikProfile || `UM-${cat.name}`;
    const validity = `${cat.validityDays}d`;
    lines.push(`add name="${profName}" name-for-users="${cat.name}" validity="${validity}"`);
  });

  return lines.join('\n');
}

// Generate CSV for User Manager Web Interface Import
export function generateUserManagerCSV(vouchers: GeneratedVoucher[], customer: string = 'admin'): string {
  const header = 'customer,username,password,profile,comment,price';
  const rows = vouchers.map(v => {
    const pass = v.password || v.username;
    return `"${customer}","${v.username}","${pass}","${v.profile}","${v.categoryName}-${v.serial}","${v.price}"`;
  });
  return [header, ...rows].join('\n');
}

// Export data to CSV string and optional download
export function exportToCSV(
  data: Record<string, any>[],
  headersOrFilename?: { key: string; label: string }[] | string,
  filenameParam?: string
): string {
  if (!data || data.length === 0) {
    if (typeof headersOrFilename === 'string') {
      downloadFile('', headersOrFilename.endsWith('.csv') ? headersOrFilename : `${headersOrFilename}.csv`, 'text/csv');
    }
    return '';
  }

  let headers: { key: string; label: string }[] = [];
  let filenameToDownload: string | undefined;

  if (Array.isArray(headersOrFilename)) {
    headers = headersOrFilename;
    if (filenameParam) filenameToDownload = filenameParam;
  } else if (typeof headersOrFilename === 'string') {
    filenameToDownload = headersOrFilename;
    const firstRow = data[0];
    headers = Object.keys(firstRow).map((key) => ({ key, label: key }));
  } else {
    const firstRow = data[0];
    headers = Object.keys(firstRow).map((key) => ({ key, label: key }));
  }

  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) => {
    return headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');

  if (filenameToDownload) {
    const safeName = filenameToDownload.endsWith('.csv') ? filenameToDownload : `${filenameToDownload}.csv`;
    downloadFile(csvContent, safeName, 'text/csv');
  }

  return csvContent;
}

// Export object to JSON string
export function exportToJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}

// Download file utility
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * توليد رقم تسلسلي تلقائي ذكي للفواتير (مبيعات أو مرتجع)
 * النمط المعتمد: INV-2026-001 أو RET-2026-001
 */
export function generateNextInvoiceNumber(
  invoices: InvoiceRecord[] = [],
  type: 'sale' | 'return' = 'sale',
  dateStr?: string
): string {
  const targetYear = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const year = isNaN(targetYear) ? new Date().getFullYear() : targetYear;
  const prefix = type === 'return' ? 'RET' : 'INV';

  let maxSeq = 0;

  invoices.forEach((inv) => {
    if (!inv || !inv.invoiceNumber) return;
    const numStr = inv.invoiceNumber.trim().toUpperCase();

    // Check if matching prefix (INV or RET)
    const matchesPrefix = numStr.startsWith(prefix);
    const hasYear = numStr.includes(String(year));

    const match = numStr.match(/(\d+)$/);
    if (match) {
      const seqVal = parseInt(match[1], 10);
      if (!isNaN(seqVal)) {
        if (matchesPrefix && (hasYear || !numStr.match(/\d{4}/))) {
          if (seqVal > maxSeq) {
            maxSeq = seqVal;
          }
        } else if (matchesPrefix && seqVal > maxSeq && seqVal < 100000) {
          maxSeq = seqVal;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

/**
 * توليد رقم تسلسلي تلقائي لسندات الصرف
 * النمط المعتمد: EXP-2026-001
 */
export function generateNextExpenseVoucherNumber(
  expenses: ExpenseRecord[] = [],
  dateStr?: string
): string {
  const targetYear = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const year = isNaN(targetYear) ? new Date().getFullYear() : targetYear;
  const prefix = 'EXP';

  let maxSeq = 0;
  expenses.forEach((exp) => {
    if (!exp || !exp.voucherNumber) return;
    const numStr = exp.voucherNumber.trim().toUpperCase();
    const match = numStr.match(/(\d+)$/);
    if (match) {
      const seqVal = parseInt(match[1], 10);
      if (!isNaN(seqVal) && seqVal > maxSeq) {
        maxSeq = seqVal;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

/**
 * توليد رقم تسلسلي تلقائي لسندات القبض
 * النمط المعتمد: PAY-2026-001
 */
export function generateNextPaymentReceiptNumber(
  payments: PaymentRecord[] = [],
  dateStr?: string
): string {
  const targetYear = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const year = isNaN(targetYear) ? new Date().getFullYear() : targetYear;
  const prefix = 'PAY';

  let maxSeq = 0;
  payments.forEach((p) => {
    if (!p) return;
    const ref = p.referenceNumber || (p as any).receiptNumber;
    if (!ref) return;
    const numStr = String(ref).trim().toUpperCase();
    const match = numStr.match(/(\d+)$/);
    if (match) {
      const seqVal = parseInt(match[1], 10);
      if (!isNaN(seqVal) && seqVal > maxSeq) {
        maxSeq = seqVal;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

/**
 * توليد رقم تسلسلي تلقائي لطلبات الكروت
 * النمط المعتمد: ORD-2026-001
 */
export function generateNextOrderNumber(
  orders: CardOrder[] = [],
  dateStr?: string
): string {
  const targetYear = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const year = isNaN(targetYear) ? new Date().getFullYear() : targetYear;
  const prefix = 'ORD';

  let maxSeq = 0;
  orders.forEach((ord) => {
    if (!ord || !ord.orderNumber) return;
    const numStr = ord.orderNumber.trim().toUpperCase();
    const match = numStr.match(/(\d+)$/);
    if (match) {
      const seqVal = parseInt(match[1], 10);
      if (!isNaN(seqVal) && seqVal > maxSeq) {
        maxSeq = seqVal;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

export function getStoredOrders(): CardOrder[] {
  return loadFromStorage<CardOrder[]>(STORAGE_KEYS.ORDERS, initialCardOrders);
}
