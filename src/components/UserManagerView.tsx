import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Server,
  Users,
  Layers,
  Zap,
  Radio,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  RotateCcw,
  Copy,
  Check,
  Download,
  Printer,
  FileCode,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  HardDrive,
  DollarSign,
  Cpu,
  Activity,
  Terminal,
  FileSpreadsheet,
  Network,
  Info,
  CheckCircle2,
  XCircle,
  QrCode
} from 'lucide-react';
import {
  NetworkSettings,
  MikroTikConfig,
  UserManagerUser,
  UserManagerProfile,
  UserManagerLimitation,
  UserManagerRouter,
  CardCategory
} from '../types';
import {
  fetchUserManagerUsers,
  fetchUserManagerProfiles,
  fetchUserManagerLimitations,
  fetchUserManagerRouters,
  createUserManagerBatchCards,
  saveUserManagerProfileAndLimitation,
  deleteUserManagerUser,
  resetUserManagerUserCounters,
  generateUserManagerBatchRscScript,
  formatBytesToHuman
} from '../utils/mikrotikApi';
import { exportElementToPdf } from '../utils/pdfExport';

interface UserManagerViewProps {
  settings: NetworkSettings;
  config: MikroTikConfig;
  categories?: CardCategory[];
  onRefreshParent?: () => void;
}

