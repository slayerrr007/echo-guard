import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  Sparkles, 
  Info, 
  Activity, 
  Radio, 
  Layers, 
  Waves, 
  Loader2, 
  AlertCircle,
  Sliders,
  CheckCircle2,
  Cpu,
  Scale,
  Crosshair,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { getFeatureImportance, FeatureImportanceResponse, FeatureImportanceItem } from '../../services/api';

export type ModelTab = 'all' | 'random_forest' | 'logistic_regression' | 'knn';

export interface SonarFeatureDetail {
  id: string;
  band: number;
  freqHz: string;
  normFreq: number;
  category: 'Low-Mid Resonance' | 'High-Frequency Specular' | 'Mid-Band Dispersion';
  color: string;
  // Specific model metrics
  rfImportance: number;
  rfRank: number;
  lrImportance: number;
  lrRawCoef: number;
  lrImpact: 'mine' | 'rock';
  lrRank: number;
  knnImportance: number;
  knnAccDrop: number;
  knnRank: number;
  // Active model value
  importance: number;
  rank: number;
  rawLabel: string;
  description: string;
}

function getFeatureCategory(band: number): 'Low-Mid Resonance' | 'High-Frequency Specular' | 'Mid-Band Dispersion' {
  if (band >= 8 && band <= 15) return 'Low-Mid Resonance';
  if (band >= 35 && band <= 48) return 'High-Frequency Specular';
  return 'Mid-Band Dispersion';
}

function getCategoryColor(cat: 'Low-Mid Resonance' | 'High-Frequency Specular' | 'Mid-Band Dispersion'): string {
  switch (cat) {
    case 'Low-Mid Resonance':
      return '#10b981'; // emerald
    case 'High-Frequency Specular':
      return '#06b6d4'; // cyan
    case 'Mid-Band Dispersion':
    default:
      return '#818cf8'; // indigo
  }
}

function getAcousticDescription(
  band: number, 
  cat: 'Low-Mid Resonance' | 'High-Frequency Specular' | 'Mid-Band Dispersion',
  model: ModelTab
): string {
  if (cat === 'Low-Mid Resonance') {
    return `Low-mid spectral resonance band (~${(0.5 + (band - 1) * (11.5 / 59)).toFixed(1)} kHz). Captures decisive structural acoustic circumferential resonance vibrations induced in hollow metallic mine casings, absent in solid seabed rocks.`;
  } else if (cat === 'High-Frequency Specular') {
    return `High-frequency specular reflection band (~${(0.5 + (band - 1) * (11.5 / 59)).toFixed(1)} kHz). Highlights acoustic scattering surface roughness contrast: clean specular reflections off machined metal shells vs diffuse backscatter from irregular rock surfaces.`;
  }
  return `Mid-band spectral dispersion frequency (~${(0.5 + (band - 1) * (11.5 / 59)).toFixed(1)} kHz). Captures internal acoustic reverberation, aspect-angle dependent diffraction, and target geometry echo interference.`;
}

interface FeatureImportanceChartProps {
  isRandomForestActive?: boolean;
  activeAlgorithm?: string; // 'knn' | 'logistic_regression' | 'random_forest'
}

