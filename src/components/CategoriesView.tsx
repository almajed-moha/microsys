import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Clock,
  HardDrive,
  Zap,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  Server,
  PlusCircle,
  Code,
  Copy,
  Check,
  Download,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { CardCategory, NetworkSettings } from '../types';
import { generateUserManagerProfilesSetup, downloadFile } from '../utils/storage';
import { standardUserManagerPresets } from '../mockData';

interface CategoriesViewProps {
  categories: CardCategory[];
  settings: NetworkSettings;
  onAddCategory: (category: Omit<CardCategory, 'id'>) => void;
  onUpdateCategory: (category: CardCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAdjustStock: (categoryId: string, delta: number) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  settings,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAdjustStock,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CardCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CardCategory | null>(null);
  const [isSetupScriptOpen, setIsSetupScriptOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    uptimeLimit: '1h',
    quotaLimit: '500M',
    rateLimit: '4M/2M',
    validityDays: 1,
    costPrice: 25,
    wholesalePrice: 80,
    retailPrice: 100,
    mikrotikProfile: 'Profile-100',
    userManagerProfile: 'UM-Profile-100',
    userManagerLimitation: 'UM-Lim-100',
    sharedUsers: 1,
    warehouseStock: 200,
    colorTheme: 'indigo',
    notes: '',
  });

