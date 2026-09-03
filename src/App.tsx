import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Header,
  Sidebar,
  NavView,
  DashboardView,
  POSPointsView,
  PaymentsView,
  SalesView,
  CategoriesView,
  BatchDispatchView,
  MikrotikLiveView,
  InvoicesView,
  InvoiceReceiptModal,
  ExpensesView,
  ExpenseReceiptModal,
  POSAccountStatementModal,
  PaymentModal,
  AIAssistantModal,
  NetworkSettingsModal,
  SaleReceiptModal,
  OfficialPaymentReceiptModal,
  UsersAndPermissionsView,
  LoginView,
  AccessDeniedView,
  IncomeStatementModal,
  FinancialExportModal,
  GlobalSearchModal,
  POSPortalView,
  OrdersManagementView,
  ChangePasswordModal,
  SystemTenantsView,
  AboutProgramModal,
  DatabaseBackupModal,
} from './components';
import {
  CardCategory,
  POSPoint,
  SalesRecord,
  PaymentRecord,
  CardBatchDispatch,
  NetworkSettings,
  InvoiceRecord,
  ExpenseRecord,
  ExpenseCategory,
  AppUser,
  UserPermissions,
  UserActivityLog,
  CardOrder,
  NetworkTenant,
  CardTemplate,
} from './types';
import {
  loadData,
  saveData,
  STORAGE_KEYS,
  resetToMockData,
  calculatePOSInventory,
  calculatePOSBalance,
  synchronizePOSBalances,
  generateNextInvoiceNumber,
  generateNextExpenseVoucherNumber,
  generateNextPaymentReceiptNumber,
  generateNextOrderNumber,
} from './utils/storage';
import {
  mockCategories,
  mockPOSPoints,
  mockDispatches,
  mockSales,
  mockPayments,
  mockInvoices,
  mockExpenses,
  mockExpenseCategories,
  mockUsers,
  mockTenants,
  mockCardOrders,
  defaultNetworkSettings,
  initialTemplates,
} from './mockData';
import { loadTenantDataFromFirestore } from './services/cloudSync';
import { initialActivityLogs, buildActivityLog } from './utils/auditLogger';
import { applyCreationAudit, applyUpdateAudit } from './utils/auditTrigger';
import {
  getDefaultLandingViewForUser,
  hasPermission,
  getViewNameArabic,
  ROLE_DEFINITIONS,
  getRoleDefaultPermissions,
} from './utils/permissions';
import { CheckCircle2, LogIn, Sparkles, X, ShieldAlert, Network, Phone, LogOut } from 'lucide-react';
import { logout as firebaseLogout } from './firebase';
import { getDriveAccessToken, uploadBackupToGoogleDrive } from './services/googleDriveService';
import { generateSystemBackup } from './utils/backupGenerator';
import { exportToJSON } from './utils/storage';

// Wipe any previous stale demo data once to ensure pristine master-only state as requested
const MASTER_ONLY_RESET_FLAG = 'mikrotik_v4_master_only_clean_reset';
if (typeof window !== 'undefined' && !localStorage.getItem(MASTER_ONLY_RESET_FLAG)) {
  resetToMockData();
  localStorage.setItem(MASTER_ONLY_RESET_FLAG, 'true');
}

