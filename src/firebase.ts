import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

let cachedAccessToken: string | null = null;
let hasAttemptedAnonymous = false;

export const getGoogleAccessToken = () => cachedAccessToken;

/**
 * Ensures that the client has an active, authenticated Firebase session if available.
 * Does not block or repeat failing anonymous auth requests.
 */
export const ensureAuthenticatedSession = async (): Promise<FirebaseUser | null> => {
  if (auth.currentUser) return auth.currentUser;
  if (hasAttemptedAnonymous) return auth.currentUser;
  hasAttemptedAnonymous = true;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error) {
    return null;
  }
};

// Initialize authentication on module load
ensureAuthenticatedSession();


export const logout = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Error signing out", error);
  }
};

