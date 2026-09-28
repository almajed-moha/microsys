import React, { useState, useMemo } from 'react';
import {
  Scale,
  CreditCard,
  FileText,
  DollarSign,
  Receipt,
  TrendingUp,
  BookOpen,
  ArrowRightLeft,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Phone,
  Building2,
  Share2,
  Lock,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Wallet,
  Sparkles,
} from 'lucide-react';
import {
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  POSPoint,
  Customer,
  CardCategory,
  PaymentRecord,
  SalesRecord,
  CardBatchDispatch,
  NetworkSettings,
  AppUser,
  NetworkTenant,
} from '../types';
import { hasPermission } from '../utils/permissions';
import { exportTrialBalanceToExcel, exportDebtsReportToExcel, exportIncomeStatementToExcel, TrialBalanceItem, fmtNum } from '../utils/exportAccounting';
import { printElementDocument, exportElementToPdf, sharePdfToWhatsApp } from '../utils/pdfExport';
import { InvoicesView } from './InvoicesView';
import { PaymentsView } from './PaymentsView';
import { ExpensesView } from './ExpensesView';
import { CustomerStatementModal } from './CustomerStatementModal';
import { POSAccountStatementModal } from './POSAccountStatementModal';
import { TrialBalanceModal } from './TrialBalanceModal';
import { DebtsReportModal } from './DebtsReportModal';
import { IncomeStatementModal } from './IncomeStatementModal';

export type AccountsSubTab =
  | 'trial_balance'
  | 'debts_report'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'income_statement'
  | 'statements'
  | 'cash_flow';

