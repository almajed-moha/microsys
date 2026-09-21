import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  Store,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import {
  SalesRecord,
  POSPoint,
  CardCategory,
  PaymentRecord,
  InvoiceRecord,
  CardBatchDispatch,
  NetworkSettings,
} from '../types';
import { calculatePOSBalance } from '../utils/financialCalculations';
import { calculatePOSInventory } from '../utils/storage';

interface SaleDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (sale: SalesRecord) => void;
  sale: SalesRecord | null;
  posPoints: POSPoint[];
  categories: CardCategory[];
  sales?: SalesRecord[];
  payments?: PaymentRecord[];
  dispatches?: CardBatchDispatch[];
  invoices?: InvoiceRecord[];
  settings?: NetworkSettings;
}

export const SaleDeleteConfirmModal: React.FC<SaleDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  sale,
  posPoints,
  categories,
  sales = [],
  payments = [],
  dispatches = [],
  invoices = [],
  settings,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgeImpact, setAcknowledgeImpact] = useState(false);

  React.useEffect(() => {
    setTypedConfirmation('');
    setAcknowledgeImpact(false);
  }, [sale?.id, isOpen]);

  const currency = settings?.currencySymbol || 'ر.ي';
  const targetPOS = useMemo(() => {
    if (!sale) return undefined;
    return posPoints.find((p) => p.id === sale.posPointId);
  }, [posPoints, sale]);

  const targetCategory = useMemo(() => {
    if (!sale) return undefined;
    return categories.find((c) => c.id === sale.categoryId);
  }, [categories, sale]);

  const totalWholesale = sale?.totalWholesaleAmount ?? 0;
  const totalRetail = sale?.totalRetailAmount ?? 0;

  const partyName = targetPOS ? targetPOS.name : sale?.posPointName || 'مبيعات مباشرة';

  // Balance Forensics for POS
  const balanceForensics = useMemo(() => {
    if (!sale || !targetPOS) return null;

    const currentPosCalc = calculatePOSBalance(
      targetPOS.id,
      sales,
      payments,
      dispatches,
      invoices
    );
    const currentDebt = currentPosCalc.currentDebt;

    // Simulated without this sale
    const simulatedSales = sales.filter((s) => s.id !== sale.id);
    const simulatedPosCalc = calculatePOSBalance(
      targetPOS.id,
      simulatedSales,
      payments,
      dispatches,
      invoices
    );
    const newDebt = simulatedPosCalc.currentDebt;
    const debtDifference = newDebt - currentDebt;

    // POS inventory remaining forensics
    const currentInv = calculatePOSInventory(targetPOS.id, dispatches, sales, invoices);
    const simInv = calculatePOSInventory(targetPOS.id, dispatches, simulatedSales, invoices);

    const currentCatRem = currentInv.byCategory[sale.categoryId]?.remaining ?? 0;
    const newCatRem = simInv.byCategory[sale.categoryId]?.remaining ?? 0;

    return {
      currentDebt,
      newDebt,
      debtDifference,
      maxDebtLimit: targetPOS.maxDebtLimit || 0,
      currentPosCardRemaining: currentCatRem,
      newPosCardRemaining: newCatRem,
    };
  }, [targetPOS, sales, payments, dispatches, invoices, sale]);

  if (!isOpen || !sale) return null;

  const requiredConfirmWord = sale.invoiceNumber || 'تأكيد';
  const isConfirmInputValid =
    typedConfirmation.trim().toLowerCase() === requiredConfirmWord.trim().toLowerCase();
  const canSubmit = isConfirmInputValid && acknowledgeImpact;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-rose-500/30 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                حذف حركة مبيعات كروت
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                تأكيد حذف حركة المبيعات{' '}
                <span className="font-mono text-rose-300 underline underline-offset-4">
                  {sale.invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                سيؤدي الحذف إلى خصم قيمة الحركة من حساب نقطة البيع وإعادة الكمية لرصيدها.
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
        <div className="p-4 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Details Card */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 text-slate-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Store className="w-4 h-4 text-indigo-400" />
                <span>{partyName}</span>
              </span>
              <span className="font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{sale.date}</span>
                {sale.time && <span>- {sale.time}</span>}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block mb-0.5">فئة الكارت:</span>
                <span className="font-bold text-white text-sm">
                  {targetCategory ? targetCategory.name : 'فئة غير معرفة'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block mb-0.5">الكمية المباعة:</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {sale.quantity} كارت
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/40 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block mb-0.5">مبلغ الجملة:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {totalWholesale.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {totalRetail > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-slate-400 text-[11px]">
                <span>إجمالي قيمة التجزئة التقديرية:</span>
                <span className="font-mono text-slate-300">
                  {totalRetail.toLocaleString()} {currency}
                </span>
              </div>
            )}
          </div>

          {/* Balance Impact */}
          {balanceForensics && (
            <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 text-amber-300">
                <span className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>الأثر المالي المباشر على رصيد نقطة البيع</span>
                </span>
                <span className="text-[11px] font-mono text-amber-400/90">{partyName}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">المديونية الحالية:</span>
                  <div className="font-mono text-base font-black text-slate-200">
                    {balanceForensics.currentDebt.toLocaleString()}{' '}
                    <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">قبل الحذف</span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1">قيمة الخصم من الدين:</span>
                  <div className="font-mono text-base font-black text-emerald-400 flex items-center gap-1">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>
                      {Math.abs(balanceForensics.debtDifference).toLocaleString()}{' '}
                      <span className="text-xs font-sans">{currency}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 block mt-1">
                    تخفيض من مديونية الموزع
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 bg-amber-500/5">
                  <span className="text-amber-300 text-[11px] font-bold block mb-1">
                    المديونية الجديدة:
                  </span>
                  <div className="font-mono text-base font-black text-amber-400">
                    {balanceForensics.newDebt.toLocaleString()}{' '}
                    <span className="text-xs text-slate-500 font-sans">{currency}</span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 block mt-1">الرصيد المعتمد بعد الحذف</span>
                </div>
              </div>

              {/* POS inventory restore info */}
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>رصيد كروت نقطة البيع بعد التراجع:</span>
                </span>
                <span className="font-mono font-bold text-indigo-300">
                  {balanceForensics.currentPosCardRemaining} كارت ➔{' '}
                  <strong className="text-emerald-400">
                    {balanceForensics.newPosCardRemaining} كارت
                  </strong>{' '}
                  (+{sale.quantity})
                </span>
              </div>
            </div>
          )}

          {/* Safety Confirmations */}
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <input
                id="ack-sale-delete-impact"
                type="checkbox"
                checked={acknowledgeImpact}
                onChange={(e) => setAcknowledgeImpact(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500 cursor-pointer"
              />
              <label
                htmlFor="ack-sale-delete-impact"
                className="text-xs text-rose-200 font-medium cursor-pointer leading-relaxed"
              >
                أقر بأنني راجعت الأثر المالي على رصيد ({partyName}) وإعادة الكمية لحساب النقطة،
                وأتحمل مسؤولية حذف هذه العملية.
              </label>
            </div>

            <div className="pt-2 border-t border-rose-500/20">
              <label
                htmlFor="input-confirm-sale-number"
                className="block text-[11px] text-slate-300 font-semibold mb-1"
              >
                اكتب رقم الفاتورة بالضبط{' '}
                <span className="font-mono font-bold text-rose-300 select-all bg-black/40 px-1.5 py-0.5 rounded">
                  {requiredConfirmWord}
                </span>{' '}
                للتأكيد:
              </label>
              <input
                id="input-confirm-sale-number"
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
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            إلغاء وتراجع
          </button>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirmDelete(sale)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
              canSubmit
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>تأكيد الحذف وتحديث الرصيد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
