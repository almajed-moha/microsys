import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Drive scopes requested by user
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.metadata');

// In-Memory Token Caching (Strictly complying with in-memory only rule)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  description?: string;
  webViewLink?: string;
}

/**
 * Initialize Google Auth listener.
 * In-memory token is cleared on sign out.
 */
export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google using popup to obtain Google Drive OAuth access token.
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام رمز الوصول (Access Token) من حساب Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google Drive] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out and clear in-memory token.
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};

/**
 * Get current cached access token.
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Get current Google user.
 */
export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Upload a database backup JSON file directly to Google Drive.
 */
export const uploadBackupToGoogleDrive = async (
  fileName: string,
  jsonString: string,
  description: string = 'MicroSys Cloud WiFi Database Backup'
): Promise<GoogleDriveBackupFile> => {
  if (!cachedAccessToken) {
    throw new Error('يجب تسجيل الدخول باستخدام حساب Google أولاً للرفع إلى Google Drive');
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: description,
    properties: {
      app: 'MicroSys_WiFi_POS',
      type: 'database_backup',
    },
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    jsonString +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    let parsedErr = errText;
    try {
      const j = JSON.parse(errText);
      parsedErr = j.error?.message || errText;
    } catch {
      // ignore
    }
    throw new Error(`فشل رفع النسخة إلى Google Drive: ${parsedErr}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    createdTime: new Date().toISOString(),
    modifiedTime: new Date().toISOString(),
  };
};

/**
 * List backups saved in Google Drive.
 */
export const listGoogleDriveBackups = async (): Promise<GoogleDriveBackupFile[]> => {
  if (!cachedAccessToken) {
    return [];
  }

  // Query files that belong to this app or contain MicroSys backup in name
  const query = encodeURIComponent("trashed = false and (name contains 'MicroSys' or mimeType = 'application/json')");
  const fields = encodeURIComponent('files(id, name, mimeType, size, createdTime, modifiedTime, description, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime%20desc&pageSize=30`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn('[Google Drive] list error:', err);
    throw new Error('تعذر جلب ملفات النسخ الاحتياطي من Google Drive');
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    createdTime: f.createdTime,
    modifiedTime: f.modifiedTime,
    description: f.description,
    webViewLink: f.webViewLink,
  }));
};

/**
 * Download a backup file's content as text/JSON from Google Drive.
 */
export const downloadBackupFromGoogleDrive = async (fileId: string): Promise<string> => {
  if (!cachedAccessToken) {
    throw new Error('يجب تسجيل الدخول باستخدام حساب Google أولاً لتنزيل النسخة');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`تعذر تنزيل الملف من Google Drive: ${err}`);
  }

  return await res.text();
};

/**
 * Delete a backup file from Google Drive (Mandatory user confirmation must be handled by caller).
 */
export const deleteFileFromGoogleDrive = async (fileId: string): Promise<boolean> => {
  if (!cachedAccessToken) {
    throw new Error('يجب تسجيل الدخول باستخدام حساب Google أولاً للحذف');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 200) {
    const err = await res.text();
    throw new Error(`تعذر حذف الملف من Google Drive: ${err}`);
  }

  return true;
};
