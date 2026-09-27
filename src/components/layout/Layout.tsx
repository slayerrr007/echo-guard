import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../../lib/dataContext';
import { useAuth } from '../../lib/authContext';
import { MatrixBackground } from './MatrixBackground';
import { BackendStatusIndicator } from './BackendStatusIndicator';
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
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Login } from '../../pages/Login';

export function Layout() {
  const { theme, toggleTheme } = useAppContext();
  const { user, signOut, sessionAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // If the user has not authenticated in this browser session, always display the Echo-Guard authentication page
  if (!sessionAuthenticated) {
    return (
      <div className="flex min-h-screen w-full text-slate-300 font-sans flex-col relative overflow-x-hidden">
        <MatrixBackground />
        
        {/* Pre-Authentication Top Brand Header */}
        <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2.5">
                <Crosshair className="text-green-400 w-6 h-6 animate-pulse" />
                <span className="font-bold text-xl tracking-wider text-white">ECHO-GUARD</span>
                <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/25">
                  SONAR DEFENSE CLASSIFICATION
                </span>
              </div>
              <div className="flex items-center gap-3">
                <BackendStatusIndicator />
              </div>
            </div>
          </div>
        </header>

        {/* Authentication Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 z-10 w-full">
          <Login />
        </main>

        {/* Security Clearance Footer */}
        <footer className="py-4 border-t border-white/5 bg-black/40 text-center text-xs font-mono text-slate-500 z-10">
          Echo-Guard Naval Sonar ML Platform &bull; Defense Clearance Authentication Required &bull; Choose Email/Password Sign In or Continue as Guest
        </footer>
      </div>
    );
  }

  const mainNavItems = [
    { path: '/', label: 'Home' },
    { path: '/dataset', label: 'Dataset' },
    { path: '/train', label: 'Algorithms' },
    { path: '/model-comparison', label: 'Compare Models' },
    { path: '/predict', label: 'Predict' },
  ];

  const moreNavItems = [
    { path: '/documentation', label: 'Model Theory & Docs', icon: GraduationCap },
    { path: '/model-comparison', label: 'Model Benchmark', icon: Scale },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/eda', label: 'EDA', icon: BarChart2 },
    { path: '/performance', label: 'Performance', icon: Activity },
    { path: '/history', label: 'History', icon: History },
    { path: '/about-sonar', label: 'About SONAR', icon: BookOpen },
    { path: '/faq', label: 'Help / FAQ', icon: HelpCircle },
  ];

  return (
    <div className="flex min-h-screen w-full text-slate-300 font-sans flex-col relative overflow-x-hidden">
      <MatrixBackground />
      
      {/* Top Navbar - Glassmorphism */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Crosshair className="text-green-400 w-6 h-6" />
              <span className="font-bold text-xl tracking-wider text-white">ECHO-GUARD</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {mainNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-green-400",
                    location.pathname === item.path || (item.path === '/train' && location.pathname === '/train') 
                      ? "text-green-400" 
                      : "text-slate-300"
                  )}
                >
                  {item.label}
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-green-400 transition-colors focus:outline-none"
                >
                  More <ChevronDown size={14} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                    {moreNavItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setDropdownOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                            location.pathname === item.path
                              ? "text-green-400 bg-white/5"
                              : "text-slate-300 hover:text-white hover:bg-white/5"
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
            
            {/* Login & Status Indicator Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <BackendStatusIndicator />
              {user ? (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full py-1 pl-1.5 pr-3">
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

                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-medium text-slate-200 max-w-[130px] truncate leading-tight">
                      {user.isAnonymous 
                        ? 'Guest Operator' 
                        : (user.displayName || user.email?.split('@')[0] || 'Operator')}
                    </span>
                    {user.isAnonymous ? (
                      <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">Guest Access</span>
                    ) : !user.emailVerified ? (
                      <Link to="/login" className="text-[9px] font-mono text-amber-400 hover:underline">Verify Email</Link>
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-400">Verified</span>
                    )}
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="p-1 ml-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <LogIn size={16} />
                  <span>Login</span>
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
          <div className="md:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 space-y-4">
            <nav className="flex flex-col space-y-2">
              {[...mainNavItems, ...moreNavItems].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "text-slate-300 hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="pt-4 border-t border-white/10">
              {user ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2.5">
                    {user.isAnonymous ? (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
                        <Shield size={16} />
                      </div>
                    ) : !user.emailVerified ? (
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                        <AlertTriangle size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-mono font-bold text-white leading-tight">
                        {user.isAnonymous 
                          ? 'Guest Operator' 
                          : (user.displayName || user.email?.split('@')[0] || 'Operator')}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                        {user.isAnonymous ? 'Anonymous Clearance' : user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <LogIn size={16} />
                  <span>Login</span>
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

    </div>
  );
}
