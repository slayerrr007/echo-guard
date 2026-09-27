import React, { useEffect, useState, useMemo } from 'react';
import { 
  Download, 
  Trash2, 
  History as HistoryIcon, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Gauge, 
  AlertTriangle, 
  Filter, 
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

interface HistoryItem {
  timestamp: string;
  result: string;
  confidence: number;
  pRock?: number;
  pMine?: number;
  model?: string;
  inputs: number[];
}

export function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'area' | 'dual'>('area');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = localStorage.getItem('predictHistory');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setHistory(parsed.reverse()); // newest first for table display
        }
      } catch (err) {
        console.error('Failed to parse history:', err);
      }
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all prediction history?')) {
      localStorage.removeItem('predictHistory');
      setHistory([]);
    }
  };

  const seedSampleHistory = () => {
    const sampleModels = ['random_forest', 'knn', 'logistic_regression'];
    const now = Date.now();
    const demoItems: HistoryItem[] = Array.from({ length: 14 }, (_, i) => {
      const isRock = (i % 3 === 0 || i % 4 === 0);
      // Realistic variance between 70% and 98%
      const conf = Number((0.71 + (Math.sin(i) * 0.12 + 0.14)).toFixed(4));
      const clampedConf = Math.min(0.985, Math.max(0.68, conf));
      const model = sampleModels[i % sampleModels.length];
      const pRock = isRock ? clampedConf : Number((1 - clampedConf).toFixed(4));
      const pMine = isRock ? Number((1 - clampedConf).toFixed(4)) : clampedConf;

      return {
        timestamp: new Date(now - (14 - i) * 240000).toISOString(),
        result: isRock ? 'ROCK' : 'MINE',
        confidence: clampedConf,
        pRock,
        pMine,
        model,
        inputs: Array.from({ length: 60 }, () => Number((Math.random() * 0.8 + 0.05).toFixed(4))),
      };
    });

    localStorage.setItem('predictHistory', JSON.stringify(demoItems));
    setHistory([...demoItems].reverse());
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    
    // Create CSV header
    const headers = ['Timestamp', 'Model', 'Prediction', 'Confidence', 'P(Mine)', 'P(Rock)'];
    for (let i = 1; i <= 60; i++) headers.push(`F${i}`);
    
    const rows = history.map(item => {
      const pMine = item.pMine !== undefined ? item.pMine.toFixed(4) : (item.result === 'MINE' ? item.confidence.toFixed(4) : (1 - item.confidence).toFixed(4));
      const pRock = item.pRock !== undefined ? item.pRock.toFixed(4) : (item.result === 'ROCK' ? item.confidence.toFixed(4) : (1 - item.confidence).toFixed(4));
      return [
        new Date(item.timestamp).toLocaleString(),
        item.model || 'Unknown',
        item.result,
        item.confidence.toFixed(4),
        pMine,
        pRock,
        ...item.inputs
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `echo_guard_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModelLabel = (model?: string) => {
    switch (model) {
      case 'knn':
        return 'KNN';
      case 'logistic_regression':
        return 'Logistic Reg.';
      case 'random_forest':
        return 'Random Forest';
      default:
        return model || 'ML Model';
    }
  };

  // Filtered and chronological dataset for the Recharts plot (oldest to newest)
  const chartData = useMemo(() => {
    const rawChronological = [...history].reverse();

    const filtered = rawChronological.filter(item => {
      if (modelFilter !== 'all' && item.model !== modelFilter) return false;
      if (classFilter !== 'all' && item.result !== classFilter) return false;
      return true;
    });

    return filtered.map((item, index) => {
      const date = new Date(item.timestamp);
      const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const confPct = Number((item.confidence * 100).toFixed(1));
      const pMinePct = item.pMine !== undefined 
        ? Number((item.pMine * 100).toFixed(1))
        : (item.result === 'MINE' ? confPct : Number(((1 - item.confidence) * 100).toFixed(1)));
      const pRockPct = item.pRock !== undefined
        ? Number((item.pRock * 100).toFixed(1))
        : (item.result === 'ROCK' ? confPct : Number(((1 - item.confidence) * 100).toFixed(1)));

      return {
        index: index + 1,
        pingLabel: `#${index + 1}`,
        timeFormatted,
        timestamp: item.timestamp,
        confidencePct: confPct,
        confidenceDecimal: item.confidence,
        prediction: item.result,
        model: item.model || 'model',
        modelLabel: getModelLabel(item.model),
        pMinePct,
        pRockPct,
      };
    });
  }, [history, modelFilter, classFilter]);

  // Performance KPI statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { avgConf: 0, highCertaintyPct: 0, rockCount: 0, mineCount: 0, trendSlope: 0 };
    }
    const totalConf = chartData.reduce((acc, curr) => acc + curr.confidencePct, 0);
    const avgConf = totalConf / chartData.length;
    const highCertaintyCount = chartData.filter(d => d.confidencePct >= 85).length;
    const highCertaintyPct = (highCertaintyCount / chartData.length) * 100;
    const rockCount = chartData.filter(d => d.prediction === 'ROCK').length;
    const mineCount = chartData.filter(d => d.prediction === 'MINE').length;

    // Approximate trend slope between first half and second half
    let trendSlope = 0;
    if (chartData.length >= 4) {
      const mid = Math.floor(chartData.length / 2);
      const firstHalfAvg = chartData.slice(0, mid).reduce((a, b) => a + b.confidencePct, 0) / mid;
      const secondHalfAvg = chartData.slice(mid).reduce((a, b) => a + b.confidencePct, 0) / (chartData.length - mid);
      trendSlope = secondHalfAvg - firstHalfAvg;
    }

    return {
      avgConf: Number(avgConf.toFixed(1)),
      highCertaintyPct: Number(highCertaintyPct.toFixed(1)),
      rockCount,
      mineCount,
      trendSlope: Number(trendSlope.toFixed(1)),
    };
  }, [chartData]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isRock = data.prediction === 'ROCK';

      return (
        <div className="bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-xl border border-white/10 shadow-2xl text-xs space-y-2 font-sans z-50 min-w-56 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
            <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Ping {data.pingLabel} &bull; {data.timeFormatted}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
              isRock
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              {data.prediction}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Confidence Score:</span>
              <span className="font-bold text-white font-mono text-sm">
                {data.confidencePct}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Evaluated Model:</span>
              <span className="text-emerald-300 font-semibold">{data.modelLabel}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Certainty Level:</span>
              <span className={`font-semibold ${
                data.confidencePct >= 85 ? 'text-emerald-400' : data.confidencePct >= 70 ? 'text-cyan-400' : 'text-amber-400'
              }`}>
                {data.confidencePct >= 85 ? 'High (≥85%)' : data.confidencePct >= 70 ? 'Moderate (70-84%)' : 'Borderline (<70%)'}
              </span>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-rose-300">P(Mine): {data.pMinePct}%</span>
              <span className="text-emerald-300">P(Rock): {data.pRockPct}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot rendering color-coded by prediction (Rock = emerald, Mine = cyan)
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (cx === undefined || cy === undefined) return null;
    const isRock = payload.prediction === 'ROCK';

    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4.5}
        fill={isRock ? '#10b981' : '#06b6d4'}
        stroke="#020617"
        strokeWidth={2}
      />
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <header className="flex flex-col">
          <span className="text-sm text-slate-500">Inference Telemetry</span>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-green-400" />
            Prediction History & Trends
          </h2>
        </header>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {history.length === 0 && (
            <button
              onClick={seedSampleHistory}
              className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 hover:from-green-500/30 hover:to-cyan-500/30 text-green-300 border border-green-500/30 rounded-full font-medium text-xs transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(74,222,128,0.15)] cursor-pointer"
            >
              <Sparkles size={14} className="text-green-400" />
              Load Sample Trends
            </button>
          )}

          <button 
            onClick={exportCSV}
            disabled={history.length === 0}
            className="px-4 py-2 bg-black/40 hover:bg-white/5 text-white rounded-full font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 border border-white/10 cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button 
            onClick={clearHistory}
            disabled={history.length === 0}
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors disabled:opacity-50 border border-transparent hover:border-rose-500/20 cursor-pointer"
            title="Clear History"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        /* Empty State with Demo Seed Prompt */
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-12 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <HistoryIcon className="w-8 h-8 text-green-400 opacity-80" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-white">No Prediction History Recorded Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Run classifications on the <strong className="text-white">Predict</strong> page to plot confidence trends over time, or populate demonstration signals to inspect the Recharts performance visualizer.
            </p>
          </div>
          <button
            onClick={seedSampleHistory}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.25)] cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Generate Sample Prediction Data</span>
          </button>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Avg Confidence */}
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge size={13} className="text-green-400" />
                Avg Confidence
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{stats.avgConf}%</span>
                <span className="text-[11px] text-emerald-400">
                  {stats.avgConf >= 85 ? 'High Tier' : 'Moderate'}
                </span>
              </div>
            </div>

            {/* High Certainty Ratio */}
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" />
                Decisive Pings (≥85%)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">{stats.highCertaintyPct}%</span>
                <span className="text-[11px] text-slate-400">of total</span>
              </div>
            </div>

            {/* Trend Direction */}
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-cyan-400" />
                Performance Drift
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${stats.trendSlope >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.trendSlope >= 0 ? `+${stats.trendSlope}%` : `${stats.trendSlope}%`}
                </span>
                <span className="text-[11px] text-slate-400">recent trend</span>
              </div>
            </div>

            {/* Class Ratio */}
            <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers size={13} className="text-purple-400" />
                Pings Evaluated
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{chartData.length}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({stats.rockCount}R / {stats.mineCount}M)
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Trend Visualizer Panel */}
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-5">
            {/* Chart Toolbar: Filters & Modes */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Model Confidence & Certainty Trends Over Time
                </h3>
                <p className="text-xs text-slate-400">
                  Track confidence scores and decision margins across consecutive sonar pings.
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Chart Mode Toggle */}
                <div className="inline-flex rounded-xl p-0.5 bg-black/60 border border-white/10 text-xs">
                  <button
                    onClick={() => setChartMode('area')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      chartMode === 'area'
                        ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Certainty Curve
                  </button>
                  <button
                    onClick={() => setChartMode('dual')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      chartMode === 'dual'
                        ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-black font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    P(Mine) vs P(Rock)
                  </button>
                </div>

                {/* Model Filter */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter size={13} />
                  <select
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    className="bg-black/60 text-white rounded-lg px-2.5 py-1 border border-white/10 text-xs focus:border-green-400 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Models</option>
                    <option value="random_forest">Random Forest</option>
                    <option value="knn">KNN</option>
                    <option value="logistic_regression">Logistic Regression</option>
                  </select>
                </div>

                {/* Class Filter */}
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-black/60 text-white rounded-lg px-2.5 py-1 border border-white/10 text-xs focus:border-green-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  <option value="ROCK">Rocks Only</option>
                  <option value="MINE">Mines Only</option>
                </select>
              </div>
            </div>

            {/* Recharts Chart Container */}
            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="pingLabel" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[50, 100]} 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Reference threshold lines */}
                    <ReferenceLine 
                      y={85} 
                      stroke="#10b981" 
                      strokeDasharray="4 4" 
                      strokeOpacity={0.7}
                      label={{ value: 'High Certainty (85%)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }}
                    />
                    <ReferenceLine 
                      y={70} 
                      stroke="#06b6d4" 
                      strokeDasharray="4 4" 
                      strokeOpacity={0.5}
                      label={{ value: 'Moderate (70%)', fill: '#06b6d4', fontSize: 10, position: 'insideBottomRight' }}
                    />

                    <Area
                      type="monotone"
                      dataKey="confidencePct"
                      name="Confidence Score"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#confidenceGradient)"
                      dot={renderCustomDot}
                      activeDot={{ r: 7, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="pingLabel" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      formatter={(val) => <span className="text-xs text-slate-300 font-mono">{val}</span>} 
                    />
                    
                    <ReferenceLine 
                      y={50} 
                      stroke="#94a3b8" 
                      strokeDasharray="3 3" 
                      strokeOpacity={0.5}
                      label={{ value: 'Equilibrium (50%)', fill: '#94a3b8', fontSize: 10, position: 'insideTopLeft' }}
                    />

                    <Line
                      type="monotone"
                      dataKey="pMinePct"
                      name="P(Mine) %"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#f43f5e', stroke: '#020617', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#fb7185', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pRockPct"
                      name="P(Rock) %"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10b981', stroke: '#020617', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Chart Legend / Footnote */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-slate-400 font-mono border-t border-white/5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Rock Predictions ({stats.rockCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  Mine Predictions ({stats.mineCount})
                </span>
              </div>
              <div className="text-slate-500">
                Thresholds: High &ge; 85% &bull; Moderate 70-84% &bull; Borderline &lt; 70%
              </div>
            </div>
          </div>

          {/* Historical Data Table */}
          <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
            <div className="p-4 sm:px-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Recent Logged Predictions</span>
                <span className="text-xs text-slate-500 font-mono font-normal">({history.length} records)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Model</th>
                    <th className="px-6 py-4 font-bold">Prediction</th>
                    <th className="px-6 py-4 font-bold">Confidence Score</th>
                    <th className="px-6 py-4 font-bold">Certainty Tier</th>
                    <th className="px-6 py-4 font-bold">Probabilities P(M) / P(R)</th>
                    <th className="px-6 py-4 font-bold">F1-F3 Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((item, idx) => {
                    const confPct = (item.confidence * 100).toFixed(1);
                    const pMinePct = item.pMine !== undefined 
                      ? (item.pMine * 100).toFixed(1) 
                      : (item.result === 'MINE' ? confPct : ((1 - item.confidence) * 100).toFixed(1));
                    const pRockPct = item.pRock !== undefined 
                      ? (item.pRock * 100).toFixed(1) 
                      : (item.result === 'ROCK' ? confPct : ((1 - item.confidence) * 100).toFixed(1));
                    const isHigh = item.confidence >= 0.85;
                    const isMod = item.confidence >= 0.70 && item.confidence < 0.85;

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-3.5 text-slate-300 font-mono text-xs">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>

                        <td className="px-6 py-3.5 text-slate-300 text-xs font-medium">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] text-slate-300 font-mono">
                            {getModelLabel(item.model)}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            item.result === 'ROCK' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}>
                            {item.result}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white font-bold text-xs">{confPct}%</span>
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isHigh ? 'bg-emerald-400' : isMod ? 'bg-cyan-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-3.5">
                          <span className={`text-[11px] font-medium ${
                            isHigh ? 'text-emerald-400' : isMod ? 'text-cyan-400' : 'text-amber-400'
                          }`}>
                            {isHigh ? 'High' : isMod ? 'Moderate' : 'Borderline'}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">
                          <span className="text-rose-300">{pMinePct}%</span> / <span className="text-emerald-300">{pRockPct}%</span>
                        </td>

                        <td className="px-6 py-3.5 text-slate-500 tabular-nums font-mono text-xs">
                          {item.inputs && item.inputs.length >= 3 ? (
                            `[${item.inputs[0].toFixed(3)}, ${item.inputs[1].toFixed(3)}, ${item.inputs[2].toFixed(3)}...]`
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
