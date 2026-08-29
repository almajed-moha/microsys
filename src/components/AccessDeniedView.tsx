import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  UserCheck,
  LogIn,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { AppUser } from '../types';
import {
  ROLE_DEFINITIONS,
  getDefaultLandingViewForUser,
  getViewNameArabic,
  hasPermission,
} from '../utils/permissions';
import { NavView } from './Sidebar';

interface AccessDeniedViewProps {
  activeUser: AppUser;
  attemptedView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenLogin: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  activeUser,
  attemptedView,
  onNavigate,
  onOpenLogin,
}) => {
  const roleMeta = ROLE_DEFINITIONS[activeUser.role] || ROLE_DEFINITIONS.custom;
  const targetViewName = getViewNameArabic(attemptedView);
  const homeView = getDefaultLandingViewForUser(activeUser);
  const homeViewName = getViewNameArabic(homeView);

  // List of permitted modules for this user
  const permittedViews: Array<{ id: NavView; name: string }> = [
    { id: 'dashboard', name: 'لوحة التحكم' },
    { id: 'invoices', name: 'الفواتير والمبيعات' },
    { id: 'expenses', name: 'المصروفات' },
    { id: 'payments', name: 'سندات القبض' },
    { id: 'pos', name: 'نقاط التوزيع' },
    { id: 'categories', name: 'فئات الكروت' },
    { id: 'mikrotik', name: 'المايكروتك' },
    { id: 'users', name: 'المستخدمين والصلاحيات' },
  ].filter((v) => {
    const modMap: Record<string, any> = {
      dashboard: 'dashboard',
      invoices: 'invoices',
      expenses: 'expenses',
      payments: 'payments',
      pos: 'pos',
      categories: 'categories',
      mikrotik: 'mikrotik',
      users: 'usersAndPermissions',
    };
    return hasPermission(activeUser, modMap[v.id], 'view');
  }) as Array<{ id: NavView; name: string }>;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
          عذراً، لا تمتلك صلاحية الوصول لهذه الشاشة
        </h2>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          تم تقييد الوصول إلى <span className="text-white font-bold">({targetViewName})</span> لحسابك الحالي، حيث أن دورك مسجل كـ{' '}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs border ${roleMeta.bgLight} ${roleMeta.color} ${roleMeta.borderLight}`}>
            {activeUser.customRoleName || roleMeta.badge}
          </span>.
        </p>

        {/* User Card info */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-6 text-right space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl ${activeUser.avatarBgColor || 'bg-slate-800'} flex items-center justify-center text-sm shadow-xs`}>
                {activeUser.avatar || '👤'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{activeUser.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">@{activeUser.username}</p>
              </div>
            </div>
            <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>مقيّد</span>
            </span>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 font-medium mb-1.5">الأقسام المتاحة لحسابك حالياً:</p>
            <div className="flex flex-wrap gap-1.5">
              {permittedViews.map((pv) => (
                <button
                  key={pv.id}
                  onClick={() => onNavigate(pv.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{pv.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onNavigate(homeView)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الانتقال لشاشتك الرئيسية ({homeViewName})</span>
          </button>

          <button
            onClick={onOpenLogin}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-purple-400" />
            <span>تسجيل الدخول بحساب آخر</span>
          </button>
        </div>
      </div>
    </div>
  );
};
