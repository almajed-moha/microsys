import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Store,
  Layers,
  FileText,
  Check,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import { DashboardTabId, UserDashboardPreferences } from '../types';

export interface DashboardTabInfo {
  id: DashboardTabId;
  label: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
  borderColor: string;
}

export const ALL_DASHBOARD_TABS: DashboardTabInfo[] = [
  {
    id: 'financial_kpis',
    label: 'المؤشرات المالية الأساسية',
    category: 'مؤشرات وأرباح',
    description: 'صافي المبيعات، تكلفة البضاعة المباعة (COGS)، المصروفات التشغيلية، وصافي الربح الحقيقي مع نسبة الهامش.',
    icon: DollarSign,
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'secondary_indicators',
    label: 'السيولة والمؤشرات الإضافية',
    category: 'مؤشرات فرعية',
    description: 'إجمالي المقبوضات النقدية، مجموع مديونيات نقاط البيع المعلقة، والرصيد الكلي لمخزون الكروت في المستودع.',
    icon: CreditCard,
    color: 'text-cyan-400',
    bgLight: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'critical_alerts',
    label: 'شريط التنبيهات الذكية الفورية',
    category: 'رقابة وتنبيهات',
    description: 'تنبيهات فورية لنقاط البيع التي قاربت أو تجاوزت سقف الدين المسموح، والفئات القريبة من النفاد.',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'financial_trend_chart',
    label: 'مسار المبيعات والمصروفات وصافي الأرباح',
    category: 'رسوم بيانية',
    description: 'رسم بياني تفاعلي يوضح المقارنة اليومية بين الإيرادات المحققة والمصروفات وصافي العائد الحقيقي.',
    icon: TrendingUp,
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'expenses_breakdown',
    label: 'توزيع المصروفات حسب البنود',
    category: 'تحليل النفقات',
    description: 'مخطط دائري يوضح توزيع المصروفات التشغيلية ونسبة كل بند إنفاق من إجمالي إيرادات الشبكة.',
    icon: Receipt,
    color: 'text-rose-400',
    bgLight: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'pos_leaderboard',
    label: 'أداء ومبيعات نقاط البيع والموزعين',
    category: 'مبيعات وتوزيع',
    description: 'تصنيف نقاط البيع الأكثر نشاطاً مع حجم مبيعات كل نقطة والمديونية القائمة ومقارنتها بدقة.',
    icon: Store,
    color: 'text-sky-400',
    bgLight: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    id: 'category_sales',
    label: 'مبيعات وتصريف فئات الكروت',
    category: 'المخزون والطلب',
    description: 'مخطط بياني يوضح عدد الكروت المباعة لكل فئة والمخزون المتبقي منها في المستودع.',
    icon: Layers,
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'recent_invoices',
    label: 'جدول أحدث الفواتير والعمليات',
    category: 'حركات وسجلات',
    description: 'قائمة فورية بآخر فواتير المبيعات والمرتجع الصادرة مع حالة كل فاتورة وقيمتها ونقطة البيع.',
    icon: FileText,
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
];

export const DEFAULT_VISIBLE_TABS: DashboardTabId[] = ALL_DASHBOARD_TABS.map((t) => t.id);

interface DashboardCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: UserDashboardPreferences;
  onSavePreferences: (newPreferences: UserDashboardPreferences) => void;
  userName?: string;
}

