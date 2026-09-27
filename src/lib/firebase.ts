import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import baseConfig from '../../firebase-applet-config.json';

/**
 * Firebase JavaScript SDK Initialization for Echo-Guard
 * Configured using exact credentials for project:
 * Project Name: Echo-Guard
 * Project ID: echo-guard-20352
 */
export const firebaseConfig = {
  ...baseConfig,
  apiKey: "AIzaSyAv7yVa-3zcRbNTt9dvMlDD8PqWBKPfQEI",
  authDomain: "echo-guard-20352.firebaseapp.com",
  projectId: "echo-guard-20352",
  storageBucket: "echo-guard-20352.firebasestorage.app",
  messagingSenderId: "475012155833",
  appId: "1:475012155833:web:bf33caca1a1c5695d8ce68",
  firestoreDatabaseId: baseConfig.firestoreDatabaseId || '(default)',
};

// Verified final projectId in the application
export const projectId = firebaseConfig.projectId;

export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication using this configuration
export const auth = getAuth(firebaseApp);

// Initialize Cloud Firestore using the configured database instance
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export default firebaseApp;
