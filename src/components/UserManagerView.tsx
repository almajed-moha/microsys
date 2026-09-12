import { PrintableCard } from "./PrintableCard";
import { CardTemplatesManager } from "./CardTemplatesManager";
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
  QrCode,
  Move,
  Store,
  Sparkles,
  Edit3,
  Grid,
  Square,
  LayoutTemplate,
  ChevronRight,
  ChevronLeft,
  Scissors,
  Type,
  Palette,
  FileDown,
  TrendingUp,
  Sliders,
  Filter,
  PowerOff
} from 'lucide-react';
import {
  NetworkSettings,
  MikroTikConfig,
  UserManagerUser,
  UserManagerProfile,
  UserManagerLimitation,
  UserManagerRouter,
  CardCategory,
  CardTemplate,
  POSPoint
} from '../types';
import {
  fetchUserManagerUsers,
  fetchUserManagerProfiles,
  fetchUserManagerLimitations,
  fetchUserManagerRouters,
  createUserManagerBatchCards,
  saveUserManagerProfileAndLimitation,
  deleteUserManagerProfile,
  deleteUserManagerUser,
  resetUserManagerUserCounters,
  disconnectUserManagerUser,
  generateUserManagerBatchRscScript,
  formatBytesToHuman
} from '../utils/mikrotikApi';
import { exportElementToPdf } from '../utils/pdfExport';
import { UserManagerCardEditModal } from './UserManagerCardEditModal';
import { UserManagerCardSessionsModal } from './UserManagerCardSessionsModal';
import { UserManagerDailyUsageReportView } from './UserManagerDailyUsageReportView';

interface UserManagerViewProps {
  settings: NetworkSettings;
  config: MikroTikConfig;
  categories?: CardCategory[];
  templates?: CardTemplate[];
  posPoints?: POSPoint[];
  onSaveTemplate?: (template: CardTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onRefreshParent?: () => void;
}

export const UserManagerView: React.FC<UserManagerViewProps> = ({
  settings,
  config,
  categories = [],
  templates = [],
  posPoints = [],
  onSaveTemplate,
  onDeleteTemplate,
  onRefreshParent,
}) => {
  // Navigation tabs inside User Manager
  const [activeTab, setActiveTab] = useState<'users' | 'daily-report' | 'profiles' | 'batch' | 'templates' | 'routers' | 'script'>('users');

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_now' | 'has_usage' | 'unused' | 'disabled'>('all');
  const [userSortBy, setUserSortBy] = useState<'name' | 'usage_desc' | 'uptime_desc'>('usage_desc');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals for Editing and Sessions
  const [cardToEdit, setCardToEdit] = useState<UserManagerUser | null>(null);
  const [cardForSessions, setCardForSessions] = useState<UserManagerUser | null>(null);

  // Actions Loading State
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState<string | null>(null);
  const [profileDeleteConfirmId, setProfileDeleteConfirmId] = useState<string | null>(null);
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
  const [batchDigitsLength, setBatchDigitsLength] = useState<number>(6);
  const [batchTemplateId, setBatchTemplateId] = useState<string>('');
  const [batchProfile, setBatchProfile] = useState<string>('');
  const [batchPasswordMode, setBatchPasswordMode] = useState<'username_only' | 'user_equals_pass' | 'pin_numeric' | 'random_str'>('username_only');
  const [selectedPosId, setSelectedPosId] = useState<string>('');
  const [customPosName, setCustomPosName] = useState<string>('');
  const [batchCustomer, setBatchCustomer] = useState<string>('admin');
  const [batchSerialStart, setBatchSerialStart] = useState<number>(1001);
  const [isSyncingBatch, setIsSyncingBatch] = useState(false);
  const [batchOutcome, setBatchOutcome] = useState<{ success: boolean; message: string } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isInteractivePreview, setIsInteractivePreview] = useState(false);

  // Live Sheet Grid & Corner Styling overrides for Preview & Batch Printing
  const [sheetGridCols, setSheetGridCols] = useState<number | null>(null);
  const [sheetGridRows, setSheetGridRows] = useState<number | null>(null);
  const [sheetCornerStyle, setSheetCornerStyle] = useState<'rounded' | 'sharp' | null>(null);
  const [sheetCardGapMm, setSheetCardGapMm] = useState<number | null>(null);
  const [sheetPageMarginMm, setSheetPageMarginMm] = useState<number | null>(null);
  const [activePreviewPage, setActivePreviewPage] = useState<number>(0);
  const [previewPageMode, setPreviewPageMode] = useState<'single_page' | 'all_pages'>('single_page');
  const [selectedElementKey, setSelectedElementKey] = useState<string>('userCode');
  const [isExportingSinglePdf, setIsExportingSinglePdf] = useState(false);

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

