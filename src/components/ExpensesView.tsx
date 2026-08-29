import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingDown,
  Tag,
  Printer,
  Trash2,
  Edit2,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  X,
  CreditCard,
  Building,
  User,
  Zap,
  Wifi,
  Radio,
  Wrench,
  Users,
  FileDown,
  Loader2,
  FileText,
  Calculator
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, NetworkSettings } from '../types';
import { exportToCSV, downloadFile } from '../utils/storage';
import { ExpenseReceiptModal } from './ExpenseReceiptModal';
import {
  printElementDocument,
  exportElementToPdf
} from '../utils/pdfExport';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  settings: NetworkSettings;
  onAddExpense: (expense: Omit<ExpenseRecord, 'id' | 'voucherNumber' | 'timestamp'>) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  onUpdateCategory: (category: ExpenseCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onOpenIncomeStatement?: () => void;
  canViewIncomeStatement?: boolean;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses = [],
  categories = [],
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onOpenIncomeStatement,
  canViewIncomeStatement = true,
}) => {
  const currency = settings?.currencySymbol || 'ر.ي';

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseRecord | null>(null);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // In-App Deletion Confirmations (Reliable in Iframes)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  // Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isExportingReportPdf, setIsExportingReportPdf] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState<{
    categoryId: string;
    title: string;
    amount: number | '';
    paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
    paidTo: string;
    date: string;
    referenceNumber: string;
    notes: string;
    createdByName: string;
  }>({
    categoryId: categories[0]?.id || '',
    title: '',
    amount: '',
    paymentMethod: 'cash',
    paidTo: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
    createdByName: 'الإدارة المالية',
  });

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatTheme, setNewCatTheme] = useState('blue');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return expenses.filter((e) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = e.title?.toLowerCase().includes(term);
        const matchesVoucher = e.voucherNumber?.toLowerCase().includes(term);
        const matchesPaidTo = e.paidTo?.toLowerCase().includes(term);
        const matchesCat = e.categoryName?.toLowerCase().includes(term);
        const matchesRef = e.referenceNumber?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesVoucher && !matchesPaidTo && !matchesCat && !matchesRef) {
          return false;
        }
      }

      // Category
      if (selectedCategoryFilter !== 'all' && e.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Payment method
      if (selectedMethodFilter !== 'all' && e.paymentMethod !== selectedMethodFilter) {
        return false;
      }

      // Date Range
      if (dateRange === 'today') {
        return e.date === todayStr;
      } else if (dateRange === '7days') {
        const d = new Date(e.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      } else if (dateRange === 'month') {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (dateRange === 'custom') {
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
      }

      return true;
    }).sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date));
  }, [expenses, searchTerm, selectedCategoryFilter, selectedMethodFilter, dateRange, startDate, endDate]);

  // Financial Stats
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    const totalFiltered = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalAll = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const todayTotal = expenses
      .filter((e) => e.date === todayStr)
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const monthTotal = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // Group by category to find top expense
    const catMap: Record<string, { name: string; total: number }> = {};
    expenses.forEach((e) => {
      const name = e.categoryName || 'أخرى';
      if (!catMap[name]) catMap[name] = { name, total: 0 };
      catMap[name].total += e.amount || 0;
    });

    const topCategory = Object.values(catMap).sort((a, b) => b.total - a.total)[0] || {
      name: 'لا يوجد',
      total: 0,
    };

    return {
      totalFiltered,
      totalAll,
      todayTotal,
      monthTotal,
      topCategory,
      count: filteredExpenses.length,
    };
  }, [expenses, filteredExpenses]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormData({
      categoryId: categories[0]?.id || '',
      title: '',
      amount: '',
      paymentMethod: 'cash',
      paidTo: '',
      date: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: '',
      createdByName: 'الإدارة المالية',
    });
    setIsAddExpenseOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setFormData({
      categoryId: exp.categoryId,
      title: exp.title,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      paidTo: exp.paidTo || '',
      date: exp.date,
      referenceNumber: exp.referenceNumber || '',
      notes: exp.notes || '',
      createdByName: exp.createdByName || 'الإدارة المالية',
    });
    setIsAddExpenseOpen(true);
  };

  // Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      alert('يرجى اختيار تصنيف المصروف');
      return;
    }

    if (!formData.title.trim()) {
      alert('يرجى إدخال بيان ووصف المصروف');
      return;
    }

    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح للمصروف');
      return;
    }

    const selectedCat = categories.find((c) => c.id === formData.categoryId);
    const categoryName = selectedCat ? selectedCat.name : 'مصروفات عامة';

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        categoryId: formData.categoryId,
        categoryName,
        title: formData.title.trim(),
        amount: amt,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo.trim() || undefined,
        date: formData.date,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        createdByName: formData.createdByName.trim() || undefined,
      });
      showFeedback(`تم تحديث سند الصرف رقم ${editingExpense.voucherNumber} بنجاح ✅`);
    } else {
      onAddExpense({
        categoryId: formData.categoryId,
        categoryName,
        title: formData.title.trim(),
        amount: amt,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo.trim() || undefined,
        date: formData.date,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        createdByName: formData.createdByName.trim() || undefined,
      });
      showFeedback('تم تسجيل سند الصرف الجديد بنجاح ✅');
    }

    setIsAddExpenseOpen(false);
  };

  // Confirm Delete Expense Handler (Safe in iframe)
  const handleConfirmDeleteExpense = () => {
    if (!deletingExpense) return;
    const vNum = deletingExpense.voucherNumber;
    onDeleteExpense(deletingExpense.id);
    setDeletingExpense(null);
    showFeedback(`تم حذف سند الصرف رقم ${vNum} بنجاح ✅`);
  };

  // Confirm Delete Category Handler
  const handleConfirmDeleteCategory = () => {
    if (!deletingCategory) return;
    const cName = deletingCategory.name;
    onDeleteCategory(deletingCategory.id);
    setDeletingCategory(null);
    showFeedback(`تم حذف تصنيف "${cName}" بنجاح ✅`);
  };

  // Category Submit
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      setEditingCategory(null);
      showFeedback(`تم تعديل التصنيف "${newCatName.trim()}" بنجاح ✅`);
    } else {
      onAddCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        icon: 'Receipt',
        colorTheme: newCatTheme,
      });
      showFeedback(`تمت إضافة التصنيف "${newCatName.trim()}" بنجاح ✅`);
    }

    setNewCatName('');
    setNewCatDesc('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = filteredExpenses.map((exp) => ({
      'رقم السند': exp.voucherNumber,
      'التاريخ': exp.date,
      'نوع المصروف': exp.categoryName,
      'البيان': exp.title,
      'المبلغ': exp.amount,
      'العملة': currency,
      'طريقة الدفع': exp.paymentMethod === 'cash' ? 'نقداً' : exp.paymentMethod === 'bank_transfer' ? 'حوالة بنكية' : 'شيك',
      'المدفوع له': exp.paidTo || '',
      'رقم المرجع': exp.referenceNumber || '',
      'المحاسب': exp.createdByName || '',
      'ملاحظات': exp.notes || '',
    }));

    exportToCSV(dataToExport, `سجل_المصروفات_${new Date().toISOString().split('T')[0]}`);
    showFeedback('تم تصدير ملف المصروفات Excel بنجاح ✅');
  };

  // Print Expenses Report
  const handlePrintReport = async () => {
    setIsPrintingReport(true);
    try {
      await printElementDocument('expenses-report-document', {
        filename: `تقرير_المصروفات_${new Date().toISOString().split('T')[0]}.pdf`,
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
      const ok = await exportElementToPdf('expenses-report-document', {
        filename: `تقرير_المصروفات_${new Date().toISOString().split('T')[0]}.pdf`,
        title: `تقرير المصروفات - ${settings.networkName}`,
        format: 'a4',
        orientation: 'landscape',
        scale: 2.5,
        margin: 6,
      });
      if (ok) {
        showFeedback('تم تحميل تقرير المصروفات PDF بنجاح ✅');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingReportPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                إدارة المصروفات والنفقات التشغيلية
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                توثيق فواتير الإنترنت، الإيجارات، المحروقات، الصيانة، وحساب صافي الأرباح.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {canViewIncomeStatement && onOpenIncomeStatement && (
            <button
              onClick={onOpenIncomeStatement}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>قائمة الدخل والأرباح (P&L)</span>
            </button>
          )}

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>

          <button
            onClick={() => setIsCategoryManageOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>تصنيفات المصروفات</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/25 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>تسجيل سند صرف جديد</span>
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

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses Filtered */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">إجمالي المصروفات (المحددة)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {stats.totalFiltered.toLocaleString()}{' '}
            <span className="text-xs text-amber-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.count} سند صرف مسجل
          </div>
        </div>

        {/* Month Expenses */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">مصروفات هذا الشهر</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-400">
            {stats.monthTotal.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            الشهر الميلادي الحالي
          </div>
        </div>

        {/* Today Expenses */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">مصروفات اليوم</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {stats.todayTotal.toLocaleString()}{' '}
            <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            حركة الصرف لليوم
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">أعلى بند استهلاكاً</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white truncate" title={stats.topCategory.name}>
            {stats.topCategory.name}
          </div>
          <div className="text-xs font-mono font-bold text-rose-400 mt-1">
            {stats.topCategory.total.toLocaleString()} {currency}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم السند، البيان، المستفيد..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">📁 جميع تصنيفات المصروفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={selectedMethodFilter}
              onChange={(e) => setSelectedMethodFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">💳 جميع طرق الدفع</option>
              <option value="cash">💵 نقداً (الصندوق)</option>
              <option value="bank_transfer">🏦 حوالة / تحويل بنكي</option>
              <option value="cheque">📜 شيك</option>
              <option value="other">📌 أخرى</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setDateRange('all')}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition text-[11px] cursor-pointer ${
                dateRange === 'all' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setDateRange('today')}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition text-[11px] cursor-pointer ${
                dateRange === 'today' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition text-[11px] cursor-pointer ${
                dateRange === 'month' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition text-[11px] cursor-pointer ${
                dateRange === 'custom' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              مخصص
            </button>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {dateRange === 'custom' && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-3 text-xs">
            <span className="text-slate-400">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
            />
            <span className="text-slate-400">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">سجل سندات المصروفات</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300">
              {filteredExpenses.length} سند
            </span>
          </div>
          <span className="text-xs text-slate-400">
            الإجمالي: <strong className="text-amber-400 font-mono">{stats.totalFiltered.toLocaleString()} {currency}</strong>
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-slate-300">لا توجد سندات صرف مطابقة للفلاتر الحالية</p>
            <p className="text-xs text-slate-500 mt-1">
              انقر على "تسجيل سند صرف جديد" لإضافة مصاريف الشبكة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="py-3 px-4 w-28">رقم السند</th>
                  <th className="py-3 px-4 w-28">التاريخ</th>
                  <th className="py-3 px-4">نوع المصروف</th>
                  <th className="py-3 px-4">البيان والوصف</th>
                  <th className="py-3 px-4 text-center">المدفوع له</th>
                  <th className="py-3 px-4 text-center">طريقة الدفع</th>
                  <th className="py-3 px-4 text-center">المبلغ</th>
                  <th className="py-3 px-4 text-center w-28 no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {exp.voucherNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {exp.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                      {exp.title}
                      {exp.notes && (
                        <span className="block text-[10px] text-slate-500 font-normal truncate">
                          {exp.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {exp.paidTo || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        exp.paymentMethod === 'cash'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : exp.paymentMethod === 'bank_transfer'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {exp.paymentMethod === 'cash'
                          ? 'نقداً'
                          : exp.paymentMethod === 'bank_transfer'
                          ? 'تحويل بنكي'
                          : 'شيك'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-sm text-amber-400">
                      {exp.amount.toLocaleString()}{' '}
                      <span className="text-[10px] text-slate-500 font-sans">{currency}</span>
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingExpense(exp)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition cursor-pointer"
                          title="عرض وطباعة السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="تعديل السند"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="حذف السند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          DELETE EXPENSE CONFIRMATION MODAL (In-App Dialog)
          ======================================================== */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد حذف سند الصرف</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف سند الصرف رقم{' '}
              <strong className="text-amber-400 font-mono font-bold">{deletingExpense.voucherNumber}</strong> بمبلغ{' '}
              <strong className="text-white font-mono font-bold">{deletingExpense.amount.toLocaleString()} {currency}</strong>؟
              <br />
              <span className="text-slate-400 block mt-1">
                البيان: {deletingExpense.title} ({deletingExpense.categoryName})
              </span>
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE CATEGORY CONFIRMATION MODAL
          ======================================================== */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد حذف التصنيف</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف تصنيف المصروفات "{deletingCategory.name}"؟
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE / EDIT EXPENSE MODAL
          ======================================================== */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {editingExpense ? `تعديل سند الصرف (${editingExpense.voucherNumber})` : 'تسجيل سند صرف مصروفات جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">نوع وبند المصروف *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.description ? `(${c.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">البيان والوصف التفصيلي *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: فاتورة خط إنترنت رئيسي - شهر مايو"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">المبلغ المصروف ({currency}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">تاريخ الصرف *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Payment Method & Paid To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">طريقة الدفع *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="cash">💵 نقداً من الصندوق</option>
                    <option value="bank_transfer">🏦 حوالة / تحويل بنكي</option>
                    <option value="cheque">📜 شيك بنكي</option>
                    <option value="other">📌 أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">صُرف إلى السيد / الجهة</label>
                  <input
                    type="text"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    placeholder="اسم المستلم أو الشركة..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ref Number & Created By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">رقم المرجع / الحوالة / السند اليدوي</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="مثال: TRX-10292"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">المحاسب / المسؤول</label>
                  <input
                    type="text"
                    value={formData.createdByName}
                    onChange={(e) => setFormData({ ...formData, createdByName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي تفاصيل أو شروط خاصة بالسند..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  {editingExpense ? 'حفظ التعديلات' : 'حفظ وإصدار السند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MANAGE EXPENSE CATEGORIES MODAL
          ======================================================== */}
      {isCategoryManageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">إدارة تصنيفات المصروفات</h3>
              </div>
              <button
                onClick={() => {
                  setIsCategoryManageOpen(false);
                  setEditingCategory(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Add / Edit Category Form */}
              <form onSubmit={handleCategorySubmit} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>{editingCategory ? `تعديل تصنيف "${editingCategory.name}"` : 'إضافة تصنيف مصروفات جديد'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">اسم التصنيف *</label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="مثال: تسويق وإعلانات"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">وصف مختصر</label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="وصف البند..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCatName('');
                        setNewCatDesc('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-sm cursor-pointer"
                  >
                    {editingCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}
                  </button>
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 text-xs">التصنيفات الحالية ({categories.length})</h4>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  {categories.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-900/50 transition">
                      <div>
                        <span className="font-bold text-white block">{c.name}</span>
                        {c.description && (
                          <span className="text-[11px] text-slate-500 block">{c.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(c);
                            setNewCatName(c.name);
                            setNewCatDesc(c.description || '');
                          }}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="تعديل الاسم والوصف"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(c)}
                          className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                          title="حذف التصنيف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EXPENSES FULL REPORT MODAL
          ======================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none">
            {/* Header / Actions */}
            <div className="no-print p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">تقرير المصروفات والنفقات التشغيلية</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  disabled={isPrintingReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isPrintingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={handleExportReportPdf}
                  disabled={isExportingReportPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isExportingReportPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-amber-400" />}
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
                id="expenses-report-document"
                className="printable-document bg-white text-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-6 print:rounded-none max-w-4xl mx-auto font-sans"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{settings.networkName}</h1>
                    <p className="text-xs text-slate-600 font-medium">{settings.networkSlogan}</p>
                    <p className="text-xs text-slate-500">هاتف الدعم: {settings.supportPhone}</p>
                  </div>
                  <div className="text-left">
                    <div className="inline-block px-3.5 py-1.5 rounded-lg text-sm font-black bg-amber-700 text-white shadow-sm">
                      تقرير المصروفات والنفقات
                    </div>
                    <div className="mt-1.5 text-xs text-slate-700 font-mono">
                      <div>تاريخ الاستخراج: <strong>{new Date().toISOString().split('T')[0]}</strong></div>
                      <div>عدد السندات: <strong>{filteredExpenses.length}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-right text-xs border border-slate-300 mb-6">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">رقم السند</th>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">نوع المصروف</th>
                      <th className="p-2">البيان والوصف</th>
                      <th className="p-2 text-center">طريقة الدفع</th>
                      <th className="p-2 text-center">المدفوع له</th>
                      <th className="p-2 text-center">المبلغ ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredExpenses.map((e, idx) => (
                      <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{e.voucherNumber}</td>
                        <td className="p-2 font-mono text-slate-700">{e.date}</td>
                        <td className="p-2 font-bold text-slate-800">{e.categoryName}</td>
                        <td className="p-2 text-slate-800">{e.title}</td>
                        <td className="p-2 text-center font-medium text-slate-700">
                          {e.paymentMethod === 'cash' ? 'نقداً' : e.paymentMethod === 'bank_transfer' ? 'حوالة' : 'شيك'}
                        </td>
                        <td className="p-2 text-center text-slate-700">{e.paidTo || '—'}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">
                          {e.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={7} className="p-2.5 text-slate-900 text-sm">
                        إجمالي المصروفات والنفقات:
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-base text-amber-800">
                        {stats.totalFiltered.toLocaleString()} {currency}
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
          EXPENSE RECEIPT / VOUCHER MODAL
          ======================================================== */}
      {viewingExpense && (
        <ExpenseReceiptModal
          isOpen={Boolean(viewingExpense)}
          onClose={() => setViewingExpense(null)}
          expense={viewingExpense}
          category={categories.find((c) => c.id === viewingExpense.categoryId)}
          settings={settings}
        />
      )}
    </div>
  );
};
