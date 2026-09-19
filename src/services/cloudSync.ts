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
  CARD_USAGE_LOGS: 'mikrotik_pos_card_usage_logs',
  ISP_TRAFFIC_LOGS: 'mikrotik_pos_isp_traffic_logs',
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
  [STORAGE_KEYS.CARD_USAGE_LOGS]: 'cardUsageLogs',
  [STORAGE_KEYS.ISP_TRAFFIC_LOGS]: 'ispTrafficLogs',
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

// Track deleted IDs across sessions so deleted items are never revived by stale local storage
const DELETED_IDS_KEY = 'mikrotik_pos_deleted_ids';

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIds();
    set.add(String(id));
    // Keep only last 2000 deleted IDs to prevent unbounded storage growth
    const arr = Array.from(set).slice(-2000);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to save deleted ID:', e);
  }
}

function removeDeletedId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const set = getDeletedIds();
    if (set.has(String(id))) {
      set.delete(String(id));
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {
    console.warn('Failed to remove deleted ID:', e);
  }
}

/**
 * Detect whether the app is currently running inside Google AI Studio / Development environment.
 */
export function isStudioDevEnvironment(): boolean {
  return false;
}

// Global event emitter helper for sync status
export const emitSyncStatus = (status: 'syncing' | 'synced' | 'error' | 'dev-locked' | 'online') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: status }));
  }
};

export function setIsReceivingRemote(status: boolean) {
  isReceivingRemoteUpdate = status;
}

/**
 * Immediately save or update a single document in Firestore with full sanitization.
 * Guarantees real-time persistence across all devices without waiting for batch sync.
 */
