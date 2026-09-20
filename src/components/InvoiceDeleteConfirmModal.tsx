import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Store,
  User,
  Package,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  InvoiceRecord,
  POSPoint,
  Customer,
  CardCategory,
  PaymentRecord,
  SalesRecord,
  CardBatchDispatch,
  NetworkSettings,
} from '../types';
import { calculatePOSBalance } from '../utils/financialCalculations';

interface InvoiceDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (invoice: InvoiceRecord) => void;
  invoice: InvoiceRecord | null;
  posPoints: POSPoint[];
  customers: Customer[];
  categories: CardCategory[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  dispatches?: CardBatchDispatch[];
  allInvoices?: InvoiceRecord[];
  settings?: NetworkSettings;
}

export const InvoiceDeleteConfirmModal: React.FC<InvoiceDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  invoice,
  posPoints,
  customers,
  categories,
  sales = [],
  payments = [],
  dispatches = [],
  allInvoices = [],
  settings,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgeImpact, setAcknowledgeImpact] = useState(false);

  // Reset confirmation state when modal opens/changes invoice
  React.useEffect(() => {
    setTypedConfirmation('');
    setAcknowledgeImpact(false);
  }, [invoice?.id, isOpen]);

  if (!isOpen || !invoice) return null;

  const currency = settings?.currencySymbol || 'ر.ي';
  const isReturn = invoice.type === 'return';
  const totalAmount = invoice.totalWholesaleAmount ?? 0;
  const isCancelled = invoice.status === 'cancelled';

  // Find linked POS point or Customer
  const targetPOS = posPoints.find((p) => p.id === invoice.posPointId);
  const targetCustomer = customers.find((c) => c.id === invoice.customerId);

  const partyName = targetPOS
    ? targetPOS.name
    : targetCustomer
    ? targetCustomer.name
    : invoice.posPointName || 'مبيعات مباشرة / غير محدد';

  const partyType = targetPOS ? 'نقطة بيع' : targetCustomer ? 'عميل' : 'طرف التعامل';

  // Calculate BEFORE and AFTER balances for the affected party
  const balanceForensics = useMemo(() => {
    if (targetPOS) {
      // Current balance with existing invoices
      const currentPosCalc = calculatePOSBalance(
        targetPOS.id,
        sales,
        payments,
        dispatches,
        allInvoices
      );
      const currentDebt = currentPosCalc.currentDebt;

      // Simulated invoices excluding the deleting invoice
      const simulatedInvoices = allInvoices.filter((inv) => inv.id !== invoice.id);
      const simulatedPosCalc = calculatePOSBalance(
        targetPOS.id,
        sales,
        payments,
        dispatches,
        simulatedInvoices
      );
      const newDebt = simulatedPosCalc.currentDebt;
      const debtDifference = newDebt - currentDebt;

      return {
        type: 'pos' as const,
        currentDebt,
        newDebt,
        debtDifference,
        maxDebtLimit: targetPOS.maxDebtLimit || 0,
      };
    } else if (targetCustomer) {
      // Customer balance calculation: totalPurchases - totalReturns - totalPayments
      const custInvoices = allInvoices.filter((inv) => inv.customerId === targetCustomer.id);
      const custPayments = payments.filter((p) => p.customerId === targetCustomer.id);

      let currentPurchases = 0;
      let currentReturns = 0;
      custInvoices.forEach((inv) => {
        if (inv.type === 'sale') currentPurchases += inv.totalWholesaleAmount || 0;
        if (inv.type === 'return') currentReturns += inv.totalWholesaleAmount || 0;
      });
      const currentPayments = custPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const currentBalance = currentPurchases - currentReturns - currentPayments;

      // Simulated without this invoice
      const simCustInvoices = custInvoices.filter((inv) => inv.id !== invoice.id);
      let simPurchases = 0;
      let simReturns = 0;
      simCustInvoices.forEach((inv) => {
        if (inv.type === 'sale') simPurchases += inv.totalWholesaleAmount || 0;
        if (inv.type === 'return') simReturns += inv.totalWholesaleAmount || 0;
      });
      const newBalance = simPurchases - simReturns - currentPayments;
      const balanceDifference = newBalance - currentBalance;

      return {
        type: 'customer' as const,
        currentDebt: currentBalance,
        newDebt: newBalance,
        debtDifference: balanceDifference,
        maxDebtLimit: 0,
      };
    }

    return null;
  }, [targetPOS, targetCustomer, sales, payments, dispatches, allInvoices, invoice]);

  // Warehouse inventory restoration forensics
  const inventoryForensics = useMemo(() => {
    return (invoice.items || []).map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      const currentStock = category ? category.warehouseStock : 0;
      // If sale: deleting invoice returns cards back to warehouse (+quantity)
      // If return: deleting return invoice deducts cards from warehouse (-quantity)
      const quantityDelta = isReturn ? -item.quantity : item.quantity;
      const newStock = isCancelled ? currentStock : Math.max(0, currentStock + quantityDelta);

      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName || category?.name || 'فئة كروت',
        quantity: item.quantity,
        unitWholesalePrice: item.unitWholesalePrice,
        totalWholesalePrice: item.totalWholesalePrice,
        currentStock,
        newStock,
        quantityDelta,
      };
    });
  }, [invoice, categories, isReturn, isCancelled]);

  const requiredConfirmWord = invoice.invoiceNumber;
  const isConfirmInputValid =
    typedConfirmation.trim().toLowerCase() === requiredConfirmWord.trim().toLowerCase();
  const canSubmit = isConfirmInputValid && acknowledgeImpact;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-right">
        {/* Header with High-Visibility Danger Banner */}
        <div className="p-4 sm:p-5 border-b border-rose-500/30 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 text-rose-400">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  إجراء محاسبي لا يمكن التراجع عنه
                </span>
                {isReturn && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    مردودات مبيعات
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                تأكيد حذف الفاتورة رقم{' '}
                <span className="font-mono text-rose-300 underline underline-offset-4">
                  {invoice.invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                يرجى مراجعة الآثار المالية والمخزنية المترتبة على الحذف بعناية قبل المتابعة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Section 1: Detailed Invoice Summary Card */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/60 text-slate-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>ملخص بيانات الفاتورة المراد حذفها</span>
              </span>
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{invoice.date}</span>
                {invoice.time && <span>- {invoice.time}</span>}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Party Info */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40 col-span-2">
                <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                  {targetPOS ? <Store className="w-3 h-3 text-indigo-400" /> : <User className="w-3 h-3 text-indigo-400" />}
                  <span>{partyType}:</span>
                </span>
                <span className="text-sm font-bold text-white truncate block" title={partyName}>
                  {partyName}
                </span>
                {targetPOS?.managerName && (
                  <span className="text-[10px] text-slate-400 block">
                    المسؤول: {targetPOS.managerName}
                  </span>
                )}
              </div>

              {/* Movement Type & Payment */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block mb-0.5">نوع الحركة:</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    isReturn
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isReturn ? 'مرتجع كروت' : 'فاتورة مبيعات'}
                </span>
                <div className="text-[10px] text-slate-400 mt-1">
                  الدفع:{' '}
                  <span className="font-medium text-slate-300">
                    {invoice.paymentType === 'cash' ? 'نقدي' : 'آجل على الحساب'}
                  </span>
                </div>
              </div>

              {/* Wholesale Total */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block mb-0.5">قيمة الفاتورة (الجملة):</span>
                <div className="font-mono text-sm font-black text-amber-400">
                  {totalAmount.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  إجمالي {invoice.totalQuantity} كارت
                </span>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div className="mt-2 pt-2 border-t border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                الأصناف والفئات المضمنة ({invoice.items?.length || 0}):
              </span>
              <div className="overflow-x-auto max-h-36 overflow-y-auto pr-1">
                <table className="w-full text-right text-[11px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700/60">
                      <th className="py-1 px-1.5">الفئة</th>
                      <th className="py-1 px-1.5 text-center">الكمية</th>
                      <th className="py-1 px-1.5 text-center">سعر الجملة</th>
                      <th className="py-1 px-1.5 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-300">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-1 px-1.5 font-medium text-white">{item.categoryName}</td>
                        <td className="py-1 px-1.5 text-center font-mono font-bold text-indigo-300">
                          {item.quantity}
                        </td>
                        <td className="py-1 px-1.5 text-center font-mono text-slate-400">
                          {item.unitWholesalePrice.toLocaleString()}
                        </td>
                        <td className="py-1 px-1.5 text-left font-mono font-bold text-white">
                          {item.totalWholesalePrice.toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Impact on POS / Customer Balance (Crucial) */}
          <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 text-amber-300">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>الأثر المالي المباشر على رصيد {partyType}</span>
              </span>
              <span className="text-[11px] text-amber-400/90 font-mono">
                {partyName}
              </span>
            </div>

            {balanceForensics ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Current Balance */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">الرصيد/المديونية الحالية:</span>
                  <div className="font-mono text-base font-black text-slate-200">
                    {(balanceForensics.currentDebt ?? 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">قبل تنفيذ أمر الحذف</span>
                </div>

                {/* 2. Balance Change (Delta) */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">قيمة التعديل على الحساب:</span>
                  <div
                    className={`font-mono text-base font-black flex items-center gap-1 ${
                      balanceForensics.debtDifference < 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {balanceForensics.debtDifference < 0 ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                    <span>
                      {Math.abs(balanceForensics.debtDifference).toLocaleString()}{' '}
                      <span className="text-xs font-sans">{currency}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {isReturn
                      ? 'زيادة في مديونية الحساب (إلغاء خصم المرتجع)'
                      : 'خصم من مديونية الحساب (إلغاء قيمة المبيعات)'}
                  </span>
                </div>

                {/* 3. New Balance After Delete */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 bg-amber-500/5">
                  <span className="text-amber-300 text-[11px] font-bold block mb-1">
                    الرصيد/المديونية بعد الحذف:
                  </span>
                  <div className="font-mono text-base font-black text-amber-400">
                    {(balanceForensics.newDebt ?? 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 block mt-1">
                    سيصبح هذا الرصيد المعتمد فوراً
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/80 rounded-lg text-slate-400 text-xs">
                الفاتورة مسجلة كمبيعات مباشرة، لن يتم تغيير رصيد أي نقطة بيع أو عميل محدد.
              </div>
            )}

            {/* Debt Limit Warning if target is POS */}
            {balanceForensics?.type === 'pos' && balanceForensics.maxDebtLimit > 0 && (
              <div className="text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-lg flex items-center justify-between">
                <span>سقف الدين المسموح لنقطة البيع:</span>
                <span className="font-mono font-bold text-white">
                  {balanceForensics.maxDebtLimit.toLocaleString()} {currency}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Inventory Impact on Warehouse Stock */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>أثر الحذف على مخزون كروت المستودع</span>
              </span>
              <span className="text-[11px] text-emerald-400">
                {isCancelled
                  ? 'الفاتورة ملغاة سابقاً (لن يتم تغيير المخزون)'
                  : isReturn
                  ? 'سيتم خصم كمية المرتجع من المستودع'
                  : 'سيتم استرجاع الكروت إلى مخزون المستودع'}
              </span>
            </div>

            <div className="space-y-1.5">
              {inventoryForensics.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg text-xs"
                >
                  <span className="font-medium text-white">{item.categoryName}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 text-[11px]">
                      المخزون الحالي: <strong className="text-slate-200">{item.currentStock}</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        item.quantityDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.quantityDelta >= 0 ? `+${item.quantityDelta}` : item.quantityDelta} كارت
                    </span>
                    <span className="text-indigo-300 font-bold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                      الجديد: {item.newStock} كارت
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Safety Checkbox and Typing Confirmation */}
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <input
                id="ack-invoice-delete-impact"
                type="checkbox"
                checked={acknowledgeImpact}
                onChange={(e) => setAcknowledgeImpact(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500 cursor-pointer"
              />
              <label
                htmlFor="ack-invoice-delete-impact"
                className="text-xs text-rose-200 font-medium cursor-pointer leading-relaxed"
              >
                أقر بأنني راجعت الأثر المالي على رصيد ({partyName}) والتعديل على مخزون المستودع،
                وأتحمل مسؤولية حذف هذه الفاتورة المالية نهائياً.
              </label>
            </div>

            <div className="pt-2 border-t border-rose-500/20">
              <label
                htmlFor="input-confirm-invoice-number"
                className="block text-[11px] text-slate-300 font-semibold mb-1"
              >
                للتأكيد الحتمي، يرجى كتابة رقم الفاتورة بالضبط{' '}
                <span className="font-mono font-bold text-rose-300 select-all bg-black/40 px-1.5 py-0.5 rounded">
                  {requiredConfirmWord}
                </span>{' '}
                في الحقل أدناه:
              </label>
              <input
                id="input-confirm-invoice-number"
                type="text"
                dir="ltr"
                placeholder={requiredConfirmWord}
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                className={`w-full bg-slate-900 border px-3.5 py-2 rounded-xl text-center font-mono text-sm tracking-wider outline-hidden transition ${
                  isConfirmInputValid
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-slate-700 text-white focus:border-rose-500'
                }`}
              />
              {typedConfirmation && !isConfirmInputValid && (
                <p className="text-[10px] text-rose-400 mt-1">
                  رقم الفاتورة المدخل غير متطابق.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            تراجع وإلغاء
          </button>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirmDelete(invoice)}
            className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
              canSubmit
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>تأكيد الحذف النهائي وتحديث الأرصدة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
