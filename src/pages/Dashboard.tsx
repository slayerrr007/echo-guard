import React, { useState } from 'react';
import { useAppContext } from '../lib/dataContext';
import { useAuth } from '../lib/authContext';
import { Link } from 'react-router-dom';
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
import { Database, Activity, Target, Layers, Mail, AlertTriangle, Send, RefreshCw, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export function Dashboard() {
  const { dataset, loading, metrics, theme } = useAppContext();
  const { user, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Requirement 5: Do not allow an unverified account to access the normal authenticated dashboard.
  if (user && !user.isAnonymous && !user.emailVerified) {
    const handleResend = async () => {
      setResending(true);
      setErrorMsg(null);
      setStatusMsg(null);
      try {
        await sendVerificationEmail();
        setStatusMsg('Verification email dispatched! Please check your inbox and spam folder.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to resend verification email.');
      } finally {
        setResending(false);
      }
    };

    const handleCheck = async () => {
      setChecking(true);
      setErrorMsg(null);
      setStatusMsg(null);
      try {
        const refreshed = await reloadUser();
        if (refreshed?.emailVerified) {
          setStatusMsg('Email confirmed! Loading dashboard...');
        } else {
          setErrorMsg('Email has not been verified yet. Please click the link sent to your email.');
        }
      } catch (err: any) {
        setErrorMsg('Error checking verification status.');
      } finally {
        setChecking(false);
      }
    };

    return (
      <div className="flex-1 flex items-center justify-center p-4 w-full min-h-[70vh]">
        <div className="w-full max-w-lg bg-black/50 backdrop-blur-md border border-amber-500/30 p-8 rounded-3xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <Mail size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Email Verification Required
            </h2>
            <p className="text-slate-400 text-sm">
              Access to the Echo-Guard operational dashboard is restricted until your operator email address has been verified.
            </p>
          </div>

          <div className="bg-black/60 p-4 rounded-2xl border border-white/10 text-left space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Registered Operator</div>
            <div className="text-white font-mono text-sm font-semibold">{user.email}</div>
            <div className="text-amber-400/90 text-xs font-mono pt-1 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>Pending email link verification</span>
            </div>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              {statusMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-cyan-400 text-black font-mono text-xs font-bold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              <span>{checking ? 'Checking Firebase...' : "I've Verified (Refresh Dashboard)"}</span>
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/30 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} className={resending ? 'animate-pulse' : ''} />
              <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>

            <div className="flex gap-2 pt-2 border-t border-white/10 mt-2">
              <Link
                to="/predict"
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Launch Predictor</span>
                <ArrowRight size={13} />
              </Link>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/10 font-mono text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
