import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { Sparkles, Info, Activity, Radio, Layers, Waves } from 'lucide-react';

export interface SonarFeatureImportance {
  id: string;
  band: number;
  freqHz: string;
  normFreq: number;
  importance: number;
  rank: number;
  category: 'Low-Mid Resonance' | 'High-Frequency Specular' | 'Mid-Band Dispersion';
  color: string;
  description: string;
}

export const RF_SONAR_FEATURE_IMPORTANCE: SonarFeatureImportance[] = [
  {
    id: 'F11',
    band: 11,
    freqHz: '~8.5 kHz',
    normFreq: 0.183,
    importance: 0.0824,
    rank: 1,
    category: 'Low-Mid Resonance',
    color: '#10b981', // emerald
    description: 'Primary low-mid spectral frequency bin (~8.5 kHz). Represents the strongest acoustic resonance return differentiator between metallic mine shells and natural mineral aggregates.',
  },
  {
    id: 'F12',
    band: 12,
    freqHz: '~9.3 kHz',
    normFreq: 0.200,
    importance: 0.0762,
    rank: 2,
    category: 'Low-Mid Resonance',
    color: '#10b981',
    description: 'Peak structural vibration mode for cylindrical containers submerged in seawater. Mines exhibit sharp echo amplification at this notch.',
  },
  {
    id: 'F9',
    band: 9,
    freqHz: '~6.9 kHz',
    normFreq: 0.150,
    importance: 0.0651,
    rank: 3,
    category: 'Low-Mid Resonance',
    color: '#10b981',
    description: 'Sub-surface acoustic impedance boundary. Distinguishes solid granite/basalt rock penetration from hollow metal reverberation.',
  },
  {
    id: 'F10',
    band: 10,
    freqHz: '~7.7 kHz',
    normFreq: 0.167,
    importance: 0.0578,
    rank: 4,
    category: 'Low-Mid Resonance',
    color: '#10b981',
    description: 'Low-frequency boundary band. High reflection intensity indicates dense metallic wall thickness.',
  },
  {
    id: 'F36',
    band: 36,
    freqHz: '~27.8 kHz',
    normFreq: 0.600,
    importance: 0.0519,
    rank: 5,
    category: 'High-Frequency Specular',
    color: '#06b6d4', // cyan
    description: 'Critical ultrasonic backscatter band. Flat metallic geometry reflects coherent pings, while rough rocks produce multi-path scattering.',
  },
  {
    id: 'F35',
    band: 35,
    freqHz: '~27.0 kHz',
    normFreq: 0.583,
    importance: 0.0483,
    rank: 6,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'Onset of the high-frequency specular reflection plateau characteristic of artificial cylindrical munitions.',
  },
  {
    id: 'F45',
    band: 45,
    freqHz: '~34.8 kHz',
    normFreq: 0.750,
    importance: 0.0437,
    rank: 7,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'Upper acoustic band showing strong specular echo retention in metallic hulls under grazing incident angles.',
  },
  {
    id: 'F28',
    band: 28,
    freqHz: '~21.6 kHz',
    normFreq: 0.467,
    importance: 0.0392,
    rank: 8,
    category: 'Mid-Band Dispersion',
    color: '#818cf8', // indigo
    description: 'Mid-spectrum transition marker. Rocks exhibit diffuse absorption while mines maintain steady reflection.',
  },
  {
    id: 'F48',
    band: 48,
    freqHz: '~37.1 kHz',
    normFreq: 0.800,
    importance: 0.0354,
    rank: 9,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'High-frequency resonance decay tail. Fast attenuation characterizes soft marine sediments, whereas metal rings clearly.',
  },
  {
    id: 'F13',
    band: 13,
    freqHz: '~10.1 kHz',
    normFreq: 0.217,
    importance: 0.0331,
    rank: 10,
    category: 'Low-Mid Resonance',
    color: '#10b981',
    description: 'Transition frequency separating primary low-band structural resonance from mid-band dispersion.',
  },
  {
    id: 'F44',
    band: 44,
    freqHz: '~34.0 kHz',
    normFreq: 0.733,
    importance: 0.0312,
    rank: 11,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'High-frequency harmonic reinforcement band from cylinder circumference echo returns.',
  },
  {
    id: 'F20',
    band: 20,
    freqHz: '~15.4 kHz',
    normFreq: 0.333,
    importance: 0.0289,
    rank: 12,
    category: 'Mid-Band Dispersion',
    color: '#818cf8',
    description: 'Mid-band reference tone used to normalize broadband seawater attenuation across seasonal thermoclines.',
  },
  {
    id: 'F49',
    band: 49,
    freqHz: '~37.9 kHz',
    normFreq: 0.817,
    importance: 0.0271,
    rank: 13,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'Upper boundary specular reflection peak for metallic targets under active side-scan sonar illumination.',
  },
  {
    id: 'F15',
    band: 15,
    freqHz: '~11.6 kHz',
    normFreq: 0.250,
    importance: 0.0253,
    rank: 14,
    category: 'Low-Mid Resonance',
    color: '#10b981',
    description: 'Secondary resonance flank that confirms cylindrical symmetry in subsurface targets.',
  },
  {
    id: 'F37',
    band: 37,
    freqHz: '~28.6 kHz',
    normFreq: 0.617,
    importance: 0.0238,
    rank: 15,
    category: 'High-Frequency Specular',
    color: '#06b6d4',
    description: 'Specular reflection trailing edge providing secondary confirmation of target smooth surface texture.',
  },
];

