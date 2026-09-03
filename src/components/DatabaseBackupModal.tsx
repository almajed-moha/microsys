import React, { useState, useRef, useEffect } from 'react';
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
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  ExternalLink,
  LogOut,
  Globe,
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
import { generateSystemBackup } from '../utils/backupGenerator';
import {
  initGoogleDriveAuth,
  signInWithGoogle,
  signOutGoogle,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  downloadBackupFromGoogleDrive,
  deleteFileFromGoogleDrive,
  GoogleDriveBackupFile,
  getCurrentGoogleUser,
  getDriveAccessToken,
} from '../services/googleDriveService';
import type { User as FirebaseUser } from 'firebase/auth';

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
  onSaveSettings?: (settings: NetworkSettings) => void;
  onRestoreDatabase: (
    backupData: SystemDatabaseBackupData,
    mode: 'overwrite' | 'merge',
    backupType?: 'full_system' | 'single_network'
  ) => void;
  onClose: () => void;
  onLogActivity?: (action: string, title: string, details: string, status?: 'success' | 'warning' | 'danger' | 'info') => void;
  onUpdateUser?: (user: AppUser) => void;
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
  onSaveSettings,
  onRestoreDatabase,
  onClose,
  onLogActivity,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'gdrive'>('export');
  const [selectedExportNetworkId, setSelectedExportNetworkId] = useState<string>('all');
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

  // Google Drive State
  const [gDriveUser, setGDriveUser] = useState<FirebaseUser | null>(getCurrentGoogleUser());
  const [isGDriveSignedIn, setIsGDriveSignedIn] = useState<boolean>(Boolean(getDriveAccessToken()));
  const [isSigningInGDrive, setIsSigningInGDrive] = useState<boolean>(false);
  const [gDriveFiles, setGDriveFiles] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoadingGDriveFiles, setIsLoadingGDriveFiles] = useState<boolean>(false);
  const [isUploadingToGDrive, setIsUploadingToGDrive] = useState<boolean>(false);
  const [downloadingDriveFileId, setDownloadingDriveFileId] = useState<string | null>(null);
  const [deletingDriveFileId, setDeletingDriveFileId] = useState<string | null>(null);
  const [deleteConfirmDriveFileId, setDeleteConfirmDriveFileId] = useState<string | null>(null);
  const [gDriveFeedback, setGDriveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<FirebaseUser | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Drive Auth Listener
  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (user) => {
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
        loadGDriveFiles();
      },
      () => {
        setGDriveUser(null);
        setIsGDriveSignedIn(false);
        setGDriveFiles([]);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSignInGoogleDrive = async () => {
    setIsSigningInGDrive(true);
    setGDriveFeedback(null);
    try {
      const { user } = await signInWithGoogle();
      
      if (!activeUser?.email) {
        if (onUpdateUser && activeUser) {
          onUpdateUser({ ...activeUser, email: user.email || '' });
        }
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
        setGDriveFeedback({ type: 'success', message: `تم الاتصال بحساب Google بنجاح وتم تسجيل البريد (${user.email}) في بياناتك` });
        await loadGDriveFiles();
      } else if (activeUser.email.toLowerCase() !== user.email?.toLowerCase()) {
        setPendingGoogleUser(user);
      } else {
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
        setGDriveFeedback({ type: 'success', message: `تم الاتصال بحساب Google بنجاح (${user.email})` });
        await loadGDriveFiles();
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setGDriveFeedback({
        type: 'error',
        message: err?.message || 'فشل تسجيل الدخول باستخدام حساب Google. تأكد من السماح بالنوافذ المنبثقة.',
      });
    } finally {
      setIsSigningInGDrive(false);
    }
  };

  const handleSignOutGoogleDrive = async () => {
    await signOutGoogle();
    setGDriveUser(null);
    setIsGDriveSignedIn(false);
    setGDriveFiles([]);
    setGDriveFeedback({ type: 'success', message: 'تم قطع الاتصال بـ Google Drive.' });
  };

  const loadGDriveFiles = async () => {
    if (!getDriveAccessToken()) return;
    setIsLoadingGDriveFiles(true);
    try {
      const files = await listGoogleDriveBackups();
      setGDriveFiles(files);
    } catch (err: any) {
      console.warn('Error listing drive files:', err);
    } finally {
      setIsLoadingGDriveFiles(false);
    }
  };

  const handleUploadToGoogleDrive = async () => {
    if (!getDriveAccessToken()) {
      try {
        setIsSigningInGDrive(true);
        const { user } = await signInWithGoogle();
        setGDriveUser(user);
        setIsGDriveSignedIn(true);
      } catch (err: any) {
        setGDriveFeedback({ type: 'error', message: 'يرجى تسجيل الدخول إلى Google Drive للمتابعة.' });
        return;
      } finally {
        setIsSigningInGDrive(false);
      }
    }

    setIsUploadingToGDrive(true);
    setGDriveFeedback(null);
    try {
      const backupObj = generateBackupPayload();
      const jsonString = exportToJSON(backupObj);
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const scopeTag = selectedExportNetworkId === 'all' ? 'FULL_SAAS' : (currentTenant?.name?.replace(/\s+/g, '_') || 'NETWORK');
      const fileName = `MicroSys_Backup_${scopeTag}_${dateStr}_${timeStr}.json`;
      const description = `MicroSys Cloud WiFi Database Backup - ${scopeTag} - Exported by ${activeUser?.name || 'Admin'} on ${dateStr}`;

      await uploadBackupToGoogleDrive(fileName, jsonString, description);

      setGDriveFeedback({
        type: 'success',
        message: `تم رفع النسخة الاحتياطية بنجاح إلى Google Drive (${fileName})`,
      });

      if (onLogActivity) {
        onLogActivity(
          'نسخ احتياطي سحابي',
          'رفع قاعدة البيانات إلى Google Drive',
          `تم حفظ نسخة احتياطية سحابية باسم ${fileName} في Google Drive`,
          'info'
        );
      }

      await loadGDriveFiles();
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      setGDriveFeedback({
        type: 'error',
        message: err.message || 'تعذر رفع النسخة إلى Google Drive.',
      });
    } finally {
      setIsUploadingToGDrive(false);
    }
  };

  const handleRestoreFromDriveFile = async (file: GoogleDriveBackupFile) => {
    setDownloadingDriveFileId(file.id);
    setGDriveFeedback(null);
    try {
      const rawContent = await downloadBackupFromGoogleDrive(file.id);
      setImportedJsonString(rawContent);
      validateAndParseJson(rawContent);
      setActiveTab('import');
      setGDriveFeedback({
        type: 'success',
        message: `تم تحميل ملف النسخة (${file.name}) من Google Drive بنجاح، يمكنك الآن تأكيد الاستعادة أدناه.`,
      });
    } catch (err: any) {
      console.error('Download drive file error:', err);
      setGDriveFeedback({
        type: 'error',
        message: err.message || 'تعذر تنزيل ملف النسخة من Google Drive.',
      });
    } finally {
      setDownloadingDriveFileId(null);
    }
  };

  const handleDownloadLocalFromDriveFile = async (file: GoogleDriveBackupFile) => {
    setDownloadingDriveFileId(file.id);
    try {
      const rawContent = await downloadBackupFromGoogleDrive(file.id);
      downloadFile(rawContent, file.name, 'application/json');
    } catch (err: any) {
      setGDriveFeedback({ type: 'error', message: err.message || 'تعذر تنزيل الملف.' });
    } finally {
      setDownloadingDriveFileId(null);
    }
  };

  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    setDeletingDriveFileId(fileId);
    try {
      await deleteFileFromGoogleDrive(fileId);
      setGDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeleteConfirmDriveFileId(null);
      setGDriveFeedback({
        type: 'success',
        message: `تم حذف النسخة (${fileName}) من Google Drive بنجاح.`,
      });
    } catch (err: any) {
      setGDriveFeedback({
        type: 'error',
        message: err.message || 'تعذر حذف الملف من Google Drive.',
      });
    } finally {
      setDeletingDriveFileId(null);
    }
  };

  // Determine current network info
  const isMasterUser = activeUser?.role === 'system_owner';
  const effectiveNetworkId = activeUser?.networkId && activeUser.networkId !== 'system'
    ? activeUser.networkId
    : (selectedTenantFilter !== 'all' ? selectedTenantFilter : (tenants[0]?.id || ''));
  const currentTenant = tenants.find((t) => t.id === effectiveNetworkId);
  const networkDisplayName = currentTenant?.name || settings.networkName || 'الشبكة الحالية';

  // Calculate filtered records if current scope
  const targetCategories = selectedExportNetworkId === 'all'
    ? categories
    : categories.filter((c) => !c.networkId || c.networkId === effectiveNetworkId || c.networkId === 'net-microsys');

  const targetPOSPoints = selectedExportNetworkId === 'all'
    ? posPoints
    : posPoints.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetInvoices = selectedExportNetworkId === 'all'
    ? invoices
    : invoices.filter((i) => !i.networkId || i.networkId === effectiveNetworkId || i.networkId === 'net-microsys');

  const targetExpenses = selectedExportNetworkId === 'all'
    ? expenses
    : expenses.filter((e) => !e.networkId || e.networkId === effectiveNetworkId || e.networkId === 'net-microsys');

  const targetExpenseCategories = selectedExportNetworkId === 'all'
    ? expenseCategories
    : expenseCategories.filter((ec) => !ec.networkId || ec.networkId === effectiveNetworkId || ec.networkId === 'net-microsys');

  const targetDispatches = selectedExportNetworkId === 'all'
    ? dispatches
    : dispatches.filter((d) => !d.networkId || d.networkId === effectiveNetworkId || d.networkId === 'net-microsys');

  const targetSales = selectedExportNetworkId === 'all'
    ? sales
    : sales.filter((s) => !s.networkId || s.networkId === effectiveNetworkId || s.networkId === 'net-microsys');

  const targetPayments = selectedExportNetworkId === 'all'
    ? payments
    : payments.filter((p) => !p.networkId || p.networkId === effectiveNetworkId || p.networkId === 'net-microsys');

  const targetOrders = selectedExportNetworkId === 'all'
    ? orders
    : orders.filter((o) => !o.networkId || o.networkId === effectiveNetworkId || o.networkId === 'net-microsys');

  const targetUsers = selectedExportNetworkId === 'all'
    ? users
    : users.filter((u) => u.networkId === effectiveNetworkId || (u.role === 'system_owner' && isMasterUser));

  const targetTenants = selectedExportNetworkId === 'all'
    ? tenants
    : (currentTenant ? [currentTenant] : []);

  const targetLogs = includeAuditLogs
    ? (selectedExportNetworkId === 'all'
        ? activityLogs
        : activityLogs.filter((l) => !l.networkId || l.networkId === effectiveNetworkId))
    : [];

  // Generate Backup Object
  const generateBackupPayload = (): SystemDatabaseBackup => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const isFull = selectedExportNetworkId === 'all';

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
    const scopeName = selectedExportNetworkId === 'all' ? 'full_system' : `network_${effectiveNetworkId || 'main'}`;
    const filename = `microsys_database_${scopeName}_${dateStr}_${timeStr}.json`;

    downloadFile(jsonString, filename, 'application/json');

    if (onLogActivity) {
      onLogActivity(
        'تصدير نسخة احتياطية',
        'تصدير قاعدة بيانات النظام JSON',
        `تم تصدير نسخة احتياطية (${selectedExportNetworkId === 'all' ? 'شاملة لكافة الشبكات' : `خاصة بـ ${networkDisplayName}`}) بإجمالي ${Object.values(backupObj.counts).reduce((a, b) => (a || 0) + (b || 0), 0)} سجلاً`,
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
        <div className="px-5 pt-4 pb-2 border-b border-slate-800 bg-slate-900/90 flex flex-wrap sm:flex-nowrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة (Export JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد واستعادة (Restore)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('gdrive');
              if (getDriveAccessToken()) {
                loadGDriveFiles();
              }
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'gdrive'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-blue-300" />
            <span>سحابة Google Drive</span>
            {gDriveFiles.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/30 text-white font-mono">
                {gDriveFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Scope Selector */}
              {isMasterUser ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>نطاق النسخ الاحتياطي:</span>
                  </label>
                  <select
                    value={selectedExportNetworkId}
                    onChange={(e) => setSelectedExportNetworkId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">قاعدة بيانات النظام بالكامل (الافتراضي)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>شبكة مخصصة: {t.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="mt-0.5"><Database className="w-5 h-5 text-indigo-400" /></div>
                  <div>
                    <h4 className="text-indigo-300 font-bold text-sm">نسخ احتياطي للشبكة</h4>
                    <p className="text-xs text-indigo-200/70 mt-1">
                      سيتم إنشاء نسخة احتياطية آمنة تحتوي على كافة بيانات شبكتك الحالية ({currentTenant?.name || settings.networkName}) فقط.
                    </p>
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
                    {(totalExportRecords ?? 0).toLocaleString()} سجل إجمالي
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
                  {selectedExportNetworkId === 'all' && (
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

                <button
                  type="button"
                  onClick={handleUploadToGoogleDrive}
                  disabled={isUploadingToGDrive}
                  className="sm:col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50 active:scale-98"
                >
                  {isUploadingToGDrive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ رفع النسخة الاحتياطية إلى Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>حفظ ورفع نسخة سحابية مباشرة إلى Google Drive</span>
                    </>
                  )}
                </button>
              </div>

              {/* Google Drive Status Alert if any */}
              {gDriveFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    gDriveFeedback.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-800 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {gDriveFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{gDriveFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGDriveFeedback(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

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
              {/* Shortcut to Google Drive */}
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between gap-2 text-xs text-blue-200">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>هل قمت بحفظ نسخ احتياطية على Google Drive من قبل؟</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('gdrive');
                    if (getDriveAccessToken()) loadGDriveFiles();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs shrink-0 flex items-center gap-1.5"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>استعراض نسخ Google Drive</span>
                </button>
              </div>
              
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

          {/* TAB 3: GOOGLE DRIVE CLOUD BACKUPS */}
          {activeTab === 'gdrive' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Account Connection Header */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm sm:text-base">الربط السحابي مع Google Drive</h4>
                      {isGDriveSignedIn ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>متصل</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          غير متصل
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isGDriveSignedIn && gDriveUser
                        ? `حساب Google المرتبط: ${gDriveUser.email}`
                        : 'احفظ واسترجع نسخ قاعدة بيانات المايكروتك ونقاط البيع تلقائياً على حساب Google الخاص بك.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isGDriveSignedIn ? (
                    <>
                      <button
                        type="button"
                        onClick={loadGDriveFiles}
                        disabled={isLoadingGDriveFiles}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                        title="تحديث قائمة الملفات من Google Drive"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGDriveFiles ? 'animate-spin' : ''}`} />
                        <span>تحديث</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSignOutGoogleDrive}
                        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                        title="تسجيل الخروج وقطع الاتصال"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>قطع الاتصال</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignInGoogleDrive}
                      disabled={isSigningInGDrive}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                    >
                      {isSigningInGDrive ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ فتح تسجيل الدخول...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>تسجيل الدخول باستخدام Google</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Banner */}
              {gDriveFeedback && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    gDriveFeedback.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-800 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {gDriveFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{gDriveFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGDriveFeedback(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload to Drive Section */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CloudUpload className="w-4 h-4 text-indigo-400" />
                    <span>رفع نسخة احتياطية جديدة لقاعدة البيانات</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    سيتم تجميع بيانات النظام ({totalExportRecords} سجلاً) وتصديرها بصيغة JSON ورفعها مباشرة لمساحة Google Drive.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUploadToGoogleDrive}
                  disabled={isUploadingToGDrive}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 shrink-0"
                >
                  {isUploadingToGDrive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ الرفع السحابي...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>رفع نسخة احتياطية الآن</span>
                    </>
                  )}
                </button>
              </div>

              {/* Files List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-blue-400" />
                    <span>ملفات النسخ الاحتياطي المحفوظة في Google Drive ({gDriveFiles.length})</span>
                  </h4>
                  {isLoadingGDriveFiles && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                      <span>جارٍ فحص الملفات...</span>
                    </span>
                  )}
                </div>

                {!isGDriveSignedIn ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center bg-slate-950/40 space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-white text-sm">سجل الدخول لاستعراض النسخ المحفوظة على Google Drive</h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      انقر على زر "تسجيل الدخول باستخدام Google" بالأعلى لتفويض التطبيق بمزامنة وحفظ النسخ الاحتياطية في مجلدك السحابي.
                    </p>
                    <button
                      type="button"
                      onClick={handleSignInGoogleDrive}
                      disabled={isSigningInGDrive}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 inline-flex items-center gap-2"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>ربط حساب Google Drive الآن</span>
                    </button>
                  </div>
                ) : gDriveFiles.length === 0 && !isLoadingGDriveFiles ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center bg-slate-950/40 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
                    <h5 className="font-bold text-white text-sm">لا توجد نسخ احتياطية محفوظة حتى الآن في حساب Google Drive</h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      يمكنك النقر على "رفع نسخة احتياطية الآن" بالأعلى لحفظ أول نسخة احتياطية من قاعدة البيانات على Drive.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {gDriveFiles.map((file) => {
                      const isDownloading = downloadingDriveFileId === file.id;
                      const isDeleting = deletingDriveFileId === file.id;
                      const isConfirmingDelete = deleteConfirmDriveFileId === file.id;

                      const formattedDate = file.createdTime
                        ? new Date(file.createdTime).toLocaleString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'غير محدد';

                      return (
                        <div
                          key={file.id}
                          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                              <FileJson className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white font-mono dir-ltr text-right line-clamp-1">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span>{formattedDate}</span>
                                </span>
                                {file.size && (
                                  <span className="font-mono text-slate-500">
                                    {(Number(file.size) / 1024).toFixed(1)} KB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => handleRestoreFromDriveFile(file)}
                              disabled={isDownloading}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                              title="استعادة قاعدة البيانات من هذه النسخة السحابية"
                            >
                              {isDownloading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>استعادة من Drive</span>
                            </button>

                            {/* Download local copy */}
                            <button
                              type="button"
                              onClick={() => handleDownloadLocalFromDriveFile(file)}
                              disabled={isDownloading}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              title="تنزيل الملف على جهازك"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* External link to Google Drive */}
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition"
                                title="فتح في Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Delete File */}
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDriveFile(file.id, file.name)}
                                  disabled={isDeleting}
                                  className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition disabled:opacity-50"
                                >
                                  {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmDriveFileId(null)}
                                  className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[10px] hover:text-white"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmDriveFileId(file.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
                                title="حذف النسخة من Google Drive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        
      {/* Pending Google User Confirmation Modal */}
      {pendingGoogleUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-lg">تحذير: اختلاف البريد الإلكتروني</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              حساب Google الذي قمت بتسجيل الدخول به (<span className="font-bold text-white dir-ltr inline-block">{pendingGoogleUser.email}</span>) 
              يختلف عن البريد الإلكتروني المسجل في بياناتك (<span className="font-bold text-white dir-ltr inline-block">{activeUser?.email}</span>).
            </p>
            <p className="text-sm text-slate-300 mb-6">
              هل تريد المتابعة وتحديث بريدك الإلكتروني المسجل ليكون مطابقاً لهذا الحساب؟ سيتم إضافة هذا البريد إلى بياناتك.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  signOutGoogle();
                  setPendingGoogleUser(null);
                  setGDriveFeedback({ type: 'error', message: 'تم إلغاء عملية الربط لاختلاف البريد الإلكتروني.' });
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-sm"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onUpdateUser && activeUser) {
                    onUpdateUser({ ...activeUser, email: pendingGoogleUser.email || '' });
                  }
                  setGDriveUser(pendingGoogleUser);
                  setIsGDriveSignedIn(true);
                  setGDriveFeedback({ type: 'success', message: `تم الاتصال بحساب Google وتحديث بريدك بنجاح (${pendingGoogleUser.email})` });
                  setPendingGoogleUser(null);
                  await loadGDriveFiles();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition text-sm shadow-lg shadow-amber-600/20"
              >
                المتابعة والتحديث
              </button>
            </div>
          </div>
        </div>
      )}

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
