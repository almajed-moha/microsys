import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  Truck,
  Receipt,
  Activity,
  Eye,
  Settings,
  LayoutDashboard,
  FileText,
  Store,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Copy,
  Download,
  LogIn,
  RotateCcw,
  HelpCircle,
  Info,
  BadgePercent,
  Check,
  X,
} from 'lucide-react';
import { AppUser, UserRole, UserPermissions, UserActivityLog, NetworkSettings, POSPoint, NetworkTenant } from '../types';
import {
  ROLE_DEFINITIONS,
  PERMISSION_MODULES_CONFIG,
  getRoleDefaultPermissions,
  createFullPermissions,
  createEmptyPermissions,
  countPermissions,
  hasPermission,
  RoleMeta,
  PermissionModuleMeta,
} from '../utils/permissions';
import { exportToCSV } from '../utils/storage';
import { AuditLogView } from './AuditLogView';
import { checkUsernameAvailability, generateAlternativeUsernames } from '../utils/usernameValidator';
import { UsernameAvailabilityIndicator } from './UsernameAvailabilityIndicator';

interface UsersAndPermissionsViewProps {
  users: AppUser[];
  activeUser: AppUser;
  activityLogs?: UserActivityLog[];
  settings?: NetworkSettings;
  allUsers?: AppUser[];
  posPoints?: POSPoint[];
  tenants?: NetworkTenant[];
  onAddUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchActiveUser: (user: AppUser) => void;
  onOpenLoginView?: (targetUser?: AppUser) => void;
  onClearLogs?: () => void;
}

