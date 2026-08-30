import React, { useState, useEffect, useMemo } from 'react';
import { Server, Save, X, Sparkles } from 'lucide-react';
import { NetworkTenant, NetworkSettings, AppUser, POSPoint } from '../types';
import { defaultNetworkSettings } from '../mockData';
import { checkUsernameAvailability, generateAlternativeUsernames } from '../utils/usernameValidator';
import { UsernameAvailabilityIndicator } from './UsernameAvailabilityIndicator';

interface SystemTenantModalProps {
  tenant: NetworkTenant | null;
  allUsers?: AppUser[];
  allPosPoints?: POSPoint[];
  allTenants?: NetworkTenant[];
  onSave: (tenant: NetworkTenant) => void;
  onClose: () => void;
}

export const SystemTenantModal: React.FC<SystemTenantModalProps> = ({
  tenant,
  allUsers = [],
  allPosPoints = [],
  allTenants = [],
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Partial<NetworkTenant> & { adminPassword?: string }>({
    id: '',
    name: '',
    adminUsername: '',
    status: 'active',
    createdAt: new Date().toISOString().split('T')[0],
    settings: {
      ...defaultNetworkSettings,
      networkName: '',
      networkSlogan: 'خدمات الإنترنت والشبكات اللاسلكية',
      currency: 'YER',
      currencySymbol: 'ر.ي',
    }
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        ...tenant,
        settings: {
          ...defaultNetworkSettings,
          ...(tenant.settings || {}),
          networkName: tenant.settings?.networkName || tenant.name,
        }
      });
    } else {
      setFormData({
        id: `net-${Date.now().toString().slice(-6)}`,
        name: '',
        adminUsername: '',
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        settings: {
          ...defaultNetworkSettings,
          networkName: '',
          networkSlogan: 'خدمات الإنترنت والشبكات اللاسلكية',
          currency: 'YER',
          currencySymbol: 'ر.ي',
        }
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

    onSave({
      ...formData,
      id: cleanId,
      name: cleanName,
      adminUsername: cleanAdminUsername,
      settings: mergedSettings,
    } as NetworkTenant);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <span>{tenant ? 'تعديل بيانات الشبكة' : 'إضافة شبكة جديدة'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1.5">
              اسم الشبكة (Tenant Name):
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value, settings: { ...formData.settings!, networkName: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="مثال: شبكة الفضاء اللاسلكية"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1.5">
              معرف الشبكة (ID) <span className="text-slate-500 text-xs font-normal">- يجب أن يكون فريداً وبالإنجليزية</span>
            </label>
            <input
              type="text"
              required
              disabled={!!tenant}
              value={formData.id || ''}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50 text-left"
              dir="ltr"
              placeholder="e.g. net-alnoor"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 text-sm font-bold">
                اسم مستخدم المدير (Super Admin Username) <span className="text-rose-500">*</span>
              </label>
              {!tenant && (
                <button
                  type="button"
                  onClick={handleAutoGenerateAdminUsername}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>توليد فريد</span>
                </button>
              )}
            </div>
            <input
              type="text"
              required
              disabled={!!tenant}
              value={formData.adminUsername || ''}
              onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white focus:outline-none font-mono disabled:opacity-50 text-left ${
                usernameValidation.status === 'taken'
                  ? 'border-rose-500 focus:border-rose-500'
                  : usernameValidation.status === 'available'
                  ? 'border-emerald-500 focus:border-emerald-500'
                  : 'border-slate-800 focus:border-indigo-500'
              }`}
              dir="ltr"
              placeholder="e.g. admin_alfadaa"
            />

            {!tenant && (
              <UsernameAvailabilityIndicator
                validation={usernameValidation}
                onSelectSuggestion={(sug) => setFormData({ ...formData, adminUsername: sug })}
              />
            )}
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1.5">
              كلمة المرور لمدير الشبكة
              {tenant && <span className="text-slate-500 text-xs font-normal mr-2">- اترك الحقل فارغاً إذا كنت لا ترغب بتغييرها</span>}
            </label>
            <input
              type="text"
              required={!tenant}
              value={formData.adminPassword || ''}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-left"
              dir="ltr"
              placeholder={tenant ? "********" : "e.g. adminpassword"}
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1.5">
              حالة التشغيل:
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="active">نشط (Active)</option>
              <option value="suspended">موقوف (Suspended)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-bold mb-1.5">
                نوع الاشتراك:
              </label>
              <select
                value={formData.subscriptionPlan || 'monthly'}
                onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
                <option value="custom">مخصص</option>
                <option value="lifetime">مدى الحياة</option>
              </select>
            </div>
            
            {formData.subscriptionPlan !== 'lifetime' && (
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-1.5">
                  تاريخ الانتهاء:
                </label>
                <input
                  type="date"
                  value={formData.subscriptionEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!usernameValidation.isValid && !tenant}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition shadow-lg shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>حفظ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
