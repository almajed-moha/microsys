import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Phone,
  MapPin,
  DollarSign,
  CreditCard,
  FileText,
  Truck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Edit2,
  Trash2,
  Send,
  Printer,
  FileDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpRight,
  KeyRound,
  Lock,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  User,
  LayoutGrid,
  List,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  POSPoint,
  CardCategory,
  CardBatchDispatch,
  SalesRecord,
  PaymentRecord,
  NetworkSettings,
  AppUser,
  NetworkTenant,
} from '../types';
import { calculatePOSInventory, calculatePOSBalance } from '../utils/storage';
import { exportElementToPdf } from '../utils/pdfExport';
import { checkUsernameAvailability, generateAlternativeUsernames, checkPhoneAvailability } from '../utils/usernameValidator';
import { RecordAuditInfo } from './RecordAuditInfo';

interface POSPointsViewProps {
  posPoints: POSPoint[];
  categories: CardCategory[];
  dispatches: CardBatchDispatch[];
  sales: SalesRecord[];
  payments: PaymentRecord[];
  settings: NetworkSettings;
  allUsers?: AppUser[];
  allPosPoints?: POSPoint[];
  tenants?: NetworkTenant[];
  onAddPOS: (pos: Omit<POSPoint, 'id' | 'createdAt'>) => void;
  onUpdatePOS: (pos: POSPoint) => void;
  onDeletePOS: (posId: string, cascade?: boolean) => void;
  onOpenStatement: (posId: string, mode?: 'a4' | 'pos-80mm') => void;
  onOpenPaymentModal: (posId: string) => void;
  onOpenDispatchModal: (posId: string) => void;
  onOpenQuickSaleForPOS: (posId: string) => void;
}