  // Disconnect User
  const handleDisconnectUser = async (userName: string) => {
    const ok = await disconnectUserManagerUser(config, userName);
    if (ok) {
      setActionFeedback({ success: true, message: `تم فصل الكارت (${userName}) بنجاح وإغلاق الجلسة النشطة.` });
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      setActionFeedback({ success: false, message: 'تعذر فصل الكارت، قد يكون غير متصل حالياً.' });
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

  const handleOpenAddProfile = () => {
    setIsEditingProfile(false);
    setProfileFormData({
      profileName: `UM-Profile-${Date.now().toString().slice(-4)}`,
      limitationName: `UM-Lim-${Date.now().toString().slice(-4)}`,
      nameForUsers: 'كارت جديد',
      price: 200,
      validityDays: 1,
      uptimeLimit: '1d',
      quotaLimit: '1000M',
      rateLimit: '4M/2M',
      startsAt: 'logon',
      routerOsVersion: (config.routerOsVersion?.startsWith('7') ? 'v7' : 'v7') as 'v6' | 'v7',
    });
    setShowProfileModal(true);
  };

  const handleOpenEditProfile = (prof: UserManagerProfile) => {
    const cleanName = (prof.name || '').replace(/^UM-Profile-/, '');
    const matchedLim = limitations.find(
      (l) =>
        l.name === prof.name ||
        l.name === `Lim-${prof.name}` ||
        l.name === `UM-Lim-${cleanName}` ||
        (cleanName && (l.name || '').toLowerCase().includes(cleanName.toLowerCase()))
    );

    let vDays = 1;
    if (prof.validity) {
      const m = prof.validity.match(/(\d+)d/);
      if (m) vDays = parseInt(m[1], 10);
      else {
        const num = parseInt(prof.validity, 10);
        if (!isNaN(num)) vDays = num;
      }
    }

    const rate =
      matchedLim?.rateLimitTx && matchedLim?.rateLimitRx
        ? `${matchedLim.rateLimitTx}/${matchedLim.rateLimitRx}`
        : '6M/3M';

    setProfileFormData({
      profileName: prof.name,
      limitationName: matchedLim?.name || `Lim-${prof.name}`,
      nameForUsers: prof.nameForUsers || prof.name,
      price: prof.price || 0,
      validityDays: vDays,
      uptimeLimit: matchedLim?.uptimeLimit || '1d',
      quotaLimit: matchedLim?.downloadLimit || '1000M',
      rateLimit: rate,
      startsAt: prof.startsAt || 'logon',
      routerOsVersion: (config.routerOsVersion?.startsWith('7') ? 'v7' : 'v7') as 'v6' | 'v7',
    });
    setIsEditingProfile(true);
    setShowProfileModal(true);
  };

  const handleDuplicateProfile = (prof: UserManagerProfile) => {
    const cleanName = prof.name.replace(/^UM-Profile-/, '');
    const matchedLim = limitations.find(
      (l) =>
        l.name === prof.name ||
        l.name === `Lim-${prof.name}` ||
        l.name === `UM-Lim-${cleanName}`
    );

    setProfileFormData({
      profileName: `${prof.name}-copy`,
      limitationName: matchedLim ? `${matchedLim.name}-copy` : `Lim-${prof.name}-copy`,
      nameForUsers: `${prof.nameForUsers || prof.name} (نسخة)`,
      price: prof.price || 0,
      validityDays: parseInt(prof.validity) || 1,
      uptimeLimit: matchedLim?.uptimeLimit || '1d',
      quotaLimit: matchedLim?.downloadLimit || '1000M',
      rateLimit:
        matchedLim?.rateLimitTx && matchedLim?.rateLimitRx
          ? `${matchedLim.rateLimitTx}/${matchedLim.rateLimitRx}`
          : '6M/3M',
      startsAt: prof.startsAt || 'logon',
      routerOsVersion: (config.routerOsVersion?.startsWith('7') ? 'v7' : 'v7') as 'v6' | 'v7',
    });
    setIsEditingProfile(false);
    setShowProfileModal(true);
  };

  const handleDeleteProfile = async (profileIdOrName: string, profileName: string) => {
    setIsDeletingProfile(profileIdOrName);
    const ok = await deleteUserManagerProfile(config, profileIdOrName);
    setIsDeletingProfile(null);
    setProfileDeleteConfirmId(null);

    if (ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== profileIdOrName && p.name !== profileName));
      setActionFeedback({ success: true, message: `تم حذف بروفايل User Manager (${profileName}) بنجاح.` });
      setTimeout(() => setActionFeedback(null), 3500);
    } else {
      setActionFeedback({ success: false, message: `تعذر حذف البروفايل (${profileName}) من الراوتر.` });
    }
  };

  // Active batch template & POS name calculations
  const activeBatchTemplate = useMemo(() => {
    const base = templates.find((t) => t.id === batchTemplateId) || templates[0];
    if (!base) return base;
    const cols = sheetGridCols ?? base.gridCols ?? 4;
    const rows = sheetGridRows ?? base.gridRows ?? 5;
    const cornerStyle = sheetCornerStyle ?? base.cardCornerStyle ?? 'rounded';
    const cardGapMm = sheetCardGapMm ?? (base.cardGapMm !== undefined ? base.cardGapMm : 1);
    const pageMarginMm = sheetPageMarginMm ?? (base.pageMarginMm !== undefined ? base.pageMarginMm : 4);
    return {
      ...base,
      gridCols: cols,
      gridRows: rows,
      cardsPerPage: cols * rows,
      cardCornerStyle: cornerStyle,
      cardGapMm,
      pageMarginMm,
    };
  }, [batchTemplateId, templates, sheetGridCols, sheetGridRows, sheetCornerStyle, sheetCardGapMm, sheetPageMarginMm]);

  // Direct automatic calculation of cards in sheet when rows/cols are adjusted
  const handleGridDimensionChange = (newCols: number, newRows: number) => {
    const validCols = Math.max(1, Math.min(10, newCols));
    const validRows = Math.max(1, Math.min(20, newRows));
    setSheetGridCols(validCols);
    setSheetGridRows(validRows);
    const totalCardsInSheet = validCols * validRows;
    // Set card count directly and automatically
    setBatchCount(totalCardsInSheet);
  };

  const handleApplyPreset = (cols: number, rows: number, gapMm: number = 1) => {
    setSheetGridCols(cols);
    setSheetGridRows(rows);
    setSheetCardGapMm(gapMm);
    setBatchCount(cols * rows);
  };

  const handleCornerStyleChange = (style: 'rounded' | 'sharp') => {
    setSheetCornerStyle(style);
  };

  const handleGapChange = (gapMm: number) => {
    setSheetCardGapMm(Math.max(0, Math.min(10, gapMm)));
  };

  const handleMarginChange = (marginMm: number) => {
    setSheetPageMarginMm(Math.max(0, Math.min(15, marginMm)));
  };

