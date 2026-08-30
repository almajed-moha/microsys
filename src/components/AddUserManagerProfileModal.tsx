import React, { useState } from 'react';
import {
  X,
  Server,
  Sparkles,
  Check,
  Copy,
  Download,
  Zap,
  Clock,
  HardDrive,
  DollarSign,
  Users,
  ShieldCheck,
  Code,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CardCategory, NetworkSettings } from '../types';
import { downloadFile } from '../utils/storage';
import { saveUserManagerProfileAndLimitation } from '../utils/mikrotikApi';

interface AddUserManagerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (category: Omit<CardCategory, 'id'>) => void;
  settings: NetworkSettings;
}

export const AddUserManagerProfileModal: React.FC<AddUserManagerProfileModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
  settings,
}) => {
  const [profileName, setProfileName] = useState('UM-Profile-500');
  const [limitationName, setLimitationName] = useState('UM-Lim-500');
  const [nameForUsers, setNameForUsers] = useState('كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)');
  const [code, setCode] = useState('500_1D');
  const [uptimeLimit, setUptimeLimit] = useState('1d');
  const [quotaLimit, setQuotaLimit] = useState('3500M');
  const [rateLimit, setRateLimit] = useState('6M/3M');
  const [validityDays, setValidityDays] = useState(3);
  const [retailPrice, setRetailPrice] = useState(500);
  const [wholesalePrice, setWholesalePrice] = useState(420);
  const [costPrice, setCostPrice] = useState(130);
  const [sharedUsers, setSharedUsers] = useState(1);
  const [startsAt, setStartsAt] = useState<'logon' | 'first-login' | 'now'>('logon');
  const [routerOsVersion, setRouterOsVersion] = useState<'v6' | 'v7'>('v7');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [syncToRouterLive, setSyncToRouterLive] = useState(true);
  const [isSavingLive, setIsSavingLive] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'script'>('form');

  if (!isOpen) return null;

  // Preset quick fill
  const handleQuickPreset = (price: number) => {
    if (price === 100) {
      setProfileName('UM-Profile-100');
      setLimitationName('UM-Lim-100');
      setNameForUsers('كارت 100 ريال (1 ساعة / 500 ميجا)');
      setCode('100_1H');
      setUptimeLimit('1h');
      setQuotaLimit('500M');
      setRateLimit('4M/2M');
      setValidityDays(1);
      setRetailPrice(100);
      setWholesalePrice(80);
      setCostPrice(25);
      setColorTheme('amber');
    } else if (price === 200) {
      setProfileName('UM-Profile-200');
      setLimitationName('UM-Lim-200');
      setNameForUsers('كارت 200 ريال (3 ساعات / 1.5 جيجا)');
      setCode('200_3H');
      setUptimeLimit('3h');
      setQuotaLimit('1500M');
      setRateLimit('5M/2M');
      setValidityDays(2);
      setRetailPrice(200);
      setWholesalePrice(160);
      setCostPrice(50);
      setColorTheme('blue');
    } else if (price === 500) {
      setProfileName('UM-Profile-500');
      setLimitationName('UM-Lim-500');
      setNameForUsers('كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)');
      setCode('500_1D');
      setUptimeLimit('1d');
      setQuotaLimit('3500M');
      setRateLimit('6M/3M');
      setValidityDays(3);
      setRetailPrice(500);
      setWholesalePrice(420);
      setCostPrice(130);
      setColorTheme('emerald');
    } else if (price === 1000) {
      setProfileName('UM-Profile-1000');
      setLimitationName('UM-Lim-1000');
      setNameForUsers('كارت 1000 ريال (3 أيام / 8 جيجا)');
      setCode('1000_3D');
      setUptimeLimit('3d');
      setQuotaLimit('8G');
      setRateLimit('8M/4M');
      setValidityDays(5);
      setRetailPrice(1000);
      setWholesalePrice(850);
      setCostPrice(280);
      setColorTheme('purple');
    }
  };

  // Generate RouterOS Script for User Manager
  const generateScript = () => {
    if (routerOsVersion === 'v7') {
      return `# ========================================================
# MikroTik RouterOS v7 User Manager Profile Setup
# Profile: ${profileName}
# Validity: ${validityDays}d | Rate-Limit: ${rateLimit}
# ========================================================

/user-manager limitation
add name="${limitationName}" rate-limit-rx="${rateLimit.split('/')[1] || '2M'}" rate-limit-tx="${rateLimit.split('/')[0] || '4M'}" reset-counters-at=never uptime-limit="${uptimeLimit}" download-limit="${quotaLimit}"

/user-manager profile
add name="${profileName}" name-for-users="${nameForUsers}" price="${retailPrice}" validity="${validityDays}d"

/user-manager profile-limitation
add limitation="${limitationName}" profile="${profileName}"`;
    } else {
      return `# ========================================================
# MikroTik User Manager v4/v5/v6 Profile & Limitation Setup
# Profile: ${profileName}
# ========================================================

/tool user-manager limitation
add name="${limitationName}" rate-limit-rx="${rateLimit.split('/')[1] || '2M'}" rate-limit-tx="${rateLimit.split('/')[0] || '4M'}" uptime-limit="${uptimeLimit}" download-limit="${quotaLimit}"

/tool user-manager profile
add name="${profileName}" name-for-users="${nameForUsers}" price="${retailPrice}" validity="${validityDays}d" starts-at=${startsAt}

/tool user-manager profile limitation
add profile="${profileName}" limitation="${limitationName}"`;
    }
  };

  const scriptText = generateScript();

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    downloadFile(scriptText, `um-profile-${profileName}-${Date.now()}.rsc`, 'text/plain');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !nameForUsers.trim()) return;

    if (syncToRouterLive && settings.mikrotikIp) {
      setIsSavingLive(true);
      setLiveFeedback(null);

      const cfg = settings.mikrotikConfig || {
        host: settings.mikrotikIp || '192.168.88.1',
        port: 80,
        protocol: 'auto' as const,
        username: settings.mikrotikUser || 'admin',
        password: settings.mikrotikPassword || '',
        autoRefreshInterval: 5,
        timeoutMs: 8000,
      };

      try {
        const res = await saveUserManagerProfileAndLimitation(cfg, {
          profileName,
          limitationName,
          nameForUsers,
          price: Number(retailPrice) || 0,
          validityDays: Number(validityDays) || 1,
          uptimeLimit,
          quotaLimit,
          rateLimit,
          startsAt,
          routerOsVersion,
        });

        if (!res.success) {
          setLiveFeedback({
            success: false,
            message: `ملاحظة: تم حفظ الفئة محلياً، ولكن تعذر تطبيقها في الراوتر: ${res.message || 'خطأ في الاتصال بالمايكروتك'}`,
          });
        }
      } catch (err: any) {
        console.error('Error applying to router:', err);
      } finally {
        setIsSavingLive(false);
      }
    }

    onAddCategory({
      name: nameForUsers,
      code: code || profileName,
      uptimeLimit,
      quotaLimit,
      rateLimit,
      validityDays: Number(validityDays) || 1,
      costPrice: Number(costPrice) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      mikrotikProfile: profileName,
      userManagerProfile: profileName,
      userManagerLimitation: limitationName,
      sharedUsers: Number(sharedUsers) || 1,
      warehouseStock: 200,
      colorTheme,
      notes: `بروفايل يوزر مانجر: ${profileName} (${routerOsVersion})`,
    });

    if (!syncToRouterLive || !settings.mikrotikIp) {
      onClose();
    } else {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto"
        style={{ direction: 'rtl' }}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 flex-shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                <span className="truncate">إضافة بروفايل جديد في User Manager</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  MikroTik UM
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                تكوين البروفايل وقيود السرعة والرصيد وتوليد أوامر التيرمينال وحفظها كفئة كروت فورية.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex-shrink-0"
            title="إغلاق النافذة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Fill Presets */}
        <div className="px-5 sm:px-6 pt-3 pb-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            نماذج قياسية سريعة:
          </span>
          {[100, 200, 500, 1000].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleQuickPreset(p)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              فئة {p} {settings.currencySymbol}
            </button>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-3 flex items-center gap-3 border-b border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 ${
              activeTab === 'form'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            بيانات البروفايل والأسعار
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>سكربت Terminal المايكروتك ({routerOsVersion})</span>
          </button>
        </div>

        {/* Form Body */}
        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Row 1: Profile Name & Limitation Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم البروفايل في User Manager:
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="مثال: UM-Profile-500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اسم القيد (Limitation Name):
                </label>
                <input
                  type="text"
                  required
                  value={limitationName}
                  onChange={(e) => setLimitationName(e.target.value)}
                  placeholder="مثال: UM-Lim-500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Row 2: User Visible Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الاسم الظاهر للمستخدمين والبطاقة (Name for users):
              </label>
              <input
                type="text"
                required
                value={nameForUsers}
                onChange={(e) => setNameForUsers(e.target.value)}
                placeholder="مثال: كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Row 3: Limits & Speeds */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>مدة الاستخدام (Uptime):</span>
                </label>
                <input
                  type="text"
                  value={uptimeLimit}
                  onChange={(e) => setUptimeLimit(e.target.value)}
                  placeholder="1h, 3h, 1d, 7d"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>حجم البيانات (Quota):</span>
                </label>
                <input
                  type="text"
                  value={quotaLimit}
                  onChange={(e) => setQuotaLimit(e.target.value)}
                  placeholder="500M, 1500M, 8G"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>السرعة (Down/Up):</span>
                </label>
                <input
                  type="text"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  placeholder="6M/3M"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Row 4: Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  سعر البيع للجمهور ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-400 mb-1">
                  سعر الجملة للنقاط ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  سعر التكلفة ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Row 5: Validity & Version */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  صلاحية الكارت (بالأيام):
                </label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  إصدار User Manager:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRouterOsVersion('v7')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      routerOsVersion === 'v7'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    RouterOS v7
                  </button>
                  <button
                    type="button"
                    onClick={() => setRouterOsVersion('v6')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      routerOsVersion === 'v6'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    RouterOS v6
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  لون تمييز الفئة:
                </label>
                <select
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="emerald">أخضر زمردي (Emerald)</option>
                  <option value="amber">ذهبي كهرماني (Amber)</option>
                  <option value="blue">أزرق سماوي (Blue)</option>
                  <option value="purple">بنفسجي ملكي (Purple)</option>
                  <option value="rose">وردي مميز (Rose)</option>
                </select>
              </div>
            </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="sticky bottom-0 z-20 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>إلغاء وإغلاق</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>حفظ وإضافة البروفايل لمنظومة الكروت</span>
              </button>
            </div>
          </form>
        ) : (
          /* Script Tab */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  أوامر تيرمينال المايكروتك لإنشاء البروفايل والقيد:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-semibold border border-slate-700 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ' : 'نسخ الأوامر'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل (.rsc)</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400/90 overflow-x-auto shadow-inner">
                <pre className="whitespace-pre-wrap leading-relaxed">{scriptText}</pre>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
