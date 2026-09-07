import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, User, Phone, MapPin, Activity, FileText, Download, DollarSign, Receipt, AlertTriangle, CheckCircle, ShieldAlert, X } from 'lucide-react';
import { Customer, InvoiceRecord, PaymentRecord, SalesRecord, CardCategory, POSPoint, NetworkSettings } from '../types';
import { CustomerStatementModal } from './CustomerStatementModal';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  sales?: SalesRecord[];
  categories?: CardCategory[];
  posPoints?: POSPoint[];
  settings?: NetworkSettings;
  onOpenPaymentModal?: (customerId: string) => void;
  onOpenInvoiceModal?: (customerId: string) => void;
  onViewInvoiceReceipt?: (invoice: InvoiceRecord) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  invoices,
  payments,
  sales = [],
  categories = [],
  posPoints = [],
  settings,
  onOpenPaymentModal,
  onOpenInvoiceModal,
  onViewInvoiceReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // Deletion modals state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [debtWarningCustomer, setDebtWarningCustomer] = useState<{ customer: Customer; debt: number } | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  const currency = settings?.currencySymbol || 'ريال';

  // Calculate balances with cash vs credit invoices and returns accounted for
  const customersWithStats = useMemo(() => {
    return customers.map(c => {
      const customerInvoices = invoices.filter(inv => inv.customerId === c.id);
      const customerPayments = payments.filter(p => p.customerId === c.id);
      
      let totalPurchases = 0;
      let totalReturns = 0;
      customerInvoices.forEach(inv => {
        if (inv.status === 'cancelled') return;
        if (inv.type === 'sale') {
          // Cash invoices are paid at counter, so they do not add to lingering debt
          if (inv.paymentType !== 'cash') {
            totalPurchases += (inv.totalWholesaleAmount || 0);
          }
        }
        if (inv.type === 'return') totalReturns += (inv.totalWholesaleAmount || 0);
      });

      const totalPaymentsAmt = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const calculatedBalance = totalPurchases - totalReturns - totalPaymentsAmt;
      
      // Use existing c.balance if present, or calculatedBalance
      const finalBalance = c.balance !== undefined ? c.balance : calculatedBalance;

      return {
        ...c,
        totalPurchases,
        totalReturns,
        totalPayments: totalPaymentsAmt,
        balance: finalBalance
      };
    });
  }, [customers, invoices, payments]);

  const filteredCustomers = customersWithStats.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const handleDeleteClick = (customer: Customer) => {
    // A customer has debt if their balance is strictly greater than 0
    const rawDebt = customer.balance ?? 0;
    const debt = Math.round(rawDebt * 100) / 100;

    if (debt > 0) {
      // Customer has debt: show informative blocker dialog
      setDebtWarningCustomer({ customer, debt });
    } else {
      // Customer has NO debt (balance is 0 or credit): allow deletion
      setCustomerToDelete(customer);
    }
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    const customerName = customerToDelete.name;
    onDeleteCustomer(customerToDelete.id);
    setCustomerToDelete(null);
    setFeedbackToast(`تم حذف العميل "${customerName}" بنجاح ✅`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        ...formData
      });
    } else {
      onAddCustomer({
        id: 'cust-' + Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      });
    }
    closeModal();
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        status: customer.status
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        notes: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة العملاء</h2>
          <p className="text-slate-500 text-sm mt-1">سجل العملاء، الأرصدة، وكشوف الحساب</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={20} />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <CheckCircle size={18} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="البحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{customer.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {customer.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openModal(customer)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="تعديل بيانات العميل"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(customer)}
                  className={`p-2 rounded-lg transition-colors ${
                    (customer.balance ?? 0) > 0
                      ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={
                    (customer.balance ?? 0) > 0
                      ? `لا يمكن الحذف: توجد مديونية (${(customer.balance ?? 0).toLocaleString()} ${currency})`
                      : 'حذف العميل (لا توجد مديونية)'
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm text-slate-600">
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">الرصيد المتبقي:</span>
                <span className={`text-base font-bold ${customer.balance && customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {customer.balance ? Math.abs(customer.balance).toLocaleString() : 0} {currency}
                  <span className="text-xs font-normal mr-1">
                    {customer.balance && customer.balance > 0 ? '(مدين)' : customer.balance && customer.balance < 0 ? '(دائن)' : '(خالص)'}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100/80">
                {onOpenPaymentModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPaymentModal(customer.id)}
                    className="py-1.5 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                    title="تحصيل وسند قبض مالي للعميل"
                  >
                    <DollarSign size={13} />
                    <span>سند قبض</span>
                  </button>
                )}
                {onOpenInvoiceModal && (
                  <button
                    type="button"
                    onClick={() => onOpenInvoiceModal(customer.id)}
                    className="py-1.5 px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                    title="إصدار فاتورة مبيعات جديدة للعميل"
                  >
                    <Receipt size={13} />
                    <span>فاتورة كروت</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStatementCustomer(customer)}
                  className={`py-1.5 px-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                    !onOpenPaymentModal && !onOpenInvoiceModal ? 'col-span-3' : ''
                  }`}
                >
                  <FileText size={13} />
                  <span>كشف حساب</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
            <User size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg">لا يوجد عملاء مطابقين للبحث</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 font-bold mb-1">اسم العميل / الشركة <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 font-bold mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 font-bold mb-1">العنوان</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 font-bold mb-1">الحالة</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط (موقوف)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 font-bold mb-1">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] text-slate-900 bg-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Customer Deletion Modal (No Debt) */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">تأكيد حذف العميل</h3>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                هل أنت متأكد من حذف العميل <span className="font-bold text-slate-900">"{customerToDelete.name}"</span> نهائياً من النظام؟
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5 text-xs text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>تم التحقق: لا توجد أي مديونية مستحقة على هذا العميل (الرصيد: 0 {currency}).</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm"
                >
                  نعم، احذف العميل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Deletion Due To Debt Modal */}
      {debtWarningCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">تعذر حذف العميل</h3>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                لا يمكن حذف العميل <span className="font-bold text-slate-900">"{debtWarningCustomer.customer.name}"</span> نظراً لوجود مديونية مستحقة عليه.
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-5 text-center">
                <span className="text-xs text-rose-600 block mb-1 font-semibold">المبلغ المطلوب تحصيله:</span>
                <span className="text-xl font-black text-rose-700 font-mono">
                  {debtWarningCustomer.debt.toLocaleString()} {currency}
                </span>
                <span className="text-[11px] text-rose-500 block mt-1">يجب سداد وتصفية هذا المبلغ أولاً قبل حذف العميل</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDebtWarningCustomer(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  إغلاق
                </button>
                {onOpenPaymentModal && (
                  <button
                    type="button"
                    onClick={() => {
                      const custId = debtWarningCustomer.customer.id;
                      setDebtWarningCustomer(null);
                      onOpenPaymentModal(custId);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <DollarSign size={16} />
                    <span>سداد وتحصيل الآن</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {statementCustomer && (
        <CustomerStatementModal
          customer={statementCustomer}
          invoices={invoices}
          payments={payments}
          sales={sales}
          categories={categories}
          posPoints={posPoints}
          settings={settings}
          onClose={() => setStatementCustomer(null)}
          onViewInvoiceReceipt={onViewInvoiceReceipt}
        />
      )}
    </div>
  );
};
