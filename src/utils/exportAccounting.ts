import * as XLSX from 'xlsx';
import {
  InvoiceRecord,
  ExpenseRecord,
  SalesRecord,
  POSPoint,
  CardCategory,
  PaymentRecord,
  NetworkSettings,
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

/**
 * Formats a number to 2 decimal places or 0 if integer
 */
const fmtNum = (num: number | undefined | null): number => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
};

/**
 * Generate Comprehensive Accounting Excel Workbook (.xlsx) with multiple sheets
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

  const workbook = XLSX.utils.book_new();

  // 1. Reconciliation Summary Sheet
  if (includeSheets.summary !== false) {
    const summaryData: any[][] = [
      ['تقرير المطابقة المالية والمحاسبية الشامل', '', '', ''],
      ['اسم المنشأة / الشبكة:', networkName, 'تاريخ التصدير:', todayStr],
      ['فترة التقرير:', filter.period === 'custom' ? `${filter.startDate || ''} إلى ${filter.endDate || ''}` : filter.period, 'العملة الأساسية:', currency],
      ['', '', '', ''],
      ['--- ملخص قائمة الدخل والأرباح التشغيلية ---', '', '', ''],
      ['البند المحاسبي', 'القيمة بالعملة (' + currency + ')', 'الملاحظات والنسب', ''],
      ['إجمالي مبيعات الجملة (Gross Sales)', fmtNum(metrics.grossSales), `إجمالي قيمة الكروت المسلمة (${metrics.totalCardsSold} كارت)`, ''],
      ['مردودات المبيعات (Sales Returns)', fmtNum(metrics.salesReturns), `كروت مرتجعة (${metrics.totalCardsReturned} كارت)`, ''],
      ['صافي المبيعات (Net Sales)', fmtNum(metrics.netSales), `صافي الكروت المسلمة (${metrics.netCardsSold} كارت)`, ''],
      ['صافي تكلفة الكروت المباعة (Net COGS)', fmtNum(metrics.netCOGS), 'تكلفة طباعة وشراء الكروت', ''],
      ['مجمل الربح التجاري (Gross Profit)', fmtNum(metrics.grossProfit), `هامش مجمل الربح: ${(metrics.grossProfitMargin ?? 0).toFixed(1)}%`, ''],
      ['إجمالي المصروفات التشغيلية (Total OPEX)', fmtNum(metrics.totalExpenses), `عدد سندات الصرف: ${filteredExpenses.length}`, ''],
      ['صافي الربح الحقيقي النهائي (Net Profit)', fmtNum(metrics.netProfit), `هامش صافي الربح: ${(metrics.netProfitMargin ?? 0).toFixed(1)}%`, ''],
      ['', '', '', ''],
      ['--- ملخص السيولة النقدية والمطابقة مع الموزعين ---', '', '', ''],
      ['البند', 'المبلغ (' + currency + ')', 'الحالة المحاسبية', ''],
      ['المقبوضات والتحصيلات النقدية والبنكية', fmtNum(metrics.totalCashCollected), 'المبالغ المحصلة فعلياً خلال الفترة', ''],
      ['المصروفات النقدية المسددة', fmtNum(metrics.totalExpenses), 'المبالغ المصروفة فعلياً', ''],
      ['صافي التدفق النقدي للفترة (Net Cash Flow)', fmtNum(metrics.netCashFlow), metrics.netCashFlow >= 0 ? 'فائض نقدي موجب' : 'عجز في التدفق النقدي', ''],
      ['إجمالي أرصدة مديونيات نقاط البيع القائمة', fmtNum(metrics.totalPOSDebt), 'مستحقات معلقة بذمة الموزعين', ''],
      ['', '', '', ''],
      ['--- تقييم مخزون الكروت بالمستودع الرئيسي ---', '', '', ''],
      ['إجمالي رصيد الكروت بالمستودع', `${metrics.totalWarehouseStock} كارت`, '', ''],
      ['قيمة المخزون بسعر التكلفة', fmtNum(metrics.inventoryValuationCost), currency, ''],
      ['قيمة المخزون بسعر الجملة', fmtNum(metrics.inventoryValuationWholesale), currency, ''],
      ['قيمة المخزون بسعر التجزئة (سعر الجمهور)', fmtNum(metrics.inventoryValuationRetail), currency, ''],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 38 }, { wch: 22 }, { wch: 35 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'المطابقة المحاسبية');
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
        'الوقت': inv.timestamp ? new Date(inv.timestamp).toLocaleTimeString('ar-YE') : '',
        'نوع الفاتورة': isReturn ? 'فاتورة مرتجع' : 'فاتورة مبيعات / توريد',
        'نقطة البيع / الموزع': inv.posPointName || pos?.name || 'نقطة توزيع',
        'طريقة القيد': inv.paymentType === 'cash' ? 'نقدي (فوري)' : 'آجل (على الحساب)',
        'إجمالي الكمية (كروت)': inv.totalQuantity || 0,
        [`إجمالي الجملة (${currency})`]: fmtNum(inv.totalWholesaleAmount),
        [`إجمالي التجزئة (${currency})`]: fmtNum(inv.totalRetailAmount),
        [`التكلفة التقديرية (${currency})`]: fmtNum(inv.totalCostAmount || 0),
        [`الربح التقديري (${currency})`]: fmtNum(inv.totalProfit || 0),
        'تفاصيل الأصناف': itemsDetail,
        'المستلم': inv.receivedBy || pos?.managerName || '',
        'المسلم': inv.deliveredBy || 'الإدارة',
        'سبب الإرجاع / الملاحظات': isReturn ? (inv.reasonForReturn || inv.notes || '') : (inv.notes || ''),
        'الحالة': inv.status === 'completed' ? 'معتمدة ومرحلة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
      };
    });

    const invoicesSheet = XLSX.utils.json_to_sheet(invoicesRows);
    invoicesSheet['!cols'] = [
      { wch: 16 }, // رقم الفاتورة
      { wch: 12 }, // التاريخ
      { wch: 12 }, // الوقت
      { wch: 22 }, // نوع الفاتورة
      { wch: 24 }, // نقطة البيع
      { wch: 16 }, // طريقة القيد
      { wch: 18 }, // إجمالي الكمية
      { wch: 20 }, // إجمالي الجملة
      { wch: 20 }, // إجمالي التجزئة
      { wch: 20 }, // التكلفة
      { wch: 18 }, // الربح
      { wch: 40 }, // تفاصيل الأصناف
      { wch: 18 }, // المستلم
      { wch: 18 }, // المسلم
      { wch: 30 }, // ملاحظات
      { wch: 16 }, // الحالة
    ];
    XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'سجل الفواتير');
  }

  // 3. Detailed Sales & Dispatches Line Items Sheet
  if (includeSheets.sales !== false) {
    // Generate detailed line items from both multi-item invoices and direct sales
    const salesRows: any[] = [];

    filteredInvoices.forEach((inv) => {
      const pos = posPoints.find((p) => p.id === inv.posPointId);
      const isReturn = inv.type === 'return';

      (inv.items || []).forEach((item, idx) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        const unitCost = item.unitCostPrice ?? cat?.costPrice ?? 0;
        const unitWholesale = item.unitWholesalePrice || item.totalWholesalePrice / (item.quantity || 1) || 0;
        const unitRetail = item.unitRetailPrice || cat?.retailPrice || 0;
        const totalWholesale = item.totalWholesalePrice || item.quantity * unitWholesale;
        const totalRetail = item.totalRetailPrice || item.quantity * unitRetail;
        const totalCost = (item.quantity || 0) * unitCost;
        const profit = isReturn ? 0 : totalWholesale - totalCost;

        salesRows.push({
          'رقم الفاتورة': inv.invoiceNumber,
          'التاريخ': inv.date,
          'نوع العملية': isReturn ? 'مرتجع كروت' : 'مبيعات / صرف دفعة',
          'نقطة البيع / الموزع': inv.posPointName || pos?.name || 'نقطة توزيع',
          'فئة الكارت': item.categoryName || cat?.name || 'فئة كارت',
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

    // Add legacy sales if any exist
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
        'نوع العملية': 'مبيعات كروت مباشرة',
        'نقطة البيع / الموزع': pos?.name || 'نقطة توزيع',
        'فئة الكارت': cat?.name || 'فئة كارت',
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
      salesSheet['!cols'] = [
        { wch: 16 }, // رقم الفاتورة
        { wch: 12 }, // التاريخ
        { wch: 20 }, // نوع العملية
        { wch: 24 }, // نقطة البيع
        { wch: 20 }, // فئة الكارت
        { wch: 10 }, // الكمية
        { wch: 16 }, // سعر التكلفة
        { wch: 16 }, // سعر الجملة
        { wch: 16 }, // سعر التجزئة
        { wch: 18 }, // إجمالي الجملة
        { wch: 18 }, // إجمالي التكلفة
        { wch: 18 }, // الربح
        { wch: 16 }, // بداية السيريال
        { wch: 16 }, // نهاية السيريال
        { wch: 14 }, // طريقة القيد
        { wch: 25 }, // ملاحظات
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
    expensesSheet['!cols'] = [
      { wch: 16 }, // رقم السند
      { wch: 12 }, // التاريخ
      { wch: 25 }, // التصنيف
      { wch: 32 }, // البيان
      { wch: 18 }, // المبلغ
      { wch: 22 }, // طريقة الدفع
      { wch: 22 }, // المدفوع له
      { wch: 22 }, // رقم الحوالة
      { wch: 18 }, // المسؤول
      { wch: 30 }, // ملاحظات
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
        'الحالة': pos.status === 'active' ? 'نشط' : 'موقف',
        'ملاحظات': pos.notes || '',
      };
    });

    const posSheet = XLSX.utils.json_to_sheet(posRows);
    posSheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 16 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, posSheet, 'أرصدة نقاط البيع');
  }

  // Generate and download file
  const outFilename = filename || `المطابقة_المحاسبية_الشاملة_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, outFilename);
}

/**
 * Export Invoices to Excel (.xlsx)
 */
