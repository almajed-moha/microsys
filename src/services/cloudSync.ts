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
  DELETED_RECORDS: 'mikrotik_pos_deleted_records',
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
  [STORAGE_KEYS.DELETED_RECORDS]: 'deletedRecords',
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
const OFFLINE_PENDING_KEY = 'mikrotik_pos_offline_pending';

export function getDeletedIds(): Set<string> {
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

export function addDeletedId(id: string) {
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

export function removeDeletedId(id: string) {
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
 * Tracks items created while offline so they can be securely uploaded,
 * distinguishing them from items that were deleted on another device.
 */
export function getOfflinePendingIds(storageKey?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(OFFLINE_PENDING_KEY);
    if (!raw) return new Set();
    const map: Record<string, string[]> = JSON.parse(raw);
    if (storageKey) {
      return new Set(map[storageKey] || []);
    }
    const all = new Set<string>();
    Object.values(map).forEach((arr) => {
      if (Array.isArray(arr)) arr.forEach((id) => all.add(String(id)));
    });
    return all;
  } catch {
    return new Set();
  }
}

export function addOfflinePendingId(storageKey: string, id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const raw = localStorage.getItem(OFFLINE_PENDING_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[storageKey]) map[storageKey] = [];
    if (!map[storageKey].includes(String(id))) {
      map[storageKey].push(String(id));
      localStorage.setItem(OFFLINE_PENDING_KEY, JSON.stringify(map));
    }
  } catch {}
}

export function removeOfflinePendingId(storageKey: string, id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const raw = localStorage.getItem(OFFLINE_PENDING_KEY);
    if (!raw) return;
    const map: Record<string, string[]> = JSON.parse(raw);
    if (map[storageKey]) {
      map[storageKey] = map[storageKey].filter((x) => x !== String(id));
      localStorage.setItem(OFFLINE_PENDING_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * Sync deleted records (tombstones) from Firestore cloud to local storage
 */
export async function syncDeletedRecordsFromCloud(): Promise<Set<string>> {
  const localSet = getDeletedIds();
  if (!db) return localSet;

  try {
    const snap = await getDocs(collection(db, 'deletedRecords'));
    snap.forEach((docSnap) => {
      const delId = docSnap.id;
      if (delId) {
        localSet.add(delId);
      }
    });
    const arr = Array.from(localSet).slice(-2000);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
    return localSet;
  } catch (e) {
    console.warn('[CloudSync] Failed to fetch deletedRecords from cloud:', e);
    return localSet;
  }
}

/**
 * Clear the deleted IDs blacklist completely (e.g. during database restore)
 */
export function clearDeletedIds() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
    localStorage.removeItem(OFFLINE_PENDING_KEY);
  } catch (e) {
    console.warn('Failed to clear deleted IDs:', e);
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
    // Schedule on next tick to strictly prevent React state updates during another component's render phase
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: status }));
    }, 0);
  }
};

/**
 * Recursively removes all undefined fields from objects, nested objects, and arrays.
 * Guarantees compliance with Firestore setDoc/batch rules (which throw on undefined values).
 */
export function deepSanitizeForFirestore<T = any>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null) {
    return null as any;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => deepSanitizeForFirestore(item))
      .filter((item) => item !== undefined) as any;
  }
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val.toISOString() as any;
    }
    const cleanObj: Record<string, any> = {};
    for (const [key, propVal] of Object.entries(val as Record<string, any>)) {
      if (propVal !== undefined && typeof propVal !== 'function') {
        const cleaned = deepSanitizeForFirestore(propVal);
        if (cleaned !== undefined) {
          cleanObj[key] = cleaned;
        }
      }
    }
    return cleanObj as any;
  }
  return val;
}

export function setIsReceivingRemote(status: boolean) {
  isReceivingRemoteUpdate = status;
}