  const handleOpenAdd = (preset?: Partial<typeof formData>) => {
    setEditingCategory(null);
    setFormData({
      name: preset?.name || '',
      code: preset?.code || '',
      uptimeLimit: preset?.uptimeLimit || '1h',
      quotaLimit: preset?.quotaLimit || '500M',
      rateLimit: preset?.rateLimit || '4M/2M',
      validityDays: preset?.validityDays || 1,
      costPrice: preset?.costPrice || 25,
      wholesalePrice: preset?.wholesalePrice || 80,
      retailPrice: preset?.retailPrice || 100,
      mikrotikProfile: preset?.mikrotikProfile || 'Profile-100',
      userManagerProfile: preset?.userManagerProfile || 'UM-Profile-100',
      userManagerLimitation: preset?.userManagerLimitation || 'UM-Lim-100',
      sharedUsers: preset?.sharedUsers || 1,
      warehouseStock: preset?.warehouseStock || 200,
      colorTheme: preset?.colorTheme || 'indigo',
      notes: preset?.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CardCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      uptimeLimit: cat.uptimeLimit,
      quotaLimit: cat.quotaLimit,
      rateLimit: cat.rateLimit || '4M/2M',
      validityDays: cat.validityDays,
      costPrice: cat.costPrice,
      wholesalePrice: cat.wholesalePrice,
      retailPrice: cat.retailPrice,
      mikrotikProfile: cat.mikrotikProfile,
      userManagerProfile: cat.userManagerProfile || `UM-${cat.mikrotikProfile}`,
      userManagerLimitation: cat.userManagerLimitation || `Lim-${cat.code}`,
      sharedUsers: cat.sharedUsers || 1,
      warehouseStock: cat.warehouseStock,
      colorTheme: cat.colorTheme,
      notes: cat.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = (price: number) => {
    if (price === 100) {
      setFormData(prev => ({
        ...prev,
        name: 'كارت 100 ريال (1 ساعة / 500 ميجا)',
        code: '100_1H',
        uptimeLimit: '1h',
        quotaLimit: '500M',
        rateLimit: '4M/2M',
        validityDays: 1,
        costPrice: 25,
        wholesalePrice: 80,
        retailPrice: 100,
        mikrotikProfile: 'Profile-100',
        userManagerProfile: 'UM-Profile-100',
        userManagerLimitation: 'UM-Lim-100',
      }));
    } else if (price === 200) {
      setFormData(prev => ({
        ...prev,
        name: 'كارت 200 ريال (3 ساعات / 1.5 جيجا)',
        code: '200_3H',
        uptimeLimit: '3h',
        quotaLimit: '1500M',
        rateLimit: '5M/2M',
        validityDays: 2,
        costPrice: 50,
        wholesalePrice: 160,
        retailPrice: 200,
        mikrotikProfile: 'Profile-200',
        userManagerProfile: 'UM-Profile-200',
        userManagerLimitation: 'UM-Lim-200',
      }));
    } else if (price === 500) {
      setFormData(prev => ({
        ...prev,
        name: 'كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)',
        code: '500_1D',
        uptimeLimit: '1d',
        quotaLimit: '3500M',
        rateLimit: '6M/3M',
        validityDays: 3,
        costPrice: 130,
        wholesalePrice: 420,
        retailPrice: 500,
        mikrotikProfile: 'Profile-500',
        userManagerProfile: 'UM-Profile-500',
        userManagerLimitation: 'UM-Lim-500',
      }));
    } else if (price === 1000) {
      setFormData(prev => ({
        ...prev,
        name: 'كارت 1000 ريال (3 أيام / 8 جيجا)',
        code: '1000_3D',
        uptimeLimit: '3d',
        quotaLimit: '8G',
        rateLimit: '8M/4M',
        validityDays: 5,
        costPrice: 280,
        wholesalePrice: 850,
        retailPrice: 1000,
        mikrotikProfile: 'Profile-1000',
        userManagerProfile: 'UM-Profile-1000',
        userManagerLimitation: 'UM-Lim-1000',
      }));
    } else if (price === 1500) {
      setFormData(prev => ({
        ...prev,
        name: 'كارت 1500 ريال (أسبوعي 7 أيام / 15 جيجا)',
        code: '1500_7D',
        uptimeLimit: '7d',
        quotaLimit: '15G',
        rateLimit: '8M/4M',
        validityDays: 7,
        costPrice: 420,
        wholesalePrice: 1250,
        retailPrice: 1500,
        mikrotikProfile: 'Profile-1500',
        userManagerProfile: 'UM-Profile-1500',
        userManagerLimitation: 'UM-Lim-1500',
      }));
    }
  };

  const handleImportAllPresets = () => {
    if (confirm('هل ترغب بإضافة باقات وفئات يوزر مانجر القياسية (100، 200، 300، 500، 1000، 1500، 3000، 5000 ر.ي)؟')) {
      standardUserManagerPresets.forEach(preset => {
        // avoid exact code duplicates
        if (!categories.some(c => c.code === preset.code || c.retailPrice === preset.retailPrice)) {
          onAddCategory(preset);
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: formData.name,
        code: formData.code || formData.name.slice(0, 4).toUpperCase(),
        uptimeLimit: formData.uptimeLimit,
        quotaLimit: formData.quotaLimit,
        rateLimit: formData.rateLimit,
        validityDays: Number(formData.validityDays),
        costPrice: Number(formData.costPrice),
        wholesalePrice: Number(formData.wholesalePrice),
        retailPrice: Number(formData.retailPrice),
        mikrotikProfile: formData.mikrotikProfile || `Profile-${formData.name}`,
        userManagerProfile: formData.userManagerProfile || `UM-Profile-${formData.retailPrice}`,
        userManagerLimitation: formData.userManagerLimitation || `UM-Lim-${formData.retailPrice}`,
        sharedUsers: Number(formData.sharedUsers) || 1,
        warehouseStock: Number(formData.warehouseStock),
        colorTheme: formData.colorTheme,
        notes: formData.notes,
      });
    } else {
      onAddCategory({
        name: formData.name,
        code: formData.code || `CAT-${Date.now().toString().slice(-4)}`,
        uptimeLimit: formData.uptimeLimit,
        quotaLimit: formData.quotaLimit,
        rateLimit: formData.rateLimit,
        validityDays: Number(formData.validityDays),
        costPrice: Number(formData.costPrice),
        wholesalePrice: Number(formData.wholesalePrice),
        retailPrice: Number(formData.retailPrice),
        mikrotikProfile: formData.mikrotikProfile || `Profile-${formData.name}`,
        userManagerProfile: formData.userManagerProfile || `UM-Profile-${formData.retailPrice}`,
        userManagerLimitation: formData.userManagerLimitation || `UM-Lim-${formData.retailPrice}`,
        sharedUsers: Number(formData.sharedUsers) || 1,
        warehouseStock: Number(formData.warehouseStock),
        colorTheme: formData.colorTheme,
        notes: formData.notes,
      });
    }
    setIsModalOpen(false);
  };

  const profilesSetupScript = generateUserManagerProfilesSetup(categories);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              فئات الكروت وباقات يوزر مانجر والهوتسبوت
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {categories.length} فئة معرفة
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تسعير الكروت (100، 200، 500، 1000 ر.ي...)، محددات السرعة والوقت، ربط بروفايلات User Manager و RouterOS، وإدارة رصيد المستودع.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setIsSetupScriptOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition"
            title="توليد سكربت مايكروتك لإنشاء كافة البروفايلات والقيود"
          >
            <FileCode className="w-4 h-4" />
            <span>سكربت بروفايلات User Manager</span>
          </button>

          <button
            onClick={handleImportAllPresets}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
            title="استيراد قوالب فئات 100، 200، 500، 1000..."
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>استيراد قوالب جاهزة</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فئة جديدة</span>
          </button>
        </div>
      </div>

      {/* Quick Category Price Pills Filter / Quick Add */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">الفئات المتاحة للشبكة:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[100, 200, 300, 500, 1000, 1500, 3000, 5000].map(price => {
            const exists = categories.some(c => c.retailPrice === price);
            return (
              <button
                key={price}
                onClick={() => {
                  if (exists) {
                    const cat = categories.find(c => c.retailPrice === price);
                    if (cat) handleOpenEdit(cat);
                  } else {
                    handleOpenAdd();
                    setTimeout(() => handleApplyPreset(price), 50);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 ${
                  exists
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
                title={exists ? `تعديل فئة ${price} ${settings.currencySymbol}` : `إضافة فئة ${price} ${settings.currencySymbol}`}
              >
                <span>{price} {settings.currencySymbol}</span>
                {exists && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const wholesaleProfit = cat.wholesalePrice - cat.costPrice;
          const posMargin = cat.retailPrice - cat.wholesalePrice;

          return (
            <div
              key={cat.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-md overflow-hidden flex flex-col justify-between transition group"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition">
                      {cat.name}
                    </h3>
                    <div className="flex flex-col gap-0.5 text-xs text-slate-400 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Hotspot: <strong className="font-mono text-slate-300">{cat.mikrotikProfile}</strong></span>
                      </div>
                      {cat.userManagerProfile && (
                        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400/90">
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>User Manager: <strong className="font-mono">{cat.userManagerProfile}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {cat.code}
                  </span>
                </div>

                {/* Technical Specs Tags */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px]">الوقت</span>
                    </div>
                    <span className="font-bold font-mono text-white text-xs">{cat.uptimeLimit}</span>
                  </div>

                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px]">الرصيد</span>
                    </div>
                    <span className="font-bold font-mono text-white text-xs">{cat.quotaLimit}</span>
                  </div>

                  <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px]">السرعة</span>
                    </div>
                    <span className="font-bold font-mono text-white text-xs">{cat.rateLimit || 'حر'}</span>
                  </div>
                </div>

                {/* Pricing & Profit Grid */}
                <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>سعر البيع للجمهور:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {cat.retailPrice} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>سعر التوريد لنقطة البيع (الجملة):</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {cat.wholesalePrice} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>سعر التكلفة التقديرية:</span>
                    <span className="font-mono text-slate-400">
                      {cat.costPrice} {settings.currencySymbol}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-emerald-400 font-semibold">
                    <span>صافي ربح الشبكة بالكارت:</span>
                    <span className="font-mono font-bold">
                      +{wholesaleProfit} {settings.currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Warehouse Stock Controls */}
                <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">مخزون المستودع الحالي:</span>
                      <span className="font-mono font-bold text-white text-base">
                        {cat.warehouseStock} <span className="text-xs text-slate-400 font-normal">كارت</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onAdjustStock(cat.id, 10)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-mono font-bold border border-slate-700 transition"
                        title="إضافة 10 كروت للمستودع"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => onAdjustStock(cat.id, 50)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-mono font-bold border border-slate-700 transition"
                        title="إضافة 50 كارت للمستودع"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => onAdjustStock(cat.id, 100)}
                        className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-[11px] font-mono font-bold transition"
                        title="إضافة 100 كارت للمستودع"
                      >
                        +100
                      </button>
                    </div>
                  </div>

                  {/* Direct Quantity Input for Warehouse Stock */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                    <span className="text-slate-400 text-[10px] whitespace-nowrap">كتابة الرصيد مباشرة:</span>
                    <input
                      type="number"
                      min="0"
                      value={cat.warehouseStock}
                      onChange={(e) => {
                        const newStock = Math.max(0, parseInt(e.target.value, 10) || 0);
                        const diff = newStock - cat.warehouseStock;
                        if (diff !== 0) {
                          onAdjustStock(cat.id, diff);
                        }
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs text-center font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400">كارت</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>
                <button
                  onClick={() => setDeletingCategory(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 bg-rose-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">حذف فئة الكارت</h3>
                  <p className="text-xs text-rose-300/80">تأكيد إزالة الفئة من النظام</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingCategory(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <h4 className="font-bold text-white text-sm mb-1">{deletingCategory.name}</h4>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>سعر التجزئة: <strong className="text-white font-mono">{deletingCategory.retailPrice} {settings.currencySymbol}</strong></span>
                  <span>رصيد المستودع: <strong className="text-indigo-300 font-mono">{deletingCategory.warehouseStock} كارت</strong></span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  عند حذف هذه الفئة، لن تظهر في قائمة توليد الكروت الجديدة أو التوريد لنقاط البيع.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCategory(deletingCategory.id);
                    setDeletingCategory(null);
                  }}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تأكيد حذف الفئة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Manager Setup Script Modal */}
      {isSetupScriptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">سكربت تهيئة بروفايلات وقيود User Manager</h3>
                  <p className="text-xs text-slate-400">لإنشاء كافة البروفايلات في سيرفر مايكروتك تلقائياً</p>
                </div>
              </div>
              <button
                onClick={() => setIsSetupScriptOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-300">
                انسخ هذا السكربت والصقه في منفذ الأوامر (Terminal) في راوتر المايكروتك لإنشاء البروفايلات والقيود الخاصة بفئات الكروت المعرفة لديك:
              </p>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-xs overflow-x-auto max-h-60">
                <pre>{profilesSetupScript}</pre>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => downloadFile(profilesSetupScript, `usermanager-profiles-setup-${Date.now()}.rsc`, 'text/plain')}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف (.rsc)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profilesSetupScript);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'تم النسخ!' : 'نسخ السكربت'}</span>
                  </button>
                  <button
                    onClick={() => setIsSetupScriptOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span>{editingCategory ? 'تعديل فئة الكارت' : 'إضافة فئة كارت وباقة جديدة'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            {!editingCategory && (
              <div className="px-5 pt-3 pb-1 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-slate-400 text-[11px] whitespace-nowrap">تعبئة سريعة:</span>
                {[100, 200, 500, 1000, 1500].map(price => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => handleApplyPreset(price)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-mono text-[11px] transition"
                  >
                    فئة {price}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    اسم الفئة <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: كارت 100 ريال (1 ساعة)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    رمز الفئة (Code):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 100_1H"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* MikroTik & User Manager Profiles */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>بروفايلات MikroTik & User Manager:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      بروفايل Hotspot Profile:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: Profile-100"
                      value={formData.mikrotikProfile}
                      onChange={(e) => setFormData({ ...formData, mikrotikProfile: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      بروفايل User Manager Profile:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: UM-Profile-100"
                      value={formData.userManagerProfile}
                      onChange={(e) => setFormData({ ...formData, userManagerProfile: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      قيد User Manager Limitation:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: UM-Lim-100"
                      value={formData.userManagerLimitation}
                      onChange={(e) => setFormData({ ...formData, userManagerLimitation: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      عدد الأجهزة المسموحة بنفس الكارت:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.sharedUsers}
                      onChange={(e) => setFormData({ ...formData, sharedUsers: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Limits */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الوقت (Uptime):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 1h أو 1d"
                    value={formData.uptimeLimit}
                    onChange={(e) => setFormData({ ...formData, uptimeLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الرصيد (Quota):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 500M أو 1.5G"
                    value={formData.quotaLimit}
                    onChange={(e) => setFormData({ ...formData, quotaLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    السرعة (Rate Limit):
                  </label>
                  <input
                    type="text"
                    placeholder="4M/2M"
                    value={formData.rateLimit}
                    onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    سعر التكلفة:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.costPrice === 0 ? '' : formData.costPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, costPrice: v === '' ? 0 : Number(v) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    سعر الجملة (للموزع):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.wholesalePrice === 0 ? '' : formData.wholesalePrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, wholesalePrice: v === '' ? 0 : Number(v) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    سعر البيع (للجمهور):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.retailPrice === 0 ? '' : formData.retailPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, retailPrice: v === '' ? 0 : Number(v) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Initial Warehouse Stock & Validity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    رصيد المستودع (كارت):
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.warehouseStock === 0 ? '' : formData.warehouseStock}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, warehouseStock: v === '' ? 0 : Math.max(0, parseInt(v, 10) || 0) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    مدة الصلاحية (أيام):
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.validityDays === 0 ? '' : formData.validityDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, validityDays: v === '' ? 0 : Math.max(1, parseInt(v, 10) || 1) });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ملاحظات أو وصف الفئة:
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="وصف الباقة، الشريحة المستهدفة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition"
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إضافة الفئة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
