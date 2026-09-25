import React from 'react';
import { useAppContext } from '../lib/dataContext';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Database, Activity, Target, Layers } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function Dashboard() {
  const { dataset, loading, metrics, theme } = useAppContext();

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Loading dataset...</div>;
  }

  if (!dataset) {
    return <div className="text-red-500">Failed to load dataset.</div>;
  }

  const rockCount = dataset.labels.filter(l => l === 'R').length;
  const mineCount = dataset.labels.filter(l => l === 'M').length;

  const pieData = {
    labels: ['Rocks', 'Mines'],
    datasets: [
      {
        data: [rockCount, mineCount],
        backgroundColor: [
          'rgba(74, 222, 128, 0.8)', // green-400
          'rgba(34, 211, 238, 0.8)',  // cyan-400
        ],
        borderColor: [
          'rgba(74, 222, 128, 1)',
          'rgba(34, 211, 238, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    color: theme === 'dark' ? '#cbd5e1' : '#334155',
    plugins: {
      legend: {
        labels: { color: theme === 'dark' ? '#cbd5e1' : '#334155' }
      }
    }
  };

  // Calculate average feature values for Rock vs Mine for a bar chart
  const numFeatures = Math.min(10, dataset.features[0].length); // Show first 10 for clarity
  const avgRock = new Array(numFeatures).fill(0);
  const avgMine = new Array(numFeatures).fill(0);

  dataset.features.forEach((feat, idx) => {
    const label = dataset.labels[idx];
    for(let i = 0; i < numFeatures; i++) {
      if (label === 'R') avgRock[i] += feat[i];
      else avgMine[i] += feat[i];
    }
  });

  for(let i = 0; i < numFeatures; i++) {
    avgRock[i] /= rockCount;
    avgMine[i] /= mineCount;
  }

  const barData = {
    labels: Array.from({length: numFeatures}, (_, i) => `Freq ${i+1}`),
    datasets: [
      {
        label: 'Avg Rock',
        data: avgRock,
        backgroundColor: 'rgba(74, 222, 128, 0.6)',
      },
      {
        label: 'Avg Mine',
        data: avgMine,
        backgroundColor: 'rgba(34, 211, 238, 0.6)',
      }
    ]
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: { ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } },
      x: { ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Classification Overview</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Intelligent Sonar Analytics Dashboard</h2>
        </div>
      </header>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-green-400/50 transition-colors">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Records</p>
          <p className="text-3xl font-mono text-white">{dataset.features.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">UCI Sonar Dataset Source</p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-green-400/50 transition-colors">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Features Extracted</p>
          <p className="text-3xl font-mono text-white">{dataset.features[0]?.length || 0}</p>
          <p className="text-[10px] text-cyan-400 mt-1">Numeric Freq Analysis</p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-green-400/50 transition-colors">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Accuracy Score</p>
          <p className="text-3xl font-mono text-green-400">
            {metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : 'Untrained'}
          </p>
          <p className="text-[10px] text-green-600 mt-1">{metrics ? 'Optimized Model' : 'Needs Training'}</p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-green-400/50 transition-colors">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Class Split (R/M)</p>
          <p className="text-2xl font-bold text-white">{rockCount} / {mineCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Dataset Composition</p>
        </div>
      </section>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col items-center hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider self-start flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>Class Distribution
          </h3>
          <div className="w-64 h-64">
            <Pie data={pieData} options={chartOptions} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>Average Intensity by Feature (First 10)
          </h3>
          <div className="flex-1 min-h-[250px] w-full relative">
             <Bar data={barData} options={{...barOptions, maintainAspectRatio: false}} />
          </div>
        </div>
      </div>
    </div>
  );
}
