import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importStr = "import { loadTenantDataFromFirestore } from './services/cloudSync';\n";
if (!code.includes("import { loadTenantDataFromFirestore }")) {
  code = code.replace("import { initialActivityLogs", importStr + "import { initialActivityLogs");
}

const oldLoginSuccess = `  const handleLoginSuccess = (user: AppUser, targetView: NavView) => {
    const updatedUsers = users.map((u) =>
      u.id === user.id
        ? { ...u, lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) }
        : u
    );
    setUsers(updatedUsers);
    saveData(STORAGE_KEYS.USERS, updatedUsers);
    setActiveUserId(user.id);
    saveData(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
    setActiveView(targetView);`;

const newLoginSuccess = `  const [isSyncing, setIsSyncing] = useState(false);
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
    setActiveView(targetView);`;

code = code.replace(oldLoginSuccess, newLoginSuccess);

const syncingOverlay = `
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
           <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
              <h3 className="text-xl font-bold text-white mb-2">مزامنة سحابية</h3>
              <p className="text-slate-400">{syncMessage || 'جاري الاتصال بقاعدة البيانات...'}</p>
           </div>
        </div>
      )}
      <div className="flex h-screen bg-slate-50 relative overflow-hidden" dir="rtl">`;

code = code.replace(`<div className="flex h-screen bg-slate-50 relative overflow-hidden" dir="rtl">`, syncingOverlay);

fs.writeFileSync('src/App.tsx', code);
console.log('done');
