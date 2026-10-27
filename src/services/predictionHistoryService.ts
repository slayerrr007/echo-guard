import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, projectId } from '../lib/firebase';
import type { ValidModelName } from './api';

export const PREDICTION_HISTORY_COLLECTION = 'prediction_history';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Diagnostic:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function parseFirestoreErrorMessage(rawError: unknown): {
  title: string;
  message: string;
  isPermissionDenied: boolean;
  isNotConfigured: boolean;
  setupInstructions?: string[];
} {
  const rawStr = rawError instanceof Error ? rawError.message : String(rawError);
  let innerMsg = rawStr;
  let opType: string = 'database operation';

  try {
    const parsed = JSON.parse(rawStr) as FirestoreErrorInfo;
    if (parsed && typeof parsed.error === 'string') {
      innerMsg = parsed.error;
      opType = parsed.operationType || opType;
    }
  } catch {
    // Not a JSON-wrapped FirestoreErrorInfo
  }

  const lower = innerMsg.toLowerCase();

  if (!isFirebaseConfigured || !db || lower.includes('not configured')) {
    return {
      title: 'Cloud Firestore Not Configured',
      message:
        'Firebase Cloud Firestore is not initialized in this environment. Personal prediction history cannot be loaded or saved.',
      isPermissionDenied: false,
      isNotConfigured: true,
      setupInstructions: [
        `Ensure firebase-applet-config.json or VITE_FIREBASE_* environment variables are configured for project "${projectId || 'echo-guard-20352'}".`,
        'Enable Cloud Firestore in the Firebase Console under Build -> Firestore Database.',
      ],
    };
  }

  if (
    lower.includes('client is offline') ||
    lower.includes('unavailable') ||
    lower.includes('not-found') ||
    lower.includes('database (default) does not exist')
  ) {
    return {
      title: 'Cloud Firestore Database Unreachable or Not Created Yet',
      message: `Could not reach the "(default)" Cloud Firestore database for project "${projectId}". This happens if the Firestore database has not been created yet in Firebase Console or if the network connection is offline.`,
      isPermissionDenied: false,
      isNotConfigured: true,
      setupInstructions: [
        `Open Firebase Console (${projectId}) -> Build -> Firestore Database.`,
        'If no database exists yet, click "Create database" and select the "(default)" database ID.',
        'Open the "Rules" tab and publish the security rules from firestore.rules.',
      ],
    };
  }

  if (
    lower.includes('permission-denied') ||
    lower.includes('missing or insufficient permissions')
  ) {
    return {
      title: 'Firestore Security Rules / Permission Error',
      message: `Cloud Firestore rejected the ${opType} request due to security rules on project "${projectId}".`,
      isPermissionDenied: true,
      isNotConfigured: false,
      setupInstructions: [
        `Open Firebase Console (${projectId}) -> Build -> Firestore Database.`,
        'Ensure the "(default)" Firestore database is created and active.',
        'Go to the "Rules" tab and publish the security rules from firestore.rules allowing authenticated users to read, create, and delete only their own records in /prediction_history/{predictionId}.',
      ],
    };
  }

  return {
    title: 'Cloud Firestore Error',
    message: innerMsg || 'An unexpected error occurred while communicating with Cloud Firestore.',
    isPermissionDenied: false,
    isNotConfigured: false,
  };
}

export interface FirestorePredictionRecord {
  id: string;
  userId: string;
  predictedClass: 'Rock' | 'Mine';
  predictedCode: 'R' | 'M';
  selectedModel: ValidModelName | string;
  confidence?: number;
  rockProbability?: number;
  mineProbability?: number;
  createdAt: Date | null;
  createdAtIso: string | null;
}

export interface SavePredictionInput {
  predictedClass: 'Rock' | 'Mine';
  predictedCode: 'R' | 'M';
  selectedModel: ValidModelName | string;
  /** Only passed when actually returned by the Flask /predict backend */
  confidence?: number;
  /** Only passed when actually returned by the Flask /predict backend */
  rockProbability?: number;
  /** Only passed when actually returned by the Flask /predict backend */
  mineProbability?: number;
}

/**
 * Saves a verified Flask /predict classification result to Cloud Firestore.
 * Strictly requires an authenticated Firebase user and never fabricates confidence or timestamps.
 */
