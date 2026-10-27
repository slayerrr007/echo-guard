import React from 'react';
import { useAppContext } from '../lib/dataContext';
import { useAuth } from '../lib/authContext';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  Lock,
  LogOut,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  KeyRound,
  RefreshCw,
  Crosshair,
  Scale,
} from 'lucide-react';
import { evaluateModels } from '../services/api';
import { projectId } from '../lib/firebase';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function Dashboard() {
  const { dataset, loading, metrics, setMetrics, selectedModel, theme } = useAppContext();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!metrics) {
      evaluateModels()
        .then((res) => {
          if (res?.models) {
            const active = res.models[selectedModel] || res.models.random_forest;
            if (active) setMetrics(active);
          }
        })
        .catch(() => {});
    }
  }, [metrics, selectedModel, setMetrics]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-3 text-slate-400 font-mono text-xs">
        <RefreshCw className="w-8 h-8 text-green-400 animate-spin" />
        <span>Verifying Firebase Authentication state...</span>
      </div>
    );
  }

  // Protected Dashboard Gate: Requires an authenticated Firebase user while keeping public routes accessible
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 w-full min-h-[70vh]">
        <div className="w-full max-w-lg bg-black/65 backdrop-blur-xl border border-green-500/35 p-8 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.15)] space-y-6 text-center">
          <div className="w-16 h-16 bg-green-500/15 border border-green-400/40 rounded-2xl flex items-center justify-center mx-auto text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
            <Lock size={30} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-green-400 font-bold">
              Protected Operator Route
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Authentication Required for Dashboard
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              The Echo-Guard Operator Dashboard is a protected view that displays personalized session telemetry and dataset analytics. Public pages (such as <strong>Predict</strong>, <strong>Dataset</strong>, and <strong>Compare Models</strong>) remain accessible at any time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/login"
              className="flex-1 py-3 px-5 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 font-mono text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
            >
              <KeyRound size={15} />
              <span>Sign In / Register</span>
            </Link>
            <Link
              to="/predict"
              className="flex-1 py-3 px-5 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>Public ML Predictor</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading dataset...
      </div>
    );
  }

  if (!dataset) {
    return <div className="text-red-500">Failed to load dataset.</div>;
  }

  const rockCount = dataset.labels.filter((l) => l === 'R').length;
  const mineCount = dataset.labels.filter((l) => l === 'M').length;

  const pieData = {
    labels: ['Rocks', 'Mines'],
    datasets: [
      {
        data: [rockCount, mineCount],
        backgroundColor: ['rgba(74, 222, 128, 0.8)', 'rgba(34, 211, 238, 0.8)'],
        borderColor: ['rgba(74, 222, 128, 1)', 'rgba(34, 211, 238, 1)'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    color: theme === 'dark' ? '#cbd5e1' : '#334155',
    plugins: {
      legend: {
        labels: { color: theme === 'dark' ? '#cbd5e1' : '#334155' },
      },
    },
  };

  const numFeatures = Math.min(10, dataset.features[0].length);
  const avgRock = new Array(numFeatures).fill(0);
  const avgMine = new Array(numFeatures).fill(0);

  dataset.features.forEach((feat, idx) => {
    const label = dataset.labels[idx];
    for (let i = 0; i < numFeatures; i++) {
      if (label === 'R') avgRock[i] += feat[i];
      else avgMine[i] += feat[i];
    }
  });

  for (let i = 0; i < numFeatures; i++) {
    avgRock[i] /= rockCount;
    avgMine[i] /= mineCount;
  }

  const barData = {
    labels: Array.from({ length: numFeatures }, (_, i) => `Freq ${i + 1}`),
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
      },
    ],
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: { ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } },
      x: { ticks: { color: theme === 'dark' ? '#cbd5e1' : '#334155' } },
    },
  };

  const providerId =
    user.providerData?.[0]?.providerId || (user.isAnonymous ? 'anonymous' : 'password');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-mono uppercase tracking-wider text-green-400">
            Protected Operator Workspace
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Intelligent Sonar Analytics Dashboard
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/predict"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Crosshair size={14} />
            <span>Run Live Prediction</span>
          </Link>
          <Link
            to="/model-comparison"
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Scale size={14} className="text-cyan-400" />
            <span>Compare Models</span>
          </Link>
        </div>
      </header>

      {/* Authenticated Firebase Operator Status Banner */}
      <section className="bg-black/55 backdrop-blur-xl border border-green-500/35 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_0_25px_rgba(16,185,129,0.1)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <UserCheck size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-white">
                {user.isAnonymous ? 'Anonymous Guest Operator' : user.email}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                <ShieldCheck size={11} />
                <span>
                  {user.isAnonymous
                    ? 'Authenticated · Guest'
                    : user.emailVerified
                    ? 'Authenticated · Email Verified'
                    : 'Authenticated · Active Session'}
                </span>
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Project: {projectId}</span>
              <span>·</span>
              <span>Provider: {providerId}</span>
              <span>·</span>
              <span>UID: {user.uid.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-200 transition-colors"
          >
            Account Details
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-mono text-rose-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

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
          <p className="text-[10px] text-green-600 mt-1">
            {metrics ? 'Optimized Model' : 'Needs Training'}
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-green-400/50 transition-colors">
          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Class Split (R/M)</p>
          <p className="text-2xl font-bold text-white">
            {rockCount} / {mineCount}
          </p>
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
            <Bar data={barData} options={{ ...barOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
}
