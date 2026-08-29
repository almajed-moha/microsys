import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Store,
  Phone,
  MessageSquare,
  Printer,
  FileCheck,
  Send,
  Plus,
  Calendar,
  DollarSign,
  Truck,
  ArrowRight,
  UserCheck,
  Check,
} from 'lucide-react';
import {
  CardOrder,
  CardOrderItem,
  CardOrderStatus,
  CardOrderPriority,
  POSPoint,
  CardCategory,
  NetworkSettings,
  AppUser,
  InvoiceRecord,
} from '../types';

interface OrdersManagementViewProps {
  orders: CardOrder[];
  posPoints: POSPoint[];
  categories: CardCategory[];
  invoices?: InvoiceRecord[];
  settings: NetworkSettings;
  activeUser: AppUser;
  onUpdateOrderStatus: (orderId: string, status: CardOrderStatus, adminNotes?: string) => void;
  onConvertToInvoice?: (orderId: string) => void;
  onApproveAndConvertOrder?: (order: CardOrder) => void;
  onCreateOrder?: (orderData: Omit<CardOrder, 'id' | 'orderNumber' | 'timestamp' | 'status' | 'requestDate'> & { requestDate?: string; timestamp?: string }) => void;
  onCancelOrder?: (orderId: string, reason?: string) => void;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({
  orders,
  posPoints,
  categories,
  invoices = [],
  settings,
  activeUser,
  onUpdateOrderStatus,
  onConvertToInvoice,
  onApproveAndConvertOrder,
  onCreateOrder,
  onCancelOrder,
}) => {
  const handleApproveOrder = (order: CardOrder) => {
    if (onConvertToInvoice) {
      onConvertToInvoice(order.id);
    } else if (onApproveAndConvertOrder) {
      onApproveAndConvertOrder(order);
    }
  };
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingOrder, setRejectingOrder] = useState<CardOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Admin Processing Notes Modal
  const [processingOrder, setProcessingOrder] = useState<CardOrder | null>(null);
  const [processingNotes, setProcessingNotes] = useState<string>('');

  // Print Order Slip Modal
  const [printingOrder, setPrintingOrder] = useState<CardOrder | null>(null);

