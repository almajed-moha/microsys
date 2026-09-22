import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Server,
  Users,
  CreditCard,
  Layers,
  Zap,
  Activity,
  Radio,
  Clock,
  Printer,
  Wrench,
  Folder,
  Sliders,
  Terminal,
  Bot,
  Search,
  CheckCircle2,
  XCircle,
  Laptop,
  Power,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  X,
  Keyboard,
  Sparkles,
  TrendingUp,
  FileCode,
  Check,
  RotateCcw,
  Store,
  Wifi
} from 'lucide-react';
import { NetworkSettings, MikroTikConfig } from '../types';
import { testMikroTikConnection, ConnectionTestResult } from '../utils/mikrotikApi';

interface MikrotikQuickLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NetworkSettings;
  onNavigateToMikrotik: (subTab?: string, umTab?: string) => void;
  activeUsersCount?: number;
}

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  subTab: string;
  umTab?: string;
  icon: React.ReactNode;
  category: 'usermanager' | 'live_monitoring' | 'tools' | 'management';
  badge?: string;
  badgeColor?: string;
  shortcut?: string;
  popular?: boolean;
}

export const MikrotikQuickLauncherModal: React.FC<MikrotikQuickLauncherModalProps> = ({
  isOpen,
  onClose,
  settings,
  onNavigateToMikrotik,
  activeUsersCount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [pingResult, setPingResult] = useState<ConnectionTestResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const config: MikroTikConfig = useMemo(() => {
    return (
      settings.mikrotikConfig || {
        host: '192.168.88.1',
        apiPort: 8728,
        username: 'admin',
        password: '',
        useSsl: false,
        timeoutSec: 8,
        isLiveConnected: false,
        apiVersion: 'v6',
        routerModel: 'MikroTik RouterOS',
      }
    );
  }, [settings.mikrotikConfig]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
      setPingResult(null);
    }
  }, [isOpen]);

  // Handle connection test
  const handleQuickTest = async () => {
    setIsTestingConnection(true);
    setPingResult(null);
    try {
      const res = await testMikroTikConnection(config);
      setPingResult(res);
    } catch (err: any) {
      setPingResult({
        success: false,
        error: err.message || 'تعذر الوصول إلى الراوتر',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const actionItems: QuickActionItem[] = useMemo(() => [
    {
      id: 'um_users',
      title: 'اليوزر مانجر - كروت المشتركين',
      subtitle: 'عرض وإدارة وحذف وتعديل كروت User Manager مع الفلترة',
      subTab: 'user_manager',
      umTab: 'users',
      icon: <Server className="w-5 h-5 text-purple-400" />,
      category: 'usermanager',
      badge: 'الأساسي ⚡',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      shortcut: 'Alt+U',
      popular: true,
    },
    {
      id: 'um_batch',
      title: 'توليد كروت يوزر مانجر جماعي',
      subtitle: 'إنشاء باقات كروت جديدة بعدد وأسعار وصلاحيات مخصصة',
      subTab: 'user_manager',
      umTab: 'batch',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      category: 'usermanager',
      badge: 'توليد سريع',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      shortcut: 'Alt+G',
      popular: true,
    },
    {
      id: 'um_daily_report',
      title: 'تقرير الاستهلاك والمبيعات اليومي',
      subtitle: 'إحصائيات استهلاك كروت User Manager والمبالغ المحصلة',
      subTab: 'user_manager',
      umTab: 'daily-report',
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      category: 'usermanager',
      badge: 'تقرير مالي',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      popular: true,
    },
    {
      id: 'um_profiles',
      title: 'بروفايلات ومحددات اليوزر مانجر',
      subtitle: 'ضبط السرعات، المحددات، والوقت المسموح لكل باقة',
      subTab: 'user_manager',
      umTab: 'profiles',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      category: 'usermanager',
      badge: 'البروفايلات',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'um_templates',
      title: 'قوالب وطباعة كروت الشبكة',
      subtitle: 'تصميم الكروت الجاهزة وطباعتها على ورق A4 أو طابعة حرارية',
      subTab: 'user_manager',
      umTab: 'templates',
      icon: <Printer className="w-5 h-5 text-indigo-400" />,
      category: 'usermanager',
      badge: 'طباعة A4',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'hotspot_active',
      title: 'المستخدمين النشطين (Active Users)',
      subtitle: 'مراقبة الجلسات الحية وسحب السرعات مع خيار طرد المتصلين',
      subTab: 'active_users',
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      category: 'live_monitoring',
      badge: activeUsersCount !== undefined ? `${activeUsersCount} متصل` : 'مباشر',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      shortcut: 'Alt+A',
      popular: true,
    },
    {
      id: 'hotspot_all_users',
      title: 'كروت الهوتسبوت المخزنة بالراوتر',
      subtitle: 'عرض كافة الكروت في /ip/hotspot/user والمنتهية صلاحيتها',
      subTab: 'all_users',
      icon: <CreditCard className="w-5 h-5 text-indigo-400" />,
      category: 'live_monitoring',
      badge: 'Hotspot Users',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'hotspot_profiles',
      title: 'بروفايلات سرعة الهوتسبوت',
      subtitle: 'التحكم في Rate-limit وسرعات المشتركين ومشاركة الجلسات',
      subTab: 'profiles',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      category: 'management',
      badge: 'Speed Profiles',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'interfaces_traffic',
      title: 'واجهات الشبكة والسرعات الحية (WAN)',
      subtitle: 'رسم بياني حي لمعدل سحب المنافذ وخطوط الإنترنت والـ LAN',
      subTab: 'interfaces',
      icon: <Activity className="w-5 h-5 text-amber-400" />,
      category: 'live_monitoring',
      badge: 'Live Graph',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'connected_hosts',
      title: 'الأجهزة المتصلة وتوزيع الـ IP (DHCP)',
      subtitle: 'فحص عناوين الماك وتوزيع العناوين على الهواتف والأجهزة',
      subTab: 'hosts',
      icon: <Laptop className="w-5 h-5 text-sky-400" />,
      category: 'live_monitoring',
      badge: 'DHCP & Hosts',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'router_maintenance',
      title: 'وضع صيانة الشبكة وإعادة التشغيل',
      subtitle: 'إعادة تشغيل الراوتر، تنظيف الكروت، وإجراء فحص تشخيصي',
      subTab: 'maintenance',
      icon: <Wrench className="w-5 h-5 text-rose-400" />,
      category: 'tools',
      badge: 'أدوات الصيانة',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'files_manager',
      title: 'مدير الملفات والنسخ الاحتياطية',
      subtitle: 'تصفح ملفات المايكروتك وتحميل ملفات الـ Backup والـ RSC',
      subTab: 'files',
      icon: <Folder className="w-5 h-5 text-amber-400" />,
      category: 'tools',
      badge: 'Router Files',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'mikrotik_ai',
      title: 'المساعد الذكي لمايكروتك (AI Assistant)',
      subtitle: 'استشارات فورية لحل مشاكل الشبكة وتوليد سكربتات احترافية',
      subTab: 'ai_assistant',
      icon: <Bot className="w-5 h-5 text-purple-400" />,
      category: 'tools',
      badge: 'ذكاء اصطناعي ✨',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'connection_settings',
      title: 'إعدادات اتصال المايكروتك والـ API',
      subtitle: 'تعديل عنوان IP الراوتر، البورت، بروتوكول REST/API، وبيانات الدخول',
      subTab: 'settings',
      icon: <Sliders className="w-5 h-5 text-slate-300" />,
      category: 'management',
      badge: 'Router Config',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    },
  ], [activeUsersCount]);

  // Filter actions based on search and category
  const filteredActions = useMemo(() => {
    return actionItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(term) ||
        item.subtitle.toLowerCase().includes(term) ||
        (item.shortcut && item.shortcut.toLowerCase().includes(term))
      );
    });
  }, [actionItems, selectedCategory, searchTerm]);

  const handleSelectAction = (item: QuickActionItem) => {
    onNavigateToMikrotik(item.subTab, item.umTab);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  مركز الوصول السريع والإنتاجية لمايكروتك واليوزر مانجر
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline">
                  ⚡ سرعة فائقة
                </span>
              </div>
              <p className="text-xs text-slate-400">
                انتقال فوري بنقرة واحدة لليوزر مانجر، كروت المشتركين، جلسات الهوتسبوت، والتحكم بالشبكة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Router Quick Connection Status Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {config.isLiveConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
              )}
            </span>
            <span className="text-slate-300 font-medium">الراوتر:</span>
            <span className="font-mono text-white font-bold" dir="ltr">
              {config.host || '192.168.88.1'}:{config.port || 8728}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">({config.routerOsVersion || config.protocol || 'RouterOS'})</span>
          </div>

          <div className="flex items-center gap-2">
            {pingResult && (
              <span
                className={`font-mono px-2 py-0.5 rounded text-[11px] font-bold border ${
                  pingResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                {pingResult.success
                  ? `استجابة ${pingResult.latencyMs ?? 0}ms ✓`
                  : 'فشل الفحص ✕'}
              </span>
            )}

            <button
              type="button"
              onClick={handleQuickTest}
              disabled={isTestingConnection}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="فحص سرعة استجابة الراوتر فوراً (Ping)"
            >
              <RefreshCw className={`w-3 h-3 text-cyan-400 ${isTestingConnection ? 'animate-spin' : ''}`} />
              <span>{isTestingConnection ? 'جارٍ الفحص...' : 'فحص الاستجابة (Ping)'}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Category Pills */}
        <div className="p-4 sm:p-5 pb-2 space-y-3">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب للبحث السريع (مثال: يوزر مانجر، كروت، توليد، نشطين، سرعات، واجهات)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              كافة الأقسام ({actionItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('usermanager')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === 'usermanager'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              اليوزر مانجر (User Manager)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('live_monitoring')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === 'live_monitoring'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              المراقبة الحية وسحب السرعات
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('tools')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === 'tools'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              الأدوات والملفات
            </button>
          </div>
        </div>

        {/* Action Items List / Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-1 space-y-2">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              لا توجد أقسام أو أدوات مطابقة لبحثك "{searchTerm}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {filteredActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectAction(item)}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/90 hover:border-indigo-500/50 text-right transition-all flex items-start gap-3 cursor-pointer group active:scale-98 shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-indigo-500/40 group-hover:bg-indigo-600/10 transition mt-0.5">
                    {item.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="font-bold text-white text-xs sm:text-sm group-hover:text-indigo-300 transition truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 self-center shrink-0 text-slate-500 group-hover:text-indigo-400 transition">
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
                    {item.shortcut && (
                      <kbd className="hidden sm:inline-block font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts Info */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <span>اختصارات سريعة:</span>
            <span className="hidden sm:inline font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              Alt + M (فتح هذه النافذة)
            </span>
            <span className="hidden sm:inline font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              Alt + U (اليوزر مانجر)
            </span>
            <span className="hidden sm:inline font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              Alt + A (المتصلين)
            </span>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              onClick={() => {
                onNavigateToMikrotik('user_manager');
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-purple-400" />
              <span>دخول اليوزر مانجر مباشرة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
