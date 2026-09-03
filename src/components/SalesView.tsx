import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  CreditCard,
  Store,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Printer,
  Share2,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  SalesRecord,
  POSPoint,
  CardCategory,
  CardBatchDispatch,
  NetworkSettings
} from '../types';
import { calculatePOSInventory, exportToCSV, downloadFile } from '../utils/storage';
import { exportElementToPdf } from '../utils/pdfExport';
import { SalesReportModal } from './SalesReportModal';
import { AdvancedSearchBar, AdvancedFilterState } from './AdvancedSearchBar';
import { exportSalesToExcel } from '../utils/exportAccounting';
import { RecordAuditInfo } from './RecordAuditInfo';

interface SalesViewProps {
  sales: SalesRecord[];
  posPoints: POSPoint[];
  categories: CardCategory[];
  dispatches: CardBatchDispatch[];
  settings: NetworkSettings;
  onAddSale: (sale: Omit<SalesRecord, 'id'>) => void;
  onUpdateSale?: (sale: SalesRecord) => void;
  onDeleteSale: (saleId: string) => void;
  onPrintSaleReceipt: (sale: SalesRecord) => void;
  selectedPOSIdForQuickSale?: string;
  onOpenFinancialExport?: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  posPoints,
  categories,
  dispatches,
  settings,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
  onPrintSaleReceipt,
  selectedPOSIdForQuickSale,
  onOpenFinancialExport,
}) => {
  // Advanced Search & Filters State
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>({
    search: '',
    posPointId: 'all',
    transactionType: 'all',
    paymentType: 'all',
    categoryId: 'all',
    datePeriod: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportingReportPdf, setIsExportingReportPdf] = useState(false);
  const [reportPaperMode, setReportPaperMode] = useState<'a4' | 'pos-80mm'>('a4');

  // New / Edit Sale Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesRecord | null>(null);
  const [deletingSale, setDeletingSale] = useState<SalesRecord | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].substring(0, 5),
    posPointId: selectedPOSIdForQuickSale || (posPoints[0]?.id || ''),
    categoryId: categories[0]?.id || '',
    quantity: 10,
    paymentType: 'credit' as 'cash' | 'credit',
    notes: '',
  });

  // Selected category in form
  const selectedCat = categories.find((c) => c.id === formData.categoryId);
  const selectedPOS = posPoints.find((p) => p.id === formData.posPointId);

  // Available stock at selected POS
  const posInventory = useMemo(() => {
    if (!formData.posPointId) return null;
    return calculatePOSInventory(formData.posPointId, dispatches, sales);
  }, [formData.posPointId, dispatches, sales]);

  const availableStockForCat = useMemo(() => {
    if (!posInventory || !formData.categoryId) return 0;
    return posInventory.byCategory[formData.categoryId]?.remaining || 0;
  }, [posInventory, formData.categoryId]);

  const handleOpenAddModal = (posId?: string) => {
    setEditingSale(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].substring(0, 5),
      posPointId: posId || selectedPOSIdForQuickSale || (posPoints[0]?.id || ''),
      categoryId: categories[0]?.id || '',
      quantity: 10,
      paymentType: 'credit',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sale: SalesRecord) => {
    setEditingSale(sale);
    setFormData({
      date: sale.date,
      time: sale.time || new Date().toISOString().split('T')[1].substring(0, 5),
      posPointId: sale.posPointId,
      categoryId: sale.categoryId,
      quantity: sale.quantity,
      paymentType: sale.paymentType,
      notes: sale.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.posPointId || !formData.categoryId || formData.quantity <= 0 || !selectedCat) {
      return;
    }

    const unitRetailPrice = selectedCat.retailPrice;
    const unitWholesalePrice = selectedCat.wholesalePrice;
    const totalRetailAmount = unitRetailPrice * Number(formData.quantity);
    const totalWholesaleAmount = unitWholesalePrice * Number(formData.quantity);
    const profit = (unitWholesalePrice - selectedCat.costPrice) * Number(formData.quantity);

    if (editingSale && onUpdateSale) {
      onUpdateSale({
        ...editingSale,
        date: formData.date,
        posPointId: formData.posPointId,
        categoryId: formData.categoryId,
        quantity: Number(formData.quantity),
        unitRetailPrice,
        totalRetailAmount,
        unitWholesalePrice,
        totalWholesaleAmount,
        profit,
        paymentType: formData.paymentType,
        notes: formData.notes,
      });
    } else {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      onAddSale({
        date: formData.date,
        posPointId: formData.posPointId,
        categoryId: formData.categoryId,
        quantity: Number(formData.quantity),
        unitRetailPrice,
        totalRetailAmount,
        unitWholesalePrice,
        totalWholesaleAmount,
        profit,
        paymentType: formData.paymentType,
        invoiceNumber,
        notes: formData.notes,
      });
    }

    setIsModalOpen(false);
  };

  // Filter Sales Records by Advanced Multi-criteria
  const filteredSales = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return sales.filter((s) => {
      const pos = posPoints.find((p) => p.id === s.posPointId);
      const cat = categories.find((c) => c.id === s.categoryId);

      // Search Query across multiple fields
      if (advancedFilters.search.trim()) {
        const term = advancedFilters.search.toLowerCase();
        const matchesInvoice = s.invoiceNumber?.toLowerCase().includes(term);
        const matchesPOS = pos?.name?.toLowerCase().includes(term) || pos?.managerName?.toLowerCase().includes(term);
        const matchesCat = cat?.name?.toLowerCase().includes(term);
        const matchesNotes = s.notes?.toLowerCase().includes(term);

        if (!matchesInvoice && !matchesPOS && !matchesCat && !matchesNotes) {
          return false;
        }
      }

      // POS / Distributor Filter
      if (advancedFilters.posPointId !== 'all' && s.posPointId !== advancedFilters.posPointId) {
        return false;
      }

      // Category Filter
      if (advancedFilters.categoryId && advancedFilters.categoryId !== 'all' && s.categoryId !== advancedFilters.categoryId) {
        return false;
      }

      // Payment Type Filter
      if (advancedFilters.paymentType !== 'all' && s.paymentType !== advancedFilters.paymentType) {
        return false;
      }

      // Date Filtering
      const saleDate = s.date;
      if (advancedFilters.datePeriod === 'today') {
        if (saleDate !== todayStr) return false;
      } else if (advancedFilters.datePeriod === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        if (saleDate !== y.toISOString().split('T')[0]) return false;
      } else if (advancedFilters.datePeriod === '7days') {
        const d = new Date(saleDate);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diff < 0 || diff > 7) return false;
      } else if (advancedFilters.datePeriod === 'month') {
        const d = new Date(saleDate);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'last_month') {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const d = new Date(saleDate);
        if (d.getMonth() !== lastM.getMonth() || d.getFullYear() !== lastM.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'quarter') {
        const d = new Date(saleDate);
        const curQ = Math.floor(now.getMonth() / 3);
        const saleQ = Math.floor(d.getMonth() / 3);
        if (curQ !== saleQ || d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'year') {
        const d = new Date(saleDate);
        if (d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'custom') {
        if (advancedFilters.startDate && saleDate < advancedFilters.startDate) return false;
        if (advancedFilters.endDate && saleDate > advancedFilters.endDate) return false;
      }

      // Amount Range Filtering
      if (advancedFilters.minAmount && (s.totalWholesaleAmount || 0) < Number(advancedFilters.minAmount)) {
        return false;
      }
      if (advancedFilters.maxAmount && (s.totalWholesaleAmount || 0) > Number(advancedFilters.maxAmount)) {
        return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, posPoints, categories, advancedFilters]);

  // Overall Totals
  const totals = useMemo(() => {
    const safeSales = filteredSales || [];
    const totalQty = safeSales.reduce((acc, s) => acc + (s?.quantity || 0), 0);
    const totalRetail = safeSales.reduce((acc, s) => acc + (s?.totalRetailAmount || 0), 0);
    const totalWholesale = safeSales.reduce((acc, s) => acc + (s?.totalWholesaleAmount || 0), 0);
    const totalProfit = safeSales.reduce((acc, s) => acc + (s?.profit || 0), 0);
    const totalCash = safeSales
      .filter((s) => s?.paymentType === 'cash')
      .reduce((acc, s) => acc + (s?.totalWholesaleAmount || 0), 0);
    const totalCredit = safeSales
      .filter((s) => s?.paymentType === 'credit')
      .reduce((acc, s) => acc + (s?.totalWholesaleAmount || 0), 0);

    return {
      totalQty,
      totalRetail,
      totalWholesale,
      totalProfit,
      totalCash,
      totalCredit,
    };
  }, [filteredSales]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    exportSalesToExcel(filteredSales, posPoints, categories, settings);
  };

  // WhatsApp Share receipt formatter
  const handleWhatsAppShare = (sale: SalesRecord) => {
    const pos = posPoints.find((p) => p.id === sale.posPointId);
    const cat = categories.find((c) => c.id === sale.categoryId);

    const message = `*فاتورة مبيعات كروت شبكة ${settings.networkName}*
-----------------------------
رقم السند: *${sale.invoiceNumber}*
التاريخ: ${sale.date} ${sale.time ? `- ${sale.time}` : ''}
نقطة البيع: *${pos ? pos.name : 'مبيعات مباشرة'}*
فئة الكارت: *${cat ? cat.name : ''}*
الكمية المباعة: *${sale.quantity} كارت*
سعر التجزئة: ${sale.unitRetailPrice} ${settings.currencySymbol}
إجمالي المبلغ: *${(sale.totalRetailAmount ?? 0).toLocaleString()} ${settings.currencySymbol}*
سعر الجملة: ${sale.unitWholesalePrice} ${settings.currencySymbol}
طريقة الدفع: ${sale.paymentType === 'cash' ? '✅ نقدي تم الاستلام' : '⏳ آجل على الحساب'}
-----------------------------
شكراً لتعاملكم معنا 🌹
للدعم والاستفسار: ${settings.supportPhone}`;

    const url = `https://wa.me/${pos?.phone ? (pos.phone.startsWith('967') ? pos.phone : `967${pos.phone}`) : ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filterInfo = useMemo(() => {
    const pos = posPoints.find((p) => p.id === advancedFilters.posPointId);
    const cat = categories.find((c) => c.id === advancedFilters.categoryId);
    return {
      searchTerm: advancedFilters.search || undefined,
      posFilterName: pos ? pos.name : 'جميع نقاط البيع والموزعين',
      categoryFilterName: cat ? cat.name : 'جميع فئات الكروت',
      paymentFilterName:
        advancedFilters.paymentType === 'cash'
          ? 'نقداً فقط'
          : advancedFilters.paymentType === 'credit'
          ? 'آجل على الحساب'
          : 'الكل (نقدي وآجل)',
      startDate: advancedFilters.startDate || undefined,
      endDate: advancedFilters.endDate || undefined,
    };
  }, [advancedFilters, posPoints, categories]);

  const handleOpenReportModal = (mode: 'a4' | 'pos-80mm' = 'a4') => {
    setReportPaperMode(mode);
    setIsReportModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              سجل وفواتير مبيعات الكروت
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {sales.length} عملية مسجلة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تسجيل مبيعات الموزعين، تتبع الكميات، إصدار السندات، وتصدير التقارير.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Report A4 Button */}
          <button
            onClick={() => handleOpenReportModal('a4')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-bold transition cursor-pointer shadow-xs"
            title="معاينة وطباعة تقرير المبيعات على ورق عادي A4 رسمي"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>تقرير A4 رسمي</span>
          </button>

          {/* Report Thermal Cashier 80mm Button */}
          <button
            onClick={() => handleOpenReportModal('pos-80mm')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer shadow-xs"
            title="طباعة وتصدير ملخص مبيعات متوافق مع طابعات الكاشير والورق الحراري 80mm"
          >
            <ReceiptText className="w-4 h-4 text-amber-400" />
            <span>طباعة كاشير (80mm)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            title="تصدير جدول المبيعات بتنسيق Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مبيعات جديدة</span>
          </button>
        </div>
      </div>

      {/* Advanced Search & Filter Bar */}
      <AdvancedSearchBar
        filters={advancedFilters}
        onFilterChange={setAdvancedFilters}
        posPoints={posPoints}
        categories={categories}
        totalResultsCount={filteredSales.length}
        totalAvailableCount={sales.length}
        currency={settings.currencySymbol}
        showCategoryFilter={true}
        onExportExcel={handleExportCSV}
        onOpenComprehensiveExport={onOpenFinancialExport}
        placeholder="بحث برقم السند، نقطة البيع، فئة الكارت، الملاحظات..."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">إجمالي الكروت المباعة</span>
          <div className="text-lg sm:text-xl font-black text-indigo-400 font-mono mt-1">
            {(totals.totalQty ?? 0).toLocaleString()} <span className="text-xs text-slate-400">كارت</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">مبيعات الجملة الإجمالية</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">
            {(totals.totalWholesale ?? 0).toLocaleString()} <span className="text-xs">{settings.currencySymbol}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">المبيعات الآجلة (دين)</span>
          <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">
            {(totals.totalCredit ?? 0).toLocaleString()} <span className="text-xs">{settings.currencySymbol}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">صافي أرباح الشبكة</span>
          <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono mt-1">
            {(totals.totalProfit ?? 0).toLocaleString()} <span className="text-xs">{settings.currencySymbol}</span>
          </div>
        </div>
      </div>

      {/* Sales Records Table */}
      <div id="sales-report-container" className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs divide-y divide-slate-800">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">نقطة البيع</th>
                <th className="py-3 px-4">فئة الكارت</th>
                <th className="py-3 px-3 text-center">الكمية</th>
                <th className="py-3 px-4">سعر الجملة</th>
                <th className="py-3 px-4 font-bold text-emerald-400">إجمالي المبلغ</th>
                <th className="py-3 px-4">الربح</th>
                <th className="py-3 px-4">نوع الدفع</th>
                <th className="py-3 px-4">ملاحظات</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSales.map((sale) => {
                const pos = posPoints.find((p) => p.id === sale.posPointId);
                const cat = categories.find((c) => c.id === sale.categoryId);

                return (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-indigo-400">
                        {sale.invoiceNumber}
                      </div>
                      <div className="mt-1">
                        <RecordAuditInfo
                          audit={sale}
                          entityName={`مبيعات ${sale.invoiceNumber}`}
                          compact={true}
                          showHistoryButton={true}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {sale.date} {sale.time ? ` - ${sale.time}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-white block">{pos ? pos.name : 'مبيعات مباشرة'}</strong>
                      <span className="text-[11px] text-slate-400">{pos?.phone}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {cat ? cat.name : 'فئة محذوفة'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-white text-sm">
                      {sale.quantity}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {sale.unitWholesalePrice} {settings.currencySymbol}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-emerald-400 text-sm">
                      {(sale.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      +{(sale.profit ?? 0).toLocaleString()} {settings.currencySymbol}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          sale.paymentType === 'cash'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {sale.paymentType === 'cash' ? 'نقداً (مستلم)' : 'آجل (دين)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {sale.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onPrintSaleReceipt(sale)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                          title="عرض وطباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsAppShare(sale)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition"
                          title="مشاركة الفاتورة عبر واتساب"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {onUpdateSale && (
                          <button
                            onClick={() => handleOpenEditModal(sale)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                            title="تعديل الفاتورة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingSale(sale)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title="حذف حركة الفاتورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <ReceiptText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">لا توجد عمليات مبيعات مطابقة</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div>
            <span>إجمالي الفواتير المعروضة: </span>
            <span className="font-bold text-white font-mono">{filteredSales.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span>مجموع المبيعات: </span>
              <span className="font-bold text-emerald-400 font-mono">
                {(totals.totalRetail ?? 0).toLocaleString()} {settings.currencySymbol}
              </span>
            </div>
            <div>
              <span>مجموع الأرباح: </span>
              <span className="font-bold text-cyan-400 font-mono">
                {(totals.totalProfit ?? 0).toLocaleString()} {settings.currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Record / Edit Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-emerald-400" />
                <span>{editingSale ? 'تعديل فاتورة المبيعات' : 'تسجيل عملية بيع جديدة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    تاريخ العملية:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    نقطة البيع / الموزع <span className="text-rose-400">*</span>:
                  </label>
                  <select
                    required
                    value={formData.posPointId}
                    onChange={(e) => setFormData({ ...formData, posPointId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {posPoints.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} - (دين: {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    فئة الكارت <span className="text-rose-400">*</span>:
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.retailPrice} {settings.currencySymbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الكمية المباعة (كارت) <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text" inputMode="decimal"
                    
                    required
                    placeholder="10"
                    value={formData.quantity === 0 ? '' : formData.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, quantity: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {[5, 10, 20, 50, 100].map((quickVal) => (
                      <button
                        key={quickVal}
                        type="button"
                        onClick={() => setFormData({ ...formData, quantity: quickVal })}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                          formData.quantity === quickVal
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {quickVal} كارت
                      </button>
                    ))}
                  </div>
                  {formData.posPointId && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      الرصيد المتاح لدى النقطة: {availableStockForCat} كارت
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  طريقة السداد والتحصيل:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'credit' })}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition ${
                      formData.paymentType === 'credit'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⏳ آجل (يُضاف لمديونية الموزع)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'cash' })}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition ${
                      formData.paymentType === 'cash'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ✅ نقداً (تم التحصيل فوراً)
                  </button>
                </div>
              </div>

              {/* Price Calculation Summary */}
              {selectedCat && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>إجمالي قيمة الجملة (المستحقة على النقطة):</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      {((selectedCat.wholesalePrice || 0) * (formData.quantity || 0)).toLocaleString()} {settings.currencySymbol}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>إجمالي قيمة البيع للجمهور (تجزئة):</span>
                    <span className="font-mono">
                      {((selectedCat.retailPrice || 0) * (formData.quantity || 0)).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-cyan-400 text-[11px] pt-1 border-t border-slate-800">
                    <span>صافي ربح الشبكة من هذه العملية:</span>
                    <span className="font-mono font-bold">
                      +{(((selectedCat.wholesalePrice || 0) - (selectedCat.costPrice || 0)) * (formData.quantity || 0)).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات:
                </label>
                <input
                  type="text"
                  placeholder="أي تفاصيل أو ملاحظات حول الفاتورة..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  {editingSale ? 'حفظ التعديلات' : 'تأكيد وحفظ الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      {deletingSale && (() => {
        const pos = posPoints.find((p) => p.id === deletingSale.posPointId);
        const cat = categories.find((c) => c.id === deletingSale.categoryId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-800 bg-rose-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">تأكيد حذف حركة المبيعات</h3>
                    <p className="text-xs text-rose-300/80">الفاتورة رقم: {deletingSale.invoiceNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingSale(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">نقطة البيع:</span>
                    <span className="font-bold text-white text-sm">{pos ? pos.name : 'مبيعات مباشرة'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">فئة الكارت:</span>
                    <span className="text-indigo-300 font-semibold">{cat ? cat.name : 'فئة محذوفة'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">الكمية:</span>
                    <span className="font-mono font-bold text-white">{deletingSale.quantity} كارت</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">مبلغ الفاتورة (الجملة):</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {(deletingSale.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="block text-amber-200">الأثر المحاسبي للحذف:</strong>
                    <span>
                      عند حذف هذه الفاتورة، سيتم إعادة الكمية ({deletingSale.quantity} كارت) لرصيد نقطة البيع وخصم مبلغ الجملة من مديونية الموزع تلقائياً.
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingSale(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSale(deletingSale.id);
                      setDeletingSale(null);
                    }}
                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف وتحديث الحساب</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Official Sales Report Preview & PDF Print Modal */}
      {isReportModalOpen && (
        <SalesReportModal
          sales={filteredSales}
          posPoints={posPoints}
          categories={categories}
          settings={settings}
          filterInfo={filterInfo}
          totals={totals}
          initialPaperFormat={reportPaperMode}
          onClose={() => setIsReportModalOpen(false)}
          onPrintSaleReceipt={onPrintSaleReceipt}
        />
      )}
    </div>
  );
};