export async function savePredictionToFirestore(
  input: SavePredictionInput
): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase Cloud Firestore is not configured.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser || !currentUser.uid) {
    throw new Error('You must be signed in to save prediction history to Cloud Firestore.');
  }

  const payload: Record<string, unknown> = {
    userId: currentUser.uid,
    predictedClass: input.predictedClass,
    predictedCode: input.predictedCode,
    selectedModel: input.selectedModel,
    createdAt: serverTimestamp(),
  };

  if (
    typeof input.confidence === 'number' &&
    Number.isFinite(input.confidence) &&
    input.confidence >= 0 &&
    input.confidence <= 1
  ) {
    payload.confidence = Number(input.confidence.toFixed(4));
  }

  if (
    typeof input.rockProbability === 'number' &&
    Number.isFinite(input.rockProbability) &&
    input.rockProbability >= 0 &&
    input.rockProbability <= 1
  ) {
    payload.rockProbability = Number(input.rockProbability.toFixed(4));
  }

  if (
    typeof input.mineProbability === 'number' &&
    Number.isFinite(input.mineProbability) &&
    input.mineProbability >= 0 &&
    input.mineProbability <= 1
  ) {
    payload.mineProbability = Number(input.mineProbability.toFixed(4));
  }

  try {
    const docRef = await addDoc(
      collection(db, PREDICTION_HISTORY_COLLECTION),
      payload
    );
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, PREDICTION_HISTORY_COLLECTION);
  }
}

function mapSnapshotDoc(docSnap: { id: string; data: () => Record<string, any> }): FirestorePredictionRecord {
  const data = docSnap.data();
  let createdAtDate: Date | null = null;

  if (data.createdAt instanceof Timestamp) {
    createdAtDate = data.createdAt.toDate();
  } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    createdAtDate = data.createdAt.toDate();
  } else if (typeof data.createdAt === 'string') {
    const parsed = new Date(data.createdAt);
    if (!isNaN(parsed.getTime())) {
      createdAtDate = parsed;
    }
  }

  const predictedClass: 'Rock' | 'Mine' =
    data.predictedClass === 'Mine' || data.predictedCode === 'M' ? 'Mine' : 'Rock';
  const predictedCode: 'R' | 'M' = predictedClass === 'Mine' ? 'M' : 'R';

  return {
    id: docSnap.id,
    userId: String(data.userId || ''),
    predictedClass,
    predictedCode,
    selectedModel: String(data.selectedModel || 'unknown'),
    confidence:
      typeof data.confidence === 'number' && Number.isFinite(data.confidence)
        ? data.confidence
        : undefined,
    rockProbability:
      typeof data.rockProbability === 'number' && Number.isFinite(data.rockProbability)
        ? data.rockProbability
        : undefined,
    mineProbability:
      typeof data.mineProbability === 'number' && Number.isFinite(data.mineProbability)
        ? data.mineProbability
        : undefined,
    createdAt: createdAtDate,
    createdAtIso: createdAtDate ? createdAtDate.toISOString() : null,
  };
}

/**
 * Subscribes in real time to the authenticated user's personal prediction records.
 * Uses `where('userId', '==', uid)` and sorts client-side by `createdAt` descending
 * to avoid requiring a composite index before rules deployment.
 */
export function subscribeToUserPredictionHistory(
  uid: string,
  onData: (records: FirestorePredictionRecord[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    onError(new Error('Firebase Cloud Firestore is not configured.'));
    return () => {};
  }

  const q = query(
    collection(db, PREDICTION_HISTORY_COLLECTION),
    where('userId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map(mapSnapshotDoc);
      // Sort newest first based on server timestamp
      records.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });
      onData(records);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, PREDICTION_HISTORY_COLLECTION);
      } catch (wrappedErr) {
        onError(wrappedErr instanceof Error ? wrappedErr : new Error(String(wrappedErr)));
      }
    }
  );
}

/**
 * Deletes a single prediction history record owned by the authenticated user.
 */
export async function deletePredictionFromFirestore(recordId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase Cloud Firestore is not configured.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('You must be signed in to delete prediction records.');
  }

  const docPath = `${PREDICTION_HISTORY_COLLECTION}/${recordId}`;
  try {
    await deleteDoc(doc(db, PREDICTION_HISTORY_COLLECTION, recordId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, docPath);
  }
}

/**
 * Deletes all prediction history records owned by the authenticated user.
 */
export async function deleteAllUserPredictionsFromFirestore(uid: string): Promise<number> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase Cloud Firestore is not configured.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('Unauthorized deletion request.');
  }

  try {
    const q = query(
      collection(db, PREDICTION_HISTORY_COLLECTION),
      where('userId', '==', uid)
    );
    const snapshot = await getDocs(q);
    await Promise.all(
      snapshot.docs.map((d) => deleteDoc(doc(db, PREDICTION_HISTORY_COLLECTION, d.id)))
    );
    return snapshot.size;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, PREDICTION_HISTORY_COLLECTION);
  }
}