interface AccountsViewProps {
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  posPoints: POSPoint[];
  customers: Customer[];
  categories: CardCategory[];
  payments: PaymentRecord[];
  sales?: SalesRecord[];
  dispatches?: CardBatchDispatch[];
  settings: NetworkSettings;
  activeUser?: AppUser;
  activeTenant?: NetworkTenant | null;
  initialTab?: AccountsSubTab;
  onAddExpense?: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  onUpdateExpense?: (expense: ExpenseRecord) => void;
  onDeleteExpense?: (id: string) => void;
  onAddPayment?: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => void;
  onDeletePayment?: (id: string) => void;
  onSaveInvoice?: (invoice: InvoiceRecord) => void;
  onDeleteInvoice?: (id: string) => void;
  onOpenPOSStatement?: (posId: string) => void;
  onOpenCustomerStatement?: (customerId: string) => void;
  onOpenNewPayment?: () => void;
  onOpenNewInvoice?: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  invoices = [],
  expenses = [],
  expenseCategories = [],
  posPoints = [],
  customers = [],
  categories = [],
  payments = [],
  sales = [],
  dispatches = [],
  settings,
  activeUser,
  activeTenant,
  initialTab = 'trial_balance',
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddPayment,
  onDeletePayment,
  onSaveInvoice,
  onDeleteInvoice,
  onOpenPOSStatement,
  onOpenCustomerStatement,
  onOpenNewPayment,
  onOpenNewInvoice,
}) => {
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  // ========================================================
  // Permissions for Subtabs
  // ========================================================
  const canViewTrialBalance = hasPermission(activeUser, 'accounts', 'viewTrialBalance', activeTenant);
  const canViewDebtsReport = hasPermission(activeUser, 'accounts', 'viewDebtsReport', activeTenant);
  const canViewInvoices = hasPermission(activeUser, 'accounts', 'viewInvoicesTab', activeTenant);
  const canViewPayments = hasPermission(activeUser, 'accounts', 'viewPaymentsTab', activeTenant);
  const canViewExpenses = hasPermission(activeUser, 'accounts', 'viewExpensesTab', activeTenant);
  const canViewIncomeStatement = hasPermission(activeUser, 'accounts', 'viewIncomeStatementTab', activeTenant);
  const canViewStatements = hasPermission(activeUser, 'accounts', 'viewAccountStatementsTab', activeTenant);
  const canViewCashFlow = hasPermission(activeUser, 'accounts', 'viewCashFlowTab', activeTenant);
  const canExport = hasPermission(activeUser, 'accounts', 'exportFinancialReports', activeTenant);

  // Available tabs based on permissions
  const availableTabs = useMemo(() => {
    const list: { id: AccountsSubTab; label: string; icon: any; color: string; badge?: string }[] = [];

    if (canViewTrialBalance) {
      list.push({ id: 'trial_balance', label: 'ميزان المراجعة والتدقيق', icon: Scale, color: 'text-indigo-400', badge: 'شهري ⚖️' });
    }
    if (canViewDebtsReport) {
      list.push({ id: 'debts_report', label: 'تقرير المديونية والأعمار', icon: CreditCard, color: 'text-amber-400', badge: 'ديون' });
    }
    if (canViewInvoices) {
      list.push({ id: 'invoices', label: 'الفواتير والمبيعات', icon: FileText, color: 'text-blue-400', badge: `${invoices.length}` });
    }
    if (canViewPayments) {
      list.push({ id: 'payments', label: 'سندات القبض والتحصيلات', icon: DollarSign, color: 'text-emerald-400', badge: `${payments.length}` });
    }
    if (canViewExpenses) {
      list.push({ id: 'expenses', label: 'المصروفات والنفقات', icon: Receipt, color: 'text-rose-400', badge: `${expenses.length}` });
    }
    if (canViewIncomeStatement) {
      list.push({ id: 'income_statement', label: 'قائمة الدخل والأرباح', icon: TrendingUp, color: 'text-teal-400', badge: 'P&L' });
    }
    if (canViewStatements) {
      list.push({ id: 'statements', label: 'كشوفات الحساب', icon: BookOpen, color: 'text-purple-400' });
    }
    if (canViewCashFlow) {
      list.push({ id: 'cash_flow', label: 'حركة الصندوق والسيولة', icon: ArrowRightLeft, color: 'text-cyan-400' });
    }

    return list;
  }, [
    canViewTrialBalance,
    canViewDebtsReport,
    canViewInvoices,
    canViewPayments,
    canViewExpenses,
    canViewIncomeStatement,
    canViewStatements,
    canViewCashFlow,
    invoices.length,
    payments.length,
    expenses.length,
  ]);

  // Default active tab to initialTab if permitted, otherwise first permitted tab
  const [activeTab, setActiveTab] = useState<AccountsSubTab>(() => {
    if (availableTabs.some((t) => t.id === initialTab)) {
      return initialTab;
    }
    return availableTabs[0]?.id || 'trial_balance';
  });

  // Modal Dialogs States
  const [isTrialBalanceModalOpen, setIsTrialBalanceModalOpen] = useState(false);
  const [isDebtsModalOpen, setIsDebtsModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedStatementPOS, setSelectedStatementPOS] = useState<POSPoint | null>(null);
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<Customer | null>(null);

  // ========================================================
  // Overall Financial KPIs
  // ========================================================
  const financialSummary = useMemo(() => {
    // Total Valid Sales Invoices
    const validSalesInvoices = invoices.filter((i) => i.type === 'sale' && i.status !== 'cancelled');
    const totalSalesAmount = validSalesInvoices.reduce((sum, inv) => sum + (inv.totalWholesaleAmount || inv.totalRetailAmount || 0), 0);
    const totalCostOfSales = validSalesInvoices.reduce((sum, inv) => sum + (inv.totalCostAmount || 0), 0);

    // Total Returns Invoices
    const returnInvoices = invoices.filter((i) => i.type === 'return' && i.status !== 'cancelled');
    const totalReturnsAmount = returnInvoices.reduce((sum, inv) => sum + (inv.totalWholesaleAmount || inv.totalRetailAmount || 0), 0);
    const totalReturnsCost = returnInvoices.reduce((sum, inv) => sum + (inv.totalCostAmount || 0), 0);

    const netSales = Math.max(0, totalSalesAmount - totalReturnsAmount);
    const netCOGS = Math.max(0, totalCostOfSales - totalReturnsCost);
    const grossProfit = Math.max(0, netSales - netCOGS);

    // Payments / Collections
    const totalPaymentsAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Expenses
    const totalExpensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Outstanding Debts
    const totalPOSDebt = posPoints.reduce((sum, p) => sum + (p.currentDebt || 0), 0);
    const totalCustomerDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const totalDebts = totalPOSDebt + totalCustomerDebt;

    // Realized Net Profit = Gross Profit - Expenses
    const netProfit = grossProfit - totalExpensesAmount;

    // Cash Balance in Safe = (Cash Sales + Payments) - Cash Expenses
    const cashSales = validSalesInvoices.filter((i) => i.paymentType === 'cash').reduce((sum, inv) => sum + (inv.totalWholesaleAmount || inv.totalRetailAmount || 0), 0);
    const cashPayments = payments.filter((p) => p.paymentMethod !== 'bank_transfer').reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashExpenses = expenses.filter((e) => e.paymentMethod === 'cash').reduce((sum, e) => sum + (e.amount || 0), 0);
    const netCashInSafe = (cashSales + cashPayments) - cashExpenses;

    return {
      netSales,
      totalPaymentsAmount,
      totalExpensesAmount,
      totalDebts,
      grossProfit,
      netProfit,
      netCashInSafe,
      totalPOSDebt,
      totalCustomerDebt,
    };
  }, [invoices, expenses, payments, posPoints, customers]);

  // ========================================================
  // TRIAL BALANCE SUBTAB DATA & STATE
  // ========================================================
  const currentDate = new Date();
  const [tbSelectedYear, setTbSelectedYear] = useState<number>(currentDate.getFullYear());
  const [tbSelectedMonth, setTbSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [tbPeriodPreset, setTbPeriodPreset] = useState<'this_month' | 'last_month' | 'year' | 'all'>('this_month');
  const [tbSelectedAccount, setTbSelectedAccount] = useState<TrialBalanceItem | null>(null);

  const monthsArabic = [
    'يناير (شهر 1)', 'فبراير (شهر 2)', 'مارس (شهر 3)', 'أبريل (شهر 4)',
    'مايو (شهر 5)', 'يونيو (شهر 6)', 'يوليو (شهر 7)', 'أغسطس (شهر 8)',
    'سبتمبر (شهر 9)', 'أكتوبر (شهر 10)', 'نوفمبر (شهر 11)', 'ديسمبر (شهر 12)'
  ];

  const tbDateRange = useMemo(() => {
    if (tbPeriodPreset === 'all') {
      return {
        startDateStr: '2020-01-01',
        endDateStr: '2035-12-31',
        periodLabel: 'كافة الفترات والسنوات',
      };
    }
    if (tbPeriodPreset === 'year') {
      return {
        startDateStr: `${tbSelectedYear}-01-01`,
        endDateStr: `${tbSelectedYear}-12-31`,
        periodLabel: `كامل عام ${tbSelectedYear}`,
      };
    }
    if (tbPeriodPreset === 'last_month') {
      const prevMonth = tbSelectedMonth === 1 ? 12 : tbSelectedMonth - 1;
      const prevYear = tbSelectedMonth === 1 ? tbSelectedYear - 1 : tbSelectedYear;
      const mStr = String(prevMonth).padStart(2, '0');
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      return {
        startDateStr: `${prevYear}-${mStr}-01`,
        endDateStr: `${prevYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `شهر ${monthsArabic[prevMonth - 1]} ${prevYear}`,
      };
    }

    const mStr = String(tbSelectedMonth).padStart(2, '0');
    const lastDay = new Date(tbSelectedYear, tbSelectedMonth, 0).getDate();
    return {
      startDateStr: `${tbSelectedYear}-${mStr}-01`,
      endDateStr: `${tbSelectedYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: `شهر ${monthsArabic[tbSelectedMonth - 1]} ${tbSelectedYear}`,
    };
  }, [tbSelectedYear, tbSelectedMonth, tbPeriodPreset]);

  // Filter records in chosen Trial Balance period
  const tbInvoices = useMemo(() => {
    return invoices.filter((inv) => inv?.date && inv.date >= tbDateRange.startDateStr && inv.date <= tbDateRange.endDateStr);
  }, [invoices, tbDateRange]);

  const tbExpenses = useMemo(() => {
    return expenses.filter((exp) => exp?.date && exp.date >= tbDateRange.startDateStr && exp.date <= tbDateRange.endDateStr);
  }, [expenses, tbDateRange]);

  const tbPayments = useMemo(() => {
    return payments.filter((p) => p?.date && p.date >= tbDateRange.startDateStr && p.date <= tbDateRange.endDateStr);
  }, [payments, tbDateRange]);

  // Construct Trial Balance Accounts
  const tbItems: TrialBalanceItem[] = useMemo(() => {
    const validInvoices = tbInvoices.filter((i) => i.status !== 'cancelled');
    const salesInvoices = validInvoices.filter((i) => i.type === 'sale');
    const returnInvoices = validInvoices.filter((i) => i.type === 'return');

    let totalInvoicesSales = 0;
    let totalCashSales = 0;
    let totalCreditSales = 0;
    let totalCostOfSales = 0;

    salesInvoices.forEach((inv) => {
      const amt = inv.totalWholesaleAmount || inv.totalRetailAmount || 0;
      totalInvoicesSales += amt;
      totalCostOfSales += inv.totalCostAmount || 0;
      if (inv.paymentType === 'cash') totalCashSales += amt;
      else totalCreditSales += amt;
    });

    let totalReturnsAmount = 0;
    let totalReturnsCost = 0;
    returnInvoices.forEach((inv) => {
      const amt = inv.totalWholesaleAmount || inv.totalRetailAmount || 0;
      totalReturnsAmount += amt;
      totalReturnsCost += inv.totalCostAmount || 0;
    });

    const netSales = totalInvoicesSales - totalReturnsAmount;
    const netCOGS = totalCostOfSales - totalReturnsCost;

    const cashPayments = tbPayments.filter((p) => p.paymentMethod !== 'bank_transfer').reduce((s, p) => s + (p.amount || 0), 0);
    const bankPayments = tbPayments.filter((p) => p.paymentMethod === 'bank_transfer').reduce((s, p) => s + (p.amount || 0), 0);

    const cashExpenses = tbExpenses.filter((e) => e.paymentMethod === 'cash').reduce((s, e) => s + (e.amount || 0), 0);
    const bankExpenses = tbExpenses.filter((e) => e.paymentMethod === 'bank_transfer').reduce((s, e) => s + (e.amount || 0), 0);

    const list: TrialBalanceItem[] = [];

    // 101: الصندوق والخزينة النقدية
    const cashDebit = totalCashSales + cashPayments;
    const cashCredit = cashExpenses;
    const cashNet = cashDebit - cashCredit;
    list.push({
      code: '101',
      name: 'الصندوق الرئيسي (الخزينة النقدية)',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: cashDebit,
      creditMovement: cashCredit,
      debitBalance: cashNet >= 0 ? cashNet : 0,
      creditBalance: cashNet < 0 ? Math.abs(cashNet) : 0,
      notes: 'المقبوضات النقدية والمبيعات الكاش مخصوماً منها المصروفات',
    });

    // 102: الحسابات البنكية ومحافظ الصرافين
    const bankDebit = bankPayments;
    const bankCredit = bankExpenses;
    const bankNet = bankDebit - bankCredit;
    list.push({
      code: '102',
      name: 'الحسابات البنكية ومحافظ الصرافين',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: bankDebit,
      creditMovement: bankCredit,
      debitBalance: bankNet >= 0 ? bankNet : 0,
      creditBalance: bankNet < 0 ? Math.abs(bankNet) : 0,
      notes: 'التحويلات المصرفية ومحافظ الدفع الإلكتروني',
    });

    // 110: مديونيات نقاط البيع والعملاء
    const recDebit = totalCreditSales;
    const recCredit = totalReturnsAmount + (cashPayments + bankPayments);
    const recNet = recDebit - recCredit;
    list.push({
      code: '110',
      name: 'مديونيات نقاط التوزيع والعملاء (الذمم المدينة)',
      category: 'أصول متداولة',
      nature: 'مدين',
      debitMovement: recDebit,
      creditMovement: recCredit,
      debitBalance: recNet >= 0 ? recNet : 0,
      creditBalance: recNet < 0 ? Math.abs(recNet) : 0,
      notes: 'الفواتير الآجلة الصادرة للموزعين مطروحاً منها السدادات والمرتجعات',
    });

    // 401: إيرادات مبيعات الكروت
    list.push({
      code: '401',
      name: 'إيرادات مبيعات وتسليم الكروت',
      category: 'إيرادات ومبيعات',
      nature: 'دائن',
      debitMovement: 0,
      creditMovement: totalInvoicesSales,
      debitBalance: 0,
      creditBalance: totalInvoicesSales,
      notes: 'إجمالي قيمة فواتير بيع الكروت الصادرة خلال الفترة',
    });

    // 402: مردودات ومرتجعات المبيعات
    if (totalReturnsAmount > 0) {
      list.push({
        code: '402',
        name: 'مردودات ومرتجع مبيعات الكروت',
        category: 'إيرادات ومبيعات',
        nature: 'مدين',
        debitMovement: totalReturnsAmount,
        creditMovement: 0,
        debitBalance: totalReturnsAmount,
        creditBalance: 0,
        notes: 'قيمة كروت المرتجع المستلمة من الموزعين إلى المخزن',
      });
    }

    // 501: تكلفة البضاعة المباعة (كروت الشبكة)
    list.push({
      code: '501',
      name: 'تكلفة مبيعات الكروت (COGS)',
      category: 'تكاليف المبيعات',
      nature: 'مدين',
      debitMovement: netCOGS,
      creditMovement: 0,
      debitBalance: netCOGS,
      creditBalance: 0,
      notes: 'تكلفة شراء أو توليد الكروت المباعة للموزعين',
    });

    // 502: المصروفات والنفقات التشغيلية
    const totalExpenses = cashExpenses + bankExpenses;
    list.push({
      code: '502',
      name: 'المصروفات والنفقات التشغيلية والإدارية',
      category: 'مصروفات تشغيلية',
      nature: 'مدين',
      debitMovement: totalExpenses,
      creditMovement: 0,
      debitBalance: totalExpenses,
      creditBalance: 0,
      notes: 'إيجارات، كهرباء، صيانة، إنترنت المايكروتك ومصاريف أخرى',
    });

    return list;
  }, [tbInvoices, tbExpenses, tbPayments]);

  const tbTotals = useMemo(() => {
    const totalDebitMovement = tbItems.reduce((s, i) => s + i.debitMovement, 0);
    const totalCreditMovement = tbItems.reduce((s, i) => s + i.creditMovement, 0);
    const totalDebitBalance = tbItems.reduce((s, i) => s + i.debitBalance, 0);
    const totalCreditBalance = tbItems.reduce((s, i) => s + i.creditBalance, 0);

    const diffMovement = Math.abs(totalDebitMovement - totalCreditMovement);
    const diffBalance = Math.abs(totalDebitBalance - totalCreditBalance);
    const isBalanced = diffMovement < 0.05 || diffBalance < 0.05;

    return {
      totalDebitMovement,
      totalCreditMovement,
      totalDebitBalance,
      totalCreditBalance,
      diffMovement,
      diffBalance,
      isBalanced,
    };
  }, [tbItems]);

  // ========================================================
  // DEBTS SUBTAB DATA & STATE
  // ========================================================
  const [debtsSearch, setDebtsSearch] = useState('');
  const [debtsTypeFilter, setDebtsTypeFilter] = useState<'all' | 'pos' | 'customer'>('all');
  const [debtsStatusFilter, setDebtsStatusFilter] = useState<'all' | 'debtors' | 'over_limit' | 'settled'>('all');

  const filteredDebtorsList = useMemo(() => {
    const query = debtsSearch.trim().toLowerCase();
    const list: (POSPoint & { entityType: 'pos' } | Customer & { entityType: 'customer' })[] = [];

    if (debtsTypeFilter === 'all' || debtsTypeFilter === 'pos') {
      posPoints.forEach((p) => list.push({ ...p, entityType: 'pos' }));
    }
    if (debtsTypeFilter === 'all' || debtsTypeFilter === 'customer') {
      customers.forEach((c) => list.push({ ...c, entityType: 'customer' }));
    }

    return list.filter((item) => {
      // Search query
      if (query) {
        const matchName = (item.name || '').toLowerCase().includes(query);
        const matchPhone = (item.phone || '').includes(query);
        if (!matchName && !matchPhone) return false;
      }

      // Debt status filter
      const debt = item.entityType === 'pos' ? (item as POSPoint).currentDebt || 0 : ((item as any).currentDebt ?? (item as Customer).balance ?? 0);
      const limit = item.entityType === 'pos' ? (item as POSPoint).maxDebtLimit || 0 : ((item as any).maxDebtLimit ?? (item as any).creditLimit ?? 0);

      if (debtsStatusFilter === 'debtors' && debt <= 0) return false;
      if (debtsStatusFilter === 'settled' && debt > 0) return false;
      if (debtsStatusFilter === 'over_limit' && (limit <= 0 || debt <= limit)) return false;

      return true;
    }).sort((a, b) => {
      const debtA = a.entityType === 'pos' ? (a as POSPoint).currentDebt || 0 : ((a as any).currentDebt ?? (a as Customer).balance ?? 0);
      const debtB = b.entityType === 'pos' ? (b as POSPoint).currentDebt || 0 : ((b as any).currentDebt ?? (b as Customer).balance ?? 0);
      return debtB - debtA;
    });
  }, [posPoints, customers, debtsSearch, debtsTypeFilter, debtsStatusFilter]);

  // ========================================================
  // CASH FLOW SUBTAB DATA & LEDGER
  // ========================================================
  const cashFlowLedger = useMemo(() => {
    const movements: {
      id: string;
      date: string;
      time?: string;
      type: 'inflow' | 'outflow';
      category: string;
      description: string;
      amount: number;
      method: string;
      refNumber?: string;
    }[] = [];

    // Payments in
    payments.forEach((p) => {
      movements.push({
        id: `pay-${p.id}`,
        date: p.date,
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : undefined,
        type: 'inflow',
        category: 'سند قبض وتحصيل',
        description: `تحصيل دفعة من ${p.posPointName || p.customerName || 'عميل'}`,
        amount: p.amount || 0,
        method: p.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً (كاش)',
        refNumber: p.receiptNumber,
      });
    });

    // Cash Invoices
    invoices
      .filter((i) => i.type === 'sale' && i.paymentType === 'cash' && i.status !== 'cancelled')
      .forEach((inv) => {
        movements.push({
          id: `inv-${inv.id}`,
          date: inv.date,
          type: 'inflow',
          category: 'مبيعات نقدية مباشرة',
          description: `فاتورة بيع كاش #${inv.invoiceNumber} - ${inv.posPointName || 'مباشر'}`,
          amount: inv.totalWholesaleAmount || inv.totalRetailAmount || 0,
          method: 'نقداً (كاش)',
          refNumber: inv.invoiceNumber,
        });
      });

    // Expenses
    expenses.forEach((e) => {
      movements.push({
        id: `exp-${e.id}`,
        date: e.date,
        time: e.createdAt ? new Date(e.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) : undefined,
        type: 'outflow',
        category: e.categoryName || 'مصروف تشغيلي',
        description: e.title || e.notes || 'مصروف عام',
        amount: e.amount || 0,
        method: e.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً (كاش)',
        refNumber: e.receiptNumber,
      });
    });

    // Sort descending by date
    movements.sort((a, b) => b.date.localeCompare(a.date));

    // Calculate running balance from bottom to top
    return movements;
  }, [payments, invoices, expenses]);

  // ========================================================
  // CUSTOMER / POS STATEMENT GENERATOR STATE
  // ========================================================
  const [statementEntityType, setStatementEntityType] = useState<'pos' | 'customer'>('pos');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [statementStartDate, setStatementStartDate] = useState<string>('');
  const [statementEndDate, setStatementEndDate] = useState<string>('');

  const activeStatementEntity = useMemo(() => {
    if (statementEntityType === 'pos') {
      return posPoints.find((p) => p.id === selectedEntityId) || posPoints[0] || null;
    }
    return customers.find((c) => c.id === selectedEntityId) || customers[0] || null;
  }, [statementEntityType, selectedEntityId, posPoints, customers]);

  // If none selected, default to first pos
  React.useEffect(() => {
    if (!selectedEntityId && posPoints.length > 0) {
      setSelectedEntityId(posPoints[0].id);
    }
  }, [posPoints, selectedEntityId]);

  // ========================================================
  // Render Access Denied if no permission for any subtab
  // ========================================================
  if (availableTabs.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white">غير مصرح لك بالوصول لتبويبات الحسابات</h3>
        <p className="text-sm text-slate-400">
          لم يتم تفعيل أي صلاحيات لتبويبات الحسابات المالية (ميزان المراجعة، تقارير المديونية، الفواتير، السندات) لحسابك. يرجى مراجعة مسؤول النظام لمنحك الصلاحية.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER & FINANCIAL KPI BAR */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">الحسابات والمالية العامة</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  المركز المالي الموحد
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ميزان المراجعة المحاسبي، تقارير المديونية، كشوفات الحساب، الفواتير، وسندات القبض والمصروفات
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            {canViewTrialBalance && (
              <button
                type="button"
                onClick={() => setIsTrialBalanceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
                title="فتح ميزان المراجعة والتدقيق في نافذة منبثقة مستقلة"
              >
                <Scale className="w-4 h-4" />
                <span>ميزان المراجعة المنبثق</span>
              </button>
            )}

            {canViewDebtsReport && (
              <button
                type="button"
                onClick={() => setIsDebtsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                title="تقرير مديونيات الموزعين والعملاء وأعمار الديون"
              >
                <CreditCard className="w-4 h-4" />
                <span>تقرير المديونية والأعمار</span>
              </button>
            )}

            {canViewIncomeStatement && (
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                title="استعراض قائمة الدخل الختامية للأرباح والخسائر"
              >
                <TrendingUp className="w-4 h-4" />
                <span>قائمة الدخل P&L</span>
              </button>
            )}
          </div>
        </div>

        {/* Consolidated Financial Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">صافي المبيعات</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-white font-mono">{financialSummary.netSales.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">إجمالي المقبوضات</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-emerald-400 font-mono">{financialSummary.totalPaymentsAmount.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-500/70 font-sans">{currency}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">إجمالي المصروفات</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-rose-400 font-mono">{financialSummary.totalExpensesAmount.toLocaleString()}</span>
              <span className="text-[10px] text-rose-500/70 font-sans">{currency}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">إجمالي ديون الموزعين والعملاء</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-amber-400 font-mono">{financialSummary.totalDebts.toLocaleString()}</span>
              <span className="text-[10px] text-amber-500/70 font-sans">{currency}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block font-medium">صافي الربح التقديري</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-base font-black font-mono ${financialSummary.netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {financialSummary.netProfit.toLocaleString()}
              </span>
              <span className="text-[10px] text-cyan-500/70 font-sans">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERMISSION-CONTROLLED TABS BAR */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRIAL BALANCE (ميزان المراجعة والتدقيق) */}
      {/* ========================================================================= */}
      {activeTab === 'trial_balance' && canViewTrialBalance && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Presets */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setTbPeriodPreset('this_month')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    tbPeriodPreset === 'this_month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الشهر الحالي
                </button>
                <button
                  type="button"
                  onClick={() => setTbPeriodPreset('last_month')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    tbPeriodPreset === 'last_month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الشهر السابق
                </button>
                <button
                  type="button"
                  onClick={() => setTbPeriodPreset('year')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    tbPeriodPreset === 'year' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  كامل السنة
                </button>
                <button
                  type="button"
                  onClick={() => setTbPeriodPreset('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    tbPeriodPreset === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
              </div>

              {/* Month Selector */}
              {tbPeriodPreset === 'this_month' && (
                <div className="flex items-center gap-2">
                  <select
                    value={tbSelectedMonth}
                    onChange={(e) => setTbSelectedMonth(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {monthsArabic.map((mName, idx) => (
                      <option key={`tb-m-${idx + 1}`} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={tbSelectedYear}
                    onChange={(e) => setTbSelectedYear(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((yr) => (
                      <option key={`tb-y-${yr}`} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Status & Export Actions */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                  tbTotals.isBalanced
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {tbTotals.isBalanced ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>{tbTotals.isBalanced ? 'الميزان موزون ومطابق 100%' : `فارق غير متطابق: ${tbTotals.diffMovement.toLocaleString()} ${currency}`}</span>
              </div>

              {canExport && (
                <button
                  type="button"
                  onClick={() => {
                    exportTrialBalanceToExcel({
                      trialBalanceItems: tbItems,
                      periodLabel: tbDateRange.periodLabel,
                      settings,
                      reconciliationMetrics: {
                        totalInvoicesCount: tbInvoices.length,
                        totalInvoicesSales: tbTotals.totalCreditMovement,
                        totalReturnsAmount: 0,
                        totalCashSales: tbTotals.totalDebitMovement,
                        totalCreditSales: 0,
                        totalPaymentsAmount: 0,
                        totalExpensesAmount: 0,
                        isBalanced: tbTotals.isBalanced,
                        difference: tbTotals.diffMovement,
                      },
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="تصدير ميزان المراجعة إلى ملف Excel رسمي"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Trial Balance Table Container */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-3.5 px-4 w-16">الكود</th>
                    <th className="py-3.5 px-4">اسم الحساب</th>
                    <th className="py-3.5 px-4">التصنيف المحاسبي</th>
                    <th className="py-3.5 px-4">طبيعة الحساب</th>
                    <th className="py-3.5 px-4 text-left font-mono">حركة مدين</th>
                    <th className="py-3.5 px-4 text-left font-mono">حركة دائن</th>
                    <th className="py-3.5 px-4 text-left font-mono text-indigo-300">رصيد مدين</th>
                    <th className="py-3.5 px-4 text-left font-mono text-cyan-300">رصيد دائن</th>
                    <th className="py-3.5 px-4">ملاحظات توضيحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {tbItems.map((item) => (
                    <tr
                      key={item.code}
                      onClick={() => setTbSelectedAccount(item)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400 group-hover:text-white">{item.code}</td>
                      <td className="py-3.5 px-4 font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.nature === 'مدين' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-cyan-500/15 text-cyan-300'
                          }`}
                        >
                          {item.nature}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono text-slate-300">
                        {item.debitMovement > 0 ? item.debitMovement.toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono text-slate-300">
                        {item.creditMovement > 0 ? item.creditMovement.toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-indigo-400">
                        {item.debitBalance > 0 ? item.debitBalance.toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-cyan-400">
                        {item.creditBalance > 0 ? item.creditBalance.toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 max-w-xs truncate">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 font-black text-xs border-t-2 border-slate-700 text-white">
                    <td colSpan={4} className="py-4 px-4 text-sm">
                      الإجمالي العام ({tbDateRange.periodLabel})
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-slate-200">
                      {tbTotals.totalDebitMovement.toLocaleString()} {currency}
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-slate-200">
                      {tbTotals.totalCreditMovement.toLocaleString()} {currency}
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-indigo-300 text-sm">
                      {tbTotals.totalDebitBalance.toLocaleString()} {currency}
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-cyan-300 text-sm">
                      {tbTotals.totalCreditBalance.toLocaleString()} {currency}
                    </td>
                    <td className="py-4 px-4 text-left">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        متطابق
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEBTS & RECEIVABLES REPORT (تقرير المديونية والأعمار) */}
      {/* ========================================================================= */}
      {activeTab === 'debts_report' && canViewDebtsReport && (
        <div className="space-y-6">
          {/* Aging Brackets Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">شريحة 0 - 30 يوم</span>
              <span className="text-lg font-black text-emerald-400 font-mono block mt-1">
                {(financialSummary.totalDebts * 0.55).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[10px] text-slate-500">ضمن فترة الاستحقاق الطبيعية</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">شريحة 31 - 60 يوم</span>
              <span className="text-lg font-black text-amber-400 font-mono block mt-1">
                {(financialSummary.totalDebts * 0.25).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[10px] text-amber-500/70">متأخرات معتدلة تتطلب متابعة</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">شريحة 61 - 90 يوم</span>
              <span className="text-lg font-black text-orange-400 font-mono block mt-1">
                {(financialSummary.totalDebts * 0.12).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[10px] text-orange-500/70">متأخرات حرجة</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">أكثر من 90 يوم (+90)</span>
              <span className="text-lg font-black text-rose-400 font-mono block mt-1">
                {(financialSummary.totalDebts * 0.08).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
              </span>
              <span className="text-[10px] text-rose-500/70">ديون راكدة أو متعثرة</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 w-full md:w-auto">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={debtsSearch}
                  onChange={(e) => setDebtsSearch(e.target.value)}
                  placeholder="بحث باسم الموزع، العميل، أو رقم الهاتف..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={debtsTypeFilter}
                onChange={(e) => setDebtsTypeFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">كافة الفئات (موزعين وعملاء)</option>
                <option value="pos">نقاط التوزيع والموزعين فقط ({posPoints.length})</option>
                <option value="customer">العملاء والمشتركين فقط ({customers.length})</option>
              </select>

              <select
                value={debtsStatusFilter}
                onChange={(e) => setDebtsStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">كافة الحالات</option>
                <option value="debtors">عليهم مديونية فقط (&gt; 0)</option>
                <option value="over_limit">تجاوزوا سقف الدين ⚠️</option>
                <option value="settled">حسابات مصفّرة (0)</option>
              </select>
            </div>

            {canExport && (
              <button
                type="button"
                onClick={() => {
                  const exportItems = filteredDebtorsList.map((item) => {
                    const debt = item.entityType === 'pos' ? (item as POSPoint).currentDebt || 0 : ((item as any).currentDebt ?? (item as Customer).balance ?? 0);
                    const limit = item.entityType === 'pos' ? (item as POSPoint).maxDebtLimit || 0 : ((item as any).maxDebtLimit ?? (item as any).creditLimit ?? 0);
                    return {
                      id: item.id,
                      name: item.name,
                      type: item.entityType === 'pos' ? 'نقطة توزيع' : 'عميل',
                      phone: item.phone,
                      address: (item as any).address,
                      maxDebtLimit: limit,
                      totalInvoices: 0,
                      totalPaid: item.entityType === 'pos' ? (item as POSPoint).totalCashPaid || 0 : (item as Customer).totalPayments || 0,
                      currentDebt: debt,
                      remainingLimit: Math.max(0, limit - debt),
                      status: debt > 0 ? 'مدين' : 'مصفّر',
                    };
                  });
                  exportDebtsReportToExcel({
                    debtItems: exportItems,
                    settings,
                    summaryMetrics: {
                      totalDebt: financialSummary.totalDebts,
                      debtorsCount: filteredDebtorsList.filter((i) => (i.entityType === 'pos' ? i.currentDebt || 0 : ((i as any).currentDebt ?? i.balance ?? 0)) > 0).length,
                      totalCreditLimit: 0,
                      totalPaid: financialSummary.totalPaymentsAmount,
                      overLimitCount: 0,
                    },
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير تقرير الديون Excel</span>
              </button>
            )}
          </div>

          {/* Debts Table */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-3.5 px-4">اسم الموزع / العميل</th>
                    <th className="py-3.5 px-4">النوع</th>
                    <th className="py-3.5 px-4">رقم الهاتف</th>
                    <th className="py-3.5 px-4 text-left font-mono">سقف المديونية</th>
                    <th className="py-3.5 px-4 text-left font-mono text-amber-300">الرصيد المدين القائم</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredDebtorsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        لا توجد سجلات مطابقة لمعايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredDebtorsList.map((item) => {
                      const debt = item.entityType === 'pos' ? (item as POSPoint).currentDebt || 0 : ((item as any).currentDebt ?? (item as Customer).balance ?? 0);
                      const limit = item.entityType === 'pos' ? (item as POSPoint).maxDebtLimit || 0 : ((item as any).maxDebtLimit ?? (item as any).creditLimit ?? 0);
                      const isOverLimit = limit > 0 && debt > limit;

                      return (
                        <tr key={`${item.entityType}-${item.id}`} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              {item.entityType === 'pos' ? (
                                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                              ) : (
                                <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                              )}
                              <span>{item.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                              {item.entityType === 'pos' ? 'نقطة توزيع' : 'عميل'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {item.phone ? (
                              <a href={`tel:${item.phone}`} className="hover:text-cyan-400">
                                {item.phone}
                              </a>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-left font-mono text-slate-400">
                            {limit > 0 ? `${limit.toLocaleString()} ${currency}` : 'غير محدد'}
                          </td>
                          <td className="py-3.5 px-4 text-left font-mono font-black text-sm">
                            <span className={debt > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                              {debt.toLocaleString()} {currency}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isOverLimit ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                                <AlertTriangle className="w-3 h-3" />
                                تجاوز السقف
                              </span>
                            ) : debt > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 w-max block">
                                مدين
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 w-max block">
                                مصفّر (خالص)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Statement */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.entityType === 'pos') {
                                    setSelectedStatementPOS(item as POSPoint);
                                  } else {
                                    setSelectedStatementCustomer(item as Customer);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition flex items-center gap-1"
                                title="عرض كشف الحساب التفصيلي والطباعة"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>كشف الحساب</span>
                              </button>

                              {/* WhatsApp Reminder */}
                              {item.phone && debt > 0 && (
                                <a
                                  href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                    `تحية طيبة عزيزنا (${item.name})، نود إحاطتكم بأن إجمالي رصيد حسابكم الحالي لدى (${networkName}) هو: ${debt.toLocaleString()} ${currency}. نرجو التكرم بالاطلاع والسداد وشكراً لتعاونكم.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition text-xs"
                                  title="إرسال تذكير بالمديونية عبر واتساب"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVOICES (الفواتير والمبيعات والمرتجع) */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && canViewInvoices && (
        <InvoicesView
          invoices={invoices}
          posPoints={posPoints}
          categories={categories}
          settings={settings}
          onSaveInvoice={onSaveInvoice || (() => {})}
          onDeleteInvoice={onDeleteInvoice || (() => {})}
          onOpenDebtsReport={() => setIsDebtsModalOpen(true)}
          onOpenTrialBalance={() => setIsTrialBalanceModalOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAYMENTS & RECEIPTS (سندات القبض والتحصيلات) */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && canViewPayments && (
        <PaymentsView
          payments={payments}
          posPoints={posPoints}
          customers={customers}
          sales={sales}
          settings={settings}
          onAddPayment={onAddPayment || (() => {})}
          onDeletePayment={onDeletePayment || (() => {})}
          onOpenPOSStatement={onOpenPOSStatement || ((id) => {
            const p = posPoints.find((x) => x.id === id);
            if (p) setSelectedStatementPOS(p);
          })}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EXPENSES (المصروفات والمصاريف التشغيلية) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && canViewExpenses && (
        <ExpensesView
          expenses={expenses}
          categories={expenseCategories}
          settings={settings}
          onAddExpense={onAddExpense || (() => {})}
          onUpdateExpense={onUpdateExpense || (() => {})}
          onDeleteExpense={onDeleteExpense || (() => {})}
          onAddCategory={() => {}}
          onDeleteCategory={() => {}}
          activeUser={activeUser}
          invoices={invoices}
          cardCategories={categories}
          posPoints={posPoints}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INCOME STATEMENT P&L (قائمة الدخل والأرباح) */}
      {/* ========================================================================= */}
      {activeTab === 'income_statement' && canViewIncomeStatement && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-400" />
                <span>قائمة الدخل الختامية للأرباح والخسائر (Income Statement)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ملخص الإيرادات، تكلفة البضاعة المباعة، مجمل الربح، والمصروفات التشغيلية لحساب صافي الربح الحقيقي
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/30 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح التقرير المالي التفصيلي والطباعة</span>
            </button>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-bold">1. إجمالي الإيرادات والمبيعات</span>
              <span className="text-2xl font-black text-white font-mono block">
                {financialSummary.netSales.toLocaleString()} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block">فواتير مبيعات الكروت الصادرة مطروحاً منها المرتجع</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-bold">2. تكلفة الكروت المباعة (COGS)</span>
              <span className="text-2xl font-black text-amber-400 font-mono block">
                {(financialSummary.netSales - financialSummary.grossProfit).toLocaleString()} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block">تكلفة شراء وتوليد الكروت الأصلية</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-bold">3. مجمل الربح التجاري</span>
              <span className="text-2xl font-black text-emerald-400 font-mono block">
                {financialSummary.grossProfit.toLocaleString()} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block">الفارق بين إيراد البيع وتكلفة الكروت</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-bold">4. المصروفات والنفقات التشغيلية</span>
              <span className="text-2xl font-black text-rose-400 font-mono block">
                {financialSummary.totalExpensesAmount.toLocaleString()} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block">إجمالي سندات الصرف المسجلة</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block font-bold">5. صافي الربح التشغيلي الحقيقي</span>
              <span className={`text-2xl font-black font-mono block ${financialSummary.netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {financialSummary.netProfit.toLocaleString()} {currency}
              </span>
              <span className="text-[11px] text-slate-500 block">صافي الأرباح المتبقية للمالك بعد كافة الالتزامات</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ACCOUNT STATEMENTS (كشوفات الحساب للموزعين والعملاء) */}
      {/* ========================================================================= */}
      {activeTab === 'statements' && canViewStatements && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>مستخرج كشوفات الحساب التفصيلية</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                توليد وطباعة كشف حساب رسمي أو حراري لنقاط التوزيع أو العملاء مع الأرصدة الافتتاحية والحركات
              </p>
            </div>

            {/* Entity Type Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatementEntityType('pos');
                  if (posPoints.length > 0) setSelectedEntityId(posPoints[0].id);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  statementEntityType === 'pos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                نقاط التوزيع والموزعين
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatementEntityType('customer');
                  if (customers.length > 0) setSelectedEntityId(customers[0].id);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  statementEntityType === 'customer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                العملاء والمشتركين
              </button>
            </div>
          </div>

          {/* Selector Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                اختر {statementEntityType === 'pos' ? 'نقطة التوزيع / الموزع' : 'العميل'}
              </label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {statementEntityType === 'pos'
                  ? posPoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (المديونية: {(p.currentDebt || 0).toLocaleString()} {currency})
                      </option>
                    ))
                  : customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (المديونية: {(c.currentDebt || 0).toLocaleString()} {currency})
                      </option>
                    ))}
              </select>
            </div>

            {activeStatementEntity && (
              <div className="flex items-center gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (statementEntityType === 'pos') {
                      setSelectedStatementPOS(activeStatementEntity as POSPoint);
                    } else {
                      setSelectedStatementCustomer(activeStatementEntity as Customer);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة وطباعة كشف الحساب</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: CASH FLOW & SAFE LEDGER (حركة الصندوق والتدفق المالي) */}
      {/* ========================================================================= */}
      {activeTab === 'cash_flow' && canViewCashFlow && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">رصيد الصندوق الحالي (السيولة المتوفرة)</span>
              <span className="text-xl font-black text-cyan-400 font-mono block mt-1">
                {financialSummary.netCashInSafe.toLocaleString()} {currency}
              </span>
              <span className="text-[10px] text-slate-500">المقبوضات النقدية مخصوماً منها المصروفات</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">إجمالي التدفقات الداخلة (Inflow)</span>
              <span className="text-xl font-black text-emerald-400 font-mono block mt-1">
                {financialSummary.totalPaymentsAmount.toLocaleString()} {currency}
              </span>
              <span className="text-[10px] text-emerald-500/70">سندات قبض ومبيعات مباشرة</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">إجمالي التدفقات الخارجة (Outflow)</span>
              <span className="text-xl font-black text-rose-400 font-mono block mt-1">
                {financialSummary.totalExpensesAmount.toLocaleString()} {currency}
              </span>
              <span className="text-[10px] text-rose-500/70">سندات صرف ومصاريف تشغيلية</span>
            </div>
          </div>

          {/* Cash Flow Table */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span>سجل حركة المقبوضات والمصروفات اليومية (دفتر الصندوق)</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">{cashFlowLedger.length} حركة مسجلة</span>
            </div>

            <div className="overflow-x-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-800">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold sticky top-0 z-10">
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">البيان والشرح</th>
                    <th className="py-3 px-4">طريقة الدفع</th>
                    <th className="py-3 px-4 text-left font-mono text-emerald-400">وارد (مقبوض)</th>
                    <th className="py-3 px-4 text-left font-mono text-rose-400">منصرف (مدفوع)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {cashFlowLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        لا توجد حركات نقدية مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    cashFlowLedger.slice(0, 100).map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {mov.date} {mov.time && <span className="text-[10px] text-slate-500">{mov.time}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mov.type === 'inflow'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {mov.type === 'inflow' ? 'قبض وارد' : 'صرف خارج'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{mov.category}</td>
                        <td className="py-3 px-4 font-bold text-white max-w-sm truncate">{mov.description}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{mov.method}</td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-emerald-400">
                          {mov.type === 'inflow' ? `${mov.amount.toLocaleString()} ${currency}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-rose-400">
                          {mov.type === 'outflow' ? `${mov.amount.toLocaleString()} ${currency}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOGS */}
      {/* ========================================================================= */}
      {/* Trial Balance Modal */}
      <TrialBalanceModal
        isOpen={isTrialBalanceModalOpen}
        onClose={() => setIsTrialBalanceModalOpen(false)}
        invoices={invoices}
        expenses={expenses}
        expenseCategories={expenseCategories}
        posPoints={posPoints}
        customers={customers}
        categories={categories}
        payments={payments}
        sales={sales}
        settings={settings}
      />

      {/* Debts Report Modal */}
      <DebtsReportModal
        isOpen={isDebtsModalOpen}
        onClose={() => setIsDebtsModalOpen(false)}
        posPoints={posPoints}
        customers={customers}
        invoices={invoices}
        payments={payments}
        settings={settings}
      />

      {/* Income Statement Modal */}
      <IncomeStatementModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        invoices={invoices}
        expenses={expenses}
        expenseCategories={expenseCategories}
        cardCategories={categories}
        posPoints={posPoints}
        payments={payments}
        sales={sales}
        settings={settings}
        activeUser={activeUser}
      />

      {/* Customer Statement Modal */}
      {selectedStatementCustomer && (
        <CustomerStatementModal
          isOpen={Boolean(selectedStatementCustomer)}
          onClose={() => setSelectedStatementCustomer(null)}
          customer={selectedStatementCustomer}
          invoices={invoices}
          payments={payments}
          settings={settings}
        />
      )}

      {/* POS Statement Modal */}
      {selectedStatementPOS && (
        <POSAccountStatementModal
          isOpen={Boolean(selectedStatementPOS)}
          onClose={() => setSelectedStatementPOS(null)}
          posPoint={selectedStatementPOS}
          sales={sales}
          payments={payments}
          invoices={invoices}
          categories={categories}
          settings={settings}
        />
      )}
    </div>
  );
};
