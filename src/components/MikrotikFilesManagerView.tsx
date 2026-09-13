import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder,
  FileCode,
  Archive,
  Terminal,
  Download,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Database,
  Lock,
  Play,
  Copy,
  Check,
  X,
  SlidersHorizontal,
  HardDrive,
  Globe,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Code2,
  Save,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { MikroTikConfig, MikrotikFileItem, MikrotikFileCategory } from '../types';
import {
  fetchMikrotikFiles,
  fetchMikrotikFileContent,
  saveMikrotikFile,
  deleteMikrotikFile,
  uploadMikrotikFile,
  createMikrotikBackup,
  exportMikrotikConfig,
  runMikrotikScript,
  formatBytesToHuman
} from '../utils/mikrotikApi';

interface MikrotikFilesManagerViewProps {
  config: Partial<MikroTikConfig>;
  isConnected: boolean;
  routerIdentity?: string;
}

export const MikrotikFilesManagerView: React.FC<MikrotikFilesManagerViewProps> = ({
  config,
  isConnected,
  routerIdentity = 'MikroTik'
}) => {
  // Main Files State
  const [files, setFiles] = useState<MikrotikFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<MikrotikFileCategory>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // File Editor Modal State
  const [editorFile, setEditorFile] = useState<MikrotikFileItem | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [editorTab, setEditorTab] = useState<'code' | 'preview' | 'variables'>('code');
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupName, setBackupName] = useState(`backup-${routerIdentity.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`);
  const [backupPassword, setBackupPassword] = useState('');
  const [dontEncryptBackup, setDontEncryptBackup] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Export RSC Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilename, setExportFilename] = useState(`export-${routerIdentity.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`);
  const [exportCompact, setExportCompact] = useState(true);
  const [exportHideSensitive, setExportHideSensitive] = useState(true);
  const [isExportingRsc, setIsExportingRsc] = useState(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetFolder, setTargetFolder] = useState<'hotspot/' | '' | 'flash/' | 'skins/'>('hotspot/');
  const [customFolder, setCustomFolder] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New File Modal State
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileTemplate, setNewFileTemplate] = useState<'blank' | 'hotspot_login' | 'hotspot_status' | 'rsc_script' | 'errors_txt'>('hotspot_login');
  const [newFileFolder, setNewFileFolder] = useState('hotspot/');
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState<MikrotikFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Run Script Modal State
  const [scriptTarget, setScriptTarget] = useState<MikrotikFileItem | null>(null);
  const [isRunningScript, setIsRunningScript] = useState(false);

  // HTML Preview Modal State
  const [previewHtmlItem, setPreviewHtmlItem] = useState<{ name: string; content: string } | null>(null);

  // Fetch files on mount or when connection changes
  const loadFiles = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const items = await fetchMikrotikFiles(config);
      setFiles(items);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `تعذر جلب الملفات: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [config.host, config.port, isConnected]);

  // Helper to categorize files
  const getFileCategory = (item: MikrotikFileItem): MikrotikFileCategory => {
    const name = (item.name || '').toLowerCase();
    const type = (item.type || '').toLowerCase();

    if (name.startsWith('hotspot/') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.js') || name.includes('login') || name.includes('status')) {
      return 'hotspot';
    }
    if (name.endsWith('.backup') || type.includes('backup')) {
      return 'backup';
    }
    if (name.endsWith('.rsc') || type.includes('script')) {
      return 'script';
    }
    return 'other';
  };

  // Helper to check if file is text-editable
  const isEditableFile = (fileName: string): boolean => {
    const lower = fileName.toLowerCase();
    return (
      lower.endsWith('.html') ||
      lower.endsWith('.htm') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.rsc') ||
      lower.endsWith('.css') ||
      lower.endsWith('.js') ||
      lower.endsWith('.json') ||
      lower.endsWith('.xml')
    );
  };

  // Helper for File Icon
  const getFileIcon = (item: MikrotikFileItem) => {
    if (item.isDirectory || item.type === 'directory') {
      return <Folder className="w-5 h-5 text-amber-400" />;
    }
    const lower = item.name.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      return <FileCode className="w-5 h-5 text-orange-400" />;
    }
    if (lower.endsWith('.backup')) {
      return <Archive className="w-5 h-5 text-emerald-400" />;
    }
    if (lower.endsWith('.rsc')) {
      return <Terminal className="w-5 h-5 text-sky-400" />;
    }
    if (lower.endsWith('.css')) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    if (lower.endsWith('.js')) {
      return <Code2 className="w-5 h-5 text-yellow-400" />;
    }
    if (lower.endsWith('.db') || lower.endsWith('.sqlite')) {
      return <Database className="w-5 h-5 text-purple-400" />;
    }
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesSearch =
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (file.type || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (activeCategory === 'all') return true;
        return getFileCategory(file) === activeCategory;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'size') {
          diff = (a.size || 0) - (b.size || 0);
        } else if (sortBy === 'date') {
          diff = (a.creationTime || '').localeCompare(b.creationTime || '');
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [files, searchQuery, activeCategory, sortBy, sortOrder]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalFiles = files.filter(f => !f.isDirectory).length;
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const hotspotCount = files.filter(f => getFileCategory(f) === 'hotspot').length;
    const backupCount = files.filter(f => getFileCategory(f) === 'backup').length;
    const scriptCount = files.filter(f => getFileCategory(f) === 'script').length;
    const otherCount = files.filter(f => getFileCategory(f) === 'other').length;
    return { totalFiles, totalSize, hotspotCount, backupCount, scriptCount, otherCount };
  }, [files]);

  // Action Handlers
  const handleOpenFileEditor = async (file: MikrotikFileItem) => {
    setEditorFile(file);
    setEditorTab('code');
    setIsEditorLoading(true);
    try {
      const data = await fetchMikrotikFileContent(config, file.id || file.name);
      if (data && typeof data.content === 'string') {
        setEditorContent(data.content);
      } else {
        setEditorContent('');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `تعذر قراءة محتوى الملف: ${err.message}` });
    } finally {
      setIsEditorLoading(false);
    }
  };

  const handleSaveEditorContent = async () => {
    if (!editorFile) return;
    setIsSavingContent(true);
    try {
      const res = await saveMikrotikFile(config, editorFile.id || editorFile.name, editorContent);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'تم حفظ التعديلات على الملف بنجاح!' });
        loadFiles();
      } else {
        setFeedback({ type: 'error', message: res.message || 'فشل حفظ الملف' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ أثناء الحفظ: ${err.message}` });
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleDownloadFile = async (file: MikrotikFileItem) => {
    try {
      // If it's a text/editable file, get content and trigger browser download
      if (isEditableFile(file.name)) {
        const data = await fetchMikrotikFileContent(config, file.id || file.name);
        const text = data?.content ?? '';
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.split('/').pop() || file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Binary / backup download
        const blob = new Blob([`[MikroTik ${file.type} - ${file.name}]`], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.split('/').pop() || file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setFeedback({ type: 'success', message: `بدأ تحميل الملف (${file.name}) بنجاح.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `تعذر تحميل الملف: ${err.message}` });
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteMikrotikFile(config, deleteTarget.id || deleteTarget.name);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || `تم حذف الملف (${deleteTarget.name}) بنجاح.` });
        setDeleteTarget(null);
        loadFiles();
      } else {
        setFeedback({ type: 'error', message: res.message || 'تعذر حذف الملف' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ أثناء حذف الملف: ${err.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await createMikrotikBackup(config, {
        name: backupName,
        password: backupPassword || undefined,
        dontEncrypt: dontEncryptBackup,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'تم أخذ النسخة الاحتياطية بنجاح!' });
        setShowBackupModal(false);
        loadFiles();
      } else {
        setFeedback({ type: 'error', message: res.message || 'فشل إنشاء النسخة الاحتياطية' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ: ${err.message}` });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleExportRsc = async () => {
    setIsExportingRsc(true);
    try {
      const res = await exportMikrotikConfig(config, {
        filename: exportFilename,
        compact: exportCompact,
        hideSensitive: exportHideSensitive,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'تم تصدير سكربت الإعدادات بنجاح!' });
        setShowExportModal(false);
        loadFiles();
      } else {
        setFeedback({ type: 'error', message: res.message || 'فشل تصدير الإعدادات' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ: ${err.message}` });
    } finally {
      setIsExportingRsc(false);
    }
  };

  const handleRunScript = async () => {
    if (!scriptTarget) return;
    setIsRunningScript(true);
    try {
      const res = await runMikrotikScript(config, scriptTarget.name);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || `تم تشغيل السكربت (${scriptTarget.name}) بنجاح!` });
        setScriptTarget(null);
      } else {
        setFeedback({ type: 'error', message: res.message || 'فشل تشغيل السكربت' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ: ${err.message}` });
    } finally {
      setIsRunningScript(false);
    }
  };

  const handleUploadFileSubmit = async () => {
    if (!selectedUploadFile) return;
    setIsUploading(true);
    try {
      const folder = targetFolder === '' ? customFolder : targetFolder;
      const targetName = `${folder}${selectedUploadFile.name}`;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const textContent = e.target?.result as string;
        const res = await uploadMikrotikFile(config, targetName, textContent);
        if (res.success) {
          setFeedback({ type: 'success', message: res.message || `تم رفع الملف (${targetName}) بنجاح!` });
          setShowUploadModal(false);
          setSelectedUploadFile(null);
          loadFiles();
        } else {
          setFeedback({ type: 'error', message: res.message || 'فشل رفع الملف' });
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        setFeedback({ type: 'error', message: 'تعذر قراءة الملف المختار' });
        setIsUploading(false);
      };
      reader.readAsText(selectedUploadFile);
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ: ${err.message}` });
      setIsUploading(false);
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) return;
    setIsCreatingNewFile(true);
    try {
      const folder = newFileFolder.endsWith('/') ? newFileFolder : `${newFileFolder}/`;
      const fullPath = `${folder}${newFileName.trim()}`;

      let initialContent = '';
      if (newFileTemplate === 'hotspot_login') {
        initialContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>تسجيل الدخول - ${routerIdentity}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #1e293b; padding: 2rem; border-radius: 1rem; width: 340px; text-align: center; border: 1px solid #334155; }
    input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border-radius: 0.5rem; border: 1px solid #475569; background: #0f172a; color: white; box-sizing: border-box; }
    button { width: 100%; padding: 0.75rem; border: none; background: #0284c7; color: white; font-weight: bold; border-radius: 0.5rem; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <h2>تسجيل الدخول للشبكة</h2>
    $(if error)<div style="color:#ef4444;margin-bottom:1rem;">$(error)</div>$(endif)
    <form name="login" action="$(link-login-only)" method="post">
      <input type="hidden" name="dst" value="$(link-orig)" />
      <input type="text" name="username" placeholder="رقم الكارت" value="$(username)" />
      <input type="password" name="password" placeholder="كلمة المرور" />
      <button type="submit">دخول</button>
    </form>
  </div>
</body>
</html>`;
      } else if (newFileTemplate === 'hotspot_status') {
        initialContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>حالة الاتصال</title>
</head>
<body>
  <h2>مرحباً $(username)</h2>
  <p>الوقت المنقضي: $(uptime)</p>
  <p>الرصيد المتبقي: $(remain-bytes-total)</p>
  <form action="$(link-logout)" method="post">
    <button type="submit">تسجيل الخروج</button>
  </form>
</body>
</html>`;
      } else if (newFileTemplate === 'rsc_script') {
        initialContent = `# RouterOS Custom Script
# Generated for: ${routerIdentity}
# Date: ${new Date().toLocaleString()}

/log info message="Custom script executed successfully."
`;
      } else if (newFileTemplate === 'errors_txt') {
        initialContent = `user-not-found = رقم الكارت غير صحيح
wrong-password = كلمة المرور غير صحيحة
uptime-limit = انتهى وقت الكارت
traffic-limit = انتهى رصيد الكارت
`;
      }

      const res = await uploadMikrotikFile(config, fullPath, initialContent);
      if (res.success) {
        setFeedback({ type: 'success', message: `تم إنشاء الملف (${fullPath}) بنجاح!` });
        setShowNewFileModal(false);
        setNewFileName('');
        loadFiles();
        // Immediately open in editor
        handleOpenFileEditor({
          id: res.file?.id || fullPath,
          name: fullPath,
          type: fullPath.endsWith('.html') ? '.html file' : fullPath.endsWith('.rsc') ? 'script' : '.txt file',
          size: initialContent.length,
          creationTime: new Date().toLocaleString(),
          contents: initialContent,
        });
      } else {
        setFeedback({ type: 'error', message: res.message || 'فشل إنشاء الملف' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `خطأ: ${err.message}` });
    } finally {
      setIsCreatingNewFile(false);
    }
  };

  const handleOpenHtmlPreview = async (file: MikrotikFileItem) => {
    try {
      const data = await fetchMikrotikFileContent(config, file.id || file.name);
      const content = data?.content || file.contents || '<p>لا يوجد محتوى للمعاينة</p>';
      // Replace MikroTik variables with mock values for preview
      const previewHtml = content
        .replace(/\$\(username\)/g, '771234')
        .replace(/\$\(mac\)/g, '44:D9:E7:AA:BB:CC')
        .replace(/\$\(ip\)/g, '10.5.50.145')
        .replace(/\$\(uptime\)/g, '45m 12s')
        .replace(/\$\(bytes-in-nice\)/g, '124.5 MB')
        .replace(/\$\(bytes-out-nice\)/g, '48.2 MB')
        .replace(/\$\(session-time-left\)/g, '2h 15m')
        .replace(/\$\(remain-bytes-total\)/g, '850 MB')
        .replace(/\$\(error\)/g, 'كارت تجريبي للمعاينة')
        .replace(/\$\(link-login-only\)/g, '#')
        .replace(/\$\(link-logout\)/g, '#')
        .replace(/\$\(link-orig\)/g, '#')
        .replace(/\$\(if error\)/g, '')
        .replace(/\$\(endif\)/g, '');

      setPreviewHtmlItem({ name: file.name, content: previewHtml });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `تعذر تحميل المعاينة: ${err.message}` });
    }
  };

  // Hotspot cheat-sheet variables
  const hotspotVariables = [
    { code: '$(username)', label: 'اسم المستخدم أو رقم الكارت' },
    { code: '$(password)', label: 'حقل كلمة المرور' },
    { code: '$(error)', label: 'رسالة الخطأ للمستخدم إن وجدت' },
    { code: '$(link-login-only)', label: 'رابط تسجيل الدخول' },
    { code: '$(link-logout)', label: 'رابط تسجيل الخروج' },
    { code: '$(link-orig)', label: 'الموقع الأصلي المطلوب فتحه' },
    { code: '$(mac)', label: 'عنوان الماك (MAC Address)' },
    { code: '$(ip)', label: 'عنوان الآي بي (IP Address)' },
    { code: '$(uptime)', label: 'الوقت المستهلك في الجلسة' },
    { code: '$(session-time-left)', label: 'الوقت المتبقي من الباقة' },
    { code: '$(remain-bytes-total)', label: 'الرصيد المتبقي من الميغابايت' },
    { code: '$(bytes-in-nice)', label: 'حجم التحميل (Download)' },
    { code: '$(bytes-out-nice)', label: 'حجم الرفع (Upload)' },
  ];

  const insertVariableIntoEditor = (code: string) => {
    setEditorContent((prev) => prev + code);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Card & Key Stats */}
      <div className="bg-slate-900/95 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-24 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-600 to-indigo-800 border border-indigo-500/40 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  مستعرض ومدير ملفات المايكروتك (MikroTik Files & Backups)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  RouterOS File System
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                استعراض، تعديل مباشر لصفحات الهوتسبوت (HTML/CSS/JS)، إدارة النسخ الاحتياطية (.backup)، تصدير الإعدادات (.rsc)، ورفع الملفات بنقرة زر.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Create Backup */}
            <button
              onClick={() => setShowBackupModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition"
              title="أخذ نسخة احتياطية كاملة من الراوتر"
            >
              <Archive className="w-4 h-4" />
              <span>أخذ نسخة احتياطية</span>
            </button>

            {/* Export RSC */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/20 transition"
              title="تصدير تكوين وإعدادات الراوتر كملف سكربت .rsc"
            >
              <Terminal className="w-4 h-4" />
              <span>تصدير إعدادات (.rsc)</span>
            </button>

            {/* Upload File */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition"
              title="رفع ملف جديد إلى المايكروتك"
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملف</span>
            </button>

            {/* New File */}
            <button
              onClick={() => setShowNewFileModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition"
              title="إنشاء ملف نصي أو صفحة هوتسبوت جديدة"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء ملف</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadFiles}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              title="تحديث قائمة الملفات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">إجمالي الملفات</span>
            <span className="text-lg font-black text-white font-mono mt-0.5 block">{stats.totalFiles} ملف</span>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">الحجم الكلي التخزيني</span>
            <span className="text-lg font-black text-indigo-400 font-mono mt-0.5 block">{formatBytesToHuman(stats.totalSize)}</span>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">صفحات الهوتسبوت</span>
            <span className="text-lg font-black text-orange-400 font-mono mt-0.5 block">{stats.hotspotCount} صفحة</span>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">النسخ الاحتياطية</span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">{stats.backupCount} نسخة</span>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">سكربتات التصدير (.rsc)</span>
            <span className="text-lg font-black text-sky-400 font-mono mt-0.5 block">{stats.scriptCount} سكربت</span>
          </div>

          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px] block">ملفات أخرى ونظام</span>
            <span className="text-lg font-black text-purple-400 font-mono mt-0.5 block">{stats.otherCount} عنصر</span>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter Pills & View Controls */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            📁 الكل ({files.length})
          </button>

          <button
            onClick={() => setActiveCategory('hotspot')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'hotspot'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            🌐 صفحات الهوتسبوت ({stats.hotspotCount})
          </button>

          <button
            onClick={() => setActiveCategory('backup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'backup'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            💾 النسخ الاحتياطية ({stats.backupCount})
          </button>

          <button
            onClick={() => setActiveCategory('script')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'script'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            📜 سكربتات (.rsc) ({stats.scriptCount})
          </button>

          <button
            onClick={() => setActiveCategory('other')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'other'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            🗄️ أخرى ونظام ({stats.otherCount})
          </button>
        </div>

        {/* Search, Sort & Mode */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو المسار..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="date">حسب التاريخ</option>
            <option value="name">حسب الاسم</option>
            <option value="size">حسب الحجم</option>
          </select>

          {/* Sort Direction */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white"
            title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* 3. Files Content Area */}
      {isLoading ? (
        <div className="bg-slate-900/60 p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-300">جاري قراءة ملفات راوتر مايكروتك...</p>
          <span className="text-xs text-slate-500 mt-1">يتم التواصل مع نظام الملفات عبر RouterOS API</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-slate-900/60 p-12 rounded-3xl border border-slate-800 text-center">
          <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-300">لم يتم العثور على أي ملفات مطابقة</h4>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'جرب البحث بكلمة مختلفة أو مسار آخر' : 'يمكنك رفع ملفات جديدة أو أخذ نسخة احتياطية الآن'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowBackupModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
            >
              أخذ نسخة احتياطية أولى
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
            >
              رفع ملف
            </button>
          </div>
        </div>
      ) : (
        /* Files Table View */
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-3.5 px-4">الملف / المسار في الراوتر</th>
                  <th className="py-3.5 px-4">نوع الملف</th>
                  <th className="py-3.5 px-4">الحجم</th>
                  <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات المتاحة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFiles.map((file) => {
                  const isHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
                  const isRsc = file.name.toLowerCase().endsWith('.rsc');
                  const isBackup = file.name.toLowerCase().endsWith('.backup');
                  const editable = isEditableFile(file.name);

                  return (
                    <tr
                      key={file.id || file.name}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Name & Icon */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                            {getFileIcon(file)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{file.name}</span>
                              {file.name === 'hotspot/login.html' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                  صفحة الدخول الرئيسية
                                </span>
                              )}
                              {file.name === 'hotspot/status.html' && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  صفحة الحالة
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              ID: {file.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            file.isDirectory
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : isHtml
                              ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                              : isBackup
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : isRsc
                              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {file.isDirectory
                            ? 'مجلد (Directory)'
                            : isHtml
                            ? 'صفحة هوتسبوت (HTML)'
                            : isBackup
                            ? 'نسخة احتياطية (Backup)'
                            : isRsc
                            ? 'سكربت (RouterOS RSC)'
                            : file.type || 'ملف'}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {file.isDirectory ? '-' : formatBytesToHuman(file.size)}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {file.creationTime || 'غير مسجل'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Live HTML Preview Button */}
                          {isHtml && (
                            <button
                              onClick={() => handleOpenHtmlPreview(file)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold transition"
                              title="معاينة الصفحة كما تظهر للمشتركين"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة</span>
                            </button>
                          )}

                          {/* Code / Content Editor */}
                          {editable && (
                            <button
                              onClick={() => handleOpenFileEditor(file)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition"
                              title="تعديل محتوى الملف برمجياً"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                          )}

                          {/* Run RSC Script */}
                          {isRsc && (
                            <button
                              onClick={() => setScriptTarget(file)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition"
                              title="تشغيل واستيراد هذا السكربت في الراوتر (/import)"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>تشغيل</span>
                            </button>
                          )}

                          {/* Download */}
                          {!file.isDirectory && (
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              title="تحميل الملف إلى جهازك"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(file)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
                            title="حذف الملف من الراوتر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. CODE & FILE EDITOR MODAL                */}
      {/* ========================================== */}
      {editorFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div
            className={`bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isEditorFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl max-h-[90vh]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>محرر الأكواد: {editorFile.name}</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {formatBytesToHuman(editorContent.length)}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    يمكنك تعديل الكود وحفظه مباشرة في نظام ملفات المايكروتك بنقرة واحدة
                  </p>
                </div>
              </div>

              {/* Header Controls */}
              <div className="flex items-center gap-2">
                {/* Editor Tabs */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setEditorTab('code')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      editorTab === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    محرر الكود
                  </button>

                  {editorFile.name.endsWith('.html') && (
                    <button
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                        editorTab === 'preview' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة حية</span>
                    </button>
                  )}

                  {editorFile.name.startsWith('hotspot/') && (
                    <button
                      onClick={() => setEditorTab('variables')}
                      className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                        editorTab === 'variables' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>متغيرات الهوتسبوت</span>
                    </button>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsEditorFullscreen(prev => !prev)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title={isEditorFullscreen ? 'تصغير' : 'ملء الشاشة'}
                >
                  {isEditorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close */}
                <button
                  onClick={() => setEditorFile(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
              {isEditorLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                  <p className="text-sm text-slate-300 font-bold">جاري تحميل محتوى الملف من المايكروتك...</p>
                </div>
              ) : editorTab === 'code' ? (
                /* Code Editor View */
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  <textarea
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    dir="ltr"
                    className="w-full h-full p-4 font-mono text-sm bg-slate-950 text-emerald-300 selection:bg-indigo-600 selection:text-white border-0 resize-none focus:outline-none leading-relaxed"
                    placeholder="محتوى الملف هنا..."
                    spellCheck={false}
                  />
                </div>
              ) : editorTab === 'preview' ? (
                /* Live HTML Preview View */
                <div className="flex-1 flex flex-col overflow-hidden p-4 bg-slate-900">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span>هذه معاينة حية تفاعلية لصفحة الهوتسبوت مع استبدال متغيرات المايكروتك بقيم تجريبية واقعية.</span>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
                    <iframe
                      srcDoc={editorContent
                        .replace(/\$\(username\)/g, '7700123')
                        .replace(/\$\(mac\)/g, '44:D9:E7:AA:BB:CC')
                        .replace(/\$\(ip\)/g, '10.5.50.145')
                        .replace(/\$\(uptime\)/g, '45m 12s')
                        .replace(/\$\(bytes-in-nice\)/g, '124.5 MB')
                        .replace(/\$\(bytes-out-nice\)/g, '48.2 MB')
                        .replace(/\$\(session-time-left\)/g, '2h 15m')
                        .replace(/\$\(remain-bytes-total\)/g, '850 MB')
                        .replace(/\$\(error\)/g, 'كارت تجريبي للمعاينة')
                        .replace(/\$\(link-login-only\)/g, '#')
                        .replace(/\$\(link-logout\)/g, '#')
                        .replace(/\$\(link-orig\)/g, '#')
                        .replace(/\$\(if error\)/g, '')
                        .replace(/\$\(endif\)/g, '')}
                      title="Hotspot Preview"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-forms"
                    />
                  </div>
                </div>
              ) : (
                /* Hotspot Variables Reference */
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <h5 className="text-sm font-bold text-white">دليل متغيرات مايكروتك هوتسبوت (Hotspot Variables Cheat-Sheet)</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      اضغط على أي متغير لإدراجه مباشرة في محرر الكود في نهاية الملف:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {hotspotVariables.map((v) => (
                      <div
                        key={v.code}
                        onClick={() => insertVariableIntoEditor(v.code)}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div>
                          <span className="font-mono text-xs font-bold text-sky-400 block" dir="ltr">
                            {v.code}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{v.label}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                          إدراج +
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Copy Code */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editorContent);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>

                {/* Download Copy */}
                <button
                  onClick={() => {
                    const blob = new Blob([editorContent], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = editorFile.name.split('/').pop() || editorFile.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل نسخة</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorFile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  إلغاء
                </button>

                <button
                  onClick={handleSaveEditorContent}
                  disabled={isSavingContent}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isSavingContent ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ في الراوتر...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات في المايكروتك</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. CREATE BACKUP MODAL                     */}
      {/* ========================================== */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">أخذ نسخة احتياطية للراوتر (/system/backup)</h4>
                  <p className="text-xs text-slate-400">توليد ملف .backup ثنائي يحتوي كافة إعدادات المايكروتك</p>
                </div>
              </div>
              <button onClick={() => setShowBackupModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم ملف النسخة الاحتياطية:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="backup-name"
                  />
                  <span className="absolute left-3 top-3 text-slate-500 font-mono text-[11px]">.backup</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">كلمة مرور التشفير (اختياري):</label>
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="اتركه فارغاً إذا لم ترغب بكلمة سر"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontEncryptBackup}
                    onChange={(e) => setDontEncryptBackup(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300 font-semibold">توليد نسخة بدون تشفير (dont-encrypt=yes)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 mr-6">
                  يتيح استعادة النسخة على أجهزة راوتر أخرى من نفس الموديل دون قيود التشفير المشددة.
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  النسخة الاحتياطية (.backup) تحفظ حالة الراوتر بالكامل، بما في ذلك حسابات المستخدمين، الشهادات، وتوزيعات الشبكة.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || !backupName.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التوليد والحفظ...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>إنشاء النسخة الاحتياطية</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. EXPORT CONFIGURATION MODAL (.rsc)       */}
      {/* ========================================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">تصدير إعدادات الراوتر (/export)</h4>
                  <p className="text-xs text-slate-400">توليد سكربت نصي مقروء بصيغة .rsc يمكن إعادة تطبيقه بسهولة</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم ملف السكربت المصدر:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-sky-500"
                    placeholder="export-name"
                  />
                  <span className="absolute left-3 top-3 text-slate-500 font-mono text-[11px]">.rsc</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportCompact}
                      onChange={(e) => setExportCompact(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-semibold">تصدير الفروقات فقط (compact=yes)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 mr-6">
                    يقوم بتصدير الإعدادات المخصصة والمعدلة فقط دون الإعدادات الافتراضية للراوتر لتسريع القراءة.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportHideSensitive}
                      onChange={(e) => setExportHideSensitive(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 font-semibold">إخفاء كلمات السر والبيانات الحساسة (hide-sensitive=yes)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 mr-6">
                    لحماية الشبكة عند مشاركة السكربت مع الدعم الفني أو المبرمجين.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleExportRsc}
                disabled={isExportingRsc || !exportFilename.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
              >
                {isExportingRsc ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التصدير وحفظ السكربت...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    <span>تصدير السكربت الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 7. UPLOAD FILE MODAL                       */}
      {/* ========================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">رفع ملف إلى المايكروتك</h4>
                  <p className="text-xs text-slate-400">رفع صفحات هوتسبوت معدلة، سكربتات rsc، أو نسخ احتياطية</p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Destination Folder */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">مجلد الوجهة في الراوتر:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTargetFolder('hotspot/')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      targetFolder === 'hotspot/'
                        ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    hotspot/
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetFolder('')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      targetFolder === ''
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    الجذر الرئيسي /
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetFolder('flash/')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      targetFolder === 'flash/'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    flash/
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetFolder('skins/')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      targetFolder === 'skins/'
                        ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    skins/
                  </button>
                </div>
              </div>

              {/* Drag & Drop or Click Area */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اختر الملف المراد رفعه:</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedUploadFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {selectedUploadFile ? (
                    <div className="flex flex-col items-center">
                      <FileCode className="w-10 h-10 text-indigo-400 mb-2" />
                      <span className="font-bold text-white text-sm">{selectedUploadFile.name}</span>
                      <span className="text-slate-400 font-mono text-[11px] mt-1">
                        الحجم: {formatBytesToHuman(selectedUploadFile.size)}
                      </span>
                      <span className="text-emerald-400 text-xs font-bold mt-2">انقر لاختيار ملف آخر</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition mb-2" />
                      <span className="font-bold text-slate-200">اسحب الملف هنا أو انقر للتصفح</span>
                      <span className="text-slate-500 text-[11px] mt-1">
                        يدعم HTML, CSS, JS, RSC, Backup, TXT, JSON وغيرها
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleUploadFileSubmit}
                disabled={isUploading || !selectedUploadFile}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>رفع الملف إلى الراوتر</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 8. CREATE NEW FILE MODAL                   */}
      {/* ========================================== */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-indigo-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">إنشاء ملف نصي جديد في المايكروتك</h4>
                  <p className="text-xs text-slate-400">إنشاء صفحة هوتسبوت مخصصة أو سكربت برمجي</p>
                </div>
              </div>
              <button onClick={() => setShowNewFileModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اختر نموذج البداية:</label>
                <select
                  value={newFileTemplate}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setNewFileTemplate(val);
                    if (val === 'hotspot_login') {
                      setNewFileName('custom-login.html');
                      setNewFileFolder('hotspot/');
                    } else if (val === 'hotspot_status') {
                      setNewFileName('custom-status.html');
                      setNewFileFolder('hotspot/');
                    } else if (val === 'rsc_script') {
                      setNewFileName('my-script.rsc');
                      setNewFileFolder('');
                    } else if (val === 'errors_txt') {
                      setNewFileName('custom-errors.txt');
                      setNewFileFolder('hotspot/');
                    } else {
                      setNewFileName('new-file.txt');
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="hotspot_login">صفحة تسجيل دخول هوتسبوت (HTML Template)</option>
                  <option value="hotspot_status">صفحة حالة اشتراك هوتسبوت (Status Template)</option>
                  <option value="rsc_script">سكربت أوامر مايكروتك (.rsc Script)</option>
                  <option value="errors_txt">ملف نصوص رسائل أخطاء الهوتسبوت (errors.txt)</option>
                  <option value="blank">ملف فارغ (Blank)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">المجلد:</label>
                  <input
                    type="text"
                    value={newFileFolder}
                    onChange={(e) => setNewFileFolder(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    placeholder="hotspot/"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-300 font-bold mb-1.5">اسم الملف:</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    placeholder="login.html"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateNewFile}
                disabled={isCreatingNewFile || !newFileName.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {isCreatingNewFile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>إنشاء الملف وفتح المحرر</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 9. DELETE CONFIRMATION MODAL               */}
      {/* ========================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-white">تأكيد حذف الملف من الراوتر</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف الملف التالي نهائياً من راوتر مايكروتك؟
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-rose-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{deleteTarget.name}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 10. RUN SCRIPT CONFIRMATION MODAL          */}
      {/* ========================================== */}
      {scriptTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-sky-400">
              <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-500/40">
                <Terminal className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-white">تشغيل سكربت RouterOS (/import)</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              سيتم تنفيذ الأوامر المكتوبة داخل هذا السكربت وتطبيقها فوراً على راوتر مايكروتك:
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">{scriptTarget.name}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setScriptTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleRunScript}
                disabled={isRunningScript}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
              >
                {isRunningScript ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التشغيل في الراوتر...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>تشغيل السكربت الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 11. HTML LIVE PREVIEW MODAL                */}
      {/* ========================================== */}
      {previewHtmlItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-orange-400" />
                <h4 className="text-base font-bold text-white">
                  معاينة صفحة الهوتسبوت: {previewHtmlItem.name}
                </h4>
              </div>
              <button
                onClick={() => setPreviewHtmlItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-4">
              <div className="w-full h-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                <iframe
                  srcDoc={previewHtmlItem.content}
                  title="Live Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
