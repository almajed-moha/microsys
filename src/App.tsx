import React, { useState, useEffect, useCallback } from 'react';
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
} from './mockData';
import { initialActivityLogs, buildActivityLog } from './utils/auditLogger';
import {
  getDefaultLandingViewForUser,
  hasPermission,
  getViewNameArabic,
  ROLE_DEFINITIONS,
  getRoleDefaultPermissions,
} from './utils/permissions';
import { CheckCircle2, LogIn, Sparkles, X } from 'lucide-react';

export default function App() {
  // Navigation View State
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States
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
  const [settings, setSettings] = useState<NetworkSettings>(() =>
    loadData<NetworkSettings>(STORAGE_KEYS.SETTINGS, defaultNetworkSettings)
  );
  const [users, setUsers] = useState<AppUser[]>(() => {
    const loadedUsers = loadData<AppUser[]>(STORAGE_KEYS.USERS, mockUsers);
    if (!loadedUsers.some((u) => u.username === 'master')) {
      const masterUser = mockUsers.find((u) => u.username === 'master');
      if (masterUser) {
        loadedUsers.unshift(masterUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers));
      }
    }
    return loadedUsers;
  });
  const [tenants, setTenants] = useState<NetworkTenant[]>(() =>
    loadData<NetworkTenant[]>('mikrotik_pos_tenants', mockTenants)
  );
  const [orders, setOrders] = useState<CardOrder[]>(() =>
    loadData<CardOrder[]>(STORAGE_KEYS.ORDERS, mockCardOrders)
  );
  const [activeUserId, setActiveUserId] = useState<string>(() =>
    loadData<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'user-admin')
  );
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>(() =>
    loadData<UserActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, initialActivityLogs)
  );

  // Derive active user object safely
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || mockUsers[0];

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
      setActivityLogs((prev) => [newEntry, ...prev]);
    },
    [activeUser]
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

    const isThemeChanged = prevSettings.themeMode !== newSettings.themeMode;
    const log = buildActivityLog(activeUser, {
      action: 'تحديث إعدادات النظام',
      actionType: 'update',
      targetModule: 'system',
      targetModuleName: 'إعدادات النظام',
      title: 'تحديث إعدادات الشبكة والنظام',
      details: isThemeChanged
        ? `تم حفظ إعدادات النظام وتغيير السمة إلى: ${newSettings.themeMode === 'dark' ? 'الوضع الليلي' : newSettings.themeMode === 'light' ? 'الوضع النهاري' : 'تلقائي (System)'}`
        : `تم تحديث إعدادات النظام والشبكة بنجاح`,
      status: 'info',
    });
    setActivityLogs((prev) => [log, ...(prev || [])]);
  };

  const handleSaveTenant = (tenant: NetworkTenant) => {
    const isExisting = tenants.some((t) => t.id === tenant.id);
    let updatedTenants;
    if (isExisting) {
      updatedTenants = tenants.map((t) => (t.id === tenant.id ? tenant : t));
    } else {
      updatedTenants = [...tenants, tenant];
      
      const adminExists = users.some(u => u.username === tenant.adminUsername);
      if (!adminExists) {
        const newAdmin: AppUser = {
          id: `user-${Date.now()}`,
          networkId: tenant.id,
          name: `مدير ${tenant.name}`,
          username: tenant.adminUsername,
          password: 'adminpassword',
          role: 'super_admin',
          status: 'active',
          permissions: getRoleDefaultPermissions('super_admin'),
          createdAt: new Date().toISOString().split('T')[0],
        };
        const updatedUsers = [...users, newAdmin];
        setUsers(updatedUsers);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      }
    }
    setTenants(updatedTenants);
    localStorage.setItem('mikrotik_pos_tenants', JSON.stringify(updatedTenants));
    
    logUserActivity(
      isExisting ? 'تحديث بيانات شبكة' : 'إضافة شبكة جديدة',
      `تم ${isExisting ? 'تحديث' : 'إضافة'} شبكة: ${tenant.name}`,
      'systemTenants'
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

    const newPos: POSPoint = {
      ...newPosData,
      id: newPosId,
      username: finalUsername,
      password: finalPassword,
      pinCode: finalPin,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setPosPoints((prev) => [...prev, newPos]);

    // Create synchronized Portal user for the POS Point
    const posUser: AppUser = {
      id: `user-${newPos.id}`,
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

  const handleUpdatePOS = (updatedPOS: POSPoint) => {
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
        const posUser: AppUser = {
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
        // Ensure no conflicting username
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

    const newInvoice: InvoiceRecord = {
      ...invoiceData,
      invoiceNumber: finalInvoiceNumber,
      id: `inv-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);

    // Adjust category warehouse stock for each item in the invoice
    setCategories((prevCategories) => {
      return prevCategories.map((cat) => {
        const item = newInvoice.items.find((i) => i.categoryId === cat.id);
        if (!item) return cat;

        let stockChange = 0;
        if (newInvoice.type === 'sale') {
          // Deduct from warehouse stock when cards are sold/dispatched
          stockChange = -item.quantity;
        } else if (newInvoice.type === 'return') {
          // Return cards back to warehouse stock
          stockChange = item.quantity;
        }

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

  const handleUpdateInvoice = (updatedInvoice: InvoiceRecord) => {
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
    const newOrder: CardOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: nextOrderNumber,
      status: 'pending',
      requestDate: orderData.requestDate || today,
      timestamp: orderData.timestamp || new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);

    const posPoint = posPoints.find((p) => p.id === orderData.posPointId);
    logUserActivity(
      'طلب كروت جديد',
      'orders',
      'طلبات الكروت وبوابة الموزعين',
      `طلب كروت جديد رقم ${newOrder.orderNumber}`,
      `نقطة البيع: ${posPoint?.name || orderData.posPointName} - إجمالي المبلغ: ${(newOrder.totalWholesaleAmount ?? 0).toLocaleString()} ${settings.currencySymbol} - عدد الفئات: ${newOrder.items?.length || 0}`,
      'create'
    );
  };

  const handleCancelOrder = (orderId: string, reason?: string) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'cancelled', adminNotes: reason || ord.adminNotes } : ord))
    );
    const target = orders.find((o) => o.id === orderId);
    if (target) {
      logUserActivity(
        'إلغاء طلب كروت',
        'orders',
        'طلبات الكروت وبوابة الموزعين',
        `إلغاء طلب الكروت رقم ${target.orderNumber}`,
        `السبب: ${reason || 'تم الإلغاء'}`,
        'update'
      );
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: CardOrder['status'], adminNotes?: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    // If order is changed to 'delivered' or 'approved' and not converted yet, automatically create sales invoice!
    if ((status === 'delivered' || status === 'approved') && !target.convertedInvoiceId) {
      handleConvertOrderToInvoice(orderId);
      return;
    }

    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status, adminNotes: adminNotes ?? ord.adminNotes } : ord))
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

    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
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
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'delivered',
              convertedInvoiceId: newInvoice.id,
              adminNotes: `تم تحويل الطلب بنجاح إلى فاتورة مبيعات رسمية رقم ${newInvoice.invoiceNumber}`,
            }
          : ord
      )
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

    const newExpense: ExpenseRecord = {
      ...expenseData,
      voucherNumber: finalVoucherNumber,
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
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

  const handleUpdateExpense = (updatedExpense: ExpenseRecord) => {
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
    const newCat: ExpenseCategory = {
      ...catData,
      id: `expcat-${Date.now()}`,
    };
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

  const handleUpdateExpenseCategory = (updatedCat: ExpenseCategory) => {
    setExpenseCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
  };

  const handleDeleteExpenseCategory = (catId: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  // 4. Sales Actions (Legacy single-card sales support)
  const handleAddSale = (saleData: Omit<SalesRecord, 'id' | 'timestamp'>) => {
    const newSale: SalesRecord = {
      ...saleData,
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const nextSales = [newSale, ...sales];
    setSales(nextSales);
    setPosPoints((prev) => refreshPOSBalances(prev, invoices, nextSales, payments));
  };

  const handleUpdateSale = (updatedSale: SalesRecord) => {
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
    const newCat: CardCategory = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
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

  const handleUpdateCategory = (updatedCat: CardCategory) => {
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
      prev.map((c) => (c.id === catId ? { ...c, warehouseStock: Math.max(0, c.warehouseStock + delta) } : c))
    );
  };

  // 6. Batch Dispatch Actions (Legacy)
  const handleAddDispatch = (dispatchData: Omit<CardBatchDispatch, 'id' | 'soldCount'>) => {
    const newDispatch: CardBatchDispatch = {
      ...dispatchData,
      id: `disp-${Date.now()}`,
      soldCount: 0,
    };

    setDispatches((prev) => [newDispatch, ...prev]);

    setCategories((prev) =>
      prev.map((c) =>
        c.id === dispatchData.categoryId
          ? { ...c, warehouseStock: Math.max(0, c.warehouseStock - dispatchData.quantity) }
          : c
      )
    );
  };

  const handleUpdateDispatch = (updatedDispatch: CardBatchDispatch) => {
    const prevDispatch = dispatches.find((d) => d.id === updatedDispatch.id);
    const qtyDiff = prevDispatch ? updatedDispatch.quantity - prevDispatch.quantity : 0;

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
          return {
            ...d,
            quantity: newQty,
            totalWholesaleValue: d.unitWholesalePrice * newQty,
            totalRetailValue: d.unitRetailPrice * newQty,
          };
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
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

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

  const handleUpdatePayment = (updatedPayment: PaymentRecord) => {
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
    const newUser: AppUser = {
      ...newUserData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setUsers((prev) => [...prev, newUser]);
    logUserActivity(
      'إضافة مستخدم جديد',
      'users',
      'المستخدمين والصلاحيات',
      `إنشاء حساب مستخدم جديد: ${newUser.name} (@${newUser.username})`,
      `الدور الوظيفي: ${newUser.customRoleName || newUser.role} - الحالة: ${newUser.status === 'active' ? 'نشط' : 'معطل'}`,
      'security'
    );
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
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
    if (userId === 'user-admin') return; // protect primary admin
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (activeUserId === userId) {
      setActiveUserId('user-admin');
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
  const handleLoginSuccess = (user: AppUser, targetView: NavView) => {
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) }
        : u
    );
    setUsers(updatedUsers);
    setActiveUserId(user.id);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
    setActiveView(targetView);

    // High-visibility Feedback Banner
    setUserLoginFeedback({
      title: `مرحباً بك، ${user.name}!`,
      subtitle: `تم تسجيل الدخول بنجاح والتوجيه إلى (${getViewNameArabic(targetView)}) وفق صلاحيات حسابك.`,
    });
    setTimeout(() => {
      setUserLoginFeedback(null);
    }, 4500);
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsLoginModalOpen(true);
  };

  // Fast switch handler with auto-redirect
  const handleSwitchActiveUser = (targetUser: AppUser) => {
    const targetLanding = getDefaultLandingViewForUser(targetUser);
    setActiveUserId(targetUser.id);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id
          ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) }
          : u
      )
    );
    setActiveView(targetLanding);

    setUserLoginFeedback({
      title: `تم تبديل الحساب: ${targetUser.name}`,
      subtitle: `تم نقلك تلقائياً إلى (${getViewNameArabic(targetLanding)}) بناءً على صلاحياتك المعتمدة.`,
    });
    setTimeout(() => {
      setUserLoginFeedback(null);
    }, 4000);
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
    return hasPermission(activeUser, mod, 'view');
  };

  // Reset Data
  const handleResetData = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط البيانات إلى الحالة الافتراضية؟')) {
      resetToMockData();
      setCategories(mockCategories);
      setInvoices(mockInvoices);
      setExpenses(mockExpenses);
      setExpenseCategories(mockExpenseCategories);
      setDispatches(mockDispatches);
      setSales(mockSales);
      setPayments(mockPayments);
      setOrders(mockCardOrders);
      setUsers(mockUsers);
      setActiveUserId('user-admin');
      setSettings(defaultNetworkSettings);
      setPosPoints(synchronizePOSBalances(mockPOSPoints, mockInvoices, mockSales, mockPayments, mockDispatches));
    }
  };

  // Restore Backup
  const handleRestoreData = (backup: any) => {
    if (backup.categories) setCategories(backup.categories);
    if (backup.invoices) setInvoices(backup.invoices);
    if (backup.expenses) setExpenses(backup.expenses);
    if (backup.expenseCategories) setExpenseCategories(backup.expenseCategories);
    if (backup.dispatches) setDispatches(backup.dispatches);
    if (backup.sales) setSales(backup.sales);
    if (backup.payments) setPayments(backup.payments);
    if (backup.orders) setOrders(backup.orders);
    if (backup.settings) setSettings(backup.settings);
    if (backup.posPoints) {
      const restoredInvoices = backup.invoices || invoices;
      const restoredSales = backup.sales || sales;
      const restoredPayments = backup.payments || payments;
      const restoredDispatches = backup.dispatches || dispatches;
      setPosPoints(synchronizePOSBalances(backup.posPoints, restoredInvoices, restoredSales, restoredPayments, restoredDispatches));
    }
  };

  // Quick Triggers
  const handleOpenPaymentModal = (posId?: string) => {
    setPaymentTargetPOSId(posId);
    setIsPaymentModalOpen(true);
  };

  const statementPOS = (posPoints || []).find((p) => p?.id === statementPOSId);
  const totalDebt = (posPoints || []).reduce((acc, p) => acc + (p?.currentDebt || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const totalSalesToday = (invoices || [])
    .filter((inv) => inv && inv.type === 'sale' && (inv.date === todayStr || inv.date?.startsWith(todayStr)))
    .reduce((acc, inv) => acc + (inv?.totalWholesaleAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-indigo-500 selection:text-white font-sans antialiased">
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
        onOpenAI={() => setIsAIModalOpen(true)}
        onOpenNewPayment={() => handleOpenPaymentModal()}
        onOpenNewSale={() => setActiveView('invoices')}
        settings={settings}
        posPoints={posPoints}
        sales={sales}
        payments={payments}
        categories={categories}
        dispatches={dispatches}
        invoices={invoices}
        expenses={expenses}
        users={users}
        orders={orders}
        activeUser={activeUser}
        onResetData={handleResetData}
        onOpenLogin={() => handleOpenLoginPortal()}
        onLogout={handleLogout}
        counts={{
          posPoints: posPoints.length,
          sales: sales.length,
          payments: payments.length,
          categories: categories.length,
          dispatches: dispatches.length,
          invoices: invoices.length,
          expenses: expenses.length,
          users: users.length,
          orders: orders.length,
          pendingOrders: orders.filter((o) => o.status === 'pending').length,
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
          pendingOrdersCount={orders.filter((o) => o.status === 'pending').length}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onOpenQuickSale={() => setActiveView('invoices')}
          onOpenQuickPayment={() => handleOpenPaymentModal()}
          onOpenAI={() => setIsAIModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenLogin={() => handleOpenLoginPortal()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
                />
              )}

              {activeView === 'dashboard' && (
                <DashboardView
                  categories={categories}
                  posPoints={posPoints}
                  sales={sales}
                  payments={payments}
                  dispatches={dispatches}
                  invoices={invoices}
                  expenses={expenses}
                  settings={settings}
                  onNavigateToTab={(tab) => setActiveView(tab as any)}
                  onSelectPOSForStatement={(id) => setStatementPOSId(id)}
                  onOpenQuickSale={() => setActiveView('invoices')}
                  onOpenAI={() => setIsAIModalOpen(true)}
                  onPrintSaleReceipt={(sale) => setSelectedSaleForReceipt(sale)}
                  onOpenIncomeStatement={() => setIsIncomeStatementOpen(true)}
                  canViewIncomeStatement={hasPermission(activeUser, 'dashboard', 'viewIncomeStatement')}
                />
              )}

              {activeView === 'pos_portal' && (
                <POSPortalView
                  activeUser={activeUser}
                  posPoints={posPoints}
                  categories={categories}
                  orders={orders}
                  invoices={invoices}
                  payments={payments}
                  settings={settings}
                  onCreateOrder={handleCreateOrder}
                  onCancelOrder={handleCancelOrder}
                />
              )}

              {activeView === 'orders' && (
                <OrdersManagementView
                  orders={orders}
                  posPoints={posPoints}
                  categories={categories}
                  invoices={invoices}
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
                  invoices={invoices}
                  posPoints={posPoints}
                  categories={categories}
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
                  expenses={expenses}
                  categories={expenseCategories}
                  settings={settings}
                  onAddExpense={handleAddExpense}
                  onUpdateExpense={handleUpdateExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onAddCategory={handleAddExpenseCategory}
                  onUpdateCategory={handleUpdateExpenseCategory}
                  onDeleteCategory={handleDeleteExpenseCategory}
                  onViewReceipt={(exp) => setSelectedExpenseForReceipt(exp)}
                  onOpenIncomeStatement={() => setIsIncomeStatementOpen(true)}
                  canViewIncomeStatement={hasPermission(activeUser, 'dashboard', 'viewIncomeStatement')}
                />
              )}

              {activeView === 'pos' && (
                <POSPointsView
                  posPoints={posPoints}
                  categories={categories}
                  dispatches={dispatches}
                  sales={sales}
                  payments={payments}
                  settings={settings}
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
                  payments={payments}
                  posPoints={posPoints}
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
                  categories={categories}
                  settings={settings}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onAdjustStock={handleAdjustStock}
                />
              )}

              {activeView === 'mikrotik' && (
                <MikrotikLiveView
                  settings={settings}
                  categories={categories}
                  onUpdateSettings={(newSettings) => setSettings(newSettings)}
                />
              )}

              {activeView === 'users' && (
                <UsersAndPermissionsView
                  users={users}
                  activeUser={activeUser}
                  activityLogs={activityLogs}
                  settings={settings}
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
                  sales={sales}
                  posPoints={posPoints}
                  categories={categories}
                  dispatches={dispatches}
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
                  dispatches={dispatches}
                  posPoints={posPoints}
                  categories={categories}
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
      {statementPOS && (
        <POSAccountStatementModal
          posPoint={statementPOS}
          categories={categories}
          sales={sales}
          payments={payments}
          dispatches={dispatches}
          settings={settings}
          initialPaperFormat={statementPaperMode}
          onClose={() => setStatementPOSId(null)}
          onViewPaymentReceipt={(payment) => setSelectedPaymentForReceipt(payment)}
          onPrintSaleReceipt={(sale) => setSelectedSaleForReceipt(sale)}
        />
      )}

      {/* 4. Record Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          posPoints={posPoints}
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
          categories={categories}
          posPoints={posPoints}
          sales={sales}
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
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}

      {/* 7. Single Sale Receipt Print Modal */}
      {selectedSaleForReceipt && (
        <SaleReceiptModal
          sale={selectedSaleForReceipt}
          posPoints={posPoints}
          categories={categories}
          settings={settings}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {/* 8. Official Payment Receipt Modal (سند قبض رسمي) */}
      {selectedPaymentForReceipt && (
        <OfficialPaymentReceiptModal
          payment={selectedPaymentForReceipt}
          posPoints={posPoints}
          settings={settings}
          sales={sales}
          payments={payments}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {/* 9. Comprehensive Income Statement & Financial Report (قائمة الدخل والتقرير المالي) */}
      {isIncomeStatementOpen && (
        <IncomeStatementModal
          isOpen={isIncomeStatementOpen}
          invoices={invoices}
          expenses={expenses}
          expenseCategories={expenseCategories}
          cardCategories={categories}
          posPoints={posPoints}
          payments={payments}
          sales={sales}
          settings={settings}
          activeUser={activeUser}
          canPrint={hasPermission(activeUser, 'dashboard', 'printIncomeStatement')}
          onClose={() => setIsIncomeStatementOpen(false)}
        />
      )}

      {/* 9.1 Comprehensive Financial Excel/CSV Export Modal */}
      {isFinancialExportModalOpen && (
        <FinancialExportModal
          isOpen={isFinancialExportModalOpen}
          onClose={() => setIsFinancialExportModalOpen(false)}
          invoices={invoices}
          sales={sales}
          expenses={expenses}
          posPoints={posPoints}
          categories={categories}
          expenseCategories={expenseCategories}
          payments={payments}
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
        categories={categories}
        posPoints={posPoints}
        invoices={invoices}
        expenses={expenses}
        payments={payments}
        sales={sales}
        dispatches={dispatches}
        users={users}
        settings={settings}
        activeUser={activeUser}
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

