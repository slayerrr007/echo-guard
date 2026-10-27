import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Activity, 
  Pause, 
  Play, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Clock, 
  Cpu, 
  Layers, 
  Gauge,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModelLatencyProfile {
  id: 'logistic_regression' | 'random_forest' | 'knn';
  name: string;
  shortName: string;
  category: string;
  color: string;
  glowColor: string;
  baseLatency: number; // in ms
  jitterStd: number;    // variance in ms
  complexity: string;   // O(1) or O(N*d)
}

const DEFAULT_PROFILES: ModelLatencyProfile[] = [
  {
    id: 'logistic_regression',
    name: 'Logistic Regression',
    shortName: 'LogReg',
    category: 'Linear Hyperplane',
    color: '#4ade80', // emerald
    glowColor: 'rgba(74, 222, 128, 0.4)',
    baseLatency: 0.45,
    jitterStd: 0.05,
    complexity: 'O(d) ~ 60 ops',
  },
  {
    id: 'random_forest',
    name: 'Random Forest',
    shortName: 'Random Forest',
    category: 'Ensemble Trees (100x)',
    color: '#c084fc', // purple
    glowColor: 'rgba(192, 132, 252, 0.4)',
    baseLatency: 1.85,
    jitterStd: 0.18,
    complexity: 'O(T · depth) ~ 800 ops',
  },
  {
    id: 'knn',
    name: 'K-Nearest Neighbors',
    shortName: 'KNN (k=3)',
    category: 'Euclidean Distance Search',
    color: '#22d3ee', // cyan
    glowColor: 'rgba(34, 211, 238, 0.4)',
    baseLatency: 0.88,
    jitterStd: 0.10,
    complexity: 'O(N · d) ~ 12,480 ops',
  },
];

interface LatencyPing {
  timestamp: number;
  value: number; // in ms
}

export interface LiveModelLatencyMonitorProps {
  /**
   * Title of the monitor card
   */
  title?: string;
  /**
   * Subtitle description
   */
  subtitle?: string;
  /**
   * Interval cadence in milliseconds. Defaults to 1800ms.
   */
  intervalMs?: number;
  /**
   * History window size (number of points). Defaults to 16.
   */
  historySize?: number;
  /**
   * Optional custom initial baseline latencies from scikit-learn backend
   */
  initialLatencies?: {
    logistic_regression?: number;
    random_forest?: number;
    knn?: number;
  };
  /**
   * Compact layout for dense headers or toolbars
   */
  compact?: boolean;
  /**
   * Highlight a specific model
   */
  highlightedModelId?: string | null;
  /**
   * Optional callback when a model card is selected
   */
  onSelectModel?: (modelId: string) => void;
  /**
   * Additional container CSS classes
   */
  className?: string;
}

/**
 * Generate a simulated latency ping using Gaussian/Box-Muller jitter around a base
 */
function generateJitteredLatency(base: number, std: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // Occasional 5% chance of minor CPU micro-spike (+15-30%)
  const spike = Math.random() < 0.06 ? base * (0.15 + Math.random() * 0.25) : 0;
  
  const result = base + z0 * std + spike;
  // Floor at 0.15ms minimum realistic CPU dispatch time
  return Math.max(0.15, Number(result.toFixed(2)));
}

/**
 * High-performance SVG Sparkline Component
 */