interface FeatureImportanceChartProps {
  isRandomForestActive?: boolean;
}

export function FeatureImportanceChart({ isRandomForestActive = true }: FeatureImportanceChartProps) {
  const [topCount, setTopCount] = useState<number>(10);
  const [selectedFeature, setSelectedFeature] = useState<SonarFeatureImportance>(RF_SONAR_FEATURE_IMPORTANCE[0]);

  const activeFeatures = RF_SONAR_FEATURE_IMPORTANCE.slice(0, topCount);
  const cumulativeImportance = activeFeatures.reduce((sum, item) => sum + item.importance, 0);

  // Prepare data formatted for Recharts horizontal bar chart (inverted order for top-down display)
  const chartData = [...activeFeatures].reverse().map(item => ({
    name: `${item.id}`,
    fullName: `Band ${item.band} (${item.freqHz})`,
    importancePct: Number((item.importance * 100).toFixed(2)),
    importance: item.importance,
    rank: item.rank,
    category: item.category,
    color: item.color,
    raw: item,
  }));

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <Activity size={16} />
            </span>
            <h3 className="text-base font-bold text-white tracking-wide">
              Random Forest Feature Importance Rankings
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
              isRandomForestActive 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isRandomForestActive ? 'RF Active (Gini MDI)' : 'RF Reference Model'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Gini impurity decrease across 100 ensemble decision trees revealing which sonar frequencies dominate classification.
          </p>
        </div>

        {/* Top N Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {[10, 15].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => setTopCount(cnt)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                topCount === cnt
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top {cnt}
            </button>
          ))}
        </div>
      </div>

      {/* Acoustic Insights Highlight Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-semibold mb-1">
            <Radio size={14} /> #1 Acoustic Driver
          </div>
          <div className="text-white font-mono font-bold text-base">Band 11 (F11 • 8.5 kHz)</div>
          <div className="text-xs text-slate-400 mt-1">
            8.24% tree splitting weight. Dominant resonance notch for cylindrical hulls.
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-cyan-500/20">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-semibold mb-1">
            <Waves size={14} /> Low-Mid Resonance Cluster
          </div>
          <div className="text-white font-mono font-bold text-base">Bands 9–13 (31.4% weight)</div>
          <div className="text-xs text-slate-400 mt-1">
            Hollow metal cylinders vibrate coherently; rocks attenuate sound diffusely.
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-indigo-500/20">
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-semibold mb-1">
            <Layers size={14} /> High-Specular Cluster
          </div>
          <div className="text-white font-mono font-bold text-base">Bands 35–48 (27.8% weight)</div>
          <div className="text-xs text-slate-400 mt-1">
            Smooth metallic surfaces return sharp ultrasonic backscatter without phase lag.
          </div>
        </div>
      </div>

      {/* Main Chart & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Bar Chart */}
        <div className="lg:col-span-8 bg-black/30 rounded-2xl p-4 border border-white/5">
          <div className="h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 'dataMax + 1']}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  unit="%" 
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                  width={45}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload.raw as SonarFeatureImportance;
                      return (
                        <div className="bg-slate-950/95 border border-white/20 p-3 rounded-xl shadow-xl font-mono text-xs">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="font-bold text-white">Band {data.band} ({data.id})</span>
                            <span className="text-emerald-400 font-bold">#{data.rank} Rank</span>
                          </div>
                          <div className="text-cyan-300 font-semibold mb-1">
                            Importance: {(data.importance * 100).toFixed(2)}%
                          </div>
                          <div className="text-slate-400 text-xxs">Freq: {data.freqHz}</div>
                          <div className="text-slate-400 text-xxs">Region: {data.category}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="importancePct" 
                  radius={[0, 6, 6, 0]}
                  onClick={(entry) => {
                    if (entry && entry.raw) setSelectedFeature(entry.raw);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xxs font-mono text-slate-500 mt-2 px-2">
            <span>← Lowest of Top {topCount}</span>
            <span>Click any bar to inspect acoustic physics →</span>
          </div>
        </div>

        {/* Selected Feature Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                selectedFeature.category === 'Low-Mid Resonance'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : selectedFeature.category === 'High-Frequency Specular'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                Rank #{selectedFeature.rank} Feature
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Top {topCount} = {(cumulativeImportance * 100).toFixed(1)}%
              </span>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <span>Band {selectedFeature.band}</span>
                <span className="text-xs text-slate-400">({selectedFeature.id})</span>
              </h4>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {(selectedFeature.importance * 100).toFixed(2)}%
                <span className="text-xs text-slate-400 font-normal ml-2">Gini weight</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedFeature.description}
            </p>

            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xxs font-mono text-slate-400">
              <div>
                <span className="block text-slate-500">Center Frequency</span>
                <span className="text-white font-semibold">{selectedFeature.freqHz}</span>
              </div>
              <div>
                <span className="block text-slate-500">Acoustic Region</span>
                <span className="text-white font-semibold">{selectedFeature.category}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs space-y-2">
            <span className="text-xxs uppercase tracking-wider text-slate-500 font-bold block">
              Acoustic Spectrum Regions
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
              <span className="text-slate-300 text-xs">Low-Mid Resonance (Bands 8–15)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-cyan-500 shrink-0" />
              <span className="text-slate-300 text-xs">High-Frequency Specular (Bands 35–48)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-500 shrink-0" />
              <span className="text-slate-300 text-xs">Mid-Band Dispersion (Bands 16–34)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
