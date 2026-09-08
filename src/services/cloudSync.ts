import {
  collection,
  doc,
  getDocs,
  writeBatch,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, ensureAuthenticatedSession } from '../firebase';

export const STORAGE_KEYS = {
  SETTINGS: 'mikrotik_pos_settings',
  CATEGORIES: 'mikrotik_pos_categories',
  POS_POINTS: 'mikrotik_pos_points',
  DISPATCHES: 'mikrotik_pos_dispatches',
  SALES: 'mikrotik_pos_sales',
  PAYMENTS: 'mikrotik_pos_payments',
  VOUCHERS: 'mikrotik_pos_vouchers',
  TEMPLATES: 'mikrotik_pos_templates',
  INVOICES: 'mikrotik_pos_invoices',
  EXPENSES: 'mikrotik_pos_expenses',
  EXPENSE_CATEGORIES: 'mikrotik_pos_expense_categories',
  USERS: 'mikrotik_pos_users',
  TENANTS: 'mikrotik_pos_tenants',
  ACTIVE_USER_ID: 'mikrotik_pos_active_user_id',
  ACTIVITY_LOGS: 'mikrotik_pos_activity_logs',
  ORDERS: 'mikrotik_pos_card_orders',
  CUSTOMERS: 'mikrotik_pos_customers',
};

export const COLLECTION_MAP: Record<string, string> = {
  [STORAGE_KEYS.USERS]: 'users',
  [STORAGE_KEYS.TENANTS]: 'tenants',
  [STORAGE_KEYS.CATEGORIES]: 'categories',
  [STORAGE_KEYS.POS_POINTS]: 'posPoints',
  [STORAGE_KEYS.DISPATCHES]: 'dispatches',
  [STORAGE_KEYS.SALES]: 'sales',
  [STORAGE_KEYS.PAYMENTS]: 'payments',
  [STORAGE_KEYS.INVOICES]: 'invoices',
  [STORAGE_KEYS.EXPENSES]: 'expenses',
  [STORAGE_KEYS.EXPENSE_CATEGORIES]: 'expenseCategories',
  [STORAGE_KEYS.ACTIVITY_LOGS]: 'activityLogs',
  [STORAGE_KEYS.ORDERS]: 'orders',
  [STORAGE_KEYS.CUSTOMERS]: 'customers',
};

// Keep track of the last known state to prevent unnecessary loops and writes
const lastKnownState: Record<string, any[]> = {};
let isReceivingRemoteUpdate = false;

export function setIsReceivingRemote(status: boolean) {
  isReceivingRemoteUpdate = status;
}

/**
 * Synchronize a state array to Firestore
 * Enforces session authentication and atomic batch updates
 */
export async function syncArrayToFirestore(storageKey: string, currentArray: any[]) {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || isReceivingRemoteUpdate) return;
  if (!Array.isArray(currentArray)) return;

  // Ensure client is authenticated before performing operations
  await ensureAuthenticatedSession();

  const previousArray = lastKnownState[storageKey] || [];
  
  // Create maps for lookup
  const currentMap = new Map(currentArray.map(item => [item?.id || String(Math.random()), item]));
  const previousMap = new Map(previousArray.map(item => [item?.id, item]));

  const toAddOrUpdate: any[] = [];
  const toDelete: string[] = [];

  // Find added or updated items
  for (const [id, currentItem] of currentMap.entries()) {
    if (!id) continue;
    const previousItem = previousMap.get(id);
    if (!previousItem || JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      toAddOrUpdate.push(currentItem);
    }
  }

  // Find deleted items
  for (const id of previousMap.keys()) {
    if (!id) continue;
    if (!currentMap.has(id)) {
      toDelete.push(id);
    }
  }

  if (toAddOrUpdate.length === 0 && toDelete.length === 0) {
    lastKnownState[storageKey] = [...currentArray];
    return;
  }

  try {
    const batch = writeBatch(db);
    let opCount = 0;

    for (const item of toAddOrUpdate) {
      if (!item.id) continue;
      const docRef = doc(db, collectionName, String(item.id));
      
      const dataToSave = { ...item };
      // Sanitize undefined values
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) delete dataToSave[key];
      });

      batch.set(docRef, dataToSave, { merge: true });
      opCount++;

      if (opCount === 490) {
        await batch.commit();
        opCount = 0;
      }
    }

    for (const delId of toDelete) {
      const docRef = doc(db, collectionName, String(delId));
      batch.delete(docRef);
      opCount++;

      if (opCount === 490) {
        await batch.commit();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
    
    lastKnownState[storageKey] = [...currentArray];
  } catch (error) {
    console.warn(`Cloud sync warning for ${collectionName}:`, error);
  }
}

export async function fetchUsersFromCloud(): Promise<any[]> {
  if (!db) return [];
  await ensureAuthenticatedSession();
  try {
    const snap = await getDocs(collection(db, COLLECTION_MAP[STORAGE_KEYS.USERS]));
    const items: any[] = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch (err) {
    console.warn('Failed to fetch users from cloud:', err);
    return [];
  }
}

/**
 * Load all collections from Firestore on startup
 */
export async function loadAllDataFromFirestore(): Promise<Record<string, any[]> | null> {
  if (!db) return null;

  await ensureAuthenticatedSession();

  const results: Record<string, any[]> = {};
  let totalDocsFound = 0;

  try {
    for (const [storageKey, collectionName] of Object.entries(COLLECTION_MAP)) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        const items: any[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });
        results[storageKey] = items;
        lastKnownState[storageKey] = [...items];
        totalDocsFound += items.length;
      } catch (collErr) {
        console.warn(`Could not read collection ${collectionName}:`, collErr);
      }
    }

    if (totalDocsFound === 0) {
      return null;
    }

    return results;
  } catch (err) {
    console.warn('Failed to load online Firestore data:', err);
    return null;
  }
}

/**
 * Subscribe to real-time updates from Firestore across all connected devices
 */
export function subscribeToCloudUpdates(
  onUpdate: (key: string, items: any[]) => void
): () => void {
  if (!db) return () => {};

  const unsubscribes: Unsubscribe[] = [];

  // Guarantee authentication before subscribing
  ensureAuthenticatedSession().then(() => {
    for (const [storageKey, collectionName] of Object.entries(COLLECTION_MAP)) {
      try {
        const unsub = onSnapshot(
          collection(db, collectionName),
          (snapshot) => {
            const items: any[] = [];
            snapshot.forEach((d) => {
              items.push({ id: d.id, ...d.data() });
            });
            if (items.length > 0) {
              lastKnownState[storageKey] = [...items];
              setIsReceivingRemote(true);
              onUpdate(storageKey, items);
              setTimeout(() => setIsReceivingRemote(false), 200);
            }
          },
          (error) => {
            console.warn(`Live listener error on ${collectionName}:`, error);
          }
        );
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn(`Failed to set up listener for ${collectionName}:`, e);
      }
    }
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

/**
 * Force synchronization of all collections to the cloud
 */
export async function forceSyncAllToCloud(dataState: Record<string, any[]>) {
  if (!db) return false;
  await ensureAuthenticatedSession();
  
  for (const [storageKey, items] of Object.entries(dataState)) {
    if (Array.isArray(items) && COLLECTION_MAP[storageKey]) {
      await syncArrayToFirestore(storageKey, items);
    }
  }
  return true;
}

/**
 * Backwards compatibility helper
 */
export async function loadTenantDataFromFirestore(
  tenantId: string,
  onProgress?: (msg: string) => void
) {
  if (!db) return null;
  return loadAllDataFromFirestore();
}
