import * as XLSX from 'xlsx';
import {
  InvoiceRecord,
  ExpenseRecord,
  SalesRecord,
  POSPoint,
  CardCategory,
  PaymentRecord,
  NetworkSettings,
  Customer,
  ExpenseCategory,
} from '../types';
import { calculateComprehensiveFinancials, isDateInPeriod, DateFilterPeriod } from './financialCalculations';
import { downloadFile } from './storage';

export interface AccountingExportFilter {
  period: DateFilterPeriod | string;
  startDate?: string;
  endDate?: string;
  posPointId?: string;
  currencySymbol?: string;
}

export interface TrialBalanceItem {
  code: string;
  name: string;
  category: string;
  nature: 'مدين' | 'دائن';
  debitMovement: number;
  creditMovement: number;
  debitBalance: number;
  creditBalance: number;
  notes?: string;
}

export interface DebtExportItem {
  id?: string;
  name: string;
  type: string;
  phone?: string;
  address?: string;
  maxDebtLimit: number;
  totalInvoices: number;
  totalPaid: number;
  currentDebt: number;
  remainingLimit: number;
  status: string;
  lastPaymentDate?: string;
  agingDays?: number | string;
  notes?: string;
}

/**
 * Formats a number to 2 decimal places or 0 if integer
 */
export const fmtNum = (num: number | undefined | null): number => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

/**
 * Ensures right-to-left view is applied to a sheet and workbook
 */
export function applyRTLToSheet(sheet: XLSX.WorkSheet): void {
  if (!sheet['!views']) {
    sheet['!views'] = [];
  }
  sheet['!views'] = [{ rightToLeft: true }];
}

export function createRTLWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  return wb;
}

/**
 * 1. Generate Comprehensive Accounting Excel Workbook (.xlsx) with multiple sheets
 */
