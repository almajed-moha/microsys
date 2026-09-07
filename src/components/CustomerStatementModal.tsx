import React, { useMemo } from 'react';
import { X, Printer, FileText, ArrowUpRight, ArrowDownLeft, Phone, MapPin } from 'lucide-react';
import { Customer, InvoiceRecord, PaymentRecord } from '../types';
import { printElementDocument } from '../utils/pdfExport';

interface CustomerStatementModalProps {
  customer: Customer;
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  onClose: () => void;
}

interface StatementEntry {
  id: string;
  date: string;
  time?: string;
  timestamp: string;
  type: 'invoice_sale' | 'invoice_return' | 'payment';
  description: string;
  debit: number; // مدين (عليه) - Purchases
  credit: number; // دائن (له) - Payments or Returns
  balance: number; // الرصيد التراكمي
  reference: string;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  invoices,
  payments,
  onClose
}) => {
  const entries = useMemo(() => {
    const custInvoices = invoices.filter(inv => inv.customerId === customer.id);
    const custPayments = payments.filter(p => p.customerId === customer.id);
    
    let combined: Omit<StatementEntry, 'balance'>[] = [];
    
    custInvoices.forEach(inv => {
      if (inv.type === 'sale') {
        combined.push({
          id: inv.id,
          date: inv.date,
          time: inv.time || '00:00',
          timestamp: inv.timestamp,
          type: 'invoice_sale',
          description: 'فاتورة مبيعات / تسليم كروت',
          debit: inv.totalWholesaleAmount || 0,
          credit: 0,
          reference: inv.invoiceNumber
        });
      } else if (inv.type === 'return') {
        combined.push({
          id: inv.id,
          date: inv.date,
          time: inv.time || '00:00',
          timestamp: inv.timestamp,
          type: 'invoice_return',
          description: 'فاتورة مرتجع كروت',
          debit: 0,
          credit: inv.totalWholesaleAmount || 0,
          reference: inv.invoiceNumber
        });
      }
    });

    custPayments.forEach(p => {
      combined.push({
        id: p.id,
        date: p.date,
        time: p.time || '00:00',
        timestamp: p.timestamp,
        type: 'payment',
        description: p.paymentMethod === 'cash' ? 'سند قبض نقدي' : p.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'سند قبض آخر',
        debit: 0,
        credit: p.amount,
        reference: p.referenceNumber || 'بدون رقم'
      });
    });

    // Sort by timestamp
    combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate running balance
    let currentBalance = 0;
    return combined.map(entry => {
      currentBalance += entry.debit;
      currentBalance -= entry.credit;
      return {
        ...entry,
        balance: currentBalance
      };
    });
  }, [customer.id, invoices, payments]);

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  const handlePrint = () => {
    printElementDocument('customer-statement-print', { title: `كشف_حساب_${customer.name}` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">كشف حساب عميل</h2>
              <p className="text-sm text-slate-500">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">طباعة الكشف</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-xl border border-slate-200">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" id="customer-statement-print">
          {/* Customer Info Card */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-6 mb-6 border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">اسم العميل</p>
                <p className="font-bold text-slate-800">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">رقم الهاتف</p>
                <p className="font-bold text-slate-800">{customer.phone || '---'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">إجمالي المسحوبات</p>
                <p className="font-bold text-slate-800">{totalDebit.toLocaleString()} ريال</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">الرصيد المتبقي</p>
                <p className={`text-xl font-black ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {Math.abs(finalBalance).toLocaleString()} ريال
                  <span className="text-sm font-normal ml-1">
                    {finalBalance > 0 ? '(عليه)' : finalBalance < 0 ? '(له)' : ''}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">التاريخ والوقت</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">البيان</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">الرقم المرجعي</th>
                    <th className="px-4 py-3 font-semibold text-rose-600">مدين (عليه)</th>
                    <th className="px-4 py-3 font-semibold text-emerald-600">دائن (له)</th>
                    <th className="px-4 py-3 font-semibold text-indigo-600">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        لا توجد حركات مالية مسجلة لهذا العميل حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">{entry.date}</div>
                          <div className="text-xs text-slate-500">{entry.time}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {entry.type === 'invoice_sale' && <ArrowUpRight size={16} className="text-rose-500" />}
                            {(entry.type === 'payment' || entry.type === 'invoice_return') && <ArrowDownLeft size={16} className="text-emerald-500" />}
                            <span className="text-slate-700">{entry.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm font-mono">
                          {entry.reference}
                        </td>
                        <td className="px-4 py-3 font-bold text-rose-600">
                          {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-600 bg-indigo-50/30">
                          {Math.abs(entry.balance).toLocaleString()} {entry.balance > 0 ? '(مدين)' : entry.balance < 0 ? '(دائن)' : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {entries.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-left text-slate-700">الإجماليات:</td>
                      <td className="px-4 py-4 text-rose-600">{totalDebit.toLocaleString()}</td>
                      <td className="px-4 py-4 text-emerald-600">{totalCredit.toLocaleString()}</td>
                      <td className="px-4 py-4 text-indigo-600">
                         {Math.abs(finalBalance).toLocaleString()} {finalBalance > 0 ? '(عليه)' : finalBalance < 0 ? '(له)' : ''}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-400 hidden print:block">
            طبع بواسطة النظام الموحد لإدارة المبيعات والشبكات - {new Date().toLocaleString('ar-SA')}
          </div>
        </div>
      </div>
    </div>
  );
};
