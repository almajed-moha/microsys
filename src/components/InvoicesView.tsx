import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Store,
  Layers,
  Printer,
  Trash2,
  Edit2,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  CreditCard,
  Building,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Sparkles,
  FileCode,
  Share2,
  FileDown,
  Loader2
} from 'lucide-react';
import { InvoiceRecord, InvoiceItem, CardCategory, POSPoint, NetworkSettings, ExpenseRecord, SalesRecord, PaymentRecord } from '../types';
import { exportToCSV, downloadFile, generateNextInvoiceNumber } from '../utils/storage';
import { InvoiceReceiptModal } from './InvoiceReceiptModal';
import { AdvancedSearchBar, AdvancedFilterState } from './AdvancedSearchBar';
import { exportInvoicesToExcel, exportInvoicesToCSV } from '../utils/exportAccounting';
import { RecordAuditInfo } from './RecordAuditInfo';
import {
  printElementDocument,
  exportElementToPdf
} from '../utils/pdfExport';

interface InvoicesViewProps {
  invoices: InvoiceRecord[];
  categories: CardCategory[];
  posPoints: POSPoint[];
  settings: NetworkSettings;
  expenses?: ExpenseRecord[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  onAddInvoice: (invoice: Omit<InvoiceRecord, 'id' | 'timestamp'>) => void;
  onUpdateInvoice: (invoice: InvoiceRecord) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onOpenFinancialExport?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices = [],
  categories = [],
  posPoints = [],
  settings,
  expenses = [],
  sales = [],
  payments = [],
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onOpenFinancialExport,
}) => {
  const currency = settings?.currencySymbol || 'ر.ي';

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'returns'>('all');

  // Search & Advanced Filters State
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

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInvoiceType, setCreateInvoiceType] = useState<'sale' | 'return'>('sale');
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceRecord | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isExportingReportPdf, setIsExportingReportPdf] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Form State for Invoice (Create or Edit)
  const [formInvoiceNumber, setFormInvoiceNumber] = useState<string>('');
  const [formPOSId, setFormPOSId] = useState<string>(posPoints[0]?.id || '');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formPaymentType, setFormPaymentType] = useState<'credit' | 'cash'>('credit');
  const [formDeliveredBy, setFormDeliveredBy] = useState<string>('مندوب التوزيع');
  const [formReceivedBy, setFormReceivedBy] = useState<string>('');
  const [formReasonForReturn, setFormReasonForReturn] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Multi-item repeater state
  const [formItems, setFormItems] = useState<Array<{
    categoryId: string;
    quantity: number | '';
    unitWholesalePrice: number | '';
    unitRetailPrice: number | '';
    unitCostPrice: number | '';
    serialStart: string;
    serialEnd: string;
    notes: string;
  }>>([
    {
      categoryId: categories[0]?.id || '',
      quantity: 50,
      unitWholesalePrice: categories[0]?.wholesalePrice || 80,
      unitRetailPrice: categories[0]?.retailPrice || 100,
      unitCostPrice: categories[0]?.costPrice || 25,
      serialStart: '',
      serialEnd: '',
      notes: '',
    },
  ]);

  // Synchronize initial manager name when POS changes in form
  const handlePOSChange = (posId: string) => {
    setFormPOSId(posId);
    const selected = posPoints.find((p) => p.id === posId);
    if (selected) {
      setFormReceivedBy(selected.managerName || selected.name);
    }
  };

  // Open Creation Modal
  const handleOpenCreateModal = (type: 'sale' | 'return') => {
    setEditingInvoice(null);
    setCreateInvoiceType(type);
    const todayStr = new Date().toISOString().split('T')[0];
    const autoNumber = generateNextInvoiceNumber(invoices, type, todayStr);
    setFormInvoiceNumber(autoNumber);
    const initialPos = posPoints[0];
    setFormPOSId(initialPos?.id || '');
    setFormReceivedBy(initialPos?.managerName || initialPos?.name || '');
    setFormDate(todayStr);
    setFormPaymentType('credit');
    setFormDeliveredBy(type === 'sale' ? 'مندوب التوزيع' : 'أمين المستودع');
    setFormReasonForReturn(type === 'return' ? 'طلب استبدال فئات' : '');
    setFormNotes('');

    const initialCat = categories[0];
    setFormItems([
      {
        categoryId: initialCat?.id || '',
        quantity: type === 'sale' ? 50 : 10,
        unitWholesalePrice: initialCat?.wholesalePrice || 80,
        unitRetailPrice: initialCat?.retailPrice || 100,
        unitCostPrice: initialCat?.costPrice || 25,
        serialStart: '',
        serialEnd: '',
        notes: '',
      },
    ]);

    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (inv: InvoiceRecord) => {
    setEditingInvoice(inv);
    setCreateInvoiceType(inv.type);
    setFormInvoiceNumber(inv.invoiceNumber);
    setFormPOSId(inv.posPointId);
    setFormReceivedBy(inv.receivedBy || '');
    setFormDate(inv.date);
    setFormPaymentType(inv.paymentType);
    setFormDeliveredBy(inv.deliveredBy || '');
    setFormReasonForReturn(inv.reasonForReturn || '');
    setFormNotes(inv.notes || '');

    setFormItems(
      inv.items.map((item) => ({
        categoryId: item.categoryId,
        quantity: item.quantity,
        unitWholesalePrice: item.unitWholesalePrice,
        unitRetailPrice: item.unitRetailPrice,
        unitCostPrice: item.unitCostPrice || 0,
        serialStart: item.serialStart || '',
        serialEnd: item.serialEnd || '',
        notes: item.notes || '',
      }))
    );

    setIsCreateModalOpen(true);
  };

  // Add Item Row in Modal
  const handleAddItemRow = () => {
    const defaultCat = categories[0];
    setFormItems([
      ...formItems,
      {
        categoryId: defaultCat?.id || '',
        quantity: 50,
        unitWholesalePrice: defaultCat?.wholesalePrice || 80,
        unitRetailPrice: defaultCat?.retailPrice || 100,
        unitCostPrice: defaultCat?.costPrice || 25,
        serialStart: '',
        serialEnd: '',
        notes: '',
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) {
      alert('يجب أن تحتوي الفاتورة على صنف واحد على الأقل.');
      return;
    }
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Update Item Row Property
  const handleItemRowChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    const item = { ...updated[index], [field]: value };

    // When category changes, auto-fill prices
    if (field === 'categoryId') {
      const cat = categories.find((c) => c.id === value);
      if (cat) {
        item.unitWholesalePrice = cat.wholesalePrice;
        item.unitRetailPrice = cat.retailPrice;
        item.unitCostPrice = cat.costPrice || 0;
      }
    }

    updated[index] = item;
    setFormItems(updated);
  };

  // Calculated Live Modal Totals
  const modalCalculations = useMemo(() => {
    let totalQty = 0;
    let totalWholesale = 0;
    let totalRetail = 0;
    let totalCost = 0;

    formItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const wholesale = Number(item.unitWholesalePrice) || 0;
      const retail = Number(item.unitRetailPrice) || 0;
      const cost = Number(item.unitCostPrice) || 0;

      totalQty += qty;
      totalWholesale += qty * wholesale;
      totalRetail += qty * retail;
      totalCost += qty * cost;
    });

    const totalProfit = totalWholesale - totalCost;

    return {
      totalQty,
      totalWholesale,
      totalRetail,
      totalCost,
      totalProfit,
    };
  }, [formItems]);

  // Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPOSId) {
      alert('يرجى اختيار نقطة البيع أو الموزع.');
      return;
    }

    if (formItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل.');
      return;
    }

    // Validate quantities
    for (let i = 0; i < formItems.length; i++) {
      const item = formItems[i];
      if (!item.quantity || Number(item.quantity) <= 0) {
        alert(`يرجى تحديد كمية صحيحة للصنف في السطر رقم ${i + 1}`);
        return;
      }
    }

    const selectedPOS = posPoints.find((p) => p.id === formPOSId);
    const posPointName = selectedPOS ? selectedPOS.name : 'نقطة بيع غير محددة';

    const processedItems: InvoiceItem[] = formItems.map((item) => {
      const cat = categories.find((c) => c.id === item.categoryId);
      const catName = cat ? cat.name : 'فئة غير معروفة';
      const qty = Number(item.quantity) || 0;
      const wholesale = Number(item.unitWholesalePrice) || 0;
      const retail = Number(item.unitRetailPrice) || 0;
      const cost = Number(item.unitCostPrice) || 0;
      const totalWholesale = qty * wholesale;
      const totalRetail = qty * retail;
      const profit = totalWholesale - (qty * cost);

      return {
        categoryId: item.categoryId,
        categoryName: catName,
        quantity: qty,
        unitWholesalePrice: wholesale,
        totalWholesalePrice: totalWholesale,
        unitRetailPrice: retail,
        totalRetailPrice: totalRetail,
        unitCostPrice: cost > 0 ? cost : undefined,
        profit: profit > 0 ? profit : undefined,
        serialStart: item.serialStart.trim() || undefined,
        serialEnd: item.serialEnd.trim() || undefined,
        notes: item.notes.trim() || undefined,
      };
    });

    const finalInvoiceNumber =
      formInvoiceNumber.trim() || generateNextInvoiceNumber(invoices, createInvoiceType, formDate);

    if (editingInvoice) {
      const updatedInvoice: InvoiceRecord = {
        ...editingInvoice,
        invoiceNumber: finalInvoiceNumber,
        type: createInvoiceType,
        date: formDate,
        posPointId: formPOSId,
        posPointName,
        items: processedItems,
        totalQuantity: modalCalculations.totalQty,
        totalWholesaleAmount: modalCalculations.totalWholesale,
        totalRetailAmount: modalCalculations.totalRetail,
        totalCostAmount: modalCalculations.totalCost > 0 ? modalCalculations.totalCost : undefined,
        totalProfit: modalCalculations.totalProfit > 0 ? modalCalculations.totalProfit : undefined,
        paymentType: formPaymentType,
        notes: formNotes.trim() || undefined,
        reasonForReturn: createInvoiceType === 'return' ? formReasonForReturn.trim() : undefined,
        receivedBy: formReceivedBy.trim() || undefined,
        deliveredBy: formDeliveredBy.trim() || undefined,
      };
      onUpdateInvoice(updatedInvoice);
      showFeedback(`تم حفظ تعديلات الفاتورة رقم ${finalInvoiceNumber} بنجاح ✅`);
    } else {
      onAddInvoice({
        invoiceNumber: finalInvoiceNumber,
        type: createInvoiceType,
        date: formDate,
        posPointId: formPOSId,
        posPointName,
        items: processedItems,
        totalQuantity: modalCalculations.totalQty,
        totalWholesaleAmount: modalCalculations.totalWholesale,
        totalRetailAmount: modalCalculations.totalRetail,
        totalCostAmount: modalCalculations.totalCost > 0 ? modalCalculations.totalCost : undefined,
        totalProfit: modalCalculations.totalProfit > 0 ? modalCalculations.totalProfit : undefined,
        paymentType: formPaymentType,
        status: 'completed',
        notes: formNotes.trim() || undefined,
        reasonForReturn: createInvoiceType === 'return' ? formReasonForReturn.trim() : undefined,
        receivedBy: formReceivedBy.trim() || undefined,
        deliveredBy: formDeliveredBy.trim() || undefined,
      });
      showFeedback(`تم إصدار الفاتورة رقم ${finalInvoiceNumber} بنجاح ✅`);
    }

    setIsCreateModalOpen(false);
  };

  // Confirm Delete Invoice (In-App Dialog)
  const handleConfirmDeleteInvoice = () => {
    if (!deletingInvoice) return;
    const invNum = deletingInvoice.invoiceNumber;
    onDeleteInvoice(deletingInvoice.id);
    setDeletingInvoice(null);
    showFeedback(`تم حذف الفاتورة رقم ${invNum} والتراجع عن أثرها المالي والمخزني ✅`);
  };

  // Base filtered invoices matching global criteria (date, POS, payment, search, amount)
  const baseInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return (invoices || []).filter((inv) => {
      // Transaction Type Filter (if explicitly set in advanced filters)
      if (advancedFilters.transactionType !== 'all' && inv.type !== advancedFilters.transactionType) return false;

      // POS Filter
      if (advancedFilters.posPointId !== 'all' && inv.posPointId !== advancedFilters.posPointId) return false;

      // Payment Type Filter
      if (advancedFilters.paymentType !== 'all' && inv.paymentType !== advancedFilters.paymentType) return false;

      // Search Query across multiple fields (Invoice Number, POS Name, Notes, DeliveredBy, ReceivedBy, Items)
      if (advancedFilters.search.trim()) {
        const term = advancedFilters.search.toLowerCase();
        const matchesNumber = inv.invoiceNumber?.toLowerCase().includes(term);
        const matchesPOS = inv.posPointName?.toLowerCase().includes(term);
        const matchesNotes = inv.notes?.toLowerCase().includes(term);
        const matchesReturnReason = inv.reasonForReturn?.toLowerCase().includes(term);
        const matchesDelivered = inv.deliveredBy?.toLowerCase().includes(term);
        const matchesReceived = inv.receivedBy?.toLowerCase().includes(term);
        const matchesItems = inv.items?.some((i) =>
          i.categoryName?.toLowerCase().includes(term) ||
          i.serialStart?.toLowerCase().includes(term) ||
          i.serialEnd?.toLowerCase().includes(term) ||
          i.notes?.toLowerCase().includes(term)
        );

        if (!matchesNumber && !matchesPOS && !matchesNotes && !matchesReturnReason && !matchesDelivered && !matchesReceived && !matchesItems) {
          return false;
        }
      }

      // Date Filtering
      const invDate = inv.date;
      if (advancedFilters.datePeriod === 'today') {
        if (invDate !== todayStr) return false;
      } else if (advancedFilters.datePeriod === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        if (invDate !== y.toISOString().split('T')[0]) return false;
      } else if (advancedFilters.datePeriod === '7days') {
        const d = new Date(invDate);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diff < 0 || diff > 7) return false;
      } else if (advancedFilters.datePeriod === 'month') {
        const d = new Date(invDate);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'last_month') {
        const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const d = new Date(invDate);
        if (d.getMonth() !== lastM.getMonth() || d.getFullYear() !== lastM.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'quarter') {
        const d = new Date(invDate);
        const curQ = Math.floor(now.getMonth() / 3);
        const invQ = Math.floor(d.getMonth() / 3);
        if (curQ !== invQ || d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'year') {
        const d = new Date(invDate);
        if (d.getFullYear() !== now.getFullYear()) return false;
      } else if (advancedFilters.datePeriod === 'custom') {
        if (advancedFilters.startDate && invDate < advancedFilters.startDate) return false;
        if (advancedFilters.endDate && invDate > advancedFilters.endDate) return false;
      }

      // Min and Max Wholesale Amount Filter
      const amount = Number(inv.totalWholesaleAmount || 0);
      if (advancedFilters.minAmount && amount < Number(advancedFilters.minAmount)) {
        return false;
      }
      if (advancedFilters.maxAmount && amount > Number(advancedFilters.maxAmount)) {
        return false;
      }

      return true;
    });
  }, [invoices, advancedFilters]);

  // Tab-specific filtered invoices
  const filteredInvoices = useMemo(() => {
    return baseInvoices.filter((inv) => {
      if (activeTab === 'sales' && inv.type !== 'sale') return false;
      if (activeTab === 'returns' && inv.type !== 'return') return false;
      return true;
    }).sort((a, b) => (b.timestamp || b.date || '').localeCompare(a.timestamp || a.date || ''));
  }, [baseInvoices, activeTab]);

  // Aggregate Stats across base matching invoices (ensures Gross Sales, Returns, and Net Sales are always accurately calculated)
  const stats = useMemo(() => {
    let salesCount = 0;
    let salesWholesaleTotal = 0;
    let salesCardsTotal = 0;
    let returnsCount = 0;
    let returnsWholesaleTotal = 0;
    let returnsCardsTotal = 0;

    baseInvoices.forEach((inv) => {
      const wholesale = Number(inv.totalWholesaleAmount || 0);
      const qty = Number(inv.totalQuantity || 0);
      if (inv.type === 'sale') {
        salesCount++;
        salesWholesaleTotal += wholesale;
        salesCardsTotal += qty;
      } else {
        returnsCount++;
        returnsWholesaleTotal += wholesale;
        returnsCardsTotal += qty;
      }
    });

    const netWholesaleAmount = salesWholesaleTotal - returnsWholesaleTotal;
    const netCardsQuantity = salesCardsTotal - returnsCardsTotal;

    return {
      totalCount: baseInvoices.length,
      salesCount,
      salesWholesaleTotal,
      salesCardsTotal,
      returnsCount,
      returnsWholesaleTotal,
      returnsCardsTotal,
      netWholesaleAmount,
      netCardsQuantity,
    };
  }, [baseInvoices]);

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = filteredInvoices.map((inv) => ({
      'رقم الفاتورة': inv.invoiceNumber,
      'النوع': inv.type === 'sale' ? 'فاتورة مبيعات' : 'سند مرتجع',
      'التاريخ': inv.date,
      'نقطة البيع': inv.posPointName,
      'عدد الأصناف': inv.items.length,
      'إجمالي الكروت': inv.totalQuantity,
      'إجمالي المبلغ': inv.totalWholesaleAmount,
      'العملة': currency,
      'طريقة السداد': inv.paymentType === 'cash' ? 'نقداً' : 'آجل',
      'المسلم': inv.deliveredBy || '',
      'المستلم': inv.receivedBy || '',
      'ملاحظات': inv.notes || inv.reasonForReturn || '',
    }));

    exportToCSV(dataToExport, `سجل_الفواتير_${new Date().toISOString().split('T')[0]}`);
    showFeedback('تم تصدير ملف الفواتير Excel بنجاح ✅');
  };

  // Print Invoices Report
  const handlePrintReport = async () => {
    setIsPrintingReport(true);
    try {
      await printElementDocument('invoices-report-document', {
        filename: `كشف_الفواتير_${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'a4',
        paperFormat: 'a4',
        orientation: 'landscape',
        scale: 2.5,
        margin: 6,
      });
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setIsPrintingReport(false);
    }
  };

  const handleExportReportPdf = async () => {
    setIsExportingReportPdf(true);
    try {
      const ok = await exportElementToPdf('invoices-report-document', {
        filename: `كشف_الفواتير_${new Date().toISOString().split('T')[0]}.pdf`,
        title: `كشف الفواتير - ${settings.networkName}`,
        format: 'a4',
        orientation: 'landscape',
        scale: 2.5,
        margin: 6,
      });
      if (ok) {
        showFeedback('تم تحميل كشف الفواتير PDF بنجاح ✅');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingReportPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                الفواتير (المبيعات والمرتجع)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                إصدار فواتير تسليم دفعات الكروت متعددة الفئات، وسندات الإرجاع، وتحديث المخزون والمديونية آلياً.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>طباعة الكشف</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('return')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-sm font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>سند مرتجع كروت</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('sale')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>فاتورة مبيعات جديدة</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {feedbackMessage}
          </span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Subtabs (All, Sales, Returns) */}
      <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>كافة الفواتير والسندات</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/20">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>فواتير المبيعات والتسليم</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/20">
            {invoices.filter((i) => i.type === 'sale').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeTab === 'returns'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>سندات المرتجع (إشعارات دائنة)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/20">
            {invoices.filter((i) => i.type === 'return').length}
          </span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Invoices */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">إجمالي المبيعات (الجملة)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {(stats.salesWholesaleTotal ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {(stats.salesCardsTotal ?? 0).toLocaleString()} كارت مبيعات ({stats.salesCount || 0} فاتورة)
          </div>
        </div>

        {/* Total Returns */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">إجمالي المرتجع (المسترد)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {(stats.returnsWholesaleTotal ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {(stats.returnsCardsTotal ?? 0).toLocaleString()} كارت مرتجع ({stats.returnsCount || 0} سند)
          </div>
        </div>

        {/* Net Sales */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">صافي مبيعات الفواتير</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {(stats.netWholesaleAmount ?? 0).toLocaleString()}{' '}
            <span className="text-xs text-indigo-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            صافي الكمية: {(stats.netCardsQuantity ?? 0).toLocaleString()} كارت
          </div>
        </div>

        {/* POS Points Distribution */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">نقاط البيع النشطة</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {posPoints.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            موزعين معتمدين بالشبكة
          </div>
        </div>
      </div>

      {/* Advanced Search & Filter Bar */}
      <AdvancedSearchBar
        filters={advancedFilters}
        onFilterChange={setAdvancedFilters}
        posPoints={posPoints}
        categories={categories}
        totalResultsCount={filteredInvoices.length}
        totalAvailableCount={invoices.length}
        currency={currency}
        typesList={[
          { id: 'sale', label: '📦 فواتير مبيعات وتسليم' },
          { id: 'return', label: '🔄 سندات مرتجع كروت' },
        ]}
        showCategoryFilter={true}
        onExportExcel={handleExportCSV}
        onOpenComprehensiveExport={onOpenFinancialExport}
        placeholder="بحث برقم الفاتورة، الموزع، الصنف، السيريال، المستلم، الملاحظات..."
      />

      {/* Invoices List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">سجل الفواتير والدفعات</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300">
              {filteredInvoices.length} فاتورة
            </span>
          </div>
          <span className="text-xs text-slate-400">
            صافي المبلغ: <strong className="text-indigo-400 font-mono">{(stats.netWholesaleAmount ?? 0).toLocaleString()} {currency}</strong>
          </span>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-slate-300">لا توجد فواتير مطابقة للفلاتر المحددة</p>
            <p className="text-xs text-slate-500 mt-1">
              انقر على "فاتورة مبيعات جديدة" لإصدار دفعة كروت
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="py-3 px-4 w-28">رقم الفاتورة</th>
                  <th className="py-3 px-4 w-24">النوع</th>
                  <th className="py-3 px-4 w-24">التاريخ</th>
                  <th className="py-3 px-4">نقطة البيع / الموزع</th>
                  <th className="py-3 px-4">الأصناف والفئات</th>
                  <th className="py-3 px-4 text-center">إجمالي الكروت</th>
                  <th className="py-3 px-4 text-center">المبلغ الإجمالي</th>
                  <th className="py-3 px-4 text-center">طريقة السداد</th>
                  <th className="py-3 px-4 text-center w-28 no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const isReturn = inv.type === 'return';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-400">
                          {inv.invoiceNumber}
                        </div>
                        <div className="mt-1">
                          <RecordAuditInfo
                            audit={inv}
                            entityName={`فاتورة ${inv.invoiceNumber}`}
                            compact={true}
                            showHistoryButton={true}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          isReturn
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {isReturn ? 'سند مرتجع' : 'مبيعات وتسليم'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {inv.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {inv.posPointName}
                        {inv.receivedBy && (
                          <span className="block text-[10px] text-slate-500 font-normal">
                            المستلم: {inv.receivedBy}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {inv.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                              <span className="font-bold text-slate-300 truncate max-w-[160px]">{item.categoryName}</span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                {item.quantity} كارت × {(item.unitWholesalePrice ?? 0).toLocaleString()} {currency}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-slate-200">
                        {inv.totalQuantity}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-sm">
                        <span className={isReturn ? 'text-rose-400' : 'text-indigo-300'}>
                          {isReturn ? '-' : ''}{(inv.totalWholesaleAmount ?? 0).toLocaleString()}{' '}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">{currency}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isReturn
                            ? 'bg-rose-500/10 text-rose-300'
                            : inv.paymentType === 'cash'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isReturn ? 'خصم مديونية' : inv.paymentType === 'cash' ? 'نقداً' : 'آجل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition cursor-pointer"
                            title="عرض وطباعة الفاتورة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            title="تعديل الفاتورة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          DELETE INVOICE CONFIRMATION MODAL (In-App Dialog)
          ======================================================== */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد حذف الفاتورة</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الفاتورة رقم{' '}
              <strong className="text-indigo-400 font-mono font-bold">{deletingInvoice.invoiceNumber}</strong> الخاصة بنقطة البيع{' '}
              <strong className="text-white font-bold">{deletingInvoice.posPointName}</strong>؟
              <br />
              <span className="text-amber-400 block mt-1">
                ⚠️ سيتم التراجع عن أثرها المالي والمخزني وإعادة ضبط الأرصدة تلقائياً.
              </span>
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MULTI-CATEGORY INVOICE CREATION / EDIT MODAL
          ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4">
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              createInvoiceType === 'return'
                ? 'bg-rose-950/50 border-rose-800/80'
                : 'bg-indigo-950/50 border-indigo-800/80'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold ${
                  createInvoiceType === 'return' ? 'bg-rose-600' : 'bg-indigo-600'
                }`}>
                  {editingInvoice ? <Edit2 className="w-5 h-5" /> : createInvoiceType === 'return' ? <RotateCcw className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingInvoice
                      ? `تعديل الفاتورة رقم ${editingInvoice.invoiceNumber}`
                      : createInvoiceType === 'return'
                      ? 'إنشاء فاتورة مرتجع كروت (إشعار دائن)'
                      : 'إنشاء فاتورة مبيعات وتسليم دفعة كروت جديدة (متعددة الفئات)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {createInvoiceType === 'return'
                      ? 'استرجاع كروت من نقطة البيع وإعادة إدراجها بالمخزن وخصم قيمتها من المديونية'
                      : 'إضافة أكثر من فئة كروت في نفس الفاتورة مع الترقيم والسعر'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-5 text-xs">
              {/* Header Details Grid */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Invoice Number (Sequential Auto-generated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-bold">
                      رقم الفاتورة *
                    </label>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-500/20">
                      <Sparkles className="w-2.5 h-2.5" />
                      تسلسلي تلقائي
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formInvoiceNumber}
                      onChange={(e) => setFormInvoiceNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs pl-8"
                      required
                    />
                    <button
                      type="button"
                      title="إعادة احتساب الرقم التسلسلي التالي"
                      onClick={() =>
                        setFormInvoiceNumber(
                          generateNextInvoiceNumber(invoices, createInvoiceType, formDate)
                        )
                      }
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 p-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Select POS */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">نقطة البيع / الموزع *</label>
                  <select
                    value={formPOSId}
                    onChange={(e) => handlePOSChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    required
                  >
                    {posPoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.managerName || 'مسؤول'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">تاريخ الفاتورة *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormDate(newDate);
                      // If invoice number is still default format, update sequence year
                      if (!editingInvoice) {
                        setFormInvoiceNumber(
                          generateNextInvoiceNumber(invoices, createInvoiceType, newDate)
                        );
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">طريقة السداد *</label>
                  <select
                    value={formPaymentType}
                    onChange={(e) => setFormPaymentType(e.target.value as 'credit' | 'cash')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="credit">⏳ آجل على الحساب (مديونية)</option>
                    <option value="cash">💵 نقداً فوري (سداد مباشر)</option>
                  </select>
                </div>

                {/* Receiver / Responsible */}
                <div>
                  <label className="block text-slate-400 font-bold mb-1">اسم المستلم / المسؤول</label>
                  <input
                    type="text"
                    value={formReceivedBy}
                    onChange={(e) => setFormReceivedBy(e.target.value)}
                    placeholder="اسم المسؤول في نقطة البيع"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items Repeater Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>أصناف وفئات الكروت المدرجة في الفاتورة ({formItems.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف آخر للفاتورة</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-48">فئة الكارت *</th>
                        <th className="py-2.5 px-3 w-28 text-center">الكمية (كارت) *</th>
                        <th className="py-2.5 px-3 w-28 text-center">سعر الجملة ({currency})</th>
                        <th className="py-2.5 px-3 w-32 text-center">الإجمالي ({currency})</th>
                        <th className="py-2.5 px-3 w-44">نطاق السيريال (اختياري)</th>
                        <th className="py-2.5 px-3 w-12 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {formItems.map((item, index) => {
                        const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitWholesalePrice) || 0);
                        return (
                          <tr key={index} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-bold">
                              {index + 1}
                            </td>
                            {/* Category Select */}
                            <td className="py-2.5 px-3">
                              <select
                                value={item.categoryId}
                                onChange={(e) => handleItemRowChange(index, 'categoryId', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} (المخزون: {c.warehouseStock})
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* Quantity */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemRowChange(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-indigo-500"
                                required
                              />
                            </td>
                            {/* Unit Wholesale Price */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitWholesalePrice}
                                onChange={(e) =>
                                  handleItemRowChange(index, 'unitWholesalePrice', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            {/* Calculated Total */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-300">
                              {(rowTotal ?? 0).toLocaleString()}
                            </td>
                            {/* Serials */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="من"
                                  value={item.serialStart}
                                  onChange={(e) => handleItemRowChange(index, 'serialStart', e.target.value)}
                                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white font-mono"
                                />
                                <input
                                  type="text"
                                  placeholder="إلى"
                                  value={item.serialEnd}
                                  onChange={(e) => handleItemRowChange(index, 'serialEnd', e.target.value)}
                                  className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white font-mono"
                                />
                              </div>
                            </td>
                            {/* Remove Row */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(index)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                                title="حذف هذا الصنف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Summary Calculations Bar */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500 text-[11px] block">إجمالي عدد الكروت</span>
                    <span className="text-lg font-black font-mono text-white">
                      {modalCalculations.totalQty} كارت
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">إجمالي قيمة الفاتورة (الجملة)</span>
                    <span className={`text-xl font-black font-mono ${createInvoiceType === 'return' ? 'text-rose-400' : 'text-indigo-400'}`}>
                      {(modalCalculations.totalWholesale ?? 0).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <div className="text-left text-slate-400 text-xs">
                  {createInvoiceType === 'sale' ? (
                    <span>سيتم خصم الكميات من المخزن {formPaymentType === 'credit' ? 'وإضافتها لمديونية الموزع' : 'واستلام قيمتها نقداً'}</span>
                  ) : (
                    <span>سيتم إعادة الكميات للمخزن وخصم القيمة من مديونية الموزع</span>
                  )}
                </div>
              </div>

              {/* Additional Notes & Reason for Return */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {createInvoiceType === 'return' && (
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">سبب المرتجع</label>
                    <input
                      type="text"
                      value={formReasonForReturn}
                      onChange={(e) => setFormReasonForReturn(e.target.value)}
                      placeholder="مثال: تبديل فئات، ركود بيع..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className={createInvoiceType === 'return' ? '' : 'sm:col-span-2'}>
                  <label className="block text-slate-400 font-bold mb-1">ملاحظات الفاتورة</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="أي شروط أو تفاصيل إضافية..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-bold transition shadow-lg cursor-pointer ${
                    createInvoiceType === 'return'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  }`}
                >
                  {editingInvoice ? 'حفظ التعديلات' : createInvoiceType === 'return' ? 'إصدار سند المرتجع' : 'إصدار فاتورة المبيعات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          INVOICES FULL REPORT MODAL
          ======================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none">
            {/* Header / Actions */}
            <div className="no-print p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">كشف الفواتير وسندات التسليم والمرتجع</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  disabled={isPrintingReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isPrintingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={handleExportReportPdf}
                  disabled={isExportingReportPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isExportingReportPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-indigo-400" />}
                  <span>تصدير PDF</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-4 sm:p-6 bg-slate-950 overflow-y-auto flex-1 print:p-0 print:bg-white print:overflow-visible">
              <div
                id="invoices-report-document"
                className="printable-document bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-6 print:rounded-none max-w-4xl mx-auto font-sans"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{settings.networkName}</h1>
                    <p className="text-xs text-slate-600 font-medium">{settings.networkSlogan}</p>
                    <p className="text-xs text-slate-500">هاتف الإدارة: {settings.supportPhone}</p>
                  </div>
                  <div className="text-left">
                    <div className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-black bg-indigo-700 text-white shadow-sm">
                      كشف حركات الفواتير
                    </div>
                    <div className="mt-1.5 text-xs text-slate-700 font-mono">
                      <div>تاريخ الاستخراج: <strong>{new Date().toISOString().split('T')[0]}</strong></div>
                      <div>عدد الفواتير: <strong>{filteredInvoices.length}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-right text-xs border border-slate-300 mb-6">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">رقم الفاتورة</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">نقطة البيع</th>
                      <th className="p-2 text-center">إجمالي الكروت</th>
                      <th className="p-2 text-center">طريقة السداد</th>
                      <th className="p-2 text-center">المبلغ الإجمالي ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredInvoices.map((inv, idx) => (
                      <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="p-2 font-bold">
                          <span className={inv.type === 'return' ? 'text-rose-700' : 'text-emerald-700'}>
                            {inv.type === 'return' ? 'مرتجع' : 'مبيعات'}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-slate-700">{inv.date}</td>
                        <td className="p-2 font-bold text-slate-800">{inv.posPointName}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">{inv.totalQuantity}</td>
                        <td className="p-2 text-center font-medium text-slate-700">
                          {inv.paymentType === 'cash' ? 'نقداً' : 'آجل'}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">
                          {inv.type === 'return' ? '-' : ''}{(inv.totalWholesaleAmount ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-slate-900 text-sm">
                        صافي الإجمالي (المبيعات - المرتجع):
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-sm text-slate-900">
                        {stats.netCardsQuantity} كارت
                      </td>
                      <td className="p-2.5 text-center"></td>
                      <td className="p-2.5 text-center font-mono font-black text-base text-indigo-800">
                        {(stats.netWholesaleAmount ?? 0).toLocaleString()} {currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures */}
                <div className="border-t border-slate-300 pt-6 mt-8 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">المحاسب المسؤول</span>
                    <div className="mt-8 border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                    <span className="text-[10px] text-slate-400 mt-1 block">التوقيع</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">اعتماد الإدارة العامة</span>
                    <div className="mt-8 border-b border-dashed border-slate-400 w-36 mx-auto"></div>
                    <span className="text-[10px] text-slate-400 mt-1 block">الختم والاعتماد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          INVOICE RECEIPT / PRINT MODAL
          ======================================================== */}
      {viewingInvoice && (
        <InvoiceReceiptModal
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
          posPoint={posPoints.find((p) => p.id === viewingInvoice.posPointId)}
          categories={categories}
          settings={settings}
        />
      )}
    </div>
  );
};
