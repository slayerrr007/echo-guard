import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Server, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { getActiveApiBase } from '../../services/api';

const FLASK_API_BASE = '/api';

interface BackendStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export function BackendStatusIndicator({ className = '', compact = false }: BackendStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const startTime = performance.now();

    try {
      const activeBase = await getActiveApiBase();
      const healthUrl = `${activeBase}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (response.ok) {
        setStatus('connected');
        setLatency(elapsed);
        setErrorMessage(null);
      } else {
        setStatus('disconnected');
        setLatency(null);
        setErrorMessage(`Server responded with HTTP ${response.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setStatus('disconnected');
      setLatency(null);
      if (err.name === 'AbortError') {
        setErrorMessage('Connection timed out (> 8s)');
      } else {
        setErrorMessage(`Cannot reach ${FLASK_API_BASE}`);
      }
    } finally {
      setLastChecked(new Date());
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial ping
    checkHealth();

    // Ping every 10 seconds
    const interval = setInterval(() => {
      checkHealth();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  const dotClasses = {
    connected: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    disconnected: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
    checking: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse',
  }[status];

  const statusText = {
    connected: 'API Connected',
    disconnected: 'API Disconnected',
    checking: 'Checking API...',
  }[status];

  const borderClass = {
    connected: 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20 text-emerald-300',
    disconnected: 'border-rose-500/30 hover:border-rose-500/60 bg-rose-950/20 text-rose-300',
    checking: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/20 text-amber-300',
  }[status];

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setPopoverOpen(!popoverOpen)}
        title={`Flask API: ${statusText} (Click for details)`}
        aria-label={`Flask API Status: ${statusText}`}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-200 cursor-pointer backdrop-blur-md ${borderClass} focus:outline-none focus:ring-1 focus:ring-green-400`}
      >
        {/* Color-coded dot with pulse ping */}
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          {status === 'connected' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotClasses}`} />
        </span>

        {/* Text description */}
        <span className="font-semibold hidden sm:inline">
          {compact ? (status === 'connected' ? 'API Online' : 'API Offline') : statusText}
        </span>
        <span className="font-semibold sm:hidden">
          {status === 'connected' ? 'API' : 'Offline'}
        </span>

        {/* Latency preview when connected */}
        {status === 'connected' && latency !== null && (
          <span className="text-[10px] text-emerald-400/80 hidden lg:inline">
            {latency}ms
          </span>
        )}
      </button>

      {/* Popover info window */}
      {popoverOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 text-left font-sans animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-sm text-white">Flask API Connection</span>
            </div>
            <button
              type="button"
              onClick={checkHealth}
              disabled={isRefreshing}
              title="Ping now"
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-green-400' : ''}`} />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            {/* Endpoint */}
            <div className="flex items-center justify-between text-slate-400">
              <span>Endpoint:</span>
              <code className="text-[11px] text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40 break-all">
                {FLASK_API_BASE}/health
              </code>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="flex items-center gap-1.5 font-medium">
                {status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Connected & Ready</span>
                  </>
                ) : status === 'disconnected' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-400">Disconnected</span>
                  </>
                ) : (
                  <span className="text-amber-400">Checking health...</span>
                )}
              </span>
            </div>

            {/* Response Time */}
            {status === 'connected' && latency !== null && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Latency:</span>
                <span className="font-mono text-emerald-400">{latency} ms</span>
              </div>
            )}

            {/* Last Checked */}
            {lastChecked && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Last Ping:</span>
                <span className="text-slate-300">{lastChecked.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Models Active */}
            <div className="pt-2 border-t border-white/5">
              <div className="text-[11px] text-slate-400 mb-1">Configured Models:</div>
              <div className="flex flex-wrap gap-1">
                <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded border border-white/5">KNN</span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded border border-white/5">Logistic Regression</span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded border border-white/5">Random Forest</span>
              </div>
            </div>

            {/* Disconnected Help Alert */}
            {status === 'disconnected' && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-rose-400" /> Server Unreachable
                </p>
                <p className="text-rose-300/80">
                  Ensure your deployed Render backend service is awake and active:
                </p>
                <code className="block mt-1 p-1 bg-black/40 rounded text-[10px] text-rose-200 break-all">
                  https://echo-guard-api.onrender.com/health
                </code>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Auto-pings every 10s</span>
            <button
              type="button"
              onClick={checkHealth}
              disabled={isRefreshing}
              className="text-green-400 hover:text-green-300 font-medium inline-flex items-center gap-1"
            >
              Ping now &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