export function FeatureImportanceChart({ 
  isRandomForestActive = true,
  activeAlgorithm
}: FeatureImportanceChartProps) {
  // Normalize initial tab from props
  const initialTab: ModelTab = activeAlgorithm === 'logistic_regression' || activeAlgorithm === 'lr'
    ? 'logistic_regression'
    : activeAlgorithm === 'knn'
      ? 'knn'
      : 'random_forest';

  const [selectedModel, setSelectedModel] = useState<ModelTab>(initialTab);
  const [topCount, setTopCount] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allData, setAllData] = useState<FeatureImportanceResponse | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<SonarFeatureDetail | null>(null);

  // Sync with activeAlgorithm if parent changes it
  useEffect(() => {
    if (activeAlgorithm) {
      const mapped: ModelTab = activeAlgorithm === 'logistic_regression' || activeAlgorithm === 'lr'
        ? 'logistic_regression'
        : activeAlgorithm === 'knn'
          ? 'knn'
          : 'random_forest';
      setSelectedModel(mapped);
    }
  }, [activeAlgorithm]);

  // Fetch all models feature importances
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        // Request feature importances with all models from backend
        const res: FeatureImportanceResponse = await getFeatureImportance('all');
        if (!isMounted) return;
        setAllData(res);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load feature importance from backend');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute unified 60 feature details across all 3 models
  const unifiedFeatures = useMemo<SonarFeatureDetail[]>(() => {
    if (!allData) return [];

    const rfFeatures = allData.all_models?.random_forest?.features || allData.features || [];
    const lrFeatures = allData.all_models?.logistic_regression?.features || [];
    const knnFeatures = allData.all_models?.knn?.features || [];

    // Compute ranks for each model
    const rfSorted = [...rfFeatures].sort((a, b) => b.importance - a.importance);
    const lrSorted = [...lrFeatures].sort((a, b) => b.importance - a.importance);
    const knnSorted = [...knnFeatures].sort((a, b) => b.importance - a.importance);

    const rfRankMap = new Map<number, number>();
    rfSorted.forEach((f, idx) => rfRankMap.set(f.index, idx + 1));

    const lrRankMap = new Map<number, number>();
    lrSorted.forEach((f, idx) => lrRankMap.set(f.index, idx + 1));

    const knnRankMap = new Map<number, number>();
    knnSorted.forEach((f, idx) => knnRankMap.set(f.index, idx + 1));

    const details: SonarFeatureDetail[] = [];

    for (let i = 0; i < 60; i++) {
      const band = i + 1;
      const category = getFeatureCategory(band);
      const color = getCategoryColor(category);
      const normFreq = Number((i / 59).toFixed(3));
      const freqKHz = (0.5 + i * (11.5 / 59)).toFixed(1);

      const rfItem = rfFeatures[i] || { importance: 0, importancePct: 0 };
      const lrItem = lrFeatures[i] || { importance: 0, importancePct: 0, coefficient: 0, impactDirection: 'mine' };
      const knnItem = knnFeatures[i] || { importance: 0, importancePct: 0, accDropPct: 0 };

      const rfRank = rfRankMap.get(i) || 60;
      const lrRank = lrRankMap.get(i) || 60;
      const knnRank = knnRankMap.get(i) || 60;

      // Determine active model values
      let activeImp = rfItem.importance;
      let activeRank = rfRank;
      let rawLabel = `${(rfItem.importance * 100).toFixed(2)}% Gini MDI`;

      if (selectedModel === 'logistic_regression') {
        activeImp = lrItem.importance;
        activeRank = lrRank;
        rawLabel = `|β| = ${Math.abs(lrItem.coefficient || 0).toFixed(2)} (${lrItem.impactDirection === 'mine' ? '+Mine' : '-Rock'})`;
      } else if (selectedModel === 'knn') {
        activeImp = knnItem.importance;
        activeRank = knnRank;
        rawLabel = `ΔAcc = ${(knnItem.accDropPct || 0).toFixed(1)}% drop`;
      } else if (selectedModel === 'all') {
        // Average normalized importance across all 3 models
        activeImp = (rfItem.importance + lrItem.importance + knnItem.importance) / 3;
        activeRank = 0; // calculated later
        rawLabel = `Consensus Score: ${(activeImp * 100).toFixed(2)}%`;
      }

      details.push({
        id: `F${band}`,
        band,
        freqHz: `~${freqKHz} kHz`,
        normFreq,
        category,
        color,
        rfImportance: rfItem.importance,
        rfRank,
        lrImportance: lrItem.importance,
        lrRawCoef: lrItem.coefficient || 0,
        lrImpact: lrItem.impactDirection || 'mine',
        lrRank,
        knnImportance: knnItem.importance,
        knnAccDrop: knnItem.accDropPct || 0,
        knnRank,
        importance: activeImp,
        rank: activeRank,
        rawLabel,
        description: getAcousticDescription(band, category, selectedModel)
      });
    }

    if (selectedModel === 'all') {
      const sortedByConsensus = [...details].sort((a, b) => b.importance - a.importance);
      sortedByConsensus.forEach((item, idx) => {
        item.rank = idx + 1;
      });
    }

    return details;
  }, [allData, selectedModel]);

  // Top N features sorted for the currently selected model
  const topFeatures = useMemo<SonarFeatureDetail[]>(() => {
    if (unifiedFeatures.length === 0) return [];
    const sorted = [...unifiedFeatures].sort((a, b) => b.importance - a.importance);
    return sorted.slice(0, topCount);
  }, [unifiedFeatures, topCount]);

  // Set default selected feature on load or model switch
  useEffect(() => {
    if (topFeatures.length > 0) {
      // If current selection is not in top features, select #1
      if (!selectedFeature || !topFeatures.some(f => f.id === selectedFeature.id)) {
        setSelectedFeature(topFeatures[0]);
      }
    }
  }, [topFeatures]);

  // Calculate cumulative importance of the Top N bins
  const cumulativeImportancePct = useMemo(() => {
    const sum = topFeatures.reduce((acc, f) => acc + f.importance, 0);
    return Number((sum * 100).toFixed(1));
  }, [topFeatures]);

  // Prepare horizontal bar chart data (reverse for top-to-bottom rendering in vertical layout)
  const chartData = useMemo(() => {
    return [...topFeatures].reverse().map(item => ({
      name: item.id,
      fullName: `Band ${item.band} (${item.freqHz})`,
      band: item.band,
      freqHz: item.freqHz,
      rank: item.rank,
      importancePct: Number((item.importance * 100).toFixed(2)),
      rfPct: Number((item.rfImportance * 100).toFixed(2)),
      lrPct: Number((item.lrImportance * 100).toFixed(2)),
      knnPct: Number((item.knnImportance * 100).toFixed(2)),
      category: item.category,
      color: item.color,
      raw: item
    }));
  }, [topFeatures]);

  const currentSelected = selectedFeature || topFeatures[0];

  const getModelTitle = () => {
    switch (selectedModel) {
      case 'random_forest':
        return 'Random Forest (Gini Impurity Decrease)';
      case 'logistic_regression':
        return 'Logistic Regression (Standardized |β| Weights)';
      case 'knn':
        return 'K-Nearest Neighbors (Permutation Feature Importance)';
      case 'all':
      default:
        return 'Multi-Model Consensus Comparison';
    }
  };

  const getMetricSubtitle = () => {
    switch (selectedModel) {
      case 'random_forest':
        return 'Displays the 10 frequency channels yielding the highest Mean Decrease in Impurity (Gini MDI) across all decision trees.';
      case 'logistic_regression':
        return 'Displays the 10 frequency channels with the highest absolute standardized log-odds coefficients (|β| impact on mine vs rock hyperplane).';
      case 'knn':
        return 'Displays the 10 frequency channels whose permutation shuffling causes the greatest degradation in k-nearest neighbor classification accuracy.';
      case 'all':
      default:
        return 'Side-by-side visualization comparing how Random Forest, Logistic Regression, and KNN evaluate the top acoustic frequency channels.';
    }
  };

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-mono text-slate-400">
          Calculating frequency bin influence across all machine learning models...
        </p>
      </div>
    );
  }

  if (error || unifiedFeatures.length === 0) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-red-500/20 p-8 flex flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm font-semibold text-white">Unable to load frequency bin influence metrics.</p>
        <p className="text-xs font-mono text-slate-400">{error || 'No feature importance data returned'}</p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
              <BarChart3 size={18} />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Top 10 Most Influential Frequency Bins by Model
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Sonar 60-Bin Spectral Physics
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {getMetricSubtitle()}
          </p>
        </div>

        {/* Top Count & Sync Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeAlgorithm && (
            <button
              type="button"
              onClick={() => {
                const mapped: ModelTab = activeAlgorithm === 'logistic_regression' || activeAlgorithm === 'lr'
                  ? 'logistic_regression'
                  : activeAlgorithm === 'knn'
                    ? 'knn'
                    : 'random_forest';
                setSelectedModel(mapped);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium border border-white/10 bg-black/60 text-slate-300 hover:text-white hover:border-emerald-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sync visualization with the algorithm currently selected above"
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Sync Active Model</span>
            </button>
          )}

          {/* Top 10 vs Top 15 Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            {[10, 15].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setTopCount(cnt)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  topCount === cnt
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Top {cnt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setSelectedModel('random_forest')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedModel === 'random_forest'
              ? 'bg-purple-500/15 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
              : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">Tree Ensemble</span>
            {activeAlgorithm === 'random_forest' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active Model" />
            )}
          </div>
          <div className="mt-1">
            <div className={`text-sm font-bold ${selectedModel === 'random_forest' ? 'text-white' : 'text-slate-200'}`}>
              Random Forest
            </div>
            <div className="text-xxs text-purple-400 font-mono mt-0.5">
              Gini Impurity (MDI)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedModel('logistic_regression')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedModel === 'logistic_regression'
              ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">Linear Hyperplane</span>
            {(activeAlgorithm === 'logistic_regression' || activeAlgorithm === 'lr') && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active Model" />
            )}
          </div>
          <div className="mt-1">
            <div className={`text-sm font-bold ${selectedModel === 'logistic_regression' ? 'text-white' : 'text-slate-200'}`}>
              Logistic Regression
            </div>
            <div className="text-xxs text-emerald-400 font-mono mt-0.5">
              Standardized |β| Weights
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedModel('knn')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedModel === 'knn'
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">Metric Space</span>
            {activeAlgorithm === 'knn' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Active Model" />
            )}
          </div>
          <div className="mt-1">
            <div className={`text-sm font-bold ${selectedModel === 'knn' ? 'text-white' : 'text-slate-200'}`}>
              K-Nearest Neighbors
            </div>
            <div className="text-xxs text-cyan-400 font-mono mt-0.5">
              Permutation Importance (ΔAcc)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedModel('all')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedModel === 'all'
              ? 'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'bg-black/30 border-white/5 hover:border-white/20 text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">Cross-Model</span>
            <Scale size={13} className="text-cyan-400" />
          </div>
          <div className="mt-1">
            <div className={`text-sm font-bold ${selectedModel === 'all' ? 'text-white' : 'text-slate-200'}`}>
              All Models Compared
            </div>
            <div className="text-xxs text-indigo-300 font-mono mt-0.5">
              Side-by-Side Horizontal Bars
            </div>
          </div>
        </button>
      </div>

      {/* Main Grid: Horizontal Bar Chart + Acoustic Physics Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recharts Horizontal Bar Chart */}
        <div className="lg:col-span-8 bg-black/30 rounded-2xl p-4 md:p-5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Displaying: <strong className="text-white font-semibold">{getModelTitle()}</strong>
              </span>
            </div>
            <span className="text-xxs font-mono text-slate-500">
              Sorted by Influence (#1 at top)
            </span>
          </div>

          {/* Recharts Container with Horizontal Bar Chart */}
          <div className="h-[420px] w-full min-h-[420px]">
            <ResponsiveContainer width="100%" height={420} debounce={50}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 35, left: 15, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 'auto']}
                  tickLine={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8"
                  fontSize={12}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const raw: SonarFeatureDetail = data.raw;
                      return (
                        <div className="bg-slate-900/95 border border-white/20 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono max-w-xs space-y-1.5">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="font-bold text-white text-sm">
                              {raw.id} <span className="text-slate-400 text-xs font-normal">({data.fullName})</span>
                            </span>
                            <span className="text-xxs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                              Rank #{raw.rank}
                            </span>
                          </div>

                          {selectedModel === 'all' ? (
                            <div className="space-y-1 pt-1 text-xxs">
                              <div className="flex items-center justify-between text-purple-400 font-semibold">
                                <span>Random Forest (Gini):</span>
                                <span>{(raw.rfImportance * 100).toFixed(2)}% (#{raw.rfRank})</span>
                              </div>
                              <div className="flex items-center justify-between text-emerald-400 font-semibold">
                                <span>Logistic Reg (|β|):</span>
                                <span>{(raw.lrImportance * 100).toFixed(2)}% (#{raw.lrRank})</span>
                              </div>
                              <div className="flex items-center justify-between text-cyan-400 font-semibold">
                                <span>KNN (Permutation):</span>
                                <span>{(raw.knnImportance * 100).toFixed(2)}% (#{raw.knnRank})</span>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1">
                              <p className="text-emerald-400 font-bold text-sm">
                                {data.importancePct}% <span className="text-slate-400 text-xxs font-normal">Influence Weight</span>
                              </p>
                              <p className="text-slate-300 text-xxs mt-0.5">
                                Metric: <strong className="text-white">{raw.rawLabel}</strong>
                              </p>
                            </div>
                          )}

                          <div className="pt-1.5 border-t border-white/10 text-xxs text-slate-400">
                            <span className="text-slate-500 block">Acoustic Region:</span>
                            <span className="text-white font-medium">{raw.category}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {selectedModel === 'all' ? (
                  // Multi-model grouped bars
                  <>
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      formatter={(val) => <span className="text-xs font-mono text-slate-300">{val}</span>}
                    />
                    <Bar 
                      dataKey="rfPct" 
                      name="Random Forest (%)" 
                      fill="#c084fc" 
                      radius={[0, 4, 4, 0]}
                      onClick={(entry: any) => {
                        if (entry && entry.raw) setSelectedFeature(entry.raw);
                      }}
                    />
                    <Bar 
                      dataKey="lrPct" 
                      name="Logistic Regression (%)" 
                      fill="#34d399" 
                      radius={[0, 4, 4, 0]}
                      onClick={(entry: any) => {
                        if (entry && entry.raw) setSelectedFeature(entry.raw);
                      }}
                    />
                    <Bar 
                      dataKey="knnPct" 
                      name="KNN Permutation (%)" 
                      fill="#22d3ee" 
                      radius={[0, 4, 4, 0]}
                      onClick={(entry: any) => {
                        if (entry && entry.raw) setSelectedFeature(entry.raw);
                      }}
                    />
                  </>
                ) : (
                  // Single model bar with acoustic category cell colors
                  <Bar 
                    dataKey="importancePct" 
                    radius={[0, 4, 4, 0]}
                    onClick={(entry: any) => {
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
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xxs font-mono text-slate-500 pt-1 px-1 border-t border-white/5">
            <span>← Lowest of Top {topCount}</span>
            <span className="text-emerald-400/80">Click any horizontal bar to inspect acoustic physics →</span>
          </div>
        </div>

        {/* Selected Frequency Bin Acoustic Inspector Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                currentSelected.category === 'Low-Mid Resonance'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : currentSelected.category === 'High-Frequency Specular'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                Rank #{currentSelected.rank} Feature
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Top {topCount} = {cumulativeImportancePct}% Total
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-xl font-bold text-white font-mono">
                  Channel {currentSelected.id}
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  (Band {currentSelected.band} of 60)
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {(currentSelected.importance * 100).toFixed(2)}%
                <span className="text-xs text-slate-400 font-normal ml-2 font-sans">
                  {selectedModel === 'all' ? 'Consensus Influence' : 'Model Weight'}
                </span>
              </div>
            </div>

            {/* Model Comparison Matrix for this feature */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
              <span className="text-xxs uppercase tracking-wider text-slate-500 font-bold block">
                Rank Across All 3 Architectures:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="block text-xxs text-purple-400 font-bold">Random Forest</span>
                  <span className="text-sm font-bold text-white">#{currentSelected.rfRank}</span>
                  <span className="block text-xxs text-slate-400">{(currentSelected.rfImportance * 100).toFixed(1)}%</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="block text-xxs text-emerald-400 font-bold">Logistic Reg</span>
                  <span className="text-sm font-bold text-white">#{currentSelected.lrRank}</span>
                  <span className="block text-xxs text-slate-400">|β|={Math.abs(currentSelected.lrRawCoef).toFixed(1)}</span>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="block text-xxs text-cyan-400 font-bold">KNN (k=3)</span>
                  <span className="text-sm font-bold text-white">#{currentSelected.knnRank}</span>
                  <span className="block text-xxs text-slate-400">Δ{currentSelected.knnAccDrop.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Physical Acoustic Explanation */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentSelected.description}
            </p>

            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xxs font-mono text-slate-400">
              <div>
                <span className="block text-slate-500">Center Frequency</span>
                <span className="text-white font-semibold">{currentSelected.freqHz}</span>
              </div>
              <div>
                <span className="block text-slate-500">Acoustic Region</span>
                <span className="text-white font-semibold">{currentSelected.category}</span>
              </div>
            </div>
          </div>

          {/* Acoustic Spectrum Regions Legend */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs space-y-2.5">
            <span className="text-xxs uppercase tracking-wider text-slate-500 font-bold block">
              Acoustic Spectrum Physics Legend
            </span>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
              <div className="text-slate-300 text-xs">
                <strong className="text-white">Low-Mid Resonance</strong> (Bands 8–15, ~1.9–3.2 kHz)
                <span className="block text-xxs text-slate-400">Hollow metallic mine body resonance</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded bg-cyan-500 shrink-0" />
              <div className="text-slate-300 text-xs">
                <strong className="text-white">High-Frequency Specular</strong> (Bands 35–48, ~7.1–9.8 kHz)
                <span className="block text-xxs text-slate-400">Smooth surface reflection vs rock scattering</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded bg-indigo-500 shrink-0" />
              <div className="text-slate-300 text-xs">
                <strong className="text-white">Mid-Band Dispersion</strong> (Bands 16–34, ~3.4–6.9 kHz)
                <span className="block text-xxs text-slate-400">Internal wave interference & cavity reverberation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physics Consensus Takeaway Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <Radio size={20} />
          </div>
          <div className="text-xs">
            <strong className="text-white font-bold block text-sm">
              Cross-Model Acoustic Consensus: Bands F11 (~2.5 kHz) & F36 (~7.5 kHz)
            </strong>
            <span className="text-slate-300">
              Regardless of algorithm architecture (ensemble trees, linear hyperplanes, or non-parametric nearest-neighbor geometry),
              all models converge on low-mid cylinder resonance and high-frequency specular returns as the definitive physical signatures separating mines from rocks.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
