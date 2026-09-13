import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export interface DailyNetworkLog {
  id: string; // YYYY-MM-DD
  date: string;
  downloadBytes: number;
  uploadBytes: number;
  totalBytes: number;
  notes: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'network_daily_logs';

export const saveDailyNetworkLog = async (log: Omit<DailyNetworkLog, 'id' | 'createdAt'>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, log.date);
  await setDoc(docRef, {
    ...log,
    id: log.date,
    createdAt: serverTimestamp(),
  });
};

export const getDailyNetworkLogs = async (): Promise<DailyNetworkLog[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as DailyNetworkLog);
};

export const deleteDailyNetworkLog = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};

export const deleteMultipleNetworkLogs = async (ids: string[]): Promise<void> => {
  // Simple loop for bulk delete (since usually it's small lists)
  for (const id of ids) {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
