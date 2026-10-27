import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  LabelList,
} from 'recharts';
import { Award, TrendingUp, Sliders, ShieldCheck, AlertTriangle, Scale, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModelAccuracyDataPoint {
  id: string; // 'lr' | 'rf' | 'knn'
  name: string; // 'Logistic Regression' | 'Random Forest' | 'KNN'
  shortName: string;
  accuracy: number; // 0 to 100
  color: string;
  category: string;
  status?: string;
  isBaseline?: boolean;
}

export interface ModelAccuracyComparisonChartProps {
  /**
   * Custom model data points. If not provided, will default to standard benchmark scores.
   */
  models?: ModelAccuracyDataPoint[];
  /**
   * Optional threshold line (e.g. 80.0 for naval reliability). Default 80.0.
   */
  threshold?: number;
  /**
   * Title of the section/card
   */
  title?: string;
  /**
   * Subtitle description
   */
  subtitle?: string;
  /**
   * Highlight a specific model ID (e.g. 'lr', 'rf', 'knn')
   */
  highlightedModelId?: string | null;
  /**
   * Callback when a model bar or card is clicked
   */
  onSelectModel?: (modelId: string) => void;
  /**
   * Additional container classes
   */
  className?: string;
}

const DEFAULT_MODELS: ModelAccuracyDataPoint[] = [
  {
    id: 'lr',
    name: 'Logistic Regression',
    shortName: 'Logistic Reg.',
    accuracy: 83.3,
    color: '#4ade80', // emerald
    category: 'Linear / Probabilistic',
    isBaseline: true,
    status: 'Ready',
  },
  {
    id: 'rf',
    name: 'Random Forest',
    shortName: 'Random Forest',
    accuracy: 88.1,
    color: '#c084fc', // purple
    category: 'Ensemble Trees',
    isBaseline: false,
    status: 'Optimized',
  },
  {
    id: 'knn',
    name: 'K-Nearest Neighbors',
    shortName: 'KNN',
    accuracy: 85.7,
    color: '#22d3ee', // cyan
    category: 'Instance-Based',
    isBaseline: false,
    status: 'Ready',
  },
];

export function ModelAccuracyComparisonChart({
  models = DEFAULT_MODELS,
  threshold = 80.0,
  title = 'Model Accuracy Benchmark (Side-by-Side)',
  subtitle = 'Direct side-by-side accuracy comparison across the three primary sonar classifiers: Logistic Regression, Random Forest, and KNN.',
  highlightedModelId,
  onSelectModel,
  className,
}: ModelAccuracyComparisonChartProps) {
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual');

  // Baseline model (usually Logistic Regression)
  const baselineModel = models.find((m) => m.isBaseline || m.id === 'lr') || models[0];
  const baselineAcc = baselineModel ? baselineModel.accuracy : 80;

  // Best performer
  const bestModel = [...models].sort((a, b) => b.accuracy - a.accuracy)[0];

  // Grouped data format for grouped mode (single category row with 3 side-by-side bars)
  const groupedData = [
    {
      category: 'Classification Accuracy',
      'Logistic Regression': Number((models.find((m) => m.id === 'lr')?.accuracy || 0).toFixed(1)),
      'Random Forest': Number((models.find((m) => m.id === 'rf')?.accuracy || 0).toFixed(1)),
      'K-Nearest Neighbors (KNN)': Number((models.find((m) => m.id === 'knn')?.accuracy || 0).toFixed(1)),
    },
  ];

  return (
    <div
      className={cn(
        'bg-black/40 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl space-y-6 relative overflow-hidden',
        className
      )}
    >
      {/* Decorative underwater ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Recharts Multi-Model Visualization
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Scale className="w-5 h-5 text-emerald-400" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{subtitle}</p>
        </div>

        {/* View toggle tabs */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
              viewMode === 'individual'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
            title="Show each model in its own column with signature colors"
          >
            Side-by-Side Columns
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
              viewMode === 'grouped'
                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
            title="Show side-by-side cluster with color legend"
          >
            Clustered Bar
          </button>
        </div>
      </div>

      {/* Model Benchmark Scorecards (Side-by-Side Badges) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {models.map((m) => {
          const diff = m.accuracy - baselineAcc;
          const isSelected = highlightedModelId === m.id;
          const isBelowThreshold = m.accuracy < threshold;

          return (
            <div
              key={m.id}
              onClick={() => onSelectModel?.(m.id)}
              className={cn(
                'p-4 rounded-2xl border transition-all duration-300 relative group cursor-pointer',
                isSelected
                  ? 'bg-white/10 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                  : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5',
                isBelowThreshold && 'border-amber-500/50 bg-amber-950/15'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                    {m.name}
                  </span>
                </div>
                {m.isBaseline && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                    Baseline
                  </span>
                )}
                {m.id === bestModel.id && !m.isBaseline && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase font-bold flex items-center gap-1">
                    <Award size={11} />
                    Leader
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl font-mono font-bold text-white tracking-tight">
                  {m.accuracy.toFixed(1)}%
                </span>
                {!m.isBaseline && (
                  <span
                    className={cn(
                      'text-xs font-mono font-bold flex items-center gap-0.5',
                      diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                    <span className="text-[10px] text-slate-500 font-normal">vs LR</span>
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{m.category}</span>
                {isBelowThreshold ? (
                  <span className="text-amber-400 flex items-center gap-1 font-mono font-bold text-[10px]">
                    <AlertTriangle size={11} />
                    &lt;{threshold}% Alert
                  </span>
                ) : (
                  <span className="text-emerald-400/90 font-mono text-[10px] flex items-center gap-1">
                    <ShieldCheck size={11} />
                    Reliable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Recharts Bar Chart Visualizer */}
      <div className="w-full h-80 md:h-96 pt-2 relative z-10">
        <ResponsiveContainer width="100%" height="100%" minHeight={320} debounce={50}>
          {viewMode === 'individual' ? (
            /* Mode 1: Side-by-Side Model Columns */
            <BarChart
              data={models}
              margin={{ top: 28, right: 30, left: 0, bottom: 20 }}
              barCategoryGap={24}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 700 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ModelAccuracyDataPoint;
                    const diff = data.accuracy - baselineAcc;
                    return (
                      <div className="bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl space-y-2.5 min-w-[240px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <p className="text-xs font-bold text-white uppercase tracking-wider">
                              {data.name}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{data.category}</span>
                        </div>

                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Accuracy Score:</span>
                            <span className="text-white font-bold text-sm">
                              {data.accuracy.toFixed(1)}%
                            </span>
                          </div>

                          {!data.isBaseline && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Delta vs Baseline (LR):</span>
                              <span
                                className={cn(
                                  'font-bold',
                                  diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                )}
                              >
                                {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                            <span className="text-slate-400">Naval Threshold:</span>
                            <span
                              className={cn(
                                'font-bold',
                                data.accuracy >= threshold ? 'text-emerald-400' : 'text-amber-400'
                              )}
                            >
                              {data.accuracy >= threshold ? 'Exceeds (80%)' : 'Sub-Optimal (<80%)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={threshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `80% Reliability Threshold`,
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey="accuracy"
                radius={[8, 8, 0, 0]}
                onClick={(entry) => onSelectModel?.(entry.id)}
                cursor="pointer"
              >
                <LabelList
                  dataKey="accuracy"
                  position="top"
                  formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  style={{ fill: '#ffffff', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}
                />
                {models.map((entry) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={entry.color}
                    opacity={highlightedModelId && highlightedModelId !== entry.id ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            /* Mode 2: Clustered side-by-side bars for the 3 models */
            <BarChart
              data={groupedData}
              margin={{ top: 28, right: 30, left: 0, bottom: 20 }}
              barGap={10}
              barCategoryGap={30}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="category"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: 700 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl space-y-2 min-w-[240px]">
                        <p className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-1">
                          Model Accuracy Comparison
                        </p>
                        <div className="space-y-1.5 pt-1">
                          {payload.map((entry, index) => {
                            const val = Number(entry.value);
                            const lrVal = Number(payload.find((p) => p.name === 'Logistic Regression')?.value || 0);
                            const diff = entry.name !== 'Logistic Regression' ? val - lrVal : 0;
                            return (
                              <div key={`item-${index}`} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-white font-bold">{val.toFixed(1)}%</span>
                                  {entry.name !== 'Logistic Regression' && (
                                    <span
                                      className={`text-[10px] ${
                                        diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      ({diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '15px' }}
                formatter={(value) => (
                  <span className="text-slate-300 text-xs font-semibold px-2">{value}</span>
                )}
              />
              <ReferenceLine
                y={threshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `80% Threshold`,
                  position: 'insideTopRight',
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              {/* Order: Logistic Regression, Random Forest, KNN side-by-side */}
              <Bar
                dataKey="Logistic Regression"
                fill="#4ade80"
                radius={[6, 6, 0, 0]}
              >
                <LabelList
                  dataKey="Logistic Regression"
                  position="top"
                  formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  style={{ fill: '#ffffff', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}
                />
              </Bar>
              <Bar
                dataKey="Random Forest"
                fill="#c084fc"
                radius={[6, 6, 0, 0]}
              >
                <LabelList
                  dataKey="Random Forest"
                  position="top"
                  formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  style={{ fill: '#ffffff', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}
                />
              </Bar>
              <Bar
                dataKey="K-Nearest Neighbors (KNN)"
                fill="#22d3ee"
                radius={[6, 6, 0, 0]}
              >
                <LabelList
                  dataKey="K-Nearest Neighbors (KNN)"
                  position="top"
                  formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  style={{ fill: '#ffffff', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Naval Assessment Summary Footer */}
      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">{bestModel.name}</strong> leads overall accuracy at{' '}
            <strong className="text-emerald-400 font-mono">{bestModel.accuracy.toFixed(1)}%</strong>
            {bestModel.id !== 'lr' && ` (+${(bestModel.accuracy - baselineAcc).toFixed(1)}% over Baseline)`}.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Logistic Reg.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> Random Forest
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> KNN
          </span>
        </div>
      </div>
    </div>
  );
}