export const DashboardCustomizerModal: React.FC<DashboardCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentPreferences,
  onSavePreferences,
  userName = 'المستخدم',
}) => {
  const [selectedTabs, setSelectedTabs] = useState<DashboardTabId[]>(
    currentPreferences.visibleTabs && currentPreferences.visibleTabs.length > 0
      ? currentPreferences.visibleTabs
      : DEFAULT_VISIBLE_TABS
  );

  const [viewMode, setViewMode] = useState<'tabbed' | 'grid'>(
    currentPreferences.viewMode || 'tabbed'
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Toggle single tab
  const handleToggleTab = (tabId: DashboardTabId) => {
    setSelectedTabs((prev) => {
      if (prev.includes(tabId)) {
        // Prevent unchecking all tabs (at least one tab must remain)
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((id) => id !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  // Presets
  const applyPreset = (presetType: 'all' | 'financial' | 'sales' | 'inventory') => {
    switch (presetType) {
      case 'all':
        setSelectedTabs(DEFAULT_VISIBLE_TABS);
        break;
      case 'financial':
        setSelectedTabs([
          'financial_kpis',
          'financial_trend_chart',
          'expenses_breakdown',
          'recent_invoices',
        ]);
        break;
      case 'sales':
        setSelectedTabs([
          'pos_leaderboard',
          'category_sales',
          'secondary_indicators',
          'recent_invoices',
        ]);
        break;
      case 'inventory':
        setSelectedTabs([
          'critical_alerts',
          'category_sales',
          'pos_leaderboard',
          'secondary_indicators',
        ]);
        break;
    }
  };

  const handleSave = () => {
    const finalTabs = selectedTabs.length > 0 ? selectedTabs : DEFAULT_VISIBLE_TABS;
    const newPrefs: UserDashboardPreferences = {
      visibleTabs: finalTabs,
      viewMode,
      defaultTab: finalTabs[0] || 'all',
    };

    onSavePreferences(newPrefs);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleRestoreDefaults = () => {
    setSelectedTabs(DEFAULT_VISIBLE_TABS);
    setViewMode('tabbed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  تخصيص تبويبات لوحة التحكم
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTabs.length} من {ALL_DASHBOARD_TABS.length} مفعّلة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تخصيص الواجهة للمستخدم <span className="text-slate-200 font-medium">{userName}</span>: حدد الأقسام الأكثر أهمية لك لتسريع الوصول للمعلومات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Presets Bar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>قوالب وتفضيلات سريعة حسب الدور:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedTabs.length === ALL_DASHBOARD_TABS.length
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>الكل (شامل)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('financial')}
                className="py-2 px-3 rounded-xl text-xs font-bold border bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30 hover:border-emerald-500/40 transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>المدير المالي</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('sales')}
                className="py-2 px-3 rounded-xl text-xs font-bold border bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-sky-300 hover:bg-sky-950/30 hover:border-sky-500/40 transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-sky-400" />
                <span>المبيعات والتوزيع</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('inventory')}
                className="py-2 px-3 rounded-xl text-xs font-bold border bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 hover:border-amber-500/40 transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>الرقابة والمخزون</span>
              </button>
            </div>
          </div>

          {/* View Mode Choice */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">طريقة عرض لوحة التحكم الرئيسية</h4>
                <p className="text-xs text-slate-400 mt-0.5">اختر كيفية ترتيب وتنقل التبويبات في لوحة التحكم</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setViewMode('tabbed')}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  viewMode === 'tabbed'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === 'tabbed'}
                  onChange={() => setViewMode('tabbed')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <span>عرض بالتبويبات المنفصلة (Tabbed View)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300">مستحسن</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    شريط تبويبات علوي سريع للتنقل بين الأقسام بضغطة زر وبتركيز عالي دون الحاجة للتمرير الطويل.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setViewMode('grid')}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === 'grid'}
                  onChange={() => setViewMode('grid')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white">
                    عرض الصفحة الشاملة (Unified Page)
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    عرض كافة التبويبات المحددة متتالية في صفحة واحدة للتمرير الكامل بنظرة شاملة.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Selectable Tabs List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                التبويبات المتاحة للعرض في لوحة التحكم:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTabs(DEFAULT_VISIBLE_TABS)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Eye className="w-3 h-3" />
                  <span>تحديد الكل</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedTabs(['financial_kpis'])}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>إلغاء التحديد</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_DASHBOARD_TABS.map((tab) => {
                const isChecked = selectedTabs.includes(tab.id);
                const IconComponent = tab.icon;

                return (
                  <div
                    key={tab.id}
                    onClick={() => handleToggleTab(tab.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 select-none ${
                      isChecked
                        ? 'bg-slate-800/80 border-slate-600/80 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center transition shrink-0 ${
                        isChecked
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-600 bg-slate-800 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <div className={`p-1.5 rounded-lg ${tab.bgLight} ${tab.color} shrink-0`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className={`font-bold text-xs sm:text-sm truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                            {tab.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {tab.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {tab.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              id="btn-save-dashboard-preferences"
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-98'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم الحفظ والتطبيق!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ وتطبيق التبويبات ({selectedTabs.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
