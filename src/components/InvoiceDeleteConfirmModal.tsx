import React, { useState, useMemo, useEffect } from 'react';
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
  XCircle,
  FileCheck,
  Check,
  Copy,
  Sparkles,
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
  onConfirmCancel?: (invoice: InvoiceRecord, reason?: string) => void;
  onConfirmRestore?: (invoice: InvoiceRecord) => void;
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
  onConfirmCancel,
  onConfirmRestore,
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
  // Modes: 'cancel' (Recommended Accounting Void) | 'delete' (Permanent Removal)
  const [activeActionTab, setActiveActionTab] = useState<'cancel' | 'delete'>('cancel');
  const [cancelReason, setCancelReason] = useState('');
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgeImpact, setAcknowledgeImpact] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isCancelled = invoice?.status === 'cancelled';

  // Set default active tab based on status
  useEffect(() => {
    if (isCancelled) {
      setActiveActionTab('delete');
    } else {
      setActiveActionTab('cancel');
    }
    setTypedConfirmation('');
    setCancelReason('');
    setAcknowledgeImpact(false);
    setIsCopied(false);
  }, [invoice?.id, isOpen, isCancelled]);

  const currency = settings?.currencySymbol || 'ر.ي';
  const isReturn = invoice?.type === 'return';
  const totalAmount = invoice?.totalWholesaleAmount ?? 0;

  // Find linked POS point or Customer
  const targetPOS = useMemo(() => {
    if (!invoice) return undefined;
    return posPoints.find((p) => p.id === invoice.posPointId);
  }, [posPoints, invoice]);

  const targetCustomer = useMemo(() => {
    if (!invoice) return undefined;
    return customers.find((c) => c.id === invoice.customerId);
  }, [customers, invoice]);

  const partyName = targetPOS
    ? targetPOS.name
    : targetCustomer
    ? targetCustomer.name
    : invoice?.posPointName || 'مبيعات مباشرة / غير محدد';

  const partyType = targetPOS ? 'نقطة بيع' : targetCustomer ? 'عميل' : 'طرف التعامل';

  // Calculate BEFORE and AFTER balances for the affected party
  const balanceForensics = useMemo(() => {
    if (!invoice) return null;

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

      // Simulated invoices excluding or cancelling this invoice
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
      // Customer balance calculation
      const custInvoices = allInvoices.filter(
        (inv) => inv.customerId === targetCustomer.id && inv.status !== 'cancelled'
      );
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
    if (!invoice) return [];
    return (invoice.items || []).map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      const currentStock = category ? category.warehouseStock : 0;
      // If sale: cancelling/deleting invoice returns cards back to warehouse (+quantity)
      // If return: cancelling/deleting return invoice deducts cards from warehouse (-quantity)
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

  if (!isOpen || !invoice) return null;

  const requiredConfirmWord = invoice.invoiceNumber;
  const isConfirmInputValid =
    typedConfirmation.trim().toLowerCase() === requiredConfirmWord.trim().toLowerCase();
  
  // Either user acknowledged the checkbox OR typed the invoice number
  const canSubmitDelete = acknowledgeImpact || isConfirmInputValid;

  const handleCopyInvoiceNumber = () => {
    setTypedConfirmation(requiredConfirmWord);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const quickReasonChips = [
    'خطأ في الكمية أو السعر',
    'بناء على طلب العميل',
    'فاتورة مكررة بالخطأ',
    'تسوية محاسبية معتمدة',
    'إلغاء الاتفاقية',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-right">
        
        {/* Header with Smart Accounting Badge */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isCancelled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : activeActionTab === 'cancel'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {isCancelled ? (
                <RotateCcw className="w-5 h-5 text-amber-400" />
              ) : activeActionTab === 'cancel' ? (
                <FileCheck className="w-5 h-5 text-indigo-400" />
              ) : (
                <Trash2 className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  تسوية محاسبية ذكية ومطابقة سليمة
                </span>
                {isCancelled && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    ملغاة محاسبياً بالفعل
                  </span>
                )}
                {isReturn && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    مردودات مبيعات
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                إدارة وحذف الفاتورة رقم{' '}
                <span className="font-mono text-indigo-300 underline underline-offset-4">
                  {invoice.invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                حلول محاسبية متطابقة تضمن سلامة الأرصدة والمخزون ومطابقة الحسابات 100%.
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
          
          {/* Action Mode Selector Tabs (Accounting Void vs Permanent Delete) */}
          {!isCancelled && (
            <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveActionTab('cancel')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeActionTab === 'cancel'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>1. إلغاء محاسبي (الخيار الموصى به)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveActionTab('delete')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeActionTab === 'delete'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-300" />
                <span>2. حذف نهائي من السجل</span>
              </button>
            </div>
          )}

          {/* Section 1: Detailed Invoice Summary Card */}
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 text-slate-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>بيانات الفاتورة المراد التعامل معها</span>
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
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                الأصناف والفئات المضمنة ({invoice.items?.length || 0}):
              </span>
              <div className="overflow-x-auto max-h-32 overflow-y-auto pr-1">
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
                          {(item.unitWholesalePrice ?? 0).toLocaleString()}
                        </td>
                        <td className="py-1 px-1.5 text-left font-mono font-bold text-white">
                          {(item.totalWholesalePrice ?? 0).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Impact & Reconciliation Forensics */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20 text-indigo-300">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-indigo-400" />
                <span>أثر التسوية المحاسبية على مطابقة رصيد {partyType}</span>
              </span>
              <span className="text-[11px] text-indigo-300 font-mono">
                {partyName}
              </span>
            </div>

            {balanceForensics ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Current Balance */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">الرصيد / المديونية الحالية:</span>
                  <div className="font-mono text-base font-black text-slate-200">
                    {(balanceForensics.currentDebt ?? 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {isCancelled ? 'الفاتورة ملغاة حالياً' : 'قبل تنفيذ أمر التسوية'}
                  </span>
                </div>

                {/* 2. Balance Change (Delta) */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">قيمة التسوية على الحساب:</span>
                  <div
                    className={`font-mono text-base font-black flex items-center gap-1 ${
                      isCancelled
                        ? 'text-slate-400'
                        : balanceForensics.debtDifference < 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {isCancelled ? (
                      <span>0 {currency}</span>
                    ) : (
                      <>
                        {balanceForensics.debtDifference < 0 ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                        <span>
                          {Math.abs(balanceForensics.debtDifference).toLocaleString()}{' '}
                          <span className="text-xs font-sans">{currency}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {isCancelled
                      ? 'تمت التسوية مسبقاً (لا أثر إضافي)'
                      : isReturn
                      ? 'إلغاء خصم المرتجع من المديونية'
                      : 'خصم قيمة الفاتورة من مديونية الحساب'}
                  </span>
                </div>

                {/* 3. New Balance After Settlement */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 bg-indigo-500/5">
                  <span className="text-indigo-300 text-[11px] font-bold block mb-1">
                    الرصيد المعتمد بعد العملية:
                  </span>
                  <div className="font-mono text-base font-black text-indigo-300">
                    {(balanceForensics.newDebt ?? 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 block mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    مطابقة كشف الحساب 100%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/80 rounded-lg text-slate-400 text-xs">
                الفاتورة مسجلة كمبيعات مباشرة، لن يتم تغيير رصيد أي نقطة بيع أو عميل محدد.
              </div>
            )}
          </div>

          {/* Section 3: Inventory Impact on Warehouse Stock */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>أثر العملية على مخزون كروت المستودع</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-bold">
                {isCancelled
                  ? 'تم استرجاع الكروت للمستودع سابقاً'
                  : isReturn
                  ? 'سيتم خصم كمية المرتجع من المستودع'
                  : 'سيتم استرجاع الكروت تلقائياً إلى المستودع'}
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
                      {isCancelled
                        ? '0 (تم مسبقاً)'
                        : `${item.quantityDelta >= 0 ? `+${item.quantityDelta}` : item.quantityDelta} كارت`}
                    </span>
                    <span className="text-indigo-300 font-bold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                      المخزون المعتمد: {item.newStock} كارت
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Dynamic Action Details based on Selected Tab */}
          {activeActionTab === 'cancel' && !isCancelled && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-xs">
                    مزايا الإلغاء المحاسبي (Void Invoice) - المعيار المالي الموصى به:
                  </h4>
                  <ul className="list-disc list-inside text-[11px] text-emerald-200/90 mt-1 space-y-0.5 leading-relaxed">
                    <li>لا يترك فجوات رقمية في تسلسل الفواتير (يحفظ الترقيم القانوني للمطابقة).</li>
                    <li>يصفر أثر الفاتورة المالي فوراً (0 تأثير على مديونية الحساب، ولا تدخل في الأرباح).</li>
                    <li>يسترجع كميات الكروت تلقائياً إلى مخزون المستودع.</li>
                    <li>تظهر في كشف الحساب وميزان المراجعة كحركة ملغاة ومطابقة 100%.</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  سبب الإلغاء المحاسبي (اختياري - يوثق في كشف الحساب وسجل التدقيق):
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="مثال: خطأ في إدخال الكمية، تسوية محاسبية، طلب العميل..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center">اقتراحات سريعة:</span>
                  {quickReasonChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCancelReason(chip)}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeActionTab === 'delete' && (
            <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-xs">
                    تنبيه الحذف النهائي من النظام (Permanent Delete):
                  </h4>
                  <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                    سيتم مسح سجل الفاتورة نهائياً من قاعدة البيانات، مع إجراء تسوية تلقائية لمديونية الطرف
                    وإعادة كميات الكروت للمستودع وحفظ لقطة موثقة في سجل التدقيق.
                  </p>
                </div>
              </div>

              {/* Fast & Easy Confirmation Checkbox */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
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

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>أو قم بنسخ رقم الفاتورة للتأكيد الفوري:</span>
                  <button
                    type="button"
                    onClick={handleCopyInvoiceNumber}
                    className="flex items-center gap-1 font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{requiredConfirmWord}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCancelled && onConfirmRestore && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-300 text-xs">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>هل تريد إعادة تفعيل الفاتورة الملغاة وتطبيق أثرها المالي والمخزني مجدداً؟</span>
              </div>
              <button
                type="button"
                onClick={() => onConfirmRestore(invoice)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة وتفعيل الفاتورة</span>
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            تراجع وإغلاق
          </button>

          <div className="flex items-center gap-2">
            {activeActionTab === 'cancel' && !isCancelled && onConfirmCancel && (
              <button
                type="button"
                onClick={() => onConfirmCancel(invoice, cancelReason)}
                className="px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الإلغاء المحاسبي (الموصى به)</span>
              </button>
            )}

            {activeActionTab === 'delete' && (
              <button
                type="button"
                disabled={!canSubmitDelete}
                onClick={() => onConfirmDelete(invoice)}
                className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
                  canSubmitDelete
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف النهائي وتحديث الأرصدة</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
