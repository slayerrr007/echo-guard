import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Mail,
  RefreshCw,
  Shield,
  Send,
  ExternalLink,
  AlertTriangle,
  UserPlus,
  LogIn,
  KeyRound,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth, validateEmailAndPassword } from '../lib/authContext';
import { projectId } from '../lib/firebase';
import { cn } from '../lib/utils';

export function Login() {
  const navigate = useNavigate();
  const {
    user,
    loading,
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsGuest,
    sendVerificationEmail,
    reloadUser,
    signOut,
    error: contextError,
    errorCode,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const displayError = authError || contextError;
  const isProviderDisabledError = Boolean(
    errorCode === 'auth/operation-not-allowed' ||
      errorCode === 'auth/admin-restricted-operation' ||
      errorCode === 'auth/unauthorized-domain' ||
      (displayError &&
        (displayError.includes('operation-not-allowed') ||
          displayError.includes('Sign-in method') ||
          displayError.includes('disabled in Firebase Console') ||
          displayError.includes('Authorized domains')))
  );

  // Real-time password strength indicator for registration
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Enter at least 6 characters', score: 0, color: 'bg-slate-700' };
    if (pwd.length < 6) {
      return {
        label: `Too short (${pwd.length}/6 min characters)`,
        score: 1,
        color: 'bg-rose-500',
      };
    }
    let score = 2;
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score = 3;
    if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) score = 4;

    if (score === 2) return { label: 'Acceptable (6+ chars)', score: 2, color: 'bg-amber-400' };
    if (score === 3) return { label: 'Strong password', score: 3, color: 'bg-cyan-400' };
    return { label: 'High-entropy password', score: 4, color: 'bg-emerald-400' };
  };

  const pwdStrength = getPasswordStrength(password);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setStatusMessage(null);
    clearError();

    const validationIssue = validateEmailAndPassword(email, password, mode === 'signUp');
    if (validationIssue) {
      setAuthError(validationIssue);
      return;
    }

    if (mode === 'signUp' && password !== confirmPassword) {
      setAuthError('Password confirmation does not match. Please re-enter matching passwords.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        const loggedInUser = await signInWithEmail(email, password);
        // Never keep password in state after Firebase confirms authentication
        setPassword('');
        setConfirmPassword('');
        setStatusMessage(
          `Signed in as ${loggedInUser.email}. Redirecting to Protected Dashboard...`
        );
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        // Only succeeds if Firebase confirms creation of the new user account
        const newUser = await signUpWithEmail(email, password, displayName);
        setPassword('');
        setConfirmPassword('');
        setStatusMessage(
          `Firebase confirmed account registration for ${newUser.email}! A verification link has been sent to your email.`
        );
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setStatusMessage(null);
    clearError();
    setIsGoogleLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      setStatusMessage(`Signed in with Google as ${googleUser.email}.`);
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthError(null);
    setStatusMessage(null);
    clearError();
    setIsGuestLoading(true);
    try {
      await signInAsGuest();
      navigate('/dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to establish anonymous guest session.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setAuthError(null);
    try {
      await sendVerificationEmail();
      setStatusMessage(
        'Verification email has been dispatched by Firebase. Check your inbox and spam folder.'
      );
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setAuthError(null);
    try {
      const refreshedUser = await reloadUser();
      if (refreshedUser?.emailVerified) {
        setStatusMessage('Email verified by Firebase! Opening Protected Dashboard...');
        setTimeout(() => navigate('/dashboard'), 900);
      } else {
        setAuthError(
          'Firebase reports this email is not yet verified. Click the link in your email inbox first, then click Refresh Status.'
        );
      }
    } catch {
      setAuthError('Could not refresh verification status from Firebase.');
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 w-full min-h-[78vh]">
      <div className="w-full max-w-md bg-black/65 backdrop-blur-xl border border-green-500/30 p-6 sm:p-8 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.12)] space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2.5 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center border border-green-500/40 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
            <Lock className="w-6 h-6 text-green-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-[10px] font-mono text-green-400">
            <span>Firebase Project: {projectId}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {user
              ? 'Operator Account & Session'
              : mode === 'signIn'
              ? 'Operator Sign In'
              : 'Register Operator Account'}
          </h1>
          <p className="text-slate-400 text-xs max-w-sm">
            {user
              ? 'Your authentication state is actively synchronized with Firebase Authentication.'
              : 'Authenticate with Firebase Email/Password or Google to access the Protected Operator Dashboard.'}
          </p>
        </div>

        {/* Firebase Not Configured Warning */}
        {!isConfigured && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertCircle size={16} />
              <span>Firebase Configuration Missing</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Valid Firebase credentials were not found in <code>firebase-applet-config.json</code>. Please verify your Firebase project configuration.
            </p>
          </div>
        )}

        {/* Status / Confirmation Banner */}
        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-mono flex items-start gap-2.5 relative z-10 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Error & Provider Setup Diagnostic Banner */}
        {displayError &&
          (isProviderDisabledError ? (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-3 relative z-10 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                <span>Firebase Console Provider Setup Required</span>
              </div>
              <p className="text-slate-200 text-[11px] leading-relaxed">{displayError}</p>
              <div className="bg-black/70 p-3 rounded-xl border border-white/10 space-y-1.5 text-[11px] text-slate-300">
                <div className="text-white font-semibold">
                  How to enable in Firebase Console ({projectId}):
                </div>
                <div>
                  1. Open <strong>Firebase Console &rarr; Authentication &rarr; Sign-in method</strong>.
                </div>
                <div>
                  2. Enable <strong>Email/Password</strong> (and optionally <strong>Google</strong> &amp; <strong>Anonymous</strong>) and click <strong>Save</strong>.
                </div>
                <div>
                  3. Under <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong>, ensure <code>{window.location.hostname}</code> is listed.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href={`https://console.firebase.google.com/project/${projectId}/authentication/providers`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Open Firebase Console</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-mono flex items-start gap-2.5 relative z-10 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{displayError}</span>
            </div>
          ))}

        {/* Authenticated User Profile Card */}
        {user ? (
          <div className="space-y-4 relative z-10">
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-green-500/35 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                  <CheckCircle2 size={15} />
                  <span>Authenticated via Firebase</span>
                </span>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                    user.isAnonymous
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : user.emailVerified
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  )}
                >
                  {user.isAnonymous
                    ? 'Guest Session'
                    : user.emailVerified
                    ? 'Email Verified'
                    : 'Unverified Email'}
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">
                    Authenticated Email
                  </span>
                  <span className="text-white font-bold break-all">
                    {user.isAnonymous ? 'Anonymous Guest (No Email)' : user.email}
                  </span>
                </div>
                {user.displayName && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Operator Name
                    </span>
                    <span className="text-slate-200">{user.displayName}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase text-slate-500 block">Firebase UID</span>
                    <span className="text-[11px] text-cyan-300 truncate block">{user.uid}</span>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase text-slate-500 block">Auth Provider</span>
                    <span className="text-[11px] text-green-300 truncate block">
                      {user.providerData?.[0]?.providerId || (user.isAnonymous ? 'anonymous' : 'password')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Email Verification Controls for Unverified Email Accounts */}
              {!user.isAnonymous && !user.emailVerified && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold">
                    <Mail size={14} />
                    <span>Optional: Verify Your Operator Email</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    A verification link was sent to <strong>{user.email}</strong>. You can already access the Protected Dashboard, or verify your email below.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleCheckVerification}
                      disabled={checkingVerification}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={12} className={checkingVerification ? 'animate-spin' : ''} />
                      <span>Refresh Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-amber-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} />
                      <span>Resend Link</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 font-mono text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.25)]"
                >
                  <LayoutDashboard size={15} />
                  <span>Open Protected Dashboard</span>
                </button>
                <div className="flex gap-2">
                  <Link
                    to="/predict"
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-mono text-xs font-bold text-center transition-colors"
                  >
                    Launch Predictor
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sign In / Registration Form */
          <div className="space-y-5 relative z-10">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('signIn');
                  setAuthError(null);
                  setStatusMessage(null);
                  clearError();
                }}
                className={cn(
                  'py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  mode === 'signIn'
                    ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signUp');
                  setAuthError(null);
                  setStatusMessage(null);
                  clearError();
                }}
                className={cn(
                  'py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  mode === 'signUp'
                    ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <UserPlus size={14} />
                <span>Register Account</span>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
              {/* Optional Operator Name during Registration */}
              {mode === 'signUp' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Operator Name</span>
                    <span className="text-[10px] text-slate-500">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                    placeholder="Lt. Commander / Sonar Analyst"
                    autoComplete="name"
                  />
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[10px] text-green-400/80 font-mono">Required</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                  placeholder="operator@domain.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-[10px] text-slate-500 font-mono">Min. 6 chars</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl pl-4 pr-11 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                    placeholder="Enter password (min 6 characters)"
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter in Sign Up Mode */}
                {mode === 'signUp' && password.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={cn(
                            'flex-1 rounded-full transition-colors',
                            pwdStrength.score >= step ? pwdStrength.color : 'bg-slate-800'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400">{pwdStrength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password Input in Sign Up Mode */}
              {mode === 'signUp' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Confirm Password</span>
                    <span className="text-[10px] text-green-400/80 font-mono">Required</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading || !isConfigured}
                className="w-full py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(74,222,128,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>
                      {mode === 'signIn'
                        ? 'Verifying Credentials with Firebase...'
                        : 'Registering Account with Firebase...'}
                    </span>
                  </>
                ) : mode === 'signIn' ? (
                  <>
                    <KeyRound size={15} />
                    <span>Sign In with Email</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Register Operator Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Alternative Providers
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign-In & Guest Access Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || loading || !isConfigured}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <RefreshCw size={14} className="animate-spin text-green-400" />
                ) : (
                  <UserCheck size={14} className="text-green-400" />
                )}
                <span>Google Sign-In</span>
              </button>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isGuestLoading || loading || !isConfigured}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white font-mono text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isGuestLoading ? (
                  <RefreshCw size={14} className="animate-spin text-cyan-400" />
                ) : (
                  <Shield size={14} className="text-cyan-400" />
                )}
                <span>Guest Session</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
