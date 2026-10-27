import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/authContext';
import { MatrixBackground } from './MatrixBackground';
import { BackendStatusIndicator } from './BackendStatusIndicator';
import { Chatbot } from '../Chatbot';
import {
  Crosshair,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  BarChart2,
  Activity,
  History,
  BookOpen,
  HelpCircle,
  Scale,
  GraduationCap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  KeyRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function Layout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard', protectedBadge: true },
    { path: '/dataset', label: 'Dataset' },
    { path: '/train', label: 'Algorithms' },
    { path: '/model-comparison', label: 'Compare Models' },
    { path: '/predict', label: 'Predict' },
  ];

  const moreNavItems = [
    { path: '/documentation', label: 'Model Theory & Docs', icon: GraduationCap },
    { path: '/model-comparison', label: 'Model Benchmark', icon: Scale },
    { path: '/dashboard', label: 'Protected Dashboard', icon: LayoutDashboard },
    { path: '/eda', label: 'EDA', icon: BarChart2 },
    { path: '/performance', label: 'Performance', icon: Activity },
    { path: '/history', label: 'History', icon: History },
    { path: '/about-sonar', label: 'About SONAR', icon: BookOpen },
    { path: '/faq', label: 'Help / FAQ', icon: HelpCircle },
  ];

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const providerId = user?.providerData?.[0]?.providerId || (user?.isAnonymous ? 'anonymous' : 'password');

  return (
    <div className="flex min-h-screen w-full text-slate-300 font-sans flex-col relative overflow-x-hidden">
      <MatrixBackground />

      {/* Top Navbar - Glassmorphism */}
      <header className="sticky top-0 z-50 bg-black/55 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Crosshair className="text-green-400 w-6 h-6" />
              <span className="font-bold text-xl tracking-wider text-white">ECHO-GUARD</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-green-400 flex items-center gap-1 whitespace-nowrap',
                    location.pathname === item.path ? 'text-green-400' : 'text-slate-300'
                  )}
                >
                  {item.protectedBadge && !user && (
                    <Lock size={12} className="text-amber-400/80" />
                  )}
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-green-400 transition-colors focus:outline-none cursor-pointer"
                >
                  More <ChevronDown size={14} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                    {moreNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={`${item.path}-${item.label}`}
                          to={item.path}
                          onClick={() => setDropdownOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                            location.pathname === item.path
                              ? 'text-green-400 bg-white/5'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <Icon size={14} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Desktop Right Zone: Backend Status + User Profile Menu / Login */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <BackendStatusIndicator />

              {authLoading ? (
                <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
                  Syncing Auth...
                </div>
              ) : user ? (
                /* Authenticated User Profile Menu Dropdown */
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-green-500/30 rounded-full py-1 pl-1.5 pr-3 transition-colors cursor-pointer"
                    aria-expanded={profileMenuOpen}
                    aria-label="Open User Profile Menu"
                  >
                    {user.isAnonymous ? (
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
                        <Shield size={13} />
                      </div>
                    ) : !user.emailVerified ? (
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                        <AlertTriangle size={13} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                        <CheckCircle2 size={14} />
                      </div>
                    )}

                    <div className="flex flex-col text-left">
                      <span className="text-xs font-mono font-medium text-slate-100 max-w-[155px] truncate leading-tight">
                        {user.isAnonymous
                          ? 'Guest Operator'
                          : user.email || user.displayName || 'Operator'}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-mono uppercase tracking-wider',
                          user.isAnonymous
                            ? 'text-cyan-400'
                            : user.emailVerified
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        )}
                      >
                        {user.isAnonymous
                          ? 'Authenticated · Guest'
                          : user.emailVerified
                          ? 'Authenticated · Verified'
                          : 'Authenticated · Active'}
                      </span>
                    </div>

                    <ChevronDown size={13} className="text-slate-400 ml-0.5" />
                  </button>

                  {/* User Profile Dropdown Menu */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-950/95 backdrop-blur-2xl border border-green-500/35 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] p-4 space-y-3 z-50 animate-in fade-in duration-150">
                      <div className="border-b border-white/10 pb-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-green-400 font-bold">
                            Operator Profile
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                            Online
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-white break-all">
                          {user.isAnonymous ? 'Anonymous Guest Session' : user.email}
                        </div>
                        {user.displayName && (
                          <div className="text-[11px] text-slate-300">{user.displayName}</div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
                          <span>Provider: {providerId}</span>
                          <span>UID: {user.uid.slice(0, 8)}...</span>
                        </div>
                      </div>

                      {/* Navigation Links in Profile Menu */}
                      <div className="space-y-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-200 hover:text-green-400 hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={14} className="text-green-400" />
                          <span>Protected Operator Dashboard</span>
                        </Link>
                        <Link
                          to="/history"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-200 hover:text-green-400 hover:bg-white/5 transition-colors"
                        >
                          <History size={14} className="text-cyan-400" />
                          <span>Prediction History</span>
                        </Link>
                        <Link
                          to="/login"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-200 hover:text-green-400 hover:bg-white/5 transition-colors"
                        >
                          <User size={14} className="text-emerald-400" />
                          <span>Account & Verification Status</span>
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut size={14} />
                          <span>Sign Out of Echo-Guard</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-xs font-mono hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(74,222,128,0.25)]"
                >
                  <KeyRound size={14} />
                  <span>Sign In / Register</span>
                </Link>
              )}
            </div>

            {/* Mobile Header: Status Indicator & Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <BackendStatusIndicator compact />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-300 hover:text-white cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 space-y-4">
            <nav className="flex flex-col space-y-1.5">
              {[...mainNavItems, ...moreNavItems].map((item) => (
                <Link
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between',
                    location.pathname === item.path
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="pt-4 border-t border-white/10">
              {user ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30 shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {user.isAnonymous ? 'Guest Operator' : user.email}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400">
                          {user.isAnonymous
                            ? 'Authenticated · Guest'
                            : user.emailVerified
                            ? 'Authenticated · Email Verified'
                            : 'Authenticated · Active Session'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 py-2 text-center rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-200"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs font-mono text-rose-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <LogIn size={16} />
                  <span>Sign In / Register</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-8 z-10 w-full">
        <div className="flex-1 w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating Matrix-Styled Chatbot */}
      <Chatbot />
    </div>
  );
}
