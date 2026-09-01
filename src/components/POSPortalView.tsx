import React, { useState, useMemo, useEffect } from 'react';
import {
  Store,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Send,
  FileText,
  DollarSign,
  TrendingUp,
  Phone,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Truck,
  XCircle,
  Calendar,
  CreditCard,
  Printer,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { POSPoint, CardCategory, CardOrder, CardOrderItem, CardOrderPriority, InvoiceRecord, PaymentRecord, NetworkSettings, AppUser } from '../types';
import { isDateInPeriod } from '../utils/financialCalculations';

interface POSPortalViewProps {
  activeUser: AppUser;
  posPoints: POSPoint[];
  categories: CardCategory[];
  orders: CardOrder[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  settings: NetworkSettings;
  onCreateOrder: (orderData: {
    posPointId: string;
    posPointName?: string;
    posPhone?: string;
    posAddress?: string;
    posManagerName?: string;
    currentDebtAtRequest?: number;
    totalQuantity?: number;
    totalWholesaleAmount?: number;
    totalRetailAmount?: number;
    items: CardOrderItem[];
    priority: CardOrderPriority;
    notes?: string;
    requestDate?: string;
    timestamp?: string;
  }) => void;
  onCancelOrder: (orderId: string) => void;
  onOpenStatementModal?: (posPoint: POSPoint) => void;
}

export const POSPortalView: React.FC<POSPortalViewProps> = ({
  activeUser,
  posPoints,
  categories,
  orders,
  invoices,
  payments,
  settings,
  onCreateOrder,
  onCancelOrder,
  onOpenStatementModal,
}) => {
  // Determine currently selected POS Point
  const defaultPosId = activeUser.posPointId || posPoints[0]?.id || '';
  const [selectedPosId, setSelectedPosId] = useState<string>(defaultPosId);

  // Sync selectedPosId if user or posPoints update
  useEffect(() => {
    if (activeUser.posPointId) {
      setSelectedPosId(activeUser.posPointId);
    } else if (posPoints.length > 0 && (!selectedPosId || !posPoints.some((p) => p.id === selectedPosId))) {
      setSelectedPosId(posPoints[0].id);
    }
  }, [activeUser.posPointId, posPoints, selectedPosId]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'new_order' | 'my_orders' | 'statement' | 'support'>('new_order');

  // New Order State
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priority, setPriority] = useState<CardOrderPriority>('normal');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Profit calculation state
  const [profitTimeRange, setProfitTimeRange] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('30days');
  const [profitStartDate, setProfitStartDate] = useState('');
  const [profitEndDate, setProfitEndDate] = useState('');

  // Filter & Search states in My Orders
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Find target POS Point
  const currentPos = useMemo(() => {
    return posPoints.find((p) => p.id === selectedPosId) || posPoints[0] || null;
  }, [posPoints, selectedPosId]);

  // Filter orders for this POS point
  const posOrders = useMemo(() => {
    if (!currentPos) return [];
    return orders
      .filter((o) => o.posPointId === currentPos.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, currentPos]);

  // Filtered orders list based on status & search
  const filteredOrders = useMemo(() => {
    return posOrders.filter((order) => {
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchSearch =
        searchQuery === '' ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.items.some((i) => i.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [posOrders, statusFilter, searchQuery]);

  // POS specific invoices & payments
  const posInvoices = useMemo(() => {
    if (!currentPos) return [];
    return invoices
      .filter((inv) => inv.posPointId === currentPos.id && inv.status !== 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, currentPos]);

  const posPayments = useMemo(() => {
    if (!currentPos) return [];
    return payments
      .filter((p) => p.posPointId === currentPos.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, currentPos]);

  // Calculation of current order draft
  const orderItemsList = useMemo<CardOrderItem[]>(() => {
    const items: CardOrderItem[] = [];
    Object.entries(quantities).forEach(([catId, rawQty]) => {
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
    return items;
  }, [quantities, categories]);

  const totalOrderQty = orderItemsList.reduce((acc, item) => acc + item.quantity, 0);
  const totalOrderWholesale = orderItemsList.reduce((acc, item) => acc + item.totalWholesalePrice, 0);
  const totalOrderRetail = orderItemsList.reduce((acc, item) => acc + (item.totalRetailPrice || 0), 0);
  const totalOrderExpectedProfit = totalOrderRetail - totalOrderWholesale;

  // Real-time Dynamic Debt calculations from transactions
  const realTimeDebt = useMemo(() => {
    if (!currentPos) return 0;
    const totalSales = posInvoices.filter((i) => i.type === 'sale').reduce((sum, i) => sum + (Number(i.totalWholesaleAmount) || 0), 0);
    const totalReturns = posInvoices.filter((i) => i.type === 'return').reduce((sum, i) => sum + (Number(i.totalWholesaleAmount) || 0), 0);
    const totalPaid = posPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    if (posInvoices.length > 0 || posPayments.length > 0) {
      return Math.max(0, (totalSales - totalReturns) - totalPaid);
    }
    return Number(currentPos.currentDebt || 0);
  }, [currentPos, posInvoices, posPayments]);

  const realTimePaid = useMemo(() => {
    if (!currentPos) return 0;
    if (posPayments.length > 0) {
      return posPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }
    return Number(currentPos.totalCashPaid || 0);
  }, [currentPos, posPayments]);

  const currentDebt = realTimeDebt;
  const maxDebt = currentPos?.maxDebtLimit || 0;
  const remainingDebtAllowance = Math.max(0, maxDebt - currentDebt);
  const isOverDebtLimit = maxDebt > 0 && currentDebt + totalOrderWholesale > maxDebt;

  const totalDeliveredCards = useMemo(() => {
    let delivered = 0;
    posInvoices.forEach(inv => {
      if (inv.type === 'sale') {
        inv.items.forEach(item => delivered += Number(item.quantity) || 0);
      } else if (inv.type === 'return') {
        inv.items.forEach(item => delivered -= Number(item.quantity) || 0);
      }
    });
    return Math.max(0, delivered);
  }, [posInvoices]);

  const posProfitMetrics = useMemo(() => {
    if (!currentPos) return { deliveredCards: 0, potentialProfit: 0, totalRetail: 0 };
    
    const filteredInvoices = posInvoices.filter((inv) => {
        return isDateInPeriod(inv.date, profitTimeRange === '30days' ? 'month' : profitTimeRange, profitStartDate, profitEndDate);
    });

    let deliveredCards = 0;
    let potentialProfit = 0;
    let totalRetail = 0;

    filteredInvoices.forEach(inv => {
      if (inv.type === 'sale') {
        inv.items.forEach(item => {
           deliveredCards += (Number(item.quantity) || 0);
           const wholesale = Number(item.totalWholesalePrice) || 0;
           const retail = Number(item.totalRetailPrice) || 0;
           potentialProfit += (retail - wholesale);
           totalRetail += retail;
        });
      } else if (inv.type === 'return') {
        inv.items.forEach(item => {
           deliveredCards -= (Number(item.quantity) || 0);
           const wholesale = Number(item.totalWholesalePrice) || 0;
           const retail = Number(item.totalRetailPrice) || 0;
           potentialProfit -= (retail - wholesale);
           totalRetail -= retail;
        });
      }
    });

    return {
      deliveredCards: Math.max(0, deliveredCards),
      potentialProfit,
      totalRetail: Math.max(0, totalRetail)
    };
  }, [currentPos, posInvoices, profitTimeRange, profitStartDate, profitEndDate]);

  // Quantity controls
  const handleQuantityChange = (catId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setQuantities((prev) => ({
      ...prev,
      [catId]: safeVal,
    }));
  };

  const handleIncrement = (catId: string, step = 10) => {
    setQuantities((prev) => ({
      ...prev,
      [catId]: (prev[catId] || 0) + step,
    }));
  };

  const handleDecrement = (catId: string, step = 10) => {
    setQuantities((prev) => ({
      ...prev,
      [catId]: Math.max(0, (prev[catId] || 0) - step),
    }));
  };

  const handleClearQuantities = () => {
    setQuantities({});
    setOrderNotes('');
    setPriority('normal');
  };

  // Submit Order with complete POS details
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPos || orderItemsList.length === 0) return;

    setIsSubmitting(true);

    try {
      onCreateOrder({
        posPointId: currentPos.id,
        posPointName: currentPos.name,
        posPhone: currentPos.phone,
        posAddress: currentPos.address,
        posManagerName: currentPos.managerName,
        currentDebtAtRequest: currentDebt,
        totalQuantity: totalOrderQty,
        totalWholesaleAmount: totalOrderWholesale,
        totalRetailAmount: totalOrderRetail,
        items: orderItemsList,
        priority,
        notes: orderNotes.trim() || undefined,
        requestDate: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
      });

      setSubmitSuccess('تم إرسال طلب الكروت بنجاح إلى إدارة الشبكة!');
      handleClearQuantities();
      setActiveTab('my_orders');

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Message Link
  const handleWhatsAppSupport = (order?: CardOrder) => {
    const rawNumber = (settings.whatsappNumber || settings.supportPhone || '770123456').replace(/[^0-9]/g, '');
    let fullNumber = rawNumber;
    if (!fullNumber.startsWith('967') && fullNumber.length === 9) {
      fullNumber = `967${fullNumber}`;
    }

    let text = `مرحباً إدارة ${settings.networkName}\nأنا الموزع: ${currentPos?.name || ''} (${currentPos?.managerName || ''})\n`;
    if (order) {
      text += `بخصوص طلب الكروت رقم: ${order.orderNumber}\nالكمية: ${order.totalQuantity || 0} كارت بقيمة ${(order.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}\nالحالة: ${order.status === 'pending' ? 'قيد الانتظار' : order.status}\nملاحظات: ${order.notes || 'لا يوجد'}`;
    } else {
      text += `رصيد المديونية الحالية: ${(currentDebt ?? 0).toLocaleString()} ${settings.currencySymbol}\nأود الاستفسار بخصوص طلب كروت جديدة ومتابعة الحساب.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${fullNumber}?text=${encoded}`, '_blank');
  };

  if (!currentPos) {
    return (
      <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
        <Store className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-40" />
        <p className="text-lg font-bold text-slate-200">لا توجد نقاط بيع مسجلة حالياً</p>
        <p className="text-sm text-slate-400 mt-1">يرجى تسجيل نقاط بيع في النظام أولاً.</p>
      </div>
    );
  }

  const isSuperAdminOrManager = activeUser.role === 'super_admin' || activeUser.role === 'accountant' || activeUser.role === 'sales_agent';

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Banner & POS Selector */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Shop Information */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 shrink-0">
              <Store className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{currentPos.name}</h1>
                <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  نشطة
                </span>
                {isSuperAdminOrManager && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    وضع المعاينة الإدارية
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-300 flex flex-wrap items-center gap-3">
                <span>المسؤول: <strong className="text-white">{currentPos.managerName}</strong></span>
                <span className="text-slate-600">•</span>
                <span>الهاتف: <strong className="text-slate-200" dir="ltr">{currentPos.phone}</strong></span>
                {currentPos.address && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 truncate max-w-xs">{currentPos.address}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions & Shop Switcher (if Admin/Sales) */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isSuperAdminOrManager && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-400 whitespace-nowrap">التبديل بين المحلات:</span>
                <select
                  value={selectedPosId}
                  onChange={(e) => {
                    setSelectedPosId(e.target.value);
                    handleClearQuantities();
                  }}
                  className="bg-slate-900 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  {posPoints.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} ({pos.managerName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => handleWhatsAppSupport()}
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition text-xs font-bold"
              title="تواصل مباشر مع الإدارة عبر واتساب"
            >
              <MessageSquare className="w-4 h-4" />
              <span>واتساب الإدارة</span>
            </button>

            {settings.supportPhone && (
              <a
                href={`tel:${settings.supportPhone}`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition text-xs font-bold"
                title="اتصال هاتفي بالدعم"
              >
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>اتصال</span>
              </a>
            )}

            {onOpenStatementModal && (
              <button
                onClick={() => onOpenStatementModal(currentPos)}
                type="button"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition text-xs font-bold"
              >
                <Printer className="w-4 h-4" />
                <span>كشف الحساب</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Current Debt */}
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between text-sm font-medium text-slate-400 mb-2">
              <span>المديونية الحالية</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {(currentDebt ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currencySymbol}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              سقف الدين: {maxDebt > 0 ? `${(maxDebt ?? 0).toLocaleString()} ${settings.currencySymbol}` : 'مفتوح'}
            </div>
          </div>

          {/* Remaining Debt Capacity */}
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between text-sm font-medium text-slate-400 mb-2">
              <span>المتبقي حتى السقف</span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${remainingDebtAllowance > 0 ? 'text-slate-200' : 'text-rose-400'}`}>
              {maxDebt > 0 ? (remainingDebtAllowance ?? 0).toLocaleString() : 'غير محدود'} <span className="text-xs font-normal text-slate-500">{settings.currencySymbol}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  maxDebt > 0 && currentDebt / maxDebt > 0.85
                    ? 'bg-rose-500'
                    : maxDebt > 0 && currentDebt / maxDebt > 0.5
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${maxDebt > 0 ? Math.min(100, (currentDebt / maxDebt) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Cards Delivered */}
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between text-sm font-medium text-slate-400 mb-2">
              <span>إجمالي الاستلامات (تاريخياً)</span>
            </div>
            <div className="text-2xl font-bold text-slate-200 tracking-tight">
              {totalDeliveredCards.toLocaleString()} <span className="text-xs font-normal text-slate-500">كارت</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              حسب فواتير المبيعات
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center justify-between text-sm font-medium text-slate-400 mb-2">
              <span>المدفوعات نقداً</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {(currentPos.totalCashPaid || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currencySymbol}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              سندات القبض: {posPayments.length} سند
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold text-sm">{submitSuccess}</p>
              <p className="text-xs text-emerald-300/80">سيتم تجهيز الكروت وإرسالها لك في أقرب وقت.</p>
            </div>
          </div>
          <button
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-400 hover:text-emerald-300 p-1"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('new_order')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shrink-0 ${
            activeTab === 'new_order'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلب كروت جديدة</span>
          {totalOrderQty > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-indigo-700 text-xs font-black flex items-center justify-center">
              {totalOrderQty}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('my_orders')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shrink-0 ${
            activeTab === 'my_orders'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل ومتابعة الطلبات</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-bold">
            {posOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('statement')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shrink-0 ${
            activeTab === 'statement'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>فواتيري ومدفوعاتي</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-bold">
            {posInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          type="button"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition shrink-0 ${
            activeTab === 'support'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>دعم ومعلومات الموزع</span>
        </button>
      </div>

      {/* Tab 1: New Card Order Form */}
      {activeTab === 'new_order' && (
        <form onSubmit={handleSubmitOrder} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories Selection List (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <span>اختر فئات وكميات الكروت المطلوبة</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    حدد الكمية التي تريد طلبها لكل فئة من باقات الكروت المتوفرة
                  </p>
                </div>

                {totalOrderQty > 0 && (
                  <button
                    type="button"
                    onClick={handleClearQuantities}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold hover:underline"
                  >
                    تصفير الاختيارات
                  </button>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const qty = quantities[cat.id] || 0;
                  const profitPerCard = cat.retailPrice - cat.wholesalePrice;

                  return (
                    <div
                      key={cat.id}
                      className={`relative rounded-xl border transition-all p-5 ${
                        qty > 0
                          ? 'bg-slate-850 border-indigo-500 shadow-sm'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <h3 className="font-bold text-base text-white tracking-tight">{cat.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-medium">
                              الوقت: {cat.uptimeLimit}
                            </span>
                            <span className="text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-medium">
                              الرصيد: {cat.quotaLimit}
                            </span>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-xs font-medium text-slate-400 block mb-1">سعر الجمهور</span>
                          <span className="text-lg font-bold text-white tracking-tight">
                            {cat.retailPrice} <span className="text-xs font-normal text-slate-500">{settings.currencySymbol}</span>
                          </span>
                        </div>
                      </div>

                      {/* Pricing and Margins Box */}
                      <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center justify-between mb-5 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs mb-1 block">سعر الجملة</span>
                          <div className="font-medium text-slate-300">
                            {cat.wholesalePrice} {settings.currencySymbol}
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="text-slate-400 text-xs mb-1 block">ربحك في الكارت</span>
                          <div className="font-bold text-emerald-400 flex items-center justify-end gap-1">
                            <span>+{profitPerCard} {settings.currencySymbol}</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Quantity Stepper */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDecrement(cat.id, 10)}
                            disabled={qty === 0}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold flex items-center justify-center transition"
                            title="إنقاص 10"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => handleQuantityChange(cat.id, parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-16 h-8 text-center font-black text-white bg-slate-950 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                          />

                          <button
                            type="button"
                            onClick={() => handleIncrement(cat.id, 10)}
                            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition shadow-xs"
                            title="زيادة 10"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1">
                          {[20, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleQuantityChange(cat.id, preset)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                                qty === preset
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              +{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary & Submit Panel (1 Col) */}
            <div className="space-y-4">
              <div className="sticky top-20 bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <span>ملخص سلة الطلب</span>
                </h3>

                {/* Items List in Summary */}
                {orderItemsList.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">لم يتم اختيار أي كروت بعد</p>
                    <p className="text-[11px] text-slate-600 mt-1">اضغط + على الفئات لإضافتها للطلب</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {orderItemsList.map((item) => (
                      <div
                        key={item.categoryId}
                        className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="overflow-hidden pr-1">
                          <p className="font-bold text-white truncate">{item.categoryName}</p>
                          <p className="text-[11px] text-slate-400">
                            {item.quantity} كارت × {item.unitWholesalePrice} {settings.currencySymbol}
                          </p>
                        </div>

                        <div className="text-left font-black text-cyan-400 shrink-0">
                          {(item.totalWholesalePrice ?? 0).toLocaleString()} {settings.currencySymbol}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals Breakdown */}
                {orderItemsList.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>إجمالي عدد الكروت:</span>
                      <strong className="text-white text-sm font-black">{totalOrderQty} كارت</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span>إجمالي القيمة بالجملة:</span>
                      <strong className="text-cyan-400 text-sm font-black">
                        {(totalOrderWholesale ?? 0).toLocaleString()} {settings.currencySymbol}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span>إجمالي المبيعات المتوقعة:</span>
                      <span className="text-white font-bold">
                        {(totalOrderRetail ?? 0).toLocaleString()} {settings.currencySymbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      <span>صافي ربح نقطة البيع:</span>
                      <span>+{(totalOrderExpectedProfit ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                    </div>

                    {/* Debt Ceiling Warning */}
                    {isOverDebtLimit && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>تنبيه سقف المديونية</span>
                        </div>
                        <p className="text-[11px] text-amber-300/80 leading-relaxed">
                          قيمة هذا الطلب بالإضافة للمديونية السابقة ({(currentDebt ?? 0).toLocaleString()}) ستتجاوز سقف الدين المحدد ({(maxDebt ?? 0).toLocaleString()} {settings.currencySymbol}).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Priority Selection */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-300">درجة أولوية الطلب:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'normal' as CardOrderPriority, label: 'عادية', color: 'text-slate-200' },
                      { id: 'urgent' as CardOrderPriority, label: '⚡ عاجلة', color: 'text-amber-400 font-bold' },
                      { id: 'low' as CardOrderPriority, label: 'منخفضة', color: 'text-slate-400' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`py-1.5 text-xs rounded-lg border transition font-medium ${
                          priority === p.id
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-xs'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className={p.color}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">ملاحظات أو توجيهات للمندوب:</label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="مثال: يرجى التوصيل بعد العصر، كروت فئة 100 أوشكت على النفاد..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={orderItemsList.length === 0 || isSubmitting}
                  className="w-full py-4 px-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال الطلب'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Orders History & Tracking */}
      {activeTab === 'my_orders' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'pending', label: 'قيد الانتظار' },
                { id: 'processing', label: 'قيد التجهيز' },
                { id: 'delivered', label: 'تم التسليم' },
                { id: 'rejected', label: 'مرفوض' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب أو الفئة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 text-slate-600 opacity-40" />
              <p className="text-base font-bold text-slate-300">لا توجد طلبات تطابق هذا البحث</p>
              <p className="text-xs text-slate-500 mt-1">يمكنك تقديم طلب جديد من تبويب &quot;طلب كروت جديدة&quot;.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;

                // Status Badge Color & Icon
                const getStatusMeta = (status: string) => {
                  switch (status) {
                    case 'pending':
                      return {
                        label: 'قيد الانتظار والمراجعة',
                        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                        icon: Clock,
                      };
                    case 'processing':
                      return {
                        label: 'جاري التجهيز والطباعة',
                        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                        icon: RefreshCw,
                      };
                    case 'delivered':
                      return {
                        label: 'تم التسليم والفاتورة جاهزة',
                        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                        icon: CheckCircle2,
                      };
                    case 'rejected':
                      return {
                        label: 'تم رفض الطلب',
                        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                        icon: XCircle,
                      };
                    default:
                      return {
                        label: status,
                        bg: 'bg-slate-800 text-slate-300 border-slate-700',
                        icon: Info,
                      };
                  }
                };

                const statusMeta = getStatusMeta(order.status);
                const StatusIcon = statusMeta.icon;

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden transition-all shadow-md hover:border-slate-700"
                  >
                    {/* Header Row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${statusMeta.bg}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm tracking-wide">{order.orderNumber}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.bg}`}>
                              {statusMeta.label}
                            </span>
                            {order.priority === 'urgent' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                ⚡ عاجل
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{order.requestDate}</span>
                            </span>
                            <span>•</span>
                            <span>{order.totalQuantity || 0} كارت</span>
                            <span>•</span>
                            <span className="font-bold text-cyan-400">
                              {(order.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppSupport(order)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition"
                          title="متابعة عبر واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">واتساب</span>
                        </button>

                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                                onCancelOrder(order.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition"
                          >
                            إلغاء
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <span>{isExpanded ? 'إخفاء التفاصيل' : 'التفاصيل'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Order Breakdown */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-3 animate-fade-in">
                        {/* Order Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800">
                                <th className="pb-2 font-bold">الفئة</th>
                                <th className="pb-2 font-bold text-center">الكمية</th>
                                <th className="pb-2 font-bold text-center">سعر الجملة</th>
                                <th className="pb-2 font-bold text-left">الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {order.items.map((item, idx) => (
                                <tr key={idx} className="text-slate-200">
                                  <td className="py-2 font-medium">{item.categoryName}</td>
                                  <td className="py-2 text-center font-black text-white">{item.quantity}</td>
                                  <td className="py-2 text-center text-slate-400">{item.unitWholesalePrice} {settings.currencySymbol}</td>
                                  <td className="py-2 text-left font-black text-cyan-400">
                                    {(item.totalWholesalePrice ?? 0).toLocaleString()} {settings.currencySymbol}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Notes and Admin Response */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {order.notes && (
                            <div className="bg-slate-900 rounded-xl p-2.5 border border-slate-800 text-xs">
                              <span className="text-slate-400 font-bold block mb-0.5">ملاحظاتك:</span>
                              <p className="text-slate-300">{order.notes}</p>
                            </div>
                          )}

                          {order.adminNotes && (
                            <div className="bg-indigo-950/40 rounded-xl p-2.5 border border-indigo-800/40 text-xs">
                              <span className="text-indigo-300 font-bold block mb-0.5">رد الإدارة:</span>
                              <p className="text-slate-200">{order.adminNotes}</p>
                            </div>
                          )}
                        </div>

                        {order.convertedInvoiceId && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                            <span>تم ربط الطلب بفاتورة المبيعات رقم: <strong className="font-black text-white">{order.convertedInvoiceId}</strong></span>
                            <span className="text-[11px] text-emerald-300">تم التوريد للمحل</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Statements, Invoices & Payments */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Profit Analytics Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <span>تحليل الأرباح والمبيعات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  إجمالي الربح المحتمل بناءً على الكروت المستلمة (فواتير المبيعات مطروحاً منها المرتجعات)
                </p>
              </div>

              {/* Time Range Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'today', label: 'اليوم' },
                  { id: '7days', label: '7 أيام' },
                  { id: '30days', label: 'شهر' },
                  { id: 'all', label: 'الكل' },
                  { id: 'custom', label: 'مخصص' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProfitTimeRange(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      profitTimeRange === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            {profitTimeRange === 'custom' && (
              <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">من:</label>
                  <input
                    type="date"
                    value={profitStartDate}
                    onChange={(e) => setProfitStartDate(e.target.value)}
                    className="bg-slate-900 text-white text-sm rounded-lg border border-slate-700 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">إلى:</label>
                  <input
                    type="date"
                    value={profitEndDate}
                    onChange={(e) => setProfitEndDate(e.target.value)}
                    className="bg-slate-900 text-white text-sm rounded-lg border border-slate-700 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-800">
              <div className="p-5">
                <span className="text-xs font-medium text-slate-400 block mb-2">إجمالي الكروت المستلمة (للفترة)</span>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {posProfitMetrics.deliveredCards.toLocaleString()} <span className="text-sm font-normal text-slate-500">كارت</span>
                </div>
              </div>
              <div className="p-5">
                <span className="text-xs font-medium text-slate-400 block mb-2">قيمة المبيعات (سعر الجمهور)</span>
                <div className="text-3xl font-bold text-blue-400 tracking-tight">
                  {posProfitMetrics.totalRetail.toLocaleString()} <span className="text-sm font-normal text-slate-500">{settings.currencySymbol}</span>
                </div>
              </div>
              <div className="p-5 bg-emerald-500/5">
                <span className="text-xs font-medium text-emerald-400 block mb-2">صافي الربح المقدر</span>
                <div className="text-3xl font-bold text-emerald-400 tracking-tight">
                  {posProfitMetrics.potentialProfit.toLocaleString()} <span className="text-sm font-normal text-emerald-500/70">{settings.currencySymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1">الرصيد المستحق الحالي</span>
              <div className="text-2xl font-black text-amber-400">
                {(currentDebt ?? 0).toLocaleString()} <span className="text-sm font-normal text-slate-400">{settings.currencySymbol}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">إجمالي الفواتير المسجلة</span>
              <div className="text-2xl font-black text-white">
                {posInvoices.length} <span className="text-sm font-normal text-slate-400">فاتورة</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">إجمالي المقبوضات المسددة</span>
              <div className="text-2xl font-black text-emerald-400">
                {(currentPos.totalCashPaid || 0).toLocaleString()} <span className="text-sm font-normal text-slate-400">{settings.currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>فواتير التسليم والمرتجع</span>
            </h3>

            {posInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                لا توجد فواتير مسجلة لنقطة البيع بعد.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-bold">رقم الفاتورة</th>
                      <th className="pb-3 font-bold">النوع</th>
                      <th className="pb-3 font-bold">التاريخ</th>
                      <th className="pb-3 font-bold text-center">الكمية</th>
                      <th className="pb-3 font-bold text-left">المبلغ بالجملة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {posInvoices.map((inv) => (
                      <tr key={inv.id} className="text-slate-200">
                        <td className="py-3 font-black text-white">{inv.invoiceNumber}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.type === 'sale'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {inv.type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مرتجع'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{inv.date}</td>
                        <td className="py-3 text-center font-bold text-white">{inv.totalQuantity} كارت</td>
                        <td className="py-3 text-left font-black text-cyan-400">
                          {(inv.totalWholesaleAmount ?? 0).toLocaleString()} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments List */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="font-black text-base text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>سجل سندات القبض والدفعات المسددة</span>
            </h3>

            {posPayments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                لا توجد سندات قبض مسجلة حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-3 font-bold">رقم السند</th>
                      <th className="pb-3 font-bold">التاريخ</th>
                      <th className="pb-3 font-bold">طريقة الدفع</th>
                      <th className="pb-3 font-bold">المستلم</th>
                      <th className="pb-3 font-bold text-left">المبلغ المقبوض</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {posPayments.map((p) => (
                      <tr key={p.id} className="text-slate-200">
                        <td className="py-3 font-black text-white">{p.referenceNumber || p.id}</td>
                        <td className="py-3 text-slate-400">{p.date}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            {p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'bank_transfer' ? 'حوالة بنكية' : 'أخرى'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300">{p.receivedBy || 'المحصل'}</td>
                        <td className="py-3 text-left font-black text-emerald-400">
                          {(p.amount ?? 0).toLocaleString()} {settings.currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Support & FAQs */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <span>إرشادات وتعليمات نقطة البيع</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>طريقة احتساب صلاحية الكروت:</span>
                </h4>
                <p className="text-slate-400">
                  تبدأ صلاحية الكارت بالعد التنازلي لحظة أول تسجيل دخول للمشترك في صفحة الهوتسبوت، وليس من تاريخ الشراء.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span>مواعيد تسليم وتوريد الكروت:</span>
                </h4>
                <p className="text-slate-400">
                  يتم تجهيز الطلبات العادية خلال ساعتين إلى 4 ساعات في أوقات الدوام، وتُعطى الأولوية للطلبات العاجلة.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>سقف المديونية وطرق السداد:</span>
                </h4>
                <p className="text-slate-400">
                  يُرجى الالتزام بمواعيد السداد المتفق عليها لضمان عدم توقف توريد الدفعات في حال تجاوز سقف الدين المحدد.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>كروت المرتجع والاستبدال:</span>
                </h4>
                <p className="text-slate-400">
                  يمكن إرجاع الكروت السليمة غير المستخدمة في أي وقت لخصمها من الحساب فوراً بإصدار فاتورة مرتجع.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
