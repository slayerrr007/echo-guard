import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

/**
 * Firebase JavaScript SDK Initialization for Echo-Guard
 * Reuses the validated project configuration from firebase-applet-config.json
 * (Project ID: echo-guard-20352) with optional VITE_FIREBASE_* environment overrides.
 */
export const firebaseConfig = {
  ...appletConfig,
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
};

export const projectId = firebaseConfig.projectId;

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain &&
    firebaseConfig.apiKey !== 'PLACEHOLDER_API_KEY'
);

export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(firebaseApp);

// Google OAuth Provider for 1-click Google Sign-In
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with auto-detected long polling for iframe/proxy compatibility
function createFirestoreInstance(): Firestore {
  const dbId =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : undefined;
  try {
    return dbId
      ? initializeFirestore(
          firebaseApp,
          { experimentalAutoDetectLongPolling: true },
          dbId
        )
      : initializeFirestore(firebaseApp, {
          experimentalAutoDetectLongPolling: true,
        });
  } catch {
    return dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
  }
}

export const db: Firestore = createFirestoreInstance();

export let firestoreStatus: 'checking' | 'ready' | 'offline' | 'unconfigured' =
  isFirebaseConfigured ? 'checking' : 'unconfigured';

// Validate connection to Firestore quietly on boot without triggering console.error overlays
async function verifyFirestoreConnectivity() {
  if (!isFirebaseConfigured) {
    firestoreStatus = 'unconfigured';
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    firestoreStatus = 'ready';
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      firestoreStatus = 'offline';
    } else {
      // Permission-denied or not-found means the server is reachable
      firestoreStatus = 'ready';
    }
  }
}

verifyFirestoreConnectivity();

export default firebaseApp;

