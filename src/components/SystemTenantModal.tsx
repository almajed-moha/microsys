import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Save,
  X,
  Sparkles,
  Shield,
  ShieldCheck,
  CheckSquare,
  Square,
  Layers,
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Receipt,
  DollarSign,
  Store,
  Activity,
  ExternalLink,
  Settings,
  Database,
  SlidersHorizontal,
  Check,
  Info,
  Sliders,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Coins,
} from 'lucide-react';
import { NetworkTenant, NetworkSettings, AppUser, POSPoint, TenantAllowedModule } from '../types';
import { defaultNetworkSettings } from '../mockData';
import { checkUsernameAvailability, generateAlternativeUsernames } from '../utils/usernameValidator';
import {
  ALL_TENANT_MODULES,
  TENANT_AVAILABLE_MODULES,
  TENANT_PRESET_PACKAGES,
  TenantModuleMeta,
} from '../utils/permissions';

interface SystemTenantModalProps {
  tenant: NetworkTenant | null;
  initialTab?: 'info' | 'permissions' | 'settings';
  allUsers?: AppUser[];
  allPosPoints?: POSPoint[];
  allTenants?: NetworkTenant[];
  onSave: (tenant: NetworkTenant) => void;
  onClose: () => void;
}

export const SystemTenantModal: React.FC<SystemTenantModalProps> = ({
  tenant,
  initialTab = 'info',
  allUsers = [],
  allPosPoints = [],
  allTenants = [],
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'permissions' | 'settings'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');

  const [formData, setFormData] = useState<Partial<NetworkTenant> & { adminPassword?: string }>({
    id: '',
    name: '',
    adminUsername: '',
    adminPassword: '',
    status: 'active',
    subscriptionPlan: 'monthly',
    subscriptionEndDate: '',
    createdAt: new Date().toISOString().split('T')[0],
    accessMode: 'all',
    allowedModules: [...ALL_TENANT_MODULES],
    notes: '',
    settings: {
      ...defaultNetworkSettings,
      networkName: '',
      networkSlogan: 'خدمات الإنترنت والشبكات اللاسلكية',
      currency: 'YER',
      currencySymbol: 'ر.ي',
    },
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        ...tenant,
        accessMode: tenant.accessMode || 'all',
        allowedModules: tenant.allowedModules && tenant.allowedModules.length > 0 
          ? [...tenant.allowedModules] 
          : [...ALL_TENANT_MODULES],
        notes: tenant.notes || '',
        settings: {
          ...defaultNetworkSettings,
          ...(tenant.settings || {}),
          networkName: tenant.settings?.networkName || tenant.name,
        },
      });
    } else {
      setFormData({
        id: `net-${Date.now().toString().slice(-6)}`,
        name: '',
        adminUsername: '',
        adminPassword: '',
        status: 'active',
        subscriptionPlan: 'monthly',
        subscriptionEndDate: '',
        createdAt: new Date().toISOString().split('T')[0],
        accessMode: 'all',
        allowedModules: [...ALL_TENANT_MODULES],
        notes: '',
        settings: {
          ...defaultNetworkSettings,
          networkName: '',
          networkSlogan: 'خدمات الإنترنت والشبكات اللاسلكية',
          currency: 'YER',
          currencySymbol: 'ر.ي',
        },
      });
    }
  }, [tenant]);

  // Real-time username availability validation
  const usernameValidation = useMemo(() => {
    return checkUsernameAvailability(
      formData.adminUsername || '',
      allUsers,
      allPosPoints,
      allTenants,
      { excludeTenantId: tenant?.id }
    );
  }, [formData.adminUsername, allUsers, allPosPoints, allTenants, tenant?.id]);

  const handleAutoGenerateAdminUsername = () => {
    const base = formData.name ? 'admin_' + formData.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) : 'admin_net';
    const suggestions = generateAlternativeUsernames(base, allUsers, allPosPoints, allTenants);
    const chosen = suggestions[0] || `${base}_${Date.now().toString().slice(-4)}`;
    setFormData((prev) => ({
      ...prev,
      adminUsername: chosen,
    }));
  };

  // Module toggle handler
  const handleToggleModule = (moduleId: TenantAllowedModule) => {
    setFormData((prev) => {
      const currentAllowed = prev.allowedModules || [...ALL_TENANT_MODULES];
      let nextAllowed: TenantAllowedModule[];
      if (currentAllowed.includes(moduleId)) {
        nextAllowed = currentAllowed.filter((id) => id !== moduleId);
      } else {
        nextAllowed = [...currentAllowed, moduleId];
      }
      return {
        ...prev,
        accessMode: 'custom',
        allowedModules: nextAllowed,
      };
    });
  };

  // Apply preset package
  const handleApplyPreset = (modules: TenantAllowedModule[]) => {
    setFormData((prev) => ({
      ...prev,
      accessMode: modules.length >= ALL_TENANT_MODULES.length ? 'all' : 'custom',
      allowedModules: [...modules],
    }));
  };

  // Select / Deselect All
  const handleSelectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      accessMode: 'all',
      allowedModules: [...ALL_TENANT_MODULES],
    }));
  };

  const handleDeselectAllModules = () => {
    setFormData((prev) => ({
      ...prev,
      accessMode: 'custom',
      allowedModules: ['invoices'], // Keep at least one basic view
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (formData.name || '').trim();
    const cleanAdminUsername = (formData.adminUsername || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanId = (formData.id || `net-${Date.now().toString().slice(-6)}`).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `net-${Date.now()}`;
    
    if (!cleanName || !cleanAdminUsername) return;
    if (!usernameValidation.isValid && !tenant) return;

    const mergedSettings: NetworkSettings = {
      ...defaultNetworkSettings,
      ...(formData.settings || {}),
      networkName: cleanName,
    };

    const finalAllowedModules = formData.accessMode === 'all'
      ? [...ALL_TENANT_MODULES]
      : (formData.allowedModules && formData.allowedModules.length > 0 ? formData.allowedModules : ['invoices']);

    onSave({
      ...formData,
      id: cleanId,
      name: cleanName,
      adminUsername: cleanAdminUsername,
      accessMode: formData.accessMode || 'all',
      allowedModules: finalAllowedModules,
      settings: mergedSettings,
    } as NetworkTenant);
  };

  // Filter modules for custom selection
  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return TENANT_AVAILABLE_MODULES;
    const q = moduleSearch.trim().toLowerCase();
    return TENANT_AVAILABLE_MODULES.filter(
      (m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    );
  }, [moduleSearch]);

  const allowedCount = formData.allowedModules?.length || 0;
  const totalModulesCount = ALL_TENANT_MODULES.length;
  const allowedPercentage = Math.round((allowedCount / totalModulesCount) * 100);

  const renderModuleIcon = (iconName: string, className: string = 'w-5 h-5') => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className={className} />;
      case 'FileText': return <FileText className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'Receipt': return <Receipt className={className} />;
      case 'DollarSign': return <DollarSign className={className} />;
      case 'Store': return <Store className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'ExternalLink': return <ExternalLink className={className} />;
      case 'Settings': return <Settings className={className} />;
      case 'Database': return <Database className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      default: return <Layers className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{tenant ? `إدارة شبكة: ${tenant.name}` : 'إضافة شبكة جديدة وتخصيص بيئتها'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                التحكم بالصلاحيات، القوائم المتاحة، الحسابات، والاشتراك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>البيانات الأساسية والاشتراك</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap relative ${
              activeTab === 'permissions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>صلاحيات وقوائم مدير الشبكة</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
              {formData.accessMode === 'all' ? 'الكل (13)' : `${allowedCount}/13`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>هوية وإعدادات الشبكة</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TAB 1: BASIC INFO & SUBSCRIPTION */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-3.5 h-3.5" />
                  <span>معلومات تعريف الشبكة والمدير</span>
                </h4>

                <div>
                  <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                    اسم الشبكة (Tenant Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        settings: { ...formData.settings!, networkName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="مثال: شبكة الفضاء اللاسلكية"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      معرف الشبكة (Network ID) <span className="text-slate-500 text-[11px] font-normal">- إنجليزي فريد</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!tenant}
                      value={formData.id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50 text-left text-sm"
                      dir="ltr"
                      placeholder="e.g. net-alnoor"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-300 text-xs sm:text-sm font-bold">
                        اسم مستخدم المدير (Super Admin) <span className="text-rose-500">*</span>
                      </label>
                      {!tenant && (
                        <button
                          type="button"
                          onClick={handleAutoGenerateAdminUsername}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>توليد تلقائي</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      disabled={!!tenant}
                      value={formData.adminUsername || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50 text-left text-sm"
                      dir="ltr"
                      placeholder="e.g. admin_alnoor"
                    />
                    {!tenant && formData.adminUsername && (
                      <p className={`text-[11px] mt-1 font-medium ${usernameValidation.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {usernameValidation.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                    كلمة المرور لمدير الشبكة
                    {tenant && <span className="text-slate-500 text-xs font-normal mr-2">- اتركها فارغة للإبقاء على الحالية</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!tenant}
                      value={formData.adminPassword || ''}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-left text-sm pr-10"
                      dir="ltr"
                      placeholder={tenant ? '••••••••' : 'e.g. Pass@123456'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscription & Operational Status */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>حالة التشغيل والاشتراك السحابي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      حالة التشغيل:
                    </label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="active">🟢 نشط (Active)</option>
                      <option value="suspended">🔴 موقوف مؤقتاً (Suspended)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      باقة الاشتراك:
                    </label>
                    <select
                      value={formData.subscriptionPlan || 'monthly'}
                      onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="monthly">شهري</option>
                      <option value="yearly">سنوي</option>
                      <option value="lifetime">مدى الحياة</option>
                      <option value="custom">مخصص</option>
                    </select>
                  </div>

                  {formData.subscriptionPlan !== 'lifetime' && (
                    <div>
                      <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                        تاريخ انتهاء الاشتراك:
                      </label>
                      <input
                        type="date"
                        value={formData.subscriptionEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                    ملاحظات إدارية خاصة بالمالك (اختياري):
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="ملاحظات حول اتفاقية الشبكة أو أرقام التواصل أو متطلبات خاصة..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS & ALLOWED MENUS */}
          {activeTab === 'permissions' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Access Mode Selector Card */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white">
                      صلاحيات وقوائم مدير الشبكة وبيئتها الخاصة
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      بصفتك <strong>مالك النظام</strong>، يمكنك تحديد هل مدير هذه الشبكة ومستخدميه يمتلكون جميع القوائم والواجهات، أو واجهات مخصصة حسب طلبه واشتراكه. البيئة ستكون معزولة ومضبوطة 100%.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        accessMode: 'all',
                        allowedModules: [...ALL_TENANT_MODULES],
                      }));
                    }}
                    className={`cursor-pointer rounded-xl p-3.5 border transition flex items-start gap-3 ${
                      formData.accessMode === 'all'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessMode"
                      checked={formData.accessMode === 'all'}
                      onChange={() => {}}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                        <span>🌟 جميع القوائم والواجهات (Full Access)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        تفعيل كافة الـ 13 قائمة والواجهات المتقدمة لمدير الشبكة بدون أي قيود.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        accessMode: 'custom',
                      }));
                    }}
                    className={`cursor-pointer rounded-xl p-3.5 border transition flex items-start gap-3 ${
                      formData.accessMode === 'custom'
                        ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessMode"
                      checked={formData.accessMode === 'custom'}
                      onChange={() => {}}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-black flex items-center gap-1.5 text-amber-300">
                        <span>⚡ قوائم مخصصة حسب طلب الشبكة (Custom)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        تحديد واجهات محددة لمدير الشبكة، وحجب بقية الأقسام والواجهات تماماً.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Quick Presets Bar */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>نماذج سريعة بضغطة زر (Quick Presets):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20"
                    >
                      تحديد الكل ({totalModulesCount})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllModules}
                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {TENANT_PRESET_PACKAGES.map((preset) => {
                    const isCurrent =
                      formData.allowedModules?.length === preset.modules.length &&
                      preset.modules.every((m) => formData.allowedModules?.includes(m));

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.modules)}
                        className={`text-right p-2.5 rounded-xl border text-xs font-bold transition flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-black text-white text-[12px]">{preset.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                            {preset.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 line-clamp-1">{preset.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Count & Progress Bar */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black font-mono">
                    {allowedCount}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">
                      تم تفعيل <span className="text-indigo-400 font-mono font-black">{allowedCount}</span> من أصل <span className="font-mono font-black">{totalModulesCount}</span> واجهة لمدير الشبكة
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {formData.accessMode === 'all'
                        ? 'الوضع الحالي: شامل لكافة القوائم'
                        : `الوضع الحالي: مخصص بنسبة ${allowedPercentage}%`}
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${allowedPercentage}%` }}
                  />
                </div>
              </div>

              {/* Granular Module Checkboxes Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>قائمة واجهات وأقسام النظام المتوفرة:</span>
                  </h4>
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="بحث في القوائم..."
                    className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {filteredModules.map((module) => {
                    const isAllowed = formData.allowedModules?.includes(module.id);

                    return (
                      <div
                        key={module.id}
                        onClick={() => handleToggleModule(module.id)}
                        className={`cursor-pointer p-3 rounded-xl border transition flex items-start gap-3 select-none ${
                          isAllowed
                            ? 'bg-slate-900/90 border-indigo-500/40 text-white shadow-xs'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60 hover:opacity-100 hover:border-slate-700'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isAllowed ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600 shrink-0" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`p-1 rounded-md ${module.bgLight} ${module.color}`}>
                                {renderModuleIcon(module.iconName, 'w-3.5 h-3.5')}
                              </span>
                              <span className={`text-xs font-bold ${isAllowed ? 'text-white' : 'text-slate-400'}`}>
                                {module.title}
                              </span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {module.category === 'core' ? 'أساسي' : module.category === 'operations' ? 'تشغيلي' : module.category === 'technical' ? 'تقني' : 'إداري'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NETWORK SETTINGS & BRANDING */}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>تخصيص هوية وبيانات الشبكة</span>
                </h4>

                <div>
                  <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                    شعار الشبكة الترويجي (Slogan):
                  </label>
                  <input
                    type="text"
                    value={formData.settings?.networkSlogan || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings!, networkSlogan: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="مثال: أسرع إنترنت لاسلكي في منطقتك"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      العملة المستخدمة:
                    </label>
                    <select
                      value={formData.settings?.currency || 'YER'}
                      onChange={(e) => {
                        const cur = e.target.value;
                        const symbol = cur === 'YER' ? 'ر.ي' : cur === 'SAR' ? 'ر.س' : '$';
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings!, currency: cur, currencySymbol: symbol },
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="YER">ريال يمني (YER - ر.ي)</option>
                      <option value="SAR">ريال سعودي (SAR - ر.س)</option>
                      <option value="USD">دولار أمريكي (USD - $)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      رمز العملة المختصر:
                    </label>
                    <input
                      type="text"
                      value={formData.settings?.currencySymbol || 'ر.ي'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings!, currencySymbol: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      رابط صفحة تسجيل دخول الهوتسبوت (DNS):
                    </label>
                    <input
                      type="text"
                      value={formData.settings?.hotspotDns || 'wifi.net'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings!, hotspotDns: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-left text-sm"
                      dir="ltr"
                      placeholder="wifi.net"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs sm:text-sm font-bold mb-1.5">
                      هاتف الدعم الفني:
                    </label>
                    <input
                      type="text"
                      value={formData.settings?.supportPhone || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings!, supportPhone: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-left text-sm"
                      dir="ltr"
                      placeholder="770123456"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 hidden sm:block">
              {formData.accessMode === 'all' ? (
                <span className="text-emerald-400 font-bold">✓ وضع الصلاحيات: جميع القوائم (شامل)</span>
              ) : (
                <span className="text-amber-400 font-bold">⚡ وضع الصلاحيات: مخصص ({allowedCount} قائمة مفعلة)</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!usernameValidation.isValid && !tenant}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/25"
              >
                <Save className="w-4 h-4" />
                <span>حفظ بيانات الشبكة والصلاحيات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