/**
 * Immediately save or update a single document in Firestore with full recursive sanitization.
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

    // Deep sanitize to prevent any nested undefined properties from failing Firestore validation
    const dataToSave = deepSanitizeForFirestore({ ...item });

    // Clean any previous deletion tombstone from cloud
    deleteDoc(doc(db, 'deletedRecords', docId)).catch(() => {});

    await setDoc(docRef, dataToSave, { merge: true });

    // Remove from offline pending queue once successfully pushed to cloud
    removeOfflinePendingId(storageKey, docId);

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
    // Mark as pending offline creation so it won't be treated as a deleted item by other nodes
    addOfflinePendingId(storageKey, docId);
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
  removeOfflinePendingId(storageKey, cleanId);

  // 1. Immediately prune from lastKnownState to prevent diff collision
  if (lastKnownState[storageKey]) {
    lastKnownState[storageKey] = lastKnownState[storageKey].filter((item) => String(item?.id) !== cleanId);
  }

  // 2. Immediately prune from local storage cache
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const next = arr.filter((x: any) => String(x?.id) !== cleanId);
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      }
      window.dispatchEvent(new CustomEvent('cloud-record-deleted', { detail: { id: cleanId, storageKey } }));
    } catch (e) {
      console.warn('Failed to prune local storage for deleted item:', e);
    }
  }

  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();

    // 3. Register global tombstone in 'deletedRecords' collection so other devices see it
    const tombstoneRef = doc(db, 'deletedRecords', cleanId);
    await setDoc(
      tombstoneRef,
      {
        id: cleanId,
        storageKey,
        collectionName,
        deletedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 4. Delete the document from its collection
    const docRef = doc(db, collectionName, cleanId);
    await deleteDoc(docRef);
    console.log(`[CloudSync] Document ${cleanId} permanently deleted from ${collectionName} and recorded in deletedRecords.`);
    emitSyncStatus('synced');
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error deleting document ${cleanId} from ${collectionName}:`, err);
    emitSyncStatus('error');
    return false;
  }
}

/**
 * Save multiple documents atomically to Firestore
 */