export const UsersAndPermissionsView: React.FC<UsersAndPermissionsViewProps> = ({
  users,
  activeUser,
  activityLogs = [],
  settings,
  allUsers,
  posPoints = [],
  tenants = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchActiveUser,
  onOpenLoginView,
  onClearLogs,
}) => {
  // Main Section Navigation Tab ('users' | 'audit_log' | 'roles_matrix')
  const [activeSectionTab, setActiveSectionTab] = useState<'users' | 'audit_log' | 'roles_matrix'>('users');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isRoleComparisonOpen, setIsRoleComparisonOpen] = useState(false);
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  // Form State inside Modal
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('accountant');
  const [formCustomRoleName, setFormCustomRoleName] = useState('');
  const [formAvatar, setFormAvatar] = useState('💼');
  const [formAvatarBg, setFormAvatarBg] = useState('bg-indigo-600');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [formMaxDiscount, setFormMaxDiscount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(() =>
    getRoleDefaultPermissions('accountant')
  );
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'templates' | 'permissions'>('info');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    dashboard: true,
    invoices: true,
    expenses: false,
    payments: false,
    pos: false,
    categories: false,
    mikrotik: false,
    usersAndPermissions: false,
    settings: false,
  });

  // Effective full user list for cross-tenant validation
  const effectiveAllUsers = allUsers || users;

  // Real-time username availability validation
  const usernameValidation = useMemo(() => {
    if (!formUsername.trim()) {
      return {
        status: 'empty' as const,
        isValid: false,
        message: 'أدخل اسم مستخدم فريد للدخول',
        suggestedUsernames: [],
      };
    }
    return checkUsernameAvailability(
      formUsername,
      effectiveAllUsers,
      posPoints,
      tenants,
      { excludeUserId: editingUser?.id }
    );
  }, [formUsername, effectiveAllUsers, posPoints, tenants, editingUser?.id]);

  const handleAutoGenerateUserUsername = () => {
    const rolePrefix = formRole === 'super_admin' ? 'admin' : formRole.replace('_', '');
    const cleanName = formName ? formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 8) : rolePrefix;
    const base = cleanName ? `${cleanName}_${rolePrefix}` : rolePrefix;
    const suggestions = generateAlternativeUsernames(base, effectiveAllUsers, posPoints, tenants);
    const chosen = suggestions[0] || `${rolePrefix}_${Date.now().toString().slice(-4)}`;
    setFormUsername(chosen);
  };

  // Switch User PIN prompt
  const [switchTargetUser, setSwitchTargetUser] = useState<AppUser | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Avatars options
  const avatarOptions = [
    { emoji: '👑', label: 'تاج / مدير', bg: 'bg-purple-600' },
    { emoji: '💼', label: 'حقيبة / محاسب', bg: 'bg-indigo-600' },
    { emoji: '🚚', label: 'شاحنة / مندوب', bg: 'bg-cyan-600' },
    { emoji: '🏪', label: 'متجر / كاشير', bg: 'bg-emerald-600' },
    { emoji: '🌐', label: 'شبكة / مهندس', bg: 'bg-blue-600' },
    { emoji: '👁️', label: 'عين / مراقب', bg: 'bg-amber-600' },
    { emoji: '⚡', label: 'طاقة / فني', bg: 'bg-rose-600' },
    { emoji: '🛡️', label: 'درع / أمان', bg: 'bg-slate-700' },
  ];

  // Open modal for new user
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('123456');
    setFormPinCode('1234');
    setFormEmail('');
    setFormPhone('');
    setFormRole('accountant');
    setFormCustomRoleName('');
    setFormAvatar('💼');
    setFormAvatarBg('bg-indigo-600');
    setFormStatus('active');
    setFormMaxDiscount(0);
    setFormNotes('');
    setFormPermissions(getRoleDefaultPermissions('accountant'));
    setActiveFormTab('info');
    setIsFormModalOpen(true);
  };

  // Open modal for edit user
  const handleOpenEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormPassword(user.password || '');
    setFormPinCode(user.pinCode || '');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormRole(user.role);
    setFormCustomRoleName(user.customRoleName || '');
    setFormAvatar(user.avatar || '👤');
    setFormAvatarBg(user.avatarBgColor || 'bg-slate-700');
    setFormStatus(user.status);
    setFormMaxDiscount(user.maxDiscountPercent || 0);
    setFormNotes(user.notes || '');
    setFormPermissions(JSON.parse(JSON.stringify(user.permissions)));
    setActiveFormTab('info');
    setIsFormModalOpen(true);
  };

  // Apply Role Template inside Form
  const handleApplyRoleTemplate = (role: UserRole) => {
    setFormRole(role);
    const templatePerms = getRoleDefaultPermissions(role);
    setFormPermissions(JSON.parse(JSON.stringify(templatePerms)));

    // Suggest matching avatar
    const roleMeta = ROLE_DEFINITIONS[role];
    if (roleMeta) {
      if (role === 'super_admin') {
        setFormAvatar('👑');
        setFormAvatarBg('bg-purple-600');
      } else if (role === 'accountant') {
        setFormAvatar('💼');
        setFormAvatarBg('bg-indigo-600');
      } else if (role === 'sales_agent') {
        setFormAvatar('🚚');
        setFormAvatarBg('bg-cyan-600');
      } else if (role === 'cashier') {
        setFormAvatar('🏪');
        setFormAvatarBg('bg-emerald-600');
      } else if (role === 'network_admin') {
        setFormAvatar('🌐');
        setFormAvatarBg('bg-blue-600');
      } else if (role === 'viewer') {
        setFormAvatar('👁️');
        setFormAvatarBg('bg-amber-600');
      }
    }
  };

  // Toggle specific field permission
  const handleToggleFieldPermission = (moduleId: keyof UserPermissions, fieldKey: string) => {
    setFormPermissions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const currentModule = next[moduleId] || {};
      const currentVal = Boolean(currentModule[fieldKey]);
      currentModule[fieldKey] = !currentVal;

      // If enabling a sub-feature, ensure the module 'view' is also enabled
      if (!currentVal && fieldKey !== 'view') {
        currentModule.view = true;
      }
      next[moduleId] = currentModule;
      return next;
    });
    setFormRole('custom'); // Mark as custom if manually altered
  };

  // Toggle entire module
  const handleToggleModuleAll = (moduleId: keyof UserPermissions, enable: boolean) => {
    setFormPermissions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const moduleConfig = PERMISSION_MODULES_CONFIG.find((m) => m.moduleId === moduleId);
      if (!moduleConfig) return prev;

      const currentModule = next[moduleId] || {};
      moduleConfig.fields.forEach((field) => {
        currentModule[field.key] = enable;
      });
      next[moduleId] = currentModule;
      return next;
    });
    setFormRole('custom');
  };

  // Toggle expand/collapse of module card in permissions tab
  const handleToggleExpandModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Save user submit
  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUsername.trim()) return;
    if (!usernameValidation.isValid) return;

    const targetNetworkId = editingUser?.networkId || (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : 'net-microsys');

    const userData: Omit<AppUser, 'id' | 'createdAt'> = {
      name: formName.trim(),
      username: formUsername.trim().toLowerCase(),
      networkId: targetNetworkId,
      password: formPassword.trim() || undefined,
      pinCode: formPinCode.trim() || undefined,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      role: formRole,
      customRoleName: formCustomRoleName.trim() || ROLE_DEFINITIONS[formRole]?.badge || 'مستخدم',
      avatar: formAvatar,
      avatarBgColor: formAvatarBg,
      status: formStatus,
      permissions: formPermissions,
      maxDiscountPercent: Number(formMaxDiscount) || 0,
      notes: formNotes.trim() || undefined,
      lastLogin: editingUser?.lastLogin,
    };

    if (editingUser) {
      onUpdateUser({
        ...userData,
        networkId: editingUser.networkId || targetNetworkId,
        id: editingUser.id,
        createdAt: editingUser.createdAt,
      });
    } else {
      onAddUser(userData);
    }

    setIsFormModalOpen(false);
  };

  // Copy Permissions from another user
  const handleCopyPermissionsFromUser = (sourceUser: AppUser) => {
    setFormPermissions(JSON.parse(JSON.stringify(sourceUser.permissions)));
    setFormRole(sourceUser.role);
    setCopySuccessId(sourceUser.id);
    setTimeout(() => setCopySuccessId(null), 2000);
  };

  // Execute fast switch or open dedicated login portal
  const handleExecuteSwitchUser = (targetUser: AppUser) => {
    if (targetUser.id === activeUser.id) {
      setIsSwitchUserModalOpen(false);
      return;
    }

    if (onOpenLoginView) {
      setIsSwitchUserModalOpen(false);
      onOpenLoginView(targetUser);
      return;
    }

    // If user has a pin code and we are not super_admin or switching to non-admin
    if (targetUser.pinCode && activeUser.role !== 'super_admin') {
      setSwitchTargetUser(targetUser);
      setEnteredPin('');
      setPinError('');
      return;
    }

    // Direct switch
    onSwitchActiveUser(targetUser);
    setIsSwitchUserModalOpen(false);
    setSwitchTargetUser(null);
  };

  const handleVerifyPinAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!switchTargetUser) return;

    if (switchTargetUser.pinCode && enteredPin !== switchTargetUser.pinCode) {
      setPinError('رمز PIN غير صحيح! يرجى المحاولة مجدداً.');
      return;
    }

    onSwitchActiveUser(switchTargetUser);
    setIsSwitchUserModalOpen(false);
    setSwitchTargetUser(null);
    setPinError('');
  };

  // Export users to CSV
  const handleExportUsers = () => {
    const data = users.map((u) => {
      const stats = countPermissions(u.permissions);
      return {
        'الاسم الكامل': u.name,
        'اسم المستخدم': u.username,
        'الدور الرئيسي': ROLE_DEFINITIONS[u.role]?.title || u.role,
        'المسمى الوظيفي': u.customRoleName || '-',
        'رقم الهاتف': u.phone || '-',
        'البريد الإلكتروني': u.email || '-',
        'الحالة': u.status === 'active' ? 'نشط' : u.status === 'suspended' ? 'مجمد' : 'معطل',
        'عدد الصلاحيات الممنوحة': `${stats.granted} من ${stats.total} (${stats.percentage}%)`,
        'رمز PIN': u.pinCode ? 'مفعل' : 'غير مفعل',
        'تاريخ الإنشاء': u.createdAt,
        'آخر تسجيل دخول': u.lastLogin || '-',
      };
    });
    exportToCSV(data, 'مستخدمي_وصلاحيات_شبكة_الفضاء.csv');
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm)) ||
        (u.customRoleName && u.customRoleName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Overall stats
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const superAdminsCount = users.filter((u) => u.role === 'super_admin').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  إدارة المستخدمين والصلاحيات الدقيقة (RBAC)
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {totalUsersCount} مستخدمين
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                تحديد مستويات الوصول لكل شاشة، صلاحيات الفروع الفرعية، حجب أسعار التكلفة والأرباح، وتخصيص أدوار موظفي الشبكة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setActiveSectionTab('audit_log')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                activeSectionTab === 'audit_log'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>سجل النشاط (Audit Log)</span>
              {activityLogs.length > 0 && (
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {activityLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsRoleComparisonOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition shadow-xs"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>دليل مقارنة الأدوار</span>
            </button>

            <button
              onClick={handleExportUsers}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition shadow-xs"
              title="تصدير بيانات المستخدمين والصلاحيات"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير كشف المستخدمين</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">إجمالي المستخدمين</p>
              <p className="text-base sm:text-lg font-black text-white font-mono">{totalUsersCount}</p>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">المستخدمون النشطون</p>
              <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">{activeUsersCount}</p>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">حسابات الإدارة العليا</p>
              <p className="text-base sm:text-lg font-black text-purple-400 font-mono">{superAdminsCount}</p>
            </div>
          </div>

          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">سجلات العمليات الموثقة</p>
              <p className="text-base sm:text-lg font-black text-cyan-400 font-mono">{activityLogs.length} عملية</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSectionTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeSectionTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون والصلاحيات ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSectionTab('audit_log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeSectionTab === 'audit_log'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>سجل النشاط والعمليات (Audit Log)</span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-mono">
            {activityLogs.length}
          </span>
        </button>

        <button
          onClick={() => setIsRoleComparisonOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>دليل ومصفوفة مقارنة الأدوار</span>
        </button>
      </div>

      {/* 3. Conditional Render: Users List OR Audit Log */}
      {activeSectionTab === 'audit_log' ? (
        <AuditLogView
          activityLogs={activityLogs}
          users={users}
          activeUser={activeUser}
          settings={settings}
          tenants={tenants}
          allUsers={allUsers}
          onClearLogs={onClearLogs}
        />
      ) : (
        <>
          {/* Active User Simulator Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl ${activeUser.avatarBgColor || 'bg-purple-600'} flex items-center justify-center text-2xl shadow-md border border-white/10 shrink-0`}>
                {activeUser.avatar || '👑'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">أنت تتصفح النظام حالياً بحساب:</span>
                  <span className="font-black text-white text-sm sm:text-base">{activeUser.name}</span>
                  <span className="text-xs text-slate-400 font-mono">(@{activeUser.username})</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${ROLE_DEFINITIONS[activeUser.role]?.bgLight || 'bg-slate-800'} ${ROLE_DEFINITIONS[activeUser.role]?.color || 'text-slate-300'} ${ROLE_DEFINITIONS[activeUser.role]?.borderLight || 'border-slate-700'}`}>
                    {activeUser.customRoleName || ROLE_DEFINITIONS[activeUser.role]?.badge || 'مستخدم'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeUser.role === 'super_admin'
                    ? 'تمتلك صلاحيات كاملة. يمكنك التبديل لأي مستخدم آخر لاختبار كيف تظهر الشاشات والصلاحيات الحقيقية له!'
                    : `صلاحيات محددة: ${countPermissions(activeUser.permissions).granted} من ${countPermissions(activeUser.permissions).total} صلاحية.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              {activeUser.role !== 'super_admin' && (
                <button
                  onClick={() => {
                    const superAdminUser = users.find((u) => u.role === 'super_admin');
                    if (superAdminUser) onSwitchActiveUser(superAdminUser);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition"
                  title="العودة لحساب المدير العام فورياً"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>العودة للمدير العام</span>
                </button>
              )}

              <button
                onClick={() => (onOpenLoginView ? onOpenLoginView() : setIsSwitchUserModalOpen(true))}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition shadow-xs hover:scale-105 active:scale-95"
                title="فتح بوابة تسجيل الدخول المباشرة والانتقال حسب الصلاحيات"
              >
                <LogIn className="w-4 h-4 text-indigo-400" />
                <span>بوابة تسجيل الدخول وتبديل المستخدم</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالاسم، اسم المستخدم، الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>الدور:</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">كافة الأدوار ({users.length})</option>
                <option value="super_admin">المدير العام</option>
                <option value="accountant">المحاسب المالي</option>
                <option value="sales_agent">مندوب التوزيع</option>
                <option value="cashier">أمين الصندوق</option>
                <option value="network_admin">مسؤول الشبكات</option>
                <option value="viewer">مراقب ومدقق</option>
                <option value="custom">مخصص</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="all">كافة الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">معطل</option>
                <option value="suspended">مجمد</option>
              </select>
            </div>
          </div>

      {/* 4. Users Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {filteredUsers.map((user) => {
          const permStats = countPermissions(user.permissions);
          const roleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.custom;
          const isActive = user.id === activeUser.id;

          return (
            <div
              key={user.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl relative overflow-hidden ${
                isActive
                  ? 'border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Active Indicator Banner */}
              {isActive && (
                <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-[10px] font-black py-0.5 text-center tracking-wider uppercase">
                  الحساب النشط حالياً في جلستك
                </div>
              )}

              <div>
                {/* User Header */}
                <div className={`flex items-start justify-between gap-3 ${isActive ? 'mt-2' : ''}`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`w-13 h-13 rounded-2xl ${user.avatarBgColor || 'bg-slate-800'} flex items-center justify-center text-2xl shadow-md border border-white/10 shrink-0`}>
                      {user.avatar || '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base tracking-tight">{user.name}</h3>
                        {user.status === 'active' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="حساب نشط" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-rose-400" title="حساب معطل أو مجمد" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">@{user.username}</p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border ${roleMeta.bgLight} ${roleMeta.color} ${roleMeta.borderLight}`}>
                    {user.customRoleName || roleMeta.badge}
                  </span>
                </div>

                {/* User Info Items */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                  {user.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>الهاتف:</span>
                      </span>
                      <span className="font-mono text-slate-200">{user.phone}</span>
                    </div>
                  )}

                  {user.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>البريد:</span>
                      </span>
                      <span className="text-slate-200 truncate max-w-[170px]">{user.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>رمز PIN السريع:</span>
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                      {user.pinCode ? '••••' : 'غير محدد'}
                    </span>
                  </div>

                  {user.maxDiscountPercent ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BadgePercent className="w-3.5 h-3.5 text-slate-500" />
                        <span>سقف الخصم:</span>
                      </span>
                      <span className="font-bold text-amber-400">{user.maxDiscountPercent}%</span>
                    </div>
                  ) : null}
                </div>

                {/* Permissions Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-slate-400 font-medium">مستوى الصلاحيات الممنوحة:</span>
                    <span className="font-bold text-indigo-400 font-mono">
                      {permStats.granted} / {permStats.total} ({permStats.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        permStats.percentage >= 90
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                          : permStats.percentage >= 50
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${permStats.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Modules quick icons badge */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {user.permissions?.dashboard?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium" title="لوحة التحكم">
                      لوحة التحكم
                    </span>
                  )}
                  {user.permissions?.invoices?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium" title="الفواتير">
                      الفواتير
                    </span>
                  )}
                  {user.permissions?.expenses?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium" title="المصروفات">
                      المصروفات
                    </span>
                  )}
                  {user.permissions?.payments?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium" title="سندات القبض">
                      سندات القبض
                    </span>
                  )}
                  {user.permissions?.pos?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-medium" title="نقاط البيع">
                      نقاط البيع
                    </span>
                  )}
                  {user.permissions?.categories?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium" title="فئات الكروت">
                      الكروت
                    </span>
                  )}
                  {user.permissions?.mikrotik?.view && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium" title="مايكروتك مباشر">
                      مايكروتك
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="تعديل البيانات وتخصيص الصلاحيات"
                  >
                    <Edit2 className="w-4 h-4 text-indigo-400" />
                  </button>

                  {user.id !== 'user-system-owner' && user.username !== 'master' && (
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition"
                      title="حذف المستخدم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleExecuteSwitchUser(user)}
                  disabled={isActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:scale-105 active:scale-95'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isActive ? 'أنت هنا حالياً' : 'تسجيل دخول وتجربة'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* 5. Comprehensive Add/Edit User Modal with Granular Permission Matrix */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp my-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {editingUser ? `تعديل بيانات وصلاحيات: ${editingUser.name}` : 'إضافة مستخدم جديد وتخصيص الصلاحيات'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    يمكنك تطبيق دور جاهز بنقرة واحدة أو تخصيص كل شاشة وحقل فرعي يدوياً.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 pb-0 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveFormTab('info')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                  activeFormTab === 'info'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>1. البيانات الأساسية والحساب</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('templates')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                  activeFormTab === 'templates'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>2. اختيار قالب الدور السريع</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('permissions')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                  activeFormTab === 'permissions'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>3. مصفوفة الصلاحيات الدقيقة والفروع الفرعية</span>
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {countPermissions(formPermissions).granted}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUserSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: User Info */}
              {activeFormTab === 'info' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        الاسم الكامل للمستخدم <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: عبد الله السعدي"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300">
                          اسم الدخول (Username) <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoGenerateUserUsername}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>توليد اسم فريد</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="مثال: accountant2"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                        className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white font-mono focus:outline-hidden ${
                          usernameValidation.status === 'taken'
                            ? 'border-rose-500 focus:border-rose-500'
                            : usernameValidation.status === 'available'
                            ? 'border-emerald-500 focus:border-emerald-500'
                            : 'border-slate-800 focus:border-indigo-500'
                        }`}
                        dir="ltr"
                      />
                      <UsernameAvailabilityIndicator
                        validation={usernameValidation}
                        onSelectSuggestion={(sug) => setFormUsername(sug)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        كلمة المرور
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        رمز PIN السريع (4-6 أرقام للتبديل السريع)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="1234"
                        value={formPinCode}
                        onChange={(e) => setFormPinCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-hidden focus:border-indigo-500 tracking-widest text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        المسمى الوظيفي المخصص
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: محاسب الفرع الشرقي، مندوب التوزيع"
                        value={formCustomRoleName}
                        onChange={(e) => setFormCustomRoleName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        حالة الحساب
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="active">نشط (Active) - تسجيل دخول مسموح</option>
                        <option value="inactive">معطل (Inactive) - غير متاح</option>
                        <option value="suspended">مجمد مؤقتاً (Suspended)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        رقم الهاتف / واتساب
                      </label>
                      <input
                        type="text"
                        placeholder="770123456"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        type="email"
                        placeholder="user@network.net"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Avatar Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      الأيقونة واللون المميز للمستخدم
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                      {avatarOptions.map((opt) => {
                        const isSelected = formAvatar === opt.emoji && formAvatarBg === opt.bg;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setFormAvatar(opt.emoji);
                              setFormAvatarBg(opt.bg);
                            }}
                            className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition border ${
                              isSelected
                                ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-500/10'
                                : 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl ${opt.bg} flex items-center justify-center text-xl shadow-md`}>
                              {opt.emoji}
                            </div>
                            <span className="text-[10px] text-slate-400 truncate w-full text-center">{opt.label.split(' / ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ملاحظات حول الموظف / المهام الموكلة
                    </label>
                    <textarea
                      rows={2}
                      placeholder="أي تعليمات أو ملاحظات إضافية خاصة بالمستخدم..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Role Templates */}
              {activeFormTab === 'templates' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-indigo-950/40 border border-indigo-800/40 p-4 rounded-2xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      اختر الدور الوظيفي المناسب وسيتم ضبط كافة الصلاحيات الدقيقة تلقائياً. يمكنك لاحقاً تخصيص أي حقل أو فرع فرعي من تبويب "مصفوفة الصلاحيات الدقيقة".
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((roleKey) => {
                      const meta = ROLE_DEFINITIONS[roleKey];
                      const isSelected = formRole === roleKey;

                      return (
                        <div
                          key={roleKey}
                          onClick={() => handleApplyRoleTemplate(roleKey)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${meta.bgLight} ${meta.color} ${meta.borderLight}`}>
                                {meta.title}
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>الصلاحيات الافتراضية:</span>
                            <span className="text-indigo-300 font-bold">
                              {countPermissions(getRoleDefaultPermissions(roleKey)).granted} صلاحية
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Granular Permission Matrix */}
              {activeFormTab === 'permissions' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Quick helper banner */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>إجمالي الصلاحيات المفعلة لهذا المستخدم:</span>
                      <span className="font-black text-indigo-400 font-mono text-sm">
                        {countPermissions(formPermissions).granted} من {countPermissions(formPermissions).total}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setFormPermissions(createFullPermissions());
                          setFormRole('super_admin');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition"
                      >
                        تفعيل الكل (سوبر أدمن)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormPermissions(createEmptyPermissions());
                          setFormRole('custom');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold transition"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  {/* Modules Accordion */}
                  <div className="space-y-3">
                    {PERMISSION_MODULES_CONFIG.map((modConfig) => {
                      const modPerms = formPermissions[modConfig.moduleId] as Record<string, boolean> | undefined;
                      const isModuleViewEnabled = Boolean(modPerms?.view);
                      const isExpanded = expandedModules[modConfig.moduleId] ?? true;

                      // Count active in this module
                      const activeInModule = modConfig.fields.filter((f) => modPerms && modPerms[f.key]).length;

                      return (
                        <div
                          key={modConfig.moduleId}
                          className={`bg-slate-950 border rounded-2xl overflow-hidden transition-all duration-200 ${
                            isModuleViewEnabled ? 'border-slate-800' : 'border-slate-900 opacity-80'
                          }`}
                        >
                          {/* Module Header */}
                          <div className="p-4 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80">
                            <div
                              onClick={() => handleToggleExpandModule(modConfig.moduleId)}
                              className="flex items-center gap-3 cursor-pointer flex-1"
                            >
                              <div className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center ${modConfig.color} shrink-0`}>
                                <Layers className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-white text-sm">{modConfig.title}</h4>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                                    {activeInModule} / {modConfig.fields.length}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400">{modConfig.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              {/* Module View Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleFieldPermission(modConfig.moduleId, 'view')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                                  isModuleViewEnabled
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isModuleViewEnabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                <span>{isModuleViewEnabled ? 'الشاشة مفعلة' : 'الشاشة محجوبة'}</span>
                              </button>

                              {/* Quick All / None for this module */}
                              {isModuleViewEnabled && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll(modConfig.moduleId, true)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                                    title="تفعيل كافة فروع هذا القسم"
                                  >
                                    الكل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll(modConfig.moduleId, false)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold"
                                    title="إلغاء كافة فروع هذا القسم"
                                  >
                                    تصفير
                                  </button>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleExpandModule(modConfig.moduleId)}
                                className="p-1.5 text-slate-400 hover:text-white transition"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Sub-Fields Grid (Grouped by Action Type) */}
                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {[
                                { type: 'read', label: 'قراءة وعرض (Read/View)', color: 'text-indigo-400', border: 'border-indigo-500/20' },
                                { type: 'add', label: 'إضافة وإنشاء (Create/Add)', color: 'text-emerald-400', border: 'border-emerald-500/20' },
                                { type: 'edit', label: 'تعديل ومعالجة (Update/Edit)', color: 'text-amber-400', border: 'border-amber-500/20' },
                                { type: 'delete', label: 'حذف وإلغاء (Delete/Cancel)', color: 'text-rose-400', border: 'border-rose-500/20' },
                                { type: 'special', label: 'صلاحيات أخرى ومتقدمة (Special)', color: 'text-slate-400', border: 'border-slate-800' },
                              ].map(actionGroup => {
                                const groupFields = modConfig.fields.filter(f => f.actionType === actionGroup.type);
                                if (groupFields.length === 0) return null;

                                return (
                                  <div key={actionGroup.type} className="space-y-2.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                                    <h5 className={`text-[11px] font-bold ${actionGroup.color} flex items-center gap-1.5`}>
                                      <div className={`w-1.5 h-1.5 rounded-full bg-current opacity-70`}></div>
                                      {actionGroup.label}
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {groupFields.map((field) => {
                                        const isChecked = Boolean(modPerms && modPerms[field.key]);

                                        return (
                                          <div
                                            key={field.key}
                                            onClick={() => handleToggleFieldPermission(modConfig.moduleId, field.key)}
                                            className={`p-3 rounded-xl border transition-all duration-150 flex items-start justify-between gap-3 cursor-pointer ${
                                              isChecked
                                                ? 'bg-slate-900 border-indigo-500/40 text-white'
                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-200">{field.label}</span>
                                                {field.isDanger && (
                                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold" title="صلاحية مالية أو حساسة">
                                                    حساس
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{field.description}</p>
                                            </div>

                                            {/* Toggle Pill */}
                                            <div
                                              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                                                isChecked ? 'bg-indigo-600' : 'bg-slate-800'
                                              }`}
                                            >
                                              <div
                                                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                                                  isChecked ? 'left-0.5 translate-x-0' : 'right-0.5'
                                                }`}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  <span>الدور الحالي: </span>
                  <span className="font-bold text-indigo-400">{ROLE_DEFINITIONS[formRole]?.title || 'مخصص'}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={!usernameValidation.isValid}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-indigo-600/30"
                  >
                    {editingUser ? 'حفظ التعديلات' : 'إضافة وتثبيت المستخدم'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Switch User / Fast Login Modal */}
      {isSwitchUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">تبديل حساب المستخدم (Simulator)</h3>
                  <p className="text-xs text-slate-400">اختر المستخدم لتجربة الشاشات والصلاحيات فوراً</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSwitchUserModalOpen(false);
                  setSwitchTargetUser(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If PIN prompt is needed */}
            {switchTargetUser ? (
              <form onSubmit={handleVerifyPinAndSwitch} className="space-y-4 pt-2">
                <div className="text-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className={`w-14 h-14 rounded-2xl ${switchTargetUser.avatarBgColor || 'bg-indigo-600'} mx-auto flex items-center justify-center text-3xl mb-2`}>
                    {switchTargetUser.avatar || '👤'}
                  </div>
                  <h4 className="font-black text-white text-base">{switchTargetUser.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">@{switchTargetUser.username}</p>
                  <p className="text-xs text-indigo-300 mt-2 font-medium">
                    يتطلب هذا الحساب إدخال رمز PIN السريع للدخول
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                    أدخل رمز PIN السريع (4 أرقام)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="••••"
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError('');
                    }}
                    className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                  {pinError && <p className="text-xs text-rose-400 text-center mt-1.5 font-bold">{pinError}</p>}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSwitchTargetUser(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                  >
                    تراجع
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
                  >
                    تأكيد والدخول
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pt-2">
                {users.map((u) => {
                  const isCurrent = u.id === activeUser.id;
                  const roleMeta = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.custom;

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleExecuteSwitchUser(u)}
                      className={`p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${u.avatarBgColor || 'bg-slate-800'} flex items-center justify-center text-xl shadow-md shrink-0`}>
                          {u.avatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-black text-white text-xs sm:text-sm">{u.name}</h4>
                            {isCurrent && (
                              <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-bold">
                                أنت هنا
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{u.customRoleName || roleMeta.badge}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {u.pinCode && <KeyRound className="w-3.5 h-3.5 text-slate-500" title="محمي بـ PIN" />}
                        <span className="text-xs text-indigo-400 font-bold">تسجيل دخول ←</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Role Comparison & Permissions Guide Modal */}
      {isRoleComparisonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-scaleUp">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg">دليل ومقارنة أدوار وصلاحيات النظام</h3>
                  <p className="text-xs text-slate-400">مصفوفة توضح الفروقات الأساسية بين القوالب الجاهزة</p>
                </div>
              </div>
              <button
                onClick={() => setIsRoleComparisonOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">الشاشة / الصلاحية</th>
                      <th className="p-3.5 text-center text-purple-400">المدير العام</th>
                      <th className="p-3.5 text-center text-indigo-400">المحاسب المالي</th>
                      <th className="p-3.5 text-center text-cyan-400">مندوب التوزيع</th>
                      <th className="p-3.5 text-center text-emerald-400">أمين الصندوق</th>
                      <th className="p-3.5 text-center text-blue-400">مسؤول الشبكات</th>
                      <th className="p-3.5 text-center text-amber-400">مراقب ومدقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    <tr className="bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">لوحة التحكم وصافي الأرباح</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ كامل</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ كامل</td>
                      <td className="p-3.5 text-center text-rose-400">✖ محجوبة</td>
                      <td className="p-3.5 text-center text-rose-400">✖ محجوبة</td>
                      <td className="p-3.5 text-center text-amber-400">مخططات فقط</td>
                      <td className="p-3.5 text-center text-amber-400">بدون أرباح</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">إصدار فواتير الكروت والمرتجع</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ كامل</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ كامل</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ مبيعات فقط</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ مبيعات فقط</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-amber-400">قراءة فقط</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">رؤية سعر التكلفة وهوامش الربح</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖ حجب كامل</td>
                      <td className="p-3.5 text-center text-rose-400">✖ حجب كامل</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">سندات الصرف والمصروفات</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-amber-400">قراءة فقط</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">سندات القبض وكشوفات الحساب</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-amber-400">قراءة فقط</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">توليد الكروت وسكربتات المايكروتك</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                    </tr>
                    <tr className="bg-slate-900/40">
                      <td className="p-3.5 font-bold text-white">إدارة راوتر المايكروتك وطرد المشتركين</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-emerald-400">✔</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-white">إدارة المستخدمين والصلاحيات</td>
                      <td className="p-3.5 text-center text-emerald-400">✔ كامل</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                      <td className="p-3.5 text-center text-rose-400">✖</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-black text-white text-lg text-center">تأكيد حذف حساب المستخدم</h3>
            <p className="text-xs text-slate-300 text-center mt-2 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف حساب المستخدم <strong className="text-white">"{userToDelete.name}"</strong> (اسم الدخول: @{userToDelete.username})؟ لن يتمكن من تسجيل الدخول بعد الآن.
            </p>

            <div className="flex items-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
