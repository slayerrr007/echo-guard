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
  ArrowRight,
  Shield,
  Send,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

export function Login() {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    sessionAuthenticated,
    signInWithEmail, 
    signUpWithEmail, 
    signInAsGuest, 
    sendVerificationEmail,
    reloadUser,
    signOut,
    error: contextError,
    clearError
  } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const displayError = authError || contextError;
  const isOperationNotAllowed = Boolean(
    displayError && (
      displayError.includes('operation-not-allowed') || 
      displayError.includes('Sign-in method') || 
      displayError.includes('disabled in Firebase Console') ||
      displayError.includes('Authentication method is currently disabled')
    )
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setStatusMessage(null);
    clearError();

    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        const loggedInUser = await signInWithEmail(email, password);
        if (!loggedInUser.emailVerified && !loggedInUser.isAnonymous) {
          setStatusMessage('Email verification pending. Full operational access granted.');
        }
        navigate('/');
      } else {
        const newUser = await signUpWithEmail(email, password);
        setStatusMessage(
          `Account created successfully! Verification email dispatched to ${newUser.email}. Access granted.`
        );
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setAuthError(null);
    setStatusMessage(null);
    clearError();
    setIsGuestLoading(true);

    try {
      await signInAsGuest();
      navigate('/');
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
      setStatusMessage('Verification email has been resent. Please check your inbox and spam folder.');
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
        setStatusMessage('Email verified successfully! Access granted to Echo-Guard network.');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setAuthError('Email is still unverified. Please open the link sent to your inbox, then click check status again.');
      }
    } catch (err: any) {
      setAuthError('Could not verify status. Please try again.');
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 w-full min-h-[80vh]">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Lock className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            Operator Authentication
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm">
            Please choose <strong>Email/Password Sign In</strong> or <strong>Continue as Guest</strong> before entering Echo-Guard.
          </p>
        </div>

        {/* Status / Success Alert */}
        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-start gap-2.5 relative z-10 animate-in fade-in duration-300">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {displayError && (
          isOperationNotAllowed ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-3 relative z-10 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                <span>Firebase Authentication Setup Required</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                In your Firebase project <strong className="text-white">echo-guard-20352</strong>, the <strong className="text-white">Email/Password</strong> sign-in method is currently disabled.
              </p>
              <div className="bg-black/60 p-3 rounded-xl border border-white/10 space-y-1.5 text-[11px] text-slate-300">
                <div className="text-white font-semibold">Enable it in 3 quick steps:</div>
                <div className="flex items-start gap-1.5">
                  <span className="text-green-400 font-bold">1.</span>
                  <span>Open Firebase Console &rarr; <strong>Authentication</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-green-400 font-bold">2.</span>
                  <span>Select <strong>Sign-in method</strong> tab &rarr; Click <strong>Email/Password</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-green-400 font-bold">3.</span>
                  <span>Toggle <strong>Enable</strong> to ON &rarr; Click <strong>Save</strong></span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  href="https://console.firebase.google.com/project/echo-guard-20352/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Open Firebase Console</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isGuestLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 border border-cyan-500/30 text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Shield size={12} />
                  <span>Use Guest Login Instead</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-start gap-2.5 relative z-10 animate-in fade-in duration-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )
        )}

        {/* Active Session States - only shown when actively authenticated in this browser session */}
        {user && sessionAuthenticated ? (
          <div className="space-y-4 relative z-10">
            {/* Case 1: Unverified Registered User */}
            {!user.isAnonymous && !user.emailVerified ? (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-mono font-bold">
                  <Mail size={16} />
                  <span>Email Verification Pending</span>
                </div>

                <div className="space-y-1.5 text-left bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Registered Address</div>
                  <div className="text-white font-mono text-sm break-all font-semibold">{user.email}</div>
                  <div className="text-slate-400 text-xs leading-relaxed pt-1">
                    A Firebase verification link was sent to your inbox. You must verify ownership once before accessing the operational dashboard.
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={checkingVerification}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 text-black font-mono text-xs font-bold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={14} className={checkingVerification ? 'animate-spin' : ''} />
                    <span>{checkingVerification ? 'Checking Firebase...' : "I've Verified (Check Status)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/20 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={14} className={resendingEmail ? 'animate-pulse' : ''} />
                    <span>{resendingEmail ? 'Dispatching Email...' : 'Resend Verification Email'}</span>
                  </button>

                  <div className="flex gap-2 pt-2">
                    <Link
                      to="/predict"
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-mono text-xs font-bold transition-colors text-center"
                    >
                      Use ML Predictor
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/10 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : user.isAnonymous ? (
              /* Case 2: Guest User Session */
              <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono font-bold">
                  <Shield size={16} />
                  <span>Guest Operator Session Active</span>
                </div>

                <div className="space-y-1">
                  <div className="text-white font-bold text-base">Anonymous Operator</div>
                  <div className="text-slate-400 text-xs font-mono">Access Level: Guest Clearance</div>
                  <div className="text-slate-500 text-[10px] font-mono pt-1">UID: {user.uid}</div>
                  <p className="text-slate-300 text-xs pt-2">
                    Full access enabled for Sonar frequency analysis & ML classification models.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/predict')}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 text-black font-mono text-xs font-bold transition-opacity hover:opacity-90"
                    >
                      Launch Predictor
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors border border-white/10"
                    >
                      Dashboard
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out Guest Session</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Case 3: Fully Verified Operator */
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                  <CheckCircle2 size={16} />
                  <span>Firebase Session Active</span>
                </div>
                
                <div className="space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base mx-auto border border-emerald-400/40">
                    <UserCheck size={20} />
                  </div>
                  <div className="text-white font-bold text-base pt-1">{user.displayName || 'Authorized Operator'}</div>
                  <div className="text-slate-400 text-xs font-mono">{user.email}</div>
                  <div className="text-emerald-400/80 text-[10px] font-mono flex items-center justify-center gap-1 pt-1">
                    <ShieldCheck size={12} />
                    <span>Email Verified Clearance</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 text-black font-mono text-xs font-bold transition-opacity hover:opacity-90"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Form for Email / Password Authentication */
          <div className="space-y-6 relative z-10">
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Email</span>
                  <span className="text-[10px] text-slate-500 font-mono">Required</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                    placeholder="operator@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
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
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-white focus:border-green-400 focus:outline-none placeholder-slate-600 transition-colors text-sm font-mono"
                    placeholder="Enter your password"
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(74,222,128,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{mode === 'signIn' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>

              {/* Toggle Sign In / Create Account Mode */}
              <div className="text-center pt-1">
                {mode === 'signIn' ? (
                  <p className="text-xs text-slate-400 font-mono">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signUp');
                        setAuthError(null);
                        setStatusMessage(null);
                      }}
                      className="text-green-400 hover:text-green-300 font-bold underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      Create Account
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signIn');
                        setAuthError(null);
                        setStatusMessage(null);
                      }}
                      className="text-green-400 hover:text-green-300 font-bold underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </form>

            {/* Futuristic Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Guest Login Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isGuestLoading || loading}
                className="w-full py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 hover:text-white font-mono text-sm font-semibold transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isGuestLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin text-cyan-400" />
                    <span>Connecting as Guest...</span>
                  </>
                ) : (
                  <>
                    <Shield size={16} className="text-cyan-400" />
                    <span>Continue as Guest</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center font-mono text-slate-500">
                No credentials required. Access all Sonar ML models immediately.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export default Login;
