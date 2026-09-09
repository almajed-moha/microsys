import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  Database,
  CheckCircle,
  X,
  Wifi,
  Moon,
  Sun,
  Monitor,
  Palette,
  Server,
  FileText,
  Receipt,
  FileSpreadsheet,
  AlignLeft,
  FileSignature,
  Sparkles,
  Globe,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { NetworkSettings, MikroTikConfig, AppUser } from '../types';
import { exportToJSON, downloadFile } from '../utils/storage';
import { RemoteMikrotikWizardModal } from './RemoteMikrotikWizardModal';
import { testMikroTikConnection, ConnectionTestResult, isPrivateIp } from '../utils/mikrotikApi';

interface NetworkSettingsModalProps {
  settings: NetworkSettings;
  onSaveSettings: (settings: NetworkSettings) => void;
  onResetData: () => void;
  allAppData: any;
  onRestoreData: (data: any) => void;
  onOpenBackupModal?: () => void;
  onForceCloudSync?: () => void;
  onClose: () => void;
  activeUser?: AppUser;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  allAppData,
  onRestoreData,
  onOpenBackupModal,
  onForceCloudSync,
  onClose,
  activeUser,
}) => {
  const isNetworkAdmin =
    activeUser?.role === 'network_admin' ||
    activeUser?.role === 'system_owner' ||
    activeUser?.role === 'super_admin' ||
    (activeUser?.permissions?.settings?.editNetworkProfile ?? true);

  const [formData, setFormData] = useState<NetworkSettings>({
    ...settings,
    isLocked: settings.isLocked ?? true,
    themeMode: settings.themeMode || 'dark',
    mikrotikConfig: settings.mikrotikConfig || {
      host: settings.mikrotikIp || '192.168.88.1',
      port: 8728,
      protocol: 'auto',
      username: 'admin',
      password: '',
      useSsl: false,
      autoRefreshInterval: 5,
      isLocked: settings.isLocked ?? true,
    }
  });

  const isFieldsDisabled = !isNetworkAdmin || formData.isLocked;

  const [showRemoteWizard, setShowRemoteWizard] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTestConnection = async () => {
    if (!formData.mikrotikConfig) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testMikroTikConnection(formData.mikrotikConfig);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'فشل الاتصال بالمايكروتك',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNetworkAdmin) {
      alert('عذراً، بيانات وإعدادات الشبكة مثبتة وأساسية في النظام ولا يمكن تعديلها إلا بواسطة مدير الشبكة.');
      return;
    }
    const cleanHost = (formData.mikrotikConfig?.host || formData.mikrotikIp || '192.168.88.1').trim();
    const finalSettings: NetworkSettings = {
      ...formData,
      isLocked: true, // Always locked and secured after saving
      mikrotikIp: cleanHost,
      mikrotikConfig: formData.mikrotikConfig
        ? {
            ...formData.mikrotikConfig,
            host: cleanHost,
            isLocked: true,
            remoteHost: formData.mikrotikConfig.remoteHost || (isPrivateIp(cleanHost) ? undefined : cleanHost),
          }
        : undefined,
    };
    onSaveSettings(finalSettings);
    onClose();
  };

  const handleBackupDownload = () => {
    const jsonStr = exportToJSON(allAppData);
    downloadFile(
      jsonStr,
      `mikrotik-pos-backup-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية.')) {
          onRestoreData(parsed);
          onClose();
        }
      } catch (err) {
        alert('ملف النسخة الاحتياطية غير صالح.');
      }
    };
    reader.readAsText(file);
  };

  const activeTheme = formData.themeMode || 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="sticky top-0 z-20 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/95 backdrop-blur-md">
          <h3 className="text-xs sm:text-base font-black text-white flex items-center gap-2 truncate">
            <Settings className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span className="truncate">إعدادات الشبكة والمظهر والنسخ الاحتياطي</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex-shrink-0"
            title="إغلاق النافذة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Theme & Display Mode Toggle Section */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span>سمة المظهر والوضع الليلي / النهاري:</span>
              </label>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {activeTheme === 'dark' ? 'الوضع الليلي 🌙' : activeTheme === 'light' ? 'الوضع النهاري ☀️' : 'تلقائي 💻'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, themeMode: 'dark' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                  activeTheme === 'dark'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs">ليلي (Dark)</p>
                  <p className="text-[10px] text-slate-400">مريح للعين</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, themeMode: 'light' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                  activeTheme === 'light'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === 'light' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs">نهاري (Light)</p>
                  <p className="text-[10px] text-slate-400">ساطع وعالي الوضوح</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, themeMode: 'system' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                  activeTheme === 'system'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTheme === 'system' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs">تلقائي (System)</p>
                  <p className="text-[10px] text-slate-400">حسب الجهاز</p>
                </div>
              </button>
            </div>
          </div>

          {/* Network Settings Permanent Lock & Protection Banner */}
          {!isNetworkAdmin ? (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 text-rose-200 text-xs flex items-center gap-2.5 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-xs">بيانات وإعدادات الشبكة مثبتة وأساسية في النظام 🔒</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  بيانات الشبكة والراوتر محمية ومقفلة. لا يمكن التعديل إلا بواسطة مدير الشبكة المعتمد حصراً.
                </p>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl p-3.5 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              formData.isLocked
                ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {formData.isLocked ? (
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <Unlock className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-xs">
                    {formData.isLocked
                      ? 'بيانات الشبكة الأساسية مثبتة ومحمية من التغيير 🔒'
                      : 'وضع تعديل بيانات الشبكة مفعل حالياً 🔓'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {formData.isLocked
                      ? 'الاسم، الشعار، العملة، الهواتف وبيانات راوتر مايكروتك محمية لمنع أي تعديل عشوائي.'
                      : 'يمكنك الآن تعديل بيانات الشبكة والراوتر ثم الضغط على "حفظ الإعدادات" وسيتم إعادة القفل تلقائياً.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !formData.isLocked;
                  setFormData({
                    ...formData,
                    isLocked: nextState,
                    mikrotikConfig: formData.mikrotikConfig
                      ? { ...formData.mikrotikConfig, isLocked: nextState }
                      : undefined,
                  });
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition border ${
                  formData.isLocked
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {formData.isLocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فك القفل للتعديل</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل وتثبيت البيانات</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>اسم شبكة الواي فاي / المايكروتك:</span>
              {isFieldsDisabled && <span className="text-[10px] text-amber-400 flex items-center gap-1"><Lock className="w-3 h-3" /> مثبت ومحمي</span>}
            </label>
            <input
              type="text"
              required
              disabled={isFieldsDisabled}
              value={formData.networkName}
              onChange={(e) => setFormData({ ...formData, networkName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>شعار الشبكة أو الوصف:</span>
              {isFieldsDisabled && <span className="text-[10px] text-amber-400 flex items-center gap-1"><Lock className="w-3 h-3" /> مثبت ومحمي</span>}
            </label>
            <input
              type="text"
              disabled={isFieldsDisabled}
              value={formData.networkSlogan}
              onChange={(e) => setFormData({ ...formData, networkSlogan: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>رابط الشعار (لوجو - اختياري):</span>
              {isFieldsDisabled && <span className="text-[10px] text-amber-400 flex items-center gap-1"><Lock className="w-3 h-3" /> مثبت ومحمي</span>}
            </label>
            <input
              type="text"
              disabled={isFieldsDisabled}
              placeholder="مثال: https://example.com/logo.png"
              value={formData.logoUrl || ''}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 text-left disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>عملة الحسابات:</span>
                {isFieldsDisabled && <span className="text-[10px] text-amber-400"><Lock className="w-3 h-3 inline" /></span>}
              </label>
              <input
                type="text"
                disabled={isFieldsDisabled}
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>هاتف الدعم الفني:</span>
                {isFieldsDisabled && <span className="text-[10px] text-amber-400"><Lock className="w-3 h-3 inline" /></span>}
              </label>
              <input
                type="text"
                disabled={isFieldsDisabled}
                value={formData.supportPhone}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>عنوان IP راوتر مايكروتك:</span>
                {isFieldsDisabled && <span className="text-[10px] text-amber-400"><Lock className="w-3 h-3 inline" /></span>}
              </label>
              <input
                type="text"
                disabled={isFieldsDisabled}
                value={formData.mikrotikIp}
                onChange={(e) => setFormData({ ...formData, mikrotikIp: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>رابط صفحة الدخول (DNS):</span>
                {isFieldsDisabled && <span className="text-[10px] text-amber-400"><Lock className="w-3 h-3 inline" /></span>}
              </label>
              <input
                type="text"
                disabled={isFieldsDisabled}
                value={formData.hotspotDns}
                onChange={(e) => setFormData({ ...formData, hotspotDns: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-800/60"
              />
            </div>
          </div>

          {/* Custom Invoices, Receipts & Statements Footer Texts Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <FileSignature className="w-4 h-4 text-indigo-400" />
                <span>تذييل الفواتير والسندات وإيصالات الكاشير والتقارير:</span>
              </label>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                طباعة رسمية وحرارية
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              قم بتخصيص النصوص والعبارات الترحيبية والتعليمات المحاسبية التي تظهر في أسفل الفواتير وسندات القبض وإيصالات الكاشير (80mm) وكشوفات الحسابات المطبوعة:
            </p>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
              {/* 1. Official A4 Invoices & Receipts Footer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>تذييل فواتير وسندات القبض والصرف والتسليم الرسمية (A4):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      invoiceFooterText: `تم استخراج هذا السند إلكترونياً عبر نظام ${formData.networkName || 'الشبكة'} • يرجى مراجعة الحسابات والاحتفاظ بالأصل`
                    })}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition"
                  >
                    استعادة الافتراضي
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.invoiceFooterText || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceFooterText: e.target.value })}
                  placeholder="مثال: تم استخراج هذا السند إلكترونياً عبر المنظومة السحابية لإدارة الشبكات • يرجى مراجعة الحسابات والاحتفاظ بالأصل"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed placeholder:text-slate-600"
                />
              </div>

              {/* 2. Thermal 80mm Cashier Receipt Footer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>تذييل إيصالات الكاشير الحرارية (طابعات 80mm POS):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      cashierFooterText: `شكراً لتعاملكم معنا 🌹 • خدمة العملاء والدعم: ${formData.supportPhone || ''}`
                    })}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-medium transition"
                  >
                    استعادة الافتراضي
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.cashierFooterText || ''}
                  onChange={(e) => setFormData({ ...formData, cashierFooterText: e.target.value })}
                  placeholder="مثال: شكراً لتعاملكم معنا 🌹 • خدمة العملاء والدعم الفني: 773703240"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed placeholder:text-slate-600"
                />
              </div>

              {/* 3. Account Statements & Financial Reports Footer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تذييل كشوفات الحسابات والتقارير المالية وقوائم الدخل:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      statementFooterText: 'كشف حساب رسمي معتمد صادر من النظام • يرجى مطابقة الأرصدة وإبداء أي ملاحظات خلال 3 أيام من تاريخه'
                    })}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition"
                  >
                    استعادة الافتراضي
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.statementFooterText || ''}
                  onChange={(e) => setFormData({ ...formData, statementFooterText: e.target.value })}
                  placeholder="مثال: كشف حساب رسمي معتمد صادر من النظام • يرجى مطابقة الأرصدة وإبداء أي ملاحظات خلال 3 أيام من تاريخه"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition resize-none leading-relaxed placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* MikroTik API Connection & Remote Access Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>إعدادات الربط والوصول عن بعد لسيرفر المايكروتك (MikroTik API):</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRemoteWizard(true)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/30 transition shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>معالج الربط عن بعد 🌐</span>
                </button>

                {/* Connection Lock Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextLocked = !formData.isLocked;
                    setFormData({
                      ...formData,
                      isLocked: nextLocked,
                      mikrotikConfig: {
                        ...formData.mikrotikConfig!,
                        isLocked: nextLocked,
                      },
                    });
                  }}
                  className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition shadow-xs ${
                    formData.isLocked
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="قفل وحماية بيانات الاتصال لمنع استبدالها عند التبديل بين الشبكات"
                >
                  {formData.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>بيانات الاتصال مثبتة ومحمية 🔒</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      <span>تثبيت وقفل البيانات</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Lock Notice */}
            {formData.isLocked && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-amber-200 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>حماية الوصول عن بعد مفعلة:</strong> تم قفل بيانات الـ IP والمنفذ والمستخدم. لن يتم تغييرها أو إعادة ضبطها تلقائياً عند الاتصال بشبكات أخرى أو التبديل بين الفروع.
                </span>
              </div>
            )}

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
              {/* Host and Quick Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <span>عنوان الراوتر (IP أو DNS السحابي DDNS):</span>
                    {isPrivateIp(formData.mikrotikConfig?.host) ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-normal">
                        شبكة محلية LAN
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                        وصول عن بعد WAN / Cloud
                      </span>
                    )}
                  </label>
                  {formData.mikrotikConfig?.remoteHost && formData.mikrotikConfig?.host !== formData.mikrotikConfig?.remoteHost && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = formData.mikrotikConfig?.remoteHost!;
                        setFormData({
                          ...formData,
                          mikrotikIp: target,
                          mikrotikConfig: { ...formData.mikrotikConfig!, host: target },
                        });
                      }}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-bold underline"
                    >
                      استخدام عنوان DDNS المحفوظ
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.mikrotikConfig?.host || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        mikrotikIp: val,
                        mikrotikConfig: {
                          ...formData.mikrotikConfig!,
                          host: val,
                          remoteHost: !isPrivateIp(val) ? val : formData.mikrotikConfig?.remoteHost,
                          localHost: isPrivateIp(val) ? val : formData.mikrotikConfig?.localHost,
                        },
                      });
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    placeholder="مثال: myrouter.sn.mynetname.net أو 192.168.88.1"
                  />

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !formData.mikrotikConfig?.host}
                    className="px-3 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الفحص...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5" />
                        <span>فحص الاتصال</span>
                      </>
                    )}
                  </button>
                </div>

                {isPrivateIp(formData.mikrotikConfig?.host) && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong>ملاحظة هامة:</strong> العنوان الحالي ({formData.mikrotikConfig?.host}) هو عنوان داخلي (LAN). لن يعمل في حال اتصلت من شبكة إنترنت أخرى أو عبر 4G. للحصول على وصول دائم من أي مكان، استخدم <strong>سحابة مايكروتك المجانية (Cloud DDNS)</strong> عبر معالج الربط عن بعد.
                    </div>
                  </div>
                )}
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 leading-relaxed">
                    <div className="font-bold">
                      {testResult.success ? 'تم الاتصال بالراوتر بنجاح!' : 'تعذر الاتصال بالراوتر:'}
                    </div>
                    <div>{testResult.error || testResult.diagnostics || `زمن الاستجابة: ${testResult.latencyMs || 25}ms`}</div>
                    {testResult.identity && <div>اسم الراوتر: <strong>{testResult.identity}</strong></div>}
                  </div>
                </div>
              )}

              {/* Port & Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">منفذ الـ API (Port):</label>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.mikrotikConfig?.port || 8728}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, port: parseInt(e.target.value) || 8728 }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">بروتوكول الاتصال:</label>
                  <select
                    value={formData.mikrotikConfig?.protocol || 'auto'}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, protocol: e.target.value as any }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="auto">تلقائي ذكي (REST ثم API)</option>
                    <option value="rest_http">REST API (RouterOS v7)</option>
                    <option value="rest_https">REST API (SSL/HTTPS)</option>
                    <option value="api_binary">Binary API (Port 8728)</option>
                    <option value="api_ssl">Binary API SSL (Port 8729)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">تشفير SSL المشفر:</label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, useSsl: !formData.mikrotikConfig?.useSsl }
                    })}
                    className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.mikrotikConfig?.useSsl
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {formData.mikrotikConfig?.useSsl ? 'مفعل (SSL آمن)' : 'معطل (عادي)'}
                  </button>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">اسم مستخدم الـ API بالراوتر:</label>
                  <input
                    type="text"
                    value={formData.mikrotikConfig?.username || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, username: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    placeholder="مثال: admin أو api_user"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">كلمة مرور الـ API:</label>
                  <input
                    type="password"
                    value={formData.mikrotikConfig?.password || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, password: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Data Section */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>إدارة النسخ الاحتياطي والبيانات:</span>
              </label>
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBackupModal();
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                >
                  مركز النسخ والتحكم المتقدم
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenBackupModal ? () => { onClose(); onOpenBackupModal(); } : handleBackupDownload}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 font-semibold transition text-xs"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>تصدير نسخة احتياطية (JSON)</span>
              </button>

              <button
                type="button"
                onClick={onOpenBackupModal ? () => { onClose(); onOpenBackupModal(); } : undefined}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition text-xs relative"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>استعادة نسخة احتياطية</span>
                {!onOpenBackupModal && (
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('هل أنت متأكد من إعادة تعيين البيانات إلى البيانات التجريبية الافتراضية؟')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة البيانات الافتراضية</span>
            </button>
            {onForceCloudSync && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('تنبيه هام: سيتم الآن رفع جميع بيانات هذا الجهاز بقوة إلى السحابة، مما سيؤدي إلى مسح أي بيانات سحابية سابقة واستبدالها ببيانات هذا الجهاز. هل أنت متأكد؟')) {
                    onForceCloudSync();
                  }
                }}
                className="w-full mt-3 py-2 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5" />
                <span>مزامنة سحابية إجبارية (رفع للجميع)</span>
              </button>
            )}
          </div>

          <div className="sticky bottom-0 z-20 pt-3.5 pb-1 border-t border-slate-800 flex justify-end gap-2 bg-slate-900/95 backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isNetworkAdmin}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Remote MikroTik Wizard Modal */}
      <RemoteMikrotikWizardModal
        isOpen={showRemoteWizard}
        onClose={() => setShowRemoteWizard(false)}
        currentConfig={formData.mikrotikConfig}
        networkName={formData.networkName}
        onApplyConfig={(updated) => {
          setFormData((prev) => ({
            ...prev,
            mikrotikConfig: {
              ...prev.mikrotikConfig!,
              ...updated,
            },
          }));
        }}
      />
    </div>
  );
};
