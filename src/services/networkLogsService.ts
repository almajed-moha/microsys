import { db, auth } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';

export interface DailyNetworkLog {
  id: string; // YYYY-MM-DD
  date: string;
  downloadBytes: number;
  uploadBytes: number;
  totalBytes: number;
  notes?: string;
  activeUsersCount?: number;
  routerIdentity?: string;
  lastUpdated?: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'network_daily_logs';
const LOCAL_STORAGE_CACHE_KEY = 'cached_network_daily_logs_v1';

// Helper to save cache locally
const updateLocalCache = (logs: DailyNetworkLog[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to cache network logs locally', e);
  }
};

export const getCachedNetworkLogs = (): DailyNetworkLog[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read cached network logs', e);
  }
  return [];
};

export const saveDailyNetworkLog = async (log: Omit<DailyNetworkLog, 'id' | 'createdAt'>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, log.date);
  const payload = {
    ...log,
    id: log.date,
    date: log.date,
    downloadBytes: Number(log.downloadBytes) || 0,
    uploadBytes: Number(log.uploadBytes) || 0,
    totalBytes: (Number(log.downloadBytes) || 0) + (Number(log.uploadBytes) || 0),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
};

export const getDailyNetworkLogs = async (): Promise<DailyNetworkLog[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => doc.data() as DailyNetworkLog);
    updateLocalCache(logs);
    return logs;
  } catch (err) {
    console.warn('Failed to fetch daily network logs from Firestore, falling back to cache:', err);
    return getCachedNetworkLogs();
  }
};

export const getDailyNetworkLog = async (date: string): Promise<DailyNetworkLog | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, date);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as DailyNetworkLog;
    }
  } catch (err) {
    console.warn(`Failed to fetch daily network log for date ${date}:`, err);
  }
  // Check local cache
  const cached = getCachedNetworkLogs();
  return cached.find(l => l.date === date || l.id === date) || null;
};

export const subscribeToDailyNetworkLogs = (
  callback: (logs: DailyNetworkLog[]) => void,
  onError?: (err: any) => void
): (() => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map(doc => doc.data() as DailyNetworkLog);
      updateLocalCache(logs);
      callback(logs);
    },
    (err) => {
      console.warn('Daily network logs onSnapshot notice:', err);
      if (onError) onError(err);
      callback(getCachedNetworkLogs());
    }
  );
};

export const deleteDailyNetworkLog = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const deleteMultipleNetworkLogs = async (ids: string[]): Promise<void> => {
  for (const id of ids) {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};

export const incrementDailyNetworkLog = async (
  date: string,
  downDelta: number,
  upDelta: number,
  extraMeta?: { activeUsersCount?: number; routerIdentity?: string }
): Promise<void> => {
  if (downDelta <= 0 && upDelta <= 0) return;

  const docRef = doc(db, COLLECTION_NAME, date);
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    id: date,
    date: date,
    downloadBytes: increment(downDelta),
    uploadBytes: increment(upDelta),
    totalBytes: increment(downDelta + upDelta),
    updatedAt: serverTimestamp(),
    lastUpdated: nowIso,
  };

  if (extraMeta?.activeUsersCount !== undefined) {
    updatePayload.activeUsersCount = extraMeta.activeUsersCount;
  }
  if (extraMeta?.routerIdentity) {
    updatePayload.routerIdentity = extraMeta.routerIdentity;
  }

  await setDoc(docRef, updatePayload, { merge: true });
};

