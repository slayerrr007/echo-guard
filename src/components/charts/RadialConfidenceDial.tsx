import React from 'react';
import { ShieldCheck, Gauge, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface RadialConfidenceDialProps {
  confidence: number; // 0.0 to 1.0
  label: 'ROCK' | 'MINE';
  pRock: number;
  pMine: number;
  modelName?: string;
  isPredicting?: boolean;
}

export const RadialConfidenceDial: React.FC<RadialConfidenceDialProps> = ({
  confidence,
  label,
  pRock,
  pMine,
  isPredicting = false,
}) => {
  const clampedConf = Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0));
  const pct = clampedConf * 100;
  const marginPct = Math.abs(pMine - pRock) * 100;

  // Threshold determination:
  // >= 85%: High Certainty (Emerald)
  // 70% - 84.9%: Moderate Certainty (Cyan)
  // < 70%: Low / Ambiguous Certainty (Amber/Orange Warning)
  const tier =
    clampedConf >= 0.85
      ? {
          id: 'high' as const,
          name: 'High Certainty',
          shortTag: '≥ 85% Optimal',
          strokePrimary: '#10b981',
          strokeSecondary: '#34d399',
          trackGlow: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.45))',
          textClass: 'text-emerald-400',
          borderClass: 'border-emerald-500/30',
          bgClass: 'bg-emerald-950/20',
          Icon: ShieldCheck,
        }
      : clampedConf >= 0.7
      ? {
          id: 'moderate' as const,
          name: 'Moderate Certainty',
          shortTag: '70%–84% Nominal',
          strokePrimary: '#06b6d4',
          strokeSecondary: '#38bdf8',
          trackGlow: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.45))',
          textClass: 'text-cyan-400',
          borderClass: 'border-cyan-500/30',
          bgClass: 'bg-cyan-950/20',
          Icon: Gauge,
        }
      : {
          id: 'low' as const,
          name: 'Low Certainty Alert',
          shortTag: '< 70% Threshold',
          strokePrimary: '#f59e0b',
          strokeSecondary: '#fb923c',
          trackGlow: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))',
          textClass: 'text-amber-400',
          borderClass: 'border-amber-500/45',
          bgClass: 'bg-amber-950/25',
          Icon: AlertTriangle,
        };

  const TierIcon = tier.Icon;

  // SVG Radial Dial Geometry (270-degree open gauge from 135 deg to 405 deg)
  const size = 200;
  const center = size / 2;
  const radius = 74;
  const innerRadius = 60;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 degrees out of 360
  const maxArcLength = circumference * arcFraction;
  const filledArcLength = maxArcLength * clampedConf;

  // Helper to compute (x, y) on the 270-degree gauge arc (0% at 135°, 100% at 405°)
  const getCoordinatesForPct = (targetPct: number, r: number) => {
    const angleDeg = 135 + targetPct * 270;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: center + r * Math.cos(angleRad),
      y: center + r * Math.sin(angleRad),
    };
  };

  // Threshold marker coordinates at 70% and 85%
  const marker70Outer = getCoordinatesForPct(0.7, radius + 9);
  const marker70Inner = getCoordinatesForPct(0.7, radius - 9);
  const marker85Outer = getCoordinatesForPct(0.85, radius + 9);
  const marker85Inner = getCoordinatesForPct(0.85, radius - 9);
  const activeTip = getCoordinatesForPct(clampedConf, radius);

  // Generate 28 subtle calibration ticks along the 270-degree sweep
  const totalTicks = 27;
  const ticks = Array.from({ length: totalTicks + 1 }, (_, i) => {
    const t = i / totalTicks;
    const isMajor = i % 9 === 0;
    const outerR = radius + (isMajor ? 14 : 11);
    const innerR = radius + 8;
    const p1 = getCoordinatesForPct(t, innerR);
    const p2 = getCoordinatesForPct(t, outerR);
    const isActiveTick = t <= clampedConf;
    return { p1, p2, isMajor, isActiveTick, key: i };
  });

  // Inner secondary ring for P(Mine) vs P(Rock) split
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerMaxArc = innerCircumference * arcFraction;
  const innerFilledArc = innerMaxArc * (label === 'MINE' ? pMine : pRock);

  const gradientId = `radial-dial-grad-${tier.id}`;

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-colors space-y-3.5',
        tier.bgClass,
        tier.borderClass
      )}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <TierIcon size={14} className={tier.textClass} />
          <span>Confidence Probability Dial</span>
        </span>
        <span
          className={cn(
            'text-[11px] font-mono tabular-nums px-2 py-0.5 rounded border',
            tier.id === 'high'
              ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
              : tier.id === 'moderate'
              ? 'text-cyan-300 bg-cyan-950/60 border-cyan-500/30'
              : 'text-amber-300 bg-amber-950/80 border-amber-500/50 font-bold'
          )}
        >
          p = {clampedConf.toFixed(4)}
        </span>
      </div>

      {/* Radial Gauge Viewport */}
      <div className="relative flex flex-col items-center justify-center py-1">
        <svg
          width={size}
          height={size - 22}
          viewBox={`0 0 ${size} ${size - 16}`}
          className="overflow-visible select-none"
          role="img"
          aria-label={`Classification probability radial dial showing ${pct.toFixed(1)}% confidence (${tier.name})`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={tier.strokePrimary} />
              <stop offset="100%" stopColor={tier.strokeSecondary} />
            </linearGradient>
          </defs>

          {/* Outer Calibration Ticks */}
          {ticks.map((tk) => (
            <line
              key={tk.key}
              x1={tk.p1.x}
              y1={tk.p1.y}
              x2={tk.p2.x}
              y2={tk.p2.y}
              stroke={
                tk.isActiveTick
                  ? tier.strokeSecondary
                  : tk.isMajor
                  ? 'rgba(148, 163, 184, 0.45)'
                  : 'rgba(148, 163, 184, 0.18)'
              }
              strokeWidth={tk.isMajor ? 1.75 : 1}
              strokeLinecap="round"
            />
          ))}

          {/* Background Track (270 degrees) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.9)"
            strokeWidth={11}
            strokeDasharray={`${maxArcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Inner Comparison Track */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="rgba(15, 23, 42, 0.85)"
            strokeWidth={3.5}
            strokeDasharray={`${innerMaxArc} ${innerCircumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Inner Secondary Probability Arc */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={label === 'MINE' ? 'rgba(244, 63, 94, 0.55)' : 'rgba(16, 185, 129, 0.55)'}
            strokeWidth={3.5}
            strokeDasharray={`${innerFilledArc} ${innerCircumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            className="transition-all duration-700 ease-out"
          />

          {/* Primary Threshold-Colored Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={11}
            strokeDasharray={`${filledArcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            style={{ filter: tier.trackGlow }}
            className={cn(
              'transition-all duration-700 ease-out',
              isPredicting && 'animate-pulse'
            )}
          />

          {/* 70% Operational Threshold Marker Line */}
          <line
            x1={marker70Inner.x}
            y1={marker70Inner.y}
            x2={marker70Outer.x}
            y2={marker70Outer.y}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="2 1"
          />
          <text
            x={marker70Outer.x + 6}
            y={marker70Outer.y - 3}
            fill="#fbbf24"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            70%
          </text>

          {/* 85% High Certainty Threshold Marker Line */}
          <line
            x1={marker85Inner.x}
            y1={marker85Inner.y}
            x2={marker85Outer.x}
            y2={marker85Outer.y}
            stroke="#10b981"
            strokeWidth={2}
          />
          <text
            x={marker85Outer.x + 6}
            y={marker85Outer.y + 3}
            fill="#34d399"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            85%
          </text>

          {/* Active Needle Tip Node */}
          {clampedConf > 0.01 && (
            <circle
              cx={activeTip.x}
              cy={activeTip.y}
              r={4.5}
              fill="#ffffff"
              stroke={tier.strokePrimary}
              strokeWidth={2.5}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Scale Endpoints: 0% and 100% */}
          <text
            x={center - 54}
            y={center + 68}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="middle"
          >
            0%
          </text>
          <text
            x={center + 54}
            y={center + 68}
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="middle"
          >
            100%
          </text>
        </svg>

        {/* Center Readout Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2 pointer-events-none">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            {label} PROBABILITY
          </span>
          <div className="flex items-baseline gap-0.5 mt-0.5">
            <span
              className={cn(
                'text-3xl font-black font-mono tabular-nums tracking-tight',
                tier.id === 'low' ? 'text-amber-300' : 'text-white'
              )}
            >
              {pct.toFixed(1)}
            </span>
            <span className={cn('text-sm font-mono font-bold', tier.textClass)}>%</span>
          </div>
          <span className={cn('text-[10px] font-mono font-semibold mt-0.5', tier.textClass)}>
            {tier.shortTag}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-slate-400 mt-1">
            Margin Δ +{marginPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 3-Tier Confidence Threshold Legend */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-[10px] font-mono tabular-nums">
        <div
          className={cn(
            'px-2 py-1.5 rounded-lg border text-center transition-all',
            tier.id === 'low'
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-black/40 border-white/5 text-slate-500'
          )}
        >
          <div className="text-amber-400">&lt; 70%</div>
          <div className="text-[9px] truncate">Ambiguous</div>
        </div>

        <div
          className={cn(
            'px-2 py-1.5 rounded-lg border text-center transition-all',
            tier.id === 'moderate'
              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'bg-black/40 border-white/5 text-slate-500'
          )}
        >
          <div className="text-cyan-400">70–84%</div>
          <div className="text-[9px] truncate">Moderate</div>
        </div>

        <div
          className={cn(
            'px-2 py-1.5 rounded-lg border text-center transition-all',
            tier.id === 'high'
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-black/40 border-white/5 text-slate-500'
          )}
        >
          <div className="text-emerald-400">≥ 85%</div>
          <div className="text-[9px] truncate">High Cert</div>
        </div>
      </div>
    </div>
  );
};
