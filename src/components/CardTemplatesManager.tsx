import React, { useState, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  CreditCard,
  Save,
  X,
  Type,
  Layers,
  Upload,
  RotateCcw,
  Sparkles,
  Move,
  Check,
  Eye,
  Sliders,
  Store,
  Grid,
  FileImage,
  CheckCircle2,
  ImagePlus,
  Palette
} from 'lucide-react';
import { CardTemplate, CardCategory } from '../types';
import { PrintableCard } from './PrintableCard';

interface CardTemplatesManagerProps {
  templates: CardTemplate[];
  categories: CardCategory[];
  onSaveTemplate: (template: CardTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const CardTemplatesManager: React.FC<CardTemplatesManagerProps> = ({
  templates,
  categories,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [editingTemplate, setEditingTemplate] = useState<Partial<CardTemplate> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listFileInputRef = useRef<HTMLInputElement>(null);
  const [listUploadTemplateId, setListUploadTemplateId] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'layout' | 'styling' | 'fields'>('design');
  const [selectedElementKey, setSelectedElementKey] = useState<string>('userCode');
  const [previewMode, setPreviewMode] = useState<'single' | 'sheet'>('single');

  const customizableElements = [
    { id: 'userCode', label: 'كود الكارت (المستخدم)', icon: '🔑' },
    { id: 'password', label: 'كلمة المرور', icon: '🔒' },
    { id: 'networkName', label: 'اسم الشبكة', icon: '📶' },
    { id: 'networkSlogan', label: 'شعار الشبكة', icon: '💬' },
    { id: 'category', label: 'فئة / بروفايل الكارت', icon: '🏷️' },
    { id: 'price', label: 'سعر الكارت', icon: '💰' },
    { id: 'serial', label: 'الرقم التسلسلي (SN)', icon: '🔢' },
    { id: 'posName', label: 'نقطة البيع', icon: '🏪' },
    { id: 'supportPhone', label: 'هاتف الدعم', icon: '📞' },
    { id: 'printDate', label: 'تاريخ الطباعة', icon: '📅' },
    { id: 'qrCode', label: 'رمز QR', icon: '📱' },
  ];

  const colorSwatches = [
    { name: 'أبيض ناصع', hex: '#ffffff' },
    { name: 'أصفر ذهبي', hex: '#f59e0b' },
    { name: 'سماوي ساطع', hex: '#06b6d4' },
    { name: 'أخضر زمردي', hex: '#10b981' },
    { name: 'وردي أنيق', hex: '#f43f5e' },
    { name: 'بنفسجي ملكي', hex: '#a855f7' },
    { name: 'برتقالي ناري', hex: '#f97316' },
    { name: 'أسود داكن', hex: '#0f172a' },
    { name: 'رمادي فضي', hex: '#94a3b8' },
  ];

  const handleAddNew = () => {
    setEditingTemplate({
      name: '',
      description: '',
      backgroundType: 'custom_image',
      backgroundImageUrl: '',
      bgFit: 'cover',
      bgOverlayOpacity: 0.1,
      themeColor: '#1e1b4b',
      borderColor: '#6366f1',
      cardCornerStyle: 'rounded',
      cardBorderRadius: 14,
      cardsPerPage: 18,
      gridCols: 3,
      gridRows: 6,
      dimensionMode: 'custom_mm',
      cardWidthMm: 85,
      cardHeightMm: 55,
      orientation: 'portrait',
      paperSize: 'A4',
      showCutLines: true,
      cutLineStyle: 'dashed',
      showQrCode: true,
      qrPosition: 'right',
      qrSize: 'md',
      qrHasWhiteBg: true,
      showNetworkName: true,
      showNetworkSlogan: true,
      showCategoryName: true,
      showPrice: true,
      showValidity: true,
      showQuota: false,
      showSpeed: false,
      showSerial: true,
      showPosName: true,
      showSupportPhone: true,
      showInstructions: false,
      showPrintDate: false,
      showCodeLabel: false,
      fontFamily: 'cairo',
      codeBoxStyle: 'rounded-white',
      codeTextColor: '#ffffff',
      codeFontSize: 'md',
      codeLetterSpacing: 'normal',
      elementPositions: {},
      elementStyles: {}
    });
  };

  // Image processor from user's PC: compresses and saves directly to editing template or target template in list
  const processImageFile = (file: File, targetTemplateId?: string) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP).');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality print compression max 1200px
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          if (targetTemplateId) {
            const target = templates.find(t => t.id === targetTemplateId);
            if (target) {
              onSaveTemplate({
                ...target,
                backgroundImageUrl: compressedDataUrl,
                backgroundType: 'custom_image',
                bgFit: target.bgFit || 'cover'
              });
            }
          } else {
            setEditingTemplate(prev =>
              prev
                ? {
                    ...prev,
                    backgroundImageUrl: compressedDataUrl,
                    backgroundType: 'custom_image',
                    bgFit: prev.bgFit || 'cover'
                  }
                : null
            );
          }
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        alert('تعذر قراءة ملف الصورة المحدد.');
      };
      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingImage(false);
      alert('حدث خطأ أثناء قراءة الملف من الجهاز.');
    };

