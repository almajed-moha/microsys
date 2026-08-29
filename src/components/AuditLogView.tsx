import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  Shield,
  User,
  Trash2,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  ArrowUpDown,
  RefreshCw,
  Layers,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Store,
  Receipt,
  Truck,
  FileSpreadsheet
} from 'lucide-react';
import { UserActivityLog, AppUser, NetworkSettings } from '../types';
import { exportAuditLogsToExcel } from '../utils/auditLogger';
import { exportToCSV } from '../utils/storage';

interface AuditLogViewProps {
  activityLogs: UserActivityLog[];
  users: AppUser[];
  activeUser: AppUser;
  settings?: NetworkSettings;
  onClearLogs?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  activityLogs,
  users,
  activeUser,
  settings,
  onClearLogs,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [selectedActionTypeFilter, setSelectedActionTypeFilter] = useState('all');
  const [datePeriodFilter, setDatePeriodFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Detail Modal State
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<UserActivityLog | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Filtered & Sorted Logs
  const filteredLogs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return activityLogs
      .filter((log) => {
        // Text Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesUser = log.userName.toLowerCase().includes(term);
          const matchesAction = log.action.toLowerCase().includes(term);
          const matchesModule = log.targetModuleName.toLowerCase().includes(term);
          const matchesTitle = log.title.toLowerCase().includes(term);
          const matchesDetails = log.details?.toLowerCase().includes(term) || false;
          const matchesIp = log.ipAddress?.includes(term) || false;

          if (!matchesUser && !matchesAction && !matchesModule && !matchesTitle && !matchesDetails && !matchesIp) {
            return false;
          }
        }

        // User Filter
        if (selectedUserFilter !== 'all' && log.userId !== selectedUserFilter) {
          return false;
        }

        // Module Filter
        if (selectedModuleFilter !== 'all' && log.targetModule !== selectedModuleFilter) {
          return false;
        }

        // Action Type Filter
        if (selectedActionTypeFilter !== 'all' && log.actionType !== selectedActionTypeFilter) {
          return false;
        }

        // Date Range Filter
        const logDate = log.date;
        if (datePeriodFilter === 'today') {
          if (logDate !== todayStr) return false;
        } else if (datePeriodFilter === 'yesterday') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          if (logDate !== y.toISOString().split('T')[0]) return false;
        } else if (datePeriodFilter === '7days') {
          const d = new Date(logDate);
          const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
          if (diff < 0 || diff > 7) return false;
        } else if (datePeriodFilter === 'month') {
          const d = new Date(logDate);
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (datePeriodFilter === 'custom') {
          if (customStartDate && logDate < customStartDate) return false;
          if (customEndDate && logDate > customEndDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [
    activityLogs,
    searchTerm,
    selectedUserFilter,
    selectedModuleFilter,
    selectedActionTypeFilter,
    datePeriodFilter,
    customStartDate,
    customEndDate,
    sortOrder,
  ]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = activityLogs.length;
    const creates = activityLogs.filter((l) => l.actionType === 'create').length;
    const updates = activityLogs.filter((l) => l.actionType === 'update').length;
    const deletes = activityLogs.filter((l) => l.actionType === 'delete').length;
    const security = activityLogs.filter((l) => l.actionType === 'security' || l.actionType === 'auth').length;
    const financial = activityLogs.filter((l) => l.actionType === 'financial' || l.targetModule === 'invoices' || l.targetModule === 'expenses' || l.targetModule === 'payments').length;

    return { total, creates, updates, deletes, security, financial };
  }, [activityLogs]);

  // Export handlers
  const handleExportExcel = () => {
    exportAuditLogsToExcel(filteredLogs, settings);
  };

  const handleExportCSV = () => {
    const data = filteredLogs.map((log, index) => ({
      '#': index + 1,
      'التاريخ': log.date,
      'الوقت': log.time,
      'المستخدم': log.userName,
      'الدور الوظيفي': log.userRole || '-',
      'القسم': log.targetModuleName,
      'نوع الإجراء': log.action,
      'عنوان العملية': log.title,
      'التفاصيل': log.details || '-',
      'عنوان IP': log.ipAddress || '-',
    }));
    exportToCSV(data, `سجل_النشاط_الرقابي_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper: Badge Style for Action Types
  const getActionBadge = (actionType: UserActivityLog['actionType'], status?: string) => {
    switch (actionType) {
      case 'create':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'إضافة جديدة',
        };
      case 'update':
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
          label: 'تعديل بيانات',
        };
      case 'delete':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
          dot: 'bg-rose-500',
          label: 'حذف وإلغاء',
        };
      case 'security':
        return {
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-400',
          label: 'صلاحيات وأمان',
        };
      case 'financial':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'عملية مالية',
        };
      case 'auth':
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-400',
          label: 'تسجيل دخول',
        };
      case 'export':
        return {
          bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          dot: 'bg-teal-400',
          label: 'تصدير تقرير',
        };
      case 'settings':
        return {
          bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
          label: 'إعدادات النظام',
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-700',
          dot: 'bg-slate-400',
          label: 'نشاط نظام',
        };
    }
  };

  // Helper: Module Icon & Color
  const getModuleMeta = (moduleKey: string) => {
    switch (moduleKey) {
      case 'invoices':
        return { icon: FileText, color: 'text-indigo-400', label: 'الفواتير' };
      case 'expenses':
        return { icon: DollarSign, color: 'text-rose-400', label: 'المصروفات' };
      case 'payments':
        return { icon: Receipt, color: 'text-emerald-400', label: 'المقبوضات' };
      case 'pos':
        return { icon: Store, color: 'text-cyan-400', label: 'نقاط البيع' };
      case 'categories':
        return { icon: Layers, color: 'text-amber-400', label: 'فئات الكروت' };
      case 'users':
        return { icon: Shield, color: 'text-purple-400', label: 'المستخدمين' };
      case 'settings':
        return { icon: Settings, color: 'text-slate-400', label: 'الإعدادات' };
      case 'mikrotik':
        return { icon: Activity, color: 'text-blue-400', label: 'المايكروتك' };
      default:
        return { icon: Activity, color: 'text-slate-400', label: 'النظام' };
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Top Audit KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Events */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">إجمالي العمليات</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-white font-mono mt-1">{metrics.total}</p>
          <span className="text-[10px] text-slate-500">عملية موثقة بالنظام</span>
        </div>

        {/* Creates */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">عمليات الإضافة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">{metrics.creates}</p>
          <span className="text-[10px] text-emerald-500/80">فواتير وكروت ومستخدمين</span>
        </div>

        {/* Updates */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">عمليات التعديل</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-400 font-mono mt-1">{metrics.updates}</p>
          <span className="text-[10px] text-blue-400/80">تحديث أسعار وبيانات</span>
        </div>

        {/* Deletions / Cancellations */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">الحذف والإلغاء</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-400 font-mono mt-1">{metrics.deletes}</p>
          <span className="text-[10px] text-rose-400/80">عمليات حساسة تستوجب المتابعة</span>
        </div>

        {/* Security & Roles */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">الأمان والصلاحيات</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-400 font-mono mt-1">{metrics.security}</p>
          <span className="text-[10px] text-purple-400/80">ترقيات وتعديل أدوار</span>
        </div>

        {/* Financial Actions */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">حركات مالية</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-1">{metrics.financial}</p>
          <span className="text-[10px] text-amber-400/80">صرف وتحصيل وفواتير</span>
        </div>
      </div>

      {/* 2. Advanced Filter & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Text Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالمستخدم، العملية، القسم، التفاصيل، IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">👤 كافة المستخدمين ({users.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.avatar || '👤'} {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">📦 كافة الأقسام والوحدات</option>
              <option value="invoices">🧾 الفواتير والمبيعات</option>
              <option value="expenses">💸 المصروفات وسندات الصرف</option>
              <option value="payments">💵 المقبوضات والتحصيلات</option>
              <option value="pos">🏪 نقاط البيع والموزعين</option>
              <option value="categories">🎴 فئات الكروت وتوليد المايكروتك</option>
              <option value="users">🛡️ المستخدمين والصلاحيات</option>
              <option value="settings">⚙️ إعدادات النظام والشبكة</option>
              <option value="mikrotik">🌐 راوتر المايكروتك</option>
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <select
              value={selectedActionTypeFilter}
              onChange={(e) => setSelectedActionTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">⚡ كافة أنواع الإجراءات</option>
              <option value="create">🟢 عمليات الإضافة والإنشاء</option>
              <option value="update">🔵 عمليات التعديل والتحديث</option>
              <option value="delete">🔴 عمليات الحذف والإلغاء الحساسة</option>
              <option value="security">🟣 الصلاحيات والأمان</option>
              <option value="financial">🟡 المعاملات المالية</option>
              <option value="auth">🔵 تسجيل الدخول والمصادقة</option>
              <option value="export">📊 تصدير البيانات والتقارير</option>
            </select>
          </div>
        </div>

        {/* Date Filter & View Switcher Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>الفترة:</span>
            </span>

            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday', label: 'أمس' },
              { id: '7days', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'custom', label: 'مخصص' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePeriodFilter(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  datePeriodFilter === preset.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}

            {datePeriodFilter === 'custom' && (
              <div className="flex items-center gap-2 mr-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white text-xs px-1 focus:outline-hidden"
                />
                <span className="text-slate-500 text-xs">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white text-xs px-1 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* View Mode & Export Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  viewMode === 'timeline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                خط زمني
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition"
              title={sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span>{sortOrder === 'desc' ? 'الأحدث' : 'الأقدم'}</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              title="تصدير السجل بتنسيق Excel احترافي مع الألوان"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              title="تصدير كملف CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Clear Logs (Super Admin only) */}
            {activeUser.role === 'super_admin' && onClearLogs && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold transition cursor-pointer"
                title="تفريغ سجل النشاط"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Results Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span>نتائج العرض:</span>
          <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded-md">
            {filteredLogs.length} من {activityLogs.length} سجل
          </span>
        </div>
        {(searchTerm || selectedUserFilter !== 'all' || selectedModuleFilter !== 'all' || selectedActionTypeFilter !== 'all' || datePeriodFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedUserFilter('all');
              setSelectedModuleFilter('all');
              setSelectedActionTypeFilter('all');
              setDatePeriodFilter('all');
            }}
            className="text-indigo-400 hover:text-indigo-300 underline font-bold cursor-pointer"
          >
            إعادة ضبط كافة الفلاتر
          </button>
        )}
      </div>

      {/* 4. Display Content: Table or Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">لا توجد سجلات تطابق معايير البحث والفلترة</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            جرب تغيير المستخدم المحدد، نوع العملية، أو توسيع النطاق الزمني المحدد للبحث.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  <th className="py-3 px-3.5">التاريخ والوقت</th>
                  <th className="py-3 px-3.5">المستخدم المسؤول</th>
                  <th className="py-3 px-3.5">القسم / الوحدة</th>
                  <th className="py-3 px-3.5">نوع الإجراء</th>
                  <th className="py-3 px-3.5">عنوان العملية والتفاصيل</th>
                  <th className="py-3 px-3.5 text-center">عنوان IP</th>
                  <th className="py-3 px-3.5 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log, index) => {
                  const badge = getActionBadge(log.actionType, log.status);
                  const moduleMeta = getModuleMeta(log.targetModule);
                  const ModuleIcon = moduleMeta.icon;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLogForDetails(log)}
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 text-center text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Date & Time with seconds */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-200 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{log.time}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {log.date}
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl ${log.userAvatarBg || 'bg-slate-800'} flex items-center justify-center text-base shadow-inner shrink-0 border border-white/10`}>
                            {log.userAvatar || '👤'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{log.userName}</div>
                            <div className="text-[10px] text-slate-400">
                              {log.userRole ? (
                                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px]">
                                  {log.userRole}
                                </span>
                              ) : (
                                'مستخدم'
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target Module */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          <ModuleIcon className={`w-3.5 h-3.5 ${moduleMeta.color}`} />
                          <span className="font-medium text-[11px]">{log.targetModuleName}</span>
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`} />
                          {log.action}
                        </span>
                      </td>

                      {/* Title & Details snippet */}
                      <td className="py-3 px-3.5 max-w-xs sm:max-w-md">
                        <div className="font-bold text-slate-100 text-xs line-clamp-1">{log.title}</div>
                        {log.details && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                            {log.details}
                          </div>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.ipAddress || '192.168.1.1'}
                      </td>

                      {/* View Button */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogForDetails(log);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition shadow-xs"
                          title="استعراض كامل تفاصيل السجل"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TIMELINE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative">
          <div className="relative pr-6 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 space-y-6">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType, log.status);
              const moduleMeta = getModuleMeta(log.targetModule);
              const ModuleIcon = moduleMeta.icon;

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className={`absolute -right-6 top-1.5 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center ${badge.dot} shadow-md ring-4 ring-slate-900 z-10`} />

                  {/* Log Card */}
                  <div
                    onClick={() => setSelectedLogForDetails(log)}
                    className="bg-slate-950 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer mr-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* User & Action */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${log.userAvatarBg || 'bg-slate-800'} flex items-center justify-center text-sm shrink-0 border border-white/10`}>
                          {log.userAvatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{log.userName}</span>
                            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${badge.bg}`}>
                              {log.action}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{log.date}</span>
                        <span>•</span>
                        <span className="text-slate-200 font-bold">{log.time}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-2.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                        <ModuleIcon className={`w-4 h-4 ${moduleMeta.color} shrink-0`} />
                        <span>{log.title}</span>
                      </h4>
                      {log.details && (
                        <p className="text-xs text-slate-400 mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 font-sans">
                          {log.details}
                        </p>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span>القسم: {log.targetModuleName}</span>
                      <span className="font-mono">IP: {log.ipAddress || '192.168.1.1'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Detailed Inspection Modal */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 to-indigo-950/60 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تفاصيل سجل العملية الرقابي</h3>
                  <p className="text-xs text-slate-400 font-mono">معرف السجل: {selectedLogForDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* User Identity Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedLogForDetails.userAvatarBg || 'bg-slate-800'} flex items-center justify-center text-xl shadow-inner border border-white/10`}>
                    {selectedLogForDetails.userAvatar || '👤'}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">المستخدم المنفذ:</span>
                    <h4 className="text-sm font-bold text-white">{selectedLogForDetails.userName}</h4>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      الدور: {selectedLogForDetails.userRole || 'مستخدم'}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500">عنوان IP:</span>
                  <p className="font-mono text-slate-300 text-xs">{selectedLogForDetails.ipAddress || '192.168.1.1'}</p>
                </div>
              </div>

              {/* Timestamp & Timing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">التاريخ:</span>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">{selectedLogForDetails.date}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">الوقت الدقيق:</span>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">{selectedLogForDetails.time}</p>
                </div>
              </div>

              {/* Action and Module */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">القسم المستهدف:</span>
                  <p className="text-xs font-bold text-indigo-300 mt-0.5">{selectedLogForDetails.targetModuleName}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">نوع العملية:</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadge(selectedLogForDetails.actionType).bg}`}>
                    {selectedLogForDetails.action}
                  </span>
                </div>
              </div>

              {/* Operation Title */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">عنوان العملية:</span>
                <p className="text-xs font-bold text-white">{selectedLogForDetails.title}</p>
              </div>

              {/* Complete Details */}
              {selectedLogForDetails.details && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-1">التفاصيل الفنية والبيان:</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                    {selectedLogForDetails.details}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Clear Logs Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-rose-800/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تفريغ سجل النشاط الرقابي</h3>
                <p className="text-xs text-slate-400">هذا الإجراء مخصص للمدير العام فقط</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/20 border border-rose-800/30 p-3 rounded-xl">
              هل أنت متأكد من رغبتك في حذف وتفريغ كافة السجلات الرقابية السابقة؟ سيتم بدء سجل جديد من الآن ولا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (onClearLogs) onClearLogs();
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-600/30"
              >
                تأكيد التفريغ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
