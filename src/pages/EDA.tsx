import React from 'react';
import { useAppContext } from '../lib/dataContext';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  CategoryScale,
  BarElement
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, CategoryScale, BarElement);

export function EDA() {
  const { dataset, theme } = useAppContext();
  if (!dataset) return null;

  const chartOptions = {
    color: theme === 'dark' ? '#cbd5e1' : '#334155',
    plugins: { legend: { labels: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } } },
    scales: {
      x: { grid: { color: theme === 'dark' ? '#334155' : '#e2e8f0' }, ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } },
      y: { grid: { color: theme === 'dark' ? '#334155' : '#e2e8f0' }, ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } }
    }
  };

  // Histogram of a specific feature (e.g. Feature 11 which often shows separation)
  const featIdx = 10;
  const bins = 20;
  const rockVals = dataset.features.filter((_, i) => dataset.labels[i] === 'R').map(f => f[featIdx]);
  const mineVals = dataset.features.filter((_, i) => dataset.labels[i] === 'M').map(f => f[featIdx]);
  
  const minVal = Math.min(...dataset.features.map(f => f[featIdx]));
  const maxVal = Math.max(...dataset.features.map(f => f[featIdx]));
  const binWidth = (maxVal - minVal) / bins;

  const binnedRock = new Array(bins).fill(0);
  const binnedMine = new Array(bins).fill(0);
  const binLabels = new Array(bins).fill(0).map((_, i) => (minVal + i * binWidth).toFixed(2));

  rockVals.forEach(v => {
    const bin = Math.min(Math.floor((v - minVal) / binWidth), bins - 1);
    binnedRock[bin]++;
  });
  mineVals.forEach(v => {
    const bin = Math.min(Math.floor((v - minVal) / binWidth), bins - 1);
    binnedMine[bin]++;
  });

  const histogramData = {
    labels: binLabels,
    datasets: [
      { label: 'Rock', data: binnedRock, backgroundColor: 'rgba(74, 222, 128, 0.6)' },
      { label: 'Mine', data: binnedMine, backgroundColor: 'rgba(34, 211, 238, 0.6)' }
    ]
  };

  // Scatter plot F1 vs F11
  const scatterData = {
    datasets: [
      {
        label: 'Rock',
        data: rockVals.map((v, i) => ({ x: dataset.features.filter((_, j) => dataset.labels[j] === 'R')[i][0], y: v })),
        backgroundColor: 'rgba(74, 222, 128, 0.8)',
      },
      {
        label: 'Mine',
        data: mineVals.map((v, i) => ({ x: dataset.features.filter((_, j) => dataset.labels[j] === 'M')[i][0], y: v })),
        backgroundColor: 'rgba(34, 211, 238, 0.8)',
      }
    ]
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Analytics</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Exploratory Data Analysis</h2>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>Feature 11 Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest">Comparing frequency distributions of Rocks vs Mines for Feature 11, which shows high variance.</p>
          <div className="h-72">
            <Bar data={histogramData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>Feature 1 vs Feature 11
          </h3>
          <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest">Scatter plot visualizing potential linear separability between classes.</p>
          <div className="h-72">
            <Scatter data={scatterData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}