    reader.readAsDataURL(file);
  };

  // Image Upload handler from user's PC with canvas compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset file input so user can pick the same file if needed
    e.target.value = '';
  };

  // Image Upload handler for template cards in the list
  const handleListImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && listUploadTemplateId) {
      processImageFile(file, listUploadTemplateId);
    }
    setListUploadTemplateId(null);
    e.target.value = '';
  };

  const triggerListUpload = (templateId: string) => {
    setListUploadTemplateId(templateId);
    listFileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setEditingTemplate(prev => prev ? { ...prev, backgroundImageUrl: '' } : null);
  };

  const handleUpdatePosition = (elementKey: string, pos: { x: number; y: number }) => {
    setEditingTemplate(prev => {
      if (!prev) return null;
      return {
        ...prev,
        elementPositions: {
          ...(prev.elementPositions || {}),
          [elementKey]: pos
        }
      };
    });
  };

  const handleResetPositions = () => {
    setEditingTemplate(prev => prev ? { ...prev, elementPositions: {} } : null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.name?.trim()) {
      alert('يرجى كتابة اسم القالب');
      return;
    }

    const cols = editingTemplate.gridCols || 3;
    const rows = editingTemplate.gridRows || 6;

    onSaveTemplate({
      ...(editingTemplate as CardTemplate),
      gridCols: cols,
      gridRows: rows,
      cardsPerPage: cols * rows,
      cardCornerStyle: editingTemplate.cardCornerStyle || 'rounded',
      cardBorderRadius: editingTemplate.cardBorderRadius !== undefined
        ? editingTemplate.cardBorderRadius
        : (editingTemplate.cardCornerStyle === 'sharp' ? 0 : 14),
      showCodeLabel: editingTemplate.showCodeLabel ?? false,
      elementStyles: editingTemplate.elementStyles || {},
      bgFit: editingTemplate.bgFit || 'cover',
      id: editingTemplate.id || `tpl-${Date.now()}`,
      createdAt: editingTemplate.createdAt || new Date().toISOString()
    });
    setEditingTemplate(null);
  };

  if (editingTemplate) {
    const previewTemplate = {
      name: editingTemplate.name || 'قالب تجريبي',
      description: editingTemplate.description || '',
      backgroundType: editingTemplate.backgroundType || 'custom_image',
      backgroundImageUrl: editingTemplate.backgroundImageUrl || '',
      bgFit: editingTemplate.bgFit || 'cover',
      bgOverlayOpacity: editingTemplate.bgOverlayOpacity ?? 0.1,
      themeColor: editingTemplate.themeColor || '#1e1b4b',
      borderColor: editingTemplate.borderColor || '#6366f1',
      cardCornerStyle: editingTemplate.cardCornerStyle || 'rounded',
      cardBorderRadius: editingTemplate.cardBorderRadius !== undefined
        ? editingTemplate.cardBorderRadius
        : (editingTemplate.cardCornerStyle === 'sharp' ? 0 : 14),
      cardsPerPage: (editingTemplate.gridCols || 3) * (editingTemplate.gridRows || 6),
      gridCols: editingTemplate.gridCols || 3,
      gridRows: editingTemplate.gridRows || 6,
      dimensionMode: editingTemplate.dimensionMode || 'custom_mm',
      cardWidthMm: editingTemplate.cardWidthMm || 85,
      cardHeightMm: editingTemplate.cardHeightMm || 55,
      orientation: editingTemplate.orientation || 'portrait',
      paperSize: editingTemplate.paperSize || 'A4',
      showCutLines: editingTemplate.showCutLines ?? true,
      cutLineStyle: editingTemplate.cutLineStyle || 'dashed',
      showQrCode: editingTemplate.showQrCode ?? true,
      qrPosition: editingTemplate.qrPosition || 'right',
      qrSize: editingTemplate.qrSize || 'md',
      qrHasWhiteBg: editingTemplate.qrHasWhiteBg ?? true,
      showNetworkName: editingTemplate.showNetworkName ?? true,
      showNetworkSlogan: editingTemplate.showNetworkSlogan ?? true,
      showCategoryName: editingTemplate.showCategoryName ?? true,
      showPrice: editingTemplate.showPrice ?? true,
      showValidity: editingTemplate.showValidity ?? true,
      showQuota: editingTemplate.showQuota ?? false,
      showSpeed: editingTemplate.showSpeed ?? false,
      showSerial: editingTemplate.showSerial ?? true,
      showPosName: editingTemplate.showPosName ?? true,
      showSupportPhone: editingTemplate.showSupportPhone ?? true,
      showInstructions: editingTemplate.showInstructions ?? false,
      showPrintDate: editingTemplate.showPrintDate ?? false,
      showCodeLabel: editingTemplate.showCodeLabel ?? false,
      fontFamily: editingTemplate.fontFamily || 'cairo',
      codeBoxStyle: editingTemplate.codeBoxStyle || 'rounded-white',
      codeTextColor: editingTemplate.codeTextColor || '#ffffff',
      codeFontSize: editingTemplate.codeFontSize || 'md',
      codeLetterSpacing: editingTemplate.codeLetterSpacing || 'normal',
      elementPositions: editingTemplate.elementPositions || {},
      elementStyles: editingTemplate.elementStyles || {},
      id: editingTemplate.id || 'preview',
      createdAt: editingTemplate.createdAt || new Date().toISOString()
    } as CardTemplate;

    return (
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingTemplate.id ? 'تعديل وتخصيص قالب الكروت' : 'إنشاء قالب كروت مخصص جديد'}
              </h3>
              <p className="text-xs text-slate-400">
                إضافة صورة من جهازك، ضبط الألوان والخطوط، وسحب العناصر في المعاينة التفاعلية
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingTemplate(null)}
            className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Middle: Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Template Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'design'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>صورة الكرت</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('layout')}
                className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'layout'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>الأسطر والأعمدة والشكل</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('styling')}
                className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'styling'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>خط ولون العناصر</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'fields'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>الحقول والعرض</span>
              </button>
            </div>

            {/* General Name */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم القالب *</label>
                  <input
                    type="text"
                    value={editingTemplate.name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: قالب باقة 500 الذهبي"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الفئة المقترنة (اختياري)</label>
                  <select
                    value={editingTemplate.categoryId || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, categoryId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- عام (يمكن استخدامه مع أي فئة) --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.retailPrice} ريال)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TAB 1: DESIGN & IMAGE */}
            {activeTab === 'design' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                {/* Main Card Image Upload Dropzone */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <FileImage className="w-4 h-4 text-indigo-400" />
                      <span>اختيار صورة الكرت من جهاز الكمبيوتر:</span>
                    </label>
                    {editingTemplate.backgroundImageUrl && (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>محفوظة في القالب</span>
                      </span>
                    )}
                  </div>

                  {/* Dropzone Container */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer relative overflow-hidden ${
                      isDraggingImage
                        ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                        : editingTemplate.backgroundImageUrl
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isProcessingImage ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-indigo-300 font-bold">جارِ قراءة وضغط الصورة وحفظها للقالب...</span>
                      </div>
                    ) : editingTemplate.backgroundImageUrl ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-right">
                        <div className="w-28 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 shadow-md">
                          <img
                            src={editingTemplate.backgroundImageUrl}
                            alt="Background Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                            <Check className="w-4 h-4" />
                            <span>تم حفظ صورة الكرت محلياً في القالب بنجاح</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            الصورة مدمجة ومحفوظة تلقائياً في بيانات القالب بدقة طباعة عالية.
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>اختيار صورة أخرى من الجهاز</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف الصورة</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-white text-xs">
                          اضغط هنا لاختيار صورة كرتك من جهاز الكمبيوتر، أو اسحب الصورة وأفلتها هنا
                        </div>
                        <div className="text-[11px] text-slate-400 max-w-sm">
                          يدعم صور التصاميم الجاهزة (PNG, JPG, WebP) ويتم حفظها محلياً في القالب تلقائياً للاستخدام الدائم.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct URL input fallback */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">أو رابط صورة مباشر (URL):</label>
                  <input
                    type="text"
                    value={editingTemplate.backgroundImageUrl?.startsWith('data:') ? 'تم حفظ الصورة من جهازك في القالب بنجاح ✓' : (editingTemplate.backgroundImageUrl || '')}
                    disabled={editingTemplate.backgroundImageUrl?.startsWith('data:')}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, backgroundImageUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="https://example.com/card-bg.jpg"
                  />
                </div>

                {/* Image Fit & Overlay & Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">طريقة ملاءمة الصورة (Fit):</label>
                    <select
                      value={editingTemplate.bgFit || 'cover'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, bgFit: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="cover">ملء كامل الكارت (Cover)</option>
                      <option value="contain">احتواء كامل متناسق (Contain)</option>
                      <option value="fill">تمدد على كامل المقاس (Fill)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">لون الكارت (الأساسي):</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={editingTemplate.themeColor || '#1e1b4b'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, themeColor: e.target.value })}
                        className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={editingTemplate.themeColor || '#1e1b4b'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, themeColor: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      تعتيم الخلفية: {Math.round((editingTemplate.bgOverlayOpacity ?? 0.1) * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.05"
                      value={editingTemplate.bgOverlayOpacity ?? 0.1}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, bgOverlayOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400">يزيد وضوح النصوص فوق الصورة</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LAYOUT, GRID & FONTS */}
            {activeTab === 'layout' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                {/* Explicit Rows & Columns Configuration in Single Sheet */}
                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Grid className="w-4 h-4 text-indigo-400" />
                      <span>تقسيم ورقة الطباعة (عدد الأسطر والأعمدة في الورقة الواحدة):</span>
                    </label>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-sm">
                      سعة الورقة: {(editingTemplate.gridCols || 3) * (editingTemplate.gridRows || 6)} كارت
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        عدد الأعمدة في الورقة (Columns):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={editingTemplate.gridCols || 3}
                        onChange={(e) => {
                          const cols = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
                          const rows = editingTemplate.gridRows || 6;
                          setEditingTemplate({
                            ...editingTemplate,
                            gridCols: cols,
                            cardsPerPage: cols * rows,
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">من 1 إلى 8 أعمدة</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        عدد الأسطر (الصفوف) في الورقة (Rows):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={editingTemplate.gridRows || 6}
                        onChange={(e) => {
                          const rows = Math.max(1, Math.min(16, parseInt(e.target.value) || 1));
                          const cols = editingTemplate.gridCols || 3;
                          setEditingTemplate({
                            ...editingTemplate,
                            gridRows: rows,
                            cardsPerPage: cols * rows,
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">من 1 إلى 16 سطر</span>
                    </div>
                  </div>

                  {/* Quick Grid Presets */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block mb-1.5">نماذج جاهزة لتقسيم الورقة:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { name: '18 كارت', cols: 3, rows: 6, tag: 'قياسي A4 (3×6)' },
                        { name: '10 كروت', cols: 2, rows: 5, tag: 'مقاس كبير (2×5)' },
                        { name: '28 كارت', cols: 4, rows: 7, tag: 'اقتصادي A4 (4×7)' },
                        { name: '32 كارت', cols: 4, rows: 8, tag: 'مصغر (4×8)' },
                        { name: '8 كروت', cols: 2, rows: 4, tag: 'فاخر (2×4)' },
                        { name: '1 كارت', cols: 1, rows: 1, tag: 'طابعة حرارية (1×1)' },
                      ].map((preset, idx) => {
                        const isSelected = (editingTemplate.gridCols || 3) === preset.cols && (editingTemplate.gridRows || 6) === preset.rows;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setEditingTemplate({
                                ...editingTemplate,
                                gridCols: preset.cols,
                                gridRows: preset.rows,
                                cardsPerPage: preset.cols * preset.rows,
                              });
                            }}
                            className={`p-2 rounded-xl text-right transition border text-xs flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <span className="font-bold text-[11px] font-mono">{preset.cols} أعمدة × {preset.rows} أسطر</span>
                            <span className={`text-[9px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{preset.tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Frame & Corner Shape (مستدير الحواف أو مركن) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>شكل إطار وزوايا الكارت (مستدير الحواف أو مركن):</span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-300">
                      {(editingTemplate.cardCornerStyle || 'rounded') === 'sharp' ? 'مركن (زوايا قائمة 90°)' : 'مستدير الحواف ناعم'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate({ ...editingTemplate, cardCornerStyle: 'rounded', cardBorderRadius: 14 })}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        (editingTemplate.cardCornerStyle || 'rounded') === 'rounded'
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-md border-2 border-current inline-block" />
                      <span>مستدير الحواف (Rounded)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingTemplate({ ...editingTemplate, cardCornerStyle: 'sharp', cardBorderRadius: 0 })}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        editingTemplate.cardCornerStyle === 'sharp'
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-none border-2 border-current inline-block" />
                      <span>مركن / زوايا حادة 90° (Sharp)</span>
                    </button>
                  </div>
                </div>

                {/* Dimensions & Fonts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">العرض (mm)</label>
                    <input
                      type="number"
                      value={editingTemplate.cardWidthMm || 85}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, cardWidthMm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">الارتفاع (mm)</label>
                    <input
                      type="number"
                      value={editingTemplate.cardHeightMm || 55}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, cardHeightMm: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">خط الكارت الافتراضي</label>
                    <select
                      value={editingTemplate.fontFamily || 'cairo'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, fontFamily: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="cairo">خط كايرو (Cairo)</option>
                      <option value="tajawal">خط تجوال (Tajawal)</option>
                      <option value="almarai">خط المراعي (Almarai)</option>
                      <option value="ibm">خط IBM بلكس (IBM Plex)</option>
                      <option value="mono">أرقام تقنية (Mono)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">حجم خط الكود (بالأرقام أو مسبق الصنع)</label>
                    <input
                      type="text"
                      value={editingTemplate.codeFontSize || 'md'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, codeFontSize: e.target.value })}
                      placeholder="مثال: 16 (لتحويله إلى 16px) أو md"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">شكل صندوق الكود</label>
                    <select
                      value={editingTemplate.codeBoxStyle || 'rounded-white'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, codeBoxStyle: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="transparent">بدون خلفية (شفاف تماماً)</option>
                      <option value="solid-bg">خلفية بيضاء مصمته ومربعة</option>
                      <option value="rounded-white">أبيض زجاجي مضيء</option>
                      <option value="dark-box">صندوق داكن معتم</option>
                      <option value="amber-box">ذهبي مميز</option>
                      <option value="clean-border">إطار شفاف أنيق</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">لون خط النصوص</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={editingTemplate.codeTextColor || '#ffffff'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, codeTextColor: e.target.value })}
                        className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={editingTemplate.codeTextColor || '#ffffff'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, codeTextColor: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">خط القص والتقطيع</label>
                    <select
                      value={editingTemplate.cutLineStyle || 'dashed'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, cutLineStyle: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="dashed">متقطع (Dashed - مفضل للقص)</option>
                      <option value="solid">مستمر (Solid)</option>
                      <option value="dotted">منقط (Dotted)</option>
                      <option value="none">بدون خط خارجي</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ELEMENT STYLES & TYPOGRAPHY (تخصيص خط ولون أي عنصر) */}
            {activeTab === 'styling' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <span>تخصيص خط ولون أي عنصر في الكارت:</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      اختر العنصر أدناه أو انقر عليه في المعاينة التفاعلية لتخصيص لونه وخطه وحجمه
                    </p>
                  </div>
                  {editingTemplate.elementStyles?.[selectedElementKey] && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = { ...(editingTemplate.elementStyles || {}) };
                        delete current[selectedElementKey];
                        setEditingTemplate({ ...editingTemplate, elementStyles: current });
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة الافتراضي لهذا العنصر</span>
                    </button>
                  )}
                </div>

                {/* Elements Selection Chips */}
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-1.5">اختر العنصر للتخصيص:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                    {customizableElements.map((el) => {
                      const isSelected = selectedElementKey === el.id;
                      const hasCustom = !!editingTemplate.elementStyles?.[el.id];
                      return (
                        <button
                          key={el.id}
                          type="button"
                          onClick={() => setSelectedElementKey(el.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.02]'
                              : hasCustom
                              ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/60'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span>{el.icon}</span>
                          <span>{el.label}</span>
                          {hasCustom && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Element Style Editor */}
                {(() => {
                  const activeElementObj = customizableElements.find((el) => el.id === selectedElementKey) || customizableElements[0];
                  const curStyle = editingTemplate.elementStyles?.[selectedElementKey] || {};

                  const updateStyle = (patch: any) => {
                    setEditingTemplate({
                      ...editingTemplate,
                      elementStyles: {
                        ...(editingTemplate.elementStyles || {}),
                        [selectedElementKey]: {
                          ...curStyle,
                          ...patch,
                        },
                      },
                    });
                  };

                  return (
                    <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <span>العنصر النشط للتعديل:</span>
                          <strong className="text-white bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                            {activeElementObj.icon} {activeElementObj.label}
                          </strong>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          تحديث فوري
                        </span>
                      </div>

                      {/* Color Picker with Swatches */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200">لون الخط (Color):</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={curStyle.color || '#ffffff'}
                              onChange={(e) => updateStyle({ color: e.target.value })}
                              className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent"
                            />
                            <input
                              type="text"
                              value={curStyle.color || '#ffffff'}
                              onChange={(e) => updateStyle({ color: e.target.value })}
                              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                            />
                          </div>
                        </div>

                        {/* Quick Palette Swatches */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {colorSwatches.map((swatch, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateStyle({ color: swatch.hex })}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1.5 border ${
                                (curStyle.color || '#ffffff').toLowerCase() === swatch.hex.toLowerCase()
                                  ? 'border-amber-400 ring-2 ring-amber-400/50'
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                              style={{
                                backgroundColor: swatch.hex === '#ffffff' ? '#ffffff' : '#0f172a',
                                color: swatch.hex === '#ffffff' ? '#000000' : swatch.hex,
                              }}
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: swatch.hex }} />
                              <span>{swatch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Family, Size, and Weight */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">نوع الخط (Font Family):</label>
                          <select
                            value={curStyle.fontFamily || editingTemplate.fontFamily || 'cairo'}
                            onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="cairo">Cairo (الافتراضي المتناسق)</option>
                            <option value="tajawal">Tajawal (تجوال العصري)</option>
                            <option value="almarai">Almarai (المراعي المقروء)</option>
                            <option value="ibm">IBM Plex Arabic (تقني رسمي)</option>
                            <option value="mono">JetBrains Mono (أرقام تقنية)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">حجم الخط (بالرقم أو الرمز):</label>
                          <input
                            type="text"
                            value={curStyle.fontSize || 'md'}
                            onChange={(e) => updateStyle({ fontSize: e.target.value })}
                            placeholder="مثال: 12 أو md"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">سمك الخط (Weight):</label>
                          <select
                            value={curStyle.fontWeight || 'bold'}
                            onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="normal">عادي (Normal 400)</option>
                            <option value="semibold">شبه عريض (Semibold 600)</option>
                            <option value="bold">عريض (Bold 700)</option>
                            <option value="black">فائق العرض (Black 900)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 4: TOGGLEABLE FIELDS */}
            {activeTab === 'fields' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-xs text-slate-400 mb-2">
                  اختر الحقول التي تود إظهارها أو إخفاءها حسب متطلبات طباعة كروتك:
                </p>

                {/* Direct clean code toggle without extra text */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 cursor-pointer hover:border-indigo-400 transition">
                  <input
                    type="checkbox"
                    checked={editingTemplate.showCodeLabel || false}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, showCodeLabel: e.target.checked })}
                    className="accent-indigo-600 w-4 h-4 rounded mt-0.5"
                  />
                  <div>
                    <span className="text-xs text-white font-bold block">إظهار عنوان فوق الكود (مثال: "كود الكارت")</span>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      {editingTemplate.showCodeLabel 
                        ? 'يظهر نص وصفي فوق الكود.'
                        : '💡 كود المستخدم فقط بدون أي إضافات نصية أخرى (نقي ومباشر كما طلبت).'}
                    </span>
                  </div>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showNetworkName}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showNetworkName: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">اسم الشبكة</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showCategoryName}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showCategoryName: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">فئة / بروفايل الكارت</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showPrice}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showPrice: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">سعر الكارت</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showSerial}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showSerial: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">الرقم التسلسلي (SN)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showPosName ?? true}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showPosName: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">اسم نقطة البيع</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showQrCode}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showQrCode: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">رمز QR Code الدخول</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showSupportPhone}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showSupportPhone: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">رقم الدعم الفني</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showPrintDate}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showPrintDate: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">تاريخ الطباعة</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/40 transition">
                    <input
                      type="checkbox"
                      checked={editingTemplate.showNetworkSlogan}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, showNetworkSlogan: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 rounded"
                    />
                    <span className="text-xs text-slate-200 font-semibold">شعار الشبكة النصي</span>
                  </label>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetPositions}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                title="إعادة العناصر إلى أماكنها الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الأماكن</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ القالب</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Drag & Drop Preview (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">المعاينة الحية للكارت</h4>
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    previewMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>كارت مفرد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('sheet')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    previewMode === 'sheet'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>ورقة كاملة ({previewTemplate.cardsPerPage})</span>
                </button>
              </div>
            </div>

            {/* Quick Interactive Styling Bar (When Single Card) */}
            {previewMode === 'single' ? (
              <>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5" />
                      <span>العنصر المحدد:</span>
                    </span>
                    <select
                      value={selectedElementKey}
                      onChange={(e) => setSelectedElementKey(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                    >
                      {customizableElements.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.icon} {el.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingTemplate.elementStyles?.[selectedElementKey]?.color || '#ffffff'}
                      onChange={(e) => {
                        const cur = editingTemplate.elementStyles?.[selectedElementKey] || {};
                        setEditingTemplate({
                          ...editingTemplate,
                          elementStyles: {
                            ...(editingTemplate.elementStyles || {}),
                            [selectedElementKey]: { ...cur, color: e.target.value },
                          },
                        });
                      }}
                      className="w-6 h-6 rounded-md cursor-pointer border border-slate-700 bg-transparent"
                      title="لون خط هذا العنصر"
                    />
                    <input
                      type="text"
                      value={editingTemplate.elementStyles?.[selectedElementKey]?.fontSize || 'md'}
                      onChange={(e) => {
                        const cur = editingTemplate.elementStyles?.[selectedElementKey] || {};
                        setEditingTemplate({
                          ...editingTemplate,
                          elementStyles: {
                            ...(editingTemplate.elementStyles || {}),
                            [selectedElementKey]: { ...cur, fontSize: e.target.value },
                          },
                        });
                      }}
                      placeholder="مثال: 12 أو md"
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                      title="حجم خط هذا العنصر"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    انقر على أي عنصر داخل الكارت بالماوس لتحديده وتعديل لونه وخطه فوراً، أو اسحبه لتغيير موضعه!
                  </span>
                </div>

                {/* Interactive Card Canvas Container */}
                <div className="flex items-center justify-center p-4 bg-slate-900 rounded-2xl border border-dashed border-slate-800 min-h-[260px] overflow-hidden">
                  <div className="w-full max-w-[340px]">
                    <PrintableCard
                      template={previewTemplate}
                      networkName="شبكة المستقبل WiFi"
                      networkSlogan="إنترنت فائق السرعة"
                      username="user-1002"
                      password=""
                      serial="1002"
                      profileName="باقة 1 جيجا (يوم)"
                      price={500}
                      currency="ريال"
                      supportPhone="777000111"
                      posPointName="بقالة الأمل"
                      instructions=""
                      interactive={true}
                      selectedElementKey={selectedElementKey}
                      onSelectElement={(key) => setSelectedElementKey(key)}
                      onUpdatePosition={handleUpdatePosition}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Full Sheet Realtime Preview */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-indigo-400" />
                    <span>تقسيم الورقة: {previewTemplate.gridCols} أعمدة × {previewTemplate.gridRows} أسطر</span>
                  </span>
                  <span className="font-mono bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                    الإجمالي: {previewTemplate.cardsPerPage} كارت
                  </span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 max-h-[380px] overflow-y-auto">
                  <div
                    style={{
                      direction: 'rtl',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${previewTemplate.gridCols || 3}, minmax(0, 1fr))`,
                      gap: '6px',
                      alignItems: 'start',
                    }}
                  >
                    {Array.from({ length: previewTemplate.cardsPerPage }).map((_, idx) => (
                      <div key={idx} className="w-full scale-90 origin-top">
                        <PrintableCard
                          template={previewTemplate}
                          networkName="شبكة المستقبل WiFi"
                          networkSlogan="إنترنت فائق السرعة"
                          username={`user-${1001 + idx}`}
                          password=""
                          serial={1001 + idx}
                          profileName="باقة 1 جيجا"
                          price={500}
                          currency="ريال"
                          supportPhone="777000111"
                          posPointName="بقالة الأمل"
                          instructions=""
                          interactive={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-between px-2">
              <span>
                إطار الكارت:{' '}
                <strong className="text-indigo-300">
                  {previewTemplate.cardCornerStyle === 'sharp' ? 'مركن (حواف حادة 90°)' : 'مستدير الحواف'}
                </strong>
              </span>
              <span>
                المقاس:{' '}
                <strong className="text-slate-200">
                  {editingTemplate.cardWidthMm || 85} × {editingTemplate.cardHeightMm || 55} مم
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Templates List View
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <span>قوالب وتصاميم كروت الطباعة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            صمم قوالب الفئات، ارفع صور الخلفيات من كمبيوترك، وخصص الخطوط ومواضع العناصر بالسحب والإفلات.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء وتجهيز قالب جديد</span>
        </button>
      </div>

      {/* Hidden File Input for List Upload */}
      <input
        ref={listFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleListImageFileChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-md transition hover:border-indigo-500/40 hover:shadow-indigo-500/10 group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{tpl.name}</span>
                    {tpl.backgroundImageUrl && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="يحتوي على صورة محفوظة" />
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {tpl.cardWidthMm}×{tpl.cardHeightMm} مم • خط: {tpl.fontFamily || 'cairo'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                    <Grid className="w-3 h-3" />
                    <span>{tpl.gridCols || 3}×{tpl.gridRows || 6} ({((tpl.gridCols || 3) * (tpl.gridRows || 6))} كارت)</span>
                  </span>
                </div>
              </div>

              {/* Template Thumbnail or Mini Card Preview */}
              <div className="h-36 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner group/thumb">
                {tpl.backgroundImageUrl ? (
                  <img
                    src={tpl.backgroundImageUrl}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-3 text-center"
                    style={{ backgroundColor: tpl.themeColor || '#1e1b4b' }}
                  >
                    <CreditCard className="w-6 h-6 mb-1 opacity-60 text-white" />
                    <span className="text-xs font-bold text-white">{tpl.name}</span>
                    <span className="text-[10px] text-slate-300/80 mt-1">بدون صورة خلفية</span>
                  </div>
                )}

                {/* Quick Upload Overlay button */}
                <button
                  type="button"
                  onClick={() => triggerListUpload(tpl.id)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition flex flex-col items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs"
                >
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <span>{tpl.backgroundImageUrl ? 'تغيير صورة الكرت من الكمبيوتر' : 'اختيار صورة من الكمبيوتر'}</span>
                </button>

                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white/90 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg pointer-events-none">
                  <span>{tpl.showQrCode ? 'QR مفعّل' : 'بدون QR'}</span>
                  <span>{tpl.backgroundImageUrl ? 'صورة محفوظة ✓' : 'لون صلب'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => triggerListUpload(tpl.id)}
                className="text-[11px] text-slate-400 hover:text-indigo-300 font-bold transition flex items-center gap-1"
                title="رفع صورة من الجهاز وحفظها في هذا القالب"
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>{tpl.backgroundImageUrl ? 'تبديل الصورة' : 'إرفاق صورة'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTemplate(tpl)}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>تعديل وسحب</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف قالب "${tpl.name}"؟`)) {
                      onDeleteTemplate(tpl.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 rounded-xl transition"
                  title="حذف القالب"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-slate-800/60 border-dashed space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">لا توجد قوالب طباعة مجهزة حتى الآن.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              قم بإنشاء قالبك الأول، وارفع صورة كرتك من الكمبيوتر، وحدد المقاسات والحقول المناسبة.
            </p>
            <button
              onClick={handleAddNew}
              className="mt-2 text-indigo-400 text-xs font-bold hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>اضغط هنا لتجهيز وتصميم قالبك الأول</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
