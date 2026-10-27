import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Tooltip, 
  YAxis,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export interface SparklinePoint {
  iteration: number;
  label: string;
  accuracy: number;
  accFormatted: string;
}

interface ModelSparklineProps {
  data: SparklinePoint[];
  color: string;
  gradientId: string;
  gainText: string;
  accentClass?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SparklinePoint }>;
  color: string;
}

const CustomSparklineTooltip = ({ active, payload, color }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const pt = payload[0].payload;
    return (
      <div className="bg-black/90 border border-white/20 p-2 rounded-xl text-[10px] font-mono shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md z-50 pointer-events-none min-w-[110px]">
        <div className="flex items-center justify-between gap-2 text-slate-400 pb-1 border-b border-white/10">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{pt.label}</span>
          </span>
          <span className="text-[9px] text-slate-500">Iter {pt.iteration}/5</span>
        </div>
        <div className="pt-1 flex items-center justify-between font-bold">
          <span className="text-slate-300">Accuracy</span>
          <span style={{ color }} className="drop-shadow-[0_0_6px_currentColor]">
            {pt.accuracy.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function ModelSparkline({
  data,
  color,
  gradientId,
  gainText,
  accentClass = 'text-emerald-400'
}: ModelSparklineProps) {
  const accValues = data.length > 0 ? data.map(d => d.accuracy) : [0];
  const minVal = Math.max(0, Math.floor(Math.min(...accValues) - 1.5));
  const maxVal = Math.min(100, Math.ceil(Math.max(...accValues) + 1.5));
  const firstPt = data[0] || { label: 'Baseline', accuracy: 0 };
  const lastPt = data[data.length - 1] || { label: 'Baseline', accuracy: 0 };

  const isDegraded = lastPt.accuracy > 0 && lastPt.accuracy < 80.0;
  const activeColor = isDegraded ? '#f59e0b' : color;
  const activeAccent = isDegraded ? 'text-amber-400' : accentClass;
  const activeGain = data.length <= 1
    ? 'Baseline'
    : isDegraded 
      ? `${(lastPt.accuracy - firstPt.accuracy > 0 ? '+' : '')}${(lastPt.accuracy - firstPt.accuracy).toFixed(1)}% (Drop)` 
      : `${(lastPt.accuracy - firstPt.accuracy >= 0 ? '+' : '')}${(lastPt.accuracy - firstPt.accuracy).toFixed(1)}%`;

  return (
    <div className={`p-3.5 rounded-2xl bg-black/50 border space-y-2 transition-all duration-300 shadow-inner group/sparkline ${
      isDegraded 
        ? 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
        : 'border-white/10 hover:border-white/25 hover:bg-black/60'
    }`}>
      {/* Title & Trend Delta Header */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-300 flex items-center gap-1.5 font-medium">
          <TrendingUp size={13} className={`${activeAccent} transition-transform group-hover/sparkline:scale-110`} />
          <span>Accuracy Trend (5 Iterations)</span>
        </span>
        <span 
          className={`font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wide border shadow-sm ${
            isDegraded 
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 animate-pulse' 
              : `border-white/10 bg-white/[0.04] ${activeAccent}`
          }`}
          title="Accuracy improvement across the last 5 training cycles"
        >
          {activeGain}
        </span>
      </div>

      {/* Sparkline Recharts Canvas */}
      <div className="h-14 w-full min-w-0 relative">
        {/* Subtle grid background scanline overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-lg" />
        
        <ResponsiveContainer width="100%" height={56} minWidth={100} debounce={50}>
          <AreaChart 
            data={data} 
            margin={{ top: 4, right: 6, left: 6, bottom: 2 }}
          >
            <defs>
              {/* Neon Glow Area Gradient */}
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeColor} stopOpacity={0.4} />
                <stop offset="60%" stopColor={activeColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={activeColor} stopOpacity={0.0} />
              </linearGradient>

              {/* Laser Line Glow Filter */}
              <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={activeColor} floodOpacity={0.85} />
              </filter>
            </defs>

            <YAxis domain={[minVal, maxVal]} hide />
            
            {/* Subtle baseline benchmark reference line */}
            <ReferenceLine 
              y={firstPt.accuracy} 
              stroke="rgba(255,255,255,0.08)" 
              strokeDasharray="2 2" 
            />

            <Tooltip 
              content={<CustomSparklineTooltip color={activeColor} />} 
              isAnimationActive={false} 
              cursor={{ stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1, strokeDasharray: '2 2' }}
            />

            <Area
              type="monotone"
              dataKey="accuracy"
              stroke={activeColor}
              strokeWidth={2.2}
              fill={`url(#${gradientId})`}
              filter={`url(#glow-${gradientId})`}
              isAnimationActive={true}
              animationDuration={800}
              dot={{
                r: 2.5,
                fill: activeColor,
                stroke: '#050505',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 4.5,
                stroke: '#ffffff',
                strokeWidth: 2,
                fill: activeColor,
                className: 'animate-pulse'
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5-Iteration Micro Stepper / Labels */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5 pt-1 border-t border-white/5">
        <span className="text-slate-500">
          Iter 1 <span className="text-slate-400 font-semibold">{firstPt.accuracy}%</span>
        </span>
        <div className="flex items-center gap-1 opacity-60">
          <Activity size={10} className={activeAccent} />
          <span className="text-[8px] text-slate-500 uppercase tracking-widest hidden sm:inline">Convergence</span>
        </div>
        <span className="font-bold">
          Iter 5 <span className={`${activeAccent} drop-shadow-[0_0_5px_currentColor]`}>{lastPt.accuracy}%</span>
        </span>
      </div>
    </div>
  );
}
export default ModelSparkline;