export function exportInvoicesToExcel(
  invoices: InvoiceRecord[],
  posPoints: POSPoint[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();

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
      'نقطة البيع': inv.posPointName || pos?.name || 'نقطة توزيع',
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
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل الفواتير');
  XLSX.writeFile(workbook, filename || `سجل_فواتير_المبيعات_والمرتجعات_${todayStr}.xlsx`);
}

/**
 * Export Invoices to CSV (UTF-8 with BOM for Arabic Excel)
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
  const rows = data.map((row: any) => {
    return headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  downloadFile(csvContent, filename || `سجل_الفواتير_${todayStr}.csv`, 'text/csv');
}

/**
 * Export Expenses to Excel (.xlsx)
 */
export function exportExpensesToExcel(
  expenses: ExpenseRecord[],
  currency: string = 'ر.ي',
  filename?: string
): void {
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();

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
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 25 },
    { wch: 32 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل المصروفات');
  XLSX.writeFile(workbook, filename || `سجل_المصروفات_التشغيلية_${todayStr}.xlsx`);
}

/**
 * Export Expenses to CSV (UTF-8 with BOM)
 */
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
  const rows = data.map((row: any) => {
    return headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  downloadFile(csvContent, filename || `سجل_المصروفات_${todayStr}.csv`, 'text/csv');
}

/**
 * Export Detailed Sales to Excel (.xlsx)
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
  const workbook = XLSX.utils.book_new();

  const rows: any[] = [];

  // 1. Line items from invoices
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

  // 2. Direct Sales records
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
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'سجل تفاصيل المبيعات');
  XLSX.writeFile(workbook, filename || `سجل_تفاصيل_المبيعات_${todayStr}.xlsx`);
}

/**
 * Export Detailed Sales to CSV (UTF-8 with BOM)
 */
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

  // Invoices Line Items
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

  // Direct Sales
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
  const csvRows = rows.map((row: any) => {
    return headers
      .map((h) => {
        const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...csvRows].join('\n');
  downloadFile(csvContent, filename || `تفاصيل_المبيعات_${todayStr}.csv`, 'text/csv');
}
