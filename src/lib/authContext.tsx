import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  sendEmailVerification,
  updateProfile,
  reload,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, projectId } from './firebase';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  isGuest: boolean;
  isEmailVerified: boolean;
  sessionAuthenticated: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signInAsGuest: () => Promise<User>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<User | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailAndPassword(
  email: string,
  password: string,
  isRegistration = false
): string | null {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return 'Please enter your email address.';
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return 'Invalid email format. Please enter a valid email address (e.g., operator@domain.com).';
  }
  if (!password) {
    return 'Please enter your password.';
  }
  if (isRegistration && password.length < 6) {
    return 'Weak password: Firebase requires passwords to be at least 6 characters long.';
  }
  if (!isRegistration && password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

export function getFriendlyAuthErrorMessage(errorCode: string, defaultMessage?: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format. Please check the email and try again.';
    case 'auth/missing-email':
      return 'Please enter an email address.';
    case 'auth/missing-password':
      return 'Please enter a password.';
    case 'auth/user-not-found':
      return 'No account found with this email address. Please register a new account first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please verify your login credentials and try again.';
    case 'auth/email-already-in-use':
      return 'Duplicate account: An account with this email address already exists. Please switch to Sign In.';
    case 'auth/weak-password':
      return 'Weak password: Password must be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This operator account has been disabled by an administrator.';
    case 'auth/too-many-requests':
      return 'Too many failed authentication attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network request failed. Please check your internet connection and verify no firewall is blocking identitytoolkit.googleapis.com.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by the browser. Please allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return `This deployment domain (${window.location.hostname}) is not yet listed in Firebase Authorized Domains for project '${projectId}'. Add '${window.location.hostname}' under Firebase Console > Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed':
      return `The requested sign-in provider (Email/Password) is currently disabled in Firebase Console for project '${projectId}'. Enable 'Email/Password' under Firebase Console > Authentication > Sign-in method.`;
    case 'auth/admin-restricted-operation':
      return `This authentication method (Anonymous / Guest or user sign-up) is restricted in Firebase Console for project '${projectId}'. Enable the provider under Firebase Console > Authentication > Sign-in method.`;
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
      return `Firebase Authentication is not initialized or the API key for project '${projectId}' is invalid. Check Firebase Console > Authentication.`;
    default:
      return defaultMessage || 'Authentication failed. Please check your credentials and Firebase Console settings.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setError(
        'Firebase configuration is missing or incomplete. Please check firebase-applet-config.json.'
      );
      setErrorCode('auth/configuration-not-found');
      setLoading(false);
      return;
    }

    // Subscribe to Firebase's persistent authentication state listener so login survives refreshes
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err: any) => {
        console.warn('Firebase Auth state listener error:', err?.code || err?.message || err);
        const code = err?.code || err?.name || 'auth/unknown';
        setErrorCode(code);
        setError(getFriendlyAuthErrorMessage(code, err?.message));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setError(null);
    setErrorCode(null);
  };

  const signInWithEmail = async (email: string, password: string): Promise<User> => {
    clearError();
    if (!isFirebaseConfigured) {
      const msg = 'Firebase is not configured. Cannot sign in.';
      setError(msg);
      throw new Error(msg);
    }

    const validationError = validateEmailAndPassword(email, password, false);
    if (validationError) {
      setError(validationError);
      setErrorCode('auth/validation-error');
      throw new Error(validationError);
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> => {
    clearError();
    if (!isFirebaseConfigured) {
      const msg = 'Firebase is not configured. Cannot register account.';
      setError(msg);
      throw new Error(msg);
    }

    const validationError = validateEmailAndPassword(email, password, true);
    if (validationError) {
      setError(validationError);
      setErrorCode('auth/validation-error');
      throw new Error(validationError);
    }

    try {
      // Only resolves if Firebase confirms account creation on the backend
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (displayName && displayName.trim()) {
        try {
          await updateProfile(userCredential.user, { displayName: displayName.trim() });
        } catch (profileErr) {
          console.warn('Optional displayName update notice:', profileErr);
        }
      }

      try {
        await sendEmailVerification(userCredential.user);
      } catch (verifyErr) {
        console.warn('Verification email dispatch notice:', verifyErr);
      }

      setUser(userCredential.user);
      return userCredential.user;
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signInWithGoogle = async (): Promise<User> => {
    clearError();
    if (!isFirebaseConfigured) {
      const msg = 'Firebase is not configured. Cannot sign in with Google.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const signInAsGuest = async (): Promise<User> => {
    clearError();
    if (!isFirebaseConfigured) {
      const msg = 'Firebase is not configured. Cannot start guest session.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      const userCredential = await signInAnonymously(auth);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    clearError();
    if (!auth.currentUser) {
      throw new Error('No active authenticated user session found.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const reloadUser = async (): Promise<User | null> => {
    if (auth.currentUser) {
      try {
        await reload(auth.currentUser);
        const freshUser = auth.currentUser;
        setUser(
          freshUser
            ? Object.assign(Object.create(Object.getPrototypeOf(freshUser)), freshUser)
            : null
        );
        return freshUser;
      } catch (err) {
        console.warn('Firebase user reload notice:', err);
      }
    }
    return null;
  };

  const signOut = async () => {
    clearError();
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const friendlyMsg = getFriendlyAuthErrorMessage(code, err?.message);
      setErrorCode(code);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const isGuest = Boolean(user && user.isAnonymous);
  const isEmailVerified = Boolean(user && (user.isAnonymous || user.emailVerified));
  const sessionAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        errorCode,
        isGuest,
        isEmailVerified,
        sessionAuthenticated,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInAsGuest,
        sendVerificationEmail,
        reloadUser,
        signOut,
        clearError,
      }}
    >
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