export function exportComprehensiveFinancialsExcel(params: {
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  posPoints?: POSPoint[];
  categories?: CardCategory[];
  settings?: NetworkSettings;
  filter: AccountingExportFilter;
  includeSheets?: {
    summary?: boolean;
    invoices?: boolean;
    sales?: boolean;
    expenses?: boolean;
    posPoints?: boolean;
  };
  filename?: string;
}): void {
  const {
    invoices = [],
    expenses = [],
    sales = [],
    payments = [],
    posPoints = [],
    categories = [],
    settings,
    filter,
    includeSheets = { summary: true, invoices: true, sales: true, expenses: true, posPoints: true },
    filename,
  } = params;

  const currency = filter.currencySymbol || settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة مايكروتك للمبيعات';
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate matching financial figures
  const metrics = calculateComprehensiveFinancials({
    invoices,
    expenses,
    payments,
    posPoints,
    categories,
    sales,
    datePeriod: filter.period,
    startDate: filter.startDate,
    endDate: filter.endDate,
    posPointId: filter.posPointId,
  });

  // Filtered data items for tables
  const filteredInvoices = invoices.filter((inv) => {
    if (!inv || inv.status === 'cancelled') return false;
    if (filter.posPointId && filter.posPointId !== 'all' && inv.posPointId !== filter.posPointId) return false;
    return isDateInPeriod(inv.date, filter.period, filter.startDate, filter.endDate);
  });

  const filteredExpenses = expenses.filter((exp) => {
    if (!exp) return false;
    return isDateInPeriod(exp.date, filter.period, filter.startDate, filter.endDate);
  });

  const filteredSales = sales.filter((s) => {
    if (!s) return false;
    if (filter.posPointId && filter.posPointId !== 'all' && s.posPointId !== filter.posPointId) return false;
    return isDateInPeriod(s.date, filter.period, filter.startDate, filter.endDate);
  });

  const workbook = createRTLWorkbook();

  // 1. Reconciliation Summary Sheet
  if (includeSheets.summary !== false) {
    const summaryData: any[][] = [
      ['تقرير المطابقة المالية والمحاسبية وقائمة الدخل', '', '', ''],
      ['اسم المنشأة / الشبكة:', networkName, 'تاريخ التصدير:', todayStr],
      [
        'فترة التقرير:',
        filter.period === 'custom' ? `${filter.startDate || ''} إلى ${filter.endDate || ''}` : filter.period,
        'العملة الأساسية:',
        currency,
      ],
      ['', '', '', ''],
      ['=== أولاً: ملخص قائمة الدخل والأرباح التشغيلية ===', '', '', ''],
      ['البند المحاسبي', `المبلغ (${currency})`, 'البيان والملاحظات والنسب', ''],
      ['إجمالي مبيعات الجملة للكروت (Gross Sales)', fmtNum(metrics.grossSales), `إجمالي الكروت المسلمة: ${metrics.totalCardsSold} كارت`, ''],
      ['(-) مردودات المبيعات (Sales Returns)', fmtNum(metrics.salesReturns), `كروت مرتجعة: ${metrics.totalCardsReturned} كارت`, ''],
      ['(=) صافي المبيعات (Net Sales)', fmtNum(metrics.netSales), `صافي الكروت المباعة: ${metrics.netCardsSold} كارت`, ''],
      ['(-) صافي تكلفة الكروت المباعة (Net COGS)', fmtNum(metrics.netCOGS), 'تكلفة شراء وطباعة الكروت', ''],
      ['(=) مجمل الربح التجاري (Gross Profit)', fmtNum(metrics.grossProfit), `هامش مجمل الربح: ${(metrics.grossProfitMargin ?? 0).toFixed(1)}%`, ''],
      ['(-) إجمالي المصروفات التشغيلية (Total OPEX)', fmtNum(metrics.totalExpenses), `عدد سندات الصرف: ${filteredExpenses.length}`, ''],
      ['(=) صافي الربح الحقيقي النهائي (Net Profit)', fmtNum(metrics.netProfit), `هامش صافي الربح: ${(metrics.netProfitMargin ?? 0).toFixed(1)}%`, ''],
      ['', '', '', ''],
      ['=== ثانياً: ملخص السيولة النقدية والمقبوضات ===', '', '', ''],
      ['البند', `المبلغ (${currency})`, 'الحالة والبيان', ''],
      ['إجمالي المقبوضات والتحصيلات النقدية والبنكية', fmtNum(metrics.totalCashCollected), 'المبالغ المحصلة فعلياً بالصندوق والبنك', ''],
      ['إجمالي المصروفات النقدية المسددة', fmtNum(metrics.totalExpenses), 'المبالغ المصروفة فعلياً من الصندوق', ''],
      ['صافي التدفق النقدي للفترة (Net Cash Flow)', fmtNum(metrics.netCashFlow), metrics.netCashFlow >= 0 ? 'فائض نقدي متوفر' : 'عجز في السيولة النقدية', ''],
      ['إجمالي أرصدة مديونيات نقاط البيع القائمة', fmtNum(metrics.totalPOSDebt), 'مستحقات معلقة بذمة الموزعين بالسوق', ''],
      ['', '', '', ''],
      ['=== ثالثاً: تقييم مخزون كروت الشبكة بالمستودع ===', '', '', ''],
      ['إجمالي رصيد الكروت المتاحة بالمستودع', metrics.totalWarehouseStock, 'كارت جاهز للبيع', ''],
      ['قيمة المخزون بسعر التكلفة', fmtNum(metrics.inventoryValuationCost), currency, ''],
      ['قيمة المخزون بسعر الجملة', fmtNum(metrics.inventoryValuationWholesale), currency, ''],
      ['قيمة المخزون بسعر التجزئة (سعر الجمهور)', fmtNum(metrics.inventoryValuationRetail), currency, ''],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    applyRTLToSheet(summarySheet);
    summarySheet['!cols'] = [{ wch: 42 }, { wch: 24 }, { wch: 38 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'قائمة الدخل والمطابقة');
  }

  // 2. Invoices Registry Sheet
  if (includeSheets.invoices !== false && filteredInvoices.length > 0) {
    const invoicesRows = filteredInvoices.map((inv) => {
      const pos = posPoints.find((p) => p.id === inv.posPointId);
      const isReturn = inv.type === 'return';
      const itemsDetail = (inv.items || [])
        .map((it) => `${it.categoryName || 'كارت'} (${it.quantity}×${it.unitWholesalePrice || 0})`)
        .join(' | ');

      return {
        'رقم الفاتورة': inv.invoiceNumber,
        'التاريخ': inv.date,
        'نوع الفاتورة': isReturn ? 'مرتجع كروت' : 'مبيعات وتوريد كروت',
        'نقطة البيع / الموزع': inv.posPointName || pos?.name || 'نقطة توزيع',
        'طريقة القيد': inv.paymentType === 'cash' ? 'نقدي (فوري)' : 'آجل (على الحساب)',
        'إجمالي الكمية (كروت)': inv.totalQuantity || 0,
        [`إجمالي الجملة (${currency})`]: fmtNum(inv.totalWholesaleAmount),
        [`إجمالي التجزئة (${currency})`]: fmtNum(inv.totalRetailAmount),
        [`التكلفة (${currency})`]: fmtNum(inv.totalCostAmount || 0),
        [`الربح (${currency})`]: fmtNum(inv.totalProfit || 0),
        'تفاصيل الأصناف': itemsDetail,
        'المستلم': inv.receivedBy || pos?.managerName || '',
        'المسلم': inv.deliveredBy || 'الإدارة',
        'الحالة': inv.status === 'completed' ? 'معتمدة ومرحلة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
        'ملاحظات': isReturn ? (inv.reasonForReturn || inv.notes || '') : (inv.notes || ''),
      };
    });

    const invoicesSheet = XLSX.utils.json_to_sheet(invoicesRows);
    applyRTLToSheet(invoicesSheet);
    invoicesSheet['!cols'] = [
      { wch: 18 }, // رقم الفاتورة
      { wch: 14 }, // التاريخ
      { wch: 22 }, // نوع الفاتورة
      { wch: 26 }, // نقطة البيع
      { wch: 18 }, // طريقة القيد
      { wch: 18 }, // إجمالي الكمية
      { wch: 20 }, // إجمالي الجملة
      { wch: 20 }, // إجمالي التجزئة
      { wch: 18 }, // التكلفة
      { wch: 18 }, // الربح
      { wch: 38 }, // تفاصيل الأصناف
      { wch: 18 }, // المستلم
      { wch: 18 }, // المسلم
      { wch: 18 }, // الحالة
      { wch: 30 }, // ملاحظات
    ];
    XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'سجل الفواتير');
  }

  // 3. Detailed Sales Line Items Sheet
  if (includeSheets.sales !== false) {
    const salesRows: any[] = [];

    filteredInvoices.forEach((inv) => {
      const pos = posPoints.find((p) => p.id === inv.posPointId);
      const isReturn = inv.type === 'return';

      (inv.items || []).forEach((item) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        const unitCost = item.unitCostPrice ?? cat?.costPrice ?? 0;
        const unitWholesale = item.unitWholesalePrice || (item.quantity ? item.totalWholesalePrice / item.quantity : 0);
        const unitRetail = item.unitRetailPrice || cat?.retailPrice || 0;
        const totalWholesale = item.totalWholesalePrice || (item.quantity || 0) * unitWholesale;
        const totalCost = (item.quantity || 0) * unitCost;
        const profit = isReturn ? 0 : totalWholesale - totalCost;

        salesRows.push({
          'رقم الفاتورة': inv.invoiceNumber,
          'التاريخ': inv.date,
          'نوع العملية': isReturn ? 'مرتجع كروت' : 'مبيعات وتوريد كروت',
          'نقطة البيع / الموزع': inv.posPointName || pos?.name || 'نقطة توزيع',
          'فئة الكارت': item.categoryName || cat?.name || 'كارت',
          'الكمية': item.quantity || 0,
          [`سعر التكلفة (${currency})`]: fmtNum(unitCost),
          [`سعر الجملة (${currency})`]: fmtNum(unitWholesale),
          [`سعر التجزئة (${currency})`]: fmtNum(unitRetail),
          [`إجمالي الجملة (${currency})`]: fmtNum(isReturn ? -totalWholesale : totalWholesale),
          [`إجمالي التكلفة (${currency})`]: fmtNum(isReturn ? -totalCost : totalCost),
          [`الربح المحقق (${currency})`]: fmtNum(profit),
          'بداية السيريال': item.serialStart || '',
          'نهاية السيريال': item.serialEnd || '',
          'طريقة القيد': inv.paymentType === 'cash' ? 'نقدي' : 'آجل',
          'ملاحظات': item.notes || inv.notes || '',
        });
      });
    });

    filteredSales.forEach((s) => {
      const pos = posPoints.find((p) => p.id === s.posPointId);
      const cat = categories.find((c) => c.id === s.categoryId);
      const unitCost = cat?.costPrice || 0;
      const totalCost = (s.quantity || 0) * unitCost;
      const totalWholesale = s.totalWholesaleAmount || (s.quantity || 0) * (s.unitWholesalePrice || cat?.wholesalePrice || 0);
      const profit = s.profit || (totalWholesale - totalCost);

      salesRows.push({
        'رقم الفاتورة': s.invoiceNumber || 'مبيعات مباشرة',
        'التاريخ': s.date,
        'نوع العملية': 'مبيعات مباشرة',
        'نقطة البيع / الموزع': pos?.name || 'نقطة توزيع',
        'فئة الكارت': cat?.name || 'كارت',
        'الكمية': s.quantity || 0,
        [`سعر التكلفة (${currency})`]: fmtNum(unitCost),
        [`سعر الجملة (${currency})`]: fmtNum(s.unitWholesalePrice || cat?.wholesalePrice || 0),
        [`سعر التجزئة (${currency})`]: fmtNum(s.unitRetailPrice || cat?.retailPrice || 0),
        [`إجمالي الجملة (${currency})`]: fmtNum(totalWholesale),
        [`إجمالي التكلفة (${currency})`]: fmtNum(totalCost),
        [`الربح المحقق (${currency})`]: fmtNum(profit),
        'بداية السيريال': '',
        'نهاية السيريال': '',
        'طريقة القيد': s.paymentType === 'cash' ? 'نقدي' : 'آجل',
        'ملاحظات': s.notes || '',
      });
    });

    if (salesRows.length > 0) {
      const salesSheet = XLSX.utils.json_to_sheet(salesRows);
      applyRTLToSheet(salesSheet);
      salesSheet['!cols'] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 22 },
        { wch: 26 },
        { wch: 22 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'تفاصيل مبيعات الكروت');
    }
  }

  // 4. Expenses Registry Sheet
  if (includeSheets.expenses !== false && filteredExpenses.length > 0) {
    const paymentMethodNames: Record<string, string> = {
      cash: 'نقداً من الصندوق',
      bank_transfer: 'تحويل بنكي / حساب مصرفي',
      cheque: 'شيك مصرفي',
      other: 'أخرى',
    };

    const expensesRows = filteredExpenses.map((exp) => {
      return {
        'رقم السند': exp.voucherNumber,
        'التاريخ': exp.date,
        'تصنيف المصروف': exp.categoryName || 'مصروفات تشغيلية',
        'وصف المصروف / البيان': exp.title,
        [`المبلغ (${currency})`]: fmtNum(exp.amount),
        'طريقة الدفع': paymentMethodNames[exp.paymentMethod] || exp.paymentMethod || 'نقداً',
        'المدفوع له (المستلم)': exp.paidTo || '',
        'رقم الحوالة / السند اليدوي': exp.referenceNumber || '',
        'المسؤول / المدخل': exp.createdByName || 'المسؤول المالي',
        'ملاحظات إضافية': exp.notes || '',
      };
    });

    const expensesSheet = XLSX.utils.json_to_sheet(expensesRows);
    applyRTLToSheet(expensesSheet);
    expensesSheet['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 26 },
      { wch: 36 },
      { wch: 20 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 32 },
    ];
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'سجل المصروفات');
  }

  // 5. POS Points Balances Sheet
  if (includeSheets.posPoints !== false && posPoints.length > 0) {
    const posRows = posPoints.map((pos) => {
      const remainingLimit = (pos.maxDebtLimit || 0) - (pos.currentDebt || 0);
      return {
        'اسم نقطة البيع': pos.name,
        'المسؤول / الموزع': pos.managerName,
        'رقم الهاتف': pos.phone,
        'العنوان': pos.address,
        [`المديونية الحالية (${currency})`]: fmtNum(pos.currentDebt),
        [`سقف المديونية المسموح (${currency})`]: fmtNum(pos.maxDebtLimit),
        [`المتبقي من سقف المديونية (${currency})`]: fmtNum(remainingLimit),
        'إجمالي الكروت المسلمة': pos.totalCardsDelivered || 0,
        'إجمالي الكروت المباعة': pos.totalCardsSold || 0,
        [`إجمالي المبالغ المسددة (${currency})`]: fmtNum(pos.totalCashPaid),
        'الحالة': pos.status === 'active' ? 'نشط' : pos.status === 'suspended' ? 'موقف' : 'غير معروف',
        'ملاحظات': pos.notes || '',
      };
    });

    const posSheet = XLSX.utils.json_to_sheet(posRows);
    applyRTLToSheet(posSheet);
    posSheet['!cols'] = [
      { wch: 26 },
      { wch: 22 },
      { wch: 18 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, posSheet, 'أرصدة نقاط البيع');
  }

  // Generate and download file
  const outFilename = filename || `المطابقة_المحاسبية_الشاملة_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, outFilename);
}

/**
 * 2. Dedicated Income Statement Excel Export (.xlsx)
 */
export function exportIncomeStatementToExcel(params: {
  calculations: any;
  settings?: NetworkSettings;
  periodName?: string;
  filename?: string;
}): void {
  const { calculations, settings, periodName = 'الفترة الحالية', filename } = params;
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  const workbook = createRTLWorkbook();

  const data: any[][] = [
    ['قائمة الدخل والأرباح التشغيلية الرسمية', '', '', ''],
    ['اسم المنشأة / الشبكة:', networkName, 'تاريخ التصدير:', todayStr],
    ['الفترة المحاسبية:', periodName, 'العملة الأساسية:', currency],
    ['', '', '', ''],
    ['=== 1. الإيرادات التشغيلية والمبيعات ===', '', '', ''],
    ['البند المحاسبي', `المبلغ (${currency})`, 'النسب والملاحظات', ''],
    ['إجمالي مبيعات كروت الشبكة (Gross Sales)', fmtNum(calculations.grossSalesRevenue), `إجمالي الكروت المسلمة: ${calculations.totalCardsQuantity || 0} كارت`, ''],
    ['(-) مردودات المبيعات والمرتجعات (Sales Returns)', fmtNum(calculations.salesReturnsValue), `كروت مرتجعة: ${calculations.returnedCardsQuantity || 0} كارت`, ''],
    ['(=) صافي الإيرادات التشغيلية (Net Revenue)', fmtNum(calculations.netSalesRevenue), 'أساس احتساب هوامش الربح والأداء', ''],
    ['', '', '', ''],
    ['=== 2. تكلفة البضاعة المباعة (COGS) ومجمل الربح ===', '', '', ''],
    ['(-) صافي تكلفة شراء وطباعة الكروت المباعة (Net COGS)', fmtNum(calculations.netCOGS), 'تكلفة الكروت من المصدر', ''],
    ['(=) مجمل الربح التجاري (Gross Profit)', fmtNum(calculations.grossProfit), `هامش مجمل الربح: ${(calculations.grossMarginPercent ?? 0).toFixed(1)}%`, ''],
    ['', '', '', ''],
    ['=== 3. المصروفات والنفقات التشغيلية (OPEX) ===', '', '', ''],
    ['البند / تصنيف المصروف', `المبلغ (${currency})`, 'النسبة من إجمالي المصروفات', ''],
  ];

  if (Array.isArray(calculations.expenseBreakdownList) && calculations.expenseBreakdownList.length > 0) {
    calculations.expenseBreakdownList.forEach((e: any) => {
      const pct = calculations.totalOperatingExpenses > 0 ? (e.totalAmount / calculations.totalOperatingExpenses) * 100 : 0;
      data.push([
        `   - مصروف: ${e.categoryName}`,
        fmtNum(e.totalAmount),
        `${pct.toFixed(1)}% من إجمالي المصروفات (${e.count || 0} سند)`,
        '',
      ]);
    });
  } else {
    data.push(['   - لا توجد مصروفات مسجلة خلال الفترة', 0, '-', '']);
  }

  data.push(
    ['(=) إجمالي المصروفات التشغيلية (Total OPEX)', fmtNum(calculations.totalOperatingExpenses), `عدد سندات الصرف: ${calculations.expensesCount || 0}`, ''],
    ['', '', '', ''],
    ['=== 4. النتيجة المالية النهائية (Bottom Line) ===', '', '', ''],
    ['(=) صافي الربح / الخسارة النهائي (Net Profit)', fmtNum(calculations.netProfit), `هامش صافي الربح: ${(calculations.netProfitMarginPercent ?? 0).toFixed(1)}%`, ''],
    ['', '', '', ''],
    ['=== 5. مطابقة السيولة النقدية والمقبوضات ===', '', '', ''],
    ['المقبوضات والتحصيلات النقدية والبنكية (Cash Collected)', fmtNum(calculations.totalCashCollected), `عدد سندات القبض: ${calculations.paymentsCount || 0}`, ''],
    ['المصروفات النقدية المسددة من الصندوق', fmtNum(calculations.totalOperatingExpenses), 'المبالغ المصروفة فعلياً', ''],
    ['صافي التدفق النقدي للفترة (Net Cash Flow)', fmtNum(calculations.netCashFlow), calculations.netCashFlow >= 0 ? 'فائض نقدي متوفر' : 'عجز نقدي', ''],
    ['إجمالي المديونيات المعلقة في السوق (Uncollected Debt)', fmtNum(calculations.currentTotalPOSDebt), 'مستحقات على نقاط التوزيع والعملاء', '']
  );

  const sheet = XLSX.utils.aoa_to_sheet(data);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [{ wch: 44 }, { wch: 24 }, { wch: 38 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'قائمة الدخل والأرباح');

  const outName = filename || `قائمة_الدخل_المالية_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, outName);
}

