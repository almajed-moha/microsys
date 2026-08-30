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
  Sparkles
} from 'lucide-react';
import { NetworkSettings } from '../types';
import { exportToJSON, downloadFile } from '../utils/storage';

interface NetworkSettingsModalProps {
  settings: NetworkSettings;
  onSaveSettings: (settings: NetworkSettings) => void;
  onResetData: () => void;
  allAppData: any;
  onRestoreData: (data: any) => void;
  onOpenBackupModal?: () => void;
  onClose: () => void;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  allAppData,
  onRestoreData,
  onOpenBackupModal,
  onClose,
}) => {
  const [formData, setFormData] = useState<NetworkSettings>({
    ...settings,
    themeMode: settings.themeMode || 'dark',
    mikrotikConfig: settings.mikrotikConfig || {
      host: settings.mikrotikIp || '192.168.88.1',
      port: 8728,
      protocol: 'auto',
      username: 'admin',
      password: '',
      useSsl: false,
      autoRefreshInterval: 5
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
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

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              اسم شبكة الواي فاي / المايكروتك:
            </label>
            <input
              type="text"
              required
              value={formData.networkName}
              onChange={(e) => setFormData({ ...formData, networkName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              شعار الشبكة أو الوصف:
            </label>
            <input
              type="text"
              value={formData.networkSlogan}
              onChange={(e) => setFormData({ ...formData, networkSlogan: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              رابط الشعار (لوجو - اختياري):
            </label>
            <input
              type="text"
              placeholder="مثال: https://example.com/logo.png"
              value={formData.logoUrl || ''}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 text-left"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                عملة الحسابات:
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                هاتف الدعم الفني:
              </label>
              <input
                type="text"
                value={formData.supportPhone}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                عنوان IP راوتر مايكروتك:
              </label>
              <input
                type="text"
                value={formData.mikrotikIp}
                onChange={(e) => setFormData({ ...formData, mikrotikIp: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                رابط صفحة الدخول (DNS):
              </label>
              <input
                type="text"
                value={formData.hotspotDns}
                onChange={(e) => setFormData({ ...formData, hotspotDns: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
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

          {/* MikroTik API Connection Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5 mb-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>إعدادات الربط مع سيرفر المايكروتك (MikroTik API):</span>
            </label>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">عنوان الـ API (IP أو DNS):</label>
                  <input
                    type="text"
                    value={formData.mikrotikConfig?.host || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, host: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    placeholder="مثال: 192.168.88.1"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">منفذ الـ API (Port):</label>
                  <input
                    type="number"
                    value={formData.mikrotikConfig?.port || 8728}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, port: parseInt(e.target.value) || 8728 }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[10px]">اسم مستخدم الـ API:</label>
                  <input
                    type="text"
                    value={formData.mikrotikConfig?.username || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      mikrotikConfig: { ...formData.mikrotikConfig!, username: e.target.value }
                    })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 text-left"
                    dir="ltr"
                    placeholder="مثال: api_user"
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
