import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle,
  Receipt,
  X,
  CreditCard,
  User,
  Calendar,
  Share2,
  Printer
} from 'lucide-react';
import { POSPoint, PaymentRecord, NetworkSettings, Customer } from '../types';

interface PaymentModalProps {
  posPoints: POSPoint[];
  customers?: Customer[];
  initialPOSId?: string;
  settings: NetworkSettings;
  onAddPayment: (payment: Omit<PaymentRecord, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  posPoints,
  customers = [],
  initialPOSId,
  settings,
  onAddPayment,
  onClose,
}) => {
  const initialEntity = initialPOSId && customers.find(c => c.id === initialPOSId) ? 'customer' : 'pos';
  const [entityType, setEntityType] = useState<'pos' | 'customer'>(initialEntity);
  const [selectedPOSId, setSelectedPOSId] = useState(initialEntity === 'pos' ? (initialPOSId || (posPoints[0]?.id || '')) : (posPoints[0]?.id || ''));
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialEntity === 'customer' ? (initialPOSId || (customers[0]?.id || '')) : (customers[0]?.id || ''));
  const [amount, setAmount] = useState<number>(10000);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'e_wallet'>('cash');
  const [receivedBy, setReceivedBy] = useState<string>('مدير الشبكة');
  const [referenceNumber, setReferenceNumber] = useState<string>(`REC-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState<string>('');

  const selectedPOS = posPoints.find((p) => p.id === selectedPOSId);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentDebt = entityType === 'pos' ? (selectedPOS?.currentDebt || 0) : (selectedCustomer?.balance || 0);
  const remainingAfterPayment = Math.max(0, currentDebt - (Number(amount) || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOSId || amount <= 0) return;

    onAddPayment({
      date,
      posPointId: entityType === 'pos' ? selectedPOSId : '',
      customerId: entityType === 'customer' ? selectedCustomerId : '',
      amount: Number(amount),
      paymentMethod,
      receivedBy,
      referenceNumber,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>سند قبض وسداد دفعة نقدية</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* POS Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              نقطة البيع المسددة <span className="text-rose-400">*</span>:
            </label>
            <select
              value={selectedPOSId}
              onChange={(e) => setSelectedPOSId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              {posPoints.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name} - (المديونية الحالية: {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                المبلغ المسدد ({settings.currencySymbol}) <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text" inputMode="decimal"
                
                required
                placeholder="10000"
                value={amount === 0 ? '' : amount}
                onChange={(e) => {
                  const v = e.target.value;
                  setAmount(v === '' ? 0 : Math.max(0, Number(v)));
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                تاريخ السداد:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Quick Amount Chips */}
          {currentDebt > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-[10px]">مبالغ سريعة:</span>
              <button
                type="button"
                onClick={() => setAmount(currentDebt)}
                className="px-2 py-0.5 rounded text-[10px] bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50 font-bold transition"
              >
                كامل المديونية ({(currentDebt ?? 0).toLocaleString()})
              </button>
              {currentDebt > 5000 && (
                <button
                  type="button"
                  onClick={() => setAmount(Math.round(currentDebt / 2))}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 font-bold transition"
                >
                  نصف المديونية ({(Math.round(currentDebt / 2) ?? 0).toLocaleString()})
                </button>
              )}
            </div>
          )}

          {/* Debt Balance Calculation Preview */}
          {(entityType === 'pos' ? selectedPOS : selectedCustomer) && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>المديونية الحالية قبل السداد:</span>
                <span className="font-mono font-bold text-amber-400">
                  {(currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span>المبلغ المدفوع:</span>
                <span className="font-mono">
                  - {(amount ?? 0).toLocaleString()} {settings.currencySymbol}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-slate-200 font-bold">
                <span>الرصيد المتبقي بعد السداد:</span>
                <span className="font-mono text-cyan-300 text-sm">
                  {(remainingAfterPayment ?? 0).toLocaleString()} {settings.currencySymbol}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'cash', label: 'نقداً كاش' },
              { id: 'bank_transfer', label: 'حوالة بنكية / صرافة' },
              { id: 'e_wallet', label: 'محفظة إلكترونية' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as any)}
                className={`py-2 px-1 rounded-lg text-[11px] font-semibold transition text-center ${
                  paymentMethod === m.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Collector & Receipt # */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                المستلم / المحصل:
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                رقم السند / الحوالة:
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              ملاحظات:
            </label>
            <input
              type="text"
              placeholder="ملاحظات حول طريقة السداد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>تأكيد تسجيل السداد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
