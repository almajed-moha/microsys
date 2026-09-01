import {
  InvoiceRecord,
  ExpenseRecord,
  PaymentRecord,
  POSPoint,
  CardCategory,
  SalesRecord,
  CardBatchDispatch,
} from '../types';

export type DateFilterPeriod =
  | 'today'
  | '7days'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom'
  | 'all';

/**
 * Universal date period comparator to guarantee identical filtering across all screens.
 */
export function isDateInPeriod(
  dateStr: string | undefined,
  period: DateFilterPeriod | string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!dateStr) return false;
  if (period === 'all') return true;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const itemDateStr = dateStr.slice(0, 10);

  if (period === 'today') {
    return itemDateStr === todayStr;
  }

  if (period === '7days') {
    const d = new Date(itemDateStr);
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7 && diffDays >= 0;
  }

  if (period === 'month') {
    const d = new Date(itemDateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  if (period === 'last_month') {
    const d = new Date(itemDateStr);
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }

  if (period === 'quarter') {
    const d = new Date(itemDateStr);
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const dQuarter = Math.floor(d.getMonth() / 3);
    return currentQuarter === dQuarter && d.getFullYear() === now.getFullYear();
  }

  if (period === 'year') {
    const d = new Date(itemDateStr);
    return d.getFullYear() === now.getFullYear();
  }

  if (period === 'custom') {
    if (startDate && itemDateStr < startDate) return false;
    if (endDate && itemDateStr > endDate) return false;
    return true;
  }

  return true;
}

export interface CategoryProfitabilityAnalysis {
  categoryId: string;
  categoryName: string;
  netQty: number;
  unitCost: number;
  unitPrice: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

export interface POSProfitabilityAnalysis {
  posId: string;
  posName: string;
  managerName?: string;
  totalInvoices: number;
  grossSales: number;
  returnsAmount: number;
  netSales: number;
  totalCollected: number;
  grossProfit: number;
  currentDebt: number;
}

export interface ExpenseCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  voucherCount: number;
  percentOfRevenue: number;
  percentOfTotalExpenses: number;
}

export interface DailyFinancialTrend {
  date: string;
  sales: number;
  returns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  cashCollected: number;
}

export interface ComprehensiveFinancialMetrics {
  // Sales & Returns
  grossSales: number; // إجمالي مبيعات الجملة
  salesReturns: number; // مردودات المبيعات
  netSales: number; // صافي المبيعات (grossSales - salesReturns)
  totalCardsSold: number; // عدد الكروت المباعة
  totalCardsReturned: number; // عدد الكروت المرتجعة
  netCardsSold: number; // صافي الكروت المباعة

  // Cost of Goods Sold (COGS) & Gross Profit
  costOfGoodsSold: number; // تكلفة الكروت المباعة
  costOfGoodsReturned: number; // تكلفة الكروت المرتجعة
  netCOGS: number; // صافي تكلفة البضاعة المباعة
  grossProfit: number; // مجمل الربح (netSales - netCOGS)
  grossProfitMargin: number; // نسبة مجمل الربح %

  // Operating Expenses (OPEX)
  totalExpenses: number; // إجمالي المصروفات التشغيلية
  expensesCount: number; // عدد سندات الصرف

  // Net Profit / Loss
  netProfit: number; // صافي الربح الحقيقي النهائي (grossProfit - totalExpenses)
  netProfitMargin: number; // نسبة صافي الربح %
  isProfitable: boolean; // هل توجد أرباح أم خسائر
  isNetLoss: boolean; // هل هو صافي خسارة

  // Cash Flow & Balances
  totalCashCollected: number; // التحصيلات النقدية والبنكية
  totalPOSDebt: number; // إجمالي مديونيات الموزعين
  netCashFlow: number; // صافي التدفق النقدي (التحصيلات - المصروفات)

  // Warehouse Inventory Valuation
  totalWarehouseStock: number; // إجمالي عدد الكروت بالمستودع
  inventoryValuationCost: number; // قيمة المخزون بسعر التكلفة
  inventoryValuationWholesale: number; // قيمة المخزون بسعر الجملة
  inventoryValuationRetail: number; // قيمة المخزون بسعر التجزئة

  // Detailed breakdowns for tabs, charts, statements, and exports
  categoryAnalysisList: CategoryProfitabilityAnalysis[];
  posAnalysisList: POSProfitabilityAnalysis[];
  expenseBreakdownList: ExpenseCategoryBreakdown[];
  dailyTrend: DailyFinancialTrend[];
}

/**
 * Standardized Central Financial Calculation Engine
 * Used by DashboardView, IncomeStatementModal, ExpensesView, Reports and Exports.
 * Strictly adheres to standard managerial and financial accounting principles.
 */
export function calculateComprehensiveFinancials(params: {
  invoices?: InvoiceRecord[];
  expenses?: ExpenseRecord[];
  payments?: PaymentRecord[];
  posPoints?: POSPoint[];
  categories?: CardCategory[];
  sales?: SalesRecord[];
  dispatches?: CardBatchDispatch[];
  datePeriod?: DateFilterPeriod | string;
  startDate?: string;
  endDate?: string;
  posPointId?: string;
}): ComprehensiveFinancialMetrics {
  const {
    invoices = [],
    expenses = [],
    payments = [],
    posPoints = [],
    categories = [],
    sales = [],
    datePeriod = 'all',
    startDate,
    endDate,
    posPointId,
  } = params;

  // Set of valid POS point IDs and Category IDs to eliminate ghost/deleted records
  const validPosIds = new Set(posPoints.map((p) => p.id));
  const validCatIds = new Set(categories.map((c) => c.id));
  const hasPosList = posPoints.length > 0;

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (!inv || inv.status === 'cancelled') return false;
    if (hasPosList && inv.posPointId && !validPosIds.has(inv.posPointId)) return false;
    if (posPointId && posPointId !== 'all' && inv.posPointId !== posPointId) return false;
    return isDateInPeriod(inv.date, datePeriod, startDate, endDate);
  });

  // Filter Expenses (Expenses are general operations unless filtered by date)
  const filteredExpenses = expenses.filter((exp) => {
    if (!exp) return false;
    return isDateInPeriod(exp.date, datePeriod, startDate, endDate);
  });

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    if (!p) return false;
    if (hasPosList && p.posPointId && !validPosIds.has(p.posPointId)) return false;
    if (posPointId && posPointId !== 'all' && p.posPointId !== posPointId) return false;
    return isDateInPeriod(p.date, datePeriod, startDate, endDate);
  });

  // Check known invoice numbers to avoid double-counting between legacy sales and modern multi-item invoices
  const recordedInvoiceNumbers = new Set(
    invoices.map((inv) => inv.invoiceNumber).filter(Boolean)
  );

  // Filter Legacy standalone Sales (exclude those already represented as invoices)
  const filteredLegacySales = sales.filter((s) => {
    if (!s) return false;
    if (hasPosList && s.posPointId && !validPosIds.has(s.posPointId)) return false;
    if (posPointId && posPointId !== 'all' && s.posPointId !== posPointId) return false;
    if (s.invoiceNumber && recordedInvoiceNumbers.has(s.invoiceNumber)) return false;
    return isDateInPeriod(s.date, datePeriod, startDate, endDate);
  });

  // Aggregation variables
  let grossSales = 0;
  let salesReturns = 0;
  let totalCardsSold = 0;
  let totalCardsReturned = 0;
  let costOfGoodsSold = 0;
  let costOfGoodsReturned = 0;

  // Breakdown aggregations
  const categoryStatsMap: Record<
    string,
    {
      categoryId: string;
      categoryName: string;
      soldQty: number;
      returnQty: number;
      soldRevenue: number;
      returnRevenue: number;
      soldCost: number;
      returnCost: number;
      unitCost: number;
      unitPrice: number;
    }
  > = {};

  categories.forEach((cat) => {
    categoryStatsMap[cat.id] = {
      categoryId: cat.id,
      categoryName: cat.name,
      soldQty: 0,
      returnQty: 0,
      soldRevenue: 0,
      returnRevenue: 0,
      soldCost: 0,
      returnCost: 0,
      unitCost: cat.costPrice || 0,
      unitPrice: cat.wholesalePrice || cat.retailPrice || 0,
    };
  });

  const posStatsMap: Record<
    string,
    {
      posId: string;
      posName: string;
      managerName?: string;
      totalInvoices: number;
      grossSales: number;
      returnsAmount: number;
      grossProfit: number;
      totalCollected: number;
      currentDebt: number;
    }
  > = {};

  posPoints.forEach((pos) => {
    posStatsMap[pos.id] = {
      posId: pos.id,
      posName: pos.name,
      managerName: pos.managerName,
      totalInvoices: 0,
      grossSales: 0,
      returnsAmount: 0,
      grossProfit: 0,
      totalCollected: 0,
      currentDebt: pos.currentDebt || 0,
    };
  });

  const dailyTrendMap: Record<string, DailyFinancialTrend> = {};

  const getOrCreateDay = (d: string): DailyFinancialTrend => {
    if (!dailyTrendMap[d]) {
      dailyTrendMap[d] = {
        date: d,
        sales: 0,
        returns: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        cashCollected: 0,
      };
    }
    return dailyTrendMap[d];
  };

  // 1. Process Invoices for Sales, Returns, and COGS
  filteredInvoices.forEach((inv) => {
    const isReturn = inv.type === 'return';
    const wholesaleAmount = inv.totalWholesaleAmount || 0;
    const qty = inv.totalQuantity || 0;
    const day = getOrCreateDay(inv.date);

    if (!isReturn) {
      grossSales += wholesaleAmount;
      totalCardsSold += qty;
      day.sales += wholesaleAmount;
    } else {
      salesReturns += wholesaleAmount;
      totalCardsReturned += qty;
      day.returns += wholesaleAmount;
    }

    let invoiceCost = 0;

    // Process item-level costs and category breakdown
    if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
      inv.items.forEach((item) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        const unitCost =
          item.unitCostPrice !== undefined && item.unitCostPrice !== null
            ? item.unitCostPrice
            : cat?.costPrice || 0;
        const itemQty = item.quantity || 0;
        const itemCost = itemQty * unitCost;
        const itemRevenue =
          item.totalWholesalePrice ||
          item.quantity * (item.unitWholesalePrice || cat?.wholesalePrice || 0);

        invoiceCost += itemCost;

        if (item.categoryId && validCatIds.has(item.categoryId) && categoryStatsMap[item.categoryId]) {
          const catStat = categoryStatsMap[item.categoryId];
          if (!isReturn) {
            catStat.soldQty += itemQty;
            catStat.soldRevenue += itemRevenue;
            catStat.soldCost += itemCost;
          } else {
            catStat.returnQty += itemQty;
            catStat.returnRevenue += itemRevenue;
            catStat.returnCost += itemCost;
          }
        }
      });
    } else if (inv.totalCostAmount) {
      invoiceCost = inv.totalCostAmount;
    }

    if (!isReturn) {
      costOfGoodsSold += invoiceCost;
      day.cogs += invoiceCost;
    } else {
      costOfGoodsReturned += invoiceCost;
      day.cogs -= invoiceCost;
    }

    // POS Stats
    if (inv.posPointId && posStatsMap[inv.posPointId]) {
      const posRec = posStatsMap[inv.posPointId];
      posRec.totalInvoices += 1;
      if (!isReturn) {
        posRec.grossSales += wholesaleAmount;
        posRec.grossProfit += wholesaleAmount - invoiceCost;
      } else {
        posRec.returnsAmount += wholesaleAmount;
        posRec.grossProfit -= wholesaleAmount - invoiceCost;
      }
    }
  });

  // 2. Include Standalone Quick Sales (if any)
  filteredLegacySales.forEach((s) => {
    const amount = s.totalWholesaleAmount || s.totalRetailAmount || 0;
    const qty = s.quantity || 0;
    const cat = categories.find((c) => c.id === s.categoryId);
    const unitCost = cat?.costPrice || 0;
    const cost = qty * unitCost;
    const day = getOrCreateDay(s.date);

    grossSales += amount;
    totalCardsSold += qty;
    costOfGoodsSold += cost;
    day.sales += amount;
    day.cogs += cost;

    if (s.categoryId && validCatIds.has(s.categoryId) && categoryStatsMap[s.categoryId]) {
      const catStat = categoryStatsMap[s.categoryId];
      catStat.soldQty += qty;
      catStat.soldRevenue += amount;
      catStat.soldCost += cost;
    }

    if (s.posPointId && posStatsMap[s.posPointId]) {
      const posRec = posStatsMap[s.posPointId];
      posRec.totalInvoices += 1;
      posRec.grossSales += amount;
      posRec.grossProfit += amount - cost;
    }
  });

  // 3. Process Payments (Cash Collected)
  let totalCashCollected = 0;
  filteredPayments.forEach((p) => {
    const amt = p.amount || 0;
    totalCashCollected += amt;
    const day = getOrCreateDay(p.date);
    day.cashCollected += amt;

    if (p.posPointId && posStatsMap[p.posPointId]) {
      posStatsMap[p.posPointId].totalCollected += amt;
    }
  });

  // 4. Process Expenses Breakdown
  const expenseStatsMap: Record<
    string,
    { categoryId: string; categoryName: string; totalAmount: number; voucherCount: number }
  > = {};

  let totalExpenses = 0;
  filteredExpenses.forEach((exp) => {
    const amt = exp.amount || 0;
    totalExpenses += amt;
    const day = getOrCreateDay(exp.date);
    day.expenses += amt;

    const catId = exp.categoryId || 'other';
    const catName = exp.categoryName || 'مصروفات عامة وتشغيلية';

    if (!expenseStatsMap[catId]) {
      expenseStatsMap[catId] = {
        categoryId: catId,
        categoryName: catName,
        totalAmount: 0,
        voucherCount: 0,
      };
    }
    expenseStatsMap[catId].totalAmount += amt;
    expenseStatsMap[catId].voucherCount += 1;
  });

  // 5. Compute Final Mathematical and Accounting Totals
  const netSales = Math.max(0, grossSales - salesReturns);
  const netCOGS = Math.max(0, costOfGoodsSold - costOfGoodsReturned);
  const grossProfit = netSales - netCOGS;
  const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const netCardsSold = Math.max(0, totalCardsSold - totalCardsReturned);

  const netProfit = grossProfit - totalExpenses;
  const netProfitMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
  const isProfitable = netProfit >= 0;
  const isNetLoss = netProfit < 0;

  const totalPOSDebt = posPoints.reduce((acc, p) => acc + (p.currentDebt || 0), 0);
  const netCashFlow = totalCashCollected - totalExpenses;

  // 6. Build Category Analysis List - strictly from defined categories
  const categoryAnalysisList: CategoryProfitabilityAnalysis[] = categories
    .map((cat) => {
      const c = categoryStatsMap[cat.id] || {
        categoryId: cat.id,
        categoryName: cat.name,
        soldQty: 0,
        returnQty: 0,
        soldRevenue: 0,
        returnRevenue: 0,
        soldCost: 0,
        returnCost: 0,
        unitCost: cat.costPrice || 0,
        unitPrice: cat.wholesalePrice || cat.retailPrice || 0,
      };
      const netQty = Math.max(0, c.soldQty - c.returnQty);
      const netRevenue = Math.max(0, c.soldRevenue - c.returnRevenue);
      const cogs = Math.max(0, c.soldCost - c.returnCost);
      const catGrossProfit = netRevenue - cogs;
      const marginPercent = netRevenue > 0 ? (catGrossProfit / netRevenue) * 100 : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        netQty,
        unitCost: cat.costPrice || c.unitCost,
        unitPrice: cat.wholesalePrice || cat.retailPrice || c.unitPrice,
        netRevenue,
        cogs,
        grossProfit: catGrossProfit,
        marginPercent,
      };
    })
    .filter((c) => c.netQty > 0 || c.netRevenue > 0 || c.cogs > 0)
    .sort((a, b) => b.netRevenue - a.netRevenue);

  // 7. Build POS Analysis List - strictly from defined POS points
  const posAnalysisList: POSProfitabilityAnalysis[] = posPoints
    .map((pos) => {
      const p = posStatsMap[pos.id] || {
        posId: pos.id,
        posName: pos.name,
        managerName: pos.managerName,
        totalInvoices: 0,
        grossSales: 0,
        returnsAmount: 0,
        grossProfit: 0,
        totalCollected: 0,
        currentDebt: pos.currentDebt || 0,
      };
      const netSalesVal = Math.max(0, p.grossSales - p.returnsAmount);
      return {
        posId: pos.id,
        posName: pos.name,
        managerName: pos.managerName,
        totalInvoices: p.totalInvoices,
        grossSales: p.grossSales,
        returnsAmount: p.returnsAmount,
        netSales: netSalesVal,
        totalCollected: p.totalCollected,
        grossProfit: p.grossProfit,
        currentDebt: pos.currentDebt || 0,
      };
    })
    .sort((a, b) => b.netSales - a.netSales);

  // 8. Build Expense Breakdown List
  const expenseBreakdownList: ExpenseCategoryBreakdown[] = Object.values(expenseStatsMap)
    .map((e) => ({
      categoryId: e.categoryId,
      categoryName: e.categoryName,
      totalAmount: e.totalAmount,
      voucherCount: e.voucherCount,
      percentOfRevenue: netSales > 0 ? (e.totalAmount / netSales) * 100 : 0,
      percentOfTotalExpenses: totalExpenses > 0 ? (e.totalAmount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 9. Build Daily Trend
  const dailyTrend: DailyFinancialTrend[] = Object.values(dailyTrendMap)
    .map((day) => {
      const dayNetSales = Math.max(0, day.sales - day.returns);
      const dayGrossProfit = dayNetSales - day.cogs;
      const dayNetProfit = dayGrossProfit - day.expenses;
      return {
        ...day,
        netSales: dayNetSales,
        grossProfit: dayGrossProfit,
        netProfit: dayNetProfit,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 10. Warehouse Stock Valuation
  let totalWarehouseStock = 0;
  let inventoryValuationCost = 0;
  let inventoryValuationWholesale = 0;
  let inventoryValuationRetail = 0;

  categories.forEach((cat) => {
    const stock = cat.warehouseStock || 0;
    totalWarehouseStock += stock;
    inventoryValuationCost += stock * (cat.costPrice || 0);
    inventoryValuationWholesale += stock * (cat.wholesalePrice || 0);
    inventoryValuationRetail += stock * (cat.retailPrice || 0);
  });

  return {
    grossSales,
    salesReturns,
    netSales,
    totalCardsSold,
    totalCardsReturned,
    netCardsSold,

    costOfGoodsSold,
    costOfGoodsReturned,
    netCOGS,
    grossProfit,
    grossProfitMargin,

    totalExpenses,
    expensesCount: filteredExpenses.length,

    netProfit,
    netProfitMargin,
    isProfitable,
    isNetLoss,

    totalCashCollected,
    totalPOSDebt,
    netCashFlow,

    totalWarehouseStock,
    inventoryValuationCost,
    inventoryValuationWholesale,
    inventoryValuationRetail,

    categoryAnalysisList,
    posAnalysisList,
    expenseBreakdownList,
    dailyTrend,
  };
}

/**
 * Calculate accurate POS account balance and real-time debt
 */
export function calculatePOSBalance(
  posPointId: string,
  sales: SalesRecord[] = [],
  payments: PaymentRecord[] = [],
  dispatches: CardBatchDispatch[] = [],
  invoices: InvoiceRecord[] = []
): {
  totalWholesaleSales: number;
  totalRetailSales: number;
  totalReturns: number;
  totalPaid: number;
  currentDebt: number;
  totalDispatchedValue: number;
  totalCardsDelivered: number;
} {
  const safeSales = (sales || []).filter((s) => s && s.posPointId === posPointId);
  const safePayments = (payments || []).filter((p) => p && p.posPointId === posPointId);
  const safeDispatches = (dispatches || []).filter((d) => d && d.posPointId === posPointId);
  const safeInvoices = (invoices || []).filter(
    (inv) => inv && inv.posPointId === posPointId && inv.status !== 'cancelled'
  );

  let totalWholesaleSales = safeSales.reduce((acc, s) => acc + (s.totalWholesaleAmount || 0), 0);
  let totalRetailSales = safeSales.reduce((acc, s) => acc + (s.totalRetailAmount || 0), 0);
  let totalReturns = 0;
  let totalCardsDelivered = 0;

  safeInvoices.forEach((inv) => {
    if (inv.type === 'sale') {
      totalWholesaleSales += inv.totalWholesaleAmount || 0;
      totalRetailSales += inv.totalRetailAmount || 0;
      inv.items.forEach(item => totalCardsDelivered += Number(item.quantity) || 0);
    } else if (inv.type === 'return') {
      totalReturns += inv.totalWholesaleAmount || 0;
      inv.items.forEach(item => totalCardsDelivered -= Number(item.quantity) || 0);
    }
  });

  const totalPaid = safePayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalDispatchedValue = safeDispatches.reduce(
    (acc, d) => acc + (d.totalWholesaleValue || 0),
    0
  );

  const netDeliveries = totalWholesaleSales - totalReturns;
  const currentDebt = Math.max(0, netDeliveries - totalPaid);

  return {
    totalWholesaleSales,
    totalRetailSales,
    totalReturns,
    totalPaid,
    currentDebt,
    totalDispatchedValue,
    totalCardsDelivered: Math.max(0, totalCardsDelivered),
  };
}

/**
 * Batch synchronize all POS Point current debts and payment totals
 */
export function synchronizePOSBalances(
  posPoints: POSPoint[] = [],
  invoices: InvoiceRecord[] = [],
  sales: SalesRecord[] = [],
  payments: PaymentRecord[] = [],
  dispatches: CardBatchDispatch[] = []
): POSPoint[] {
  return posPoints.map((pos) => {
    if (!pos) return pos;
    const balance = calculatePOSBalance(pos.id, sales, payments, dispatches, invoices);
    return {
      ...pos,
      currentDebt: balance.currentDebt,
      totalCashPaid: balance.totalPaid,
    };
  });
}
