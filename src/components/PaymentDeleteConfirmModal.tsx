import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Store,
  User,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  PaymentRecord,
  POSPoint,
  Customer,
  InvoiceRecord,
  SalesRecord,
  CardBatchDispatch,
  NetworkSettings,
} from '../types';
import { calculatePOSBalance } from '../utils/financialCalculations';

interface PaymentDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (payment: PaymentRecord) => void;
  payment: PaymentRecord | null;
  posPoints: POSPoint[];
  customers?: Customer[];
  allPayments?: PaymentRecord[];
  sales?: SalesRecord[];
  invoices?: InvoiceRecord[];
  dispatches?: CardBatchDispatch[];
  settings?: NetworkSettings;
}

export const PaymentDeleteConfirmModal: React.FC<PaymentDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  payment,
  posPoints,
  customers = [],
  allPayments = [],
  sales = [],
  invoices = [],
  dispatches = [],
  settings,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgeImpact, setAcknowledgeImpact] = useState(false);

  React.useEffect(() => {
    setTypedConfirmation('');
    setAcknowledgeImpact(false);
  }, [payment?.id, isOpen]);

  if (!isOpen || !payment) return null;

  const currency = settings?.currencySymbol || 'ر.ي';
  const paymentAmount = payment.amount ?? 0;

  // Linked POS point or Customer
  const targetPOS = posPoints.find((p) => p.id === payment.posPointId);
  const targetCustomer = customers.find((c) => c.id === payment.customerId);

  const partyName = targetPOS
    ? targetPOS.name
    : targetCustomer
    ? targetCustomer.name
    : payment.posPointId || 'غير محدد';

  const partyType = targetPOS ? 'نقطة بيع' : targetCustomer ? 'عميل' : 'جهة السداد';

  // Calculate balance impact
  const balanceForensics = useMemo(() => {
    if (targetPOS) {
      const currentCalc = calculatePOSBalance(
        targetPOS.id,
        sales,
        allPayments,
        dispatches,
        invoices
      );
      const currentDebt = currentCalc.currentDebt;

      // Simulated balance without this payment
      const simulatedPayments = allPayments.filter((p) => p.id !== payment.id);
      const simulatedCalc = calculatePOSBalance(
        targetPOS.id,
        sales,
        simulatedPayments,
        dispatches,
        invoices
      );
      const newDebt = simulatedCalc.currentDebt;
      const debtDifference = newDebt - currentDebt;

      return {
        hasTarget: true,
        partyType: 'نقطة بيع',
        currentDebt,
        newDebt,
        debtDifference,
        isDebtIncreasing: debtDifference > 0,
      };
    }

    if (targetCustomer) {
      const custInvoices = invoices.filter((i) => i.customerId === targetCustomer.id);
      const custPayments = allPayments.filter((p) => p.customerId === targetCustomer.id);

      const totalPurchases = custInvoices.reduce((acc, inv) => {
        if (inv.type === 'sale') return acc + (inv.totalWholesaleAmount || 0);
        if (inv.type === 'return') return acc - (inv.totalWholesaleAmount || 0);
        return acc;
      }, 0);

      const currentTotalPaid = custPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const currentBalance = totalPurchases - currentTotalPaid;

      const newTotalPaid = currentTotalPaid - paymentAmount;
      const newBalance = totalPurchases - newTotalPaid;
      const balanceDiff = newBalance - currentBalance;

      return {
        hasTarget: true,
        partyType: 'عميل',
        currentDebt: currentBalance,
        newDebt: newBalance,
        debtDifference: balanceDiff,
        isDebtIncreasing: balanceDiff > 0,
      };
    }

    return {
      hasTarget: false,
      partyType: 'عام',
      currentDebt: 0,
      newDebt: 0,
      debtDifference: paymentAmount,
      isDebtIncreasing: true,
    };
  }, [targetPOS, targetCustomer, sales, allPayments, dispatches, invoices, payment, paymentAmount]);

  const requiredWord = 'حذف';
  const isHighValue = paymentAmount >= 50000;
  const canConfirm = (!isHighValue || typedConfirmation.trim() === requiredWord) && acknowledgeImpact;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-rose-950/40 border-b border-rose-900/40 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>تأكيد الحذف النهائي لسند القبض</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {payment.referenceNumber || payment.id.slice(-6)}
                </span>
              </h3>
              <p className="text-xs text-rose-300/80 mt-0.5">
                مراجعة الأثر المالي على رصيد ومديونية {partyType} قبل التنفيذ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Summary Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700/60">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                {targetPOS ? <Store className="w-3.5 h-3.5 text-indigo-400" /> : <User className="w-3.5 h-3.5 text-sky-400" />}
                <span>{partyType}: <strong className="text-white">{partyName}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{payment.date || 'تاريخ غير مسجل'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">مبلغ السند المحذوف</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {paymentAmount.toLocaleString()} {currency}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">طريقة الدفع</span>
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {payment.paymentMethod === 'bank_transfer'
                      ? 'تحويل بنكي'
                      : payment.paymentMethod === 'exchange'
                      ? 'حوالة صرافة'
                      : payment.paymentMethod === 'card'
                      ? 'بطاقة دفع'
                      : 'نقداً (كاش)'}
                  </span>
                </span>
              </div>
            </div>

            {payment.notes && (
              <div className="text-xs bg-slate-900/60 rounded-lg p-2.5 text-slate-300 border border-slate-700/50">
                <span className="text-slate-400 font-medium">ملاحظات السند: </span>
                <span>{payment.notes}</span>
              </div>
            )}
          </div>

          {/* Financial Impact Forensics */}
          {balanceForensics.hasTarget && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>الأثر المالي المتوقع على مديونية {partyName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block mb-1">الرصيد/المديونية الحالية</span>
                  <span className="text-sm font-bold text-slate-200 font-mono">
                    {balanceForensics.currentDebt.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="bg-slate-900/70 p-3 rounded-lg border border-rose-500/40">
                  <span className="text-[11px] text-rose-300 block mb-1">الرصيد بعد الحذف</span>
                  <span className="text-sm font-bold text-rose-400 font-mono flex items-center gap-1">
                    <span>{balanceForensics.newDebt.toLocaleString()} {currency}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  </span>
                </div>
              </div>

              <div className="text-xs text-amber-300/90 leading-relaxed bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  بحذف هذا السند، سيتم إرجاع مبلغ <strong className="text-white font-mono">{paymentAmount.toLocaleString()} {currency}</strong> إلى مديونية {partyType} ليُطالب به مجدداً، وسيتم نشر التعديل لجميع الأجهزة تلقائياً.
                </span>
              </div>
            </div>
          )}

          {/* Acknowledge Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer hover:bg-slate-800/70 transition">
            <input
              type="checkbox"
              checked={acknowledgeImpact}
              onChange={(e) => setAcknowledgeImpact(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-600 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300 leading-relaxed select-none">
              أدرك تماماً أن حذف هذا السند سيؤدي إلى إلغاء السداد وإعادة رفع المديونية في حساب {partyName} ومزامنتها سحابياً.
            </span>
          </label>

          {/* Type Confirmation for High Value */}
          {isHighValue && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                هذا السند ذو قيمة مالية مرتفعة، يرجى كتابة كلمة <strong className="text-rose-400">"{requiredWord}"</strong> للمتابعة:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={`اكتب كلمة ${requiredWord} هنا...`}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            إلغاء التراجع
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirmDelete(payment)}
            className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
              canConfirm
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>تأكيد الحذف المالي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