function SvgLatencySparkline({
  history,
  color,
  glowColor,
  width = 180,
  height = 42,
  avgValue,
}: {
  history: LatencyPing[];
  color: string;
  glowColor: string;
  width?: number;
  height?: number;
  avgValue: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (history.length < 2) {
    return (
      <div 
        className="w-full h-11 flex items-center justify-center text-[10px] font-mono text-slate-500 animate-pulse bg-black/20 rounded-lg"
        style={{ height }}
      >
        Initializing latency telemetry...
      </div>
    );
  }

  const values = history.map((h) => h.value);
  const minVal = Math.max(0, Math.min(...values) * 0.85);
  const maxVal = Math.max(...values) * 1.15;
  const range = maxVal - minVal || 1;

  const paddingX = 4;
  const paddingY = 6;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  // Build coordinate points
  const points = history.map((pt, i) => {
    const x = paddingX + (i / (history.length - 1)) * usableWidth;
    const y = height - paddingY - ((pt.value - minVal) / range) * usableHeight;
    return { x, y, value: pt.value, timestamp: pt.timestamp };
  });

  // SVG path for line
  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  // SVG area fill (closed to bottom)
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaD = `${pathD} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

  // Average line Y coordinate
  const avgY = height - paddingY - ((avgValue - minVal) / range) * usableHeight;

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`area-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="70%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
          <filter id={`glow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor={color} floodOpacity={0.7} />
          </filter>
        </defs>

        {/* Average reference line */}
        <line
          x1={paddingX}
          y1={avgY}
          x2={width - paddingX}
          y2={avgY}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeDasharray="2 3"
          strokeWidth="1"
        />

        {/* Gradient area under sparkline */}
        <path d={areaD} fill={`url(#area-grad-${color.replace('#', '')})`} />

        {/* Main sparkline laser path */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${color.replace('#', '')})`}
        />

        {/* Dot pings along the sparkline */}
        {points.map((pt, idx) => {
          const isLatest = idx === points.length - 1;
          const isHovered = hoveredIndex === idx;

          return (
            <g key={idx}>
              {/* Invisible larger hover hit target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="7"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(idx)}
              />

              {/* Visible dot for latest reading */}
              {isLatest && (
                <>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={color}
                    className="animate-ping opacity-75"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3"
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                </>
              )}

              {/* Hover indicator point */}
              {isHovered && !isLatest && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip on hover */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          className="absolute z-30 pointer-events-none -top-1 transform -translate-x-1/2 bg-black/95 border border-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white shadow-xl flex items-center gap-1.5 whitespace-nowrap"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold">{points[hoveredIndex].value.toFixed(2)} ms</span>
          <span className="text-slate-400 text-[9px]">
            {hoveredIndex === points.length - 1 ? '(now)' : `(-${points.length - 1 - hoveredIndex}s)`}
          </span>
        </div>
      )}
    </div>
  );
}

export function LiveModelLatencyMonitor({
  title = 'Real-Time Inference Latency Monitor',
  subtitle = 'Continuous simulated naval telemetry tracking single-sample classification response times in milliseconds.',
  intervalMs = 1800,
  historySize = 14,
  initialLatencies,
  compact = false,
  highlightedModelId,
  onSelectModel,
  className,
}: LiveModelLatencyMonitorProps) {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [pulseCount, setPulseCount] = useState<number>(0);

  // Initialize history for each model with realistic initial telemetry
  const [historyMap, setHistoryMap] = useState<Record<string, LatencyPing[]>>(() => {
    const initialMap: Record<string, LatencyPing[]> = {};
    const now = Date.now();

    DEFAULT_PROFILES.forEach((profile) => {
      const base = initialLatencies?.[profile.id] ?? profile.baseLatency;
      const initialPoints: LatencyPing[] = [];
      
      // Seed with last 10 points
      for (let i = 10; i >= 0; i--) {
        initialPoints.push({
          timestamp: now - i * 1800,
          value: generateJitteredLatency(base, profile.jitterStd),
        });
      }
      initialMap[profile.id] = initialPoints;
    });

    return initialMap;
  });

  // Interval ticker simulation
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setHistoryMap((prev) => {
        const next: Record<string, LatencyPing[]> = {};
        DEFAULT_PROFILES.forEach((profile) => {
          const currentList = prev[profile.id] || [];
          const base = initialLatencies?.[profile.id] ?? profile.baseLatency;
          const nextVal = generateJitteredLatency(base, profile.jitterStd);
          
          const updated = [...currentList, { timestamp: now, value: nextVal }];
          // Keep only the most recent N points
          next[profile.id] = updated.slice(-historySize);
        });
        return next;
      });
      setPulseCount((c) => c + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, intervalMs, historySize, initialLatencies]);

  // Trigger an instant simulated burst test
  const handleTriggerBurst = useCallback(() => {
    const now = Date.now();
    setHistoryMap((prev) => {
      const next: Record<string, LatencyPing[]> = {};
      DEFAULT_PROFILES.forEach((profile) => {
        const currentList = prev[profile.id] || [];
        const base = initialLatencies?.[profile.id] ?? profile.baseLatency;
        const nextVal = generateJitteredLatency(base, profile.jitterStd * 1.5);
        const updated = [...currentList, { timestamp: now, value: nextVal }];
        next[profile.id] = updated.slice(-historySize);
      });
      return next;
    });
    setPulseCount((c) => c + 1);
  }, [initialLatencies, historySize]);

  // Compute stats for each model profile
  const modelStats = useMemo(() => {
    return DEFAULT_PROFILES.map((profile) => {
      const pings = historyMap[profile.id] || [];
      const values = pings.map((p) => p.value);
      const current = values[values.length - 1] ?? profile.baseLatency;
      
      // Average across entire window
      const avg = values.length > 0 
        ? values.reduce((acc, v) => acc + v, 0) / values.length 
        : profile.baseLatency;
      
      const min = values.length > 0 ? Math.min(...values) : current;
      const max = values.length > 0 ? Math.max(...values) : current;

      // Delta comparison (first half vs second half of window)
      let trendDelta = 0;
      if (values.length >= 6) {
        const mid = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
        trendDelta = ((secondHalf - firstHalf) / firstHalf) * 100;
      }

      return {
        profile,
        pings,
        current,
        avg,
        min,
        max,
        trendDelta,
      };
    });
  }, [historyMap]);

  // Overall fastest model
  const fastestModel = useMemo(() => {
    return [...modelStats].sort((a, b) => a.avg - b.avg)[0];
  }, [modelStats]);

  if (compact) {
    return (
      <div className={cn("p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Live Latency Stream
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-xs"
              title={isRunning ? 'Pause telemetry stream' : 'Resume telemetry stream'}
            >
              {isRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              type="button"
              onClick={handleTriggerBurst}
              className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-xs"
              title="Trigger instant latency test ping"
            >
              <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {modelStats.map(({ profile, pings, current, avg }) => (
            <div key={profile.id} className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 truncate">{profile.shortName}</span>
                <span className="font-bold text-white">{current.toFixed(2)}ms</span>
              </div>
              <SvgLatencySparkline
                history={pings}
                color={profile.color}
                glowColor={profile.glowColor}
                height={28}
                avgValue={avg}
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>Avg</span>
                <span>{avg.toFixed(2)}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'p-6 md:p-8 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 space-y-6 relative overflow-hidden transition-all duration-300',
        className
      )}
    >
      {/* Decorative underwater radar flare */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Interactive Telemetry Stream Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className={cn('w-2 h-2 rounded-full bg-emerald-400', isRunning && 'animate-ping')} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
                {isRunning ? 'LIVE TELEMETRY STREAM' : 'STREAM PAUSED'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Update rate: {(intervalMs / 1000).toFixed(1)}s
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5 tracking-tight">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span>{title}</span>
          </h3>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-black/60 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              isRunning
                ? 'bg-white/10 hover:bg-white/15 text-slate-200'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
            )}
            title={isRunning ? 'Pause telemetry generator' : 'Resume telemetry stream'}
          >
            {isRunning ? (
              <>
                <Pause size={13} className="text-amber-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={13} className="text-emerald-400" />
                <span>Resume</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTriggerBurst}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Execute on-demand single-sample inference latency benchmark ping"
          >
            <RefreshCw size={13} className={isRunning ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
            <span>Ping Now</span>
          </button>
        </div>
      </div>

      {/* 3 Model Latency Cards with Real-Time Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {modelStats.map(({ profile, pings, current, avg, min, max, trendDelta }) => {
          const isHighlighted = highlightedModelId === profile.id;
          const isFastest = profile.id === fastestModel.profile.id;

          // Faster is green, slower is amber
          const isImproving = trendDelta <= -1.5;
          const isDegrading = trendDelta >= 1.5;

          return (
            <div
              key={profile.id}
              onClick={() => onSelectModel?.(profile.id)}
              className={cn(
                'p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 group relative overflow-hidden',
                isHighlighted
                  ? 'bg-white/10 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                  : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/[0.04]',
                onSelectModel && 'cursor-pointer'
              )}
            >
              {/* Top Row: Name, Category, Fastest Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: profile.color }}
                    />
                    <h4 className="font-bold text-white text-base truncate group-hover:text-emerald-300 transition-colors">
                      {profile.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pl-4.5">
                    <span>{profile.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-500">{profile.complexity}</span>
                  </div>
                </div>

                {isFastest && (
                  <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold flex items-center gap-1 shadow-sm">
                    <Zap size={10} />
                    Fastest
                  </span>
                )}
              </div>

              {/* Main Metric Display: Average Latency & Latest Ping */}
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    Avg Inference Latency
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-3xl font-mono font-black text-white tracking-tight">
                      {avg.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">ms</span>
                  </div>
                </div>

                {/* Instant Ping and Trend Delta */}
                <div className="flex flex-col items-end text-right">
                  <div className="text-[10px] font-mono text-slate-400">
                    Latest: <strong className="text-white font-mono">{current.toFixed(2)} ms</strong>
                  </div>
                  <div
                    className={cn(
                      'text-[10px] font-mono font-bold flex items-center gap-0.5 mt-0.5',
                      isImproving
                        ? 'text-emerald-400'
                        : isDegrading
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    )}
                    title="Trend vs start of telemetry window"
                  >
                    {isImproving ? (
                      <TrendingDown size={12} />
                    ) : isDegrading ? (
                      <TrendingUp size={12} />
                    ) : (
                      <Minus size={12} />
                    )}
                    <span>
                      {trendDelta >= 0 ? `+${trendDelta.toFixed(1)}%` : `${trendDelta.toFixed(1)}%`}
                    </span>
                    <span className="text-[9px] text-slate-500 font-normal">jitter</span>
                  </div>
                </div>
              </div>

              {/* Sparkline Trend Visualizer */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Activity size={11} className="text-slate-500" />
                    <span>Ping Trend ({pings.length} samples)</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Baseline: ~{profile.baseLatency.toFixed(2)}ms
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-black/60 border border-white/5 relative">
                  <SvgLatencySparkline
                    history={pings}
                    color={profile.color}
                    glowColor={profile.glowColor}
                    height={46}
                    avgValue={avg}
                  />
                </div>
              </div>

              {/* Footer bounds: Min / Max jitter limits */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-500" />
                  <span>Min: <strong className="text-slate-300 font-mono">{min.toFixed(2)}ms</strong></span>
                </div>
                <div>
                  <span>Max: <strong className="text-slate-300 font-mono">{max.toFixed(2)}ms</strong></span>
                </div>
                <div className="text-[9px] text-slate-500">
                  ±{(profile.jitterStd * 2).toFixed(2)}ms Jitter
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Naval Systems Footnote & Insights */}
      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-mono relative z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">{fastestModel.profile.name}</strong> delivers lowest operational latency at{' '}
            <strong className="text-emerald-400">{fastestModel.avg.toFixed(2)} ms</strong>, ideal for real-time autonomous torpedo & UUV sonar guidance.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 shrink-0">
          <span>Simulation Tick: #{pulseCount}</span>
          <span aria-hidden="true">·</span>
          <span>Window: {historySize} Pings</span>
        </div>
      </div>
    </section>
  );
}

export default LiveModelLatencyMonitor;
