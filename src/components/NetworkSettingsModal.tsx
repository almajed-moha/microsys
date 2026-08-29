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
  Server
} from 'lucide-react';
import { NetworkSettings } from '../types';
import { exportToJSON, downloadFile } from '../utils/storage';

interface NetworkSettingsModalProps {
  settings: NetworkSettings;
  onSaveSettings: (settings: NetworkSettings) => void;
  onResetData: () => void;
  allAppData: any;
  onRestoreData: (data: any) => void;
  onClose: () => void;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  allAppData,
  onRestoreData,
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
            <label className="block text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>إدارة النسخ الاحتياطي والبيانات:</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleBackupDownload}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 font-semibold transition"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>تحميل نسخة احتياطية (JSON)</span>
              </button>

              <label className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1.5 font-semibold cursor-pointer transition">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>استعادة نسخة احتياطية</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
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
