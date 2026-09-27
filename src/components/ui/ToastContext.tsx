import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Info, X, ShieldAlert, ChevronRight } from 'lucide-react';

export type ToastType = 'warning' | 'error' | 'success' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  badge?: string;
  duration?: number;
  action?: ToastAction;
  timestamp: Date;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message: string;
  badge?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  toast: {
    warning: (title: string, message: string, options?: Partial<ToastOptions>) => string;
    error: (title: string, message: string, options?: Partial<ToastOptions>) => string;
    success: (title: string, message: string, options?: Partial<ToastOptions>) => string;
    info: (title: string, message: string, options?: Partial<ToastOptions>) => string;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = options.duration !== undefined ? options.duration : (options.type === 'warning' ? 7000 : 5000);

    const newToast: ToastItem = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      badge: options.badge,
      duration,
      action: options.action,
      timestamp: new Date(),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  const toastMethods = {
    warning: useCallback((title: string, message: string, options?: Partial<ToastOptions>) => {
      return addToast({ ...options, type: 'warning', title, message });
    }, [addToast]),
    error: useCallback((title: string, message: string, options?: Partial<ToastOptions>) => {
      return addToast({ ...options, type: 'error', title, message });
    }, [addToast]),
    success: useCallback((title: string, message: string, options?: Partial<ToastOptions>) => {
      return addToast({ ...options, type: 'success', title, message });
    }, [addToast]),
    info: useCallback((title: string, message: string, options?: Partial<ToastOptions>) => {
      return addToast({ ...options, type: 'info', title, message });
    }, [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: toastMethods }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  key?: React.Key;
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({
  toast,
  onDismiss,
}: ToastCardProps) {
  const isWarning = toast.type === 'warning';
  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  const borderColor = isWarning
    ? 'border-amber-500/50 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.35)]'
    : isError
    ? 'border-rose-500/50 shadow-[0_10px_35px_-5px_rgba(244,63,94,0.35)]'
    : isSuccess
    ? 'border-emerald-500/50 shadow-[0_10px_35px_-5px_rgba(16,185,129,0.35)]'
    : 'border-cyan-500/50 shadow-[0_10px_35px_-5px_rgba(6,182,212,0.35)]';

  const bgColor = isWarning
    ? 'bg-slate-950/95 border-amber-500/40'
    : isError
    ? 'bg-slate-950/95 border-rose-500/40'
    : isSuccess
    ? 'bg-slate-950/95 border-emerald-500/40'
    : 'bg-slate-950/95 border-cyan-500/40';

  const iconBg = isWarning
    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/40'
    : isError
    ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/40'
    : isSuccess
    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40'
    : 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/40';

  const IconComponent = isWarning
    ? AlertTriangle
    : isError
    ? AlertCircle
    : isSuccess
    ? CheckCircle
    : Info;

  return (
    <div
      role="alert"
      className={`pointer-events-auto backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-bottom-5 duration-300 relative overflow-hidden ${bgColor} ${borderColor}`}
    >
      {/* Visual glowing bar on the left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isWarning
            ? 'bg-gradient-to-b from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
            : isError
            ? 'bg-gradient-to-b from-rose-400 to-red-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            : isSuccess
            ? 'bg-gradient-to-b from-emerald-400 to-green-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : 'bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
        }`}
      />

      <div className="flex items-start gap-3 pl-1.5">
        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${iconBg}`}>
          <IconComponent size={20} className={isWarning ? 'animate-pulse' : ''} />
        </div>

        <div className="flex-1 min-w-0 pr-2 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {toast.title}
            </h4>
            {toast.badge && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isWarning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {toast.badge}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed break-words">
            {toast.message}
          </p>

          {toast.action && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <span>{toast.action.label}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X size={16} />
        </button>
      </div>

      {/* Auto-dismiss progress countdown line */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-1.5 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            className={`h-full ${
              isWarning ? 'bg-amber-400' : isError ? 'bg-rose-400' : isSuccess ? 'bg-emerald-400' : 'bg-cyan-400'
            }`}
            style={{
              animation: `toastCountdown ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}