export async function saveDocumentsBatchToFirestore(storageKey: string, items: any[]): Promise<boolean> {
  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || !Array.isArray(items) || items.length === 0) return false;

  try {
    emitSyncStatus('syncing');
    await ensureAuthenticatedSession();
    const batch = writeBatch(db);
    let count = 0;

    for (const item of items) {
      if (!item || !item.id) continue;
      const docId = String(item.id);
      removeDeletedId(docId);
      const docRef = doc(db, collectionName, docId);
      const dataToSave = deepSanitizeForFirestore({ ...item });
      batch.set(docRef, dataToSave, { merge: true });
      count++;

      if (!lastKnownState[storageKey]) lastKnownState[storageKey] = [];
      const idx = lastKnownState[storageKey].findIndex((x) => String(x?.id) === docId);
      if (idx >= 0) {
        lastKnownState[storageKey][idx] = { ...dataToSave };
      } else {
        lastKnownState[storageKey].push({ ...dataToSave });
      }

      if (count === 490) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    emitSyncStatus('synced');
    return true;
  } catch (err) {
    console.error(`[CloudSync] Error saving batch to ${collectionName}:`, err);
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
export async function syncArrayToFirestore(
  storageKey: string,
  currentArray: any[],
  forceBypassHydrationLock: boolean = false,
  isOverwriteMode: boolean = false
) {
  // Hydration Lock: Never write to cloud before remote data has finished loading initially unless explicitly bypassed (e.g. initial seeding)
  if (!isCloudHydrated && !forceBypassHydrationLock) {
    console.warn(`[CloudSync Safety] Skipping sync for ${storageKey} because cloud data has not finished loading.`);
    return;
  }

  const collectionName = COLLECTION_MAP[storageKey];
  if (!collectionName || !db || isReceivingRemoteUpdate) return;
  if (!Array.isArray(currentArray)) return;

  // SAFETY GUARD: If currentArray is unexpectedly empty while previously populated,
  // do NOT wipe the entire collection in Firestore unless explicitly in overwrite mode!
  const previousArray = lastKnownState[storageKey] || [];
  if (currentArray.length === 0 && previousArray.length > 0 && !isOverwriteMode) {
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
    if (isOverwriteMode || !previousItem || JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
      toAddOrUpdate.push(currentItem);
    }
  }

  // Find deleted items
  for (const id of previousMap.keys()) {
    if (!id) continue;
    if (!currentMap.has(id)) {
      if (isOverwriteMode || deletedSet.has(id)) {
        toDelete.push(id);
      }
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

      const dataToSave = deepSanitizeForFirestore({ ...item });

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
 * - Preserves newly created local records (offline pending) and uploads them to cloud.
 * - Strictly prevents reviving records deleted on another device.
 */
export function mergeCloudAndLocal<T extends { id?: string | number }>(
  storageKey: string,
  remoteItems: T[] | undefined,
  inMemoryFallback?: T[]
): T[] {
  const deletedSet = getDeletedIds();
  const offlinePending = getOfflinePendingIds(storageKey);

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

  // Combine localStorage and inMemoryFallback without duplicates (in-memory overrides older localStorage)
  if (Array.isArray(inMemoryFallback) && inMemoryFallback.length > 0) {
    const localMap = new Map(localItems.map((item) => [String(item?.id), item]));
    for (const memItem of inMemoryFallback) {
      if (memItem?.id && !deletedSet.has(String(memItem.id))) {
        localMap.set(String(memItem.id), memItem);
      }
    }
    localItems = Array.from(localMap.values());
  }

  // Filter out any explicitly deleted records from local cache
  localItems = localItems.filter((item) => item?.id && !deletedSet.has(String(item.id)));

  // If remoteItems is not provided, return cleaned local items
  if (!remoteItems) return localItems;

  // Filter out any explicitly deleted records from remote items
  const cleanRemoteItems = remoteItems.filter((item) => item?.id && !deletedSet.has(String(item.id)));

  // Case A: Cloud is empty (0 docs in Firestore), but local storage has valid data
  if (cleanRemoteItems.length === 0) {
    const itemsToSeed = localItems.filter((item) => item?.id && !deletedSet.has(String(item.id)));
    if (itemsToSeed.length > 0) {
      console.log(`[CloudSync] Cloud collection for ${storageKey} is empty, preserving and seeding ${itemsToSeed.length} local items.`);
      syncArrayToFirestore(storageKey, itemsToSeed, true);
      try {
        localStorage.setItem(storageKey, JSON.stringify(itemsToSeed));
      } catch (e) {
        console.warn('Failed to cache to localStorage:', e);
      }
      return itemsToSeed;
    }
    return [];
  }

  // Case B: Cloud has items, local storage has 0 items (e.g. brand new device opening shared link)
  if (localItems.length === 0) {
    lastKnownState[storageKey] = [...cleanRemoteItems];
    try {
      localStorage.setItem(storageKey, JSON.stringify(cleanRemoteItems));
    } catch (e) {
      console.warn('Failed to cache remote items to localStorage:', e);
    }
    return cleanRemoteItems;
  }

  // Case C: Both cloud and local have items -> Merge by ID with zero data loss
  const getItemTime = (item: any): number => {
    if (!item) return 0;
    const t = item.updatedAt || item.timestamp || item.createdAt || item.date;
    if (!t) return 0;
    const parsed = new Date(t).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const remoteMap = new Map(cleanRemoteItems.map((item) => [String(item.id), item]));
  const merged: T[] = [...cleanRemoteItems];
  let localItemsToUpload: T[] = [];

  for (const localItem of localItems) {
    const id = String(localItem?.id);
    if (!id || deletedSet.has(id)) continue;

    if (!remoteMap.has(id)) {
      // Check if this item was genuinely created offline on this device
      if (offlinePending.has(id)) {
        // Legitimate offline creation -> merge and push to cloud
        merged.push(localItem);
        localItemsToUpload.push(localItem);
      } else {
        // This item is NOT in cloud and was NOT created offline ->
        // It was deleted on another device or is a stale local ghost record.
        // Prune it locally and never upload it back!
        addDeletedId(id);
        console.log(`[CloudSync] Detected ghost/deleted item ${id} for ${storageKey} from another device. Pruning locally.`);
      }
    } else {
      // Item exists in both: preserve the more recently modified item if timestamps exist
      const remoteObj = remoteMap.get(id) as any;
      const localObj = localItem as any;
      const localTime = getItemTime(localObj);
      const remoteTime = getItemTime(remoteObj);
      if (localTime > remoteTime && localTime > 0) {
        const idx = merged.findIndex((m) => String(m.id) === id);
        if (idx !== -1) {
          merged[idx] = localItem;
        }
        localItemsToUpload.push(localItem);
      }
    }
  }

  // If there were legitimate offline items not in cloud, upload them now
  if (localItemsToUpload.length > 0) {
    console.log(`[CloudSync] Uploading ${localItemsToUpload.length} genuine offline creations/updates for ${storageKey} to Firestore.`);
    localItemsToUpload.forEach((item) => {
      saveDocumentToFirestore(storageKey, item);
    });
  }

  lastKnownState[storageKey] = [...merged];
  try {
    localStorage.setItem(storageKey, JSON.stringify(merged));
  } catch (e) {
    console.warn('Failed to cache merged items to localStorage:', e);
  }
  return merged;
}

export async function fetchUsersFromCloud(): Promise<any[]> {
  if (!db) return [];
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
    const effectiveId = tenantId && tenantId !== 'system' ? tenantId : 'net-612524';
    emitSyncStatus('syncing');
    const tenantDocRef = doc(db, 'tenants', effectiveId);
    const sanitizedSettings = deepSanitizeForFirestore({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(
      tenantDocRef,
      {
        settings: sanitizedSettings,
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
 * Load all collections from Firestore on startup with zero data loss and strict tombstone validation
 */
export async function loadAllDataFromFirestore(): Promise<Record<string, any> | null> {
  if (!db) return null;

  const results: Record<string, any> = {};

  try {
    // 1. First, sync global deletedRecords tombstones so no deleted items are revived
    const deletedSet = await syncDeletedRecordsFromCloud();

    for (const [storageKey, collectionName] of Object.entries(COLLECTION_MAP)) {
      if (storageKey === STORAGE_KEYS.DELETED_RECORDS) continue;
      try {
        const snap = await getDocs(collection(db, collectionName));
        const items: any[] = [];
        snap.forEach((d) => {
          if (!deletedSet.has(d.id)) {
            items.push({ id: d.id, ...d.data() });
          }
        });
        results[storageKey] = items;
        lastKnownState[storageKey] = [...items];
      } catch (collErr) {
        console.warn(`Could not read collection ${collectionName}:`, collErr);
      }
    }

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
  onUpdate: (key: string, items: any[] | any) => void,
  onRecordDeleted?: (docId: string, storageKey?: string) => void
): () => void {
  if (!db) return () => {};

  const unsubscribes: Unsubscribe[] = [];

  // 1. Listen in real-time to global deletion tombstones across devices
  try {
    const unsubDeleted = onSnapshot(
      collection(db, 'deletedRecords'),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const delId = change.doc.id;
            const data = change.doc.data();
            const storageKey = data?.storageKey;
            addDeletedId(delId);

            // Immediately prune from local storage cache
            if (storageKey) {
              try {
                const raw = localStorage.getItem(storageKey);
                if (raw) {
                  const arr = JSON.parse(raw);
                  if (Array.isArray(arr)) {
                    const filtered = arr.filter((x: any) => String(x?.id) !== delId);
                    localStorage.setItem(storageKey, JSON.stringify(filtered));
                  }
                }
              } catch {}
            }

            if (onRecordDeleted) {
              onRecordDeleted(delId, storageKey);
            }
          }
        });
      },
      (err) => {
        console.warn('[CloudSync] deletedRecords live listener error:', err);
      }
    );
    unsubscribes.push(unsubDeleted);
  } catch (e) {
    console.warn('[CloudSync] Failed to attach deletedRecords listener:', e);
  }

  // 2. Listen to all application data collections
  for (const [storageKey, collectionName] of Object.entries(COLLECTION_MAP)) {
    if (storageKey === STORAGE_KEYS.DELETED_RECORDS) continue;

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

          // Cloud snapshot is the single authoritative source of truth across devices
          lastKnownState[storageKey] = [...items];
          // Update local cache directly to prevent stale revive
          try {
            localStorage.setItem(storageKey, JSON.stringify(items));
          } catch {}

          setIsReceivingRemote(true);
          onUpdate(storageKey, items);
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

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

/**
 * Force synchronization of all collections to the cloud
 */
export async function forceSyncAllToCloud(dataState: Record<string, any[]>, isOverwriteMode: boolean = false) {
  if (!db) return false;
  await ensureAuthenticatedSession();

  for (const [storageKey, items] of Object.entries(dataState)) {
    if (Array.isArray(items) && COLLECTION_MAP[storageKey]) {
      await syncArrayToFirestore(storageKey, items, true, isOverwriteMode);
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
