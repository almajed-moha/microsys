import fs from 'fs';

// Patch mockData.ts
let mockCode = fs.readFileSync('src/mockData.ts', 'utf8');
if (!mockCode.includes('initialCustomers')) {
  mockCode = mockCode.replace("export const initialTenants: NetworkTenant[] = [];", "export const initialTenants: NetworkTenant[] = [];\nexport const initialCustomers: any[] = [];");
  mockCode = mockCode.replace("export const mockCardOrders = initialCardOrders;", "export const mockCardOrders = initialCardOrders;\nexport const mockCustomers = initialCustomers;");
  fs.writeFileSync('src/mockData.ts', mockCode);
}

// Patch storage.ts
let storageCode = fs.readFileSync('src/utils/storage.ts', 'utf8');
if (!storageCode.includes('CUSTOMERS:')) {
  storageCode = storageCode.replace("ORDERS: 'mikrotik_pos_card_orders',", "ORDERS: 'mikrotik_pos_card_orders',\n  CUSTOMERS: 'mikrotik_pos_customers',");
  fs.writeFileSync('src/utils/storage.ts', storageCode);
}

// Patch cloudSync.ts
let syncCode = fs.readFileSync('src/services/cloudSync.ts', 'utf8');
if (!syncCode.includes('CUSTOMERS:')) {
  syncCode = syncCode.replace("ORDERS: 'mikrotik_pos_card_orders',", "ORDERS: 'mikrotik_pos_card_orders',\n  CUSTOMERS: 'mikrotik_pos_customers',");
  syncCode = syncCode.replace("[STORAGE_KEYS.ORDERS]: 'orders',", "[STORAGE_KEYS.ORDERS]: 'orders',\n  [STORAGE_KEYS.CUSTOMERS]: 'customers',");
  syncCode = syncCode.replace("{ key: STORAGE_KEYS.ORDERS, name: 'orders' }", "{ key: STORAGE_KEYS.ORDERS, name: 'orders' },\n    { key: STORAGE_KEYS.CUSTOMERS, name: 'customers' }");
  syncCode = syncCode.replace("if (results[STORAGE_KEYS.TENANTS])", "if (results[STORAGE_KEYS.CUSTOMERS]) { lastKnownState[STORAGE_KEYS.CUSTOMERS] = results[STORAGE_KEYS.CUSTOMERS]; }\n        if (results[STORAGE_KEYS.TENANTS])");
  fs.writeFileSync('src/services/cloudSync.ts', syncCode);
}

// Patch App.tsx sync handling
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes('if (results[STORAGE_KEYS.CUSTOMERS]) { setCustomers')) {
  appCode = appCode.replace("if (results[STORAGE_KEYS.ORDERS]) { setOrders(results[STORAGE_KEYS.ORDERS]); saveData(STORAGE_KEYS.ORDERS, results[STORAGE_KEYS.ORDERS]); }", "if (results[STORAGE_KEYS.ORDERS]) { setOrders(results[STORAGE_KEYS.ORDERS]); saveData(STORAGE_KEYS.ORDERS, results[STORAGE_KEYS.ORDERS]); }\n          if (results[STORAGE_KEYS.CUSTOMERS]) { setCustomers(results[STORAGE_KEYS.CUSTOMERS]); saveData(STORAGE_KEYS.CUSTOMERS, results[STORAGE_KEYS.CUSTOMERS]); }");
  
  // also add customers state
  appCode = appCode.replace("const [orders, setOrders] = useState<CardOrder[]>([]);", "const [orders, setOrders] = useState<CardOrder[]>([]);\n  const [customers, setCustomers] = useState<any[]>(loadData(STORAGE_KEYS.CUSTOMERS, []));");
  
  fs.writeFileSync('src/App.tsx', appCode);
}

console.log('done');
