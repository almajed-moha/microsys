import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Power,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Phone,
  MessageSquare,
  Clock,
  Radio,
  Eye,
  Smartphone,
  Monitor,
  RefreshCw,
  Sparkles,
  Info,
  ShieldAlert,
  Sliders,
  FileCode,
  Users,
  Send
} from 'lucide-react';
import { NetworkSettings, MikroTikConfig, MaintenanceSettings } from '../types';
import {
  updateRouterMaintenanceAndNetworkState,
  fetchHotspotServers,
  generateMaintenanceRouterScript,
  generateCaptivePortalMaintenanceHtml,
} from '../utils/mikrotikApi';
import { downloadFile } from '../utils/storage';

interface MikrotikMaintenanceViewProps {
  settings: NetworkSettings;
  config: MikroTikConfig;
  onUpdateSettings: (newSettings: NetworkSettings) => void;
  onRefreshParent?: () => void;
}

export const MikrotikMaintenanceView: React.FC<MikrotikMaintenanceViewProps> = ({
  settings,
  config,
  onUpdateSettings,
  onRefreshParent,
}) => {
  // Current maintenance settings or defaults
  const currentSettings: MaintenanceSettings = settings.maintenanceSettings || {
    enabled: false,
    networkStatus: 'online',
    title: 'تنبيه: أعمال صيانة دورية وتحديث للشبكة',
    message: 'أعزاءنا المشتركين، نقوم حالياً بأعمال صيانة وتوسيع لسيرفرات البث وتحسين سرعة الإنترنت. ستعود الخدمة للعمل بشكل طبيعي قريباً. نعتذر عن أي إزعاج.',
    expectedReturnTime: 'خلال ساعة واحدة',
    showCountdown: true,
    targetReturnTimestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    supportContact: settings.supportPhone || '',
    whatsappNumber: settings.whatsappNumber || '',
    severity: 'scheduled',
    kickActiveUsersOnEnable: true,
    themeStyle: 'warning_amber',
    allowBypassedIps: '192.168.88.2-192.168.88.10',
  };

  // Form states
  const [networkStatus, setNetworkStatus] = useState<'online' | 'maintenance' | 'disabled'>(
    currentSettings.networkStatus || (currentSettings.enabled ? 'maintenance' : 'online')
  );
  const [title, setTitle] = useState(currentSettings.title);
  const [message, setMessage] = useState(currentSettings.message);
  const [expectedReturnTime, setExpectedReturnTime] = useState(currentSettings.expectedReturnTime || 'خلال ساعة واحدة');
  const [showCountdown, setShowCountdown] = useState(currentSettings.showCountdown ?? true);
  const [targetTimestamp, setTargetTimestamp] = useState(
    currentSettings.targetReturnTimestamp || new Date(Date.now() + 60 * 60 * 1000).toISOString()
  );
  const [supportContact, setSupportContact] = useState(currentSettings.supportContact || settings.supportPhone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(currentSettings.whatsappNumber || settings.whatsappNumber || '');
  const [severity, setSeverity] = useState<MaintenanceSettings['severity']>(currentSettings.severity || 'scheduled');
  const [kickActiveUsers, setKickActiveUsers] = useState(currentSettings.kickActiveUsersOnEnable ?? true);
  const [themeStyle, setThemeStyle] = useState<MaintenanceSettings['themeStyle']>(currentSettings.themeStyle || 'warning_amber');

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeSubSection, setActiveSubSection] = useState<'control' | 'preview' | 'script' | 'templates'>('control');

  // Action / State
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [hotspotServers, setHotspotServers] = useState<any[]>([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);

  // Countdown demo state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 45,
    seconds: 0,
  });

  // Calculate countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current hotspot servers
  const loadHotspotServers = async () => {
    setIsLoadingServers(true);
    try {
      const servers = await fetchHotspotServers(config);
      setHotspotServers(servers);
    } catch (e) {
      console.warn('Load servers notice:', e);
    } finally {
      setIsLoadingServers(false);
    }
  };

  useEffect(() => {
    loadHotspotServers();
  }, [config.host]);

  // Quick Templates Preset
  const applyTemplate = (type: 'scheduled' | 'urgent_fiber' | 'upgrade' | 'night' | 'billing') => {
    if (type === 'scheduled') {
      setTitle('صيانة دورية وتحديث أنظمة البث');
      setMessage('أعزاءنا المشتركين، نقوم حالياً بأعمال صيانة وتحديث لأجهزة الإرسال لرفع كفاءة البث وتحسين سرعة التصفح. ستعود الخدمة للعمل بشكل طبيعي قريباً.');
      setExpectedReturnTime('خلال 45 دقيقة');
      setSeverity('scheduled');
      setThemeStyle('warning_amber');
    } else if (type === 'urgent_fiber') {
      setTitle('تنبيه عاجل: انقطاع كابل الألياف الضوئية المغذي');
      setMessage('نحيطكم علماً بوجود انقطاع طارئ في كابل الألياف الضوئية المغذي من شركة الاتصالات، والفرق الهندسية تعمل حالياً على إصلاح العطل واستعادة الخدمة في أسرع وقت.');
      setExpectedReturnTime('خلال ساعتين (جاري الإصلاح)');
      setSeverity('isp_outage');
      setThemeStyle('danger_red');
    } else if (type === 'upgrade') {
      setTitle('بشرى سارة: ترقية سيرفرات الإنترنت ومضاعفة السرعات');
      setMessage('أعزاءنا الكرام، نعمل حالياً على تركيب خطوط إضافية وترقية السيرفرات الرئيسية لمضاعفة سرعات التحميل والبث واستقرار الخدمة لجميع المشتركين.');
      setExpectedReturnTime('حتى الساعة 06:00 مساءً');
      setSeverity('upgrade');
      setThemeStyle('tech_blue');
    } else if (type === 'night') {
      setTitle('أعمال صيانة ليلية مجدولة');
      setMessage('تجري الآن أعمال الصيانة الدورية المجدولة لتحديث أمان الراوترات وتجديد السيرفرات. نعتذر عن الانقطاع المؤقت في هذه الفترة المتأخرة.');
      setExpectedReturnTime('حتى الساعة 05:00 فجراً');
      setSeverity('scheduled');
      setThemeStyle('modern_dark');
    } else if (type === 'billing') {
      setTitle('إيقاف مؤقت للخدمة - تجديد اشتراكات الخطوط');
      setMessage('تم إيقاف الخدمة مؤقتاً لتسوية وتجديد باقات خطوط التغذية الرئيسية. ستستأنف الخدمة فور اكتمال التجديد.');
      setExpectedReturnTime('خلال 30 دقيقة');
      setSeverity('urgent');
      setThemeStyle('danger_red');
    }
  };

  // Handle Apply State to Router
  const handleApplyToRouter = async () => {
    setIsApplying(true);
    setFeedback(null);

    const newMaintenanceSettings: MaintenanceSettings = {
      enabled: networkStatus !== 'online',
      networkStatus,
      title,
      message,
      expectedReturnTime,
      showCountdown,
      targetReturnTimestamp: targetTimestamp,
      supportContact,
      whatsappNumber,
      severity,
      kickActiveUsersOnEnable: kickActiveUsers,
      themeStyle,
      allowBypassedIps: currentSettings.allowBypassedIps,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Admin',
    };

    // Save in settings first
    const updatedNetworkSettings: NetworkSettings = {
      ...settings,
      maintenanceSettings: newMaintenanceSettings,
    };
    onUpdateSettings(updatedNetworkSettings);

    try {
      const res = await updateRouterMaintenanceAndNetworkState(config, {
        networkStatus,
        kickActiveUsers: kickActiveUsers && networkStatus !== 'online',
        maintenanceMessage: message,
        maintenanceTitle: title,
      });

      if (res.success) {
        setFeedback({
          success: true,
          message: res.message || 'تم تطبيق وتحديث حالة الشبكة على راوتر مايكروتك بنجاح!',
        });
        loadHotspotServers();
        if (onRefreshParent) onRefreshParent();
      } else {
        setFeedback({
          success: false,
          message: `تم حفظ الإعدادات محلياً ولكن تعذر التطبيق المباشر على الراوتر: ${res.message || 'خطأ في الاتصال'}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        success: false,
        message: `خطأ في تطبيق الحالة: ${err.message || 'تعذر الاتصال بخادم النظام'}`,
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Generate Script & HTML
  const routerScript = generateMaintenanceRouterScript(
    settings.networkName,
    networkStatus,
    title,
    message,
    expectedReturnTime,
    supportContact
  );

  const captiveHtml = generateCaptivePortalMaintenanceHtml(
    settings.networkName,
    settings.networkSlogan,
    title,
    message,
    expectedReturnTime,
    supportContact,
    whatsappNumber,
    themeStyle,
    showCountdown,
    targetTimestamp
  );

  const handleCopyScript = () => {
    navigator.clipboard.writeText(routerScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(captiveHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadScript = () => {
    downloadFile(routerScript, `mikrotik-network-status-${networkStatus}-${Date.now()}.rsc`, 'text/plain');
  };

  const handleDownloadHtml = () => {
    downloadFile(captiveHtml, `login.html`, 'text/html');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card with Quick Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${
              networkStatus === 'online'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : networkStatus === 'maintenance'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">مركز الصيانة والتحكم بحالة الشبكة</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Captive Portal & Hotspot State
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                التحكم برمجياً في تشغيل أو تعطيل سيرفرات الهوتسبوت، وبث رسائل الصيانة التنبيهية للمشتركين فور محاولة تسجيل الدخول.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border ${
              networkStatus === 'online'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : networkStatus === 'maintenance'
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                networkStatus === 'online'
                  ? 'bg-emerald-400'
                  : networkStatus === 'maintenance'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`} />
              <span>
                {networkStatus === 'online' && 'حالة الشبكة: تعمل بشكل طبيعي 🟢'}
                {networkStatus === 'maintenance' && 'حالة الشبكة: وضع الصيانة نشط 🟠'}
                {networkStatus === 'disabled' && 'حالة الشبكة: معطلة برمجياً 🔴'}
              </span>
            </div>

            <button
              onClick={loadHotspotServers}
              disabled={isLoadingServers}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="تحديث حالة سيرفرات الهوتسبوت"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingServers ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Hotspot Servers Pill Bar */}
        {hotspotServers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              سيرفرات الهوتسبوت في الراوتر ({hotspotServers.length}):
            </span>
            {hotspotServers.map((s) => (
              <span
                key={s.id || s.name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono border ${
                  s.disabled
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.disabled ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                <span>{s.name}</span>
                <span className="text-[10px] text-slate-400">({s.interface})</span>
                <span className="text-[10px] uppercase font-bold">
                  {s.disabled ? 'معطل' : 'مفعل'}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubSection('control')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            activeSubSection === 'control'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-300" />
          <span>التحكم بحالة الشبكة ورسالة الصيانة</span>
        </button>

        <button
          onClick={() => setActiveSubSection('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            activeSubSection === 'preview'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4 text-purple-300" />
          <span>المعاينة التفاعلية لشاشة المشتركين</span>
        </button>

        <button
          onClick={() => setActiveSubSection('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            activeSubSection === 'templates'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span>قوالب الصيانة الجاهزة</span>
        </button>

        <button
          onClick={() => setActiveSubSection('script')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
            activeSubSection === 'script'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4 text-purple-300" />
          <span>ملفات الهوتسبوت وسكربتات RouterOS</span>
        </button>
      </div>

      {/* SECTION 1: Control & Composer */}
      {activeSubSection === 'control' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Network Status Selector (3 Large Cards) */}
          <div className="lg:col-span-12">
            <label className="block text-xs font-bold text-slate-300 mb-3">
              حدد الحالة التشغيلية المطلوبة للشبكة في الراوتر:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Online */}
              <div
                onClick={() => setNetworkStatus('online')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  networkStatus === 'online'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      networkStatus === 'online' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {networkStatus === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mb-1">الشبكة قيد التشغيل (Online)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    الهوتسبوت متاح، تسجيل الدخول مفتوح لجميع المشتركين، واستقبال الاتصالات بشكل طبيعي 100%.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-bold text-emerald-400">
                  ✓ خوادم الهوتسبوت: Enabled
                </div>
              </div>

              {/* Option 2: Maintenance */}
              <div
                onClick={() => setNetworkStatus('maintenance')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  networkStatus === 'maintenance'
                    ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20 text-white'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      networkStatus === 'maintenance' ? 'border-amber-500 bg-amber-500' : 'border-slate-600'
                    }`}>
                      {networkStatus === 'maintenance' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mb-1">وضع الصيانة والتنبيه (Maintenance Mode)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إظهار صفحة ورسالة الصيانة التنبيهية للمشتركين عند محاولة تسجيل الدخول مع الوقت المتوقع للعودة.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-bold text-amber-400">
                  ⚠️ توجيه المستخدمين لصفحة الصيانة
                </div>
              </div>

              {/* Option 3: Disabled */}
              <div
                onClick={() => setNetworkStatus('disabled')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  networkStatus === 'disabled'
                    ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/20 text-white'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Power className="w-5 h-5" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      networkStatus === 'disabled' ? 'border-rose-500 bg-rose-500' : 'border-slate-600'
                    }`}>
                      {networkStatus === 'disabled' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mb-1">تعطيل وإيقاف الهوتسبوت (Disable Server)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تعطيل سيرفرات الهوتسبوت برمجياً على راوتر مايكروتك لمنع التوثيق نهائياً وإيقاف الخدمة.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-bold text-rose-400">
                  ⛔ خوادم الهوتسبوت: Disabled
                </div>
              </div>
            </div>
          </div>

          {/* Form Editor Details */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>تخصيص رسالة الصيانة والبيانات للمشتركين</span>
                </h3>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">قوالب سريعة:</span>
                  <button
                    type="button"
                    onClick={() => applyTemplate('scheduled')}
                    className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-md border border-slate-700"
                  >
                    صيانة دورية
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('urgent_fiber')}
                    className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-md border border-slate-700"
                  >
                    عطل فايبر
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('upgrade')}
                    className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-md border border-slate-700"
                  >
                    ترقية سرعات
                  </button>
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان التنبيه الرئيسي (يظهر أعلى الصفحة):
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تنبيه هام: أعمال صيانة دورية وترقية للشبكة"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نص الرسالة الموجهة للمستخدمين بالتفصيل:
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب تفاصيل الصيانة وموعد العودة المتوقع..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
                />
              </div>

              {/* Return Time & Quick Chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>الوقت المتوقع للعودة:</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={expectedReturnTime}
                      onChange={(e) => setExpectedReturnTime(e.target.value)}
                      placeholder="مثال: خلال ساعة واحدة / حتى 06:00 مساءً"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['خلال 15 دقيقة', 'خلال 30 دقيقة', 'خلال ساعة', 'خلال ساعتين', 'حتى 06:00 مساءً', 'حتى الفجر'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setExpectedReturnTime(chip)}
                          className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نوع وسبب الصيانة (التصنيف):
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="scheduled">🛠️ صيانة دورية وتحديث أجهزة الإرسال</option>
                    <option value="upgrade">🚀 ترقية السيرفرات ومضاعفة السرعات</option>
                    <option value="isp_outage">⚡ انقطاع طارئ في كابل الألياف الضوئية</option>
                    <option value="urgent">🚨 صيانة طارئة وعاجلة</option>
                    <option value="notice">📢 تنبيه عام وإعلان للمشتركين</option>
                  </select>
                </div>
              </div>

              {/* Support Contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>رقم هاتف الدعم الفني:</span>
                  </label>
                  <input
                    type="text"
                    value={supportContact}
                    onChange={(e) => setSupportContact(e.target.value)}
                    placeholder="مثال: 777123456"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>رقم الواتساب للمساعدة السريعة:</span>
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="مثال: 967777123456"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Theme & Countdown Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المظهر البصري لصفحة الهوتسبوت:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'warning_amber', label: 'برتقالي صيانة', color: 'bg-amber-500' },
                      { id: 'danger_red', label: 'أحمر طوارئ', color: 'bg-rose-500' },
                      { id: 'tech_blue', label: 'أزرق تقني', color: 'bg-blue-500' },
                      { id: 'modern_dark', label: 'دارك فخم', color: 'bg-purple-500' },
                      { id: 'emerald_pro', label: 'زمردي احترافي', color: 'bg-emerald-500' },
                    ].map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setThemeStyle(th.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                          themeStyle === th.id
                            ? 'bg-slate-800 text-white border-purple-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${th.color}`} />
                        <span>{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">
                    خيارات التنفيذ والاتصال:
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={kickActiveUsers}
                      onChange={(e) => setKickActiveUsers(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>فصل جميع المشتركين المتصلين حالياً فوراً (Kick Active Users)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={showCountdown}
                      onChange={(e) => setShowCountdown(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>تفعيل العداد التنازلي الحي في صفحة الدخول</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Hub & Router Feedback */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="font-black text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Power className="w-4 h-4 text-purple-400" />
                <span>تنفيذ وتطبيق الحالة في الراوتر</span>
              </h3>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">الراوتر المستهدف:</span>
                  <span className="font-mono font-bold text-white">{config.host || '192.168.88.1'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">الحالة المختارة:</span>
                  <span className={`font-bold ${
                    networkStatus === 'online' ? 'text-emerald-400' : networkStatus === 'maintenance' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {networkStatus === 'online' ? 'تشغيل طبيعي' : networkStatus === 'maintenance' ? 'وضع الصيانة' : 'تعطيل برمجياً'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">فصل المتصلين:</span>
                  <span className="font-bold text-white">{kickActiveUsers ? 'نعم (فوري)' : 'لا'}</span>
                </div>
              </div>

              {feedback && (
                <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  feedback.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyToRouter}
                disabled={isApplying}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition ${
                  networkStatus === 'online'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : networkStatus === 'maintenance'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                } ${isApplying ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التطبيق في الراوتر...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {networkStatus === 'online' && 'تطبيق: تفعيل وتشغيل الشبكة 🟢'}
                      {networkStatus === 'maintenance' && 'تطبيق: تفعيل وضع الصيانة 🟠'}
                      {networkStatus === 'disabled' && 'تطبيق: إيقاف وتعطيل الهوتسبوت 🔴'}
                    </span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubSection('preview')}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>معاينة شاشة المشتركين الحية</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تحميل صفحة login.html للراوتر</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Interactive Live Preview (Captive Portal Screen) */}
      {activeSubSection === 'preview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <span>المعاينة التفاعلية الحية لصفحة الهوتسبوت (Live Captive Portal)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                هكذا تظهر صفحة الصيانة ورسالتك على هواتف وأجهزة المشتركين بمجرد الاتصال بالواي فاي أو فتح المتصفح.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    previewDevice === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>هاتف ذكي</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    previewDevice === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>كمبيوتر / تابلت</span>
                </button>
              </div>

              <button
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل login.html</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Device Mockup */}
          <div className="flex justify-center items-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            <div
              className={`transition-all duration-300 ${
                previewDevice === 'mobile'
                  ? 'w-[360px] sm:w-[380px] rounded-[36px] p-4 border-4 border-slate-700 bg-slate-900 shadow-2xl relative'
                  : 'w-full max-w-2xl rounded-2xl p-6 border-2 border-slate-700 bg-slate-900 shadow-2xl'
              }`}
            >
              {/* Mobile Notch Indicator */}
              {previewDevice === 'mobile' && (
                <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-4 border border-slate-700" />
              )}

              {/* Captive Portal Card Inner */}
              <div className={`rounded-2xl p-6 text-center border relative overflow-hidden ${
                themeStyle === 'warning_amber'
                  ? 'bg-slate-900 border-amber-500/40 text-slate-100 shadow-lg shadow-amber-500/10'
                  : themeStyle === 'danger_red'
                  ? 'bg-zinc-950 border-rose-500/40 text-zinc-100 shadow-lg shadow-rose-500/10'
                  : themeStyle === 'tech_blue'
                  ? 'bg-slate-950 border-blue-500/40 text-slate-100 shadow-lg shadow-blue-500/10'
                  : themeStyle === 'modern_dark'
                  ? 'bg-black border-purple-500/40 text-purple-100 shadow-lg shadow-purple-500/10'
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100 shadow-lg shadow-emerald-500/10'
              }`}>
                {/* Animated Pulsing Icon */}
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border-2 animate-bounce ${
                  themeStyle === 'warning_amber'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                    : themeStyle === 'danger_red'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-400'
                    : themeStyle === 'tech_blue'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-400'
                    : themeStyle === 'modern_dark'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-400'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                }`}>
                  <Wrench className="w-8 h-8" />
                </div>

                {/* Network Name Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 mb-3">
                  <span>{settings.networkName || 'شبكة الواي فاي'}</span>
                  <span>•</span>
                  <span>تنبيه صيانة</span>
                </div>

                {/* Main Title */}
                <h4 className="text-base sm:text-lg font-black text-white mb-2 leading-snug">
                  {title || 'أعمال صيانة دورية'}
                </h4>

                {/* Message Box */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed mb-4 text-right">
                  {message || 'نقوم حالياً بأعمال صيانة لتطوير الشبكة.'}
                </div>

                {/* Info & Countdown Box */}
                <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">حالة الخدمة:</div>
                    <div className="font-bold text-amber-400 mt-0.5">
                      {networkStatus === 'disabled' ? 'معطلة مؤقتاً' : 'صيانة وتحديث'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">العودة المتوقعة:</div>
                    <div className="font-bold text-white mt-0.5">{expectedReturnTime || 'قريباً'}</div>
                  </div>
                </div>

                {/* Countdown Timer Display */}
                {showCountdown && (
                  <div className="mb-4 bg-black/40 border border-white/10 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>الوقت التقديري المتبقي لانتهاء الصيانة:</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 font-mono font-black text-base text-white">
                      <div className="bg-white/10 px-2.5 py-1 rounded-lg">
                        <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-400 font-sans">ساعة</span>
                      </div>
                      <span className="text-purple-400">:</span>
                      <div className="bg-white/10 px-2.5 py-1 rounded-lg">
                        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-400 font-sans">دقيقة</span>
                      </div>
                      <span className="text-purple-400">:</span>
                      <div className="bg-white/10 px-2.5 py-1 rounded-lg text-amber-400">
                        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="text-[9px] block text-slate-400 font-sans">ثانية</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Action Buttons */}
                <div className="space-y-2">
                  {whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>تواصل مع الدعم الفني عبر واتساب</span>
                    </a>
                  )}

                  <button
                    onClick={() => alert('محاكاة: جاري فحص حالة الهوتسبوت وإعادة توجيه المتصفح...')}
                    className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة فحص الاتصال وتحديث الصفحة</span>
                  </button>
                </div>

                {/* Portal Footer */}
                <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-400">
                  {settings.networkSlogan && <div className="mb-0.5">{settings.networkSlogan}</div>}
                  <div>نشكركم على حسن تعاونكم وتفهمكم</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Ready Templates Preset */}
      {activeSubSection === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>قوالب رسائل الصيانة الجاهزة بنقرة واحدة</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              اختر قالباً معداً مسبقاً لتعبئة العنوان والتفاصيل والوقت بضغطة زر واحدة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'scheduled',
                title: '🛠️ صيانة دورية وتحديث أجهزة الإرسال',
                desc: 'مخصصة للصيانة المعتادة لرفع كفاءة البث وتحسين سرعة التصفح.',
                time: 'خلال 45 دقيقة',
                type: 'scheduled' as const,
                badge: 'أكثر استخداماً',
                color: 'border-amber-500/40 hover:border-amber-500',
              },
              {
                id: 'urgent_fiber',
                title: '⚡ عطل في كابل الألياف الضوئية / المزود',
                desc: 'شرح احترافي للمشتركين بوجود انقطاع خارج عن الإرادة من شركة الاتصالات.',
                time: 'خلال ساعتين (جاري الإصلاح)',
                type: 'urgent_fiber' as const,
                badge: 'طوارئ',
                color: 'border-rose-500/40 hover:border-rose-500',
              },
              {
                id: 'upgrade',
                title: '🚀 ترقية السيرفرات ومضاعفة السرعات',
                desc: 'رسالة إيجابية تبشر المشتركين بزيادة السرعات وإضافة خطوط جديدة.',
                time: 'حتى 06:00 مساءً',
                type: 'upgrade' as const,
                badge: 'ترقية وتطوير',
                color: 'border-blue-500/40 hover:border-blue-500',
              },
              {
                id: 'night',
                title: '🌙 أعمال صيانة ليلية مجدولة',
                desc: 'صيانة في الساعات المتأخرة لتحديث الأمان وقواعد البيانات دون إزعاج وقت الذروة.',
                time: 'حتى 05:00 فجراً',
                type: 'night' as const,
                badge: 'ليلي',
                color: 'border-purple-500/40 hover:border-purple-500',
              },
            ].map((tmpl) => (
              <div
                key={tmpl.id}
                className={`p-4 rounded-2xl bg-slate-800/60 border ${tmpl.color} transition flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {tmpl.badge}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{tmpl.time}</span>
                  </div>
                  <h4 className="font-black text-sm text-white mb-1.5">{tmpl.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{tmpl.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">ينسق النص والألوان فوراً</span>
                  <button
                    type="button"
                    onClick={() => {
                      applyTemplate(tmpl.type);
                      setActiveSubSection('control');
                    }}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>تطبيق هذا القالب</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: RouterOS Script & Captive Portal Export */}
      {activeSubSection === 'script' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span>سكربتات RouterOS وملفات الهوتسبوت الجاهزة</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              يمكنك نسخ سكربت الأوامر لتنفيذه في WinBox Terminal مباشرة، أو تحميل ملف HTML ورفعه لمجلد الهوتسبوت في الراوتر.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: RouterOS Terminal Script */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 font-mono">Terminal Script (.rsc)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'تم النسخ' : 'نسخ السكربت'}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700"
                    title="تحميل كملف .rsc"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-black/60 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 leading-relaxed border border-slate-900">
                {routerScript}
              </pre>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>طريقة التنفيذ:</strong> افتح برنامج WinBox، توجه إلى القائمة <strong>New Terminal</strong>، ثم الصق السكربت واضغط Enter.
              </p>
            </div>

            {/* Box 2: Captive Portal login.html */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 font-mono">Captive Portal (login.html)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyHtml}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? 'تم النسخ' : 'نسخ كود HTML'}</span>
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700"
                    title="تحميل كملف login.html"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-black/60 rounded-xl text-[11px] font-mono text-cyan-400 overflow-x-auto max-h-56 leading-relaxed border border-slate-900">
                {captiveHtml.slice(0, 500)}...
              </pre>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>طريقة التثبيت:</strong> حمّل ملف <code>login.html</code>، ثم اسحبه وأفلته في مجلد <code>hotspot/</code> عبر قائمة <strong>Files</strong> في WinBox.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
