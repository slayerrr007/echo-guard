import React, { useState, useEffect } from 'react';
import { useAppContext } from '../lib/dataContext';
import { Bar } from 'react-chartjs-2';
import { ShieldAlert, AlertCircle, Scale, RefreshCw, CheckCircle2, Zap, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { evaluateModels, ValidModelName, ModelMetrics } from '../services/api';
import { LiveModelLatencyMonitor } from '../components/charts/LiveModelLatencyMonitor';
import { D3ConfusionMatrixHeatmap } from '../components/charts/D3ConfusionMatrixHeatmap';

export function Performance() {
  const { metrics, setMetrics, theme, selectedModel, setSelectedModel } = useAppContext();
  const [activeModel, setActiveModel] = useState<ValidModelName>(selectedModel || 'random_forest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendMetrics, setBackendMetrics] = useState<Record<string, ModelMetrics> | null>(null);

  // Fetch real evaluation metrics from Flask backend
  const loadEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluateModels();
      if (data && data.models) {
        setBackendMetrics(data.models);
        const currentData = data.models[activeModel] || data.models.random_forest;
        if (currentData) {
          setMetrics(currentData);
        }
      }
    } catch (err: any) {
      console.error('Error fetching evaluation from Flask backend:', err);
      setError(err.message || 'Unable to retrieve evaluation metrics from Flask backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluation();
  }, []);

  const handleModelChange = (model: ValidModelName) => {
    setActiveModel(model);
    setSelectedModel(model);
    if (backendMetrics && backendMetrics[model]) {
      setMetrics(backendMetrics[model]);
    }
  };

  // Determine active metrics
  const activeData: ModelMetrics | null = 
    backendMetrics?.[activeModel] || 
    (metrics && metrics.confusionMatrix ? metrics : null);

  // If still loading or activeData is missing, display loading or error states
  if (loading || !activeData) {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in text-center px-4">
          <ShieldAlert className="w-16 h-16 text-rose-500" />
          <h2 className="text-2xl font-semibold text-white">Evaluation Service Unavailable</h2>
          <p className="text-sm text-slate-400 max-w-md">Unable to load evaluation metrics from backend.</p>
          <p className="text-xs font-mono text-slate-500">{error}</p>
          <button
            onClick={loadEvaluation}
            className="px-6 py-2.5 bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(74,222,128,0.25)] cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Retry Backend Evaluation</span>
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in">
        <RefreshCw className="w-12 h-12 text-green-400 animate-spin" />
        <h2 className="text-xl font-semibold text-white">Loading evaluation metrics...</h2>
        <p className="text-xs text-slate-400">Evaluating trained scikit-learn models against test partition on Flask backend.</p>
      </div>
    );
  }

  const accuracy = activeData.accuracy;
  const precision = activeData.precision;
  const recall = activeData.recall;
  const f1Score = activeData.f1Score ?? activeData.f1_score ?? 0;
  const specificity = activeData.specificity ?? 0;
  const rocAuc = activeData.roc_auc ?? null;
  const latencyMs = activeData.latency_ms ?? 0;

  const confusionMatrix = activeData.confusionMatrix || activeData.confusion_matrix || [[0, 0], [0, 0]];
  const tn = confusionMatrix[0][0]; // True Rock
  const fp = confusionMatrix[0][1]; // False Mine
  const fn = confusionMatrix[1][0]; // False Rock
  const tp = confusionMatrix[1][1]; // True Mine

  const metricsData = {
    labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'Specificity'],
    datasets: [
      {
        label: 'Score',
        data: [accuracy, precision, recall, f1Score, specificity],
        backgroundColor: [
          'rgba(20, 184, 166, 0.85)',
          'rgba(59, 130, 246, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(16, 185, 129, 0.85)'
        ],
      }
    ]
  };

  const modelLabels: Record<ValidModelName, string> = {
    random_forest: 'Random Forest (Ensemble)',
    knn: 'K-Nearest Neighbors (KNN)',
    logistic_regression: 'Logistic Regression'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-green-400 font-bold">
              • scikit-learn Backend Verified
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Model Performance Analytics</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadEvaluation}
            disabled={loading}
            className="p-2 rounded-full bg-black/40 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Refresh Evaluation from Flask"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-green-400' : ''} />
          </button>
          <Link
            to="/model-comparison"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(74,222,128,0.25)] self-start sm:self-auto"
          >
            <Scale size={15} />
            <span>Compare All Models</span>
          </Link>
        </div>
      </header>

      {/* Model Selection Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
        {(['random_forest', 'knn', 'logistic_regression'] as ValidModelName[]).map((mKey) => {
          const isActive = activeModel === mKey;
          return (
            <button
              key={mKey}
              onClick={() => handleModelChange(mKey)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {modelLabels[mKey]}
            </button>
          );
        })}
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Accuracy', value: accuracy, color: 'text-green-400' },
          { label: 'Precision', value: precision, color: 'text-cyan-400' },
          { label: 'Recall', value: recall, color: 'text-purple-400' },
          { label: 'F1-Score', value: f1Score, color: 'text-amber-400' }
        ].map((m) => (
          <div key={m.label} className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center hover:border-green-400/50 transition-colors">
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">{m.label}</p>
            <p className={`text-3xl font-mono ${m.color}`}>{(m.value * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-slate-400">Specificity (True Negative Rate)</span>
          <span className="text-lg font-mono font-bold text-emerald-400">{(specificity * 100).toFixed(1)}%</span>
        </div>
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-slate-400">ROC-AUC Score</span>
          <span className="text-lg font-mono font-bold text-cyan-400">
            {rocAuc !== null ? rocAuc.toFixed(4) : 'N/A'}
          </span>
        </div>
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-slate-400">Inference Latency</span>
          <span className="text-lg font-mono font-bold text-amber-400">{latencyMs.toFixed(2)} ms</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400"></span>Confusion Matrix ({modelLabels[activeModel]})
          </h3>
          
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {/* Header */}
            <div></div>
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pred: Rock</div>
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pred: Mine</div>
            
            {/* Row 1 */}
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-end pr-2">Act: Rock</div>
            <div className="bg-green-500/10 p-4 rounded-xl flex flex-col justify-center border border-green-500/20">
              <span className="text-2xl font-bold text-green-400">{tn}</span>
              <span className="text-[10px] uppercase text-green-500">True Negative</span>
            </div>
            <div className="bg-cyan-500/10 p-4 rounded-xl flex flex-col justify-center border border-cyan-500/20">
              <span className="text-2xl font-bold text-cyan-400">{fp}</span>
              <span className="text-[10px] uppercase text-cyan-500">False Positive</span>
            </div>
            
            {/* Row 2 */}
            <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-end pr-2">Act: Mine</div>
            <div className="bg-cyan-500/10 p-4 rounded-xl flex flex-col justify-center border border-cyan-500/20">
              <span className="text-2xl font-bold text-cyan-400">{fn}</span>
              <span className="text-[10px] uppercase text-cyan-500">False Negative</span>
            </div>
            <div className="bg-green-500/10 p-4 rounded-xl flex flex-col justify-center border border-green-500/20">
              <span className="text-2xl font-bold text-green-400">{tp}</span>
              <span className="text-[10px] uppercase text-green-500">True Positive</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-black/50 rounded-xl text-xs text-slate-400 flex gap-3 border border-white/10">
            <AlertCircle className="shrink-0 text-slate-500" size={16} />
            <p>
              The matrix highlights the model's ability to distinguish Rocks (Negatives) from Mines (Positives). False Negatives (Mines predicted as Rocks) represent the highest risk scenario in naval operations.
            </p>
          </div>
        </div>

        {/* Metrics Chart */}
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex flex-col hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400"></span>Evaluation Summary
          </h3>
          <div className="flex-1 min-h-[250px]">
            <Bar 
              data={metricsData} 
              options={{
                maintainAspectRatio: false,
                color: theme === 'dark' ? '#cbd5e1' : '#334155',
                plugins: { legend: { display: false } },
                scales: {
                  y: { 
                    beginAtZero: true, 
                    max: 1, 
                    ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' },
                    grid: { color: theme === 'dark' ? '#334155' : '#e2e8f0' }
                  },
                  x: { 
                    ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' },
                    grid: { display: false }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Interactive D3.js Confusion Matrix Heatmap Section */}
      <D3ConfusionMatrixHeatmap
        confusionMatrix={confusionMatrix}
        modelName={modelLabels[activeModel]}
        accuracy={accuracy}
        precision={precision}
        recall={recall}
        f1Score={f1Score}
      />

      {/* Real-time Inference Latency Telemetry Monitor */}
      <LiveModelLatencyMonitor
        highlightedModelId={activeModel}
        onSelectModel={(id) => handleModelChange(id as ValidModelName)}
      />
    </div>
  );
}
