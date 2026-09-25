import React from 'react';
import { useAppContext } from '../lib/dataContext';
import { Bar } from 'react-chartjs-2';
import { ShieldAlert, AlertCircle, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Performance() {
  const { metrics, theme } = useAppContext();

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in">
        <ShieldAlert className="w-16 h-16 text-slate-300 dark:text-slate-600" />
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">Model Not Trained</h2>
        <p className="text-slate-500">Please train a model first to view performance metrics, or browse the multi-model comparison.</p>
        <Link
          to="/model-comparison"
          className="px-6 py-2.5 bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(74,222,128,0.25)]"
        >
          <Scale size={16} />
          <span>Open Model Comparison</span>
        </Link>
      </div>
    );
  }

  const { accuracy, precision, recall, f1Score, confusionMatrix } = metrics;
  
  // confusionMatrix: [[tn, fp], [fn, tp]] where Pos=Mine, Neg=Rock
  const tn = confusionMatrix[0][0]; // True Rock
  const fp = confusionMatrix[0][1]; // False Mine (Predicted Mine, Actually Rock)
  const fn = confusionMatrix[1][0]; // False Rock (Predicted Rock, Actually Mine)
  const tp = confusionMatrix[1][1]; // True Mine

  const metricsData = {
    labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
    datasets: [
      {
        label: 'Score',
        data: [accuracy, precision, recall, f1Score],
        backgroundColor: [
          'rgba(20, 184, 166, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
      }
    ]
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Analytics</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Model Performance</h2>
        </div>
        <Link
          to="/model-comparison"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(74,222,128,0.25)] self-start sm:self-auto"
        >
          <Scale size={15} />
          <span>Compare All Models</span>
        </Link>
      </header>

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

      <div className="grid md:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400"></span>Confusion Matrix
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
    </div>
  );
}
