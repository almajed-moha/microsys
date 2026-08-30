import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Package,
  Store,
  CreditCard,
  RotateCcw,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  Calendar,
  Trash2,
  Edit2,
  AlertTriangle,
  Printer,
  FileDown,
  Loader2
} from 'lucide-react';
import {
  CardBatchDispatch,
  POSPoint,
  CardCategory,
  NetworkSettings
} from '../types';
import { BatchDispatchReceiptModal } from './BatchDispatchReceiptModal';
import { exportElementToPdf } from '../utils/pdfExport';
import { RecordAuditInfo } from './RecordAuditInfo';

interface BatchDispatchViewProps {
  dispatches: CardBatchDispatch[];
  posPoints: POSPoint[];
  categories: CardCategory[];
  settings: NetworkSettings;
  onAddDispatch: (dispatch: Omit<CardBatchDispatch, 'id' | 'soldCount'>) => void;
  onUpdateDispatch?: (dispatch: CardBatchDispatch) => void;
  onDeleteDispatch?: (dispatchId: string) => void;
  onReturnCards: (dispatchId: string, returnQty: number) => void;
  selectedPOSIdForDispatch?: string;
}

export const BatchDispatchView: React.FC<BatchDispatchViewProps> = ({
  dispatches,
  posPoints,
  categories,
  settings,
  onAddDispatch,
  onUpdateDispatch,
  onDeleteDispatch,
  onReturnCards,
  selectedPOSIdForDispatch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPOSFilter, setSelectedPOSFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // New / Edit Dispatch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<CardBatchDispatch | null>(null);
  const [deletingDispatch, setDeletingDispatch] = useState<CardBatchDispatch | null>(null);
  const [selectedDispatchForReceipt, setSelectedDispatchForReceipt] = useState<CardBatchDispatch | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    posPointId: selectedPOSIdForDispatch || (posPoints[0]?.id || ''),
    categoryId: categories[0]?.id || '',
    quantity: 50,
    serialStart: '',
    serialEnd: '',
    notes: '',
  });

  // Return Cards Modal
  const [returnModalState, setReturnModalState] = useState<{
    isOpen: boolean;
    dispatch: CardBatchDispatch | null;
    returnQty: number;
  }>({
    isOpen: false,
    dispatch: null,
    returnQty: 0,
  });

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  const handleOpenAddModal = (posId?: string) => {
    setEditingDispatch(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      posPointId: posId || selectedPOSIdForDispatch || (posPoints[0]?.id || ''),
      categoryId: categories[0]?.id || '',
      quantity: 50,
      serialStart: '',
      serialEnd: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dispatch: CardBatchDispatch) => {
    setEditingDispatch(dispatch);
    setFormData({
      date: dispatch.date,
      posPointId: dispatch.posPointId,
      categoryId: dispatch.categoryId,
      quantity: dispatch.quantity,
      serialStart: dispatch.serialStart || '',
      serialEnd: dispatch.serialEnd || '',
      notes: dispatch.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.posPointId || !formData.categoryId || formData.quantity <= 0 || !selectedCategory) {
      return;
    }

    const unitWholesalePrice = selectedCategory.wholesalePrice;
    const totalWholesaleValue = unitWholesalePrice * Number(formData.quantity);
    const unitRetailPrice = selectedCategory.retailPrice;
    const totalRetailValue = unitRetailPrice * Number(formData.quantity);

    if (editingDispatch && onUpdateDispatch) {
      onUpdateDispatch({
        ...editingDispatch,
        date: formData.date,
        posPointId: formData.posPointId,
        categoryId: formData.categoryId,
        quantity: Number(formData.quantity),
        unitWholesalePrice,
        totalWholesaleValue,
        unitRetailPrice,
        totalRetailValue,
        serialStart: formData.serialStart || undefined,
        serialEnd: formData.serialEnd || undefined,
        notes: formData.notes,
      });
    } else {
      onAddDispatch({
        date: formData.date,
        posPointId: formData.posPointId,
        categoryId: formData.categoryId,
        quantity: Number(formData.quantity),
        unitWholesalePrice,
        totalWholesaleValue,
        unitRetailPrice,
        totalRetailValue,
        serialStart: formData.serialStart || undefined,
        serialEnd: formData.serialEnd || undefined,
        status: 'delivered',
        notes: formData.notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmReturn = () => {
    if (!returnModalState.dispatch || returnModalState.returnQty <= 0) return;
    onReturnCards(returnModalState.dispatch.id, Number(returnModalState.returnQty));
    setReturnModalState({ isOpen: false, dispatch: null, returnQty: 0 });
  };

  const handleDeleteConfirm = () => {
    if (deletingDispatch && onDeleteDispatch) {
      onDeleteDispatch(deletingDispatch.id);
      setDeletingDispatch(null);
    }
  };

  // Filter Dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const pos = posPoints.find((p) => p.id === d.posPointId);
      const cat = categories.find((c) => c.id === d.categoryId);

      const matchesSearch =
        (pos && pos.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (cat && cat.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.serialStart && d.serialStart.includes(searchTerm)) ||
        (d.notes && d.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedPOSFilter !== 'all' && d.posPointId !== selectedPOSFilter) return false;
      if (selectedCategoryFilter !== 'all' && d.categoryId !== selectedCategoryFilter) return false;

      return true;
    });
  }, [dispatches, posPoints, categories, searchTerm, selectedPOSFilter, selectedCategoryFilter]);

  // Totals
  const totals = useMemo(() => {
    const safeDispatches = filteredDispatches || [];
    const totalDispatchedCards = safeDispatches.reduce((acc, d) => acc + (d?.quantity || 0), 0);
    const totalDispatchedValue = safeDispatches.reduce((acc, d) => acc + (d?.totalWholesaleValue || 0), 0);
    const totalSoldFromDispatches = safeDispatches.reduce((acc, d) => acc + (d?.soldCount || 0), 0);
    const totalRemaining = totalDispatchedCards - totalSoldFromDispatches;

    return {
      totalDispatchedCards,
      totalDispatchedValue,
      totalSoldFromDispatches,
      totalRemaining,
    };
  }, [filteredDispatches]);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fileName = `سجل_توزيع_دفعات_الكروت_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf('dispatch-table-container', {
        filename: fileName,
        title: `سجل تسليم وتوريد دفعات الكروت - ${settings.networkName}`,
        scale: 2.4,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              تسليم وتوريد دفعات الكروت للموزعين
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {dispatches.length} دفعة مسجلة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            صرف كميات الكروت من المستودع إلى نقاط البيع، تتبع السيريال، وتسجيل المرتجعات.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 text-xs font-bold transition flex-1 md:flex-initial"
            title="طباعة وتصدير سجل التوزيع إلى ملف PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <Printer className="w-4 h-4 text-indigo-400" />
            )}
            <span>{isExportingPdf ? 'جارِ التصدير...' : 'طباعة وتصدير PDF'}</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition flex-1 md:flex-initial"
          >
            <Plus className="w-4 h-4" />
            <span>تسليم دفعة كروت جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">إجمالي الكروت المسلمة</span>
          <div className="text-lg sm:text-xl font-black text-indigo-400 font-mono mt-1">
            {(totals.totalDispatchedCards ?? 0).toLocaleString()} <span className="text-xs text-slate-400">كارت</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">قيمة التوريد الإجمالية</span>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">
            {(totals.totalDispatchedValue ?? 0).toLocaleString()} <span className="text-xs">{settings.currencySymbol}</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">كروت تم بيعها وتصريفها</span>
          <div className="text-lg sm:text-xl font-black text-cyan-400 font-mono mt-1">
            {(totals.totalSoldFromDispatches ?? 0).toLocaleString()} <span className="text-xs text-slate-400">كارت</span>
          </div>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400">متبقي بحوزة الموزعين</span>
          <div className="text-lg sm:text-xl font-black text-purple-400 font-mono mt-1">
            {(totals.totalRemaining ?? 0).toLocaleString()} <span className="text-xs text-slate-400">كارت</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <label className="block text-xs font-medium text-slate-400 mb-1">بحث:</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="نقطة البيع، الفئة، السيريال، ملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">نقطة البيع المستلمة:</label>
          <select
            value={selectedPOSFilter}
            onChange={(e) => setSelectedPOSFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">جميع نقاط البيع</option>
            {posPoints.map((pos) => (
              <option key={pos.id} value={pos.id}>{pos.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">فئة الكارت:</label>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">جميع الفئات</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dispatches Table */}
      <div id="dispatch-table-container" className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs divide-y divide-slate-800">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">نقطة البيع المستلمة</th>
                <th className="py-3 px-4">فئة الكارت</th>
                <th className="py-3 px-3 text-center">الكمية المسلمة</th>
                <th className="py-3 px-3 text-center">المباع</th>
                <th className="py-3 px-3 text-center">المتبقي</th>
                <th className="py-3 px-4">سعر الجملة</th>
                <th className="py-3 px-4 font-bold text-amber-300">إجمالي القيمة</th>
                <th className="py-3 px-4">نطاق السيريال</th>
                <th className="py-3 px-4">ملاحظات</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDispatches.map((dispatch) => {
                const pos = posPoints.find((p) => p.id === dispatch.posPointId);
                const cat = categories.find((c) => c.id === dispatch.categoryId);
                const sold = dispatch.soldCount || 0;
                const remaining = Math.max(0, dispatch.quantity - sold);

                return (
                  <tr key={dispatch.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-300">
                        {dispatch.date}
                      </div>
                      <div className="mt-1">
                        <RecordAuditInfo
                          audit={dispatch}
                          entityName={`تسليم ${cat ? cat.name : 'كروت'}`}
                          compact={true}
                          showHistoryButton={true}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-white block">{pos ? pos.name : 'غير محدد'}</strong>
                      <span className="text-[11px] text-slate-400">
                        {pos?.managerName} ({pos?.phone})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {cat ? cat.name : 'فئة محذوفة'}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-400 text-sm">
                      {dispatch.quantity}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-cyan-400">
                      {sold}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-purple-300">
                      {remaining}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {dispatch.unitWholesalePrice} {settings.currencySymbol}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {(dispatch.totalWholesaleValue ?? 0).toLocaleString()} {settings.currencySymbol}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {dispatch.serialStart && dispatch.serialEnd ? (
                        <span>{dispatch.serialStart} ➔ {dispatch.serialEnd}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {dispatch.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedDispatchForReceipt(dispatch)}
                          className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded text-[11px] font-semibold border border-indigo-500/30 transition flex items-center gap-1"
                          title="طباعة سند التسليم أو تصدير PDF"
                        >
                          <Printer className="w-3 h-3 text-indigo-400" />
                          <span>سند</span>
                        </button>
                        {remaining > 0 && (
                          <button
                            onClick={() =>
                              setReturnModalState({
                                isOpen: true,
                                dispatch,
                                returnQty: 1,
                              })
                            }
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded text-[11px] font-semibold border border-amber-500/30 transition flex items-center gap-1"
                            title="إرجاع كروت غير مباعة للمستودع"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>مرتجع</span>
                          </button>
                        )}
                        {onUpdateDispatch && (
                          <button
                            onClick={() => handleOpenEditModal(dispatch)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                            title="تعديل الدفعة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteDispatch && (
                          <button
                            onClick={() => setDeletingDispatch(dispatch)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="حذف الدفعة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">لا توجد دفعات كروت مسجلة</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <span>{editingDispatch ? 'تعديل دفعة الكروت' : 'تسليم دفعة كروت جديدة لنقطة بيع'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    تاريخ التسليم:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    نقطة البيع المستلمة <span className="text-rose-400">*</span>:
                  </label>
                  <select
                    required
                    value={formData.posPointId}
                    onChange={(e) => setFormData({ ...formData, posPointId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {posPoints.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name} - (المسؤول: {pos.managerName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    فئة الكارت <span className="text-rose-400">*</span>:
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (المستودع: {cat.warehouseStock} كارت)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الكمية المسلمة (كارت) <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="10"
                    value={formData.quantity === 0 ? '' : formData.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, quantity: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {[10, 25, 50, 100, 200].map((quickVal) => (
                      <button
                        key={quickVal}
                        type="button"
                        onClick={() => setFormData({ ...formData, quantity: quickVal })}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                          formData.quantity === quickVal
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {quickVal} كارت
                      </button>
                    ))}
                  </div>
                  {selectedCategory && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      الرصيد المتاح في المستودع: {selectedCategory.warehouseStock} كارت
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    من تسلسلي (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10001"
                    value={formData.serialStart}
                    onChange={(e) => setFormData({ ...formData, serialStart: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    إلى تسلسلي (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10050"
                    value={formData.serialEnd}
                    onChange={(e) => setFormData({ ...formData, serialEnd: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {selectedCategory && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">سعر التوريد:</span>
                    <div className="font-mono font-bold text-indigo-300">
                      {selectedCategory.wholesalePrice} {settings.currencySymbol} / كارت
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-400">إجمالي قيمة الدفعة:</span>
                    <div className="font-mono font-bold text-amber-400 text-sm">
                      {((selectedCategory.wholesalePrice || 0) * (formData.quantity || 0)).toLocaleString()} {settings.currencySymbol}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات:
                </label>
                <input
                  type="text"
                  placeholder="ملاحظات التسليم..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition"
                >
                  {editingDispatch ? 'حفظ التعديلات' : 'تأكيد تسليم الدفعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Cards Modal */}
      {returnModalState.isOpen && returnModalState.dispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>إرجاع كروت إلى المستودع</span>
            </h3>

            <p className="text-xs text-slate-300">
              أدخل عدد الكروت غير المباعة التي ترغب بإرجاعها من نقطة البيع إلى رصيد المستودع:
            </p>

            <div>
              <label className="block text-slate-400 text-xs mb-1">الكمية المرتجعة:</label>
              <input
                type="number"
                min="1"
                max={returnModalState.dispatch.quantity - (returnModalState.dispatch.soldCount || 0)}
                placeholder="1"
                value={returnModalState.returnQty === 0 ? '' : returnModalState.returnQty}
                onChange={(e) => {
                  const v = e.target.value;
                  setReturnModalState({
                    ...returnModalState,
                    returnQty: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0),
                  });
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                أقصى كمية مسموح إرجاعها: {returnModalState.dispatch.quantity - (returnModalState.dispatch.soldCount || 0)} كارت
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReturnModalState({ isOpen: false, dispatch: null, returnQty: 0 })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
              >
                تأكيد الإرجاع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">تأكيد حذف دفعة الكروت</h3>
            </div>
            <p className="text-xs text-slate-300">
              هل أنت متأكد من حذف هذه الدفعة المسلمة؟ سيتم إعادة الكمية ({deletingDispatch.quantity} كارت) إلى مخزون المستودع تلقائياً وتحديث كشف الحساب.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDispatch(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                نعم، احذف الدفعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Dispatch Receipt Modal (Print & PDF) */}
      {selectedDispatchForReceipt && (
        <BatchDispatchReceiptModal
          dispatch={selectedDispatchForReceipt}
          posPoints={posPoints}
          categories={categories}
          settings={settings}
          onClose={() => setSelectedDispatchForReceipt(null)}
        />
      )}
    </div>
  );
};
