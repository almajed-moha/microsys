import React, { useState, useMemo } from 'react';
import {
  Globe,
  Cloud,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  FileDown,
  Activity,
  AlertTriangle,
  ExternalLink,
  Key,
  Lock,
  Network,
  RefreshCw,
  Server,
  Wifi,
  Zap,
  X,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Laptop,
} from 'lucide-react';
import { MikroTikConfig } from '../types';
import { testMikroTikConnection, ConnectionTestResult } from '../utils/mikrotikApi';

interface RemoteMikrotikWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: MikroTikConfig;
  networkName?: string;
  onApplyConfig?: (newConfig: Partial<MikroTikConfig>) => void;
}

export const RemoteMikrotikWizardModal: React.FC<RemoteMikrotikWizardModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  networkName = 'شبكتي',
  onApplyConfig,
}) => {
  const [activeTab, setActiveTab] = useState<
    'cloud_ddns' | 'public_ip' | 'vpn_tunnel' | 'script_generator' | 'quick_test'
  >('cloud_ddns');

  // Generator form state
  const [genUsername, setGenUsername] = useState(currentConfig?.username || 'posadmin');
  const [genPassword, setGenPassword] = useState(currentConfig?.password || 'Pass@2026Secure!');
  const [genPort, setGenPort] = useState<number>(currentConfig?.port || 8728);
  const [enableDdns, setEnableDdns] = useState(true);
  const [enableRestApi, setEnableRestApi] = useState(true);
  const [enableFirewallProtection, setEnableFirewallProtection] = useState(true);
  const [enableRateLimitRules, setEnableRateLimitRules] = useState(true);

  // Quick test state
  const [testHost, setTestHost] = useState(currentConfig?.host || '');
  const [testPort, setTestPort] = useState<number>(currentConfig?.port || 8728);
  const [testUser, setTestUser] = useState(currentConfig?.username || 'admin');
  const [testPass, setTestPass] = useState(currentConfig?.password || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Generate complete customized RouterOS Script
  const generatedScript = useMemo(() => {
    const cleanUser = genUsername.trim() || 'posadmin';
    const cleanPass = genPassword.trim() || 'Pass@2026Secure!';
    const port = genPort || 8728;

    return `# ====================================================================
# سكربت الإعدادات الشامل للربط عن بعد مع منظومة إدارة المايكروتك السحابية
# شبكة: ${networkName}
# التوافق: RouterOS v6.x & v7.x (Cloud Core, RB, CCR, x86, CHR)
# ====================================================================

# 1. تفعيل خدمات الـ API و Web للتحكم عن بعد
/ip service set api disabled=no port=${port} comment="POS Cloud API"
${enableRestApi ? `/ip service set www disabled=no port=80 comment="POS Cloud REST"\n/ip service set www-ssl disabled=no port=443 comment="POS Cloud REST SSL"` : ''}
/ip service set api-ssl disabled=no port=8729 comment="POS Cloud API-SSL"

# 2. تفعيل خدمة سحابة مايكروتك المجانية (MikroTik Cloud DDNS)
${
  enableDdns
    ? `/ip cloud set ddns-enabled=yes ddns-update-interval=none update-time=yes
# انتظر ثوانٍ ثم استخرج اسم النطاق الرسمي عبر الأمر:
# /ip cloud print
`
    : '# تم تخطي تفعيل DDNS بناءً على رغبتك'
}

# 3. إنشاء مجموعة صلاحيات مخصصة وحساب آمن لبرنامج نقاط البيع
/user group add name=pos-cloud-grp policy=api,read,write,test,policy,password,sensitive comment="POS Cloud Manager Group"
/user add name=${cleanUser} group=pos-cloud-grp password="${cleanPass}" comment="POS Cloud System Account"

# 4. قواعد جدار الحماية (Firewall) لحماية منفذ الـ API من الهجمات والتخمين
${
  enableFirewallProtection
    ? `# السماح بالاتصال بمنفذ الـ API
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=${port},8729 comment="Allow POS Cloud API" place-before=1
${enableRestApi ? `/ip firewall filter add chain=input action=accept protocol=tcp dst-port=80,443 comment="Allow POS Cloud Web" place-before=2` : ''}
`
    : ''
}
${
  enableRateLimitRules
    ? `# حماية المنفذ من التخمين المتكرر (Anti Brute-Force Rate Limiting)
/ip firewall filter add chain=input action=drop protocol=tcp dst-port=${port} connection-state=new src-address-list=api_blacklist comment="Drop API Brute-Forcers" place-before=1
/ip firewall filter add chain=input action=add-src-to-address-list address-list=api_blacklist address-list-timeout=1d protocol=tcp dst-port=${port} connection-state=new src-address-list=api_stage3 place-before=2
/ip firewall filter add chain=input action=add-src-to-address-list address-list=api_stage3 address-list-timeout=1m protocol=tcp dst-port=${port} connection-state=new src-address-list=api_stage2 place-before=3
/ip firewall filter add chain=input action=add-src-to-address-list address-list=api_stage2 address-list-timeout=1m protocol=tcp dst-port=${port} connection-state=new src-address-list=api_stage1 place-before=4
/ip firewall filter add chain=input action=add-src-to-address-list address-list=api_stage1 address-list-timeout=1m protocol=tcp dst-port=${port} connection-state=new place-before=5
`
    : ''
}

# 5. عرض بيانات السحابة والتحقق من التفعيل
/ip cloud print
`;
  }, [
    networkName,
    genUsername,
    genPassword,
    genPort,
    enableDdns,
    enableRestApi,
    enableFirewallProtection,
    enableRateLimitRules,
  ]);

  // Download .rsc file
  const handleDownloadRsc = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikrotik_remote_setup_${networkName.replace(/\s+/g, '_')}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run Quick Connection Test
  const handleRunTest = async () => {
    if (!testHost.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testMikroTikConnection({
        host: testHost.trim(),
        port: testPort || 8728,
        username: testUser.trim() || 'admin',
        password: testPass,
        protocol: 'auto',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'تعذر الوصول إلى الخادم',
        diagnostics: 'تأكد من كتابة عنوان الـ DDNS أو الـ IP العام بشكل صحيح.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Apply tested or configured host into system
  const handleApplyToSystem = (hostToApply?: string, portToApply?: number, userToApply?: string, passToApply?: string) => {
    if (!onApplyConfig) return;
    const finalHost = (hostToApply || testHost || genUsername).trim();
    onApplyConfig({
      host: finalHost,
      port: portToApply || testPort || genPort,
      username: userToApply || testUser || genUsername,
      password: passToApply !== undefined ? passToApply : testPass || genPassword,
    });
    setCopiedKey('applied');
    setTimeout(() => {
      setCopiedKey(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>دليل ومعالج ربط المايكروتك عن بعد (Remote Connection)</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  Cloud & DDNS
                </span>
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5">
                طرق وخطوات ربط راوتر المايكروتك الحقيقي بالنظام السحابي من أي مكان في العالم عبر الإنترنت
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('cloud_ddns')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'cloud_ddns'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-4 h-4 text-sky-400" />
            <span>1. سحابة مايكروتك (Cloud DDNS)</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] rounded-sm font-normal">
              الأسهل مجاناً
            </span>
          </button>

          <button
            onClick={() => setActiveTab('public_ip')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'public_ip'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>2. عنوان IP عام (Port Forwarding)</span>
          </button>

          <button
            onClick={() => setActiveTab('vpn_tunnel')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'vpn_tunnel'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-4 h-4 text-purple-400" />
            <span>3. شبكات بدون IP عام (4G / CGNAT / VPN)</span>
          </button>

          <button
            onClick={() => setActiveTab('script_generator')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'script_generator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>4. مولد السكربت المخصص (.rsc)</span>
          </button>

          <button
            onClick={() => setActiveTab('quick_test')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap mr-auto ${
              activeTab === 'quick_test'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4 text-pink-400" />
            <span>5. فحص الاتصال المباشر</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* TAB 1: MIKROTIK CLOUD DDNS */}
          {activeTab === 'cloud_ddns' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-sky-950/30 border border-sky-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                    <h3 className="text-sm sm:text-base font-bold text-sky-200">
                      ما هي سحابة مايكروتك MikroTik Cloud (DDNS)؟
                    </h3>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                    ميزة مجانية ورسمية مدمجة داخل نظام RouterOS تعطيك اسم نطاق ثابت وخاص براوترك ينتهي بـ{' '}
                    <code className="text-sky-300 bg-sky-950 px-1 py-0.5 rounded font-mono">.sn.mynetname.net</code>.
                    يتحدث النطاق تلقائياً حتى لو تغير عنوان الـ IP الخاص بمودم الإنترنت، مما يتيح لنظامنا السحابي الوصول لراوترك بشكل دائم.
                  </p>
                </div>
                <div className="bg-slate-900 border border-sky-500/30 p-3 rounded-xl text-center shrink-0">
                  <span className="text-[10px] text-slate-400 block font-semibold">التكلفة</span>
                  <span className="text-emerald-400 font-black text-sm">مجاني 100% مدى الحياة</span>
                </div>
              </div>

              {/* Step by step steps */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>خطوات التفعيل في راوتر مايكروتك (خلال دقيقة واحدة فقط):</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <h5 className="font-bold text-slate-200 text-xs">فتح WinBox وتفعيل السحابة</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      من القائمة الجانبية في WinBox، ادخل إلى <strong className="text-white">IP</strong> ثم{' '}
                      <strong className="text-white">Cloud</strong>. قم بالتأشير على{' '}
                      <strong className="text-indigo-400">DDNS Enabled</strong> واضغط Apply.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <h5 className="font-bold text-slate-200 text-xs">نسخ اسم النطاق (DNS Name)</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      انسخ الاسم المكتوب في حقل <strong className="text-white">DNS Name</strong> مثل:{' '}
                      <span className="text-sky-300 font-mono text-[10px] block mt-0.5">
                        6b2f0a1c2d3e.sn.mynetname.net
                      </span>
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <h5 className="font-bold text-slate-200 text-xs">لصقه في البرنامج وحفظ الإعدادات</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      الصق هذا النطاق في خانة (عنوان الراوتر Host) في تبويب إعدادات الاتصال، وتأكد من كتابة اسم مستخدم الـ
                      API وكلمة المرور.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terminal One-liner */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-300 text-xs">
                      أو انسخ هذا الأمر مباشرة في New Terminal داخل WinBox:
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        '/ip cloud set ddns-enabled=yes update-time=yes\n/ip service set api disabled=no port=8728\n/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728 comment="Allow Cloud API" place-before=1\n/ip cloud print',
                        'ddns_quick'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === 'ddns_quick' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'ddns_quick' ? 'تم النسخ!' : 'نسخ الأوامر'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {`/ip cloud set ddns-enabled=yes update-time=yes
/ip service set api disabled=no port=8728
/ip firewall filter add chain=input action=accept protocol=tcp dst-port=8728 comment="Allow Cloud API" place-before=1
/ip cloud print`}
                </pre>
              </div>

              {/* Modem NAT Note */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h5 className="font-bold text-amber-300">ملاحظة هامة إذا كان المايكروتك موصولاً بمودم (Fiber / DSL / 4G):</h5>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    إذا كان سلك الإنترنت قادماً من مودم خارجي إلى منفذ ether1 في المايكروتك، يجب الدخول لصفحة إعدادات المودم
                    وعمل <strong className="text-white">Port Forwarding (توجيه المنفذ)</strong> للمنفذ{' '}
                    <strong className="text-amber-400 font-mono">8728</strong> إلى عنوان IP المايكروتك الداخلي، أو وضع IP
                    المايكروتك في خيار <strong className="text-white">DMZ</strong> في المودم لفتح جميع المنافذ له تلقائياً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PUBLIC IP & PORT FORWARDING */}
          {activeTab === 'public_ip' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-bold text-emerald-200">
                      الربط عبر عنوان IP عام حقيقي (Public Static IP)
                    </h3>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                    إذا كان اشتراك الإنترنت الخاص بشبكتك يمتلك IP عام حقيقي (مثل اشتراكات الشركات أو الـ ADSL / Fiber المزودة
                    بـ Real IP)، يمكنك كتابة هذا الـ IP مباشرة في خانة عنوان الراوتر وسيتصل النظام به فوراً.
                  </p>
                </div>
              </div>

              {/* Ports Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>المنافذ المطلوبة توجيهها (Port Forwarding / NAT):</span>
                </h4>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-800/60 text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">المنفذ (Port)</th>
                        <th className="p-3">البروتوكول</th>
                        <th className="p-3">اسم الخدمة في المايكروتك</th>
                        <th className="p-3">مستوى الأمان والاستخدام</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-indigo-400">8728</td>
                        <td className="p-3 font-mono">TCP</td>
                        <td className="p-3 font-mono">api</td>
                        <td className="p-3">الافتراضي لجميع إصدارات RouterOS v6 و v7 (سريع جداً)</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-emerald-400">8729</td>
                        <td className="p-3 font-mono">TCP</td>
                        <td className="p-3 font-mono">api-ssl</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                            مشفر بالكامل SSL/TLS
                          </span>{' '}
                          أعلى درجات الأمان
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-sky-400">80 / 443</td>
                        <td className="p-3 font-mono">TCP</td>
                        <td className="p-3 font-mono">www / www-ssl</td>
                        <td className="p-3">خاص بإصدارات RouterOS v7 (REST API الحديث)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* How to configure port forwarding */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <h5 className="font-bold text-slate-200 text-xs">خطوات فتح المنفذ في المودم (Fiber/DSL Modem):</h5>
                <ol className="list-decimal list-inside text-slate-400 text-[11px] space-y-1.5 leading-relaxed">
                  <li>افتح صفحة المودم (مثال: 192.168.1.1).</li>
                  <li>توجه إلى قسم <strong className="text-white">NAT / Forwarding / Virtual Server</strong>.</li>
                  <li>
                    أضف قاعدة جديدة: WAN Port = <strong className="text-indigo-400 font-mono">8728</strong>، LAN Port ={' '}
                    <strong className="text-indigo-400 font-mono">8728</strong>، LAN IP = عنوان IP المايكروتك (مثل
                    192.168.1.2).
                  </li>
                  <li>احفظ الإعدادات وجرب فحص الاتصال من تبويب (فحص الاتصال المباشر) بالأعلى.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: NO PUBLIC IP / 4G / CGNAT / VPN TUNNEL */}
          {activeTab === 'vpn_tunnel' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm sm:text-base font-bold text-purple-200">
                    الحل الذكي: شبكتي تعمل بشريحة 4G LTE أو مودم بدون IP عام (CGNAT)
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  شركات الاتصالات ومودمات الجيل الرابع (مثل يمن موبايل، يو، سبأفون، STC 4G، زين، أورنج) تستخدم نظام النات
                  المزدوج (CGNAT)، وهو ما يمنع الوصول المباشر من الإنترنت إلى الراوتر. إليك أفضل 3 حلول عملية ومجربة:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Solution 1: ZeroTier */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      الأفضل لـ RouterOS v7
                    </span>
                    <h4 className="font-bold text-white text-xs">1. خدمة ZeroTier VPN المجانية</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      مدعومة أصلياً داخل مايكروتك v7 كحزمة (ZeroTier package). تعطيك شبكة افتراضية خاصة تربط الراوتر
                      بالسحابة دون الحاجة لـ IP عام إطلاقاً.
                    </p>
                  </div>
                </div>

                {/* Solution 2: WireGuard / SSTP VPN */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                      شائع جداً ومستقر
                    </span>
                    <h4 className="font-bold text-white text-xs">2. نفق VPN وسيط (SSTP / WireGuard)</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      يقوم الراوتر بالاتصال بسيرفر VPN سحابي خارجي (VPS بسيط أو حساب VPN بـ 1-2 دولار شهرياً) ويحصل منه على
                      IP ثابت دائم.
                    </p>
                  </div>
                </div>

                {/* Solution 3: Cloudflared / Pinggy / Ngrok */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      حل سريع ومباشر
                    </span>
                    <h4 className="font-bold text-white text-xs">3. نفق عكسي (Reverse TCP Tunnel)</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      استخدام أداة نفق مثل Pinggy أو Cloudflare Tunnel أو Ngrok تعمل على جهاز كمبيوتر بالشبكة المحلية وتقوم
                      بتوجيه منفذ 8728 إلى رابط إنترنت عام مشفر.
                    </p>
                  </div>
                </div>
              </div>

              {/* WireGuard quick script */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-300 text-xs">
                      أمر تفعيل SSTP Client السريع للاتصال بسيرفر وسيط (RouterOS v6 & v7):
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        '/interface sstp-client add name=pos-vpn connect-to=your-vpn-server.com user=vpn_user password=vpn_pass disabled=no profile=default-encryption',
                        'sstp_quick'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === 'sstp_quick' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ الأمر</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg text-purple-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {`/interface sstp-client add name=pos-vpn connect-to=your-vpn-server.com user=vpn_user password=vpn_pass disabled=no profile=default-encryption`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE SCRIPT GENERATOR */}
          {activeTab === 'script_generator' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm sm:text-base font-bold text-amber-200">
                      مولد سكريبت المايكروتك المخصص التفاعلي (.rsc)
                    </h3>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
                    حدد اسم المستخدم وكلمة المرور والخيارات المرغوبة أدناه، وسيقوم النظام فوراً ببرمجة سكريبت احترافي كامل
                    جاهز للنسخ أو التحميل لتطبيقه في راوترك بنقرة واحدة.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(generatedScript, 'gen_script')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition text-xs font-bold border border-slate-700"
                  >
                    {copiedKey === 'gen_script' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey === 'gen_script' ? 'تم نسخ الكود!' : 'نسخ الكود'}</span>
                  </button>

                  <button
                    onClick={handleDownloadRsc}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition text-xs font-bold shadow-lg shadow-indigo-600/30"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>تحميل ملف .rsc</span>
                  </button>
                </div>
              </div>

              {/* Form customizer */}
              <div className="bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>تخصيص بيانات الحساب والمنافذ:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">اسم مستخدم الـ API:</label>
                    <input
                      type="text"
                      value={genUsername}
                      onChange={(e) => setGenUsername(e.target.value)}
                      placeholder="posadmin"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">كلمة المرور المشفرة:</label>
                    <input
                      type="text"
                      value={genPassword}
                      onChange={(e) => setGenPassword(e.target.value)}
                      placeholder="كلمة مرور قوية"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">منفذ الاتصال (Port):</label>
                    <input
                      type="number"
                      value={genPort}
                      onChange={(e) => setGenPort(Number(e.target.value))}
                      placeholder="8728"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={enableDdns}
                      onChange={(e) => setEnableDdns(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-semibold">تفعيل سحابة مايكروتك DDNS</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={enableRestApi}
                      onChange={(e) => setEnableRestApi(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-semibold">دعم REST API (v7 Web)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={enableFirewallProtection}
                      onChange={(e) => setEnableFirewallProtection(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-semibold">فتح المنفذ في الفايروول</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={enableRateLimitRules}
                      onChange={(e) => setEnableRateLimitRules(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-semibold">حماية التخمين Brute-force</span>
                  </label>
                </div>
              </div>

              {/* Code preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>الكود البرمجي الناتج:</span>
                  <span className="font-mono">RouterOS Script (.rsc)</span>
                </div>
                <pre className="p-4 bg-slate-950 rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-72">
                  {generatedScript}
                </pre>
              </div>

              {/* Action Button: Apply credentials directly to system */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleApplyToSystem(undefined, genPort, genUsername, genPassword)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                >
                  {copiedKey === 'applied' ? <Check className="w-4 h-4 text-emerald-400" /> : <SaveIcon className="w-4 h-4" />}
                  <span>{copiedKey === 'applied' ? 'تم حفظ وتطبيق البيانات في البرنامج!' : 'حفظ هذه البيانات في إعدادات النظام الحالية'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: QUICK REMOTE CONNECTION TEST */}
          {activeTab === 'quick_test' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-pink-400" />
                    <span>فاحص الاتصال السحابي المباشر بالمايكروتك (Live Remote Ping & Port Check)</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    أدخل عنوان الـ DDNS أو الـ IP العام الخاص براوترك هنا واضغط فحص للتحقق فوراً مما إذا كان الراوتر متاحاً
                    عبر الإنترنت ويستجيب لمنظومتنا.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                      عنوان الـ DDNS أو الـ IP العام (Host / Domain):
                    </label>
                    <input
                      type="text"
                      value={testHost}
                      onChange={(e) => setTestHost(e.target.value)}
                      placeholder="مثال: xxxxxx.sn.mynetname.net أو demo"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      💡 يمكنك كتابة <strong className="text-indigo-400">demo</strong> لتجربة المنظومة في وضع المحاكاة
                      الافتراضي فوراً.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">المنفذ (Port):</label>
                    <input
                      type="number"
                      value={testPort}
                      onChange={(e) => setTestPort(Number(e.target.value))}
                      placeholder="8728"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">اسم المستخدم:</label>
                    <input
                      type="text"
                      value={testUser}
                      onChange={(e) => setTestUser(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1 text-[11px]">كلمة المرور:</label>
                    <input
                      type="password"
                      value={testPass}
                      onChange={(e) => setTestPass(e.target.value)}
                      placeholder="اتركها فارغة إذا لم تكن مضبوطة"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    {testHost.startsWith('192.168.') || testHost.startsWith('10.') || testHost.startsWith('172.') ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        هذا عنوان شبكة داخلية LAN؛ لن يتمكن السيرفر السحابي من الوصول إليه إلا عبر DDNS أو VPN.
                      </span>
                    ) : (
                      <span>جاهز للفحص السحابي</span>
                    )}
                  </div>

                  <button
                    onClick={handleRunTest}
                    disabled={isTesting || !testHost.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    <span>{isTesting ? 'جاري فحص الاتصال بالراوتر...' : 'بدء فحص الاتصال الآن'}</span>
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <h4 className="font-bold text-sm">
                        {testResult.success ? 'نجح الاتصال بالمايكروتك بنجاح تام! 🎉' : 'فشل الاتصال بالمايكروتك'}
                      </h4>
                    </div>

                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-current">
                        {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  {testResult.success ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-900/60 p-3 rounded-lg border border-emerald-500/20 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">اسم الراوتر (Identity):</span>
                          <strong className="text-white font-mono">{testResult.identity || 'MikroTik'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">إصدار RouterOS:</span>
                          <strong className="text-white font-mono">{testResult.version || 'v6/v7'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">البروتوكول المستخدم:</span>
                          <strong className="text-emerald-400 font-mono">{testResult.protocolUsed || 'API'}</strong>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleApplyToSystem(testHost, testPort, testUser, testPass)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                        >
                          <Check className="w-4 h-4" />
                          <span>تطبيق هذا العنوان والاتصال به فوراً في البرنامج</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {testResult.error && (
                        <p className="font-mono text-[11px] bg-rose-950/60 p-2.5 rounded-lg border border-rose-500/30 text-rose-300">
                          {testResult.error}
                        </p>
                      )}
                      {testResult.diagnostics && (
                        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-300 text-[11px] whitespace-pre-line leading-relaxed">
                          {testResult.diagnostics}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>اتصال آمن ومحمي ومشفر بالكامل لجميع لوحات المايكروتك السحابية</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