export default function App() {
  // Navigation View State
  const [activeView, setActiveView] = useState<NavView>('system_tenants');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States
  const [templates, setTemplates] = useState<CardTemplate[]>(() => {
    const saved = localStorage.getItem('mikrotik_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CardTemplate[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasNew = parsed.some((t) => t.id === 'tpl-network-voucher-20');
          return hasNew ? parsed : [initialTemplates[0], ...parsed];
        }
      } catch (e) {
        console.error('Error parsing templates:', e);
      }
    }
    return initialTemplates;
  });

  useEffect(() => {
    localStorage.setItem('mikrotik_templates', JSON.stringify(templates));
  }, [templates]);

  const [categories, setCategories] = useState<CardCategory[]>(() =>
    loadData<CardCategory[]>(STORAGE_KEYS.CATEGORIES, mockCategories)
  );
  const [posPoints, setPosPoints] = useState<POSPoint[]>(() => {
    const rawPos = loadData<POSPoint[]>(STORAGE_KEYS.POS_POINTS, mockPOSPoints);
    const rawInvoices = loadData<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, mockInvoices);
    const rawSales = loadData<SalesRecord[]>(STORAGE_KEYS.SALES, mockSales);
    const rawPayments = loadData<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, mockPayments);
    const rawDispatches = loadData<CardBatchDispatch[]>(STORAGE_KEYS.DISPATCHES, mockDispatches);
    return synchronizePOSBalances(rawPos, rawInvoices, rawSales, rawPayments, rawDispatches);
  });
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() =>
    loadData<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, mockInvoices)
  );
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() =>
    loadData<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, mockExpenses)
  );
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() =>
    loadData<ExpenseCategory[]>(STORAGE_KEYS.EXPENSE_CATEGORIES, mockExpenseCategories)
  );
  const [dispatches, setDispatches] = useState<CardBatchDispatch[]>(() =>
    loadData<CardBatchDispatch[]>(STORAGE_KEYS.DISPATCHES, mockDispatches)
  );
  const [sales, setSales] = useState<SalesRecord[]>(() =>
    loadData<SalesRecord[]>(STORAGE_KEYS.SALES, mockSales)
  );
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    loadData<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, mockPayments)
  );
  const [tenants, setTenants] = useState<NetworkTenant[]>(() => {
    const rawTenants = loadData<NetworkTenant[]>(STORAGE_KEYS.TENANTS, mockTenants);
    const validList = Array.isArray(rawTenants) ? rawTenants : [];
    return validList.map((t, idx) => {
      const validId = t.id || `net-${Date.now() + idx}`;
      const validName = t.name || t.settings?.networkName || `شبكة رقم ${idx + 1}`;
      return {
        ...t,
        id: validId,
        name: validName,
        adminUsername: t.adminUsername || `admin_${validId.replace('net-', '')}`,
        status: t.status || 'active',
        createdAt: t.createdAt || '2026-01-01',
        settings: {
          ...defaultNetworkSettings,
          ...(t.settings || {}),
          networkName: validName,
        },
      };
    });
  });

  const [orders, setOrders] = useState<CardOrder[]>(() =>
    loadData<CardOrder[]>(STORAGE_KEYS.ORDERS, mockCardOrders)
  );

  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>(() =>
    loadData<UserActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, initialActivityLogs)
  );

  const [activeUserId, setActiveUserId] = useState<string>(() =>
    loadData<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'user-system-owner')
  );

  const [users, setUsers] = useState<AppUser[]>(() => {
    const loadedUsers = loadData<AppUser[]>(STORAGE_KEYS.USERS, mockUsers);
    const masterUser = mockUsers.find((u) => u.username === 'master') || mockUsers[0];
    if (!Array.isArray(loadedUsers) || loadedUsers.length === 0) {
      return [masterUser];
    }
    if (!loadedUsers.some((u) => u.username === 'master')) {
      loadedUsers.unshift(masterUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers));
    }
    return loadedUsers;
  });

  // Derive active user object safely
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || mockUsers[0];

  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');

  // Helper to extract or fallback tenant ID for any item
  const getRecordTenantId = useCallback((record?: { networkId?: string }) => {
    if (record?.networkId && record.networkId !== '' && record.networkId !== 'system') {
      return record.networkId;
    }
    return tenants[0]?.id || 'net-microsys';
  }, [tenants]);

  // Active effective tenant for filtering data
  const effectiveTenantId: string | null = useMemo(() => {
    if (activeUser?.role === 'system_owner') {
      return selectedTenantFilter === 'all' ? null : selectedTenantFilter;
    }
    if (activeUser?.networkId && activeUser.networkId !== 'system') {
      return activeUser.networkId;
    }
    return tenants[0]?.id || 'net-microsys';
  }, [activeUser?.role, activeUser?.networkId, selectedTenantFilter, tenants]);

  // Current tenant ID for assigning to new records
  const currentTenantId: string = useMemo(() => {
    if (activeUser?.networkId && activeUser.networkId !== 'system') {
      return activeUser.networkId;
    }
    if (selectedTenantFilter !== 'all' && selectedTenantFilter) {
      return selectedTenantFilter;
    }
    return tenants[0]?.id || 'net-microsys';
  }, [activeUser?.networkId, selectedTenantFilter, tenants]);

  // Automatically derive current tenant object for settings and branding sync
  const currentTenant = useMemo(() => {
    const targetId = activeUser?.role === 'system_owner'
      ? (selectedTenantFilter !== 'all' ? selectedTenantFilter : null)
      : (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : (tenants[0]?.id || 'net-microsys'));
    if (!targetId) return null;
    return tenants.find((t) => t.id === targetId) || null;
  }, [tenants, activeUser?.role, activeUser?.networkId, selectedTenantFilter]);

  // Subscription check
  const { isTenantExpired, tenantExpirationMessage, tenantRemainingDays } = useMemo(() => {
    let expired = false;
    let message = '';
    let remainingDays = 0;
    
    // system_owner bypasses expiration lock entirely
    if (activeUser?.role === 'system_owner') {
      return { isTenantExpired: false, tenantExpirationMessage: '', tenantRemainingDays: null };
    }
    
    if (effectiveTenantId) {
      const tenant = tenants.find(t => t.id === effectiveTenantId);
      if (tenant) {
        if (tenant.status === 'suspended') {
          expired = true;
          message = `تم إيقاف حساب الشبكة (${tenant.name}) مؤقتاً. يرجى التواصل مع الإدارة.`;
        } else if (tenant.subscriptionPlan === 'lifetime') {
          // No expiration
        } else if (tenant.subscriptionEndDate) {
          const endDate = new Date(tenant.subscriptionEndDate);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (remainingDays < 0) {
            expired = true;
            message = `لقد انتهت فترة اشتراك الشبكة (${tenant.name}) منذ ${Math.abs(remainingDays)} يوم. يرجى التواصل مع الإدارة لتجديد الاشتراك.`;
          }
        }
      }
    }
    return { isTenantExpired: expired, tenantExpirationMessage: message, tenantRemainingDays: remainingDays };
  }, [effectiveTenantId, tenants, activeUser?.role]);

  const [settings, setSettings] = useState<NetworkSettings>(() => {
    if (currentTenant?.settings) {
      return {
        ...defaultNetworkSettings,
        ...currentTenant.settings,
        networkName: currentTenant.name || currentTenant.settings.networkName,
      };
    }
    return loadData<NetworkSettings>(STORAGE_KEYS.SETTINGS, defaultNetworkSettings);
  });

  // Keep settings automatically synchronized with active tenant
  useEffect(() => {
    if (currentTenant && currentTenant.settings) {
      const targetSettings: NetworkSettings = {
        ...defaultNetworkSettings,
        ...currentTenant.settings,
        networkName: currentTenant.name || currentTenant.settings.networkName,
      };
      if (
        settings.networkName !== targetSettings.networkName ||
        settings.currency !== targetSettings.currency ||
        settings.currencySymbol !== targetSettings.currencySymbol ||
        settings.networkSlogan !== targetSettings.networkSlogan ||
        settings.supportPhone !== targetSettings.supportPhone ||
        settings.whatsappNumber !== targetSettings.whatsappNumber ||
        settings.hotspotDns !== targetSettings.hotspotDns
      ) {
        setSettings(targetSettings);
        saveData(STORAGE_KEYS.SETTINGS, targetSettings);
      }
    } else if (activeUser?.role === 'system_owner' && selectedTenantFilter === 'all') {
      if (settings.networkName !== defaultNetworkSettings.networkName) {
        setSettings(defaultNetworkSettings);
        saveData(STORAGE_KEYS.SETTINGS, defaultNetworkSettings);
      }
    }
  }, [currentTenant, activeUser?.role, selectedTenantFilter]);

  // Scoped collections based on tenant isolation
  const scopedCategories = useMemo(() => 
    effectiveTenantId ? categories.filter((c) => getRecordTenantId(c) === effectiveTenantId) : categories,
    [categories, effectiveTenantId, getRecordTenantId]
  );

  const scopedPOSPoints = useMemo(() => 
    effectiveTenantId ? posPoints.filter((p) => getRecordTenantId(p) === effectiveTenantId) : posPoints,
    [posPoints, effectiveTenantId, getRecordTenantId]
  );

  const scopedInvoices = useMemo(() => 
    effectiveTenantId ? invoices.filter((i) => getRecordTenantId(i) === effectiveTenantId) : invoices,
    [invoices, effectiveTenantId, getRecordTenantId]
  );

  const scopedExpenses = useMemo(() => 
    effectiveTenantId ? expenses.filter((e) => getRecordTenantId(e) === effectiveTenantId) : expenses,
    [expenses, effectiveTenantId, getRecordTenantId]
  );

  const scopedExpenseCategories = useMemo(() => 
    effectiveTenantId ? expenseCategories.filter((ec) => getRecordTenantId(ec) === effectiveTenantId) : expenseCategories,
    [expenseCategories, effectiveTenantId, getRecordTenantId]
  );

  const scopedDispatches = useMemo(() => 
    effectiveTenantId ? dispatches.filter((d) => getRecordTenantId(d) === effectiveTenantId) : dispatches,
    [dispatches, effectiveTenantId, getRecordTenantId]
  );

  const scopedSales = useMemo(() => 
    effectiveTenantId ? sales.filter((s) => getRecordTenantId(s) === effectiveTenantId) : sales,
    [sales, effectiveTenantId, getRecordTenantId]
  );

  const scopedPayments = useMemo(() => 
    effectiveTenantId ? payments.filter((p) => getRecordTenantId(p) === effectiveTenantId) : payments,
    [payments, effectiveTenantId, getRecordTenantId]
  );

  const scopedOrders = useMemo(() => 
    effectiveTenantId ? orders.filter((o) => getRecordTenantId(o) === effectiveTenantId) : orders,
    [orders, effectiveTenantId, getRecordTenantId]
  );

  const scopedUsers = useMemo(() => 
    effectiveTenantId 
      ? users.filter((u) => u.role !== 'system_owner' && getRecordTenantId(u) === effectiveTenantId) 
      : (activeUser?.role === 'system_owner' && selectedTenantFilter === 'all' 
          ? users.filter((u) => u.role !== 'system_owner') 
          : users),
    [users, effectiveTenantId, getRecordTenantId, activeUser?.role, selectedTenantFilter]
  );

  const scopedActivityLogs = useMemo(() => 
    effectiveTenantId ? activityLogs.filter((l) => getRecordTenantId(l) === effectiveTenantId) : activityLogs,
    [activityLogs, effectiveTenantId, getRecordTenantId]
  );

  // Helper to log user activities
  const logUserActivity = useCallback(
    (
      action: string,
      targetModule: UserActivityLog['targetModule'],
      targetModuleName: string,
      title: string,
      details?: string,
      actionType: UserActivityLog['actionType'] = 'create'
    ) => {
      const newEntry = buildActivityLog(activeUser, {
        action,
        targetModule,
        targetModuleName,
        title,
        details,
        actionType,
      });
      newEntry.networkId = activeUser.networkId || currentTenantId;
      setActivityLogs((prev) => [newEntry, ...prev]);
    },
    [activeUser, currentTenantId]
  );

  // Authentication & Login Modal State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loginModalTargetUser, setLoginModalTargetUser] = useState<AppUser | undefined>(undefined);
  const [userLoginFeedback, setUserLoginFeedback] = useState<{ title: string; subtitle: string } | null>(null);

  // Modal States
  const [statementPOSId, setStatementPOSId] = useState<string | null>(null);
  const [statementPaperMode, setStatementPaperMode] = useState<'a4' | 'pos-80mm'>('a4');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetPOSId, setPaymentTargetPOSId] = useState<string | undefined>(undefined);

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchTargetPOSId, setDispatchTargetPOSId] = useState<string | undefined>(undefined);

  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<InvoiceRecord | null>(null);
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<ExpenseRecord | null>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<SalesRecord | null>(null);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDatabaseBackupOpen, setIsDatabaseBackupOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isIncomeStatementOpen, setIsIncomeStatementOpen] = useState(false);
  const [isFinancialExportModalOpen, setIsFinancialExportModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [quickSalePOSId, setQuickSalePOSId] = useState<string | undefined>(undefined);

  // Global Keyboard Shortcuts (Ctrl+K, Cmd+K, / to open search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
        return;
      }

      // '/' key when not focused in an input/textarea/select
      if (e.key === '/' && !isGlobalSearchOpen) {
        const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
        const isEditable = (e.target as HTMLElement)?.isContentEditable;
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && targetTag !== 'SELECT' && !isEditable) {
          e.preventDefault();
          setIsGlobalSearchOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGlobalSearchOpen]);

  // Persist whenever state changes
  useEffect(() => {
    saveData(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    saveData(STORAGE_KEYS.POS_POINTS, posPoints);
  }, [posPoints]);

  useEffect(() => {
    saveData(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);

  useEffect(() => {
    saveData(STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses]);

  useEffect(() => {
    saveData(STORAGE_KEYS.EXPENSE_CATEGORIES, expenseCategories);
  }, [expenseCategories]);

  useEffect(() => {
    saveData(STORAGE_KEYS.DISPATCHES, dispatches);
  }, [dispatches]);

  useEffect(() => {
    saveData(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  useEffect(() => {
    saveData(STORAGE_KEYS.PAYMENTS, payments);
  }, [payments]);

  useEffect(() => {
    saveData(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    saveData(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    saveData(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  useEffect(() => {
    saveData(STORAGE_KEYS.ACTIVE_USER_ID, activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    saveData(STORAGE_KEYS.ACTIVITY_LOGS, activityLogs);
  }, [activityLogs]);

  // Ensure all POS points have corresponding users (Auto-recovery for existing data)
  useEffect(() => {
    let usersUpdated = false;
    const newUsers = [...users];

    posPoints.forEach(pos => {
      const exists = newUsers.some(u => u.posPointId === pos.id);
      if (!exists) {
        newUsers.push({
          id: `user-${pos.id}`,
          name: pos.name,
          username: pos.username || `pos_${pos.id.slice(-4)}`,
          password: pos.password || '123456',
          pinCode: pos.pinCode || '1234',
          phone: pos.phone,
          role: 'pos_agent',
          posPointId: pos.id,
          customRoleName: 'وكيل / نقطة بيع',
          avatar: '🏪',
          avatarBgColor: 'bg-emerald-600',
          status: pos.status === 'active' ? 'active' : 'inactive',
          permissions: getRoleDefaultPermissions('pos_agent'),
          createdAt: pos.createdAt || new Date().toISOString(),
        });
        usersUpdated = true;
      }
    });

    if (usersUpdated) {
      setUsers(newUsers);
    }
  }, [posPoints, users]);

  // Theme synchronization effect (Dark / Light / System)
  useEffect(() => {
    const theme = settings.themeMode || 'dark';
    const root = document.documentElement;
    const body = document.body;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        body.classList.add('dark');
        body.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        body.classList.add('light');
        body.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [settings.themeMode]);

  // Quick theme toggle handler
  const handleToggleTheme = () => {
    const current = settings.themeMode || 'dark';
    const nextTheme: 'dark' | 'light' = current === 'light' ? 'dark' : 'light';
    const updatedSettings: NetworkSettings = {
      ...settings,
      themeMode: nextTheme,
    };
    setSettings(updatedSettings);

    const log = buildActivityLog(activeUser, {
      action: 'تغيير السمة والمظهر',
      actionType: 'update',
      targetModule: 'system',
      targetModuleName: 'إعدادات النظام',
      title: 'تغيير سمة مظهر النظام',
      details: `تم تغيير سمة واجهة النظام إلى: ${nextTheme === 'dark' ? 'الوضع الليلي (Dark)' : 'الوضع النهاري (Light)'}`,
      status: 'info',
    });
    setActivityLogs((prev) => [log, ...(prev || [])]);
  };

  // Save Settings handler
  const handleSaveSettings = (newSettings: NetworkSettings) => {
    const prevSettings = settings;
    setSettings(newSettings);
    saveData(STORAGE_KEYS.SETTINGS, newSettings);

    const targetTenantId = activeUser?.role === 'system_owner'
      ? (selectedTenantFilter !== 'all' ? selectedTenantFilter : (tenants[0]?.id || 'net-microsys'))
      : (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : (tenants[0]?.id || 'net-microsys'));

    if (targetTenantId) {
      const updatedTenants = tenants.map((t) =>
        t.id === targetTenantId
          ? {
              ...t,
              name: newSettings.networkName || t.name,
              settings: newSettings,
            }
          : t
      );
      setTenants(updatedTenants);
      saveData('mikrotik_pos_tenants', updatedTenants);
    }

    const isThemeChanged = prevSettings.themeMode !== newSettings.themeMode;
    const log = buildActivityLog(activeUser, {
      action: 'تحديث إعدادات النظام',
      actionType: 'update',
      targetModule: 'system',
      targetModuleName: 'إعدادات النظام',
      title: 'تحديث إعدادات الشبكة والنظام',
      details: isThemeChanged
        ? `تم حفظ إعدادات النظام وتغيير السمة إلى: ${newSettings.themeMode === 'dark' ? 'الوضع الليلي' : newSettings.themeMode === 'light' ? 'الوضع النهاري' : 'تلقائي (System)'}`
        : `تم تحديث إعدادات النظام والشبكة بنجاح (${newSettings.networkName || 'الشبكة'})`,
      status: 'info',
    });
    setActivityLogs((prev) => [log, ...(prev || [])]);
  };

  const handleSaveTenant = (tenant: NetworkTenant) => {
    // Extract and remove adminPassword so it doesn't get saved in the tenant object
    const { adminPassword, ...tenantToSave } = tenant;

    const safeId = (tenantToSave.id || `net-${Date.now().toString().slice(-6)}`).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `net-${Date.now()}`;
    const safeName = (tenantToSave.name || tenantToSave.settings?.networkName || 'شبكة لاسلكية جديدة').trim();
    const safeAdminUser = (tenantToSave.adminUsername || `admin_${safeId.replace('net-', '')}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    const guaranteedSettings: NetworkSettings = {
      ...defaultNetworkSettings,
      ...(tenantToSave.settings || {}),
      networkName: safeName,
    };

    const finalTenantToSave: NetworkTenant = {
      ...tenantToSave,
      id: safeId,
      name: safeName,
      adminUsername: safeAdminUser,
      settings: guaranteedSettings,
    };

    const isExisting = tenants.some((t) => t.id === finalTenantToSave.id);
    let updatedTenants: NetworkTenant[];
    if (isExisting) {
      updatedTenants = tenants.map((t) => (t.id === finalTenantToSave.id ? finalTenantToSave : t));
      
      if (adminPassword) {
        const updatedUsers = users.map((u) => 
          (u.networkId === finalTenantToSave.id && u.username === finalTenantToSave.adminUsername)
            ? { ...u, password: adminPassword }
            : u
        );
        setUsers(updatedUsers);
        saveData(STORAGE_KEYS.USERS, updatedUsers);
      }
    } else {
      const adminExists = users.some(u => u.username.toLowerCase() === finalTenantToSave.adminUsername.toLowerCase());
      if (adminExists) {
        alert('اسم المستخدم لمدير الشبكة محجوز أو موجود مسبقاً، يرجى اختيار اسم آخر.');
        return;
      }

      updatedTenants = [...tenants, finalTenantToSave];
      
      const newAdmin: AppUser = {
        id: `user-${Date.now()}`,
        networkId: finalTenantToSave.id,
        name: `مدير ${finalTenantToSave.name}`,
        username: finalTenantToSave.adminUsername,
        password: adminPassword || 'adminpassword',
        pinCode: '1234',
        role: 'super_admin',
        customRoleName: `مدير شبكة ${finalTenantToSave.name}`,
        avatar: '🌐',
        avatarBgColor: 'bg-blue-600',
        status: 'active',
        permissions: getRoleDefaultPermissions('super_admin'),
        createdAt: new Date().toISOString().split('T')[0],
      };
      const updatedUsers = [...users, newAdmin];
      setUsers(updatedUsers);
      saveData(STORAGE_KEYS.USERS, updatedUsers);

      // Initialize default card categories and expense categories for this new tenant
      const defaultCategoriesForNewTenant: CardCategory[] = [
        {
          id: `cat-${finalTenantToSave.id}-1`,
          networkId: finalTenantToSave.id,
          name: 'فئة 100 ريال (1 جيجا)',
          code: '100_1D',
          retailPrice: 100,
          wholesalePrice: 90,
          costPrice: 70,
          warehouseStock: 200,
          validityDays: 1,
          uptimeLimit: '24h',
          quotaLimit: '1G',
          colorTheme: 'indigo',
          mikrotikProfile: '1GB-1Day',
        },
        {
          id: `cat-${finalTenantToSave.id}-2`,
          networkId: finalTenantToSave.id,
          name: 'فئة 200 ريال (2.5 جيجا)',
          code: '200_3D',
          retailPrice: 200,
          wholesalePrice: 180,
          costPrice: 140,
          warehouseStock: 150,
          validityDays: 3,
          uptimeLimit: '72h',
          quotaLimit: '2.5G',
          colorTheme: 'cyan',
          mikrotikProfile: '2.5GB-3Days',
        },
        {
          id: `cat-${finalTenantToSave.id}-3`,
          networkId: finalTenantToSave.id,
          name: 'فئة 500 ريال (7 جيجا)',
          code: '500_7D',
          retailPrice: 500,
          wholesalePrice: 450,
          costPrice: 350,
          warehouseStock: 100,
          validityDays: 7,
          uptimeLimit: '168h',
          quotaLimit: '7G',
          colorTheme: 'purple',
          mikrotikProfile: '7GB-7Days',
        },
      ];
      setCategories((prev) => {
        const nextCats = [...prev, ...defaultCategoriesForNewTenant];
        saveData(STORAGE_KEYS.CATEGORIES, nextCats);
        return nextCats;
      });

      const defaultExpenseCategoriesForNewTenant: ExpenseCategory[] = [
        { id: `expcat-${finalTenantToSave.id}-1`, networkId: finalTenantToSave.id, name: 'سعات وخطوط الإنترنت (Bandwidth)' },
        { id: `expcat-${finalTenantToSave.id}-2`, networkId: finalTenantToSave.id, name: 'إيجار الأبراج والمواقع' },
        { id: `expcat-${finalTenantToSave.id}-3`, networkId: finalTenantToSave.id, name: 'الكهرباء والطاقة الشمسية' },
        { id: `expcat-${finalTenantToSave.id}-4`, networkId: finalTenantToSave.id, name: 'الصيانة والقطع الفنية' },
        { id: `expcat-${finalTenantToSave.id}-5`, networkId: finalTenantToSave.id, name: 'مصاريف تسويق ومطبوعات' },
      ];
      setExpenseCategories((prev) => {
        const nextExpCats = [...prev, ...defaultExpenseCategoriesForNewTenant];
        saveData(STORAGE_KEYS.EXPENSE_CATEGORIES, nextExpCats);
        return nextExpCats;
      });
    }
    setTenants(updatedTenants);
    saveData(STORAGE_KEYS.TENANTS, updatedTenants);

    if (activeUser?.networkId === finalTenantToSave.id || effectiveTenantId === finalTenantToSave.id) {
      setSettings(guaranteedSettings);
      saveData(STORAGE_KEYS.SETTINGS, guaranteedSettings);
    }
    
    logUserActivity(
      isExisting ? 'تحديث بيانات شبكة' : 'إضافة شبكة جديدة',
      'systemTenants',
      'إدارة جوار الشبكات (Multi-Tenant SaaS)',
      `تم ${isExisting ? 'تحديث' : 'إضافة'} شبكة: ${finalTenantToSave.name}`,
      `اسم مستخدم الإدارة: @${finalTenantToSave.adminUsername}`,
      'create'
    );
  };

  const handleDeleteTenant = (tenantId: string) => {
    const tenantToDelete = tenants.find((t) => t.id === tenantId);
    if (!tenantToDelete) return;

    const updatedTenants = tenants.filter((t) => t.id !== tenantId);
    setTenants(updatedTenants);
    saveData(STORAGE_KEYS.TENANTS, updatedTenants);

    // Cascade remove all records associated with this tenant
    setUsers((prev) => {
      const next = prev.filter((u) => getRecordTenantId(u) !== tenantId);
      saveData(STORAGE_KEYS.USERS, next);
      return next;
    });
    setCategories((prev) => {
      const next = prev.filter((c) => getRecordTenantId(c) !== tenantId);
      saveData(STORAGE_KEYS.CATEGORIES, next);
      return next;
    });
    setPosPoints((prev) => {
      const next = prev.filter((p) => getRecordTenantId(p) !== tenantId);
      saveData(STORAGE_KEYS.POS_POINTS, next);
      return next;
    });
    setInvoices((prev) => {
      const next = prev.filter((i) => getRecordTenantId(i) !== tenantId);
      saveData(STORAGE_KEYS.INVOICES, next);
      return next;
    });
    setExpenses((prev) => {
      const next = prev.filter((e) => getRecordTenantId(e) !== tenantId);
      saveData(STORAGE_KEYS.EXPENSES, next);
      return next;
    });
    setExpenseCategories((prev) => {
      const next = prev.filter((ec) => getRecordTenantId(ec) !== tenantId);
      saveData(STORAGE_KEYS.EXPENSE_CATEGORIES, next);
      return next;
    });
    setDispatches((prev) => {
      const next = prev.filter((d) => getRecordTenantId(d) !== tenantId);
      saveData(STORAGE_KEYS.DISPATCHES, next);
      return next;
    });
    setSales((prev) => {
      const next = prev.filter((s) => getRecordTenantId(s) !== tenantId);
      saveData(STORAGE_KEYS.SALES, next);
      return next;
    });
    setPayments((prev) => {
      const next = prev.filter((p) => getRecordTenantId(p) !== tenantId);
      saveData(STORAGE_KEYS.PAYMENTS, next);
      return next;
    });
    setOrders((prev) => {
      const next = prev.filter((o) => getRecordTenantId(o) !== tenantId);
      saveData(STORAGE_KEYS.ORDERS, next);
      return next;
    });
    setActivityLogs((prev) => {
      const next = prev.filter((l) => getRecordTenantId(l) !== tenantId);
      saveData(STORAGE_KEYS.ACTIVITY_LOGS, next);
      return next;
    });

    if (selectedTenantFilter === tenantId) {
      setSelectedTenantFilter('all');
    }

    if (activeUser?.networkId === tenantId) {
      const fallbackUser = users.find((u) => u.role === 'system_owner') || users[0] || mockUsers[0];
      if (fallbackUser) {
        setActiveUserId(fallbackUser.id);
        saveData(STORAGE_KEYS.ACTIVE_USER_ID, fallbackUser.id);
      }
    }

    logUserActivity(
      'حذف شبكة',
      'systemTenants',
      'إدارة جوار الشبكات (Multi-Tenant SaaS)',
      `تم حذف شبكة: ${tenantToDelete.name} مع جميع مستخدميها وبياناتها`,
      undefined,
      'delete'
    );
  };

  // Recalculate POS Debts dynamically using invoices, sales, and payments
  const refreshPOSBalances = useCallback(
    (
      currentPOS: POSPoint[] = [],
      currentInvoices: InvoiceRecord[] = [],
      currentSales: SalesRecord[] = [],
      currentPayments: PaymentRecord[] = []
    ) => {
      const safePOS = currentPOS || [];
      const safeInvoices = currentInvoices || [];
      const safeSales = currentSales || [];
      const safePayments = currentPayments || [];

      return safePOS.map((pos) => {
        if (!pos) return pos;
        const balance = calculatePOSBalance(pos.id, safeSales, safePayments, dispatches, safeInvoices);
        const currentDebt = Math.max(0, balance.currentDebt);
        return {
          ...pos,
          currentDebt,
          totalCardsDelivered: balance.totalCardsDelivered,
          totalCardsSold: balance.totalRetailSales > 0 ? pos.totalCardsSold : pos.totalCardsSold,
          totalCashPaid: balance.totalPaid,
        };
      });
    },
    [dispatches]
  );

  // 1. POS Actions
  const handleAddPOS = (newPosData: Omit<POSPoint, 'id' | 'createdAt'>) => {
    const newPosId = `pos-${Date.now()}`;
    const cleanPhone = newPosData.phone ? newPosData.phone.replace(/[^0-9]/g, '') : '';
    const finalUsername = newPosData.username?.trim() || (cleanPhone ? 'pos_' + cleanPhone : 'pos_' + newPosId.slice(-4));
    const finalPassword = newPosData.password?.trim() || '123456';
    const finalPin = newPosData.pinCode?.trim() || '1234';

    const rawPos: POSPoint = {
      ...newPosData,
      id: newPosId,
      networkId: newPosData.networkId || currentTenantId,
      username: finalUsername,
      password: finalPassword,
      pinCode: finalPin,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const newPos = applyCreationAudit(rawPos, activeUser, {
      actionTitle: 'إنشاء نقطة بيع وحساب بوابة',
      details: `تمت إضافة نقطة البيع (${rawPos.name}) بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setPosPoints((prev) => [...prev, newPos]);

    // Create synchronized Portal user for the POS Point
    const rawPosUser: AppUser = {
      id: `user-${newPos.id}`,
      networkId: newPos.networkId,
      name: newPos.name,
      username: finalUsername,
      password: finalPassword,
      pinCode: finalPin,
      phone: newPos.phone,
      role: 'pos_agent',
      posPointId: newPos.id,
      customRoleName: 'وكيل / نقطة بيع',
      avatar: '🏪',
      avatarBgColor: 'bg-emerald-600',
      status: newPos.status === 'active' ? 'active' : 'inactive',
      permissions: getRoleDefaultPermissions('pos_agent'),
      createdAt: newPos.createdAt,
    };
    const posUser = applyCreationAudit(rawPosUser, activeUser, {
      actionTitle: 'إنشاء حساب مستخدم لنقطة البيع',
    });
    setUsers((prev) => [...prev.filter((u) => u.posPointId !== newPos.id && u.username !== finalUsername), posUser]);

    logUserActivity(
      'إضافة نقطة بيع وحساب بوابة',
      'pos',
      'نقاط البيع والموزعين',
      `إضافة نقطة بيع جديدة: ${newPos.name}`,
      `اسم المستخدم للبوابة: @${finalUsername} - رمز PIN: ${finalPin} - سقف الدين: ${(newPos.maxDebtLimit ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'create'
    );
  };

  const handleUpdatePOS = (updatedPOSData: POSPoint) => {
    const existing = posPoints.find((p) => p.id === updatedPOSData.id) || updatedPOSData;
    const updatedPOS = applyUpdateAudit(existing, updatedPOSData, activeUser, {
      actionTitle: 'تعديل بيانات نقطة البيع',
      details: `تم تحديث بيانات النقطة بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setPosPoints((prev) => prev.map((p) => (p.id === updatedPOS.id ? updatedPOS : p)));

    // Synchronize POS portal user account
    setUsers((prev) => {
      const userExists = prev.some((u) => u.posPointId === updatedPOS.id);
      
      if (userExists) {
        return prev.map((u) => {
          if (u.posPointId === updatedPOS.id) {
            return {
              ...u,
              name: updatedPOS.name,
              username: updatedPOS.username || u.username,
              password: updatedPOS.password || u.password,
              pinCode: updatedPOS.pinCode || u.pinCode,
              phone: updatedPOS.phone || u.phone,
              status: updatedPOS.status === 'active' ? 'active' : 'inactive',
            };
          }
          return u;
        });
      } else {
        // Create the missing user account if it doesn't exist yet
        const rawPosUser: AppUser = {
          id: `user-${updatedPOS.id}`,
          name: updatedPOS.name,
          username: updatedPOS.username || `pos_${updatedPOS.id.slice(-4)}`,
          password: updatedPOS.password || '123456',
          pinCode: updatedPOS.pinCode || '1234',
          phone: updatedPOS.phone,
          role: 'pos_agent',
          posPointId: updatedPOS.id,
          customRoleName: 'وكيل / نقطة بيع',
          avatar: '🏪',
          avatarBgColor: 'bg-emerald-600',
          status: updatedPOS.status === 'active' ? 'active' : 'inactive',
          permissions: getRoleDefaultPermissions('pos_agent'),
          createdAt: new Date().toISOString(),
        };
        const posUser = applyCreationAudit(rawPosUser, activeUser, {
          actionTitle: 'إنشاء حساب بوابة لموزع',
        });
        return [...prev.filter(u => u.username !== posUser.username), posUser];
      }
    });

    logUserActivity(
      'تعديل نقطة بيع وحساب البوابة',
      'pos',
      'نقاط البيع والموزعين',
      `تعديل بيانات نقطة البيع: ${updatedPOS.name}`,
      `تم تحديث بيانات النقطة وحساب الدخول الخاص بها`,
      'update'
    );
  };

  const handleDeletePOS = (posId: string, cascade?: boolean) => {
    const target = posPoints.find((p) => p.id === posId);
    if (!target) return;

    // Remove associated portal user
    setUsers((prev) => prev.filter((u) => u.posPointId !== posId));

    if (cascade) {
      const nextSales = sales.filter((s) => s.posPointId !== posId);
      const nextInvoices = invoices.filter((inv) => inv.posPointId !== posId);
      const nextPayments = payments.filter((p) => p.posPointId !== posId);
      setSales(nextSales);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setDispatches((prev) => prev.filter((d) => d.posPointId !== posId));
      setPosPoints((prev) => refreshPOSBalances(prev.filter((p) => p.id !== posId), nextInvoices, nextSales, nextPayments));
      return;
    }
    setPosPoints((prev) => prev.filter((p) => p.id !== posId));

    logUserActivity(
      'حذف نقطة بيع',
      'pos',
      'نقاط البيع والموزعين',
      `حذف نقطة البيع: ${target.name}`,
      `تم حذف النقطة وحساب البوابة المرتبط بها`,
      'delete'
    );
  };

  // 2. Invoices Actions (Sales & Returns with multiple categories)
  const handleAddInvoice = (invoiceData: Omit<InvoiceRecord, 'id' | 'timestamp'>) => {
    const autoNumber = generateNextInvoiceNumber(invoices, invoiceData.type, invoiceData.date);
    const finalInvoiceNumber = invoiceData.invoiceNumber?.trim() || autoNumber;

    const rawInvoice: InvoiceRecord = {
      ...invoiceData,
      networkId: invoiceData.networkId || currentTenantId,
      invoiceNumber: finalInvoiceNumber,
      id: `inv-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const newInvoice = applyCreationAudit(rawInvoice, activeUser, {
      actionTitle: rawInvoice.type === 'sale' ? 'إصدار فاتورة مبيعات' : 'إصدار فاتورة مرتجع',
      actionType: 'financial',
      details: `إصدار فاتورة بقيمة ${(rawInvoice.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
    });

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);

    // Adjust category warehouse stock for each item in the invoice
    setCategories((prevCategories) => {
      return prevCategories.map((cat) => {
        const items = newInvoice.items.filter((i) => i.categoryId === cat.id);
        if (items.length === 0) return cat;

        let stockChange = 0;
        items.forEach(item => {
          if (newInvoice.type === 'sale') {
            // Deduct from warehouse stock when cards are sold/dispatched
            stockChange -= item.quantity;
          } else if (newInvoice.type === 'return') {
            // Return cards back to warehouse stock
            stockChange += item.quantity;
          }
        });

        return {
          ...cat,
          warehouseStock: Math.max(0, cat.warehouseStock + stockChange),
        };
      });
    });

    // Update POS balances
    setPosPoints((prev) => refreshPOSBalances(prev, nextInvoices, sales, payments));

    // Audit Log Entry
    const targetPos = posPoints.find((p) => p.id === newInvoice.posPointId);
    logUserActivity(
      newInvoice.type === 'sale' ? 'إصدار فاتورة مبيعات' : 'إصدار فاتورة مرتجع',
      'invoices',
      'الفواتير والمبيعات',
      `إصدار فاتورة رقم ${newInvoice.invoiceNumber} (${newInvoice.items.length} بنود)`,
      `العميل/نقطة البيع: ${targetPos?.name || 'مباشر'} - القيمة الإجمالية: ${(newInvoice.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol} - بسعر الجمهور: ${(newInvoice.totalRetailAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'financial'
    );

    // Show invoice receipt modal
    setSelectedInvoiceForReceipt(newInvoice);
  };

  const handleUpdateInvoice = (updatedInvoiceData: InvoiceRecord) => {
    const existing = invoices.find((inv) => inv.id === updatedInvoiceData.id);
    if (!existing) return;

    // Adjust warehouse stock: reverse old, apply new
    if (existing.status !== 'cancelled' && updatedInvoiceData.status !== 'cancelled') {
      setCategories((prev) => 
        prev.map((cat) => {
          const oldItems = existing.items.filter((i) => i.categoryId === cat.id);
          const newItems = updatedInvoiceData.items.filter((i) => i.categoryId === cat.id);
          
          if (oldItems.length === 0 && newItems.length === 0) return cat;

          let stockChange = 0;
          
          oldItems.forEach(oldItem => {
             const reverseStock = existing.type === 'sale' ? oldItem.quantity : -oldItem.quantity;
             stockChange += reverseStock;
          });

          newItems.forEach(newItem => {
             const applyStock = updatedInvoiceData.type === 'sale' ? -newItem.quantity : newItem.quantity;
             stockChange += applyStock;
          });

          return {
            ...cat,
            warehouseStock: Math.max(0, cat.warehouseStock + stockChange)
          };
        })
      );
    }

    const updatedInvoice = applyUpdateAudit(existing, updatedInvoiceData, activeUser, {
      actionTitle: 'تعديل بيانات الفاتورة',
      actionType: 'financial',
      details: `تعديل الفاتورة رقم ${updatedInvoiceData.invoiceNumber} بواسطة ${activeUser?.name || 'المدير'}`,
    });

    const nextInvoices = invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    setInvoices(nextInvoices);
    setPosPoints((prev) => refreshPOSBalances(prev, nextInvoices, sales, payments));
    
    logUserActivity(
      'تعديل فاتورة',
      'invoices',
      'الفواتير والمبيعات',
      `تعديل بيانات الفاتورة رقم ${updatedInvoice.invoiceNumber}`,
      `القيمة المعدلة: ${(updatedInvoice.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'update'
    );
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const toDelete = invoices.find((inv) => inv.id === invoiceId);
    if (!toDelete) return;

    // Restore warehouse stock
    if (toDelete.status !== 'cancelled') {
      setCategories((prev) =>
        prev.map((cat) => {
          const item = toDelete.items.find((i) => i.categoryId === cat.id);
          if (!item) return cat;
          const reverseStock = toDelete.type === 'sale' ? item.quantity : -item.quantity;
          return {
            ...cat,
            warehouseStock: Math.max(0, cat.warehouseStock + reverseStock),
          };
        })
      );
    }

    const nextInvoices = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(nextInvoices);
    setPosPoints((prev) => refreshPOSBalances(prev, nextInvoices, sales, payments));

    // Audit Log
    logUserActivity(
      'حذف فاتورة نهائياً',
      'invoices',
      'الفواتير والمبيعات',
      `حذف الفاتورة رقم ${toDelete.invoiceNumber}`,
      `تم حذف الفاتورة وقيمتها ${(toDelete.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'delete'
    );
  };

  const handleCancelInvoice = (invoiceId: string) => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target || target.status === 'cancelled') return;

    // Restore warehouse stock
    setCategories((prev) =>
      prev.map((cat) => {
        const item = target.items.find((i) => i.categoryId === cat.id);
        if (!item) return cat;
        const reverseStock = target.type === 'sale' ? item.quantity : -item.quantity;
        return {
          ...cat,
          warehouseStock: Math.max(0, cat.warehouseStock + reverseStock),
        };
      })
    );

    const nextInvoices = invoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, status: 'cancelled' as const } : inv
    );
    setInvoices(nextInvoices);
    setPosPoints((prev) => refreshPOSBalances(prev, nextInvoices, sales, payments));

    // Audit Log
    logUserActivity(
      'إلغاء فاتورة',
      'invoices',
      'الفواتير والمبيعات',
      `إلغاء الفاتورة رقم ${target.invoiceNumber}`,
      `تم إلغاء الفاتورة بقيمة ${(target.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'delete'
    );
  };

  // 2.5 Card Orders & POS Portal Actions (طلبات الكروت وبوابة الموزعين)
  const handleCreateOrder = (orderData: Omit<CardOrder, 'id' | 'orderNumber' | 'timestamp' | 'status' | 'requestDate'> & { requestDate?: string; timestamp?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    const nextOrderNumber = generateNextOrderNumber(orders, today);
    const posPoint = posPoints.find((p) => p.id === orderData.posPointId);

    const items = orderData.items || [];
    const totalQuantity = orderData.totalQuantity ?? items.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const totalWholesaleAmount = orderData.totalWholesaleAmount ?? items.reduce((acc, it) => acc + (it.totalWholesalePrice || ((it.quantity || 0) * (it.unitWholesalePrice || 0)) || 0), 0);
    const totalRetailAmount = orderData.totalRetailAmount ?? items.reduce((acc, it) => acc + (it.totalRetailPrice || ((it.quantity || 0) * (it.unitRetailPrice || 0)) || 0), 0);

    const rawOrder: CardOrder = {
      ...orderData,
      posPointName: orderData.posPointName || posPoint?.name || 'نقطة بيع غير محددة',
      posPhone: orderData.posPhone || posPoint?.phone || '',
      posAddress: orderData.posAddress || posPoint?.address || '',
      posManagerName: orderData.posManagerName || posPoint?.managerName || '',
      currentDebtAtRequest: orderData.currentDebtAtRequest ?? (posPoint?.currentDebt || 0),
      totalQuantity,
      totalWholesaleAmount,
      totalRetailAmount,
      networkId: orderData.networkId || currentTenantId,
      id: `ord-${Date.now()}`,
      orderNumber: nextOrderNumber,
      status: 'pending',
      requestDate: orderData.requestDate || today,
      timestamp: orderData.timestamp || new Date().toISOString(),
    };

    const newOrder = applyCreationAudit(rawOrder, activeUser, {
      actionTitle: 'طلب كروت جديد',
      details: `تقديم طلب كروت رقم ${rawOrder.orderNumber} لصالح (${rawOrder.posPointName})`,
    });

    setOrders((prev) => {
      const next = [newOrder, ...prev];
      saveData(STORAGE_KEYS.ORDERS, next);
      return next;
    });

    logUserActivity(
      'طلب كروت جديد',
      'orders',
      'طلبات الكروت وبوابة الموزعين',
      `طلب كروت جديد رقم ${newOrder.orderNumber}`,
      `نقطة البيع: ${newOrder.posPointName} (${newOrder.posManagerName || 'المسؤول'}) - إجمالي المبلغ: ${(newOrder.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol} - عدد الكروت: ${newOrder.totalQuantity}`,
      'create'
    );
  };

  const handleCancelOrder = (orderId: string, reason?: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updated = applyUpdateAudit(target, { status: 'cancelled', adminNotes: reason || target.adminNotes }, activeUser, {
      actionTitle: 'إلغاء طلب كروت',
      details: `سبب الإلغاء: ${reason || 'تم الإلغاء'} بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? updated : ord))
    );

    logUserActivity(
      'إلغاء طلب كروت',
      'orders',
      'طلبات الكروت وبوابة الموزعين',
      `إلغاء طلب الكروت رقم ${target.orderNumber}`,
      `السبب: ${reason || 'تم الإلغاء'}`,
      'update'
    );
  };

  const handleUpdateOrderStatus = (orderId: string, status: CardOrder['status'], adminNotes?: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    // If order is changed to 'delivered' or 'approved' and not converted yet, automatically create sales invoice!
    if ((status === 'delivered' || status === 'approved') && !target.convertedInvoiceId) {
      handleConvertOrderToInvoice(orderId);
      return;
    }

    const updated = applyUpdateAudit(target, { status, adminNotes: adminNotes ?? target.adminNotes }, activeUser, {
      actionTitle: `تحديث حالة الطلب إلى ${status}`,
      details: `تحديث الحالة بواسطة ${activeUser?.name || 'المدير'} - ملاحظات: ${adminNotes || 'بدون ملاحظات'}`,
    });

    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? updated : ord))
    );
    
    logUserActivity(
      'تحديث حالة طلب كروت',
      'orders',
      'طلبات الكروت وبوابة الموزعين',
      `تحديث حالة الطلب ${target.orderNumber} إلى ${status}`,
      `ملاحظات الإدارة: ${adminNotes || 'بدون ملاحظات'}`,
      'update'
    );
  };

  const handleConvertOrderToInvoice = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const today = new Date().toISOString().split('T')[0];
    const autoNumber = generateNextInvoiceNumber(invoices, 'sale', today);

    const rawInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      networkId: targetOrder.networkId || currentTenantId,
      invoiceNumber: autoNumber,
      type: 'sale',
      posPointId: targetOrder.posPointId,
      posPointName: targetOrder.posPointName,
      date: today,
      timestamp: new Date().toISOString(),
      paymentType: 'credit',
      status: 'completed',
      totalQuantity: targetOrder.totalQuantity || targetOrder.items.reduce((s, i) => s + i.quantity, 0),
      items: targetOrder.items.map((item) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        const retPrice = item.unitRetailPrice || cat?.retailPrice || item.unitWholesalePrice;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          quantity: item.quantity,
          unitCostPrice: cat?.costPrice || 0,
          unitWholesalePrice: item.unitWholesalePrice,
          totalWholesalePrice: item.totalWholesalePrice,
          unitRetailPrice: retPrice,
          totalRetailPrice: item.totalRetailPrice || (retPrice * item.quantity),
        };
      }),
      totalWholesaleAmount: targetOrder.totalWholesaleAmount,
      totalRetailAmount: targetOrder.totalRetailAmount || targetOrder.items.reduce((sum, item) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        const retPrice = item.unitRetailPrice || cat?.retailPrice || item.unitWholesalePrice;
        return sum + retPrice * item.quantity;
      }, 0),
      notes: `تم الإصدار تلقائياً بناءً على طلب الكروت رقم ${targetOrder.orderNumber}. ملاحظات المحل: ${targetOrder.notes || 'لا يوجد'}`,
      deliveredBy: activeUser.name,
    };

    const newInvoice = applyCreationAudit(rawInvoice, activeUser, {
      actionTitle: 'إصدار فاتورة مبيعات من طلب كروت معتمد',
      actionType: 'financial',
      details: `تحويل طلب الكروت رقم ${targetOrder.orderNumber} لفاتورة مبيعات رقم ${autoNumber}`,
    });

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);

    // Adjust warehouse stock
    setCategories((prevCategories) => {
      return prevCategories.map((cat) => {
        const item = newInvoice.items.find((i) => i.categoryId === cat.id);
        if (!item) return cat;
        return {
          ...cat,
          warehouseStock: Math.max(0, cat.warehouseStock - item.quantity),
        };
      });
    });

    // Refresh POS balances
    setPosPoints((prev) => refreshPOSBalances(prev, nextInvoices, sales, payments));

    // Update Order status to delivered
    const updatedOrder = applyUpdateAudit(targetOrder, {
      status: 'delivered',
      convertedInvoiceId: newInvoice.id,
      adminNotes: `تم تحويل الطلب بنجاح إلى فاتورة مبيعات رسمية رقم ${newInvoice.invoiceNumber}`,
    }, activeUser, {
      actionTitle: 'اعتماد وتسليم الطلب كفاتورة مبيعات',
      details: `تم إنشاء الفاتورة رقم ${newInvoice.invoiceNumber}`,
    });

    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? updatedOrder : ord))
    );

    // Log Activity
    logUserActivity(
      'اعتماد وتحويل طلب كروت لفاتورة',
      'orders',
      'طلبات الكروت وبوابة الموزعين',
      `تحويل الطلب ${targetOrder.orderNumber} إلى فاتورة رقم ${newInvoice.invoiceNumber}`,
      `نقطة البيع: ${targetOrder.posPointName} - القيمة: ${(targetOrder.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'financial'
    );

    // Show invoice receipt modal
    setSelectedInvoiceForReceipt(newInvoice);
  };

  // 3. Expenses Actions
  const handleAddExpense = (expenseData: Omit<ExpenseRecord, 'id' | 'timestamp'>) => {
    const autoVoucher = generateNextExpenseVoucherNumber(expenses, expenseData.date);
    const finalVoucherNumber = expenseData.voucherNumber?.trim() || autoVoucher;

    const rawExpense: ExpenseRecord = {
      ...expenseData,
      networkId: expenseData.networkId || currentTenantId,
      voucherNumber: finalVoucherNumber,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const newExpense = applyCreationAudit(rawExpense, activeUser, {
      actionTitle: 'إنشاء سند صرف جديد',
      actionType: 'financial',
      details: `سند صرف رقم ${finalVoucherNumber} بقيمة ${(rawExpense.amount ?? 0).toLocaleString()} ${settings.currencySymbol} لبند (${rawExpense.categoryName})`,
    });

    setExpenses((prev) => [newExpense, ...prev]);

    logUserActivity(
      'إضافة سند صرف جديد',
      'expenses',
      'المصروفات وسندات الصرف',
      `إضافة سند صرف رقم ${newExpense.voucherNumber}`,
      `المبلغ: ${(newExpense.amount ?? 0).toLocaleString()} ${settings.currencySymbol} - البند: ${newExpense.categoryName} - المستفيد: ${newExpense.paidTo || 'عام'}`,
      'financial'
    );

    setSelectedExpenseForReceipt(newExpense);
  };

  const handleUpdateExpense = (updatedExpenseData: ExpenseRecord) => {
    const existing = expenses.find((e) => e.id === updatedExpenseData.id) || updatedExpenseData;
    const updatedExpense = applyUpdateAudit(existing, updatedExpenseData, activeUser, {
      actionTitle: 'تعديل سند الصرف',
      actionType: 'financial',
      details: `تعديل سند الصرف رقم ${updatedExpenseData.voucherNumber} بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
    logUserActivity(
      'تعديل سند صرف',
      'expenses',
      'المصروفات وسندات الصرف',
      `تعديل سند الصرف رقم ${updatedExpense.voucherNumber}`,
      `المبلغ: ${(updatedExpense.amount ?? 0).toLocaleString()} ${settings.currencySymbol} - البند: ${updatedExpense.categoryName}`,
      'update'
    );
  };

  const handleDeleteExpense = (expenseId: string) => {
    const toDelete = expenses.find((e) => e.id === expenseId);
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    if (toDelete) {
      logUserActivity(
        'حذف سند صرف',
        'expenses',
        'المصروفات وسندات الصرف',
        `حذف سند الصرف رقم ${toDelete.voucherNumber}`,
        `تم حذف المصروف وقيمته ${(toDelete.amount ?? 0).toLocaleString()} ${settings.currencySymbol} (البند: ${toDelete.categoryName})`,
        'delete'
      );
    }
  };

  const handleAddExpenseCategory = (catData: Omit<ExpenseCategory, 'id'>) => {
    const rawCat: ExpenseCategory = {
      ...catData,
      networkId: catData.networkId || currentTenantId,
      id: `expcat-${Date.now()}`,
    };
    const newCat = applyCreationAudit(rawCat, activeUser, {
      actionTitle: 'إنشاء بند مصروفات جديد',
      details: `إضافة البند (${rawCat.name})`,
    });
    setExpenseCategories((prev) => [...prev, newCat]);
    logUserActivity(
      'إضافة بند مصروفات',
      'expenses',
      'المصروفات وسندات الصرف',
      `إضافة بند تصنيف مصروفات جديد: ${newCat.name}`,
      undefined,
      'create'
    );
  };

  const handleUpdateExpenseCategory = (updatedCatData: ExpenseCategory) => {
    const existing = expenseCategories.find((c) => c.id === updatedCatData.id) || updatedCatData;
    const updatedCat = applyUpdateAudit(existing, updatedCatData, activeUser, {
      actionTitle: 'تعديل بند المصروفات',
    });
    setExpenseCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
  };

  const handleDeleteExpenseCategory = (catId: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  // 4. Sales Actions (Legacy single-card sales support)
  const handleAddSale = (saleData: Omit<SalesRecord, 'id' | 'timestamp'>) => {
    const rawSale: SalesRecord = {
      ...saleData,
      networkId: saleData.networkId || currentTenantId,
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const newSale = applyCreationAudit(rawSale, activeUser, {
      actionTitle: 'تسجيل حركة مبيعات مباشرة',
      actionType: 'financial',
    });

    const nextSales = [newSale, ...sales];
    setSales(nextSales);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, nextSales, payments));
  };

  const handleUpdateSale = (updatedSaleData: SalesRecord) => {
    const existing = sales.find((s) => s.id === updatedSaleData.id) || updatedSaleData;
    const updatedSale = applyUpdateAudit(existing, updatedSaleData, activeUser, {
      actionTitle: 'تعديل حركة مبيعات',
      actionType: 'financial',
    });
    const nextSales = sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));
    setSales(nextSales);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, nextSales, payments));
  };

  const handleDeleteSale = (saleId: string) => {
    const nextSales = sales.filter((s) => s.id !== saleId);
    setSales(nextSales);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, nextSales, payments));
  };

  // 5. Category Actions
  const handleAddCategory = (catData: Omit<CardCategory, 'id'>) => {
    const rawCat: CardCategory = {
      ...catData,
      networkId: catData.networkId || currentTenantId,
      id: `cat-${Date.now()}`,
    };
    const newCat = applyCreationAudit(rawCat, activeUser, {
      actionTitle: 'إنشاء فئة كروت وباقة مايكروتك جديدة',
      details: `تمت إضافة فئة (${rawCat.name}) بسعر بيع ${rawCat.retailPrice} ورصيد مستودع ${rawCat.warehouseStock} كارت`,
    });

    setCategories((prev) => [...prev, newCat]);
    logUserActivity(
      'إضافة فئة كروت',
      'categories',
      'فئات الكروت والمايكروتك',
      `إضافة فئة كروت جديدة: ${newCat.name}`,
      `سعر البيع: ${newCat.retailPrice} - سعر الجملة: ${newCat.wholesalePrice} - الصلاحية: ${newCat.validityDays} يوم - الرصيد: ${newCat.warehouseStock} كرت`,
      'create'
    );
  };

  const handleUpdateCategory = (updatedCatData: CardCategory) => {
    const existing = categories.find((c) => c.id === updatedCatData.id) || updatedCatData;
    const updatedCat = applyUpdateAudit(existing, updatedCatData, activeUser, {
      actionTitle: 'تعديل بيانات فئة الكروت',
      details: `تم تحديث أسعار وخصائص الفئة (${updatedCatData.name}) بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
    logUserActivity(
      'تعديل فئة كروت',
      'categories',
      'فئات الكروت والمايكروتك',
      `تعديل بيانات فئة الكروت: ${updatedCat.name}`,
      `سعر البيع: ${updatedCat.retailPrice} - سعر الجملة: ${updatedCat.wholesalePrice}`,
      'update'
    );
  };

  const handleDeleteCategory = (catId: string) => {
    const toDelete = categories.find((c) => c.id === catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (toDelete) {
      logUserActivity(
        'حذف فئة كروت',
        'categories',
        'فئات الكروت والمايكروتك',
        `حذف فئة الكروت: ${toDelete.name}`,
        `تم حذف الفئة من النظام`,
        'delete'
      );
    }
  };

  const handleAdjustStock = (catId: string, delta: number) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === catId) {
          const newStock = Math.max(0, c.warehouseStock + delta);
          return applyUpdateAudit(c, { warehouseStock: newStock }, activeUser, {
            actionTitle: delta >= 0 ? `زيادة رصيد المستودع (+${delta})` : `خصم من رصيد المستودع (${delta})`,
            details: `تعديل الرصيد إلى ${newStock} كرت بواسطة ${activeUser?.name || 'المدير'}`,
          });
        }
        return c;
      })
    );
  };

  // 6. Batch Dispatch Actions (Legacy)
  const handleAddDispatch = (dispatchData: Omit<CardBatchDispatch, 'id' | 'soldCount'>) => {
    const rawDispatch: CardBatchDispatch = {
      ...dispatchData,
      networkId: dispatchData.networkId || currentTenantId,
      id: `disp-${Date.now()}`,
      soldCount: 0,
    };
    const newDispatch = applyCreationAudit(rawDispatch, activeUser, {
      actionTitle: 'إرسالية دفع كروت لنقطة بيع',
      actionType: 'financial',
      details: `إرسالية عدد ${rawDispatch.quantity} كرت`,
    });

    setDispatches((prev) => [newDispatch, ...prev]);

    setCategories((prev) =>
      prev.map((c) =>
        c.id === dispatchData.categoryId
          ? { ...c, warehouseStock: Math.max(0, c.warehouseStock - dispatchData.quantity) }
          : c
      )
    );
  };

  const handleUpdateDispatch = (updatedDispatchData: CardBatchDispatch) => {
    const prevDispatch = dispatches.find((d) => d.id === updatedDispatchData.id);
    const existing = prevDispatch || updatedDispatchData;
    const qtyDiff = prevDispatch ? updatedDispatchData.quantity - prevDispatch.quantity : 0;

    const updatedDispatch = applyUpdateAudit(existing, updatedDispatchData, activeUser, {
      actionTitle: 'تعديل إرسالية كروت',
      actionType: 'financial',
    });

    setDispatches((prev) => prev.map((d) => (d.id === updatedDispatch.id ? updatedDispatch : d)));

    if (qtyDiff !== 0) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === updatedDispatch.categoryId
            ? { ...c, warehouseStock: Math.max(0, c.warehouseStock - qtyDiff) }
            : c
        )
      );
    }
  };

  const handleDeleteDispatch = (dispatchId: string) => {
    const toDelete = dispatches.find((d) => d.id === dispatchId);
    if (!toDelete) return;

    setDispatches((prev) => prev.filter((d) => d.id !== dispatchId));

    setCategories((prev) =>
      prev.map((c) =>
        c.id === toDelete.categoryId
          ? { ...c, warehouseStock: c.warehouseStock + toDelete.quantity }
          : c
      )
    );
  };

  const handleReturnCards = (dispatchId: string, returnQty: number) => {
    const targetDispatch = dispatches.find((d) => d.id === dispatchId);
    if (!targetDispatch || returnQty <= 0) return;

    const actualReturn = Math.min(
      returnQty,
      targetDispatch.quantity - (targetDispatch.soldCount || 0)
    );

    setDispatches((prev) =>
      prev.map((d) => {
        if (d.id === dispatchId) {
          const newQty = d.quantity - actualReturn;
          return applyUpdateAudit(d, {
            quantity: newQty,
            totalWholesaleValue: d.unitWholesalePrice * newQty,
            totalRetailValue: d.unitRetailPrice * newQty,
          }, activeUser, {
            actionTitle: `إرجاع كروت من الإرسالية (${actualReturn} كرت)`,
            actionType: 'financial',
          });
        }
        return d;
      })
    );

    setCategories((prev) =>
      prev.map((c) =>
        c.id === targetDispatch.categoryId
          ? { ...c, warehouseStock: c.warehouseStock + actualReturn }
          : c
      )
    );
  };

  // 7. Payment Actions
  const handleAddPayment = (paymentData: Omit<PaymentRecord, 'id' | 'timestamp'>) => {
    const rawPayment: PaymentRecord = {
      ...paymentData,
      networkId: paymentData.networkId || currentTenantId,
      id: `pay-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const newPayment = applyCreationAudit(rawPayment, activeUser, {
      actionTitle: 'إصدار سند قبض وتحصيل مالي',
      actionType: 'financial',
      details: `تحصيل مبلغ ${(rawPayment.amount ?? 0).toLocaleString()} ${settings.currencySymbol} بسند رقم ${rawPayment.referenceNumber || rawPayment.id.slice(-6)}`,
    });

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);

    setPosPoints((prev) => refreshPOSBalances(prev, invoices, sales, nextPayments));

    const targetPos = posPoints.find((p) => p.id === newPayment.posPointId);
    logUserActivity(
      'إصدار سند قبض وتحصيل',
      'payments',
      'المقبوضات والتحصيلات',
      `إصدار سند قبض رقم ${newPayment.referenceNumber || newPayment.id.slice(-6)}`,
      `المبلغ المستلم: ${(newPayment.amount ?? 0).toLocaleString()} ${settings.currencySymbol} - نقطة البيع: ${targetPos?.name || 'مباشر'} - المستلم: ${newPayment.receivedBy || 'أمين الصندوق'}`,
      'financial'
    );

    setSelectedPaymentForReceipt(newPayment);
  };

  const handleUpdatePayment = (updatedPaymentData: PaymentRecord) => {
    const existing = payments.find((p) => p.id === updatedPaymentData.id) || updatedPaymentData;
    const updatedPayment = applyUpdateAudit(existing, updatedPaymentData, activeUser, {
      actionTitle: 'تعديل سند القبض',
      actionType: 'financial',
      details: `تعديل سند القبض رقم ${updatedPaymentData.referenceNumber || updatedPaymentData.id.slice(-6)} بواسطة ${activeUser?.name || 'المدير'}`,
    });

    const nextPayments = payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p));
    setPayments(nextPayments);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, sales, nextPayments));
    logUserActivity(
      'تعديل سند قبض',
      'payments',
      'المقبوضات والتحصيلات',
      `تعديل سند القبض رقم ${updatedPayment.referenceNumber || updatedPayment.id.slice(-6)}`,
      `المبلغ المعدل: ${(updatedPayment.amount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
      'update'
    );
  };

  const handleDeletePayment = (paymentId: string) => {
    const toDelete = payments.find((p) => p.id === paymentId);
    const nextPayments = payments.filter((p) => p.id !== paymentId);
    setPayments(nextPayments);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, sales, nextPayments));

    if (toDelete) {
      logUserActivity(
        'حذف سند قبض',
        'payments',
        'المقبوضات والتحصيلات',
        `حذف سند القبض رقم ${toDelete.referenceNumber || toDelete.id.slice(-6)}`,
        `تم حذف سند القبض وقيمته ${(toDelete.amount ?? 0).toLocaleString()} ${settings.currencySymbol}`,
        'delete'
      );
    }
  };

  // User & RBAC Management Handlers
  const handleAddUser = (newUserData: Omit<AppUser, 'id' | 'createdAt'>) => {
    // Non-system owners can ONLY create users within their own network environment
    const enforcedNetworkId = activeUser?.role === 'system_owner'
      ? (newUserData.networkId || currentTenantId)
      : (activeUser?.networkId && activeUser.networkId !== 'system' ? activeUser.networkId : currentTenantId);

    const rawUser: AppUser = {
      ...newUserData,
      networkId: enforcedNetworkId,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    const newUser = applyCreationAudit(rawUser, activeUser, {
      actionTitle: 'إنشاء حساب مستخدم وصلاحيات جديدة',
      actionType: 'security',
      details: `إنشاء المستخدم ${rawUser.name} (@${rawUser.username}) بالدور (${rawUser.customRoleName || rawUser.role}) للشبكة (${enforcedNetworkId})`,
    });

    setUsers((prev) => [...prev, newUser]);
    logUserActivity(
      'إضافة مستخدم جديد',
      'users',
      'المستخدمين والصلاحيات',
      `إنشاء حساب مستخدم جديد: ${newUser.name} (@${newUser.username}) للشبكة (${enforcedNetworkId})`,
      `الدور الوظيفي: ${newUser.customRoleName || newUser.role} - الحالة: ${newUser.status === 'active' ? 'نشط' : 'معطل'}`,
      'security'
    );
  };

  const handleUpdateUser = (updatedUserData: AppUser) => {
    const existing = users.find((u) => u.id === updatedUserData.id) || updatedUserData;

    // Security check: non-system owners cannot edit users outside their network
    if (activeUser?.role !== 'system_owner' && existing.networkId && activeUser?.networkId && existing.networkId !== activeUser.networkId) {
      alert('غير مصرح لك بتعديل مستخدم خارج شبكتك الخاصة.');
      return;
    }

    const safeUserData: AppUser = {
      ...updatedUserData,
      networkId: activeUser?.role === 'system_owner' ? (updatedUserData.networkId || existing.networkId) : existing.networkId,
    };

    const updatedUser = applyUpdateAudit(existing, safeUserData, activeUser, {
      actionTitle: 'تعديل بيانات وصلاحيات المستخدم',
      actionType: 'security',
      details: `تحديث بيانات المستخدم (${safeUserData.name}) بواسطة ${activeUser?.name || 'المدير'}`,
    });

    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

    // If this user is tied to a POS Point, update POS credentials too!
    if (updatedUser.posPointId) {
      setPosPoints((prev) =>
        prev.map((p) =>
          p.id === updatedUser.posPointId
            ? {
                ...p,
                username: updatedUser.username,
                password: updatedUser.password,
                pinCode: updatedUser.pinCode,
                phone: updatedUser.phone || p.phone,
              }
            : p
        )
      );
    }

    logUserActivity(
      'تعديل صلاحيات ومستخدم',
      'users',
      'المستخدمين والصلاحيات',
      `تعديل بيانات وصلاحيات المستخدم: ${updatedUser.name}`,
      `الدور: ${updatedUser.customRoleName || updatedUser.role} - الحالة: ${updatedUser.status}`,
      'security'
    );
  };

  const handleSaveChangedPassword = (updatedUser: AppUser) => {
    handleUpdateUser(updatedUser);
    setUserLoginFeedback({
      title: 'تم تحديث بيانات الدخول بنجاح',
      subtitle: 'تم حفظ كلمة المرور ورمز PIN الجديد الخاص بك.',
    });
    setTimeout(() => {
      setUserLoginFeedback(null);
    }, 4000);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'user-system-owner') return; // protect master owner
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.username === 'master') return;

    // Security check: non-system owners cannot delete users outside their network
    if (activeUser?.role !== 'system_owner' && targetUser?.networkId && activeUser?.networkId && targetUser.networkId !== activeUser.networkId) {
      alert('غير مصرح لك بحذف مستخدم خارج شبكتك الخاصة.');
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (activeUserId === userId) {
      setActiveUserId('user-system-owner');
    }
    if (targetUser) {
      logUserActivity(
        'حذف حساب مستخدم',
        'users',
        'المستخدمين والصلاحيات',
        `حذف حساب المستخدم: ${targetUser.name} (@${targetUser.username})`,
        `تم إزالة الحساب نهائياً من قاعدة بيانات المستخدمين`,
        'delete'
      );
    }
  };

  // Open dedicated login portal
  const handleOpenLoginPortal = (targetUser?: AppUser) => {
    setLoginModalTargetUser(targetUser || activeUser);
    setIsLoginModalOpen(true);
  };

  // Successful login handler with automatic RBAC redirection
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const handleLoginSuccess = async (user: AppUser, targetView: NavView) => {
    if (user.networkId && user.networkId !== 'system') {
      setIsSyncing(true);
      try {
        const results = await loadTenantDataFromFirestore(user.networkId, setSyncMessage);
        if (results) {
          if (results[STORAGE_KEYS.USERS]) { setUsers(results[STORAGE_KEYS.USERS]); saveData(STORAGE_KEYS.USERS, results[STORAGE_KEYS.USERS]); }
          if (results[STORAGE_KEYS.CATEGORIES]) { setCategories(results[STORAGE_KEYS.CATEGORIES]); saveData(STORAGE_KEYS.CATEGORIES, results[STORAGE_KEYS.CATEGORIES]); }
          if (results[STORAGE_KEYS.POS_POINTS]) { setPosPoints(results[STORAGE_KEYS.POS_POINTS]); saveData(STORAGE_KEYS.POS_POINTS, results[STORAGE_KEYS.POS_POINTS]); }
          if (results[STORAGE_KEYS.INVOICES]) { setInvoices(results[STORAGE_KEYS.INVOICES]); saveData(STORAGE_KEYS.INVOICES, results[STORAGE_KEYS.INVOICES]); }
          if (results[STORAGE_KEYS.PAYMENTS]) { setPayments(results[STORAGE_KEYS.PAYMENTS]); saveData(STORAGE_KEYS.PAYMENTS, results[STORAGE_KEYS.PAYMENTS]); }
          if (results[STORAGE_KEYS.EXPENSES]) { setExpenses(results[STORAGE_KEYS.EXPENSES]); saveData(STORAGE_KEYS.EXPENSES, results[STORAGE_KEYS.EXPENSES]); }
          if (results[STORAGE_KEYS.ORDERS]) { setOrders(results[STORAGE_KEYS.ORDERS]); saveData(STORAGE_KEYS.ORDERS, results[STORAGE_KEYS.ORDERS]); }
          if (results[STORAGE_KEYS.TENANTS]) { setTenants(results[STORAGE_KEYS.TENANTS]); saveData(STORAGE_KEYS.TENANTS, results[STORAGE_KEYS.TENANTS]); }
        }
      } catch (err) {
        console.error("Failed to sync from cloud", err);
      }
      setIsSyncing(false);
    }
    
    // We update the local instance of the user after syncing from cloud 
    // to ensure lastLogin is updated on top of cloud data
    setUsers((currentUsers) => {
      const updatedUsers = currentUsers.map((u) =>
        u.id === user.id
          ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) }
          : u
      );
      saveData(STORAGE_KEYS.USERS, updatedUsers);
      return updatedUsers;
    });

    setActiveUserId(user.id);
    saveData(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
    setActiveView(targetView);

    if (user.networkId && user.networkId !== 'system') {
      const userTenant = tenants.find((t) => t.id === user.networkId);
      if (userTenant?.settings) {
        setSettings(userTenant.settings);
        saveData(STORAGE_KEYS.SETTINGS, userTenant.settings);
      }
    } else {
      setSettings(defaultNetworkSettings);
      saveData(STORAGE_KEYS.SETTINGS, defaultNetworkSettings);
    }

    // High-visibility Feedback Banner
    setUserLoginFeedback({
      title: `مرحباً بك، ${user.name}!`,
      subtitle: `تم تسجيل الدخول بنجاح والتوجيه إلى (${getViewNameArabic(targetView)}) وفق صلاحيات حسابك.`,
    });
    setTimeout(() => {
      setUserLoginFeedback(null);
    }, 4500);
  };

  
  // Auto Backup to Google Drive
  useEffect(() => {
    let interval: any;
    if (isLoggedIn && activeUser && settings.autoBackupToDrive && getDriveAccessToken()) {
      const intervalMs = (settings.autoBackupIntervalHours || 1) * 60 * 60 * 1000;
      interval = setInterval(async () => {
        try {
          console.log('[AutoBackup] Starting scheduled backup to Google Drive...');
          const isMasterUser = activeUser.role === 'system_owner' && activeUser.networkId === 'net-microsys';
          
          const backupObj = generateSystemBackup({
            activeUser,
            isMasterUser,
            exportScope: (activeUser.role === 'system_owner' && selectedTenantFilter === 'all') ? 'full' : 'current',
            effectiveNetworkId: currentTenantId || '',
            networkDisplayName: currentTenant?.name || 'My Network',
            includeAuditLogs: true,
            tenants,
            users,
            categories,
            posPoints,
            invoices,
            expenses,
            expenseCategories,
            dispatches,
            sales,
            payments,
            orders,
            settings: settings,
            templates: initialTemplates,
            activityLogs: activityLogs || []
          });

          const jsonString = exportToJSON(backupObj);
          const dateStr = new Date().toISOString().split('T')[0];
          const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
          const scopeTag = backupObj.backupType === 'full_system' ? 'FULL_SAAS' : (currentTenant?.name?.replace(/\s+/g, '_') || 'NETWORK');
          const fileName = `MicroSys_AutoBackup_${scopeTag}_${dateStr}_${timeStr}.json`;
          const description = `MicroSys Cloud Auto Backup - ${scopeTag} - Generated at ${dateStr} ${timeStr}`;
          
          await uploadBackupToGoogleDrive(fileName, jsonString, description);
          console.log('[AutoBackup] Successfully uploaded:', fileName);
        } catch (err) {
          console.error('[AutoBackup] Failed to auto-backup:', err);
        }
      }, intervalMs);
    }
    return () => clearInterval(interval);
  }, [isLoggedIn, activeUser, settings, currentTenantId, currentTenant, tenants, users, categories, posPoints, invoices, expenses, expenseCategories, dispatches, sales, payments, orders, activityLogs, selectedTenantFilter]);

// Logout handler
  const handleLogout = async () => {
    try {
      await firebaseLogout();
    } catch (e) {
      console.error("Firebase logout failed", e);
    }
    
    setIsLoggedIn(false);
    setIsLoginModalOpen(false);
    setActiveUserId('');
    localStorage.removeItem('ACTIVE_USER_ID');
  };

  // Fast switch handler with auto-redirect
  const handleSwitchActiveUser = (targetUser: AppUser) => {
    const targetLanding = getDefaultLandingViewForUser(targetUser);
    setActiveUserId(targetUser.id);
    saveData(STORAGE_KEYS.ACTIVE_USER_ID, targetUser.id);
    const updatedUsers = users.map((u) =>
      u.id === targetUser.id
        ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) }
        : u
    );
    setUsers(updatedUsers);
    saveData(STORAGE_KEYS.USERS, updatedUsers);
    setActiveView(targetLanding);

    if (targetUser.networkId && targetUser.networkId !== 'system') {
      const userTenant = tenants.find((t) => t.id === targetUser.networkId);
      if (userTenant?.settings) {
        setSettings(userTenant.settings);
        saveData(STORAGE_KEYS.SETTINGS, userTenant.settings);
      }
    } else {
      setSettings(defaultNetworkSettings);
      saveData(STORAGE_KEYS.SETTINGS, defaultNetworkSettings);
    }

    setUserLoginFeedback({
      title: `تم تبديل الحساب: ${targetUser.name}`,
      subtitle: `تم نقلك تلقائياً إلى (${getViewNameArabic(targetLanding)}) بناءً على صلاحياتك المعتمدة.`,
    });
    setTimeout(() => {
      setUserLoginFeedback(null);
    }, 4000);
  };

  // Switch context directly to a tenant's admin account
  const handleSwitchToTenantAdmin = (tenant: NetworkTenant) => {
    let tenantAdmin = users.find(
      (u) => u.networkId === tenant.id && (u.role === 'super_admin' || u.username === tenant.adminUsername)
    );

    if (!tenantAdmin) {
      tenantAdmin = {
        id: `user-${Date.now()}`,
        networkId: tenant.id,
        name: `مدير ${tenant.name}`,
        username: tenant.adminUsername,
        password: 'adminpassword',
        pinCode: '1234',
        role: 'super_admin',
        customRoleName: `مدير شبكة ${tenant.name}`,
        avatar: '🌐',
        avatarBgColor: 'bg-blue-600',
        status: 'active',
        permissions: getRoleDefaultPermissions('super_admin'),
        createdAt: new Date().toISOString().split('T')[0],
      };
      const updatedUsers = [...users, tenantAdmin];
      setUsers(updatedUsers);
      saveData(STORAGE_KEYS.USERS, updatedUsers);
    }

    handleSwitchActiveUser(tenantAdmin);
  };

  // Helper to check if the current activeView is permitted for activeUser
  const isCurrentViewPermitted = (view: NavView): boolean => {
    if (activeUser?.role === 'pos_agent' && view !== 'pos_portal') {
      return false;
    }
    
    const viewToModuleMap: Record<NavView, keyof UserPermissions> = {
      system_tenants: 'systemTenants',
      dashboard: 'dashboard',
      pos_portal: 'orders',
      orders: 'orders',
      invoices: 'invoices',
      expenses: 'expenses',
      payments: 'payments',
      pos: 'pos',
      categories: 'categories',
      mikrotik: 'mikrotik',
      users: 'usersAndPermissions',
      sales: 'invoices',
      dispatches: 'categories',
    };
    const mod = viewToModuleMap[view] || 'invoices';
    return hasPermission(activeUser, mod, 'view', currentTenant);
  };

  // Reset Data
  const handleResetData = () => {
    if (confirm('هل أنت متأكد من تصفير كافة بيانات الشبكات والعودة لحساب الماستر فقط؟')) {
      resetToMockData();
      setCategories([]);
      setInvoices([]);
      setExpenses([]);
      setExpenseCategories(mockExpenseCategories);
      setDispatches([]);
      setSales([]);
      setPayments([]);
      setOrders([]);
      setTenants([]);
      setActivityLogs([]);
      setUsers(mockUsers);
      setActiveUserId('user-system-owner');
      setSettings(defaultNetworkSettings);
      setPosPoints([]);
      setActiveView('system_tenants');
    }
  };

  // Restore System Database Backup
  const handleRestoreDatabase = (
    backupData: any,
    mode: 'overwrite' | 'merge' = 'overwrite',
    backupType?: 'full_system' | 'single_network'
  ) => {
    if (!backupData || typeof backupData !== 'object') return;

    const mergeList = <T extends { id: string }>(current: T[], incoming?: T[]): T[] => {
      if (!incoming || incoming.length === 0) return current;
      if (mode === 'overwrite') return incoming;
      // Merge mode
      const map = new Map<string, T>();
      current.forEach((item) => map.set(item.id, item));
      incoming.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    };

    const newCategories = mergeList<CardCategory>(categories, backupData.categories);
    const newInvoices = mergeList<InvoiceRecord>(invoices, backupData.invoices);
    const newExpenses = mergeList<ExpenseRecord>(expenses, backupData.expenses);
    const newExpenseCategories = mergeList<ExpenseCategory>(expenseCategories, backupData.expenseCategories);
    const newDispatches = mergeList<CardBatchDispatch>(dispatches, backupData.dispatches);
    const newSales = mergeList<SalesRecord>(sales, backupData.sales);
    const newPayments = mergeList<PaymentRecord>(payments, backupData.payments);
    const newOrders = mergeList<CardOrder>(orders, backupData.orders);
    const newTenants = mergeList<NetworkTenant>(tenants, backupData.tenants);
    const newUsers = mergeList<AppUser>(users, backupData.users);
    const newLogs = mergeList<UserActivityLog>(activityLogs, backupData.activityLogs);

    let newPOS = mergeList<POSPoint>(posPoints, backupData.posPoints);
    newPOS = synchronizePOSBalances(newPOS, newInvoices, newSales, newPayments, newDispatches);

    // Update States
    if (backupData.categories || mode === 'overwrite') setCategories(newCategories);
    if (backupData.invoices || mode === 'overwrite') setInvoices(newInvoices);
    if (backupData.expenses || mode === 'overwrite') setExpenses(newExpenses);
    if (backupData.expenseCategories || mode === 'overwrite') setExpenseCategories(newExpenseCategories);
    if (backupData.dispatches || mode === 'overwrite') setDispatches(newDispatches);
    if (backupData.sales || mode === 'overwrite') setSales(newSales);
    if (backupData.payments || mode === 'overwrite') setPayments(newPayments);
    if (backupData.orders || mode === 'overwrite') setOrders(newOrders);
    if (backupData.posPoints || mode === 'overwrite') setPosPoints(newPOS);
    if (backupData.tenants && backupData.tenants.length > 0) setTenants(newTenants);
    if (backupData.users && backupData.users.length > 0) setUsers(newUsers);
    if (backupData.activityLogs && backupData.activityLogs.length > 0) setActivityLogs(newLogs);
    if (backupData.settings) setSettings(backupData.settings);

    // Save directly to localStorage for instant durability
    saveData(STORAGE_KEYS.CATEGORIES, newCategories);
    saveData(STORAGE_KEYS.INVOICES, newInvoices);
    saveData(STORAGE_KEYS.EXPENSES, newExpenses);
    saveData(STORAGE_KEYS.EXPENSE_CATEGORIES, newExpenseCategories);
    saveData(STORAGE_KEYS.DISPATCHES, newDispatches);
    saveData(STORAGE_KEYS.SALES, newSales);
    saveData(STORAGE_KEYS.PAYMENTS, newPayments);
    saveData(STORAGE_KEYS.ORDERS, newOrders);
    saveData(STORAGE_KEYS.POS_POINTS, newPOS);
    if (backupData.tenants && backupData.tenants.length > 0) saveData(STORAGE_KEYS.TENANTS, newTenants);
    if (backupData.users && backupData.users.length > 0) saveData(STORAGE_KEYS.USERS, newUsers);
    if (backupData.activityLogs && backupData.activityLogs.length > 0) saveData(STORAGE_KEYS.ACTIVITY_LOGS, newLogs);
    if (backupData.settings) saveData(STORAGE_KEYS.SETTINGS, backupData.settings);
  };

  // Restore Backup (Legacy Compatibility)
  const handleRestoreData = (backup: any) => {
    handleRestoreDatabase(backup.data || backup, 'overwrite', backup.backupType);
  };

  // Quick Triggers
  const handleOpenPaymentModal = (posId?: string) => {
    setPaymentTargetPOSId(posId);
    setIsPaymentModalOpen(true);
  };

  const statementPOS = (scopedPOSPoints || []).find((p) => p?.id === statementPOSId);
  const totalDebt = (scopedPOSPoints || []).reduce((acc, p) => acc + (p?.currentDebt || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const totalSalesToday = (scopedInvoices || [])
    .filter((inv) => inv && inv.type === 'sale' && (inv.date === todayStr || inv.date?.startsWith(todayStr)))
    .reduce((acc, inv) => acc + (inv?.totalWholesaleAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Subscription Expiration Overlay */}
      {isLoggedIn && isTenantExpired && activeUser?.role !== 'system_owner' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl w-full max-w-lg p-8 text-center shadow-2xl shadow-rose-900/20">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <ShieldAlert className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-4">انتهت فترة الاشتراك</h2>
            <p className="text-slate-300 text-base leading-relaxed mb-8">
              {tenantExpirationMessage}
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-right space-y-4 mb-8">
              <div className="flex items-center gap-3 text-slate-400">
                <Network className="w-5 h-5 text-indigo-400" />
                <span className="font-bold">اسم الشبكة:</span>
                <span className="text-white ml-auto">{currentTenant?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Phone className="w-5 h-5 text-indigo-400" />
                <span className="font-bold">للتواصل مع الإدارة:</span>
                <span className="text-white ml-auto" dir="ltr">{settings.supportPhone || settings.whatsappNumber}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          setQuickSalePOSId(undefined);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenBackup={() => setIsDatabaseBackupOpen(true)}
        onOpenAI={() => setIsAIModalOpen(true)}
        onOpenNewPayment={() => handleOpenPaymentModal()}
        onOpenNewSale={() => setActiveView('invoices')}
        settings={settings}
        posPoints={scopedPOSPoints}
        sales={scopedSales}
        payments={scopedPayments}
        categories={scopedCategories}
        dispatches={scopedDispatches}
        invoices={scopedInvoices}
        expenses={scopedExpenses}
        users={scopedUsers}
        orders={scopedOrders}
        activeUser={activeUser}
        onResetData={handleResetData}
        onOpenLogin={() => handleOpenLoginPortal()}
        onOpenAboutProgram={() => setIsAboutModalOpen(true)}
        onLogout={handleLogout}
        tenantRemainingDays={tenantRemainingDays}
        tenantPlan={currentTenant?.subscriptionPlan}
        activeTenant={currentTenant}
        counts={{
          posPoints: scopedPOSPoints.length,
          sales: scopedSales.length,
          payments: scopedPayments.length,
          categories: scopedCategories.length,
          dispatches: scopedDispatches.length,
          invoices: scopedInvoices.length,
          expenses: scopedExpenses.length,
          users: scopedUsers.length,
          orders: scopedOrders.length,
          pendingOrders: scopedOrders.filter((o) => o.status === 'pending').length,
        }}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
        isSidebarCollapsed ? 'lg:mr-20' : 'lg:mr-72 sm:lg:mr-80'
      }`}>
        {/* Top Application Header */}
        <Header
          currentTab={activeView}
          setCurrentTab={(tab) => {
            setActiveView(tab as any);
            setQuickSalePOSId(undefined);
          }}
          settings={settings}
          activeUser={activeUser}
          tenants={tenants}
          selectedTenantFilter={selectedTenantFilter}
          onSelectTenantFilter={(tenantId) => {
            setSelectedTenantFilter(tenantId);
            if (tenantId !== 'all') {
              const selectedTenant = tenants.find((t) => t.id === tenantId);
              if (selectedTenant) {
                setSettings(selectedTenant.settings);
              }
            }
          }}
          pendingOrdersCount={scopedOrders.filter((o) => o.status === 'pending').length}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onOpenQuickSale={() => setActiveView('invoices')}
          onOpenQuickPayment={() => handleOpenPaymentModal()}
          onOpenAI={() => setIsAIModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenBackup={() => setIsDatabaseBackupOpen(true)}
          onOpenLogin={() => handleOpenLoginPortal()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenAboutProgram={() => setIsAboutModalOpen(true)}
          onLogout={handleLogout}
          onOpenUsers={() => setActiveView('users')}
          onToggleTheme={handleToggleTheme}
          totalDebt={totalDebt}
          totalSalesToday={totalSalesToday}
        />

        {/* Global Feedback Banner */}
        {userLoginFeedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%]">
            <div className="bg-slate-900/95 border border-indigo-500/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3.5 backdrop-blur-md animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{userLoginFeedback.title}</p>
                  <p className="text-xs text-indigo-200/90 font-medium">{userLoginFeedback.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setUserLoginFeedback(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main View Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-6">
          {!isCurrentViewPermitted(activeView) ? (
            <AccessDeniedView
              activeUser={activeUser}
              attemptedView={activeView}
              onNavigate={(v) => setActiveView(v)}
              onOpenLogin={() => handleOpenLoginPortal()}
            />
          ) : (
            <>
              {activeView === 'system_tenants' && (
                <SystemTenantsView 
                  tenants={tenants}
                  users={users}
                  onSaveTenant={handleSaveTenant}
                  onDeleteTenant={handleDeleteTenant}
                  onSwitchToTenantAdmin={handleSwitchToTenantAdmin}
                />
              )}

              {activeView === 'dashboard' && (
                <DashboardView
                  categories={scopedCategories}
                  posPoints={scopedPOSPoints}
                  sales={scopedSales}
                  payments={scopedPayments}
                  dispatches={scopedDispatches}
                  invoices={scopedInvoices}
                  expenses={scopedExpenses}
                  settings={settings}
                  onNavigateToTab={(tab) => setActiveView(tab as any)}
                  onSelectPOSForStatement={(id) => setStatementPOSId(id)}
                  onOpenQuickSale={() => setActiveView('invoices')}
                  onOpenAI={() => setIsAIModalOpen(true)}
                  onPrintSaleReceipt={(sale) => setSelectedSaleForReceipt(sale)}
                  onOpenIncomeStatement={() => setIsIncomeStatementOpen(true)}
                  canViewIncomeStatement={hasPermission(activeUser, 'dashboard', 'viewIncomeStatement', currentTenant)}
                />
              )}

              {activeView === 'pos_portal' && (
                <POSPortalView
                  activeUser={activeUser}
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  orders={scopedOrders}
                  invoices={scopedInvoices}
                  payments={scopedPayments}
                  settings={settings}
                  onCreateOrder={handleCreateOrder}
                  onCancelOrder={handleCancelOrder}
                  onOpenStatementModal={(pos) => {
                    setStatementPaperMode('a4');
                    setStatementPOSId(pos.id);
                  }}
                />
              )}

              {activeView === 'orders' && (
                <OrdersManagementView
                  orders={scopedOrders}
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  invoices={scopedInvoices}
                  settings={settings}
                  activeUser={activeUser}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onConvertToInvoice={handleConvertOrderToInvoice}
                  onCreateOrder={handleCreateOrder}
                  onCancelOrder={handleCancelOrder}
                />
              )}

              {activeView === 'invoices' && (
                <InvoicesView
                  invoices={scopedInvoices}
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  settings={settings}
                  onAddInvoice={handleAddInvoice}
                  onUpdateInvoice={handleUpdateInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onCancelInvoice={handleCancelInvoice}
                  onViewReceipt={(inv) => setSelectedInvoiceForReceipt(inv)}
                  onOpenFinancialExport={() => setIsFinancialExportModalOpen(true)}
                />
              )}

              {activeView === 'expenses' && (
                <ExpensesView
                  expenses={scopedExpenses}
                  categories={scopedExpenseCategories}
                  settings={settings}
                  onAddExpense={handleAddExpense}
                  onUpdateExpense={handleUpdateExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onAddCategory={handleAddExpenseCategory}
                  onUpdateCategory={handleUpdateExpenseCategory}
                  onDeleteCategory={handleDeleteExpenseCategory}
                  onViewReceipt={(exp) => setSelectedExpenseForReceipt(exp)}
                  onOpenIncomeStatement={() => setIsIncomeStatementOpen(true)}
                  canViewIncomeStatement={hasPermission(activeUser, 'dashboard', 'viewIncomeStatement', currentTenant)}
                />
              )}

              {activeView === 'pos' && (
                <POSPointsView
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  dispatches={scopedDispatches}
                  sales={scopedSales}
                  payments={scopedPayments}
                  settings={settings}
                  allUsers={users}
                  allPosPoints={posPoints}
                  tenants={tenants}
                  onAddPOS={handleAddPOS}
                  onUpdatePOS={handleUpdatePOS}
                  onDeletePOS={handleDeletePOS}
                  onOpenStatement={(id, mode = 'a4') => {
                    setStatementPaperMode(mode);
                    setStatementPOSId(id);
                  }}
                  onOpenPaymentModal={(id) => handleOpenPaymentModal(id)}
                  onOpenDispatchModal={(id) => {
                    setActiveView('invoices');
                  }}
                  onOpenQuickSaleForPOS={(id) => {
                    setActiveView('invoices');
                  }}
                />
              )}

              {activeView === 'payments' && (
                <PaymentsView
                  payments={scopedPayments}
                  posPoints={scopedPOSPoints}
                  settings={settings}
                  onAddPayment={handleAddPayment}
                  onUpdatePayment={handleUpdatePayment}
                  onDeletePayment={handleDeletePayment}
                  onViewReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
                  onOpenStatement={(posId) => {
                    setStatementPaperMode('a4');
                    setStatementPOSId(posId);
                  }}
                />
              )}

              {activeView === 'categories' && (
                <CategoriesView
                  categories={scopedCategories}
                  settings={settings}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onAdjustStock={handleAdjustStock}
                />
              )}

              {activeView === 'mikrotik' && (
                <MikrotikLiveView
                  templates={templates}
                  posPoints={scopedPOSPoints}
                  onSaveTemplate={(t) => {
                    const exists = templates.find((x) => x.id === t.id);
                    if (exists) setTemplates(templates.map((x) => (x.id === t.id ? t : x)));
                    else setTemplates([...templates, t]);
                  }}
                  onDeleteTemplate={(id) => setTemplates(templates.filter((x) => x.id !== id))}
                  settings={settings}
                  categories={scopedCategories}
                  onUpdateSettings={(newSettings) => setSettings(newSettings)}
                />
              )}

              {activeView === 'users' && (
                <UsersAndPermissionsView
                  users={scopedUsers}
                  activeUser={activeUser}
                  activityLogs={scopedActivityLogs}
                  settings={settings}
                  allUsers={users}
                  posPoints={posPoints}
                  tenants={tenants}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onSwitchActiveUser={handleSwitchActiveUser}
                  onOpenLoginView={(target) => handleOpenLoginPortal(target)}
                  onClearLogs={() => setActivityLogs([])}
                />
              )}

              {/* Legacy fallback tabs */}
              {activeView === 'sales' && (
                <SalesView
                  sales={scopedSales}
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  dispatches={scopedDispatches}
                  settings={settings}
                  onAddSale={handleAddSale}
                  onUpdateSale={handleUpdateSale}
                  onDeleteSale={handleDeleteSale}
                  onPrintSaleReceipt={(sale) => setSelectedSaleForReceipt(sale)}
                  selectedPOSIdForQuickSale={quickSalePOSId}
                />
              )}

              {activeView === 'dispatches' && (
                <BatchDispatchView
                  dispatches={scopedDispatches}
                  posPoints={scopedPOSPoints}
                  categories={scopedCategories}
                  settings={settings}
                  onAddDispatch={handleAddDispatch}
                  onUpdateDispatch={handleUpdateDispatch}
                  onDeleteDispatch={handleDeleteDispatch}
                  onReturnCards={handleReturnCards}
                  selectedPOSIdForDispatch={dispatchTargetPOSId}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="no-print border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 bg-slate-950/80 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              {settings.networkName} — نظام الفواتير والمصروفات وصافي الأرباح وإدارة MikroTik
            </span>
            <span className="text-[11px] text-slate-600 font-mono">
              v2.6.0 • Multi-Category Invoices & Expense Accounting Suite
            </span>
          </div>
        </footer>
      </div>

      {/* MODALS */}

      {/* 1. Multi-Item Invoice Receipt Modal */}
      {selectedInvoiceForReceipt && (
        <InvoiceReceiptModal
          invoice={selectedInvoiceForReceipt}
          settings={settings}
          onClose={() => setSelectedInvoiceForReceipt(null)}
        />
      )}

      {/* 2. Expense Voucher Receipt Modal */}
      {selectedExpenseForReceipt && (
        <ExpenseReceiptModal
          expense={selectedExpenseForReceipt}
          settings={settings}
          onClose={() => setSelectedExpenseForReceipt(null)}
        />
      )}

      {/* 3. POS Account Statement Modal */}
      {statementPOSId !== null && (
        <POSAccountStatementModal
          posPoint={statementPOSId === '' ? null : statementPOS}
          posPoints={scopedPOSPoints}
          categories={scopedCategories}
          sales={scopedSales}
          payments={scopedPayments}
          dispatches={scopedDispatches}
          invoices={scopedInvoices}
          settings={settings}
          initialPaperFormat={statementPaperMode}
          onClose={() => setStatementPOSId(null)}
          onViewPaymentReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
          onPrintSaleReceipt={(sale) => setSelectedSaleForReceipt(sale)}
          onViewInvoiceReceipt={(inv) => setSelectedInvoiceForReceipt(inv)}
        />
      )}

      {/* 4. Record Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          posPoints={scopedPOSPoints}
          initialPOSId={paymentTargetPOSId}
          settings={settings}
          onAddPayment={handleAddPayment}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentTargetPOSId(undefined);
          }}
        />
      )}

      {/* 5. AI Smart Assistant Modal */}
      {isAIModalOpen && (
        <AIAssistantModal
          categories={scopedCategories}
          posPoints={scopedPOSPoints}
          sales={scopedSales}
          settings={settings}
          onClose={() => setIsAIModalOpen(false)}
        />
      )}

      {/* 6. Network Settings & Backup Modal */}
      {isSettingsModalOpen && (
        <NetworkSettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onResetData={handleResetData}
          allAppData={{
            categories,
            posPoints,
            invoices,
            expenses,
            expenseCategories,
            dispatches,
            sales,
            payments,
            orders,
            settings,
          }}
          onRestoreData={handleRestoreData}
          onOpenBackupModal={() => setIsDatabaseBackupOpen(true)}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {/* 6.1 Dedicated Database Backup & Restore Center (JSON) */}
      {isDatabaseBackupOpen && (
        <DatabaseBackupModal
          activeUser={activeUser}
          tenants={tenants}
          users={users}
          categories={categories}
          posPoints={posPoints}
          invoices={invoices}
          expenses={expenses}
          expenseCategories={expenseCategories}
          dispatches={dispatches}
          sales={sales}
          payments={payments}
          orders={orders}
          settings={settings}
          activityLogs={activityLogs}
          selectedTenantFilter={selectedTenantFilter}
          onSaveSettings={handleSaveSettings}
          onRestoreDatabase={handleRestoreDatabase}
          onUpdateUser={handleUpdateUser}
          onClose={() => setIsDatabaseBackupOpen(false)}
          onLogActivity={(action, title, details, status) => {
            logUserActivity(action, 'backup', 'قاعدة البيانات والنسخ الاحتياطي', title, details, 'system');
          }}
        />
      )}

      {/* 7. Single Sale Receipt Print Modal */}
      {selectedSaleForReceipt && (
        <SaleReceiptModal
          sale={selectedSaleForReceipt}
          posPoints={scopedPOSPoints}
          categories={scopedCategories}
          settings={settings}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {/* 8. Official Payment Receipt Modal (سند قبض رسمي) */}
      {selectedPaymentForReceipt && (
        <OfficialPaymentReceiptModal
          payment={selectedPaymentForReceipt}
          posPoints={scopedPOSPoints}
          settings={settings}
          sales={scopedSales}
          payments={scopedPayments}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {/* 9. Comprehensive Income Statement & Financial Report (قائمة الدخل والتقرير المالي) */}
      {isIncomeStatementOpen && (
        <IncomeStatementModal
          isOpen={isIncomeStatementOpen}
          invoices={scopedInvoices}
          expenses={scopedExpenses}
          expenseCategories={scopedExpenseCategories}
          cardCategories={scopedCategories}
          posPoints={scopedPOSPoints}
          payments={scopedPayments}
          sales={scopedSales}
          settings={settings}
          activeUser={activeUser}
          canPrint={hasPermission(activeUser, 'dashboard', 'printIncomeStatement', currentTenant)}
          onClose={() => setIsIncomeStatementOpen(false)}
        />
      )}

      {/* 9.1 Comprehensive Financial Excel/CSV Export Modal */}
      {isFinancialExportModalOpen && (
        <FinancialExportModal
          isOpen={isFinancialExportModalOpen}
          onClose={() => setIsFinancialExportModalOpen(false)}
          invoices={scopedInvoices}
          sales={scopedSales}
          expenses={scopedExpenses}
          posPoints={scopedPOSPoints}
          categories={scopedCategories}
          expenseCategories={scopedExpenseCategories}
          payments={scopedPayments}
          settings={settings}
        />
      )}

      {/* 9.2 Global Multi-Tab & Command Search Modal (البحث الشامل في كل التبويبات) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigate={(view) => setActiveView(view)}
        onOpenInvoiceReceipt={(inv) => setSelectedInvoiceForReceipt(inv)}
        onOpenPaymentReceipt={(pay) => setSelectedPaymentForReceipt(pay)}
        onOpenExpenseReceipt={(exp) => setSelectedExpenseForReceipt(exp)}
        onOpenPOSStatement={(posId) => setStatementPOSId(posId)}
        onOpenQuickSale={() => setActiveView('invoices')}
        onOpenQuickPayment={(posId) => handleOpenPaymentModal(posId)}
        onOpenAI={() => setIsAIModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenIncomeStatement={() => setIsIncomeStatementOpen(true)}
        onOpenFinancialExport={() => setIsFinancialExportModalOpen(true)}
        onOpenLogin={() => handleOpenLoginPortal()}
        onToggleTheme={handleToggleTheme}
        categories={scopedCategories}
        posPoints={scopedPOSPoints}
        invoices={scopedInvoices}
        expenses={scopedExpenses}
        payments={scopedPayments}
        sales={scopedSales}
        dispatches={scopedDispatches}
        users={scopedUsers}
        settings={settings}
        activeUser={activeUser}
        activeTenant={currentTenant}
      />

      {/* Dedicated Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          activeUser={activeUser}
          settings={settings}
          onClose={() => setIsChangePasswordOpen(false)}
          onSave={handleSaveChangedPassword}
        />
      )}

      {/* About Program Modal (Mirab Soft) */}
      {isAboutModalOpen && (
        <AboutProgramModal
          isOpen={isAboutModalOpen}
          settings={settings}
          onClose={() => setIsAboutModalOpen(false)}
        />
      )}

      {/* 9. Dedicated RBAC Login & Switch User Modal */}
      {isLoginModalOpen && (
        <LoginView
          users={users}
          activeUser={loginModalTargetUser || activeUser}
          settings={settings}
          isModal={true}
          onClose={() => {
            setIsLoginModalOpen(false);
            setLoginModalTargetUser(undefined);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 10. Locked / Logged Out Fullscreen Overlay */}
      {!isLoggedIn && !isLoginModalOpen && (
        <LoginView
          users={users}
          activeUser={activeUser}
          settings={settings}
          isModal={false}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

