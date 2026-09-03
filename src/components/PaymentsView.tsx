import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Printer,
  Share2,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  FileDown,
  Loader2,
  Store,
  UserCheck,
  ArrowDownLeft,
  Eye
} from 'lucide-react';
import { PaymentRecord, POSPoint, NetworkSettings } from '../types';
import { exportToCSV, downloadFile } from '../utils/storage';
import { exportElementToPdf } from '../utils/pdfExport';
import { RecordAuditInfo } from './RecordAuditInfo';

interface PaymentsViewProps {
  payments: PaymentRecord[];
  posPoints: POSPoint[];
  settings: NetworkSettings;
  onAddPayment: (payment: Omit<PaymentRecord, 'id' | 'timestamp'>) => void;
  onUpdatePayment: (payment: PaymentRecord) => void;
  onDeletePayment: (paymentId: string) => void;
  onViewReceipt: (payment: PaymentRecord) => void;
  onOpenStatement?: (posId: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  posPoints,
  settings,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onViewReceipt,
  onOpenStatement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPOSFilter, setSelectedPOSFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isExportingReportPdf, setIsExportingReportPdf] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].substring(0, 5),
    posPointId: posPoints[0]?.id || '',
    amount: 10000,
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'cheque' | 'other',
    referenceNumber: '',
    receivedBy: 'مدير الشبكة',
    notes: '',
  });

  // Delete Confirmation Modal State
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);

  const selectedPOS = posPoints.find((p) => p.id === formData.posPointId);
  const currentDebt = selectedPOS?.currentDebt || 0;
  const remainingAfterPayment = Math.max(0, currentDebt - (Number(formData.amount) || 0));

  const handleOpenAdd = (posId?: string) => {
    setEditingPayment(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString().split('T')[1].substring(0, 5),
      posPointId: posId || (posPoints[0]?.id || ''),
      amount: 10000,
      paymentMethod: 'cash',
      referenceNumber: `REC-${Date.now().toString().slice(-6)}`,
      receivedBy: 'مدير الشبكة',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setFormData({
      date: payment.date,
      time: payment.time || new Date().toISOString().split('T')[1].substring(0, 5),
      posPointId: payment.posPointId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber || '',
      receivedBy: payment.receivedBy || 'مدير الشبكة',
      notes: payment.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.posPointId || formData.amount <= 0) return;

    if (editingPayment) {
      onUpdatePayment({
        ...editingPayment,
        date: formData.date,
        posPointId: formData.posPointId,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber,
        receivedBy: formData.receivedBy,
        notes: formData.notes,
      });
    } else {
      onAddPayment({
        date: formData.date,
        posPointId: formData.posPointId,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || `REC-${Date.now().toString().slice(-6)}`,
        receivedBy: formData.receivedBy,
        notes: formData.notes,
      });
    }

    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deletingPayment) return;
    onDeletePayment(deletingPayment.id);
    setDeletingPayment(null);
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pos = posPoints.find((point) => point.id === p.posPointId);
      const matchesSearch =
        (pos && pos.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.receivedBy && p.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedPOSFilter !== 'all' && p.posPointId !== selectedPOSFilter) return false;
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (dateFilter && p.date !== dateFilter) return false;

      return true;
    }).sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date));
  }, [payments, posPoints, searchTerm, selectedPOSFilter, methodFilter, dateFilter]);

  // Financial Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPaymentsTotal = (payments || [])
    .filter((p) => p && (p.date === todayStr || p.date?.startsWith(todayStr)))
    .reduce((acc, p) => acc + (p?.amount || 0), 0);

  const totalPaymentsAmount = (payments || []).reduce((acc, p) => acc + (p?.amount || 0), 0);
  const totalDebtOverall = (posPoints || []).reduce((acc, p) => acc + (p?.currentDebt || 0), 0);

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = filteredPayments.map((p) => {
      const pos = posPoints.find((point) => point.id === p.posPointId);
      return {
        referenceNumber: p.referenceNumber || p.id,
        date: p.date,
        posName: pos ? pos.name : 'غير محدد',
        amount: p.amount,
        currency: settings.currencySymbol,
        paymentMethod: p.paymentMethod,
        receivedBy: p.receivedBy || '',
        notes: p.notes || '',
      };
    });

    const headers = [
      { key: 'referenceNumber', label: 'رقم السند' },
      { key: 'date', label: 'التاريخ' },
      { key: 'posName', label: 'نقطة البيع' },
      { key: 'amount', label: 'المبلغ المسدد' },
      { key: 'currency', label: 'العملة' },
      { key: 'paymentMethod', label: 'طريقة السداد' },
      { key: 'receivedBy', label: 'المستلم' },
      { key: 'notes', label: 'ملاحظات' },
    ];

    const csvContent = exportToCSV(dataToExport, headers);
    downloadFile(csvContent, `سندات_القبض_والدفعات_${todayStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportReportPdf = async () => {
    setIsExportingReportPdf(true);
    try {
      const fileName = `سجل_الدفعات_والتحصيل_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf('payments-report-container', {
        filename: fileName,
        title: `سجل الدفعات والتحصيلات - ${settings.networkName}`,
        scale: 2.5,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingReportPdf(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">نقداً كاش</span>;
      case 'bank_transfer':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">حوالة بنكية</span>;
      case 'cheque':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">شيك بنكي</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">محفظة / أخرى</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              <span>سجل وسندات الدفعات والتحصيل</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {payments.length} سند مسجل
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إدارة وتوثيق سندات القبض، سداد مديونيات الموزعين جزئياً أو كلياً، وتصدير وطباعة الإيصالات المالية الرسمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportReportPdf}
            disabled={isExportingReportPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 text-xs font-bold transition flex-1 md:flex-initial"
            title="طباعة وتصدير كشف وسجل السندات إلى ملف PDF"
          >
            {isExportingReportPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <Printer className="w-4 h-4 text-indigo-400" />
            )}
            <span>{isExportingReportPdf ? 'جارِ التصدير...' : 'طباعة وتصدير PDF'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex-1 md:flex-initial"
            title="تصدير جدول السندات إلى ملف Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition flex-1 md:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>سند قبض / سداد دفعة جديد</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>مقبوضات اليوم ({todayStr})</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black font-mono text-emerald-400">
            {(todayPaymentsTotal ?? 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">تحصيلات اليوم المسددة</span>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>إجمالي المقبوضات الكلية</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black font-mono text-cyan-400">
            {(totalPaymentsAmount ?? 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">مجموع ما تم تحصيله</span>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>إجمالي المديونيات المتبقية</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black font-mono text-amber-400">
            {(totalDebtOverall ?? 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">{settings.currencySymbol}</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">المستحقات على نقاط البيع</span>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>عدد سندات القبض</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-lg sm:text-2xl font-black font-mono text-indigo-300">
            {payments?.length ?? 0} <span className="text-xs font-sans text-slate-400">سند</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">إجمالي العمليات الموثقة</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">بحث سريع:</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="رقم السند، نقطة البيع، المحصل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">نقطة البيع:</label>
          <select
            value={selectedPOSFilter}
            onChange={(e) => setSelectedPOSFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">جميع نقاط البيع</option>
            {posPoints.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">طريقة السداد:</label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">جميع الطرق</option>
            <option value="cash">نقداً كاش</option>
            <option value="bank_transfer">حوالة بنكية / صرافة</option>
            <option value="cheque">شيك بنكي</option>
            <option value="other">محفظة إلكترونية / أخرى</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">التاريخ:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div id="payments-report-container" className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">رقم السند</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">نقطة البيع</th>
                <th className="py-3 px-4">المبلغ المسدد</th>
                <th className="py-3 px-4">طريقة السداد</th>
                <th className="py-3 px-4">المحصل / المستلم</th>
                <th className="py-3 px-4">ملاحظات</th>
                <th className="py-3 px-4 text-center">إجراءات وسند القبض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-600" />
                      <span>لا توجد سندات قبض تطابق معايير البحث</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const pos = posPoints.find((point) => point.id === p.posPointId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-indigo-300">
                          {p.referenceNumber || p.id}
                        </div>
                        <div className="mt-1">
                          <RecordAuditInfo
                            audit={p}
                            entityName={`سند قبض ${p.referenceNumber || p.id}`}
                            compact={true}
                            showHistoryButton={true}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{p.date} {p.time ? ` - ${p.time}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pos ? pos.name : 'نقطة بيع غير معروفة'}</span>
                        </div>
                        {pos?.managerName && (
                          <span className="text-[10px] text-slate-400 block">{pos.managerName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-400 text-sm whitespace-nowrap">
                        +{(p.amount ?? 0).toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{settings.currencySymbol}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getMethodBadge(p.paymentMethod)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>{p.receivedBy || 'إدارة الشبكة'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {p.notes || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewReceipt(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs hover:shadow-emerald-500/20"
                            title="عرض وطباعة سند القبض الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>طباعة السند</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="تعديل السند"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingPayment(p)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                            title="حذف السند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>{editingPayment ? 'تعديل سند قبض وسداد' : 'إصدار سند قبض وسداد دفعة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* POS Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  نقطة البيع المسددة <span className="text-rose-400">*</span>:
                </label>
                <select
                  value={formData.posPointId}
                  onChange={(e) => setFormData({ ...formData, posPointId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                >
                  {posPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} (المديونية الحالية: {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol})
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
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    تاريخ السند:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Debt Calculation Preview */}
              {selectedPOS && (
                <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>المديونية المسجلة قبل السداد:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {(currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>المبلغ المسدد بهذا السند:</span>
                    <span className="font-mono">
                      - {(formData.amount ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-slate-200 font-bold">
                    <span>المديونية المتبقية بعد السداد:</span>
                    <span className="font-mono text-cyan-300 text-sm">
                      {(remainingAfterPayment ?? 0).toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  طريقة السداد:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'نقداً كاش' },
                    { id: 'bank_transfer', label: 'حوالة بنكية' },
                    { id: 'other', label: 'محفظة إلكترونية' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m.id as any })}
                      className={`py-2 px-1 rounded-lg text-[11px] font-semibold transition text-center ${
                        formData.paymentMethod === m.id
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collector & Receipt # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    المستلم / المحصل:
                  </label>
                  <input
                    type="text"
                    value={formData.receivedBy}
                    onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    رقم السند / المرجع:
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات أو تفاصيل الحوالة:
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات الحوالة أو السداد..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingPayment ? 'حفظ التعديلات' : 'تأكيد وحفظ سند القبض'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-white">تأكيد حذف سند القبض</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف سند القبض رقم <strong className="text-indigo-400 font-mono">{deletingPayment.referenceNumber || deletingPayment.id}</strong> بمبلغ <strong className="text-emerald-400 font-mono">{(deletingPayment.amount ?? 0).toLocaleString()} {settings.currencySymbol}</strong>؟
              <br />
              <span className="text-amber-400 mt-1 block">
                تنبيه: سيتم إعادة احتساب مديونية نقطة البيع وزيادتها بقيمة هذا المبلغ المحذوف تلقائياً.
              </span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-rose-600/30 transition"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
