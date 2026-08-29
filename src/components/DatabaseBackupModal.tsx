import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Users,
  Store,
  FileText,
  DollarSign,
  Receipt,
  Server,
  Calendar,
  Clock,
  User,
  Copy,
  Check,
  RefreshCw,
  X,
  FileCode,
  ShieldCheck,
  HelpCircle,
  FolderArchive,
  ArrowRightLeft,
  Sparkles,
  ShoppingBag,
  History,
} from 'lucide-react';
import {
  NetworkTenant,
  AppUser,
  CardCategory,
  POSPoint,
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  CardBatchDispatch,
  SalesRecord,
  PaymentRecord,
  CardOrder,
  NetworkSettings,
  CardTemplate,
  UserActivityLog,
  SystemDatabaseBackup,
  SystemDatabaseBackupData,
} from '../types';
import { exportToJSON, downloadFile } from '../utils/storage';

interface DatabaseBackupModalProps {
  activeUser?: AppUser;
  tenants: NetworkTenant[];
  users: AppUser[];
  categories: CardCategory[];
  posPoints: POSPoint[];
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  dispatches: CardBatchDispatch[];
  sales: SalesRecord[];
  payments: PaymentRecord[];
  orders: CardOrder[];
  settings: NetworkSettings;
  templates?: CardTemplate[];
  activityLogs?: UserActivityLog[];
  selectedTenantFilter?: string;
  onRestoreDatabase: (
    backupData: SystemDatabaseBackupData,
    mode: 'overwrite' | 'merge',
    backupType?: 'full_system' | 'single_network'
  ) => void;
  onClose: () => void;
  onLogActivity?: (action: string, title: string, details: string, status?: 'success' | 'warning' | 'danger' | 'info') => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  activeUser,
  tenants,
  users,
  categories,
  posPoints,
  invoices,
  expenses,
  expenseCategories,
  dispatches,
  sales,
  payments,
  orders,
  settings,
  templates = [],
  activityLogs = [],
  selectedTenantFilter = 'all',
  onRestoreDatabase,
  onClose,
  onLogActivity,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportScope, setExportScope] = useState<'full' | 'current'>(
    activeUser?.role === 'system_owner' && selectedTenantFilter === 'all' ? 'full' : 'current'
  );
  const [includeAuditLogs, setIncludeAuditLogs] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Import State
  const [importedJsonString, setImportedJsonString] = useState<string>('');
  const [parsedBackup, setParsedBackup] = useState<SystemDatabaseBackup | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine current network info
  const isMasterUser = activeUser?.role === 'system_owner';
  const effectiveNetworkId = activeUser?.networkId && activeUser.networkId !== 'system'
    ? activeUser.networkId
    : (selectedTenantFilter !== 'all' ? selectedTenantFilter : (tenants[0]?.id || ''));
  const currentTenant = tenants.find((t) => t.id === effectiveNetworkId);
  const networkDisplayName = currentTenant?.name || settings.networkName || 'الشبكة الحالية';

  // Calculate filtered records if current scope
  const targetCategories = exportScope === 'full'
    ? categories
    : categories.filter((c) => !c.networkId || c.networkId === effectiveNetworkId || c.networkId === 'net-microsys');

  const targetPOSPoints = exportScope === 'full'
    ? posPoints
    : posPoints.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetInvoices = exportScope === 'full'
    ? invoices
    : invoices.filter((i) => !i.networkId || i.networkId === effectiveNetworkId || i.networkId === 'net-microsys');

  const targetExpenses = exportScope === 'full'
    ? expenses
    : expenses.filter((e) => !e.networkId || e.networkId === effectiveNetworkId || e.networkId === 'net-microsys');

  const targetExpenseCategories = exportScope === 'full'
    ? expenseCategories
    : expenseCategories.filter((ec) => !ec.networkId || ec.networkId === effectiveNetworkId || ec.networkId === 'net-microsys');

  const targetDispatches = exportScope === 'full'
    ? dispatches
    : dispatches.filter((d) => !d.networkId || d.networkId === effectiveNetworkId || d.networkId === 'net-microsys');

  const targetSales = exportScope === 'full'
    ? sales
    : sales.filter((s) => !s.networkId || s.networkId === effectiveNetworkId || s.networkId === 'net-microsys');

  const targetPayments = exportScope === 'full'
    ? payments
    : payments.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetOrders = exportScope === 'full'
    ? orders
    : orders.filter((o) => !o.networkId || o.networkId === effectiveNetworkId || o.networkId === 'net-microsys');

  const targetUsers = exportScope === 'full'
    ? users
    : users.filter((u) => u.networkId === effectiveNetworkId || (u.role === 'system_owner' && isMasterUser));

  const targetTenants = exportScope === 'full'
    ? tenants
    : (currentTenant ? [currentTenant] : []);

  const targetLogs = includeAuditLogs
    ? (exportScope === 'full'
        ? activityLogs
        : activityLogs.filter((l) => !l.networkId || l.networkId === effectiveNetworkId))
    : [];

  // Generate Backup Object
  const generateBackupPayload = (): SystemDatabaseBackup => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const isFull = exportScope === 'full';

    return {
      version: '4.0.0',
      app: 'MicroSys Cloud WiFi & POS Management',
      backupType: isFull ? 'full_system' : 'single_network',
      exportDate: dateStr,
      timestamp: now.toISOString(),
      exportedBy: {
        id: activeUser?.id,
        name: activeUser?.name,
        username: activeUser?.username,
        role: activeUser?.role,
      },
      networkId: isFull ? undefined : effectiveNetworkId,
      networkName: isFull ? 'All Networks (System Database)' : networkDisplayName,
      counts: {
        tenants: targetTenants.length,
        users: targetUsers.length,
        categories: targetCategories.length,
        posPoints: targetPOSPoints.length,
        invoices: targetInvoices.length,
        expenses: targetExpenses.length,
        expenseCategories: targetExpenseCategories.length,
        dispatches: targetDispatches.length,
        sales: targetSales.length,
        payments: targetPayments.length,
        orders: targetOrders.length,
        templates: templates.length,
        activityLogs: targetLogs.length,
      },
      data: {
        tenants: targetTenants,
        users: targetUsers,
        categories: targetCategories,
        posPoints: targetPOSPoints,
        invoices: targetInvoices,
        expenses: targetExpenses,
        expenseCategories: targetExpenseCategories,
        dispatches: targetDispatches,
        sales: targetSales,
        payments: targetPayments,
        orders: targetOrders,
        settings: settings,
        templates: templates,
        activityLogs: targetLogs,
      },
      schemaSignature: `microsys_v4_${Date.now()}`,
    };
  };

  // Download Backup JSON
  const handleDownloadBackup = () => {
    const backupObj = generateBackupPayload();
    const jsonString = exportToJSON(backupObj);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const scopeName = exportScope === 'full' ? 'full_system' : `network_${effectiveNetworkId || 'main'}`;
    const filename = `microsys_database_${scopeName}_${dateStr}_${timeStr}.json`;

    downloadFile(jsonString, filename, 'application/json');

    if (onLogActivity) {
      onLogActivity(
        'تصدير نسخة احتياطية',
        'تصدير قاعدة بيانات النظام JSON',
        `تم تصدير نسخة احتياطية (${exportScope === 'full' ? 'شاملة لكافة الشبكات' : `خاصة بـ ${networkDisplayName}`}) بإجمالي ${Object.values(backupObj.counts).reduce((a, b) => (a || 0) + (b || 0), 0)} سجلاً`,
        'success'
      );
    }
  };

  // Copy JSON to Clipboard
  const handleCopyJson = async () => {
    try {
      const backupObj = generateBackupPayload();
      const jsonString = exportToJSON(backupObj);
      await navigator.clipboard.writeText(jsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  // Parse and validate imported JSON file content
  const validateAndParseJson = (rawContent: string) => {
    setParseError(null);
    setParsedBackup(null);
    setRestoreSuccess(false);

    if (!rawContent.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(rawContent);

      // Support structured SystemDatabaseBackup or legacy raw object
      let normalizedBackup: SystemDatabaseBackup;

      if (parsed.data && typeof parsed.data === 'object') {
        // Structured backup
        normalizedBackup = {
          version: parsed.version || '4.0.0',
          app: parsed.app || 'MicroSys',
          backupType: parsed.backupType || (parsed.data?.tenants?.length > 1 ? 'full_system' : 'single_network'),
          exportDate: parsed.exportDate || new Date().toISOString().split('T')[0],
          timestamp: parsed.timestamp || new Date().toISOString(),
          exportedBy: parsed.exportedBy,
          networkId: parsed.networkId,
          networkName: parsed.networkName,
          counts: parsed.counts || {
            tenants: parsed.data?.tenants?.length || 0,
            users: parsed.data?.users?.length || 0,
            categories: parsed.data?.categories?.length || 0,
            posPoints: parsed.data?.posPoints?.length || 0,
            invoices: parsed.data?.invoices?.length || 0,
            expenses: parsed.data?.expenses?.length || 0,
            expenseCategories: parsed.data?.expenseCategories?.length || 0,
            dispatches: parsed.data?.dispatches?.length || 0,
            sales: parsed.data?.sales?.length || 0,
            payments: parsed.data?.payments?.length || 0,
            orders: parsed.data?.orders?.length || 0,
          },
          data: parsed.data,
        };
      } else {
        // Legacy / Flat format
        normalizedBackup = {
          version: '3.x (Legacy)',
          app: 'MicroSys Database',
          backupType: (parsed.tenants && parsed.tenants.length > 1) ? 'full_system' : 'single_network',
          exportDate: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          counts: {
            tenants: parsed.tenants?.length || 0,
            users: parsed.users?.length || 0,
            categories: parsed.categories?.length || 0,
            posPoints: parsed.posPoints?.length || 0,
            invoices: parsed.invoices?.length || 0,
            expenses: parsed.expenses?.length || 0,
            expenseCategories: parsed.expenseCategories?.length || 0,
            dispatches: parsed.dispatches?.length || 0,
            sales: parsed.sales?.length || 0,
            payments: parsed.payments?.length || 0,
            orders: parsed.orders?.length || 0,
          },
          data: {
            tenants: parsed.tenants || [],
            users: parsed.users || [],
            categories: parsed.categories || [],
            posPoints: parsed.posPoints || [],
            invoices: parsed.invoices || [],
            expenses: parsed.expenses || [],
            expenseCategories: parsed.expenseCategories || [],
            dispatches: parsed.dispatches || [],
            sales: parsed.sales || [],
            payments: parsed.payments || [],
            orders: parsed.orders || [],
            settings: parsed.settings,
            templates: parsed.templates || [],
            activityLogs: parsed.activityLogs || [],
          },
        };
      }

      // Check if at least one data collection exists
      const totalRecords = Object.values(normalizedBackup.counts).reduce((a, b) => (a || 0) + (b || 0), 0);
      if (totalRecords === 0 && !normalizedBackup.data.settings) {
        setParseError('الملف لا يحتوي على أي بيانات صالحة للاستعادة.');
        return;
      }

      setParsedBackup(normalizedBackup);
    } catch (err: any) {
      setParseError('الملف الذي اخترته ليس ملف JSON صالحاً أو يحتوي على أخطاء برمجية.');
      setParsedBackup(null);
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportedJsonString(content);
      validateAndParseJson(content);
    };
    reader.readAsText(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setParseError('يرجى اختيار ملف بصيغة JSON فقط.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportedJsonString(content);
      validateAndParseJson(content);
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    const confirmMessage = restoreMode === 'overwrite'
      ? '⚠️ تنبيه هام: سيتم استبدال وحذف البيانات الحالية واستعادة النسخة الاحتياطية بالكامل. هل تريد المتابعة؟'
      : 'هل أنت متأكد من دمج السجلات المستوردة مع البيانات الحالية؟';

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsRestoring(true);

    try {
      onRestoreDatabase(parsedBackup.data, restoreMode, parsedBackup.backupType);

      if (onLogActivity) {
        onLogActivity(
          'استعادة نسخة احتياطية',
          'استعادة قاعدة بيانات النظام JSON',
          `تمت استعادة قاعدة البيانات بنجاح بنمط (${restoreMode === 'overwrite' ? 'استبدال شامل' : 'دمج وإلحاق'}) من ملف تم تصديره بتاريخ ${parsedBackup.exportDate}`,
          'warning'
        );
      }

      setRestoreSuccess(true);
      setTimeout(() => {
        setIsRestoring(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error during database restoration:', err);
      alert('حدث خطأ أثناء استعادة البيانات. يرجى المحاولة مرة أخرى.');
      setIsRestoring(false);
    }
  };

  const totalExportRecords =
    targetTenants.length +
    targetUsers.length +
    targetCategories.length +
    targetPOSPoints.length +
    targetInvoices.length +
    targetExpenses.length +
    targetExpenseCategories.length +
    targetDispatches.length +
    targetSales.length +
    targetPayments.length +
    targetOrders.length +
    templates.length +
    targetLogs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-20 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>النسخ الاحتياطي وقاعدة البيانات</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  JSON Backup
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                تصدير واستيراد قاعدة بيانات النظام والشبكات بالكامل كملف JSON لضمان أمان البيانات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition shrink-0"
            title="إغلاق"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-800 bg-slate-900/90 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية (Export JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد واستعادة البيانات (Restore JSON)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Scope Selector */}
              {isMasterUser && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>نطاق التصدير للنسخة الاحتياطية:</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportScope('full')}
                      className={`p-3 rounded-xl border text-right transition flex items-start gap-2.5 ${
                        exportScope === 'full'
                          ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${exportScope === 'full' ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'}`}>
                        {exportScope === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">قاعدة بيانات النظام بالكامل (SaaS Master)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">يشمل كافة الشبكات، المستخدمين، نقاط البيع، الفواتير والحسابات</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportScope('current')}
                      className={`p-3 rounded-xl border text-right transition flex items-start gap-2.5 ${
                        exportScope === 'current'
                          ? 'bg-indigo-950/60 border-indigo-500/80 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${exportScope === 'current' ? 'border-indigo-400 bg-indigo-600' : 'border-slate-600'}`}>
                        {exportScope === 'current' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">الشبكة الحالية فقط ({networkDisplayName})</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">تصدير مخصص للبيانات المرتبطة بهذه الشبكة فقط</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Records Breakdown Grid */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FolderArchive className="w-4 h-4 text-indigo-400" />
                    <span>محتويات ملف النسخة الاحتياطية:</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300 px-2.5 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    {totalExportRecords.toLocaleString()} سجل إجمالي
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
                  {exportScope === 'full' && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <Server className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="text-[10px]">الشبكات (Tenants)</span>
                      </div>
                      <p className="text-sm font-bold font-mono text-white">{targetTenants.length}</p>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-[10px]">المستخدمين والصلاحيات</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetUsers.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <Store className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px]">نقاط البيع والموزعين</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetPOSPoints.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px]">فئات الكروت والبروفايل</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetCategories.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px]">فواتير المبيعات والمرتجع</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetInvoices.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px]">سندات القبض والدفعات</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetPayments.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <Receipt className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[10px]">سندات الصرف والمصروفات</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetExpenses.length}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px]">طلبات الكروت</span>
                    </div>
                    <p className="text-sm font-bold font-mono text-white">{targetOrders.length}</p>
                  </div>
                </div>

                {/* Audit Logs Option Toggle */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeAuditLogs}
                      onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs text-slate-300">تضمين سجلات النشاط والمراقبة الأمنية ({targetLogs.length} سجل)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    صيغة JSON مشفرة UTF-8
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف النسخة الاحتياطية (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">تم نسخ البيانات للحافظة!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>نسخ محتوى JSON إلى الحافظة</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl flex items-start gap-2 text-xs text-indigo-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                <span>
                  <strong>نصيحة أمان:</strong> يُنصح بتحميل نسخة احتياطية بشكل دوري (يومياً أو أسبوعياً) والاحتفاظ بها في مجلد آمن أو سحابة خارجية لضمان إمكانية استرجاع البيانات المحاسبية بدقة 100%.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* File Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : parsedBackup
                    ? 'border-emerald-500/60 bg-emerald-950/10'
                    : 'border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition ${
                  parsedBackup
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {parsedBackup ? <CheckCircle2 className="w-6 h-6" /> : <FileJson className="w-6 h-6" />}
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  {parsedBackup ? 'تم اختيار ملف النسخة الاحتياطية بنجاح' : 'انقر لاختيار ملف النسخة الاحتياطية (JSON) أو اسحبه هنا'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  يقبل كافة ملفات النسخ الاحتياطي الصادرة من منظومة MicroSys Cloud
                </p>
              </div>

              {/* Parsing Error Message */}
              {parseError && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center gap-2.5 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Backup Preview Card */}
              {parsedBackup && (
                <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          فحص النسخة: {parsedBackup.app} ({parsedBackup.version})
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          تاريخ التصدير: {parsedBackup.exportDate} {parsedBackup.exportedBy?.name ? `• بواسطة: ${parsedBackup.exportedBy.name}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {parsedBackup.backupType === 'full_system' ? 'نسخة شاملة لكافة الشبكات' : 'نسخة شبكة مفردة'}
                    </span>
                  </div>

                  {/* Summary of Data in File */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right text-xs">
                    {parsedBackup.counts.tenants !== undefined && parsedBackup.counts.tenants > 0 && (
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">الشبكات:</span>
                        <span className="font-mono font-bold text-white">{parsedBackup.counts.tenants}</span>
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">المستخدمين:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.users || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">نقاط البيع:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.posPoints || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">الفئات:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.categories || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">الفواتير:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.invoices || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">سندات القبض:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.payments || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">المصروفات:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.expenses || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">الطلبات:</span>
                      <span className="font-mono font-bold text-white">{parsedBackup.counts.orders || 0}</span>
                    </div>
                  </div>

                  {/* Restore Mode Options */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">
                      طريقة الاستعادة والتطبيق:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('overwrite')}
                        className={`p-3 rounded-xl border text-right transition flex items-start gap-2.5 ${
                          restoreMode === 'overwrite'
                            ? 'bg-rose-950/40 border-rose-500/80 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${restoreMode === 'overwrite' ? 'border-rose-400 bg-rose-600' : 'border-slate-600'}`}>
                          {restoreMode === 'overwrite' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">استبدال شامل ونظيف (Clean Overwrite)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">استبدال البيانات الحالية بالكامل بالنسخة المستوردة بدقة 100%</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3 rounded-xl border text-right transition flex items-start gap-2.5 ${
                          restoreMode === 'merge'
                            ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${restoreMode === 'merge' ? 'border-emerald-400 bg-emerald-600' : 'border-slate-600'}`}>
                          {restoreMode === 'merge' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">دمج وإلحاق ذكي (Smart Merge)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">إضافة السجلات غير الموجودة وتحديث السجلات المتطابقة</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Restore Trigger Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleExecuteRestore}
                      className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition shadow-lg ${
                        restoreSuccess
                          ? 'bg-emerald-600 text-white'
                          : isRestoring
                          ? 'bg-slate-700 text-slate-300 cursor-wait'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-98'
                      }`}
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ استعادة ومزامنة قاعدة البيانات...</span>
                        </>
                      ) : restoreSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تمت استعادة البيانات وتحديث المنظومة بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>تنفيذ استعادة قاعدة البيانات الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-20 p-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>نظام الحماية وقواعد البيانات MicroSys Cloud v4.0</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
