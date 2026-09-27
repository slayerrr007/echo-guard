import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  reload,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from './firebase';

export const SESSION_AUTH_KEY = 'echoguard_session_authenticated';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isGuest: boolean;
  isEmailVerified: boolean;
  sessionAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInAsGuest: () => Promise<User>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage?: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No operator account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An operator account is already registered with this email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Access temporarily restricted. Try again later.';
    case 'auth/network-request-failed':
      return 'Network communication failure. Please verify your internet connection.';
    case 'auth/operation-not-allowed':
      return "Email/Password sign-in is not enabled in Firebase Console for project 'echo-guard-20352'. Please enable 'Email/Password' under Authentication > Sign-in method in your Firebase Console.";
    case 'auth/admin-restricted-operation':
      return "Anonymous authentication is not enabled in Firebase Console for project 'echo-guard-20352'. Please enable 'Anonymous' under Authentication > Sign-in method in your Firebase Console.";
    default:
      return defaultMessage || 'Authentication operation failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionAuthenticated, setSessionAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If opening in a new browser session, do not automatically bypass authentication
    const hasSessionAccess = sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
    if (!hasSessionAccess && auth.currentUser) {
      firebaseSignOut(auth).catch(() => {});
    }

    // Listen for auth state changes with session validation
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const isSessionAuthed = sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
      if (currentUser && isSessionAuthed) {
        setUser(currentUser);
        setSessionAuthenticated(true);
      } else {
        setUser(null);
        setSessionAuthenticated(false);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Firebase Auth state change notice:', err?.message || err);
      setError(getFriendlyAuthErrorMessage(err.name, err.message));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signInWithEmail = async (email: string, password: string): Promise<User> => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setUser(userCredential.user);
      setSessionAuthenticated(true);
      return userCredential.user;
    } catch (err: any) {
      console.warn('Firebase Email Sign-in notice:', err?.code || err?.message);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, err?.message);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<User> => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Immediately dispatch verification email to the new account
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn('Failed to automatically dispatch verification email:', verifyErr);
      }
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setUser(userCredential.user);
      setSessionAuthenticated(true);
      return userCredential.user;
    } catch (err: any) {
      console.warn('Firebase Sign-up notice:', err?.code || err?.message);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, err?.message);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signInAsGuest = async (): Promise<User> => {
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setUser(userCredential.user);
      setSessionAuthenticated(true);
      return userCredential.user;
    } catch (err: any) {
      console.warn('Firebase Guest Sign-in notice:', err?.code || err?.message);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, err?.message);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    setError(null);
    if (!auth.currentUser) {
      throw new Error('No active operator session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      console.warn('Firebase Resend Verification notice:', err?.code || err?.message);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, err?.message);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const reloadUser = async (): Promise<User | null> => {
    if (auth.currentUser) {
      try {
        await reload(auth.currentUser);
        // Force state update to re-evaluate emailVerified
        const freshUser = auth.currentUser;
        setUser(freshUser ? Object.assign(Object.create(Object.getPrototypeOf(freshUser)), freshUser) : null);
        return freshUser;
      } catch (err) {
        console.warn('Firebase user reload notice:', err);
      }
    }
    return null;
  };

  const signOut = async () => {
    setError(null);
    try {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
      setSessionAuthenticated(false);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      console.warn('Firebase Sign-out notice:', err?.code || err?.message);
      const friendlyMsg = getFriendlyAuthErrorMessage(err?.code, err?.message);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const isGuest = Boolean(user && user.isAnonymous);
  const isEmailVerified = Boolean(user && (user.isAnonymous || user.emailVerified));

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      isGuest, 
      isEmailVerified, 
      sessionAuthenticated,
      signInWithEmail, 
      signUpWithEmail, 
      signInAsGuest, 
      sendVerificationEmail, 
      reloadUser, 
      signOut, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