  const handleSaveSheetSettingsToTemplate = () => {
    if (!activeBatchTemplate || !onSaveTemplate) return;
    onSaveTemplate(activeBatchTemplate);
    setActionFeedback({
      success: true,
      message: 'تم حفظ إعدادات التقسيم والفراغات ونمط الإطار في القالب بنجاح!',
    });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const chosenPosName = useMemo(() => {
    if (selectedPosId) {
      return posPoints.find((p) => p.id === selectedPosId)?.name || '';
    }
    return customPosName.trim();
  }, [selectedPosId, customPosName, posPoints]);

  const handleUpdateTemplatePosition = (elementKey: string, pos: { x: number; y: number }) => {
    if (!activeBatchTemplate || !onSaveTemplate) return;
    const updated: CardTemplate = {
      ...activeBatchTemplate,
      elementPositions: {
        ...(activeBatchTemplate.elementPositions || {}),
        [elementKey]: pos,
      },
    };
    onSaveTemplate(updated);
  };

  const handleUpdateElementStyle = (
    elementKey: string,
    styleUpdate: {
      fontSize?: number | string;
      color?: string;
      fontWeight?: 'normal' | 'semibold' | 'bold' | 'black';
      backgroundColor?: string;
    }
  ) => {
    if (!activeBatchTemplate || !onSaveTemplate) return;
    const currentStyles = activeBatchTemplate.elementStyles || {};
    const targetStyle = currentStyles[elementKey] || {};
    const updated: CardTemplate = {
      ...activeBatchTemplate,
      elementStyles: {
        ...currentStyles,
        [elementKey]: {
          ...targetStyle,
          ...styleUpdate,
        },
      },
    };
    onSaveTemplate(updated);
  };

  const handleUpdateCodeBoxStyle = (
    boxStyle: 'clean-border' | 'solid-bg' | 'transparent' | 'rounded-white',
    backgroundColor?: string
  ) => {
    if (!activeBatchTemplate || !onSaveTemplate) return;
    const currentStyles = activeBatchTemplate.elementStyles || {};
    const userCodeStyle = currentStyles['userCode'] || {};
    const updated: CardTemplate = {
      ...activeBatchTemplate,
      codeBoxStyle: boxStyle,
      elementStyles: {
        ...currentStyles,
        userCode: {
          ...userCodeStyle,
          backgroundColor: backgroundColor !== undefined ? backgroundColor : userCodeStyle.backgroundColor,
        },
      },
    };
    onSaveTemplate(updated);
  };

  const handleResetElementPosition = (elementKey: string) => {
    if (!activeBatchTemplate || !onSaveTemplate) return;
    const currentPositions = { ...(activeBatchTemplate.elementPositions || {}) };
    delete currentPositions[elementKey];
    const updated: CardTemplate = {
      ...activeBatchTemplate,
      elementPositions: currentPositions,
    };
    onSaveTemplate(updated);
  };

  const suggestNextSerial = () => {
    if (users.length === 0) {
      setBatchSerialStart(1001);
      return;
    }
    let maxNum = 1000;
    users.forEach((u) => {
      const match = u.name.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > maxNum && val < 9999999) {
          maxNum = val;
        }
      }
    });
    setBatchSerialStart(maxNum + 1);
  };

  // Generated preview cards for Batch Voucher Generator
  const previewBatchCards = useMemo(() => {
    const list: Array<{ username: string; pin: string; profile: string; serial: number }> = [];
    const count = Math.min(Math.max(1, batchCount), 500);

    for (let i = 0; i < count; i++) {
      const serialNum = batchSerialStart + i;
      // Format serial number with exact digits length requested by user
      const formattedSerial = String(serialNum).padStart(batchDigitsLength, '0');
      let username = `${batchPrefix}${formattedSerial}`;
      let pin = '';

      if (batchPasswordMode === 'username_only') {
        pin = '';
      } else if (batchPasswordMode === 'user_equals_pass') {
        pin = username;
      } else if (batchPasswordMode === 'pin_numeric') {
        const pinLen = Math.min(Math.max(3, batchDigitsLength), 10);
        const minRand = Math.pow(10, pinLen - 1);
        const maxRand = Math.pow(10, pinLen) - 1;
        pin = String(Math.floor(minRand + Math.random() * (maxRand - minRand + 1)));
      } else {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let randPin = '';
        const pinLen = Math.min(Math.max(4, batchDigitsLength), 12);
        for (let j = 0; j < pinLen; j++) {
          randPin += chars.charAt(Math.floor(Math.random() * chars.length));
        }
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
  }, [batchCount, batchPrefix, batchDigitsLength, batchProfile, batchPasswordMode, batchSerialStart, profiles]);

  // Split previewBatchCards into discrete printable pages
  const cardsPerPage = (activeBatchTemplate?.gridCols || 4) * (activeBatchTemplate?.gridRows || 5);
  const previewPages = useMemo(() => {
    if (!previewBatchCards || previewBatchCards.length === 0) return [[]];
    const pages: (typeof previewBatchCards)[] = [];
    for (let i = 0; i < previewBatchCards.length; i += cardsPerPage) {
      pages.push(previewBatchCards.slice(i, i + cardsPerPage));
    }
    return pages.length > 0 ? pages : [[]];
  }, [previewBatchCards, cardsPerPage]);

  const totalPages = Math.max(1, previewPages.length);

  useEffect(() => {
    if (activePreviewPage >= totalPages) {
      setActivePreviewPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, activePreviewPage]);

  // Sync Generated Batch directly to User Manager
  const handleSyncBatchToRouter = async () => {
    setIsSyncingBatch(true);
    setBatchOutcome(null);

    const formattedCards = previewBatchCards.map((c) => ({
      username: c.username,
      password: c.pin,
      profile: c.profile,
      customer: batchCustomer || 'admin',
      comment: chosenPosName
        ? `UM Batch [${chosenPosName}] - ${new Date().toISOString().split('T')[0]}`
        : `UM Batch - ${new Date().toISOString().split('T')[0]}`,
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

  // Export Printable PDF Card Sheet (single page preview or full batch)
  const handleExportPdf = async (singlePageOnly: boolean = false) => {
    if (singlePageOnly) {
      setIsExportingSinglePdf(true);
    } else {
      setIsExportingPdf(true);
    }
    const previousMode = previewPageMode;
    try {
      if (singlePageOnly) {
        setPreviewPageMode('single_page');
      } else {
        setPreviewPageMode('all_pages');
      }
      // Wait for layout rendering
      await new Promise((r) => setTimeout(r, 160));

      const filename = singlePageOnly
        ? `معاينة_ورقة_${activePreviewPage + 1}_(${batchProfile || 'كروت'}).pdf`
        : `دفعة_كروت_${batchProfile || 'UM'}_(${previewBatchCards.length}كارت).pdf`;

      await exportElementToPdf('um-print-sheet', {
        filename,
        orientation: 'portrait',
        format: 'a4',
        scale: 2.2,
      });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setPreviewPageMode(previousMode);
      setIsExportingPdf(false);
      setIsExportingSinglePdf(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let list = users.filter((u) => {
      const q = (userSearch || '').toLowerCase();
      const matchesSearch =
        (u.name || '').toLowerCase().includes(q) ||
        (u.comment && (u.comment || '').toLowerCase().includes(q)) ||
        (u.actualProfile && (u.actualProfile || '').toLowerCase().includes(q));
      const matchesProfile = profileFilter === 'all' || u.actualProfile === profileFilter;
      
      let matchesStatus = true;
      const totalBytes = u.totalBytes || ((u.downloadUsed || 0) + (u.uploadUsed || 0));
      if (statusFilter === 'disabled') {
        matchesStatus = Boolean(u.disabled);
      } else if (statusFilter === 'has_usage') {
        matchesStatus = totalBytes > 0;
      } else if (statusFilter === 'unused') {
        matchesStatus = totalBytes === 0 && !u.disabled;
      } else if (statusFilter === 'active_now') {
        matchesStatus = !u.disabled && (totalBytes > 0 || (u.uptimeUsed && u.uptimeUsed !== '0s'));
      }

      return matchesSearch && matchesProfile && matchesStatus;
    });

    if (userSortBy === 'usage_desc') {
      list.sort((a, b) => (b.totalBytes || 0) - (a.totalBytes || 0));
    } else if (userSortBy === 'uptime_desc') {
      list.sort((a, b) => (b.uptimeUsed || '').localeCompare(a.uptimeUsed || ''));
    } else if (userSortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [users, userSearch, profileFilter, statusFilter, userSortBy]);

  // Aggregate stats
  const totalUMBytesUsed = users.reduce((acc, u) => acc + (u.totalBytes || 0), 0);
  const totalCardsWithUsage = users.filter((u) => (u.totalBytes || 0) > 0).length;
  const totalDisabledCards = users.filter((u) => u.disabled).length;

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
              onClick={handleOpenAddProfile}
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
          onClick={() => setActiveTab('daily-report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'daily-report'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>تقارير السحب اليومي وتدقيق الـ WAN</span>
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
          <span>توليد الكروت</span>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "templates"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <LayoutTemplate className="w-4 h-4 text-cyan-400" />
          <span>إدارة القوالب</span>
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
          {/* Quick KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">إجمالي الكروت</span>
                <span className="text-lg font-black text-white font-mono">{users.length}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">كروت ذات استهلاك</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{totalCardsWithUsage}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">إجمالي السحب المتراكم</span>
                <span className="text-base font-black text-cyan-300 font-mono">{formatBytesToHuman(totalUMBytesUsed)}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">كروت معطلة</span>
                <span className="text-lg font-black text-rose-400 font-mono">{totalDisabledCards}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="بحث باسم الكارت، البروفايل، أو الملاحظة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Profile Filter */}
              <select
                value={profileFilter}
                onChange={(e) => setProfileFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option key="all-profiles-opt" value="all">كافة البروفايلات</option>
                {profiles.map((p, idx) => (
                  <option key={`filter-prof-${p.id || p.name || idx}`} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="all">كافة الحالات</option>
                <option value="active_now">نشطة وغير معطلة</option>
                <option value="has_usage">كروت سحبت بيانات</option>
                <option value="unused">كروت جديدة لم تُستخدم</option>
                <option value="disabled">كروت معطلة</option>
              </select>

              {/* Sort By */}
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="usage_desc">ترتيب: الأكثر استهلاكاً</option>
                <option value="uptime_desc">ترتيب: أطول مدة اتصال</option>
                <option value="name">ترتيب: أبجدياً بالاسم</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
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
                    <th className="p-3.5">البيانات المستهلكة / الرصيد</th>
                    <th className="p-3.5">المالك / الملاحظات</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">إجراءات وإحصائيات</th>
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
                    filteredUsers.map((u, idx) => {
                      const totalBytes = u.totalBytes || ((u.downloadUsed || 0) + (u.uploadUsed || 0));
                      const hasLimit = u.limitBytesTotal && u.limitBytesTotal > 0;
                      const percentUsed = hasLimit ? Math.min(100, Math.round((totalBytes / u.limitBytesTotal!) * 100)) : null;

                      return (
                        <tr key={u.id || u.name || `um-user-row-${idx}`} className="hover:bg-slate-800/40 transition">
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
                            <button
                              onClick={() => setCardToEdit(u)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/20 transition text-right"
                              title="انقر لتعديل البروفايل"
                            >
                              {u.actualProfile || 'default'}
                            </button>
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

                          {/* Data Download / Upload & Progress */}
                          <td className="p-3.5 font-mono text-slate-300">
                            <div className="space-y-1 min-w-[130px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-400">
                                  {formatBytesToHuman(totalBytes)}
                                </span>
                                {hasLimit && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    {percentUsed}%
                                  </span>
                                )}
                              </div>
                              {hasLimit ? (
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      (percentUsed || 0) > 90
                                        ? 'bg-rose-500'
                                        : (percentUsed || 0) > 70
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400'
                                    }`}
                                    style={{ width: `${percentUsed}%` }}
                                  />
                                </div>
                              ) : null}
                              {hasLimit ? (
                                <span className="text-slate-500 text-[10px] block">
                                  من {formatBytesToHuman(u.limitBytesTotal!)}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px] block">
                                  سحب مفتوح
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer / Comment */}
                          <td className="p-3.5 text-slate-400 text-xs">
                            <div>
                              <span className="font-medium text-slate-300">{u.customer || 'admin'}</span>
                              {u.comment && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{u.comment}</p>}
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
                              {/* View Sessions & Stats */}
                              <button
                                onClick={() => setCardForSessions(u)}
                                className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition text-xs font-semibold flex items-center gap-1"
                                title="عرض جلسات الكارت وسجل السحب"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">جلسات</span>
                              </button>

                              {/* Edit Card & Profile */}
                              <button
                                onClick={() => setCardToEdit(u)}
                                className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition text-xs"
                                title="تعديل الكارت، كلمة المرور، البروفايل، والصلاحيات"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Counters */}
                              <button
                                onClick={() => handleResetCounters(u.id, u.name)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition text-xs"
                                title="تصفير عدادات الاستهلاك للكارت"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              {/* Disconnect Card */}
                              <button
                                onClick={() => handleDisconnectUser(u.name)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition text-xs"
                                title="فصل الكارت وإغلاق الجلسة النشطة"
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Card */}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1b: DAILY USAGE REPORT & WAN AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'daily-report' && (
        <UserManagerDailyUsageReportView
          config={config}
          users={users}
          onViewCardSessions={(userName) => {
            const found = users.find((u) => u.name.toLowerCase() === userName.toLowerCase()) || {
              id: `um-sess-${userName}`,
              name: userName,
              password: '',
              actualProfile: '',
              uptimeUsed: '0s',
              downloadUsed: 0,
              uploadUsed: 0,
              totalBytes: 0,
              disabled: false,
            };
            setCardForSessions(found);
          }}
          onEditCard={(u) => setCardToEdit(u)}
        />
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
              onClick={handleOpenAddProfile}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بروفايل وقيد جديد</span>
            </button>
          </div>

          {/* Profiles Grid with Direct View and Edit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((prof, idx) => {
              const cleanName = (prof.name || '').replace(/^UM-Profile-/, '');
              const matchedLim = limitations.find(
                (l) =>
                  l.name === prof.name ||
                  l.name === `Lim-${prof.name}` ||
                  l.name === `UM-Lim-${cleanName}` ||
                  (cleanName && (l.name || '').toLowerCase().includes(cleanName.toLowerCase()))
              );

              const isConfirmingDelete = profileDeleteConfirmId === prof.id || profileDeleteConfirmId === prof.name;
              const isDeletingThis = isDeletingProfile === prof.id || isDeletingProfile === prof.name;

              return (
                <div
                  key={prof.id || prof.name || `um-prof-card-${idx}`}
                  className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 relative overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm tracking-wide">{prof.name}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{prof.nameForUsers || prof.name}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20 shrink-0">
                        {prof.price ? `${prof.price} ${settings.currencySymbol}` : 'مجاني'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs mt-3">
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
                        <span className="text-slate-400">مشاركة الأجهزة:</span>
                        <span className="font-mono text-slate-300">{prof.overrideSharedUsers || 1} جهاز</span>
                      </div>

                      {/* Associated Limitation Info */}
                      {matchedLim && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <div>
                            <span className="block text-[10px] text-slate-500">السرعة:</span>
                            <span className="font-mono text-cyan-400 text-[10px]">
                              {matchedLim.rateLimitTx || 'مفتوح'}/{matchedLim.rateLimitRx || 'مفتوح'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">الاستخدام:</span>
                            <span className="font-mono text-amber-400 text-[10px]">{matchedLim.uptimeLimit || 'مفتوح'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500">البيانات:</span>
                            <span className="font-mono text-emerald-400 text-[10px]">{matchedLim.downloadLimit || 'مفتوح'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 mt-2">
                    <button
                      onClick={() => handleOpenEditProfile(prof)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      title="تعديل خصائص البروفايل وقيود السرعة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل البروفايل</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateProfile(prof)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                      title="نسخ كبروفايل جديد"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteProfile(prof.id || prof.name, prof.name)}
                          disabled={isDeletingThis}
                          className="px-2 py-1 rounded-xl bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition disabled:opacity-50"
                        >
                          {isDeletingThis ? 'جاري الحذف...' : 'تأكيد الحذف'}
                        </button>
                        <button
                          onClick={() => setProfileDeleteConfirmId(null)}
                          className="px-1.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-[10px] hover:text-white"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setProfileDeleteConfirmId(prof.id || prof.name)}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition"
                        title="حذف البروفايل من اليوزر مانجر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Limitations Section */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>قيود السرعة والرصيد المرتبطة (User Manager Limitations)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {limitations.map((lim, idx) => (
                <div key={lim.id || lim.name || `um-lim-card-${idx}`} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
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
      {/* ========================================================================= */}
      {/* TAB: CARD TEMPLATES MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <CardTemplatesManager
          templates={templates}
          categories={categories}
          onSaveTemplate={onSaveTemplate!}
          onDeleteTemplate={onDeleteTemplate!}
        />
      )}

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
              {/* Template Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">قالب الطباعة والتصميم:</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition"
                  >
                    <span>تعديل وتصميم القوالب</span>
                    <span>←</span>
                  </button>
                </div>
                <select
                  value={batchTemplateId}
                  onChange={(e) => setBatchTemplateId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option key="default-tpl-option" value="">-- القالب الافتراضي --</option>
                  {templates.map((t, idx) => (
                    <option key={t.id || `batch-template-${idx}`} value={t.id}>
                      {t.name} ({t.cardWidthMm || 85}×{t.cardHeightMm || 55} مم - {t.cardsPerPage || 18} كارت/ورقة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile Select */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">اختر البروفايل المطلوب:</label>
                <select
                  value={batchProfile}
                  onChange={(e) => setBatchProfile(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                >
                  {profiles.map((p, idx) => (
                    <option key={`batch-profile-${p.id || p.name || idx}`} value={p.name}>
                      {p.name} ({p.nameForUsers || p.name}) {p.price ? `- ${p.price} ${settings.currencySymbol}` : ''}
                    </option>
                  ))}
                  {profiles.length === 0 && <option key="default-batch-profile-empty" value="default">default</option>}
                </select>
              </div>

              {/* Point of Sale (POS) Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>نقطة البيع (اختياري لطباعة كروت مخصصة لكل نقطة):</span>
                  </label>
                  {chosenPosName && (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      مخصص
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <select
                    value={selectedPosId}
                    onChange={(e) => {
                      setSelectedPosId(e.target.value);
                      if (e.target.value) setCustomPosName('');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option key="pos-general-option" value="">-- عام (بدون تحديد نقطة بيع / لجميع النقاط) --</option>
                    {posPoints.map((pos, idx) => (
                      <option key={pos.id || `pos-opt-${idx}`} value={pos.id}>
                        {pos.name} {pos.location ? `(${pos.location})` : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedPosId && (
                    <input
                      type="text"
                      value={customPosName}
                      onChange={(e) => setCustomPosName(e.target.value)}
                      placeholder="أو اكتب اسم نقطة البيع يدوياً (مثال: بقالة الأمانة)..."
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  )}
                </div>
              </div>

              {/* Count & Prefix & Card Number Length */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    placeholder="مثال: u أو اترك فارغاً"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">طول أرقام الكرت (Digits):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="3"
                      max="16"
                      value={batchDigitsLength}
                      onChange={(e) => setBatchDigitsLength(Math.min(16, Math.max(3, parseInt(e.target.value) || 6)))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 pointer-events-none">أرقام</span>
                  </div>
                </div>
              </div>

              {/* Quick Card Digits Length Presets & Live Preview */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-semibold">أطوال شائعة للأرقام:</span>
                  {[4, 5, 6, 7, 8, 10, 12].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setBatchDigitsLength(len)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono transition ${
                        batchDigitsLength === len
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {len} أرقام
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-purple-300 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-800/30">
                  معاينة كود الكرت:{' '}
                  <strong className="text-white font-bold">
                    {batchPrefix}{String(batchSerialStart).padStart(batchDigitsLength, '0')}
                  </strong>
                </div>
              </div>

              {/* Password Mode */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>نمط كلمة المرور (PIN):</span>
                  {batchPasswordMode === 'username_only' && (
                    <span className="text-[10px] text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded">
                      كود مستخدم فقط
                    </span>
                  )}
                </label>
                <select
                  value={batchPasswordMode}
                  onChange={(e) => setBatchPasswordMode(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="username_only">✨ استخدام اسم مستخدم فقط (كود الكارت فقط / بدون كلمة سر)</option>
                  <option value="user_equals_pass">اسم المستخدم هو نفس كلمة المرور</option>
                  <option value="pin_numeric">أرقام سرية عشوائية (4 أرقام PIN)</option>
                  <option value="random_str">حروف وأرقام عشوائية مميزة</option>
                </select>
                {batchPasswordMode === 'username_only' && (
                  <p className="text-[11px] text-purple-300/90 mt-1 bg-purple-950/40 p-2 rounded-lg border border-purple-800/30">
                    💡 يتيح للمستخدم تسجيل الدخول بكود واحد فقط بدون الحاجة لكلمة سر، ويظهر في الكارت كود وحيد بارز وسهل الإدخال.
                  </p>
                )}
              </div>

              {/* Serial Start & Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">بداية التسلسل:</label>
                    <button
                      type="button"
                      onClick={suggestNextSerial}
                      title="حساب التسلسل التالي تلقائياً من الكروت الحالية"
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>تسلسل ذكي</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    value={batchSerialStart}
                    onChange={(e) => setBatchSerialStart(parseInt(e.target.value) || 1000)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
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

              {/* Papers & Sheets Summary Calculation */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>عدد الأوراق المطلوبة للطباعة:</span>
                  </span>
                  <span className="text-white font-black">
                    {Math.ceil(previewBatchCards.length / (activeBatchTemplate?.cardsPerPage || 18))} ورقة A4
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span>سعة الورقة: <strong className="text-slate-300">{activeBatchTemplate?.cardsPerPage || 18} كارت</strong></span>
                  <span>إجمالي قيمة الدفعة: <strong className="text-emerald-400">{((profiles.find(p => p.name === batchProfile)?.price || 0) * previewBatchCards.length).toLocaleString()} {settings.currencySymbol}</strong></span>
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
                  onClick={() => handleExportPdf(true)}
                  disabled={isExportingSinglePdf || isExportingPdf}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
                  title="تحميل الورقة الحالية فقط بصيغة A4 PDF لمعرفة كيف ستبدو الطباعة"
                >
                  <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isExportingSinglePdf ? 'جارِ التحميل...' : 'تحميل ورقة المعاينة (A4 PDF)'}</span>
                </button>

                <button
                  onClick={() => handleExportPdf(false)}
                  disabled={isExportingPdf || isExportingSinglePdf}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
                  title="تحميل كامل الدفعة في ملف PDF متعدد الصفحات"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isExportingPdf ? 'جارِ التحميل...' : `تحميل كل الدفعة (${totalPages} أوراق)`}</span>
                </button>
              </div>

              <button
                onClick={handleDownloadBatchRsc}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 transition"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحميل سكربت MikroTik (.rsc)</span>
              </button>
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Printer className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white text-xs">
                  معاينة ورقة طباعة كروت اليوزر مانجر ({previewBatchCards.length} كارت)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono font-bold">
                  {activeBatchTemplate?.cardsPerPage || 20} كارت بالورقة ({activeBatchTemplate?.gridCols || 4} أعمدة × {activeBatchTemplate?.gridRows || 5} أسطر)
                </span>
                {totalPages > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-bold">
                    إجمالي: {totalPages} أوراق A4
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Download preview page button in header */}
                <button
                  type="button"
                  onClick={() => handleExportPdf(true)}
                  disabled={isExportingSinglePdf || isExportingPdf}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5"
                  title="تحميل الورقة الحالية A4 PDF لمعاينة مظهر الطباعة الدقيق"
                >
                  <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isExportingSinglePdf ? 'جارِ التصدير...' : 'تحميل ورقة المعاينة'}</span>
                </button>

                {/* Interactive Drag & Drop Toggle */}
                <button
                  type="button"
                  onClick={() => setIsInteractivePreview(!isInteractivePreview)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isInteractivePreview
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300'
                  }`}
                  title="تفعيل سحب وتعديل مواضع وألوان وأحجام خطوط العناصر في الكارت"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>{isInteractivePreview ? 'إنهاء التعديل المباشر' : 'تفعيل السحب والتعديل المباشر'}</span>
                </button>
              </div>
            </div>

            {/* Live Sheet Grid & Tuning Bar */}
            <div className="mb-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              {/* Row 1: Presets & Grid dimensions */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Presets Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[11px] font-bold">توزيع سريع:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(4, 5, 1)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      activeBatchTemplate?.gridCols === 4 && activeBatchTemplate?.gridRows === 5
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    4×5 (20 كارت - جلوبل نت)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(4, 6, 1)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      activeBatchTemplate?.gridCols === 4 && activeBatchTemplate?.gridRows === 6
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    4×6 (24 كارت)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(3, 6, 1)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      activeBatchTemplate?.gridCols === 3 && activeBatchTemplate?.gridRows === 6
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    3×6 (18 كارت)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(4, 7, 0.8)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      activeBatchTemplate?.gridCols === 4 && activeBatchTemplate?.gridRows === 7
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    4×7 (28 كارت)
                  </button>
                </div>

                {/* Direct Numeric Cols x Rows */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-300 font-semibold">الأعمدة:</span>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={activeBatchTemplate?.gridCols || 4}
                      onChange={(e) => {
                        const c = parseInt(e.target.value) || 1;
                        handleGridDimensionChange(c, activeBatchTemplate?.gridRows || 5);
                      }}
                      className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-white font-mono font-bold text-center text-xs"
                      title="عدد أعمدة الكروت في الورقة"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold">×</span>
                    <span className="text-slate-300 font-semibold">الأسطر:</span>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={activeBatchTemplate?.gridRows || 5}
                      onChange={(e) => {
                        const r = parseInt(e.target.value) || 1;
                        handleGridDimensionChange(activeBatchTemplate?.gridCols || 4, r);
                      }}
                      className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-white font-mono font-bold text-center text-xs"
                      title="عدد أسطر الكروت في الورقة"
                    />
                  </div>

                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-bold font-mono">
                    = {activeBatchTemplate?.cardsPerPage || 20} كارت/ورقة
                  </span>
                </div>
              </div>

              {/* Row 2: Cutting Gap, Margins, Corner Style, and Save */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-900">
                {/* Cutting Gap */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>فراغ القص:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '0 مم (متلاصقة)', val: 0 },
                      { label: '0.5 مم (بسيط)', val: 0.5 },
                      { label: '1 مم (دقيق)', val: 1 },
                      { label: '2 مم', val: 2 },
                    ].map((g) => (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => handleGapChange(g.val)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                          (activeBatchTemplate?.cardGapMm ?? 1) === g.val
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Style & Page Margin */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Page Margin */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">الهامش:</span>
                    {[
                      { label: '3 مم', val: 3 },
                      { label: '4 مم', val: 4 },
                      { label: '5 مم', val: 5 },
                    ].map((m) => (
                      <button
                        key={m.val}
                        type="button"
                        onClick={() => handleMarginChange(m.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                          (activeBatchTemplate?.pageMarginMm ?? 4) === m.val
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Corner Style */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[11px]">الإطار:</span>
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleCornerStyleChange('rounded')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          (activeBatchTemplate?.cardCornerStyle || 'rounded') === 'rounded'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        مستدير
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCornerStyleChange('sharp')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                          activeBatchTemplate?.cardCornerStyle === 'sharp'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        مركن (90°)
                      </button>
                    </div>
                  </div>

                  {onSaveTemplate && (
                    <button
                      type="button"
                      onClick={handleSaveSheetSettingsToTemplate}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition"
                      title="حفظ تقسيم الأعمدة والأسطر وفراغ القص بالقالب"
                    >
                      حفظ بالقالب
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Multi-Page Navigation Bar if cards exceed single sheet */}
            {totalPages > 1 && (
              <div className="mb-3 p-2 bg-slate-950/90 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">طريقة العرض:</span>
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPreviewPageMode('single_page')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                        previewPageMode === 'single_page'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ورقة مفردة
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPageMode('all_pages')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                        previewPageMode === 'all_pages'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      عرض كافة الأوراق ({totalPages})
                    </button>
                  </div>
                </div>

                {previewPageMode === 'single_page' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={activePreviewPage === 0}
                      onClick={() => setActivePreviewPage((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                      title="الورقة السابقة"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setActivePreviewPage(pIdx)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition ${
                            activePreviewPage === pIdx
                              ? 'bg-purple-600 text-white font-black'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          ورقة {pIdx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={activePreviewPage >= totalPages - 1}
                      onClick={() => setActivePreviewPage((prev) => Math.min(totalPages - 1, prev + 1))}
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
                      title="الورقة التالية"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {isInteractivePreview && (
              <div className="mb-3 p-3.5 bg-slate-950 rounded-2xl border border-purple-500/40 shadow-xl space-y-3 animate-in fade-in">
                {/* Header row with Element Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-purple-300 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>تخصيص العنصر المحدد:</span>
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { key: 'userCode', label: 'كود المستخدم / الدخول' },
                        { key: 'networkName', label: 'اسم الشبكة' },
                        { key: 'category', label: 'الفئة / الباقة' },
                        { key: 'price', label: 'السعر' },
                        { key: 'validity', label: 'الصلاحية' },
                        { key: 'supportPhone', label: 'هاتف الدعم' },
                        { key: 'networkSlogan', label: 'الرابط / الشعار' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedElementKey(item.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            selectedElementKey === item.key
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetElementPosition(selectedElementKey)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition flex items-center gap-1"
                      title="إعادة ضبط موضع العنصر المحدد إلى مكانه التلقائي"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>إعادة ضبط الموضع</span>
                    </button>
                  </div>
                </div>

                {/* Property Controls: Font Size, Color, Weight, Code Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Font Size (Exact Number in px) */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold flex items-center gap-1">
                        <Type className="w-3.5 h-3.5 text-indigo-400" />
                        <span>حجم الخط:</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-indigo-300">
                        {((activeBatchTemplate?.elementStyles?.[selectedElementKey]?.fontSize as number) ||
                          (selectedElementKey === 'price' ? 15 : selectedElementKey === 'userCode' ? 14 : selectedElementKey === 'networkName' ? 13 : selectedElementKey === 'category' ? 12 : 10))} px
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="8"
                        max="48"
                        value={
                          (activeBatchTemplate?.elementStyles?.[selectedElementKey]?.fontSize as number) ||
                          (selectedElementKey === 'price' ? 15 : selectedElementKey === 'userCode' ? 14 : selectedElementKey === 'networkName' ? 13 : selectedElementKey === 'category' ? 12 : 10)
                        }
                        onChange={(e) => {
                          const size = parseInt(e.target.value) || 12;
                          handleUpdateElementStyle(selectedElementKey, { fontSize: size });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono font-bold text-center text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = (activeBatchTemplate?.elementStyles?.[selectedElementKey]?.fontSize as number) || 14;
                            handleUpdateElementStyle(selectedElementKey, { fontSize: Math.max(8, cur - 1) });
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = (activeBatchTemplate?.elementStyles?.[selectedElementKey]?.fontSize as number) || 14;
                            handleUpdateElementStyle(selectedElementKey, { fontSize: Math.min(48, cur + 1) });
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Font Color */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-pink-400" />
                      <span>لون الخط:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          activeBatchTemplate?.elementStyles?.[selectedElementKey]?.color ||
                          (selectedElementKey === 'networkName' ? '#1d4ed8' : selectedElementKey === 'category' ? '#0f172a' : '#020617')
                        }
                        onChange={(e) => handleUpdateElementStyle(selectedElementKey, { color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        title="اختر لون الخط"
                      />
                      <input
                        type="text"
                        value={
                          activeBatchTemplate?.elementStyles?.[selectedElementKey]?.color ||
                          (selectedElementKey === 'networkName' ? '#1d4ed8' : selectedElementKey === 'category' ? '#0f172a' : '#020617')
                        }
                        onChange={(e) => handleUpdateElementStyle(selectedElementKey, { color: e.target.value })}
                        className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center text-xs"
                      />
                      {/* Color presets */}
                      <div className="flex items-center gap-1">
                        {['#020617', '#dc2626', '#1d4ed8', '#047857', '#7c3aed'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleUpdateElementStyle(selectedElementKey, { color: c })}
                            className="w-4 h-4 rounded-full border border-slate-600 transition hover:scale-110"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Font Weight */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-slate-300 font-bold block">سمك الخط:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      {[
                        { label: 'عادي', val: 'normal' },
                        { label: 'عريض', val: 'bold' },
                        { label: 'عريض جداً', val: 'black' },
                      ].map((w) => (
                        <button
                          key={w.val}
                          type="button"
                          onClick={() => handleUpdateElementStyle(selectedElementKey, { fontWeight: w.val as any })}
                          className={`flex-1 py-1 rounded text-[11px] font-bold transition ${
                            (activeBatchTemplate?.elementStyles?.[selectedElementKey]?.fontWeight || 'bold') === w.val
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code Box Special Options (when userCode is active) */}
                  {selectedElementKey === 'userCode' ? (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-slate-300 font-bold block">إطار وخلفية الكود:</span>
                      <div className="flex flex-col gap-1">
                        <select
                          value={activeBatchTemplate?.codeBoxStyle || 'clean-border'}
                          onChange={(e) => handleUpdateCodeBoxStyle(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                        >
                          <option value="transparent">بدون إطار وبدون خلفية (رقم فقط)</option>
                          <option value="clean-border">إطار بيضاوي أنيق (ملون)</option>
                          <option value="solid-bg">خلفية بيضاء مع إطار خفيف</option>
                          <option value="rounded-white">بيضاوي أبيض ناصع</option>
                        </select>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>الخلفية:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCodeBoxStyle(activeBatchTemplate?.codeBoxStyle || 'clean-border', 'transparent')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                activeBatchTemplate?.elementStyles?.userCode?.backgroundColor === 'transparent' || activeBatchTemplate?.codeBoxStyle === 'transparent'
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              شفاف
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCodeBoxStyle(activeBatchTemplate?.codeBoxStyle || 'clean-border', '#ffffff')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                activeBatchTemplate?.elementStyles?.userCode?.backgroundColor === '#ffffff' && activeBatchTemplate?.codeBoxStyle !== 'transparent'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              أبيض
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                      <span className="text-slate-400 text-[11px] block mb-1">تلميح السحب المباشر:</span>
                      <span className="text-[11px] text-slate-300 leading-tight">
                        اسحب <strong>الكارت رقم 1</strong> بالماوس يمنة ويسرة لتغيير مكان هذا العنصر بحرية!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Printable Sheet Viewport */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-inner flex justify-center p-4">
              <div
                className="overflow-y-auto max-h-[70vh] w-full flex justify-center custom-scrollbar"
                style={{ direction: 'rtl' }}
              >
                <div id="um-print-sheet" ref={printAreaRef} className="flex flex-col items-center gap-6">
                  {(previewPageMode === 'single_page'
                    ? [previewPages[activePreviewPage] || []]
                    : previewPages
                  ).map((pageCards, pageIdx) => {
                    const pageDisplayNumber = previewPageMode === 'single_page' ? activePreviewPage + 1 : pageIdx + 1;
                    return (
                      <div key={`page-sheet-${previewPageMode === 'single_page' ? activePreviewPage : pageIdx}`} className="flex flex-col items-center gap-2 w-full">
                        {totalPages > 1 && (
                          <div className="text-[11px] font-bold text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-2 print:hidden select-none">
                            <span>ورقة A4 رقم {pageDisplayNumber} من {totalPages}</span>
                            <span className="text-purple-400">({pageCards.length} كارت)</span>
                          </div>
                        )}

                        <div
                          className="a4-print-page bg-white text-slate-900 shadow-xl relative select-none"
                          style={{
                            width: '210mm',
                            height: '297mm',
                            maxHeight: '297mm',
                            padding: `${activeBatchTemplate?.pageMarginMm ?? 4}mm`,
                            boxSizing: 'border-box',
                            display: 'grid',
                            gridTemplateColumns: `repeat(${activeBatchTemplate?.gridCols || 4}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${activeBatchTemplate?.gridRows || 5}, minmax(0, 1fr))`,
                            gap: `${activeBatchTemplate?.cardGapMm ?? 1}mm`,
                            justifyItems: 'stretch',
                            alignItems: 'stretch',
                            direction: 'rtl',
                            overflow: 'hidden',
                            pageBreakAfter: 'always',
                          }}
                        >
                          {pageCards.map((card, cIdx) => (
                            <div key={card.serial || card.username || `card-pos-${pageIdx}-${cIdx}`} className="w-full h-full min-h-0 min-w-0 overflow-hidden relative">
                              {isInteractivePreview && pageIdx === 0 && cIdx === 0 && (
                                <div className="absolute top-1 left-1 z-30 pointer-events-none bg-purple-600/90 text-white font-black text-[8px] px-1.5 py-0.5 rounded shadow-xs">
                                  كارت التعديل الحي
                                </div>
                              )}
                              <PrintableCard
                                template={activeBatchTemplate}
                                networkName={settings.networkName || 'شبكة جلوبل نت'}
                                networkSlogan={settings.networkSlogan}
                                username={card.username}
                                password={card.pin}
                                profileName={card.profile}
                                serial={card.serial}
                                price={profiles.find((p) => p.name === card.profile)?.price}
                                currency={settings.currencySymbol}
                                supportPhone={settings.supportPhone}
                                posPointName={chosenPosName}
                                interactive={isInteractivePreview && pageIdx === 0 && cIdx === 0}
                                selectedElementKey={selectedElementKey}
                                onSelectElement={setSelectedElementKey}
                                onUpdatePosition={handleUpdateTemplatePosition}
                                validity={activeBatchTemplate?.validityText}
                                hotspotDns={settings.hotspotDns}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
            {routers.map((r, idx) => (
              <div key={r.id || r.name || `um-router-${idx}`} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
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
                  <h3 className="text-base font-bold text-white">
                    {isEditingProfile ? `تعديل بروفايل اليوزر مانجر: ${profileFormData.profileName}` : 'إضافة وتفعيل بروفايل في User Manager'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditingProfile ? 'تعديل بيانات البروفايل، السرعة، الحصة وصلاحية الكارت في الراوتر مباشرة' : 'إنشاء البروفايل وربط القيد (Limitation) وتطبيقه على الراوتر'}
                  </p>
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
                      type="text" inputMode="decimal"
                      value={profileFormData.price}
                      onChange={(e) => setProfileFormData({ ...profileFormData, price: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الصلاحية (بالأيام):</label>
                    <input
                      type="text" inputMode="decimal"
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
                  <span>{isEditingProfile ? 'حفظ التعديلات في الراوتر' : 'حفظ وتطبيق البروفايل في الراوتر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      <UserManagerCardEditModal
        isOpen={Boolean(cardToEdit)}
        user={cardToEdit}
        profiles={profiles}
        config={config}
        onClose={() => setCardToEdit(null)}
        onSaved={(updated) => {
          setUsers((prev) =>
            prev.map((u) => (u.id === updated.id || u.name === updated.name ? updated : u))
          );
          setActionFeedback({
            success: true,
            message: `تم تحديث بيانات الكارت (${updated.name}) بنجاح في اليوزر مانجر.`,
          });
        }}
        onResetCounters={(userId, userName) => {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId || u.name === userName
                ? { ...u, uptimeUsed: '0s', downloadUsed: 0, uploadUsed: 0, totalBytes: 0 }
                : u
            )
          );
          setActionFeedback({
            success: true,
            message: `تم تصفير عدادات استهلاك الكارت (${userName}) بنجاح.`,
          });
        }}
      />

      {/* Card Sessions & Statistics Modal */}
      <UserManagerCardSessionsModal
        isOpen={Boolean(cardForSessions)}
        user={cardForSessions}
        config={config}
        onClose={() => setCardForSessions(null)}
        onEditProfile={(u) => {
          setCardToEdit(u);
        }}
      />
    </div>
  );
};
