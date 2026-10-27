import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Activity, Play, Crosshair } from 'lucide-react';

export interface SonarBarSpectrumMiniChartProps {
  inputs: number[];
  isPredicting?: boolean;
  predictionLabel?: 'ROCK' | 'MINE' | null;
  selectedBinIndex?: number | null;
  onSelectBin?: (index: number) => void;
  compact?: boolean;
  title?: string;
}

interface BinDatum {
  index: number;
  bin: string;
  value: number;
  band: 'Low (F1–F20)' | 'Mid (F21–F40)' | 'High (F41–F60)';
}

export const SonarBarSpectrumMiniChart: React.FC<SonarBarSpectrumMiniChartProps> = ({
  inputs,
  isPredicting = false,
  predictionLabel = null,
  selectedBinIndex = null,
  onSelectBin,
  compact = false,
  title = 'Live 60-Bin Acoustic Bar Spectrum',
}) => {
  const [scanIndex, setScanIndex] = useState<number | null>(null);
  const [isManualSweep, setIsManualSweep] = useState(false);

  const isScanning = isPredicting || isManualSweep;

  // Run a fast scan sweep across the 60 frequency bins during inference or manual sweep
  useEffect(() => {
    if (!isScanning) {
      setScanIndex(null);
      return;
    }

    let current = 0;
    setScanIndex(0);
    const interval = window.setInterval(() => {
      current += 2;
      if (current >= 60) {
        if (isManualSweep && !isPredicting) {
          setIsManualSweep(false);
          setScanIndex(null);
          window.clearInterval(interval);
          return;
        }
        current = 0;
      }
      setScanIndex(current);
    }, 28);

    return () => window.clearInterval(interval);
  }, [isScanning, isManualSweep, isPredicting]);

  const { data, meanValue, maxValue, peakIndex } = useMemo(() => {
    let sum = 0;
    let max = -1;
    let pIdx = 0;

    const chartData: BinDatum[] = Array.from({ length: 60 }, (_, idx) => {
      const raw = Number(inputs[idx]);
      const val = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
      sum += val;
      if (val > max) {
        max = val;
        pIdx = idx;
      }
      const band =
        idx < 20
          ? 'Low (F1–F20)'
          : idx < 40
          ? 'Mid (F21–F40)'
          : 'High (F41–F60)';

      return {
        index: idx,
        bin: `F${idx + 1}`,
        value: Number(val.toFixed(4)),
        band,
      };
    });

    const mean = chartData.length > 0 ? Number((sum / chartData.length).toFixed(4)) : 0;

    return {
      data: chartData,
      meanValue: mean,
      maxValue: max < 0 ? 0 : Number(max.toFixed(4)),
      peakIndex: pIdx,
    };
  }, [inputs]);

  const getBarFill = (entry: BinDatum): string => {
    const idx = entry.index;
    const val = entry.value;

    // Active pulse scan window highlight during live inference or manual sweep
    if (scanIndex !== null && Math.abs(idx - scanIndex) <= 2) {
      if (Math.abs(idx - scanIndex) === 0) return '#f8fafc';
      return predictionLabel === 'MINE' ? '#fb7185' : '#38bdf8';
    }

    // Selected bin highlight (from clicking a bar or focusing an input)
    if (selectedBinIndex === idx) {
      return '#f59e0b';
    }

    // Peak energy bin highlight
    if (idx === peakIndex && val > 0) {
      return predictionLabel === 'MINE' ? '#fbbf24' : '#38bdf8';
    }

    // Classified state color encoding
    if (predictionLabel === 'MINE') {
      if (val >= 0.75) return '#f43f5e';
      if (val >= 0.45) return '#e11d48';
      if (val >= 0.2) return '#be123c';
      return '#881337';
    }

    if (predictionLabel === 'ROCK') {
      if (val >= 0.75) return '#10b981';
      if (val >= 0.45) return '#059669';
      if (val >= 0.2) return '#0d9488';
      return '#115e59';
    }

    // Neutral pre-classification dynamic amplitude encoding
    if (val >= 0.75) return '#10b981';
    if (val >= 0.45) return '#06b6d4';
    if (val >= 0.2) return '#0284c7';
    return '#1e3a8a';
  };

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isScanning
          ? 'bg-slate-950/90 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
          : predictionLabel === 'MINE'
          ? 'bg-slate-950/75 border-rose-500/25'
          : predictionLabel === 'ROCK'
          ? 'bg-slate-950/75 border-emerald-500/25'
          : 'bg-slate-950/75 border-white/10'
      } ${compact ? 'p-3' : 'p-3.5'}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity
            className={`w-3.5 h-3.5 shrink-0 ${
              isScanning
                ? 'text-cyan-400 animate-spin'
                : predictionLabel === 'MINE'
                ? 'text-rose-400'
                : predictionLabel === 'ROCK'
                ? 'text-emerald-400'
                : 'text-cyan-400'
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wide text-slate-200 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsManualSweep(true)}
            disabled={isScanning}
            title="Run acoustic spectrum sweep animation"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-cyan-300 border border-cyan-500/25 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Play className="w-2.5 h-2.5" />
            {isScanning ? 'Scanning...' : 'Sweep'}
          </button>
        </div>
      </div>

      {/* Telemetry Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-mono tabular-nums text-slate-400 mb-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span>
            MEAN <strong className="text-cyan-300">{meanValue.toFixed(3)}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            PEAK{' '}
            <button
              type="button"
              onClick={() => onSelectBin?.(peakIndex)}
              className="text-amber-300 hover:underline font-semibold"
              title={`Click to focus peak bin F${peakIndex + 1}`}
            >
              F{peakIndex + 1} ({maxValue.toFixed(3)})
            </button>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          {selectedBinIndex !== null && selectedBinIndex >= 0 && selectedBinIndex < 60 ? (
            <span className="text-amber-300 flex items-center gap-1">
              <Crosshair className="w-2.5 h-2.5" />
              Focused: F{selectedBinIndex + 1} ({Number(inputs[selectedBinIndex] ?? 0).toFixed(4)})
            </span>
          ) : (
            <span className="text-slate-500">Click any bar to edit bin</span>
          )}
        </div>
      </div>

      {/* Recharts 60-Bin Bar Spectrum */}
      <div className={compact ? 'h-24 w-full' : 'h-32 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 2, left: -28, bottom: 0 }}
            barCategoryGap={1}
            onClick={(state) => {
              if (
                state &&
                typeof state.activeTooltipIndex === 'number' &&
                state.activeTooltipIndex >= 0 &&
                state.activeTooltipIndex < 60
              ) {
                onSelectBin?.(state.activeTooltipIndex);
              }
            }}
          >
            <XAxis
              dataKey="bin"
              tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
              interval={9}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.5, 1.0]}
              tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(56, 189, 248, 0.12)' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as BinDatum;
                const delta = d.value - meanValue;
                const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(4)}`;
                const pctOfPeak =
                  maxValue > 0 ? ((d.value / maxValue) * 100).toFixed(1) : '0.0';

                return (
                  <div className="bg-slate-950/95 border border-slate-700/80 rounded-lg px-2.5 py-2 shadow-xl text-[10px] font-mono tabular-nums space-y-1 z-50">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1">
                      <span className="font-bold text-white">
                        BIN {d.bin} {d.index === peakIndex ? '★ PEAK' : ''}
                      </span>
                      <span className="text-slate-400">{d.band}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">Amplitude:</span>
                      <span className="text-cyan-300 font-bold">{d.value.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">Δ vs Mean:</span>
                      <span className={delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {deltaStr}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400">Peak Ratio:</span>
                      <span className="text-slate-200">{pctOfPeak}%</span>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={meanValue}
              stroke="#38bdf8"
              strokeDasharray="3 3"
              strokeOpacity={0.75}
              ifOverflow="extendDomain"
            />
            <Bar
              dataKey="value"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
              className="cursor-pointer"
              onClick={(barData) => {
                if (barData && typeof barData.index === 'number') {
                  onSelectBin?.(barData.index);
                }
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={`bin-cell-${entry.index}`}
                  fill={getBarFill(entry)}
                  fillOpacity={
                    selectedBinIndex !== null && selectedBinIndex !== entry.index
                      ? 0.65
                      : 0.95
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Band Legend & Status Footer */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1.5 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>F1–F20 Low</span>
          <span aria-hidden="true">·</span>
          <span>F21–F40 Mid</span>
          <span aria-hidden="true">·</span>
          <span>F41–F60 High</span>
        </div>
        <span className="text-cyan-400/80">-- Mean ({meanValue.toFixed(2)})</span>
      </div>
    </div>
  );
};