/**
 * 3. Dedicated Trial Balance Excel Export (.xlsx)
 * ميزان المراجعة بالمجاميع والأرصدة لضبط الفواتير والكشوفات الشهرية
 */
export function exportTrialBalanceToExcel(params: {
  trialBalanceItems: TrialBalanceItem[];
  periodLabel: string;
  settings?: NetworkSettings;
  reconciliationMetrics?: {
    totalInvoicesCount: number;
    totalInvoicesSales: number;
    totalReturnsAmount: number;
    totalCashSales: number;
    totalCreditSales: number;
    totalPaymentsAmount: number;
    totalExpensesAmount: number;
    isBalanced: boolean;
    difference: number;
  };
  filename?: string;
}): void {
  const { trialBalanceItems, periodLabel, settings, reconciliationMetrics, filename } = params;
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  const workbook = createRTLWorkbook();

  // Sheet 1: Trial Balance
  const rows: any[] = trialBalanceItems.map((item) => ({
    'رقم الحساب': item.code,
    'اسم الحساب المحاسبي': item.name,
    'تصنيف الحساب': item.category,
    'طبيعة الحساب': item.nature,
    [`حركات مدين (${currency})`]: fmtNum(item.debitMovement),
    [`حركات دائن (${currency})`]: fmtNum(item.creditMovement),
    [`رصيد مدين (${currency})`]: fmtNum(item.debitBalance),
    [`رصيد دائن (${currency})`]: fmtNum(item.creditBalance),
    'ملاحظات المطابقة': item.notes || '',
  }));

  // Totals calculations
  const totalDebitMovements = trialBalanceItems.reduce((sum, i) => sum + (i.debitMovement || 0), 0);
  const totalCreditMovements = trialBalanceItems.reduce((sum, i) => sum + (i.creditMovement || 0), 0);
  const totalDebitBalances = trialBalanceItems.reduce((sum, i) => sum + (i.debitBalance || 0), 0);
  const totalCreditBalances = trialBalanceItems.reduce((sum, i) => sum + (i.creditBalance || 0), 0);
  const diffMovements = Math.abs(totalDebitMovements - totalCreditMovements);
  const diffBalances = Math.abs(totalDebitBalances - totalCreditBalances);
  const isPerfect = diffMovements < 0.05 && diffBalances < 0.05;

  rows.push({
    'رقم الحساب': '---',
    'اسم الحساب المحاسبي': 'الإجمالي العام لميزان المراجعة',
    'تصنيف الحساب': isPerfect ? 'ميزان متطابق 100%' : 'يوجد فارق تدقيق',
    'طبيعة الحساب': 'المجاميع والأرصدة',
    [`حركات مدين (${currency})`]: fmtNum(totalDebitMovements),
    [`حركات دائن (${currency})`]: fmtNum(totalCreditMovements),
    [`رصيد مدين (${currency})`]: fmtNum(totalDebitBalances),
    [`رصيد دائن (${currency})`]: fmtNum(totalCreditBalances),
    'ملاحظات المطابقة': isPerfect ? '✅ التطابق المحاسبي مكتمل وموزون' : `⚠️ يوجد فارق: ${fmtNum(diffBalances)} ${currency}`,
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [
    { wch: 14 }, // رقم الحساب
    { wch: 30 }, // اسم الحساب
    { wch: 20 }, // تصنيف الحساب
    { wch: 16 }, // طبيعة الحساب
    { wch: 22 }, // حركات مدين
    { wch: 22 }, // حركات دائن
    { wch: 22 }, // رصيد مدين
    { wch: 22 }, // رصيد دائن
    { wch: 34 }, // ملاحظات
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, 'ميزان المراجعة');

  // Sheet 2: Monthly Invoice Reconciliation Summary
  if (reconciliationMetrics) {
    const auditData: any[][] = [
      ['تقرير تدقيق وضبط الفواتير والكشوفات الشهرية', '', '', ''],
      ['اسم المنشأة:', networkName, 'تاريخ الإعداد:', todayStr],
      ['فترة التدقيق:', periodLabel, 'العملة الأساسية:', currency],
      ['', '', '', ''],
      ['=== خلاصة تدقيق فواتير المبيعات والمرتجع ===', '', '', ''],
      ['البند التدقيقي', `المبلغ (${currency})`, 'الملاحظات والبيان', ''],
      ['إجمالي عدد فواتير المبيعات الصادرة', reconciliationMetrics.totalInvoicesCount, 'فاتورة صادرة خلال الفترة', ''],
      ['إجمالي مبيعات الفواتير الصادرة (Gross)', fmtNum(reconciliationMetrics.totalInvoicesSales), 'إجمالي قيمة الكروت المسلمة', ''],
      ['(-) فواتير المرتجع المستلمة (Returns)', fmtNum(reconciliationMetrics.totalReturnsAmount), 'كروت مرتجعة ومخصومة', ''],
      ['(=) صافي مبيعات الفواتير المعتمدة (Net)', fmtNum(reconciliationMetrics.totalInvoicesSales - reconciliationMetrics.totalReturnsAmount), 'صافي المبيعات المحاسبية', ''],
      ['   - فواتير مسددة نقداً (فورية بالصندوق)', fmtNum(reconciliationMetrics.totalCashSales), 'مبيعات كاش مباشرة', ''],
      ['   - فواتير مرحلة بالآجل (على حساب العملاء)', fmtNum(reconciliationMetrics.totalCreditSales), 'أضيفت لذمم الموزعين والعملاء', ''],
      ['', '', '', ''],
      ['=== خلاصة السندات والمقبوضات والمصروفات ===', '', '', ''],
      ['إجمالي سندات القبض المحصلة من الديون', fmtNum(reconciliationMetrics.totalPaymentsAmount), 'سدادات الموزعين والعملاء', ''],
      ['إجمالي سندات الصرف والمصروفات', fmtNum(reconciliationMetrics.totalExpensesAmount), 'نفقات ومصاريف تشغيلية', ''],
      ['حالة اتزان التدقيق المحاسبي', reconciliationMetrics.isBalanced ? '✅ متطابق' : '⚠️ فارق', reconciliationMetrics.isBalanced ? 'الفواتير والسندات مضبوطة بالكامل' : `فارق قدره: ${fmtNum(reconciliationMetrics.difference)}`, ''],
    ];

    const auditSheet = XLSX.utils.aoa_to_sheet(auditData);
    applyRTLToSheet(auditSheet);
    auditSheet['!cols'] = [{ wch: 40 }, { wch: 24 }, { wch: 38 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, auditSheet, 'ضبط الفواتير والكشوفات');
  }

  const outName = filename || `ميزان_المراجعة_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, outName);
}

/**
 * 4. Dedicated Customer & Distributor Debts Report Excel Export (.xlsx)
 * تقرير مديونيات العملاء والموزعين وأعمار الديون
 */
export function exportDebtsReportToExcel(params: {
  debtItems: DebtExportItem[];
  settings?: NetworkSettings;
  summaryMetrics?: {
    totalDebt: number;
    debtorsCount: number;
    totalCreditLimit: number;
    totalPaid: number;
    overLimitCount: number;
  };
  filename?: string;
}): void {
  const { debtItems, settings, summaryMetrics, filename } = params;
  const currency = settings?.currencySymbol || 'ر.ي';
  const networkName = settings?.networkName || 'شبكة مايكروتك';
  const todayStr = new Date().toISOString().split('T')[0];

  const workbook = createRTLWorkbook();

  const rows: any[] = debtItems.map((item) => ({
    'اسم الموزع / العميل': item.name,
    'نوع الحساب': item.type,
    'رقم الهاتف': item.phone || '',
    'المنطقة / العنوان': item.address || '',
    [`سقف الائتمان (${currency})`]: fmtNum(item.maxDebtLimit),
    [`إجمالي التوريدات والفواتير (${currency})`]: fmtNum(item.totalInvoices),
    [`إجمالي السدادات والمقبوضات (${currency})`]: fmtNum(item.totalPaid),
    [`المديونية الحالية (${currency})`]: fmtNum(item.currentDebt),
    [`المتبقي من السقف الائتماني (${currency})`]: fmtNum(item.remainingLimit),
    'حالة المديونية': item.status,
    'تاريخ آخر سداد': item.lastPaymentDate || 'لا يوجد سداد سابق',
    'عمر الدين (أيام)': item.agingDays ?? '-',
    'ملاحظات': item.notes || '',
  }));

  // Add Totals row
  const sumDebt = debtItems.reduce((acc, i) => acc + (i.currentDebt || 0), 0);
  const sumLimit = debtItems.reduce((acc, i) => acc + (i.maxDebtLimit || 0), 0);
  const sumInvoices = debtItems.reduce((acc, i) => acc + (i.totalInvoices || 0), 0);
  const sumPaid = debtItems.reduce((acc, i) => acc + (i.totalPaid || 0), 0);
  const sumRemaining = sumLimit - sumDebt;

  rows.push({
    'اسم الموزع / العميل': 'الإجمالي العام',
    'نوع الحساب': `عدد الحسابات: ${debtItems.length}`,
    'رقم الهاتف': '',
    'المنطقة / العنوان': '',
    [`سقف الائتمان (${currency})`]: fmtNum(sumLimit),
    [`إجمالي التوريدات والفواتير (${currency})`]: fmtNum(sumInvoices),
    [`إجمالي السدادات والمقبوضات (${currency})`]: fmtNum(sumPaid),
    [`المديونية الحالية (${currency})`]: fmtNum(sumDebt),
    [`المتبقي من السقف الائتماني (${currency})`]: fmtNum(sumRemaining),
    'حالة المديونية': `المدينين: ${debtItems.filter((i) => i.currentDebt > 0).length}`,
    'تاريخ آخر سداد': '',
    'عمر الدين (أيام)': '',
    'ملاحظات': 'تقرير رسمي معتمد',
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [
    { wch: 28 }, // الاسم
    { wch: 18 }, // نوع الحساب
    { wch: 16 }, // الهاتف
    { wch: 24 }, // العنوان
    { wch: 20 }, // سقف الائتمان
    { wch: 24 }, // إجمالي التوريدات
    { wch: 24 }, // إجمالي السدادات
    { wch: 22 }, // المديونية الحالية
    { wch: 22 }, // المتبقي من السقف
    { wch: 18 }, // حالة المديونية
    { wch: 18 }, // آخر سداد
    { wch: 16 }, // عمر الدين
    { wch: 28 }, // ملاحظات
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, 'كشف المديونيات وأعمار الديون');

  // Sheet 2: Summary Stats
  if (summaryMetrics) {
    const statsData: any[][] = [
      ['تقرير ملخص مؤشرات الائتمان والمديونية', '', '', ''],
      ['المنشأة:', networkName, 'تاريخ التقرير:', todayStr],
      ['العملة:', currency, '', ''],
      ['', '', '', ''],
      ['المؤشر الائتماني', 'القيمة', 'الوحدة', ''],
      ['إجمالي ديون السوق القائمة', fmtNum(summaryMetrics.totalDebt), currency, ''],
      ['عدد العملاء والموزعين المدينين', summaryMetrics.debtorsCount, 'حساب مدين', ''],
      ['إجمالي سقف التسهيلات الائتمانية', fmtNum(summaryMetrics.totalCreditLimit), currency, ''],
      ['إجمالي التحصيلات والسدادات المسددة', fmtNum(summaryMetrics.totalPaid), currency, ''],
      ['عدد الحسابات المتجاوزة للسقف الائتماني', summaryMetrics.overLimitCount, 'حساب متجاوز', ''],
    ];

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    applyRTLToSheet(statsSheet);
    statsSheet['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'ملخص مؤشرات الائتمان');
  }

  const outName = filename || `تقرير_المديونيات_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, outName);
}

/**
 * 5. Export Invoices to Excel (.xlsx)
 */
export function exportInvoicesToExcel(
  invoices: InvoiceRecord[],
  posPoints: POSPoint[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = createRTLWorkbook();

  const rows = invoices.map((inv) => {
    const pos = posPoints.find((p) => p.id === inv.posPointId);
    const isReturn = inv.type === 'return';
    const itemsDetail = (inv.items || [])
      .map((it) => `${it.categoryName || 'كارت'} (${it.quantity}×${it.unitWholesalePrice || 0})`)
      .join(' | ');

    return {
      'رقم الفاتورة': inv.invoiceNumber,
      'التاريخ': inv.date,
      'نوع الفاتورة': isReturn ? 'مرتجع كروت' : 'مبيعات وتوريد كروت',
      'نقطة البيع / الموزع': inv.posPointName || pos?.name || 'نقطة توزيع',
      'طريقة القيد': inv.paymentType === 'cash' ? 'نقدي' : 'آجل',
      'إجمالي الكمية (كروت)': inv.totalQuantity || 0,
      [`إجمالي الجملة (${currency})`]: fmtNum(inv.totalWholesaleAmount),
      [`إجمالي التجزئة (${currency})`]: fmtNum(inv.totalRetailAmount),
      [`التكلفة (${currency})`]: fmtNum(inv.totalCostAmount || 0),
      [`الربح (${currency})`]: fmtNum(inv.totalProfit || 0),
      'تفاصيل الأصناف': itemsDetail,
      'المستلم': inv.receivedBy || pos?.managerName || '',
      'المسلم': inv.deliveredBy || 'الإدارة',
      'الحالة': inv.status === 'completed' ? 'معتمدة ومرحلة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
      'ملاحظات': inv.notes || '',
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 38 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل الفواتير');
  XLSX.writeFile(workbook, filename || `سجل_فواتير_المبيعات_والمرتجعات_${todayStr}.xlsx`);
}

/**
 * 6. Export Expenses to Excel (.xlsx)
 */
export function exportExpensesToExcel(
  expenses: ExpenseRecord[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = createRTLWorkbook();

  const paymentMethodNames: Record<string, string> = {
    cash: 'نقداً من الصندوق',
    bank_transfer: 'تحويل بنكي / مصرفي',
    cheque: 'شيك مصرفي',
    other: 'أخرى',
  };

  const rows = expenses.map((exp) => {
    return {
      'رقم السند': exp.voucherNumber,
      'التاريخ': exp.date,
      'تصنيف المصروف': exp.categoryName || 'مصروفات تشغيلية',
      'وصف المصروف / البيان': exp.title,
      [`المبلغ (${currency})`]: fmtNum(exp.amount),
      'طريقة الدفع': paymentMethodNames[exp.paymentMethod] || exp.paymentMethod || 'نقداً',
      'المدفوع له': exp.paidTo || '',
      'رقم الحوالة / السند اليدوي': exp.referenceNumber || '',
      'المسؤول / المدخل': exp.createdByName || 'المسؤول المالي',
      'ملاحظات': exp.notes || '',
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 26 },
    { wch: 34 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 32 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل المصروفات');
  XLSX.writeFile(workbook, filename || `سجل_المصروفات_التشغيلية_${todayStr}.xlsx`);
}

/**
 * 7. Export Detailed Sales to Excel (.xlsx)
 */
export function exportSalesToExcel(
  sales: SalesRecord[],
  invoices: InvoiceRecord[],
  posPoints: POSPoint[],
  categories: CardCategory[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = createRTLWorkbook();

  const rows: any[] = [];

  invoices.forEach((inv) => {
    const pos = posPoints.find((p) => p.id === inv.posPointId);
    const isReturn = inv.type === 'return';

    (inv.items || []).forEach((item) => {
      const cat = categories.find((c) => c.id === item.categoryId);
      const unitCost = item.unitCostPrice ?? cat?.costPrice ?? 0;
      const unitWholesale = item.unitWholesalePrice || (item.quantity ? item.totalWholesalePrice / item.quantity : 0);
      const unitRetail = item.unitRetailPrice || cat?.retailPrice || 0;
      const totalWholesale = item.totalWholesalePrice || (item.quantity || 0) * unitWholesale;
      const totalCost = (item.quantity || 0) * unitCost;
      const profit = isReturn ? 0 : totalWholesale - totalCost;

      rows.push({
        'رقم الفاتورة': inv.invoiceNumber,
        'التاريخ': inv.date,
        'نوع العملية': isReturn ? 'مرتجع' : 'مبيعات',
        'نقطة البيع': inv.posPointName || pos?.name || 'نقطة توزيع',
        'فئة الكارت': item.categoryName || cat?.name || 'كارت',
        'الكمية': item.quantity || 0,
        [`سعر التكلفة (${currency})`]: fmtNum(unitCost),
        [`سعر الجملة (${currency})`]: fmtNum(unitWholesale),
        [`سعر التجزئة (${currency})`]: fmtNum(unitRetail),
        [`إجمالي الجملة (${currency})`]: fmtNum(isReturn ? -totalWholesale : totalWholesale),
        [`إجمالي التكلفة (${currency})`]: fmtNum(isReturn ? -totalCost : totalCost),
        [`الربح المحقق (${currency})`]: fmtNum(profit),
        'طريقة القيد': inv.paymentType === 'cash' ? 'نقدي' : 'آجل',
        'ملاحظات': item.notes || inv.notes || '',
      });
    });
  });

  sales.forEach((s) => {
    const pos = posPoints.find((p) => p.id === s.posPointId);
    const cat = categories.find((c) => c.id === s.categoryId);
    const unitCost = cat?.costPrice || 0;
    const totalCost = (s.quantity || 0) * unitCost;
    const totalWholesale = s.totalWholesaleAmount || (s.quantity || 0) * (s.unitWholesalePrice || cat?.wholesalePrice || 0);
    const profit = s.profit || (totalWholesale - totalCost);

    rows.push({
      'رقم الفاتورة': s.invoiceNumber || 'مبيعات مباشرة',
      'التاريخ': s.date,
      'نوع العملية': 'مبيعات مباشرة',
      'نقطة البيع': pos?.name || 'نقطة توزيع',
      'فئة الكارت': cat?.name || 'كارت',
      'الكمية': s.quantity || 0,
      [`سعر التكلفة (${currency})`]: fmtNum(unitCost),
      [`سعر الجملة (${currency})`]: fmtNum(s.unitWholesalePrice || cat?.wholesalePrice || 0),
      [`سعر التجزئة (${currency})`]: fmtNum(s.unitRetailPrice || cat?.retailPrice || 0),
      [`إجمالي الجملة (${currency})`]: fmtNum(totalWholesale),
      [`إجمالي التكلفة (${currency})`]: fmtNum(totalCost),
      [`الربح المحقق (${currency})`]: fmtNum(profit),
      'طريقة القيد': s.paymentType === 'cash' ? 'نقدي' : 'آجل',
      'ملاحظات': s.notes || '',
    });
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  applyRTLToSheet(sheet);
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل تفاصيل المبيعات');
  XLSX.writeFile(workbook, filename || `سجل_تفاصيل_المبيعات_${todayStr}.xlsx`);
}

/**
 * 8. Legacy / Simplified POS Debts Export
 */
export function exportPosDebtsToExcel(
  posPoints: POSPoint[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const debtItems: DebtExportItem[] = posPoints.map((pos) => {
    const remainingLimit = (pos.maxDebtLimit || 0) - (pos.currentDebt || 0);
    return {
      id: pos.id,
      name: pos.name,
      type: 'نقطة بيع / موزع',
      phone: pos.phone,
      address: pos.address,
      maxDebtLimit: pos.maxDebtLimit || 0,
      totalInvoices: (pos.currentDebt || 0) + (pos.totalCashPaid || 0),
      totalPaid: pos.totalCashPaid || 0,
      currentDebt: pos.currentDebt || 0,
      remainingLimit: remainingLimit,
      status:
        pos.currentDebt <= 0
          ? 'مسدد بالكامل'
          : pos.maxDebtLimit > 0 && pos.currentDebt > pos.maxDebtLimit
          ? 'متجاوز السقف ⚠️'
          : 'ضمن السقف',
      notes: pos.notes,
    };
  });

  exportDebtsReportToExcel({
    debtItems,
    filename,
  });
}

/**
 * 9. CSV Exports with UTF-8 BOM
 */
export function exportInvoicesToCSV(
  invoices: InvoiceRecord[],
  posPoints: POSPoint[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const headers = [
    { key: 'invoiceNumber', label: 'رقم الفاتورة' },
    { key: 'date', label: 'التاريخ' },
    { key: 'type', label: 'نوع الفاتورة' },
    { key: 'posPoint', label: 'نقطة البيع' },
    { key: 'paymentType', label: 'طريقة القيد' },
    { key: 'totalQuantity', label: 'إجمالي الكمية' },
    { key: 'totalWholesale', label: `إجمالي الجملة (${currency})` },
    { key: 'totalRetail', label: `إجمالي التجزئة (${currency})` },
    { key: 'totalCost', label: `التكلفة (${currency})` },
    { key: 'totalProfit', label: `الربح (${currency})` },
    { key: 'status', label: 'الحالة' },
    { key: 'items', label: 'الأصناف' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  const data = invoices.map((inv) => {
    const pos = posPoints.find((p) => p.id === inv.posPointId);
    const itemsDetail = (inv.items || [])
      .map((it) => `${it.categoryName || 'كارت'} (${it.quantity}×${it.unitWholesalePrice || 0})`)
      .join(' | ');

    return {
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      type: inv.type === 'return' ? 'مرتجع' : 'مبيعات',
      posPoint: inv.posPointName || pos?.name || '',
      paymentType: inv.paymentType === 'cash' ? 'نقدي' : 'آجل',
      totalQuantity: inv.totalQuantity || 0,
      totalWholesale: fmtNum(inv.totalWholesaleAmount),
      totalRetail: fmtNum(inv.totalRetailAmount),
      totalCost: fmtNum(inv.totalCostAmount || 0),
      totalProfit: fmtNum(inv.totalProfit || 0),
      status: inv.status === 'completed' ? 'معتمدة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
      items: itemsDetail,
      notes: inv.notes || '',
    };
  });

  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row: any) =>
    headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',')
  );

  const csvContent = [headerRow, ...rows].join('\n');
  downloadFile(csvContent, filename || `سجل_الفواتير_${todayStr}.csv`, 'text/csv');
}

export function exportExpensesToCSV(
  expenses: ExpenseRecord[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const paymentMethodNames: Record<string, string> = {
    cash: 'نقداً',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    other: 'أخرى',
  };

  const headers = [
    { key: 'voucherNumber', label: 'رقم السند' },
    { key: 'date', label: 'التاريخ' },
    { key: 'categoryName', label: 'التصنيف' },
    { key: 'title', label: 'البيان' },
    { key: 'amount', label: `المبلغ (${currency})` },
    { key: 'paymentMethod', label: 'طريقة الدفع' },
    { key: 'paidTo', label: 'المدفوع له' },
    { key: 'referenceNumber', label: 'رقم المرجع' },
    { key: 'createdByName', label: 'المسؤول' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  const data = expenses.map((exp) => ({
    voucherNumber: exp.voucherNumber,
    date: exp.date,
    categoryName: exp.categoryName || '',
    title: exp.title,
    amount: fmtNum(exp.amount),
    paymentMethod: paymentMethodNames[exp.paymentMethod] || exp.paymentMethod || 'نقداً',
    paidTo: exp.paidTo || '',
    referenceNumber: exp.referenceNumber || '',
    createdByName: exp.createdByName || '',
    notes: exp.notes || '',
  }));

  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row: any) =>
    headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',')
  );

  const csvContent = [headerRow, ...rows].join('\n');
  downloadFile(csvContent, filename || `سجل_المصروفات_${todayStr}.csv`, 'text/csv');
}

export function exportSalesToCSV(
  sales: SalesRecord[],
  invoices: InvoiceRecord[],
  posPoints: POSPoint[],
  categories: CardCategory[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const headers = [
    { key: 'invoiceNumber', label: 'رقم الفاتورة' },
    { key: 'date', label: 'التاريخ' },
    { key: 'type', label: 'نوع العملية' },
    { key: 'posPoint', label: 'نقطة البيع' },
    { key: 'categoryName', label: 'فئة الكارت' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'unitCost', label: `سعر التكلفة (${currency})` },
    { key: 'unitWholesale', label: `سعر الجملة (${currency})` },
    { key: 'unitRetail', label: `سعر التجزئة (${currency})` },
    { key: 'totalWholesale', label: `إجمالي الجملة (${currency})` },
    { key: 'totalCost', label: `إجمالي التكلفة (${currency})` },
    { key: 'profit', label: `الربح المحقق (${currency})` },
    { key: 'paymentType', label: 'طريقة القيد' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  const rows: any[] = [];

  invoices.forEach((inv) => {
    const pos = posPoints.find((p) => p.id === inv.posPointId);
    const isReturn = inv.type === 'return';

    (inv.items || []).forEach((item) => {
      const cat = categories.find((c) => c.id === item.categoryId);
      const unitCost = item.unitCostPrice ?? cat?.costPrice ?? 0;
      const unitWholesale = item.unitWholesalePrice || (item.quantity ? item.totalWholesalePrice / item.quantity : 0);
      const unitRetail = item.unitRetailPrice || cat?.retailPrice || 0;
      const totalWholesale = item.totalWholesalePrice || (item.quantity || 0) * unitWholesale;
      const totalCost = (item.quantity || 0) * unitCost;
      const profit = isReturn ? 0 : totalWholesale - totalCost;

      rows.push({
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        type: isReturn ? 'مرتجع' : 'مبيعات',
        posPoint: inv.posPointName || pos?.name || '',
        categoryName: item.categoryName || cat?.name || '',
        quantity: item.quantity || 0,
        unitCost: fmtNum(unitCost),
        unitWholesale: fmtNum(unitWholesale),
        unitRetail: fmtNum(unitRetail),
        totalWholesale: fmtNum(isReturn ? -totalWholesale : totalWholesale),
        totalCost: fmtNum(isReturn ? -totalCost : totalCost),
        profit: fmtNum(profit),
        paymentType: inv.paymentType === 'cash' ? 'نقدي' : 'آجل',
        notes: item.notes || inv.notes || '',
      });
    });
  });

  sales.forEach((s) => {
    const pos = posPoints.find((p) => p.id === s.posPointId);
    const cat = categories.find((c) => c.id === s.categoryId);
    const unitCost = cat?.costPrice || 0;
    const totalCost = (s.quantity || 0) * unitCost;
    const totalWholesale = s.totalWholesaleAmount || (s.quantity || 0) * (s.unitWholesalePrice || cat?.wholesalePrice || 0);
    const profit = s.profit || (totalWholesale - totalCost);

    rows.push({
      invoiceNumber: s.invoiceNumber || 'مبيعات مباشرة',
      date: s.date,
      type: 'مبيعات مباشرة',
      posPoint: pos?.name || '',
      categoryName: cat?.name || '',
      quantity: s.quantity || 0,
      unitCost: fmtNum(unitCost),
      unitWholesale: fmtNum(s.unitWholesalePrice || cat?.wholesalePrice || 0),
      unitRetail: fmtNum(s.unitRetailPrice || cat?.retailPrice || 0),
      totalWholesale: fmtNum(totalWholesale),
      totalCost: fmtNum(totalCost),
      profit: fmtNum(profit),
      paymentType: s.paymentType === 'cash' ? 'نقدي' : 'آجل',
      notes: s.notes || '',
    });
  });

  const headerRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const csvRows = rows.map((row: any) =>
    headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',')
  );

  const csvContent = [headerRow, ...csvRows].join('\n');
  downloadFile(csvContent, filename || `تفاصيل_المبيعات_${todayStr}.csv`, 'text/csv');
}

export function exportPosDebtsToCSV(
  posPoints: POSPoint[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];

  const data = posPoints.map((pos) => {
    const remainingLimit = (pos.maxDebtLimit || 0) - (pos.currentDebt || 0);
    return {
      'اسم نقطة البيع': pos.name,
      'المسؤول': pos.managerName,
      'الهاتف': pos.phone,
      'إجمالي الديون الحالية': fmtNum(pos.currentDebt || 0),
      'سقف الدين المسموح': pos.maxDebtLimit > 0 ? fmtNum(pos.maxDebtLimit) : 'غير محدود',
      'المساحة المتبقية للدين': pos.maxDebtLimit > 0 ? fmtNum(remainingLimit) : '-',
      'إجمالي المستلم': pos.totalCardsDelivered || 0,
      'إجمالي المباع': pos.totalCardsSold || 0,
      'إجمالي المسدد نقداً': fmtNum(pos.totalCashPaid || 0),
      'حالة النقطة': pos.status === 'active' ? 'نشط' : pos.status === 'suspended' ? 'محظور' : 'غير معروف',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const csvStr = XLSX.utils.sheet_to_csv(ws);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvStr], { type: 'text/csv;charset=utf-8;' });
  const finalName = filename || `ارصدة_الديون_${todayStr}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