export const UserManagerView: React.FC<UserManagerViewProps> = ({
  settings,
  config,
  categories = [],
  onRefreshParent,
}) => {
  // Navigation tabs inside User Manager
  const [activeTab, setActiveTab] = useState<'users' | 'profiles' | 'batch' | 'routers' | 'script'>('users');

  // Live Data State
  const [users, setUsers] = useState<UserManagerUser[]>([]);
  const [profiles, setProfiles] = useState<UserManagerProfile[]>([]);
  const [limitations, setLimitations] = useState<UserManagerLimitation[]>([]);
  const [routers, setRouters] = useState<UserManagerRouter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Actions Loading State
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    profileName: 'UM-Profile-500',
    limitationName: 'UM-Lim-500',
    nameForUsers: 'كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)',
    price: 500,
    validityDays: 3,
    uptimeLimit: '1d',
    quotaLimit: '3500M',
    rateLimit: '6M/3M',
    startsAt: 'logon',
    routerOsVersion: (config.routerOsVersion?.startsWith('7') ? 'v7' : 'v7') as 'v6' | 'v7',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Batch Generator State
  const [batchCount, setBatchCount] = useState<number>(30);
  const [batchPrefix, setBatchPrefix] = useState<string>('u');
  const [batchProfile, setBatchProfile] = useState<string>('');
  const [batchPasswordMode, setBatchPasswordMode] = useState<'pin_numeric' | 'user_equals_pass' | 'random_str'>('pin_numeric');
  const [batchCustomer, setBatchCustomer] = useState<string>('admin');
  const [batchSerialStart, setBatchSerialStart] = useState<number>(1001);
  const [isSyncingBatch, setIsSyncingBatch] = useState(false);
  const [batchOutcome, setBatchOutcome] = useState<{ success: boolean; message: string } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Fetch all User Manager data from router
  const fetchAllUMData = async () => {
    setIsLoading(true);
    try {
      const [uList, pList, lList, rList] = await Promise.all([
        fetchUserManagerUsers(config),
        fetchUserManagerProfiles(config),
        fetchUserManagerLimitations(config),
        fetchUserManagerRouters(config),
      ]);

      setUsers(uList || []);
      setProfiles(pList || []);
      setLimitations(lList || []);
      setRouters(rList || []);
      setLastRefreshed(new Date().toLocaleTimeString('ar-YE'));

      if (pList && pList.length > 0 && !batchProfile) {
        setBatchProfile(pList[0].name);
      }
    } catch (err) {
      console.error('Error fetching User Manager data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUMData();
  }, [config.host, config.port, config.username, config.password]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle password display
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Delete User Voucher
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف كارت (${userName}) نهائياً من User Manager؟`)) return;

    setIsDeletingUser(true);
    const ok = await deleteUserManagerUser(config, userId);
    setIsDeletingUser(false);

    if (ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId && u.name !== userName));
      setActionFeedback({ success: true, message: `تم حذف الكارت (${userName}) من اليوزر مانجر بنجاح.` });
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      setActionFeedback({ success: false, message: 'تعذر حذف الكارت من الراوتر.' });
    }
  };

  // Reset User Counters
  const handleResetCounters = async (userId: string, userName: string) => {
    const ok = await resetUserManagerUserCounters(config, userId);
    if (ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId || u.name === userName
            ? { ...u, uptimeUsed: '0s', downloadUsed: 0, uploadUsed: 0, totalBytes: 0 }
            : u
        )
      );
      setActionFeedback({ success: true, message: `تم تصفير عدادات استهلاك الكارت (${userName}) بنجاح.` });
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      setActionFeedback({ success: false, message: 'تعذر تصفير عدادات الكارت.' });
    }
  };

  // Save / Add Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormData.profileName) return;

    setIsSavingProfile(true);
    const res = await saveUserManagerProfileAndLimitation(config, profileFormData);
    setIsSavingProfile(false);

    if (res.success) {
      setShowProfileModal(false);
      setActionFeedback({ success: true, message: res.message || 'تم حفظ البروفايل بنجاح في الراوتر.' });
      setTimeout(() => setActionFeedback(null), 4000);
      fetchAllUMData();
    } else {
      setActionFeedback({ success: false, message: res.message || 'تعذر حفظ البروفايل في الراوتر.' });
    }
  };

  // Generated preview cards for Batch Voucher Generator
  const previewBatchCards = useMemo(() => {
    const list: Array<{ username: string; pin: string; profile: string; serial: number }> = [];
    const count = Math.min(Math.max(1, batchCount), 500);

    for (let i = 0; i < count; i++) {
      const serialNum = batchSerialStart + i;
      let username = '';
      let pin = '';

      if (batchPasswordMode === 'pin_numeric') {
        const rand = Math.floor(1000 + Math.random() * 9000);
        username = `${batchPrefix}${serialNum}`;
        pin = String(rand);
      } else if (batchPasswordMode === 'user_equals_pass') {
        const rand = Math.floor(100000 + Math.random() * 900000);
        username = `${batchPrefix}${rand}`;
        pin = username;
      } else {
        const randUser = Math.floor(1000 + Math.random() * 9000);
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let randPin = '';
        for (let j = 0; j < 5; j++) {
          randPin += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        username = `${batchPrefix}${randUser}`;
        pin = randPin;
      }

      list.push({
        username,
        pin,
        profile: batchProfile || profiles[0]?.name || 'default',
        serial: serialNum,
      });
    }

    return list;
  }, [batchCount, batchPrefix, batchProfile, batchPasswordMode, batchSerialStart, profiles]);

  // Sync Generated Batch directly to User Manager
  const handleSyncBatchToRouter = async () => {
    setIsSyncingBatch(true);
    setBatchOutcome(null);

    const formattedCards = previewBatchCards.map((c) => ({
      username: c.username,
      password: c.pin,
      profile: c.profile,
      customer: batchCustomer || 'admin',
      comment: `UM Batch - ${new Date().toISOString().split('T')[0]}`,
    }));

    const res = await createUserManagerBatchCards(config, formattedCards);
    setIsSyncingBatch(false);

    if (res.success) {
      setBatchOutcome({
        success: true,
        message: `تم بنجاح إنشاء وتفعيل ${res.createdCount} كارت في قاعدة بيانات User Manager بالراوتر (${config.host})!`,
      });
      setBatchSerialStart((prev) => prev + batchCount);
      fetchAllUMData();
    } else {
      setBatchOutcome({
        success: false,
        message: res.errors?.join('\n') || 'تعذر إرسال الكروت إلى User Manager.',
      });
    }
  };

  // Download .rsc script for Batch
  const handleDownloadBatchRsc = () => {
    const script = generateUserManagerBatchRscScript(
      batchProfile || profiles[0]?.name || 'default',
      previewBatchCards,
      profileFormData.routerOsVersion,
      batchCustomer || 'admin'
    );

    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_manager_batch_${previewBatchCards.length}_${batchProfile || 'cards'}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Printable PDF Card Sheet
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportElementToPdf('um-print-sheet', {
        filename: `كروت_يوزر_مانجر_${batchProfile || 'cards'}_${previewBatchCards.length}.pdf`,
        orientation: 'portrait',
        format: 'a4',
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        (u.comment && u.comment.toLowerCase().includes(q)) ||
        (u.actualProfile && u.actualProfile.toLowerCase().includes(q));
      const matchesProfile = profileFilter === 'all' || u.actualProfile === profileFilter;
      return matchesSearch && matchesProfile;
    });
  }, [users, userSearch, profileFilter]);

  // Aggregate stats
  const totalUMBytesUsed = users.reduce((acc, u) => acc + (u.totalBytes || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-slate-900/95 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-24 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 border border-purple-500/40 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 flex-shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-black text-white">إدارة نظام اليوزر مانجر (MikroTik User Manager)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  RADIUS & UM Suite
                </span>
                {lastRefreshed && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    آخر تحديث: {lastRefreshed}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                الوصول الكامل لقاعدة بيانات اليوزر مانجر: استعراض وحذف الكروت، إنشاء البروفايلات وقيود السرعة، توليد دفعات الكروت وطباعتها فوراً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => {
                setShowProfileModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بروفايل UM</span>
            </button>

            <button
              onClick={fetchAllUMData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">كروت ومستخدمي UM</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{users.length}</span>
            <span className="text-xs text-slate-400">كارت مسجل</span>
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">بروفايلات السرعة</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{profiles.length}</span>
            <span className="text-xs text-slate-400">بروفايل متاح</span>
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">قيود الاستهلاك (Limits)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{limitations.length}</span>
            <span className="text-xs text-slate-400">قيد محدد</span>
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">إجمالي الاستهلاك المسجل</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono text-cyan-400">
              {formatBytesToHuman(totalUMBytesUsed)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionFeedback.success
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Tabs Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>كروت وقسائم اليوزر مانجر ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'profiles'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>بروفايلات وقيود السرعة ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'batch'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>توليد ومزامنة وطباعة الكروت</span>
        </button>

        <button
          onClick={() => setActiveTab('routers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'routers'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-cyan-400" />
          <span>أجهزة الـ RADIUS والراوتر ({routers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'script'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>سكربت التثبيت والإعداد الشامل</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER MANAGER USERS / VOUCHERS */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="بحث باسم الكارت، البروفايل، أو الملاحظة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="all">كافة البروفايلات</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('batch')}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>توليد كروت جديدة</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-3.5">اسم الكارت (Username)</th>
                    <th className="p-3.5">كلمة المرور / PIN</th>
                    <th className="p-3.5">البروفايل</th>
                    <th className="p-3.5">الوقت المستهلك / المحدد</th>
                    <th className="p-3.5">البيانات المستهلكة</th>
                    <th className="p-3.5">المالك / الملاحظات</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                            <span>جارِ جلب الكروت من User Manager بالراوتر...</span>
                          </div>
                        ) : (
                          'لم يتم العثور على أي كروت تطابق معايير البحث.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        {/* Username */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{u.name}</span>
                            <button
                              onClick={() => handleCopy(u.name, `name-${u.id}`)}
                              className="p-1 rounded text-slate-500 hover:text-white"
                              title="نسخ اسم الكارت"
                            >
                              {copiedId === `name-${u.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Password */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-purple-300 font-semibold">
                              {visiblePasswords[u.id] ? u.password || 'لا يوجد' : '••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1 rounded text-slate-500 hover:text-white"
                            >
                              {visiblePasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {u.password && (
                              <button
                                onClick={() => handleCopy(u.password || '', `pass-${u.id}`)}
                                className="p-1 rounded text-slate-500 hover:text-white"
                                title="نسخ كلمة المرور"
                              >
                                {copiedId === `pass-${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Profile */}
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono font-medium border border-indigo-500/20">
                            {u.actualProfile || 'default'}
                          </span>
                        </td>

                        {/* Uptime */}
                        <td className="p-3.5 font-mono text-slate-300">
                          <div>
                            <span className="font-bold">{u.uptimeUsed || '0s'}</span>
                            {u.limitUptime && (
                              <span className="text-slate-500 text-[10px] block">
                                حد أقصى: {u.limitUptime}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Data Download / Upload */}
                        <td className="p-3.5 font-mono text-slate-300">
                          <div>
                            <span className="font-bold text-emerald-400">
                              {formatBytesToHuman(u.totalBytes || 0)}
                            </span>
                            {u.limitBytesTotal && u.limitBytesTotal > 0 ? (
                              <span className="text-slate-500 text-[10px] block">
                                من {formatBytesToHuman(u.limitBytesTotal)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Customer / Comment */}
                        <td className="p-3.5 text-slate-400 text-xs">
                          <div>
                            <span className="font-medium text-slate-300">{u.customer || 'admin'}</span>
                            {u.comment && <p className="text-[11px] text-slate-500 mt-0.5">{u.comment}</p>}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          {u.disabled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              معطل (Disabled)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              نشط (Active)
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleResetCounters(u.id, u.name)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition text-xs"
                              title="تصفير عدادات الاستهلاك للكارت"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={isDeletingUser}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition text-xs"
                              title="حذف الكارت نهائياً من الراوتر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILES & LIMITATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Header & Add Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>بروفايلات وقواعد اليوزر مانجر (User Manager Profiles & Limitations)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديد سرعات التنزيل والرفع، فترات الصلاحية بالأيام، وأسعار البيع.
              </p>
            </div>

            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بروفايل وقيد جديد</span>
            </button>
          </div>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((prof) => (
              <div
                key={prof.id}
                className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{prof.name}</h4>
                      <p className="text-[11px] text-slate-400">{prof.nameForUsers || prof.name}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                    {prof.price ? `${prof.price} ${settings.currencySymbol}` : 'مجاني'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>صلاحية الكارت (Validity):</span>
                    </span>
                    <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {prof.validity || 'غير محدد'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">بدء الصلاحية (Starts At):</span>
                    <span className="font-mono text-slate-300">{prof.startsAt || 'logon'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">مشاركة الأجهزة (Shared):</span>
                    <span className="font-mono text-slate-300">{prof.overrideSharedUsers || 1} جهاز</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Limitations Section */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>قيود السرعة والرصيد المرتبطة (User Manager Limitations)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {limitations.map((lim) => (
                <div key={lim.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-cyan-400 flex items-center justify-between">
                    <span>{lim.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div>السرعة: {lim.rateLimitTx || 'مفتوح'} / {lim.rateLimitRx || 'مفتوح'}</div>
                    <div>وقت الاستخدام: {lim.uptimeLimit || 'مفتوح'}</div>
                    <div>حجم التحميل: {lim.downloadLimit || 'مفتوح'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BATCH VOUCHER GENERATOR & PRINTING */}
      {/* ========================================================================= */}
      {activeTab === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form */}
          <div className="lg:col-span-5 bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">إعدادات دفعة كروت اليوزر مانجر</h4>
                <p className="text-xs text-slate-400">توليد الكروت ومزامنتها مع الراوتر وطباعتها بنقرة واحدة</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Profile Select */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">اختر البروفايل المطلوب:</label>
                <select
                  value={batchProfile}
                  onChange={(e) => setBatchProfile(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.nameForUsers || p.name}) {p.price ? `- ${p.price} ${settings.currencySymbol}` : ''}
                    </option>
                  ))}
                  {profiles.length === 0 && <option value="default">default</option>}
                </select>
              </div>

              {/* Count & Prefix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">عدد الكروت:</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">بادئة الاسم (Prefix):</label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="مثال: um"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Password Mode */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">نمط كلمة المرور (PIN):</label>
                <select
                  value={batchPasswordMode}
                  onChange={(e) => setBatchPasswordMode(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="pin_numeric">أرقام سرية عشوائية (4 أرقام PIN)</option>
                  <option value="user_equals_pass">اسم المستخدم هو نفس كلمة المرور</option>
                  <option value="random_str">حروف وأرقام عشوائية مميزة</option>
                </select>
              </div>

              {/* Serial Start & Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">بداية التسلسل:</label>
                  <input
                    type="number"
                    value={batchSerialStart}
                    onChange={(e) => setBatchSerialStart(parseInt(e.target.value) || 1000)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">مالك الحساب (Customer):</label>
                  <input
                    type="text"
                    value={batchCustomer}
                    onChange={(e) => setBatchCustomer(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Execution Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={handleSyncBatchToRouter}
                disabled={isSyncingBatch}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
              >
                {isSyncingBatch ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>1-Click: إنشاء وتفعيل الكروت في User Manager بالراوتر</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isExportingPdf ? 'جارِ التصدير...' : 'طباعة الكروت (PDF)'}</span>
                </button>

                <button
                  onClick={handleDownloadBatchRsc}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تحميل سكربت (.rsc)</span>
                </button>
              </div>
            </div>

            {batchOutcome && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  batchOutcome.success
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {batchOutcome.message}
              </div>
            )}
          </div>

          {/* Printable Sheet Preview */}
          <div className="lg:col-span-7 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-xs flex items-center gap-2">
                <Printer className="w-4 h-4 text-purple-400" />
                <span>معاينة ورقة طباعة كروت اليوزر مانجر ({previewBatchCards.length} كارت)</span>
              </span>
              <span className="text-[11px] text-slate-400">مقاس A4 قياسي</span>
            </div>

            <div
              id="um-print-sheet"
              ref={printAreaRef}
              className="bg-white text-slate-900 p-4 rounded-2xl overflow-y-auto max-h-[600px] grid grid-cols-2 sm:grid-cols-3 gap-3 shadow-inner"
              style={{ direction: 'rtl' }}
            >
              {previewBatchCards.map((card, idx) => (
                <div
                  key={idx}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-purple-50/40"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                    <span className="font-black text-[11px] text-purple-900 truncate">
                      {settings.networkName || 'شبكة الواي فاي'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      {card.profile}
                    </span>
                  </div>

                  <div className="space-y-1 my-1">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[9px] text-slate-500 block">اسم المستخدم</span>
                      <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                        {card.username}
                      </span>
                    </div>

                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="text-[9px] text-slate-500 block">كلمة المرور</span>
                      <span className="font-mono font-black text-xs text-purple-700 tracking-wider">
                        {card.pin}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-200 text-[8px] text-slate-500 flex items-center justify-between">
                    <span>تسجيل الدخول: {settings.hotspotDns || 'net.wifi'}</span>
                    <span className="font-mono">#{card.serial}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ROUTERS & RADIUS NAS */}
      {/* ========================================================================= */}
      {activeTab === 'routers' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>أجهزة التوجيه والـ RADIUS المربوطة باليوزر مانجر (User Manager Routers)</span>
            </h4>
            <p className="text-xs text-slate-400">
              تسمح هذه الإعدادات لخدمات الهوتسبوت (Hotspot) والـ PPPoE في الراوتر بالتحقق من صحة الكروت عبر سيرفر RADIUS المحلي لليوزر مانجر.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routers.map((r) => (
              <div key={r.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{r.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">IP: {r.ipAddress}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    مفعل (Active)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">الرمز السري (Secret):</span>
                    <span>{r.sharedSecret}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Radius Hotspot Link Script */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>أمر ربط الهوتسبوت بسيرفر اليوزر مانجر RADIUS فوراً:</span>
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    `/radius add service=hotspot address=127.0.0.1 secret=123456 comment="UM-RADIUS"\n/ip hotspot profile set [find] use-radius=yes`,
                    'radius-script'
                  )
                }
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-purple-400 flex items-center gap-1 transition"
              >
                {copiedId === 'radius-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>نسخ الأمر</span>
              </button>
            </div>

            <pre className="bg-slate-900 p-3.5 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
{`/radius add service=hotspot address=127.0.0.1 secret=123456 comment="UM-RADIUS"
/ip hotspot profile set [find] use-radius=yes radius-accounting=yes`}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COMPREHENSIVE INITIAL SETUP SCRIPT */}
      {/* ========================================================================= */}
      {activeTab === 'script' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>سكربت تهيئة وتفعيل User Manager الكامل على المايكروتك</span>
            </h4>
            <p className="text-xs text-slate-400">
              انسخ السكربت والصقه في New Terminal لتهيئة حزمة User Manager وضبط RADIUS وإنشاء العميل الافتراضي.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* RouterOS v7 Script */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">إصدار RouterOS v7 (الحديث)</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `/user-manager router add name=LocalRouter address=127.0.0.1 shared-secret=123456\n/user-manager user add name=admin password=admin\n/radius add service=hotspot address=127.0.0.1 secret=123456\n/ip hotspot profile set [find] use-radius=yes radius-accounting=yes`,
                      'v7-setup'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-purple-400 flex items-center gap-1 transition"
                >
                  {copiedId === 'v7-setup' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ السكربت</span>
                </button>
              </div>

              <pre className="bg-slate-900 p-3.5 rounded-xl font-mono text-[11px] text-emerald-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`# RouterOS v7 User Manager Complete Setup
/user-manager router
add name=LocalRouter address=127.0.0.1 shared-secret=123456

/radius
add service=hotspot address=127.0.0.1 secret=123456 comment="UMv7"

/ip hotspot profile
set [find] use-radius=yes radius-accounting=yes`}
              </pre>
            </div>

            {/* RouterOS v6 Script */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">إصدار RouterOS v6 / v5 / v4</span>
                <button
                  onClick={() =>
                    handleCopy(
                      `/tool user-manager customer add login=admin password=admin permissions=owner\n/tool user-manager router add name=LocalRouter ip-address=127.0.0.1 shared-secret=123456 customer=admin\n/radius add service=hotspot address=127.0.0.1 secret=123456\n/ip hotspot profile set [find] use-radius=yes radius-accounting=yes`,
                      'v6-setup'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-purple-400 flex items-center gap-1 transition"
                >
                  {copiedId === 'v6-setup' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ السكربت</span>
                </button>
              </div>

              <pre className="bg-slate-900 p-3.5 rounded-xl font-mono text-[11px] text-emerald-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`# RouterOS v6 User Manager Complete Setup
/tool user-manager customer
add login=admin password=admin permissions=owner

/tool user-manager router
add name=LocalRouter ip-address=127.0.0.1 shared-secret=123456 customer=admin

/radius
add service=hotspot address=127.0.0.1 secret=123456 comment="UMv6"

/ip hotspot profile
set [find] use-radius=yes radius-accounting=yes`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT USER MANAGER PROFILE */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto"
            style={{ direction: 'rtl' }}
          >
            <div className="sticky top-0 z-20 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-950/95 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إضافة وتفعيل بروفايل في User Manager</h3>
                  <p className="text-xs text-slate-400">إنشاء البروفايل وربط القيد (Limitation) وتطبيقه على الراوتر</p>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">اسم البروفايل (Profile Name):</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.profileName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, profileName: e.target.value })}
                      placeholder="UM-Profile-500"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">اسم القيد (Limitation Name):</label>
                    <input
                      type="text"
                      required
                      value={profileFormData.limitationName}
                      onChange={(e) => setProfileFormData({ ...profileFormData, limitationName: e.target.value })}
                      placeholder="UM-Lim-500"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الاسم الظاهر للمستخدم (Name for users):</label>
                  <input
                    type="text"
                    required
                    value={profileFormData.nameForUsers}
                    onChange={(e) => setProfileFormData({ ...profileFormData, nameForUsers: e.target.value })}
                    placeholder="كارت 500 ريال (يومي 24 ساعة / 3.5 جيجا)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">وقت الاستخدام:</label>
                    <input
                      type="text"
                      value={profileFormData.uptimeLimit}
                      onChange={(e) => setProfileFormData({ ...profileFormData, uptimeLimit: e.target.value })}
                      placeholder="1d, 3h, 7d"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">حجم البيانات:</label>
                    <input
                      type="text"
                      value={profileFormData.quotaLimit}
                      onChange={(e) => setProfileFormData({ ...profileFormData, quotaLimit: e.target.value })}
                      placeholder="3500M, 8G"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">السرعة (Down/Up):</label>
                    <input
                      type="text"
                      value={profileFormData.rateLimit}
                      onChange={(e) => setProfileFormData({ ...profileFormData, rateLimit: e.target.value })}
                      placeholder="6M/3M"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">
                      سعر البيع ({settings.currencySymbol}):
                    </label>
                    <input
                      type="number"
                      value={profileFormData.price}
                      onChange={(e) => setProfileFormData({ ...profileFormData, price: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الصلاحية (بالأيام):</label>
                    <input
                      type="number"
                      value={profileFormData.validityDays}
                      onChange={(e) => setProfileFormData({ ...profileFormData, validityDays: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/95">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSavingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>حفظ وتطبيق البروفايل في الراوتر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