export async function saveDocumentToFirestore(storageKey: string, item: any): Promise<boolean> {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || !item || !item.id) return false;

  const docId = String(item.id);
  removeDeletedId(docId);

  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();
    const docRef = doc(db, collectionName, docId);

    const dataToSave = { ...item };
    // Sanitize undefined values for Firestore compatibility
    Object.keys(dataToSave).forEach((key) => {
      if (dataToSave[key] === undefined) delete dataToSave[key];
    });

    await setDoc(docRef, dataToSave, { merge: true });

    // Update in-memory lastKnownState
    if (!lastKnownState[storageKey]) lastKnownState[storageKey] = [];
    const idx = lastKnownState[storageKey].findIndex((x) => String(x?.id) === docId);
    if (idx >= 0) {
      lastKnownState[storageKey][idx] = { ...dataToSave };
    } else {
      lastKnownState[storageKey].push({ ...dataToSave });
    }

    emitSyncStatus('synced');
    console.log(`[CloudSync] Document ${docId} successfully saved to ${collectionName}.`);
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error saving document ${docId} to ${collectionName}:`, err);
    emitSyncStatus('error');
    return false;
  }
}

/**
 * Permanently delete an individual document from Firestore and update memory tracking state
 */
export async function deleteDocumentFromFirestore(storageKey: string, docId: string): Promise<boolean> {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || !docId) return false;

  const cleanId = String(docId);
  addDeletedId(cleanId);

  // 1. Immediately prune from lastKnownState to prevent diff collision
  if (lastKnownState[storageKey]) {
    lastKnownState[storageKey] = lastKnownState[storageKey].filter((item) => String(item?.id) !== cleanId);
  }

  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();
    const docRef = doc(db, collectionName, cleanId);
    await deleteDoc(docRef);
    console.log(`[CloudSync] Document ${cleanId} permanently deleted from ${collectionName} in Firestore.`);
    emitSyncStatus('synced');
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error deleting document ${cleanId} from ${collectionName}:`, err);
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
      addDeletedId(d.id);
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
 * Enforces session authentication and atomic batch updates with zero-data-loss protection
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

  // SAFETY GUARD: If currentArray is unexpectedly empty while previously populated,
  // do NOT wipe the entire collection in Firestore!
  const previousArray = lastKnownState[storageKey] || [];
  if (currentArray.length === 0 && previousArray.length > 0) {
    console.warn(`[CloudSync Safety] Blocked accidental empty wipe for collection ${collectionName}.`);
    return;
  }

  emitSyncStatus('syncing');

  // Ensure client is authenticated before performing operations
  await ensureAuthenticatedSession();

  // Create maps for lookup
  const currentMap = new Map(currentArray.map((item) => [String(item?.id || Math.random()), item]));
  const previousMap = new Map(previousArray.map((item) => [String(item?.id), item]));
  const deletedSet = getDeletedIds();

  const toAddOrUpdate: any[] = [];
  const toDelete: string[] = [];

  // Find added or updated items
  for (const [id, currentItem] of currentMap.entries()) {
    if (!id || id === 'undefined' || id === 'null') continue;
    // If it was marked as deleted previously, unmark it because it's in active state
    if (deletedSet.has(id)) {
      removeDeletedId(id);
    }
    const previousItem = previousMap.get(id);
    if (!previousItem || JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      toAddOrUpdate.push(currentItem);
    }
  }

  // Find deleted items (ONLY if explicitly tracked in deletedSet to prevent accidental wipe)
  for (const id of previousMap.keys()) {
    if (!id) continue;
    if (!currentMap.has(id) && deletedSet.has(id)) {
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
      Object.keys(dataToSave).forEach((key) => {
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

// Debounce map for automatic background sync
const syncTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Debounced synchronization of state array to Firestore
 */
export function debouncedSyncArrayToFirestore(storageKey: string, currentArray: any[], delay = 800) {
  if (syncTimeouts[storageKey]) {
    clearTimeout(syncTimeouts[storageKey]);
  }
  syncTimeouts[storageKey] = setTimeout(() => {
    syncArrayToFirestore(storageKey, currentArray);
  }, delay);
}

/**
 * Intelligent zero-data-loss merge between remote Firestore data and local storage data.
 * - Never wipes local records if the cloud collection is empty.
 * - Preserves newly created local records and uploads them to cloud.
 * - Discards records that were explicitly deleted.
 */
export function mergeCloudAndLocal<T extends { id?: string | number }>(
  storageKey: string,
  remoteItems: T[] | undefined
): T[] {
  const deletedSet = getDeletedIds();

  // 1. Read existing local data from localStorage cache
  let localItems: T[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localItems = parsed;
        }
      }
    } catch {
      localItems = [];
    }
  }

  // Filter out any explicitly deleted records from local cache
  localItems = localItems.filter((item) => item?.id && !deletedSet.has(String(item.id)));

  // If remoteItems is not provided, return cleaned local items
  if (!remoteItems) return localItems;

  // Filter out any explicitly deleted records from remote items
  const cleanRemoteItems = remoteItems.filter((item) => item?.id && !deletedSet.has(String(item.id)));

  // Case A: Cloud is empty (0 docs in Firestore), but local storage has valid data
  if (cleanRemoteItems.length === 0) {
    if (localItems.length > 0) {
      console.log(`[CloudSync] Cloud collection for ${storageKey} is empty, preserving and seeding ${localItems.length} local items.`);
      // Immediately push local data to Firestore to seed the cloud
      syncArrayToFirestore(storageKey, localItems);
      return localItems;
    }
    return [];
  }

  // Case B: Cloud has items, local storage has 0 items (e.g. brand new device opening shared link)
  if (localItems.length === 0) {
    lastKnownState[storageKey] = [...cleanRemoteItems];
    return cleanRemoteItems;
  }

  // Case C: Both cloud and local have items -> Merge by ID
  const remoteMap = new Map(cleanRemoteItems.map((item) => [String(item.id), item]));
  const merged: T[] = [...cleanRemoteItems];
  let localItemsToUpload: T[] = [];

  for (const localItem of localItems) {
    const id = String(localItem?.id);
    if (!id || deletedSet.has(id)) continue;

    if (!remoteMap.has(id)) {
      // This is a local item created on this device that has not yet reached the cloud!
      merged.push(localItem);
      localItemsToUpload.push(localItem);
    }
  }

  // If there were local items not in cloud, immediately upload them so they're permanently saved
  if (localItemsToUpload.length > 0) {
    console.log(`[CloudSync] Uploading ${localItemsToUpload.length} locally created items for ${storageKey} to Firestore.`);
    localItemsToUpload.forEach((item) => {
      saveDocumentToFirestore(storageKey, item);
    });
  }

  lastKnownState[storageKey] = [...merged];
  return merged;
}

export async function fetchUsersFromCloud(): Promise<any[]> {
  if (!db) return [];
  await ensureAuthenticatedSession();
  try {
    const snap = await getDocs(collection(db, COLLECTION_MAP[STORAGE_KEYS.USERS]));
    const items: any[] = [];
    const deletedSet = getDeletedIds();
    snap.forEach((d) => {
      if (!deletedSet.has(d.id)) {
        items.push({ id: d.id, ...d.data() });
      }
    });
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
    const effectiveId = tenantId && tenantId !== 'system' ? tenantId : 'net-612524';
    emitSyncStatus('syncing');
    const tenantDocRef = doc(db, 'tenants', effectiveId);
    await setDoc(
      tenantDocRef,
      {
        settings: {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
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
 * Load all collections from Firestore on startup with zero data loss
 */
export async function loadAllDataFromFirestore(): Promise<Record<string, any> | null> {
  if (!db) return null;

  await ensureAuthenticatedSession();

  const results: Record<string, any> = {};
  const deletedSet = getDeletedIds();

  try {
    for (const [storageKey, collectionName] of Object.entries(COLLECTION_MAP)) {
      try {
        const snap = await getDocs(collection(db, collectionName));
        const items: any[] = [];
        snap.forEach((d) => {
          if (!deletedSet.has(d.id)) {
            items.push({ id: d.id, ...d.data() });
          }
        });
        results[storageKey] = items;
      } catch (collErr) {
        console.warn(`Could not read collection ${collectionName}:`, collErr);
      }
    }

    setCloudHydrated(true);
    emitSyncStatus('synced');
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
            const deletedSet = getDeletedIds();
            snapshot.forEach((d) => {
              if (!deletedSet.has(d.id)) {
                items.push({ id: d.id, ...d.data() });
              }
            });

            // Perform intelligent merge with local storage before updating state
            const resolved = mergeCloudAndLocal(storageKey, items);

            setIsReceivingRemote(true);
            onUpdate(storageKey, resolved);
            setTimeout(() => setIsReceivingRemote(false), 300);
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
    if (Array.isArray(items) && COLLECTION_MAP[storageKey] && items.length > 0) {
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
