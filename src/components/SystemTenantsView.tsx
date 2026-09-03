import React, { useState } from 'react';
import {
  Server,
  Plus,
  Network,
  CheckCircle,
  ShieldAlert,
  Trash2,
  LogIn,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { NetworkTenant, AppUser, POSPoint } from '../types';
import { SystemTenantModal } from './SystemTenantModal';

interface SystemTenantsViewProps {
  tenants: NetworkTenant[];
  users: AppUser[];
  posPoints?: POSPoint[];
  onSaveTenant?: (tenant: NetworkTenant) => void;
  onDeleteTenant?: (tenantId: string) => void;
  onSwitchToTenantAdmin?: (tenant: NetworkTenant) => void;
}

export const SystemTenantsView: React.FC<SystemTenantsViewProps> = ({
  tenants,
  users,
  posPoints = [],
  onSaveTenant,
  onDeleteTenant,
  onSwitchToTenantAdmin,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<NetworkTenant | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'info' | 'permissions' | 'settings'>('info');
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<NetworkTenant | null>(null);

  const handleOpenModal = (tenant: NetworkTenant | null = null, tab: 'info' | 'permissions' | 'settings' = 'info') => {
    setEditingTenant(tenant);
    setModalInitialTab(tab);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
  };

  const handleSave = (tenant: NetworkTenant) => {
    if (onSaveTenant) {
      onSaveTenant(tenant);
    }
    handleCloseModal();
  };

  const fullAccessTenantsCount = tenants.filter(
    (t) => t.accessMode === 'all' || !t.allowedModules || t.allowedModules.length >= 13
  ).length;
  const customAccessTenantsCount = tenants.length - fullAccessTenantsCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {isModalOpen && (
        <SystemTenantModal
          tenant={editingTenant}
          initialTab={modalInitialTab}
          allUsers={users}
          allPosPoints={posPoints}
          allTenants={tenants}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}
      
      {deleteConfirmTenant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">حذف الشبكة</h3>
                <p className="text-sm text-slate-400 mt-1">هل أنت متأكد من رغبتك في حذف شبكة "{deleteConfirmTenant.name}"؟</p>
              </div>
            </div>
            
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-rose-400 font-bold flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>تحذير: سيتم حذف جميع حسابات المستخدمين المرتبطة بهذه الشبكة بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmTenant(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onDeleteTenant?.(deleteConfirmTenant.id);
                  setDeleteConfirmTenant(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-600/20"
              >
                نعم، احذف الشبكة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-indigo-400" />
            <span>إدارة شبكات النظام (SaaS Multi-Tenancy)</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            إضافة الشبكات، تعيين المدراء، وتخصيص الصلاحيات والقوائم لكل شبكة ومستخدميها في بيئة مستقلة 100%
          </p>
        </div>
        <button
          onClick={() => handleOpenModal(null, 'info')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة شبكة جديدة</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">إجمالي الشبكات المسجلة</p>
            <p className="text-2xl font-black text-white">{tenants.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">شبكات بكامل القوائم (شامل)</p>
            <p className="text-2xl font-black text-emerald-400">{fullAccessTenantsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">شبكات بقوائم مخصصة</p>
            <p className="text-2xl font-black text-amber-400">{customAccessTenantsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">إجمالي المستخدمين (كل البيئات)</p>
            <p className="text-2xl font-black text-white">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800/60 text-slate-300 text-xs font-bold">
                <th className="p-4">الشبكة</th>
                <th className="p-4">مدير الشبكة</th>
                <th className="p-4">القوائم والواجهات المعتمدة</th>
                <th className="p-4">طاقم المستخدمين</th>
                <th className="p-4">الاشتراك والمدة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات والوصول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {tenants.map((tenant) => {
                const tenantUsersCount = users.filter((u) => (u.networkId || 'net-microsys') === tenant.id).length;
                
                // Calculate subscription status
                let subscriptionText = '';
                let subscriptionColor = 'text-slate-400';
                let isExpired = false;
                
                if (tenant.subscriptionPlan === 'lifetime') {
                  subscriptionText = 'مدى الحياة';
                  subscriptionColor = 'text-indigo-400 font-bold';
                } else if (tenant.subscriptionEndDate) {
                  const endDate = new Date(tenant.subscriptionEndDate);
                  const now = new Date();
                  const diffTime = endDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays < 0) {
                    subscriptionText = `منتهي منذ ${Math.abs(diffDays)} يوم`;
                    subscriptionColor = 'text-rose-400 font-bold';
                    isExpired = true;
                  } else if (diffDays <= 7) {
                    subscriptionText = `باقي ${diffDays} أيام`;
                    subscriptionColor = 'text-amber-400 font-bold';
                  } else {
                    subscriptionText = `باقي ${diffDays} يوم`;
                    subscriptionColor = 'text-emerald-400';
                  }
                } else {
                  subscriptionText = 'غير محدد';
                }

                const isFullAccess = tenant.accessMode === 'all' || !tenant.allowedModules || tenant.allowedModules.length >= 13;
                const allowedCount = tenant.allowedModules?.length || 13;

                return (
                  <tr key={tenant.id} className={`hover:bg-slate-800/30 transition text-sm ${isExpired ? 'bg-rose-950/10' : ''}`}>
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{tenant.name}</span>
                        {(tenant.id === 'net-microsys' || tenant.id === tenants[0]?.id) && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                            الرئيسية
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                            منتهي الصلاحية
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{tenant.id}</div>
                    </td>
                    <td className="p-4 font-mono text-indigo-400">@{tenant.adminUsername}</td>
                    
                    {/* Allowed Menus & Permissions Column */}
                    <td className="p-4">
                      {isFullAccess ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/25">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>جميع القوائم (شامل 13)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/25">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                            <span>قوائم مخصصة ({allowedCount} من 13)</span>
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{tenantUsersCount} مستخدم</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-slate-300">
                          {tenant.subscriptionPlan === 'yearly' ? 'سنوي' : 
                           tenant.subscriptionPlan === 'monthly' ? 'شهري' : 
                           tenant.subscriptionPlan === 'lifetime' ? 'مدى الحياة' :
                           tenant.subscriptionPlan === 'custom' ? 'مخصص' : 'تلقائي'}
                        </span>
                        <span className={`text-xs ${subscriptionColor}`}>
                          {subscriptionText}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        tenant.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {tenant.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {onSwitchToTenantAdmin && (
                          <button
                            onClick={() => onSwitchToTenantAdmin(tenant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-bold transition border border-indigo-500/30"
                            title={`الدخول مباشرة بحساب مدير شبكة ${tenant.name}`}
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>دخول</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(tenant, 'permissions')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-bold transition border border-indigo-500/25"
                          title="تعديل صلاحيات وقوائم مدير الشبكة"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>الصلاحيات</span>
                        </button>
                        <button 
                          onClick={() => handleOpenModal(tenant, 'info')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
                        >
                          إدارة
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmTenant(tenant)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition border border-rose-500/20"
                          title="حذف الشبكة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                        <Server className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">النظام جاهز ونظيف - لا توجد شبكات حالياً</h4>
                      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        أنت الآن مسجل كـ <strong>الماستر (مالك النظام)</strong>. يمكنك البدء بإضافة الشبكات وتحديد الصلاحيات والقوائم لكل مدير شبكة حسب طلبه، ليعمل كل مدير ومستخدميه في بيئتهم المعزولة الخاصة.
                      </p>
                      <button
                        onClick={() => handleOpenModal(null, 'info')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/25"
                      >
                        <Plus className="w-5 h-5" />
                        <span>إضافة أول شبكة الآن</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
