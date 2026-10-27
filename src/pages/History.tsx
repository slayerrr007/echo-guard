import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Layers,
  Database,
  Lock,
  RefreshCw,
  AlertCircle,
  Crosshair,
  UserCheck,
  CheckCircle2,
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
  ReferenceLine,
} from 'recharts';
import { useAuth } from '../lib/authContext';
import { isFirebaseConfigured, projectId } from '../lib/firebase';
import {
  FirestorePredictionRecord,
  subscribeToUserPredictionHistory,
  deletePredictionFromFirestore,
  deleteAllUserPredictionsFromFirestore,
  parseFirestoreErrorMessage,
  PREDICTION_HISTORY_COLLECTION,
} from '../services/predictionHistoryService';

export function History() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<FirestorePredictionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<unknown | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [modelFilter, setModelFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'area' | 'dual'>('area');

  useEffect(() => {
    if (authLoading) return;

    if (!isFirebaseConfigured) {
      setLoading(false);
      setFirestoreError(new Error('Firebase Cloud Firestore is not configured.'));
      return;
    }

    if (!user) {
      setRecords([]);
      setLoading(false);
      setFirestoreError(null);
      return;
    }

    setLoading(true);
    setFirestoreError(null);

    const unsubscribe = subscribeToUserPredictionHistory(
      user.uid,
      (fetchedRecords) => {
        setRecords(fetchedRecords);
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        setFirestoreError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, authLoading]);

  const handleDeleteRecord = async (recordId: string) => {
    setDeletingId(recordId);
    setFirestoreError(null);
    setActionFeedback(null);
    try {
      await deletePredictionFromFirestore(recordId);
      setActionFeedback(`Deleted record ${recordId.slice(0, 8)}... from Cloud Firestore.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setFirestoreError(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllRecords = async () => {
    if (!user) return;
    setIsClearingAll(true);
    setFirestoreError(null);
    setActionFeedback(null);
    try {
      const count = await deleteAllUserPredictionsFromFirestore(user.uid);
      setConfirmClearAll(false);
      setActionFeedback(`Deleted ${count} record(s) from your personal Firestore history.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setFirestoreError(err);
    } finally {
      setIsClearingAll(false);
    }
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

  // Filtered table records (newest first)
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      if (modelFilter !== 'all' && item.selectedModel !== modelFilter) return false;
      if (classFilter !== 'all' && item.predictedClass.toUpperCase() !== classFilter) return false;
      return true;
    });
  }, [records, modelFilter, classFilter]);

  // Chronological dataset for Recharts (oldest to newest, only records with verified confidence)
  const chartData = useMemo(() => {
    const chronological = [...filteredRecords].reverse();

    return chronological
      .filter((item) => typeof item.confidence === 'number')
      .map((item, index) => {
        const date = item.createdAt || new Date();
        const timeFormatted = item.createdAt
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : 'Pending';
        const confVal = item.confidence as number;
        const confPct = Number((confVal * 100).toFixed(1));
        const isRock = item.predictedClass === 'Rock';
        const pMinePct =
          typeof item.mineProbability === 'number'
            ? Number((item.mineProbability * 100).toFixed(1))
            : !isRock
            ? confPct
            : Number(((1 - confVal) * 100).toFixed(1));
        const pRockPct =
          typeof item.rockProbability === 'number'
            ? Number((item.rockProbability * 100).toFixed(1))
            : isRock
            ? confPct
            : Number(((1 - confVal) * 100).toFixed(1));

        return {
          id: item.id,
          index: index + 1,
          pingLabel: `#${index + 1}`,
          timeFormatted,
          timestamp: item.createdAtIso || '',
          confidencePct: confPct,
          confidenceDecimal: confVal,
          prediction: item.predictedClass.toUpperCase(),
          model: item.selectedModel,
          modelLabel: getModelLabel(item.selectedModel),
          pMinePct,
          pRockPct,
        };
      });
  }, [filteredRecords]);

  // Summary statistics computed strictly from real Firestore records
  const stats = useMemo(() => {
    const totalCount = filteredRecords.length;
    const rockCount = filteredRecords.filter((r) => r.predictedClass === 'Rock').length;
    const mineCount = filteredRecords.filter((r) => r.predictedClass === 'Mine').length;

    if (chartData.length === 0) {
      return {
        totalCount,
        avgConf: null as number | null,
        highCertaintyPct: null as number | null,
        rockCount,
        mineCount,
      };
    }

    const totalConf = chartData.reduce((acc, curr) => acc + curr.confidencePct, 0);
    const avgConf = totalConf / chartData.length;
    const highCertaintyCount = chartData.filter((d) => d.confidencePct >= 85).length;
    const highCertaintyPct = (highCertaintyCount / chartData.length) * 100;

    return {
      totalCount,
      avgConf: Number(avgConf.toFixed(1)),
      highCertaintyPct: Number(highCertaintyPct.toFixed(1)),
      rockCount,
      mineCount,
    };
  }, [filteredRecords, chartData]);

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'Document_ID',
      'User_UID',
      'Timestamp_ISO',
      'Selected_Model',
      'Predicted_Class',
      'Predicted_Code',
      'Confidence',
      'Rock_Probability',
      'Mine_Probability',
    ];

    const rows = filteredRecords.map((item) => [
      item.id,
      item.userId,
      item.createdAtIso || 'Pending',
      item.selectedModel,
      item.predictedClass,
      item.predictedCode,
      typeof item.confidence === 'number' ? item.confidence.toFixed(4) : '',
      typeof item.rockProbability === 'number' ? item.rockProbability.toFixed(4) : '',
      typeof item.mineProbability === 'number' ? item.mineProbability.toFixed(4) : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `echo_guard_firestore_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isRock = data.prediction === 'ROCK';

      return (
        <div className="bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-xl border border-white/10 shadow-2xl text-xs space-y-2 font-sans z-50 min-w-56">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
            <span className="font-mono text-slate-400 text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Record {data.pingLabel} &bull; {data.timeFormatted}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                isRock
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {data.prediction}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Verified Confidence:</span>
              <span className="font-bold text-white font-mono text-sm">{data.confidencePct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Selected Model:</span>
              <span className="text-emerald-300 font-semibold">{data.modelLabel}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const parsedError = firestoreError ? parseFirestoreErrorMessage(firestoreError) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <header className="flex flex-col">
          <div className="flex items-center gap-2 text-xs font-mono text-green-400 mb-1">
            <Database size={13} />
            <span>Cloud Firestore Collection: /{PREDICTION_HISTORY_COLLECTION}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Personal Prediction History
          </h1>
        </header>

        {user && records.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-black/40 border border-white/10 hover:bg-white/5 text-white rounded-full font-medium transition-colors flex items-center gap-2 text-xs cursor-pointer"
            >
              <Download size={14} className="text-green-400" />
              Export CSV ({filteredRecords.length})
            </button>

            {confirmClearAll ? (
              <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 px-3 py-1.5 rounded-full">
                <span className="text-xs text-red-200 font-medium">Delete all {records.length}?</span>
                <button
                  onClick={handleClearAllRecords}
                  disabled={isClearingAll}
                  className="px-2.5 py-1 bg-red-500 hover:bg-red-400 text-black font-bold rounded-full text-xs cursor-pointer disabled:opacity-50"
                >
                  {isClearingAll ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  disabled={isClearingAll}
                  className="px-2 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearAll(true)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full font-medium transition-colors flex items-center gap-2 text-xs cursor-pointer"
              >
                <Trash2 size={14} />
                Delete All My Records
              </button>
            )}
          </div>
        )}
      </div>

      {/* Authenticated Owner Status Banner */}
      {user && (
        <div className="bg-black/40 backdrop-blur-md border border-green-500/20 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <UserCheck size={16} className="text-green-400 shrink-0" />
            <span className="text-slate-300">
              Showing personal records owned by{' '}
              <strong className="text-white font-mono">{user.email}</strong>
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
            UID: <span className="text-green-400">{user.uid}</span>
          </span>
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[11px] text-emerald-400 hover:text-emerald-200 uppercase font-mono cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Diagnostic Banner (Configuration or Security Rules) */}
      {parsedError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-red-200 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-red-100">{parsedError.title}</h2>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300">
                  No Fake Data Used
                </span>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed">{parsedError.message}</p>

              {parsedError.setupInstructions && parsedError.setupInstructions.length > 0 && (
                <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-2 font-mono text-xs text-slate-300 mt-2">
                  <p className="text-green-400 font-bold">Required Cloud Firestore Setup:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                    {parsedError.setupInstructions.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Auth Loading State */}
      {authLoading ? (
        <div className="bg-black/40 backdrop-blur-md p-16 rounded-3xl border border-white/10 text-center space-y-4">
          <RefreshCw size={36} className="mx-auto text-green-400 animate-spin" />
          <p className="text-sm text-slate-300 font-mono">
            Verifying Firebase Authentication session...
          </p>
        </div>
      ) : !user ? (
        /* 2. Unauthenticated Gate — Require Sign-In */
        <div className="bg-black/40 backdrop-blur-md p-12 rounded-3xl border border-green-500/20 text-center space-y-5 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto text-green-400">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Sign In Required for Personal History</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Personal prediction history is stored securely in Firebase Cloud Firestore (
              <code className="text-green-400">/{PREDICTION_HISTORY_COLLECTION}</code>) and isolated strictly to your authenticated UID. Sign in to view or manage your saved sonar classifications.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Lock size={16} />
              Sign In / Create Account
            </Link>
            <Link
              to="/predict"
              className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <Crosshair size={16} className="text-green-400" />
              Go to Predict
            </Link>
          </div>
        </div>
      ) : loading ? (
        /* 3. Firestore Query Loading State */
        <div className="bg-black/40 backdrop-blur-md p-16 rounded-3xl border border-white/10 text-center space-y-4">
          <RefreshCw size={36} className="mx-auto text-green-400 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Loading Personal Prediction History from Cloud Firestore...
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Querying /{PREDICTION_HISTORY_COLLECTION} where userId == "{user.uid}"
            </p>
          </div>
        </div>
      ) : records.length === 0 ? (
        /* 4. Empty State (Strictly No Fake Data Generator) */
        <div className="bg-black/40 backdrop-blur-md p-14 rounded-3xl border border-white/10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
            <HistoryIcon size={34} />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-white">No Saved Predictions in Cloud Firestore</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your personal Cloud Firestore history is currently empty. Run a live classification against the Flask{' '}
              <code className="text-green-400">/predict</code> API on the Predict page and click{' '}
              <strong className="text-slate-200">"Save Prediction to Cloud History"</strong> to store verified results.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              to="/predict"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.25)]"
            >
              <Crosshair size={16} />
              Run a Sonar Classification
            </Link>
          </div>
        </div>
      ) : (
        /* 5. Populated State: KPIs, Recharts Trend Plot, and Table with Per-Record Delete */
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Saved Records</span>
                <Database size={16} className="text-green-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono tabular-nums">
                  {stats.totalCount}
                </span>
                <span className="text-xs text-slate-400">in Firestore</span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Mean Confidence</span>
                <Gauge size={16} className="text-cyan-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono tabular-nums">
                  {stats.avgConf !== null ? `${stats.avgConf}%` : 'N/A'}
                </span>
                <span className="text-xs text-slate-400">verified backend</span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>High Certainty (&ge;85%)</span>
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-400 font-mono tabular-nums">
                  {stats.highCertaintyPct !== null ? `${stats.highCertaintyPct}%` : 'N/A'}
                </span>
                <span className="text-xs text-slate-400">of saved pings</span>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Class Split</span>
                <Layers size={16} className="text-green-400" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-green-400 font-bold">ROCK: {stats.rockCount}</span>
                <span className="text-cyan-400 font-bold">MINE: {stats.mineCount}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
                <Filter size={13} className="text-green-400" />
                <span className="font-semibold uppercase tracking-wider">Model:</span>
              </div>
              {[
                { id: 'all', label: 'All Models' },
                { id: 'random_forest', label: 'Random Forest' },
                { id: 'knn', label: 'KNN' },
                { id: 'logistic_regression', label: 'Logistic Reg.' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelFilter(m.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    modelFilter === m.id
                      ? 'bg-green-500/20 text-green-300 border-green-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All Classes' },
                { id: 'ROCK', label: 'Rock Only' },
                { id: 'MINE', label: 'Mine Only' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClassFilter(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                    classFilter === c.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Trend Visualization (Only shown if records have backend confidence) */}
          {chartData.length > 0 && (
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-green-400" />
                    Verified Confidence Trajectory
                  </h2>
                  <p className="text-xs text-slate-400">
                    Plotted strictly from your personal Cloud Firestore prediction history.
                  </p>
                </div>

                <div className="flex items-center bg-black/60 p-1 rounded-full border border-white/10 self-start">
                  <button
                    onClick={() => setChartMode('area')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      chartMode === 'area'
                        ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Confidence Curve
                  </button>
                  <button
                    onClick={() => setChartMode('dual')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      chartMode === 'dual'
                        ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    P(Mine) vs P(Rock)
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="confAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ade80" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="pingLabel"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        domain={[40, 100]}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" />
                      <Area
                        type="monotone"
                        dataKey="confidencePct"
                        stroke="#4ade80"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#confAreaGrad)"
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="pingLabel"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="pMinePct"
                        name="P(Mine)"
                        stroke="#fb7185"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="pRockPct"
                        name="P(Rock)"
                        stroke="#34d399"
                        strokeWidth={2}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Firestore Prediction History Table */}
          <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-green-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Saved Prediction Records ({filteredRecords.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Project: <span className="text-green-400">{projectId}</span>
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No prediction records match the active filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Model</th>
                      <th className="p-4">Predicted Class</th>
                      <th className="p-4">Confidence</th>
                      <th className="p-4">P(Mine) / P(Rock)</th>
                      <th className="p-4">Firestore Doc ID</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredRecords.map((item) => {
                      const isRock = item.predictedClass === 'Rock';
                      const hasConf = typeof item.confidence === 'number';
                      const confPct = hasConf ? (item.confidence! * 100).toFixed(1) : null;

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 text-slate-300 whitespace-nowrap font-mono">
                            {item.createdAt
                              ? item.createdAt.toLocaleString()
                              : 'Syncing timestamp...'}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                              {getModelLabel(item.selectedModel)}
                            </span>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isRock
                                  ? 'bg-green-500/10 text-green-400 border-green-500/25'
                                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                              }`}
                            >
                              {item.predictedClass} ({item.predictedCode})
                            </span>
                          </td>

                          <td className="p-4 whitespace-nowrap font-mono">
                            {confPct !== null ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      Number(confPct) >= 85
                                        ? 'bg-emerald-400'
                                        : Number(confPct) >= 70
                                        ? 'bg-cyan-400'
                                        : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Number(confPct))}%` }}
                                  />
                                </div>
                                <span className="font-bold text-white">{confPct}%</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Not returned</span>
                            )}
                          </td>

                          <td className="p-4 whitespace-nowrap font-mono text-[11px]">
                            {typeof item.mineProbability === 'number' ||
                            typeof item.rockProbability === 'number' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-rose-400">
                                  M:{' '}
                                  {typeof item.mineProbability === 'number'
                                    ? `${(item.mineProbability * 100).toFixed(1)}%`
                                    : '—'}
                                </span>
                                <span className="text-slate-600">/</span>
                                <span className="text-emerald-400">
                                  R:{' '}
                                  {typeof item.rockProbability === 'number'
                                    ? `${(item.rockProbability * 100).toFixed(1)}%`
                                    : '—'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>

                          <td className="p-4 font-mono text-[11px] text-slate-500">
                            {item.id.slice(0, 10)}...
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(item.id)}
                              disabled={deletingId === item.id}
                              className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/25 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete this prediction record from Cloud Firestore"
                            >
                              {deletingId === item.id ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
