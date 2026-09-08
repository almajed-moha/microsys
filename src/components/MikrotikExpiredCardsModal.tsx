import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  Search,
  RefreshCw,
  FileText,
  Printer,
  Download,
  Key,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  HardDrive,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { MikroTikConfig, MikrotikCallerSession, HotspotConfiguredUser } from '../types';
import {
  fetchConfiguredHotspotUsers,
  fetchUserManagerUsers,
  deleteConfiguredHotspotUser,
  deleteConfiguredHotspotUsersBulk,
  deleteUserManagerUser,
} from '../utils/mikrotikApi';
import { printElementDocument, exportElementToPdf } from '../utils/pdfExport';

interface ExpiredCardItem {
  id: string;
  name: string;
  source: 'hotspot' | 'user-manager';
  profile?: string;
  totalLimitBytes?: number;
  totalUsedBytes: number;
  downloadBytes: number;
  uploadBytes: number;
  limitUptime?: string;
  uptimeUsed?: string;
  comment?: string;
  expireReason: 'traffic-limit' | 'uptime-limit' | 'session-expired' | 'manual';
  lastSeen?: string;
}

interface MikrotikExpiredCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Partial<MikroTikConfig>;
  sessions: MikrotikCallerSession[];
  onCardsDeleted?: () => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const MikrotikExpiredCardsModal: React.FC<MikrotikExpiredCardsModalProps> = ({
  isOpen,
  onClose,
  config,
  sessions,
  onCardsDeleted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [expiredCards, setExpiredCards] = useState<ExpiredCardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'hotspot' | 'user-manager'>('all');
  const [reasonFilter, setReasonFilter] = useState<'all' | 'traffic' | 'uptime'>('all');

  // Deletion state
  const [cardToDelete, setCardToDelete] = useState<ExpiredCardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Load expired cards from Router users and caller sessions
  const loadExpiredCards = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const itemsMap = new Map<string, ExpiredCardItem>();

      // 1. Check Configured Hotspot Users from /ip/hotspot/user
      try {
        const hotspotUsers = await fetchConfiguredHotspotUsers(config);
        if (Array.isArray(hotspotUsers)) {
          for (const u of hotspotUsers) {
            const used = (u.bytesIn || 0) + (u.bytesOut || 0);
            const hasQuota = Boolean(u.limitBytesTotal && u.limitBytesTotal > 0);
            const isQuotaExpired = hasQuota && used >= (u.limitBytesTotal || 0);

            // Also check uptime limit if reached
            const hasTimeLimit = Boolean(u.limitUptime && u.limitUptime !== '0s');
            const isTimeExpired = hasTimeLimit && u.uptime && u.uptime === u.limitUptime;

            if (isQuotaExpired || isTimeExpired) {
              itemsMap.set(`hs-${u.name}`, {
                id: u.id || u.name,
                name: u.name,
                source: 'hotspot',
                profile: u.profile,
                totalLimitBytes: u.limitBytesTotal,
                totalUsedBytes: used,
                downloadBytes: u.bytesOut || 0,
                uploadBytes: u.bytesIn || 0,
                limitUptime: u.limitUptime,
                uptimeUsed: u.uptime,
                comment: u.comment,
                expireReason: isQuotaExpired ? 'traffic-limit' : 'uptime-limit',
                lastSeen: undefined,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Hotspot expired check notice:', err);
      }

      // 2. Check User Manager users if available
      try {
        const umUsers = await fetchUserManagerUsers(config);
        if (Array.isArray(umUsers)) {
          for (const u of umUsers) {
            const used = (u.downloadUsed || 0) + (u.uploadUsed || 0) || (u.totalBytes || 0);
            const hasQuota = Boolean(u.limitBytesTotal && u.limitBytesTotal > 0);
            const isQuotaExpired = hasQuota && used >= (u.limitBytesTotal || 0);

            if (isQuotaExpired) {
              itemsMap.set(`um-${u.name}`, {
                id: u.id || u.name,
                name: u.name,
                source: 'user-manager',
                profile: u.actualProfile || u.customer,
                totalLimitBytes: u.limitBytesTotal,
                totalUsedBytes: used,
                downloadBytes: u.downloadUsed || 0,
                uploadBytes: u.uploadUsed || 0,
                limitUptime: u.limitUptime,
                uptimeUsed: u.uptimeUsed,
                comment: u.comment,
                expireReason: 'traffic-limit',
                lastSeen: u.lastSeen,
              });
            }
          }
        }
      } catch (err) {
        console.warn('UM expired check notice:', err);
      }

      // 3. Scan caller sessions for terminated cards with traffic-limit or uptime-limit
      for (const s of sessions) {
        if (!s.isActive) {
          const isTerminatedByQuota =
            s.terminateCause?.includes('traffic') ||
            s.terminateCause?.includes('limit') ||
            s.terminateCause?.includes('quota') ||
            s.terminateCause?.includes('exhausted');
          const isTerminatedByUptime =
            s.terminateCause?.includes('uptime') || s.terminateCause?.includes('session-timeout');

          const key = `${s.source === 'user-manager' ? 'um' : 'hs'}-${s.user}`;
          if (!itemsMap.has(key) && (isTerminatedByQuota || isTerminatedByUptime)) {
            itemsMap.set(key, {
              id: s.id,
              name: s.user,
              source: s.source === 'user-manager' ? 'user-manager' : 'hotspot',
              profile: s.server,
              totalLimitBytes: undefined,
              totalUsedBytes: s.downloadBytes + s.uploadBytes,
              downloadBytes: s.downloadBytes,
              uploadBytes: s.uploadBytes,
              uptimeUsed: s.uptime,
              comment: s.comment,
              expireReason: isTerminatedByQuota ? 'traffic-limit' : 'uptime-limit',
              lastSeen: s.logoutTime || s.loginTime,
            });
          }
        }
      }

      setExpiredCards(Array.from(itemsMap.values()));
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: `تعذر جلب الكروت المنتهية: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExpiredCards();
    }
  }, [isOpen]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return expiredCards.filter((card) => {
      if (sourceFilter !== 'all' && card.source !== sourceFilter) return false;
      if (reasonFilter === 'traffic' && card.expireReason !== 'traffic-limit') return false;
      if (reasonFilter === 'uptime' && card.expireReason !== 'uptime-limit') return false;

      if (searchTerm && searchTerm.trim()) {
        const q = (searchTerm || '').toLowerCase();
        const matchesName = (card.name || '').toLowerCase().includes(q);
        const matchesProfile = (card.profile || '').toLowerCase().includes(q);
        const matchesComment = (card.comment || '').toLowerCase().includes(q);
        return matchesName || matchesProfile || matchesComment;
      }
      return true;
    });
  }, [expiredCards, sourceFilter, reasonFilter, searchTerm]);

  // Total statistics of expired cards
  const stats = useMemo(() => {
    const totalCount = expiredCards.length;
    const totalTraffic = expiredCards.reduce((acc, c) => acc + c.totalUsedBytes, 0);
    const totalDownload = expiredCards.reduce((acc, c) => acc + c.downloadBytes, 0);
    const totalUpload = expiredCards.reduce((acc, c) => acc + c.uploadBytes, 0);
    const hotspotCount = expiredCards.filter((c) => c.source === 'hotspot').length;
    const umCount = expiredCards.filter((c) => c.source === 'user-manager').length;
    return { totalCount, totalTraffic, totalDownload, totalUpload, hotspotCount, umCount };
  }, [expiredCards]);

  // Single card delete
  const handleDeleteCardConfirm = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    setFeedbackMessage(null);

    try {
      let success = false;
      if (cardToDelete.source === 'user-manager') {
        success = await deleteUserManagerUser(config, cardToDelete.name || cardToDelete.id);
      } else {
        success = await deleteConfiguredHotspotUser(config, cardToDelete.id || cardToDelete.name);
      }

      if (success) {
        setExpiredCards((prev) => prev.filter((c) => c.name !== cardToDelete.name));
        setFeedbackMessage({ type: 'success', text: `تم حذف الكارت (${cardToDelete.name}) نهائياً من الراوتر.` });
        setCardToDelete(null);
        if (onCardsDeleted) onCardsDeleted();
      } else {
        setFeedbackMessage({ type: 'error', text: 'تعذر حذف الكارت من الراوتر. تحقق من الصلاحيات والاتصال.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: `خطأ أثناء الحذف: ${err.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete all expired cards
  const handleBulkDeleteExpired = async () => {
    if (expiredCards.length === 0) return;
    setIsDeleting(true);
    setShowBulkDeleteConfirm(false);
    setFeedbackMessage(null);

    try {
      // Collect Hotspot card IDs
      const hotspotIds = expiredCards.filter((c) => c.source === 'hotspot').map((c) => c.id || c.name);
      const umNames = expiredCards.filter((c) => c.source === 'user-manager').map((c) => c.name);

      let deletedTotal = 0;

      if (hotspotIds.length > 0) {
        const hsRes = await deleteConfiguredHotspotUsersBulk(config, hotspotIds);
        if (hsRes.success) deletedTotal += hsRes.deletedCount;
      }

      for (const umUser of umNames) {
        try {
          const ok = await deleteUserManagerUser(config, umUser);
          if (ok) deletedTotal++;
        } catch {}
      }

      setFeedbackMessage({
        type: 'success',
        text: `تم تنظيف وحذف ${deletedTotal} كارت منتهي الصلاحية/الرصيد بنجاح من راوتر مايكروتك.`,
      });
      loadExpiredCards();
      if (onCardsDeleted) onCardsDeleted();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: `خطأ أثناء التنظيف الجماعي: ${err.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export report
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf('expired-cards-modal-report', {
        filename: `expired-cards-${new Date().toISOString().split('T')[0]}.pdf`,
        title: 'تقرير الكروت المنتهية - راوتر مايكروتك',
        paperFormat: 'a4',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    await printElementDocument('expired-cards-modal-report', {
      title: 'تقرير الكروت المنتهية - راوتر مايكروتك',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <ShieldAlert className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">نافذة الكروت المنتهية (Expired Cards)</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold font-mono">
                  {expiredCards.length} كرت
                </span>
              </div>
              <p className="text-rose-100 text-xs mt-0.5">
                الكروت التي نفذ رصيد بياناتها (Quota Exhausted) أو انتهت مدة صلاحيتها على راوتر مايكروتك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadExpiredCards}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
              title="تحديث البيانات"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1" id="expired-cards-modal-report">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
              <span className="text-[11px] font-bold text-rose-700 block mb-1">إجمالي الكروت المنتهية</span>
              <p className="text-2xl font-black text-rose-900 font-mono">{stats.totalCount}</p>
              <span className="text-[10px] text-rose-600 mt-1 block">
                {stats.hotspotCount} هوتسبوت • {stats.umCount} يوزر مانجر
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <span className="text-[11px] font-bold text-amber-700 block mb-1">إجمالي الاستهلاك المسحوب</span>
              <p className="text-xl font-black text-amber-900 font-mono" dir="ltr">
                {formatBytes(stats.totalTraffic)}
              </p>
              <span className="text-[10px] text-amber-600 mt-1 block">من الرصيد المخصص</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
              <span className="text-[11px] font-bold text-blue-700 block mb-1">تنزيل الكروت (Download)</span>
              <p className="text-xl font-black text-blue-900 font-mono" dir="ltr">
                {formatBytes(stats.totalDownload)}
              </p>
              <span className="text-[10px] text-blue-600 mt-1 block">بيانات مستهلكة</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
              <span className="text-[11px] font-bold text-emerald-700 block mb-1">رفع الكروت (Upload)</span>
              <p className="text-xl font-black text-emerald-900 font-mono" dir="ltr">
                {formatBytes(stats.totalUpload)}
              </p>
              <span className="text-[10px] text-emerald-600 mt-1 block">بيانات مرفوعة</span>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{feedbackMessage.text}</span>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search, Filters, and Bulk Action Toolbar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث برقم الكارت أو البروفايل أو الملاحظات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {expiredCards.length > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    title="حذف جميع الكروت المنتهية دفعة واحدة من الراوتر"
                  >
                    <Trash2 size={14} />
                    <span>حذف كافة المنتهية ({expiredCards.length})</span>
                  </button>
                )}

                <button
                  onClick={handleExportPdf}
                  disabled={isExporting || expiredCards.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
                >
                  <Download size={14} />
                  <span>PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={expiredCards.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
                >
                  <Printer size={14} />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Filter size={12} />
                تصفية:
              </span>

              {/* Source filter */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    sourceFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSourceFilter('hotspot')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    sourceFilter === 'hotspot' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  هوتسبوت
                </button>
                <button
                  onClick={() => setSourceFilter('user-manager')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    sourceFilter === 'user-manager' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  يوزر مانجر
                </button>
              </div>

              {/* Reason filter */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setReasonFilter('all')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    reasonFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  كافة الأسباب
                </button>
                <button
                  onClick={() => setReasonFilter('traffic')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    reasonFilter === 'traffic' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  نفاد الرصيد (Quota)
                </button>
                <button
                  onClick={() => setReasonFilter('uptime')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    reasonFilter === 'uptime' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  انتهاء الوقت (Time)
                </button>
              </div>
            </div>
          </div>

          {/* Cards Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">اسم الكارت / المستخدم</th>
                    <th className="p-3">سبب الانتهاء</th>
                    <th className="p-3">المصدر</th>
                    <th className="p-3">البروفايل</th>
                    <th className="p-3">الرصيد المحدد</th>
                    <th className="p-3">الاستهلاك الفعلي</th>
                    <th className="p-3">وقت الاستخدام</th>
                    <th className="p-3">الملاحظات</th>
                    <th className="p-3 text-center print:hidden">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-rose-600" />
                          <span>جاري فحص وجلب الكروت المنتهية من راوتر مايكروتك...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        {expiredCards.length === 0 ? (
                          <div className="space-y-1">
                            <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                            <p className="font-bold text-slate-700 text-sm">ممتاز! لا توجد كروت منتهية الرصيد حالياً</p>
                            <p className="text-xs text-slate-400">جميع الكروت المسجلة في الراوتر بحالة نشطة أو غير مقيدة</p>
                          </div>
                        ) : (
                          'لا توجد نتائج مطابقة لشروط البحث والفلترة.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((card) => (
                      <tr key={card.id + card.name} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                              <Key size={12} />
                            </div>
                            <span>{card.name}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          {card.expireReason === 'traffic-limit' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              نفذ رصيد البيانات (Quota)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock size={11} />
                              انتهى وقت الصلاحية
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              card.source === 'user-manager'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}
                          >
                            {card.source === 'user-manager' ? 'يوزر مانجر' : 'هوتسبوت'}
                          </span>
                        </td>

                        <td className="p-3 text-slate-600">{card.profile || 'افتراضي'}</td>

                        <td className="p-3 font-mono text-slate-500" dir="ltr">
                          {card.totalLimitBytes ? formatBytes(card.totalLimitBytes) : 'غير محدد'}
                        </td>

                        <td className="p-3 font-mono font-bold text-rose-700" dir="ltr">
                          {formatBytes(card.totalUsedBytes)}
                        </td>

                        <td className="p-3 font-mono text-slate-600">{card.uptimeUsed || card.limitUptime || '—'}</td>

                        <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">{card.comment || '—'}</td>

                        <td className="p-3 text-center print:hidden">
                          <button
                            onClick={() => setCardToDelete(card)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition flex items-center justify-center gap-1 mx-auto"
                            title="حذف هذا الكارت المنتهي من الراوتر"
                          >
                            <Trash2 size={12} />
                            <span>حذف</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            عدد الكروت المنتهية المعروضة:{' '}
            <strong className="text-slate-800 font-mono font-bold">{filteredCards.length}</strong> من إجمالي{' '}
            <strong className="text-slate-800 font-mono font-bold">{expiredCards.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Delete Single Card Confirmation */}
      {cardToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">تأكيد حذف الكارت المنتهي</h3>
            <p className="text-sm text-slate-600 text-center leading-relaxed mb-4">
              هل أنت متأكد من رغبتك في حذف الكارت{' '}
              <strong className="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{cardToDelete.name}</strong>{' '}
              نهائياً من قاعدة بيانات الراوتر ({cardToDelete.source === 'user-manager' ? 'يوزر مانجر' : 'هوتسبوت'})؟
            </p>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 mb-4 space-y-1">
              <div className="flex justify-between">
                <span>إجمالي الاستهلاك:</span>
                <span className="font-bold font-mono text-rose-700" dir="ltr">{formatBytes(cardToDelete.totalUsedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>سبب الانتهاء:</span>
                <span className="font-bold text-slate-800">
                  {cardToDelete.expireReason === 'traffic-limit' ? 'استنفاد الرصيد بالكامل' : 'انتهاء الوقت'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCardToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteCardConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>نعم، احذف الكارت</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">تأكيد تنظيف وحذف كافة الكروت المنتهية</h3>
            <p className="text-sm text-slate-600 text-center leading-relaxed mb-4">
              أنت على وشك حذف جميع الكروت المنتهية الصلاحية ورصيد البيانات وعددها{' '}
              <strong className="text-rose-600 font-mono text-base">{expiredCards.length} كرت</strong> نهائياً من راوتر
              مايكروتك لتحرير الذاكرة وتخفيف الحمل على النظام.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition"
              >
                تراجع
              </button>
              <button
                onClick={handleBulkDeleteExpired}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>نعم، احذف الجميع ({expiredCards.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
