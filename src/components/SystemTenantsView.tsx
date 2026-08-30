import React, { useState } from 'react';
import { Server, Plus, Network, CheckCircle, ShieldAlert, Trash2, LogIn, Users } from 'lucide-react';
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
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<NetworkTenant | null>(null);

  const handleOpenModal = (tenant: NetworkTenant | null = null) => {
    setEditingTenant(tenant);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {isModalOpen && (
        <SystemTenantModal
          tenant={editingTenant}
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
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-indigo-400" />
            <span>إدارة الشبكات (Tenants)</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">
              SaaS Admin
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            إدارة كافة الشبكات المشتركة في النظام السحابي ومراقبة نشاطها.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة شبكة جديدة</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">إجمالي الشبكات</p>
            <p className="text-2xl font-black text-white">{tenants.length}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">الشبكات النشطة</p>
            <p className="text-2xl font-black text-white">
              {tenants.filter(t => t.status === 'active').length}
            </p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold mb-1">إجمالي المستخدمين (كل الشبكات)</p>
            <p className="text-2xl font-black text-white">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800/50 text-slate-300 text-xs font-bold">
                <th className="p-4">الشبكة</th>
                <th className="p-4">مدير الشبكة</th>
                <th className="p-4">المستخدمين المرتبطين</th>
                <th className="p-4">الاشتراك والمدة</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات والوصول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {tenants.map(tenant => {
                const tenantUsersCount = users.filter(u => (u.networkId || 'net-microsys') === tenant.id).length;
                
                // Calculate subscription status
                let subscriptionText = '';
                let subscriptionColor = 'text-slate-400';
                let isExpired = false;
                
                if (tenant.subscriptionPlan === 'lifetime') {
                  subscriptionText = 'مدى الحياة';
                  subscriptionColor = 'text-indigo-400';
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
                            <span>دخول للشبكة</span>
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(tenant)}
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
                  <td colSpan={6} className="p-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                        <Server className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">النظام جاهز ونظيف - لا توجد شبكات حالياً</h4>
                      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        تم تصفير كافة الشبكات بنجاح وأنت الآن مسجل كـ <strong>الماستر (Master)</strong>. يمكنك الآن البدء بإضافة الشبكات وتعيين مدير (Super Admin) لكل شبكة ليباشر إدارة نقاط البيع والبطاقات الخاصة به.
                      </p>
                      <button
                        onClick={() => handleOpenModal()}
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
