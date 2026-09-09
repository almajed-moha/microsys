import {
  collection,
  doc,
  getDocs,
  getDoc,
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

// Unified collections for both desktop and mobile/preview environments to ensure zero desynchronization
const DEV_PREFIX = '';

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
let isCloudHydrated = false;

export function setCloudHydrated(val: boolean) {
  isCloudHydrated = val;
}

export function getIsCloudHydrated(): boolean {
  return isCloudHydrated;
}

/**
 * Detect whether the app is currently running inside Google AI Studio / Development environment.
 */
export function isStudioDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return (
    host.includes('ais-dev-') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    localStorage.getItem('mikrotik_pos_disable_cloud_write') === 'true'
  );
}

// Global event emitter helper for sync status
export const emitSyncStatus = (status: 'syncing' | 'synced' | 'error' | 'dev-locked') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: status }));
  }
};

export function setIsReceivingRemote(status: boolean) {
  isReceivingRemoteUpdate = status;
}

/**
 * Permanently delete an individual document from Firestore and update memory tracking state
 */
export async function deleteDocumentFromFirestore(storageKey: string, docId: string): Promise<boolean> {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || !docId) return false;

  // 1. Immediately prune from lastKnownState to prevent diff collision
  if (lastKnownState[storageKey]) {
    lastKnownState[storageKey] = lastKnownState[storageKey].filter((item) => String(item?.id) !== String(docId));
  }

  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();
    const docRef = doc(db, collectionName, String(docId));
    await deleteDoc(docRef);
    console.log(`[CloudSync] Document ${docId} permanently deleted from ${collectionName} in Firestore.`);
    emitSyncStatus('synced');
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error deleting document ${docId} from ${collectionName}:`, err);
    emitSyncStatus('error');
    return false;
  }
}

/**
 * Completely clear all documents in a collection in Firestore
 */
export async function clearCollectionInFirestore(storageKey: string): Promise<void> {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db) return;

  lastKnownState[storageKey] = [];
  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();
    const snap = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count === 490) {
        await batch.commit();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    console.log(`[CloudSync] All documents cleared from ${collectionName} in Firestore.`);
    emitSyncStatus('synced');
  } catch (err) {
    console.error(`[CloudSync] Error clearing collection ${collectionName}:`, err);
    emitSyncStatus('error');
  }
}

/**
 * Synchronize a state array to Firestore
 * Enforces session authentication and atomic batch updates
 */
export async function syncArrayToFirestore(storageKey: string, currentArray: any[]) {
  // Hydration Lock: Never write to cloud before remote data has finished loading initially
  if (!isCloudHydrated) {
    console.warn(`[CloudSync Safety] Skipping sync for ${storageKey} because cloud data has not finished loading.`);
    return;
  }

  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || isReceivingRemoteUpdate) return;
  if (!Array.isArray(currentArray)) return;

  emitSyncStatus('syncing');

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

  // Find deleted items (only if previous state was explicitly tracked and not a partial load)
  for (const id of previousMap.keys()) {
    if (!id) continue;
    if (!currentMap.has(id)) {
      toDelete.push(id);
    }
  }

  if (toAddOrUpdate.length === 0 && toDelete.length === 0) {
    lastKnownState[storageKey] = [...currentArray];
    emitSyncStatus('synced');
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
    emitSyncStatus('synced');
  } catch (error) {
    console.warn(`Cloud sync warning for ${collectionName}:`, error);
    emitSyncStatus('error');
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
    throw err;
  }
}

/**
 * Synchronize tenant-specific settings object to Firestore cloud storage
 */
export async function syncSettingsToFirestore(settings: any, tenantId?: string): Promise<void> {
  if (!db || isReceivingRemoteUpdate || !settings || typeof settings !== 'object') return;

  try {
    await ensureAuthenticatedSession();
    const effectiveId = (tenantId && tenantId !== 'system') ? tenantId : 'net-612524';
    emitSyncStatus('syncing');
    const tenantDocRef = doc(db, 'tenants', effectiveId);
    await setDoc(tenantDocRef, {
      settings: {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
    }, { merge: true });
    console.log(`[CloudSync] Settings successfully synchronized to Firestore for tenant ${effectiveId}.`);
    emitSyncStatus('synced');
  } catch (err) {
    console.warn('Failed to sync settings to Firestore:', err);
    emitSyncStatus('error');
  }
}

/**
 * Load settings object from Firestore cloud storage
 */
export async function loadSettingsFromFirestore(tenantId?: string): Promise<any | null> {
  if (!db || !tenantId) return null;
  try {
    await ensureAuthenticatedSession();
    const tenantDocRef = doc(db, 'tenants', tenantId);
    const snap = await getDoc(tenantDocRef);
    if (snap.exists()) {
      return snap.data()?.settings || null;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load settings from Firestore:', err);
    return null;
  }
}

/**
 * Load all collections from Firestore on startup
 */
export async function loadAllDataFromFirestore(): Promise<Record<string, any> | null> {
  if (!db) return null;

  await ensureAuthenticatedSession();

  const results: Record<string, any> = {};
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

    setCloudHydrated(true);
    emitSyncStatus(isStudioDevEnvironment() ? 'dev-locked' : 'synced');
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
  onUpdate: (key: string, items: any[] | any) => void
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
            
            lastKnownState[storageKey] = [...items];
            setIsReceivingRemote(true);
            onUpdate(storageKey, items);
            setTimeout(() => setIsReceivingRemote(false), 200);
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