  // New Order Modal (Admin creates on behalf of POS)
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderPosId, setNewOrderPosId] = useState(posPoints[0]?.id || '');
  const [newOrderQuantities, setNewOrderQuantities] = useState<Record<string, number>>({});
  const [newOrderPriority, setNewOrderPriority] = useState<CardOrderPriority>('normal');
  const [newOrderNotes, setNewOrderNotes] = useState('');

  // KPIs
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const processingOrders = useMemo(() => orders.filter((o) => o.status === 'processing'), [orders]);
  const urgentOrders = useMemo(() => orders.filter((o) => o.status === 'pending' && o.priority === 'urgent'), [orders]);
  const totalPendingCards = useMemo(
    () => pendingOrders.reduce((acc, o) => acc + (o.totalQuantity || 0), 0),
    [pendingOrders]
  );
  const totalPendingValue = useMemo(
    () => pendingOrders.reduce((acc, o) => acc + (o.totalWholesaleAmount || 0), 0),
    [pendingOrders]
  );

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchPriority = priorityFilter === 'all' || order.priority === priorityFilter;
        const matchPos = selectedPosFilter === 'all' || order.posPointId === selectedPosFilter;
        const matchSearch =
          searchQuery === '' ||
          (order.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.posPointName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.posPhone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchStatus && matchPriority && matchPos && matchSearch;
      })
      .sort((a, b) => {
        // Sort urgent first, then by timestamp descending
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        return new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime();
      });
  }, [orders, statusFilter, priorityFilter, selectedPosFilter, searchQuery]);

  // Handle WhatsApp Notification to POS Point
  const handleWhatsAppPOS = (order: CardOrder, customMsg?: string) => {
    const rawNumber = (order.posPhone || '').replace(/[^0-9]/g, '');
    let fullNumber = rawNumber;
    if (!fullNumber.startsWith('967') && fullNumber.length === 9) {
      fullNumber = `967${fullNumber}`;
    }

    let text = `مرحباً ${order.posPointName || ''}\nإدارة ${settings.networkName}:\n`;
    if (customMsg) {
      text += customMsg;
    } else if (order.status === 'processing') {
      text += `تم قبول وتجهيز طلب الكروت الخاص بكم رقم: ${order.orderNumber}\nالكمية: ${order.totalQuantity || 0} كارت بقيمة ${(order.totalWholesaleAmount || 0).toLocaleString()} ${settings.currencySymbol}\nسيتم التوصيل قريباً بإذن الله.`;
    } else if (order.status === 'delivered') {
      text += `تم تسليم طلب الكروت رقم: ${order.orderNumber} بنجاح وإصدار الفاتورة.\nشكراً لتعاملكم معنا.`;
    } else {
      text += `بخصوص طلب الكروت رقم: ${order.orderNumber}\nالكمية: ${order.totalQuantity || 0} كارت.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');
  };

  // Submit Admin-created order
  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const items: CardOrderItem[] = [];
    Object.entries(newOrderQuantities).forEach(([catId, rawQty]) => {
      const qty = Number(rawQty) || 0;
      if (qty > 0) {
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
          items.push({
            categoryId: cat.id,
            categoryName: cat.name,
            quantity: qty,
            unitWholesalePrice: cat.wholesalePrice,
            totalWholesalePrice: qty * cat.wholesalePrice,
            unitRetailPrice: cat.retailPrice,
            totalRetailPrice: qty * cat.retailPrice,
          });
        }
      }
    });

    if (items.length === 0) return;

    if (onCreateOrder) {
      const pos = posPoints.find((p) => p.id === newOrderPosId);
      const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
      const totalWholesale = items.reduce((acc, i) => acc + i.totalWholesalePrice, 0);
      const totalRetail = items.reduce((acc, i) => acc + (i.totalRetailPrice || 0), 0);

      onCreateOrder({
        posPointId: newOrderPosId,
        posPointName: pos?.name || 'نقطة بيع',
        posPhone: pos?.phone,
        posAddress: pos?.address,
        items,
        totalQuantity: totalQty,
        totalWholesaleAmount: totalWholesale,
        totalRetailAmount: totalRetail,
        priority: newOrderPriority,
        notes: newOrderNotes.trim() || undefined,
        requestDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
      });
    }

    setIsNewOrderModalOpen(false);
    setNewOrderQuantities({});
    setNewOrderNotes('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <span>إدارة ومتابعة طلبات الكروت من نقاط البيع</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            استقبال طلبات المحلات والموزعين، تجهيز الكميات، وتوليد فواتير المبيعات آلياً
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل طلب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Pending Orders */}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'pending'
              ? 'bg-slate-850 border-amber-500 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>طلبات قيد الانتظار</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
            <span>{pendingOrders.length}</span>
            {urgentOrders.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                {urgentOrders.length} عاجل ⚡
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            تتطلب المراجعة والموافقة
          </div>
        </div>

        {/* Processing Orders */}
        <div
          onClick={() => setStatusFilter('processing')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'processing'
              ? 'bg-slate-850 border-blue-500 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>قيد التجهيز والتوصيل</span>
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">
            {processingOrders.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            جاري الطباعة أو مع المندوب
          </div>
        </div>

        {/* Pending Cards Quantity */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>إجمالي الكروت المطلوبة</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {(totalPendingCards ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">كارت</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            لجميع الطلبات المعلقة
          </div>
        </div>

        {/* Pending Orders Value */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>إجمالي قيمة الطلبات</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(totalPendingValue ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{settings.currencySymbol}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            سعر التوريد بالجملة
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'pending', label: 'قيد الانتظار', count: pendingOrders.length },
              { id: 'processing', label: 'قيد التجهيز', count: processingOrders.length },
              { id: 'delivered', label: 'تم التسليم', count: orders.filter((o) => o.status === 'delivered').length },
              { id: 'rejected', label: 'مرفوض', count: orders.filter((o) => o.status === 'rejected').length },
              { id: 'all', label: 'كافة الطلبات', count: orders.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-950 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* POS Filter */}
            <select
              value={selectedPosFilter}
              onChange={(e) => setSelectedPosFilter(e.target.value)}
              className="bg-slate-950 text-white text-xs font-medium rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">كافة نقاط البيع</option>
              {posPoints.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 text-white text-xs font-medium rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">كافة الأولويات</option>
              <option value="urgent">⚡ عاجلة فقط</option>
              <option value="normal">عادية</option>
              <option value="low">منخفضة</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب أو اسم المحل..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-40" />
          <p className="text-base font-bold text-slate-300">لا توجد طلبات كروت مطابقة لمعايير البحث</p>
          <p className="text-xs text-slate-500 mt-1">عند قيام أي نقطة بيع بطلب كروت ستظهر هنا فوراً.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const targetPos = posPoints.find((p) => p.id === order.posPointId);
            const currentDebt = targetPos?.currentDebt || order.currentDebtAtRequest || 0;
            const maxDebt = targetPos?.maxDebtLimit || 0;
            const isOverDebt = maxDebt > 0 && currentDebt + order.totalWholesaleAmount > maxDebt;

            return (
              <div
                key={order.id}
                className={`bg-slate-900 rounded-2xl border transition-all shadow-md ${
                  order.priority === 'urgent' && order.status === 'pending'
                    ? 'border-amber-500/60 shadow-amber-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Card Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: POS Details & Order Number */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                      <Store className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">{order.posPointName}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                          {order.orderNumber}
                        </span>

                        {order.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                            ⚡ عاجل جداً
                          </span>
                        )}

                        {order.status === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            قيد الانتظار
                          </span>
                        )}

                        {order.status === 'processing' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            قيد التجهيز
                          </span>
                        )}

                        {order.status === 'delivered' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم التسليم
                          </span>
                        )}

                        {order.status === 'rejected' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            مرفوض
                          </span>
                        )}
                      </div>

                      {/* Sub details: Phone, Address, Date */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span dir="ltr">{order.posPhone}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{order.requestDate}</span>
                        </span>
                        <span>•</span>
                        <span className="font-bold text-white">
                          الكمية: {order.totalQuantity} كارت
                        </span>
                        <span>•</span>
                        <span className="font-bold text-cyan-400">
                          القيمة: {(order.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                        </span>

                        {/* Debt warning indicator */}
                        {isOverDebt && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            ⚠️ سيتجاوز سقف الدين ({(currentDebt ?? 0).toLocaleString()} / {(maxDebt ?? 0).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                    {/* Direct WhatsApp button */}
                    <button
                      type="button"
                      onClick={() => handleWhatsAppPOS(order)}
                      className="p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 transition"
                      title="مراسلة الموزع عبر واتساب"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* Print Order Slip */}
                    <button
                      type="button"
                      onClick={() => setPrintingOrder(order)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="طباعة سند تحضير وتسليم الطلب"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Pending Actions */}
                    {order.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setProcessingOrder(order);
                            setProcessingNotes(order.adminNotes || '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>قبول وتجهيز</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveOrder(order)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>تسليم وتوليد فاتورة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingOrder(order);
                            setRejectionReason('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition"
                        >
                          رفض
                        </button>
                      </>
                    )}

                    {/* Processing Actions */}
                    {order.status === 'processing' && (
                      <button
                        type="button"
                        onClick={() => handleApproveOrder(order)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>تأكيد التسليم وإنشاء الفاتورة</span>
                      </button>
                    )}

                    {/* Toggle breakdown details */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                      title={isExpanded ? 'إخفاء التفاصيل' : 'عرض تفاصيل الفئات والملاحظات'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-4 animate-fade-in">
                    {/* Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800">
                            <th className="pb-2 font-bold">باقة الفئة</th>
                            <th className="pb-2 font-bold text-center">الكمية المطلوبة</th>
                            <th className="pb-2 font-bold text-center">سعر الجملة</th>
                            <th className="pb-2 font-bold text-center">سعر الجمهور</th>
                            <th className="pb-2 font-bold text-left">إجمالي الجملة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="text-slate-200">
                              <td className="py-2.5 font-bold text-white">{item.categoryName}</td>
                              <td className="py-2.5 text-center font-black text-cyan-400 text-sm">
                                {item.quantity} كارت
                              </td>
                              <td className="py-2.5 text-center text-slate-400">
                                {item.unitWholesalePrice} {settings.currencySymbol}
                              </td>
                              <td className="py-2.5 text-center text-slate-400">
                                {item.unitRetailPrice || '-'} {settings.currencySymbol}
                              </td>
                              <td className="py-2.5 text-left font-black text-white">
                                {(item.totalWholesalePrice ?? 0).toLocaleString()} {settings.currencySymbol}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-800 text-xs font-black">
                            <td className="pt-2.5 text-slate-300">الإجمالي العام للطلب:</td>
                            <td className="pt-2.5 text-center text-cyan-400">{order.totalQuantity || 0} كارت</td>
                            <td colSpan={2} />
                            <td className="pt-2.5 text-left text-emerald-400 text-sm">
                              {(order.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Notes & Address Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">موقع وعنوان التوصيل:</span>
                        <p className="text-slate-200">{order.posAddress || 'غير محدد'}</p>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-bold block mb-1">ملاحظات نقطة البيع:</span>
                        <p className="text-slate-300">{order.notes || 'لا توجد ملاحظات خاصة'}</p>
                      </div>

                      <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                        <span className="text-indigo-300 font-bold block mb-1">ملاحظات ورد الإدارة:</span>
                        <p className="text-slate-200">{order.adminNotes || 'لم يتم تسجيل رد بعد'}</p>
                        {order.convertedInvoiceId && (
                          <div className="mt-2 text-emerald-400 font-bold">
                            مرتبط بالفاتورة: {order.convertedInvoiceId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Reject Order */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <span>رفض طلب الكروت: {rejectingOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setRejectingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              نقطة البيع: <strong className="text-white">{rejectingOrder.posPointName}</strong>
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">سبب الرفض (سيظهر للموزع):</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: تجاوز سقف المديونية المسموح بها، يرجى توريد دفعة نقدية أولاً..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateOrderStatus(rejectingOrder.id, 'rejected', rejectionReason.trim() || 'تم رفض الطلب من قبل الإدارة.');
                  setRejectingOrder(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Processing with Notes */}
      {processingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <span>قبول وتجهيز الطلب: {processingOrder.orderNumber}</span>
              </h3>
              <button
                onClick={() => setProcessingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              سيتم تغيير حالة الطلب إلى &quot;قيد التجهيز&quot; وإشعار الموزع بذلك.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">ملاحظات التجهيز والتوصيل:</label>
              <textarea
                rows={3}
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="مثال: جاري الطباعة وسيقوم المندوب سالم بتسليمها عصراً..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProcessingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateOrderStatus(processingOrder.id, 'processing', processingNotes.trim() || 'جاري تجهيز وطباعة الكروت للتوصيل.');
                  setProcessingOrder(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30"
              >
                حفظ وبدء التجهيز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Print Delivery & Order Slip */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span>سند تحضير وتسليم طلب كروت</span>
              </h3>
              <button
                onClick={() => setPrintingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Printable Area */}
            <div className="bg-white text-slate-900 p-5 rounded-xl text-xs space-y-4 font-sans print-area">
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-base font-black">{settings.networkName}</h2>
                <p className="text-[11px] text-slate-600">سند تحضير وتوصيل كروت شبكة</p>
                <div className="font-mono text-xs font-black bg-slate-100 py-1 rounded inline-block px-3">
                  {printingOrder.orderNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">نقطة البيع:</span>
                  <strong className="font-bold text-slate-900">{printingOrder.posPointName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">التاريخ:</span>
                  <strong className="font-bold text-slate-900">{printingOrder.requestDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">الهاتف:</span>
                  <strong className="font-bold text-slate-900" dir="ltr">{printingOrder.posPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">العنوان:</span>
                  <span className="text-slate-700">{printingOrder.posAddress || '-'}</span>
                </div>
              </div>

              <table className="w-full text-right border-t border-b py-2 text-[11px]">
                <thead>
                  <tr className="border-b font-bold text-slate-700">
                    <th className="pb-1.5">الفئة</th>
                    <th className="pb-1.5 text-center">الكمية</th>
                    <th className="pb-1.5 text-center">سعر الجملة</th>
                    <th className="pb-1.5 text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {printingOrder.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5">{it.categoryName}</td>
                      <td className="py-1.5 text-center font-bold">{it.quantity}</td>
                      <td className="py-1.5 text-center">{it.unitWholesalePrice}</td>
                      <td className="py-1.5 text-left font-bold">{(it.totalWholesalePrice ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-black">
                    <td className="pt-2">الإجمالي:</td>
                    <td className="pt-2 text-center">{printingOrder.totalQuantity || 0} كارت</td>
                    <td />
                    <td className="pt-2 text-left">{(printingOrder.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}</td>
                  </tr>
                </tfoot>
              </table>

              {printingOrder.notes && (
                <div className="text-[10px] bg-slate-50 p-2 rounded border text-slate-700">
                  <strong>ملاحظات الموزع:</strong> {printingOrder.notes}
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] border-t">
                <div>
                  <p className="text-slate-500 mb-6">توقيع مسؤول التسليم / المندوب</p>
                  <p className="border-b border-dashed border-slate-400 mx-4" />
                </div>
                <div>
                  <p className="text-slate-500 mb-6">توقيع وختم مستلم المحل</p>
                  <p className="border-b border-dashed border-slate-400 mx-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Order on Behalf of POS */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>تسجيل طلب كروت جديد لنقطة بيع</span>
              </h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-4 text-xs">
              {/* Choose POS */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-300">نقطة البيع:</label>
                <select
                  value={newOrderPosId}
                  onChange={(e) => setNewOrderPosId(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl p-2.5 border border-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                >
                  {posPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} ({pos.managerName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantities per category */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-300">الكميات المطلوبة لكل فئة:</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white">{cat.name}</p>
                        <p className="text-[10px] text-slate-400">سعر الجملة: {cat.wholesalePrice} {settings.currencySymbol}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={newOrderQuantities[cat.id] || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setNewOrderQuantities((prev) => ({
                              ...prev,
                              [cat.id]: val,
                            }));
                          }}
                          placeholder="0"
                          className="w-20 bg-slate-900 border border-slate-700 text-white text-center font-bold rounded-lg py-1 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-slate-400">كارت</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-300">الأولوية:</label>
                <select
                  value={newOrderPriority}
                  onChange={(e) => setNewOrderPriority(e.target.value as CardOrderPriority)}
                  className="w-full bg-slate-950 text-white rounded-xl p-2.5 border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="normal">عادية</option>
                  <option value="urgent">⚡ عاجلة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-300">ملاحظات:</label>
                <textarea
                  rows={2}
                  value={newOrderNotes}
                  onChange={(e) => setNewOrderNotes(e.target.value)}
                  placeholder="ملاحظات الموزع أو تعليمات التوصيل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30"
                >
                  حفظ وتسجيل الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