export const POSPointsView: React.FC<POSPointsViewProps> = ({
  posPoints,
  categories,
  dispatches,
  sales,
  payments,
  settings,
  allUsers = [],
  allPosPoints,
  tenants = [],
  onAddPOS,
  onUpdatePOS,
  onDeletePOS,
  onOpenStatement,
  onOpenPaymentModal,
  onOpenDispatchModal,
  onOpenQuickSaleForPOS,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'indebted' | 'over_limit'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [expandedPOSId, setExpandedPOSId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedPOSId, setCopiedPOSId] = useState<string | null>(null);

  // New / Edit POS Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPOS, setEditingPOS] = useState<POSPoint | null>(null);

  // Delete POS Modal State
  const [deletingPOS, setDeletingPOS] = useState<POSPoint | null>(null);
  const [deleteCascadeOption, setDeleteCascadeOption] = useState<boolean>(false);

  // Debt Limit Warning Modal State (Triggered on attempting new order / dispatch for over-limit POS)
  const [warningModalTargetPOS, setWarningModalTargetPOS] = useState<POSPoint | null>(null);
  const [pendingActionType, setPendingActionType] = useState<'dispatch' | 'order' | null>(null);

  // Effective pos list for global cross-tenant check
  const effectiveAllPos = allPosPoints || posPoints;

  // Form Data including login credentials
  const [formData, setFormData] = useState({
    name: '',
    managerName: '',
    phone: '',
    address: '',
    maxDebtLimit: 50000,
    status: 'active' as 'active' | 'suspended',
    username: '',
    password: '',
    pinCode: '',
    notes: '',
  });

  // Real-time username availability validation
  const usernameValidation = useMemo(() => {
    if (!formData.username.trim()) {
      return {
        status: 'empty' as const,
        isValid: false,
        message: 'أدخل اسم مستخدم فريد لنقطة البيع',
        suggestedUsernames: [],
      };
    }
    return checkUsernameAvailability(
      formData.username,
      allUsers,
      effectiveAllPos,
      tenants,
      { excludePosId: editingPOS?.id }
    );
  }, [formData.username, allUsers, effectiveAllPos, tenants, editingPOS?.id]);

  const handleOpenAdd = () => {
    setEditingPOS(null);
    setFormData({
      name: '',
      managerName: '',
      phone: '',
      address: '',
      maxDebtLimit: 50000,
      status: 'active',
      username: '',
      password: '123' + Math.floor(100 + Math.random() * 900),
      pinCode: String(Math.floor(1000 + Math.random() * 9000)),
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos: POSPoint) => {
    setEditingPOS(pos);
    setFormData({
      name: pos.name,
      managerName: pos.managerName,
      phone: pos.phone,
      address: pos.address,
      maxDebtLimit: pos.maxDebtLimit,
      status: pos.status,
      username: pos.username || (pos.phone ? 'pos_' + pos.phone.replace(/[^0-9]/g, '') : 'pos_' + pos.id.slice(-4)),
      password: pos.password || '123456',
      pinCode: pos.pinCode || '1234',
      notes: pos.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleAutoGenerateCredentials = () => {
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const cleanName = formData.name ? 'pos_' + formData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) : 'pos_point';
    const base = cleanPhone ? 'pos_' + cleanPhone : cleanName;
    const suggestions = generateAlternativeUsernames(base, allUsers, effectiveAllPos, tenants);
    const chosenUsername = suggestions[0] || `${base}_${Date.now().toString().slice(-4)}`;

    setFormData((prev) => ({
      ...prev,
      username: chosenUsername,
      password: 'pos' + Math.floor(1000 + Math.random() * 9000),
      pinCode: String(Math.floor(1000 + Math.random() * 9000)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!usernameValidation.isValid) return;

    const finalUsername = formData.username.trim().toLowerCase();
    const finalPassword = formData.password.trim() || '123456';
    const finalPin = formData.pinCode.trim() || '1234';

    if (editingPOS) {
      onUpdatePOS({
        ...editingPOS,
        name: formData.name,
        managerName: formData.managerName,
        phone: formData.phone,
        address: formData.address,
        maxDebtLimit: Number(formData.maxDebtLimit),
        status: formData.status,
        username: finalUsername,
        password: finalPassword,
        pinCode: finalPin,
        notes: formData.notes,
      });
    } else {
      onAddPOS({
        name: formData.name,
        managerName: formData.managerName,
        phone: formData.phone,
        address: formData.address,
        maxDebtLimit: Number(formData.maxDebtLimit),
        currentDebt: 0,
        totalCardsDelivered: 0,
        totalCardsSold: 0,
        totalCashPaid: 0,
        status: formData.status,
        username: finalUsername,
        password: finalPassword,
        pinCode: finalPin,
        notes: formData.notes,
      });
    }
    setIsModalOpen(false);
  };

  const handleCopyCredentials = (pos: POSPoint) => {
    const u = pos.username || (pos.phone ? 'pos_' + pos.phone : 'pos_' + pos.id);
    const p = pos.password || '123456';
    const pin = pos.pinCode || '1234';
    const text = `بيانات تسجيل الدخول لبوابة نقطة البيع (${pos.name}):\n- اسم المستخدم: ${u}\n- كلمة المرور: ${p}\n- رمز PIN السريع: ${pin}\n- رابط النظام: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopiedPOSId(pos.id);
    setTimeout(() => setCopiedPOSId(null), 2500);
  };

  // Intercept Order / Dispatch attempt if POS exceeds debt limit
  const handleInitiateAction = (pos: POSPoint, actionType: 'dispatch' | 'order' = 'dispatch') => {
    const isOverDebt = (pos.maxDebtLimit || 0) > 0 && (pos.currentDebt || 0) > (pos.maxDebtLimit || 0);
    if (isOverDebt) {
      setWarningModalTargetPOS(pos);
      setPendingActionType(actionType);
    } else {
      if (actionType === 'dispatch') {
        onOpenDispatchModal(pos.id);
      } else {
        onOpenQuickSaleForPOS(pos.id);
      }
    }
  };

  const handleProceedWarningAnyway = () => {
    if (!warningModalTargetPOS) return;
    const posId = warningModalTargetPOS.id;
    const action = pendingActionType;
    setWarningModalTargetPOS(null);
    setPendingActionType(null);
    if (action === 'dispatch') {
      onOpenDispatchModal(posId);
    } else {
      onOpenQuickSaleForPOS(posId);
    }
  };

  const handleWarningPayNow = () => {
    if (!warningModalTargetPOS) return;
    const posId = warningModalTargetPOS.id;
    setWarningModalTargetPOS(null);
    setPendingActionType(null);
    onOpenPaymentModal(posId);
  };

  const handleWarningViewStatement = () => {
    if (!warningModalTargetPOS) return;
    const posId = warningModalTargetPOS.id;
    setWarningModalTargetPOS(null);
    setPendingActionType(null);
    onOpenStatement(posId, 'a4');
  };

  // List of points exceeding debt limit
  const overDebtPoints = useMemo(() => {
    return (posPoints || []).filter(
      (p) => (p.maxDebtLimit || 0) > 0 && (p.currentDebt || 0) > (p.maxDebtLimit || 0)
    );
  }, [posPoints]);

  const totalOverDebtExcessAmount = useMemo(() => {
    return overDebtPoints.reduce((sum, p) => sum + Math.max(0, (p.currentDebt || 0) - (p.maxDebtLimit || 0)), 0);
  }, [overDebtPoints]);

  // Filtered POS Points
  const filteredPOS = useMemo(() => {
    return posPoints.filter((pos) => {
      const matchesSearch =
        pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.phone.includes(searchTerm) ||
        (pos.username && pos.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pos.address.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return pos.status === 'active';
      if (statusFilter === 'suspended') return pos.status === 'suspended';
      if (statusFilter === 'indebted') return (pos.currentDebt || 0) > 0;
      if (statusFilter === 'over_limit') return (pos.maxDebtLimit || 0) > 0 && (pos.currentDebt || 0) > (pos.maxDebtLimit || 0);

      return true;
    });
  }, [posPoints, searchTerm, statusFilter]);

  // Overall POS summary
  const summary = useMemo(() => {
    const totalDebt = (posPoints || []).reduce((acc, p) => acc + (p?.currentDebt || 0), 0);
    const activeCount = (posPoints || []).filter((p) => p?.status === 'active').length;
    let totalCardsSold = 0;
    let totalCardsRemaining = 0;

    (posPoints || []).forEach((p) => {
      if (!p) return;
      const inv = calculatePOSInventory(p.id, dispatches, sales);
      totalCardsSold += inv?.totalSold || 0;
      totalCardsRemaining += inv?.totalRemaining || 0;
    });

    return { totalDebt, activeCount, totalCardsSold, totalCardsRemaining };
  }, [posPoints, dispatches, sales]);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fileName = `كشف_نقاط_البيع_والموزعين_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf('pos-points-container', {
        filename: fileName,
        title: `كشف نقاط البيع والموزعين - ${settings.networkName}`,
        scale: 2.4,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div id="pos-points-container" className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-indigo-400" />
            <span>نقاط التوزيع والموزعين</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إدارة حسابات منافذ البيع، سقف المديونيات، نظام التنبيهات المرئي، وبيانات تسجيل الدخول لبوابة الطلبات.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle (Table / Grid) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="عرض كجدول أسطر مع تمييز المتجاوزين بالأحمر"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول أسطر</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="عرض كبطاقات مربعة"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات</span>
            </button>
          </div>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <FileDown className="w-4 h-4 text-rose-400" />}
            <span>تصدير PDF</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة نقطة بيع جديدة</span>
          </button>
        </div>
      </div>

      {/* Visual High-Priority Alert Banner if any POS exceeds debt limit */}
      {overDebtPoints.length > 0 && (
        <div className="bg-rose-950/70 border-2 border-rose-500/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-100 shadow-xl shadow-rose-950/40 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600/30 border border-rose-500/60 flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-black text-white">
                  تنبيه رقابي: يوجد {overDebtPoints.length} نقطة بيع تجاوزت سقف المديونية المحدد!
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black animate-pulse">
                  مستوى الخطر مرتفع
                </span>
              </div>
              <p className="text-xs text-rose-200 mt-1">
                تم تلوين أسطر وبطاقات هذه النقاط باللون <strong className="text-rose-400 underline font-bold">الأحمر الفاقع</strong>. إجمالي مبالغ التجاوز الخطر: <strong className="text-white font-mono font-bold">{totalOverDebtExcessAmount.toLocaleString()} {settings.currencySymbol}</strong>. يرجى تحصيل المبالغ قبل الموافقة على طلبات أو صرف كروت جديدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'over_limit' ? 'all' : 'over_limit')}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                statusFilter === 'over_limit'
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{statusFilter === 'over_limit' ? 'إلغاء التصفية (عرض الكل)' : 'تصفية المتجاوزين فقط'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">إجمالي مديونيات الموزعين</span>
          <p className="text-lg sm:text-xl font-mono font-black text-rose-400 mt-1">
            {(summary.totalDebt ?? 0).toLocaleString()} <span className="text-xs text-slate-400 font-sans">{settings.currencySymbol}</span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition ${
          overDebtPoints.length > 0
            ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/30'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium block">نقاط تجاوزت سقف الدين</span>
            {overDebtPoints.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <p className={`text-lg sm:text-xl font-mono font-black mt-1 ${
            overDebtPoints.length > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {overDebtPoints.length} <span className="text-xs text-slate-400 font-sans">/ {posPoints.length} نقطة</span>
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">إجمالي الكروت المباعة</span>
          <p className="text-lg sm:text-xl font-mono font-black text-cyan-400 mt-1">
            {(summary.totalCardsSold ?? 0).toLocaleString()} <span className="text-xs text-slate-400 font-sans">كارت</span>
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">المتبقي في السوق</span>
          <p className="text-lg sm:text-xl font-mono font-black text-purple-400 mt-1">
            {(summary.totalCardsRemaining ?? 0).toLocaleString()} <span className="text-xs text-slate-400 font-sans">كارت</span>
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم، المدير، الهاتف، اسم الدخول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'suspended', 'indebted', 'over_limit'] as const).map((filterKey) => {
            const isSelected = statusFilter === filterKey;
            return (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? filterKey === 'over_limit'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-indigo-600 text-white shadow-xs'
                    : filterKey === 'over_limit' && overDebtPoints.length > 0
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {filterKey === 'all' && <span>الكل ({posPoints.length})</span>}
                {filterKey === 'active' && <span>النشطة فقط</span>}
                {filterKey === 'suspended' && <span>المتوقفة</span>}
                {filterKey === 'indebted' && <span>المديونة</span>}
                {filterKey === 'over_limit' && (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>متجاوزة سقف الدين ({overDebtPoints.length})</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE 1: Table List View with Red Row Highlighting */}
      {viewMode === 'table' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-3 px-4">نقطة البيع والمسؤول</th>
                  <th className="py-3 px-3">الهاتف والعنوان</th>
                  <th className="py-3 px-3">بوابة الدخول</th>
                  <th className="py-3 px-3 text-center">سقف الدين</th>
                  <th className="py-3 px-3 text-center">المديونية الحالية</th>
                  <th className="py-3 px-3 text-center">نسبة الاستهلاك</th>
                  <th className="py-3 px-3 text-center">الكروت (مباع / متبقي)</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPOS.map((pos) => {
                  const inv = calculatePOSInventory(pos.id, dispatches, sales);
                  const maxDebt = pos.maxDebtLimit || 0;
                  const currentDebt = pos.currentDebt || 0;
                  const isOverDebt = maxDebt > 0 && currentDebt > maxDebt;
                  const debtPercentage = maxDebt > 0 ? (currentDebt / maxDebt) * 100 : 0;
                  const excessAmount = Math.max(0, currentDebt - maxDebt);

                  const username = pos.username || (pos.phone ? 'pos_' + pos.phone.replace(/[^0-9]/g, '') : 'pos_' + pos.id.slice(-4));
                  const pinCode = pos.pinCode || '1234';

                  return (
                    <tr
                      key={pos.id}
                      className={`transition-colors ${
                        isOverDebt
                          ? 'bg-rose-950/50 hover:bg-rose-950/70 border-y-2 border-rose-500/80 text-rose-100'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      {/* Name & Manager */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          {isOverDebt ? (
                            <div className="w-7 h-7 rounded-lg bg-rose-600/30 border border-rose-500/60 flex items-center justify-center shrink-0 mt-0.5" title="تجاوز سقف الدين المحدد">
                              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                              <Store className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{pos.name}</span>
                              {isOverDebt && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black border border-rose-400/50 flex items-center gap-1 animate-pulse">
                                  <span>تجاوز السقف (+{excessAmount.toLocaleString()})</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              المسؤول: <span className="text-slate-300 font-medium">{pos.managerName || 'غير محدد'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Address */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-300 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{pos.phone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 max-w-[150px] truncate" title={pos.address || ''}>
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{pos.address || 'العنوان غير محدد'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Portal Credentials */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 font-mono text-[11px]">
                            <div className="text-indigo-300 font-bold truncate max-w-[100px]">@{username}</div>
                            <div className="text-slate-500 text-[10px]">PIN: <strong className="text-emerald-400">{pinCode}</strong></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(pos)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="نسخ بيانات الدخول"
                          >
                            {copiedPOSId === pos.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Debt Limit */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                        {maxDebt.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currencySymbol}</span>
                      </td>

                      {/* Current Debt */}
                      <td className="py-3 px-3 text-center">
                        <div className={`font-mono font-black text-sm ${
                          isOverDebt
                            ? 'text-rose-400 underline decoration-rose-500 decoration-2'
                            : currentDebt > 0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {currentDebt.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{settings.currencySymbol}</span>
                        </div>
                        {isOverDebt && (
                          <div className="text-[10px] font-bold text-rose-400 mt-0.5">
                            مستحق التوريد فوراً
                          </div>
                        )}
                      </td>

                      {/* Progress Bar Meter */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all ${
                                isOverDebt
                                  ? 'bg-rose-500'
                                  : debtPercentage > 75
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(debtPercentage, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${
                            isOverDebt ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {debtPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Cards Inventory */}
                      <td className="py-3 px-3 text-center font-mono text-[11px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-cyan-400 font-bold" title="كروت مباعة">{inv.totalSold}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-purple-300 font-bold bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-800/40" title="كروت متبقية بالسوق">
                            {inv.totalRemaining}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            pos.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.status === 'active' ? 'نشط' : 'متوقف'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* New Delivery / Dispatch Button with Over-Limit Warning Interception */}
                          <button
                            type="button"
                            onClick={() => handleInitiateAction(pos, 'dispatch')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              isOverDebt
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 animate-pulse'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                            title={isOverDebt ? '⚠️ تنبيه: تجاوز سقف الدين - يتطلب تأكيداً' : 'تسليم كروت جديدة / إصدار طلب'}
                          >
                            {isOverDebt ? <AlertCircle className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                            <span>تسليم</span>
                          </button>

                          {/* Quick Payment Button */}
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModal(pos.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            title="سند قبض / تحصيل دفعة"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>

                          {/* Statement A4 */}
                          <button
                            type="button"
                            onClick={() => onOpenStatement(pos.id, 'a4')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="كشف حساب مالي ومخزني"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {/* Statement POS 80mm */}
                          <button
                            type="button"
                            onClick={() => onOpenStatement(pos.id, 'pos-80mm')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition cursor-pointer"
                            title="طباعة إيصال كاشير حراري 80mm"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pos)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingPOS(pos);
                              setDeleteCascadeOption(false);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="حذف نقطة البيع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPOS.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <Store className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm font-bold text-slate-300">لم يتم العثور على أي نقاط بيع مطابقة</p>
                      <p className="text-xs text-slate-500 mt-0.5">جرب تعديل خيارات البحث أو التصفية.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Cards Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredPOS.map((pos) => {
            const inv = calculatePOSInventory(pos.id, dispatches, sales);
            const maxDebt = pos.maxDebtLimit || 0;
            const currentDebt = pos.currentDebt || 0;
            const isOverDebt = maxDebt > 0 && currentDebt > maxDebt;
            const debtPercentage = maxDebt > 0 ? (currentDebt / maxDebt) * 100 : 0;
            const excessAmount = Math.max(0, currentDebt - maxDebt);
            const isExpanded = expandedPOSId === pos.id;

            const username = pos.username || (pos.phone ? 'pos_' + pos.phone.replace(/[^0-9]/g, '') : 'pos_' + pos.id.slice(-4));
            const pinCode = pos.pinCode || '1234';

            return (
              <div
                key={pos.id}
                className={`rounded-2xl overflow-hidden shadow-lg transition flex flex-col justify-between ${
                  isOverDebt
                    ? 'bg-slate-900/95 border-2 border-rose-500/80 shadow-rose-950/50 ring-2 ring-rose-500/30'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700/80'
                }`}
              >
                {/* Over Debt Limit Alert Header Ribbon */}
                {isOverDebt && (
                  <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span>تنبيه: تجاوز سقف المديونية (+{excessAmount.toLocaleString()} {settings.currencySymbol})</span>
                    </div>
                    <span className="bg-rose-950/80 px-2 py-0.5 rounded text-[10px] font-mono font-black border border-rose-400/40">
                      {debtPercentage.toFixed(0)}%
                    </span>
                  </div>
                )}

                <div className="p-4 sm:p-5">
                  {/* Header: Name, Manager, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-bold text-base leading-snug ${isOverDebt ? 'text-rose-100' : 'text-white'}`}>
                        {pos.name}
                      </h3>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">
                        المسؤول: {pos.managerName || 'غير محدد'}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        pos.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {pos.status === 'active' ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  {/* Location & Phone */}
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{pos.phone || 'غير مسجل'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{pos.address || 'العنوان غير محدد'}</span>
                    </div>
                  </div>

                  {/* Login Credentials Box */}
                  <div className="mt-3 p-2.5 bg-slate-950/80 rounded-xl border border-indigo-950/60 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <KeyRound className="w-3 h-3 text-indigo-400" />
                        <span>بوابة الدخول:</span>
                        <span className="font-mono text-indigo-300 font-bold truncate">@{username}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 font-mono">
                        <span>PIN:</span>
                        <span className="text-emerald-400 font-bold">{pinCode}</span>
                        <span className="text-slate-600">|</span>
                        <span>Pass:</span>
                        <span className="text-slate-400">{pos.password || '123456'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(pos)}
                        className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                        title="نسخ بيانات الدخول"
                      >
                        {copiedPOSId === pos.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {pos.phone && (
                        <a
                          href={`https://wa.me/${pos.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `مرحباً ${pos.name}، إليك بيانات الدخول لبوابة طلب الكروت لشبكة ${settings.networkName}:\n- اسم المستخدم: ${username}\n- كلمة المرور: ${pos.password || '123456'}\n- رمز PIN: ${pinCode}\nرابط الدخول: ${window.location.origin}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition"
                          title="إرسال البيانات عبر واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Financial Debt & Limit Meter */}
                  <div className={`mt-3 p-3 rounded-xl border transition ${
                    isOverDebt
                      ? 'bg-rose-950/60 border-rose-500/60'
                      : 'bg-slate-800/60 border-slate-700/50'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-400">الرصيد المتبقي (المديونية):</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isOverDebt
                            ? 'text-rose-400'
                            : (pos.currentDebt || 0) > 0
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {(pos.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                      </span>
                    </div>

                    {/* Debt Bar */}
                    <div className="w-full bg-slate-750 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOverDebt ? 'bg-rose-500' : debtPercentage > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(debtPercentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>سقف الدين: {(pos.maxDebtLimit ?? 0).toLocaleString()} {settings.currencySymbol}</span>
                      <span className={`font-bold font-mono ${isOverDebt ? 'text-rose-400' : 'text-slate-400'}`}>
                        {(debtPercentage ?? 0).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Cards Summary Badges */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-center text-xs">
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">الكروت المباعة</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">{inv.totalSold}</span>
                    </div>
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">المتبقي لديه</span>
                      <span className="font-mono font-bold text-purple-400 text-sm">{inv.totalRemaining}</span>
                    </div>
                  </div>

                  {/* Category Inventory Breakdown (Expandable) */}
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedPOSId(isExpanded ? null : pos.id)}
                      className="w-full py-1 px-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-between bg-slate-800/30 rounded-lg transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تفاصيل الكروت حسب الفئة ({Object.keys(inv.byCategory).length})</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                        {categories.map((cat) => {
                          const catStats = inv.byCategory[cat.id] || { dispatched: 0, sold: 0, remaining: 0 };
                          if (catStats.dispatched === 0) return null;
                          return (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-none"
                            >
                              <span className="text-slate-300 font-medium truncate">{cat.name}:</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-slate-400 text-[11px]">مستلم: {catStats.dispatched}</span>
                                <span className="text-cyan-400 font-bold">باع: {catStats.sold}</span>
                                <span className="text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded text-[11px]">
                                  باقي: {catStats.remaining}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(inv.byCategory).length === 0 && (
                          <div className="text-center text-slate-500 py-1 text-xs">لم يتم تسليم كروت لهذه النقطة بعد</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="p-3 bg-slate-950/50 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      onClick={() => onOpenStatement(pos.id, 'a4')}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="كشف حساب مالي ومخزني رسمي على ورق A4"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>كشف حساب</span>
                    </button>

                    <button
                      onClick={() => onOpenStatement(pos.id, 'pos-80mm')}
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="طباعة إيصال كشف حساب كاشير حراري (80mm)"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">80mm</span>
                    </button>

                    <button
                      onClick={() => onOpenPaymentModal(pos.id)}
                      className="flex-1 py-1.5 px-2 bg-emerald-700/60 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="سند قبض / سداد دفعة"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
                      <span>سداد</span>
                    </button>

                    {/* Delivery / Order button with Debt Check */}
                    <button
                      onClick={() => handleInitiateAction(pos, 'dispatch')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                        isOverDebt
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                          : 'bg-indigo-700/60 hover:bg-indigo-600 text-white'
                      }`}
                      title={isOverDebt ? '⚠️ تنبيه: تجاوز سقف الدين - يتطلب تأكيداً' : 'تسليم كروت جديدة'}
                    >
                      {isOverDebt ? <AlertCircle className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5 text-indigo-300" />}
                      <span>تسليم</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(pos)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingPOS(pos);
                          setDeleteCascadeOption(false);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="حذف نقطة البيع"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <RecordAuditInfo
                      audit={pos}
                      entityName={`نقطة بيع ${pos.name}`}
                      compact={true}
                      showHistoryButton={true}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPOS.length === 0 && (
            <div className="col-span-full bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <Store className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-slate-300">لم يتم العثور على أي نقاط بيع</h3>
              <p className="text-xs text-slate-400 mt-1">جرب تغيير معايير البحث أو أضف نقطة توزيع جديدة.</p>
            </div>
          )}
        </div>
      )}

      {/* Debt Limit Reminder & Warning Modal (نافذة تذكير عند محاولة إصدار طلب جديد لنقطة متجاوزة سقف الدين) */}
      {warningModalTargetPOS && (() => {
        const maxDebt = warningModalTargetPOS.maxDebtLimit || 0;
        const currentDebt = warningModalTargetPOS.currentDebt || 0;
        const excess = Math.max(0, currentDebt - maxDebt);
        const percent = maxDebt > 0 ? (currentDebt / maxDebt) * 100 : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-b border-rose-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>تنبيه: تجاوز سقف المديونية لنقطة البيع</span>
                    </h3>
                    <p className="text-xs text-rose-300/90 mt-0.5">
                      تحذير مالي قبل إصدار أو تسليم طلبية كروت جديدة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWarningModalTargetPOS(null);
                    setPendingActionType(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-4 text-xs">
                {/* Target POS Info */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">نقطة البيع المستهدفة:</span>
                    <h4 className="text-base font-black text-white mt-0.5">{warningModalTargetPOS.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      المسؤول: <strong className="text-slate-200">{warningModalTargetPOS.managerName || 'غير مسجل'}</strong> | هاتف: <span className="font-mono text-slate-300" dir="ltr">{warningModalTargetPOS.phone}</span>
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-xs">
                    تجاوز السقف
                  </span>
                </div>

                {/* Financial Debt Breakdown Metric Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">سقف المديونية المسموح:</span>
                    <span className="font-mono font-bold text-slate-200 text-sm mt-1 block">
                      {maxDebt.toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>

                  <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-500/40">
                    <span className="text-rose-300 text-[11px] block font-semibold">المديونية الحالية القائمة:</span>
                    <span className="font-mono font-black text-rose-400 text-base mt-1 block">
                      {currentDebt.toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Over Limit Warning Callout */}
                <div className="p-3.5 bg-rose-950/60 border border-rose-500/60 rounded-2xl text-rose-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-white">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      <span>مقدار التجاوز الخطر:</span>
                    </span>
                    <span className="font-mono font-black text-base text-rose-300">
                      +{excess.toLocaleString()} {settings.currencySymbol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-rose-300/80 border-t border-rose-800/60 pt-1.5">
                    <span>نسبة المديونية لسقف الدين:</span>
                    <span className="font-mono font-bold text-rose-200">{percent.toFixed(1)}%</span>
                  </div>

                  <p className="text-[11px] text-rose-200/90 pt-1 leading-relaxed">
                    ⚠️ <strong>تنبيه إداري:</strong> هذه النقطة تجاوزت الحد الائتماني المعتمد. توصي لوائح الشبكة بتحصيل دفعة نقدية وسند قبض لتسوية الرصيد قبل تسليم أي كروت إضافية لتجنب تراكم الديون المعدومة.
                  </p>
                </div>

                {/* Direct Action Choices */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Collect Payment Now (Recommended) */}
                    <button
                      type="button"
                      onClick={handleWarningPayNow}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>تحصيل دفعة نقدية وسداد الآن</span>
                    </button>

                    {/* View Statement */}
                    <button
                      type="button"
                      onClick={handleWarningViewStatement}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>عرض كشف الحساب وتفاصيله</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setWarningModalTargetPOS(null);
                        setPendingActionType(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition cursor-pointer text-xs"
                    >
                      تراجع وإلغاء الطلب
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedWarningAnyway}
                      className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <span>متابعة الإصدار باستثناء إداري</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete POS Confirmation Modal */}
      {deletingPOS && (() => {
        const inv = calculatePOSInventory(deletingPOS.id, dispatches, sales);
        const hasUnsettledActivity = (deletingPOS.currentDebt || 0) > 0 || (inv?.totalRemaining || 0) > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>تأكيد حذف نقطة البيع</span>
                </h3>
                <button
                  onClick={() => setDeletingPOS(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-white text-sm">{deletingPOS.name}</h4>
                  <p className="text-slate-400 mt-0.5">المسؤول: {deletingPOS.managerName} | هاتف: {deletingPOS.phone}</p>
                </div>

                {hasUnsettledActivity ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <strong className="block text-amber-200">تنبيه مالي ومخزني:</strong>
                        <span>لا يزال هناك رصيد غير مسوى لهذه النقطة:</span>
                        {(deletingPOS.currentDebt || 0) > 0 && (
                          <div className="mt-1 font-bold text-rose-400 font-mono">
                            مديونية معلقة: {(deletingPOS.currentDebt ?? 0).toLocaleString()} {settings.currencySymbol}
                          </div>
                        )}
                        {inv.totalRemaining > 0 && (
                          <div className="mt-0.5 font-bold text-amber-300 font-mono">
                            كروت متبقية بالسوق: {inv.totalRemaining} كارت
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingPOS(null)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePOS(deletingPOS.id, deleteCascadeOption);
                          setDeletingPOS(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition text-xs cursor-pointer"
                      >
                        متابعة الحذف رغم التحذير
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                      <div>
                        <strong className="block text-emerald-200">الحساب مسوّى ومطابق:</strong>
                        <span>لا توجد مديونية معلقة أو كروت متبقية بالسوق. يمكن حذف هذه النقطة بأمان.</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingPOS(null)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePOS(deletingPOS.id, deleteCascadeOption);
                          setDeletingPOS(null);
                        }}
                        className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>تأكيد الحذف</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit POS Modal with Security Credentials */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                <span>{editingPOS ? 'تعديل بيانات نقطة البيع وحساب البوابة' : 'إضافة نقطة بيع وإنشاء حساب البوابة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Basic Information */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  اسم نقطة البيع / المحل <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سوبرماركت الأمانة"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    اسم المسؤول / الموزع:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أبو أحمد"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    رقم الهاتف / الواتساب:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 770123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  الموقع / العنوان:
                </label>
                <input
                  type="text"
                  placeholder="مثال: شارع الستين - جوار مدرسة النجاح"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    سقف المديونية المسموح به ({settings.currencySymbol}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="50000"
                    value={formData.maxDebtLimit}
                    onChange={(e) => setFormData({ ...formData, maxDebtLimit: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    حالة النقطة:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="active">نشطة (مستمرة بالبيع)</option>
                    <option value="suspended">متوقفة (مؤقتة)</option>
                  </select>
                </div>
              </div>

              {/* Portal Login Credentials Section */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>بيانات تسجيل دخول الموزع إلى بوابة طلب الكروت</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCredentials}
                    className="text-[10px] text-indigo-300 hover:text-white bg-indigo-900/40 hover:bg-indigo-800/60 px-2 py-1 rounded-lg border border-indigo-700/50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>توليد تلقائي</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-bold">
                          اسم المستخدم: <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="pos_supermarket"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') })}
                          className={`w-full bg-slate-900 border rounded-xl px-2.5 py-1.5 text-white text-xs font-mono text-left focus:outline-none ${
                            usernameValidation.status === 'taken'
                              ? 'border-rose-500 focus:border-rose-500'
                              : usernameValidation.status === 'available'
                              ? 'border-emerald-500 focus:border-emerald-500'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          كلمة المرور:
                        </label>
                        <input
                          type="text"
                          placeholder="123456"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono text-left focus:outline-none focus:border-indigo-500"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">
                          رمز PIN السريع:
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="1234"
                          value={formData.pinCode}
                          onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono text-center tracking-wider focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  تسمح هذه البيانات للموزع بتسجيل الدخول مباشرة إلى بوابته الخاصة لطلب دفعات الكروت ومتابعة كشف الحساب.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات إضافية:
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول أوقات السداد، اتفاقيات العمولة، إلخ..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!usernameValidation.isValid}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  {editingPOS ? 'حفظ التعديلات' : 'إضافة النقطة وتفعيل الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
