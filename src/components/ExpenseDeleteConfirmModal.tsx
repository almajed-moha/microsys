import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Calendar,
  Receipt,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Building2,
  Tag,
  CreditCard,
} from 'lucide-react';
import {
  ExpenseRecord,
  InvoiceRecord,
  PaymentRecord,
  SalesRecord,
  CardCategory,
  POSPoint,
  NetworkSettings,
} from '../types';
import { calculateComprehensiveFinancials } from '../utils/financialCalculations';

interface ExpenseDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (expense: ExpenseRecord) => void;
  expense: ExpenseRecord | null;
  allExpenses?: ExpenseRecord[];
  invoices?: InvoiceRecord[];
  payments?: PaymentRecord[];
  sales?: SalesRecord[];
  categories?: CardCategory[];
  posPoints?: POSPoint[];
  settings?: NetworkSettings;
}

export const ExpenseDeleteConfirmModal: React.FC<ExpenseDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  expense,
  allExpenses = [],
  invoices = [],
  payments = [],
  sales = [],
  categories = [],
  posPoints = [],
  settings,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgeImpact, setAcknowledgeImpact] = useState(false);

  useEffect(() => {
    setTypedConfirmation('');
    setAcknowledgeImpact(false);
  }, [expense?.id, isOpen]);

  const currency = settings?.currencySymbol || 'ر.ي';
  const expenseAmount = expense?.amount ?? 0;
  const isHighValue = expenseAmount >= 20000;

  // Forensic calculation of financial impact across the system
  const financialForensics = useMemo(() => {
    if (!expense) {
      return {
        currentTotalExpenses: 0,
        newTotalExpenses: 0,
        expenseDifference: 0,
        currentNetProfit: 0,
        newNetProfit: 0,
        profitDifference: 0,
        currentCashFlow: 0,
        newCashFlow: 0,
        categoryTotalBefore: 0,
        categoryTotalAfter: 0,
      };
    }

    const currentFinancials = calculateComprehensiveFinancials({
      invoices,
      expenses: allExpenses,
      payments,
      sales,
      categories,
      posPoints,
      datePeriod: 'all',
    });

    const simulatedExpenses = allExpenses.filter((e) => e.id !== expense.id);
    const simulatedFinancials = calculateComprehensiveFinancials({
      invoices,
      expenses: simulatedExpenses,
      payments,
      sales,
      categories,
      posPoints,
      datePeriod: 'all',
    });

    const currentTotalExpenses = currentFinancials.totalExpenses;
    const newTotalExpenses = simulatedFinancials.totalExpenses;
    const expenseDifference = expenseAmount;

    const currentNetProfit = currentFinancials.netProfit;
    const newNetProfit = simulatedFinancials.netProfit;
    const profitDifference = newNetProfit - currentNetProfit;

    const currentCashFlow = currentFinancials.netCashFlow;
    const newCashFlow = simulatedFinancials.netCashFlow;

    const catId = expense.categoryId || 'other';
    const categoryExpenses = allExpenses.filter((e) => (e.categoryId || 'other') === catId);
    const categoryTotalBefore = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const categoryTotalAfter = Math.max(0, categoryTotalBefore - expenseAmount);

    return {
      currentTotalExpenses,
      newTotalExpenses,
      expenseDifference,
      currentNetProfit,
      newNetProfit,
      profitDifference,
      currentCashFlow,
      newCashFlow,
      categoryTotalBefore,
      categoryTotalAfter,
    };
  }, [expense, allExpenses, invoices, payments, sales, categories, posPoints, expenseAmount]);

  if (!isOpen || !expense) return null;

  const requiresVoucherTyping = isHighValue;
  const isVoucherMatched = typedConfirmation.trim().toLowerCase() === expense.voucherNumber.trim().toLowerCase();
  const canConfirm = acknowledgeImpact && (!requiresVoucherTyping || isVoucherMatched);

  const getMethodBadge = (method?: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'cheque':
        return 'شيك بنكي';
      case 'cash':
        return 'نقداً من الصندوق';
      default:
        return 'نقداً';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 p-5 border-b border-rose-500/30 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">تأكيد حذف سند الصرف والمصروفات</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  تأثير على الأرباح والخزينة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مراجعة الأثر المالي والتحاسبي لسند الصرف قبل الإزالة النهائية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Voucher Summary Card */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white font-mono">{expense.voucherNumber}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {getMethodBadge(expense.paymentMethod)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-rose-400 font-mono">
                  {expenseAmount.toLocaleString()}
                </span>
                <span className="text-xs text-rose-300/80 mr-1 font-bold">{currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">البند:</span>
                <span className="font-semibold text-white truncate">{expense.categoryName || 'عام'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">المستفيد:</span>
                <span className="font-semibold text-white truncate">{expense.paidTo || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">التاريخ:</span>
                <span className="font-mono text-slate-200">{expense.date}</span>
              </div>
              {expense.referenceNumber && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">المرجع:</span>
                  <span className="font-mono text-amber-400">{expense.referenceNumber}</span>
                </div>
              )}
            </div>

            {expense.title && (
              <p className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-bold block mb-0.5">البيان / الوصف:</span>
                {expense.title}
                {expense.notes && <span className="block text-slate-400 text-[11px] mt-1">ملاحظات: {expense.notes}</span>}
              </p>
            )}
          </div>

          {/* Forensic Balance Impact Card */}
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  الأثر المالي المباشر عند الحذف (التحليل المحاسبي)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-300/80 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                تعديل قيود المصروفات
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Total Operating Expenses Impact */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-1 font-bold">
                  إجمالي المصروفات التشغيلية
                </span>
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 line-through text-xs font-mono">
                    {financialForensics.currentTotalExpenses.toLocaleString()} {currency}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 rotate-90" />
                  <div className="text-emerald-400 font-bold text-xs font-mono">
                    {financialForensics.newTotalExpenses.toLocaleString()} {currency}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-1">
                  (انخفاض المصروفات بمقدار {expenseAmount.toLocaleString()} {currency})
                </div>
              </div>

              {/* Net Profit Impact */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                <span className="text-[11px] text-slate-400 block mb-1 font-bold">
                  صافي الربح التشغيلي المحتسب
                </span>
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-xs font-mono">
                    {financialForensics.currentNetProfit.toLocaleString()} {currency}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="text-emerald-400 font-bold text-xs font-mono">
                    {financialForensics.newNetProfit.toLocaleString()} {currency}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-1">
                  (زيادة صافي الربح بمقدار +{expenseAmount.toLocaleString()} {currency})
                </div>
              </div>

              {/* Net Cash Flow Impact */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-sky-400" />
                    صافي التدفق النقدي ورصيد الصندوق المحتسب
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    +{expenseAmount.toLocaleString()} {currency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  حذف هذا السند سيعيد احتساب المبلغ كسيولة غير مصروفة في تقارير الصندوق وقائمة الدخل، مما يزيد الفارق الإيجابي بين المقبوضات والمصروفات.
                </p>
              </div>
            </div>
          </div>

          {/* High-Value Security Typing */}
          {requiresVoucherTyping && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">
                  تأكيد أمان إضافي لسند ذي قيمة مالية عالية
                </span>
              </div>
              <p className="text-xs text-slate-300">
                لحماية البيانات المالية، يرجى كتابة رقم سند الصرف{' '}
                <strong className="text-amber-400 font-mono select-all font-bold">
                  {expense.voucherNumber}
                </strong>{' '}
                لتأكيد رغبتك بالحذف:
              </p>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={expense.voucherNumber}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white text-center tracking-wider focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Acknowledgement Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition">
            <input
              type="checkbox"
              checked={acknowledgeImpact}
              onChange={(e) => setAcknowledgeImpact(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300 leading-relaxed select-none">
              أقر بأنني راجعت الأثر المالي لحذف سند الصرف رقم{' '}
              <strong className="text-white font-mono">{expense.voucherNumber}</strong> بمبلغ{' '}
              <strong className="text-rose-400 font-mono">
                {expenseAmount.toLocaleString()} {currency}
              </strong>
              ، وأن الحذف سيُسجل في سجل تدقيق العمليات مع تحديث قائمة الدخل تلقائياً عبر جميع الأجهزة.
            </span>
          </label>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            إلغاء التراجع
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirmDelete(expense)}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
              canConfirm
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            تأكيد الحذف النهائي لسند الصرف
          </button>
        </div>
      </div>
    </div>
  );
};
