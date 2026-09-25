import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/dataContext';
import {
  KNN,
  LogisticRegression,
  RandomForest,
  SVM,
  calculateMetrics,
  trainTestSplit,
  DataPoint,
  Label
} from '../lib/ml';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Scale,
  Zap,
  ShieldAlert,
  Award,
  RefreshCw,
  Sliders,
  Check,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ModelBenchmark {
  id: string;
  name: string;
  shortName: string;
  category: string;
  color: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  latencyMs: number;
  modelInstance: any;
}

export function ModelComparison() {
  const { dataset, setTrainedModel, setMetrics } = useAppContext();
  const navigate = useNavigate();

  // Benchmark parameters
  const [testRatio, setTestRatio] = useState<number>(0.25);
  const [lrEpochs, setLrEpochs] = useState<number>(120);
  const [lrRate, setLrRate] = useState<number>(0.08);
  const [knnK, setKnnK] = useState<number>(3);
  const [activeMetricFilter, setActiveMetricFilter] = useState<'all' | 'accuracy' | 'precision' | 'recall'>('all');
  const [deployedModelId, setDeployedModelId] = useState<string | null>(null);
  const [evalTrigger, setEvalTrigger] = useState<number>(0);

  // Train and evaluate all models side by side
  const benchmarkResults = useMemo(() => {
    if (!dataset || dataset.features.length === 0) return null;

    const { X_train, X_test, y_train, y_test } = trainTestSplit(
      dataset.features,
      dataset.labels,
      testRatio
    );

    const models: ModelBenchmark[] = [];

    // 1. Logistic Regression (Primary Baseline)
    const lrStart = performance.now();
    const lrModel = new LogisticRegression();
    lrModel.fit(X_train, y_train, lrEpochs, lrRate);
    const lrPred = lrModel.predict(X_test);
    const lrDuration = performance.now() - lrStart;
    const lrMetrics = calculateMetrics(y_test, lrPred.predictions);

    models.push({
      id: 'lr',
      name: 'Logistic Regression',
      shortName: 'LogReg (LR)',
      category: 'Linear Probabilistic',
      color: '#4ade80', // neon green
      accuracy: lrMetrics.accuracy,
      precision: lrMetrics.precision,
      recall: lrMetrics.recall,
      f1Score: lrMetrics.f1Score,
      specificity: lrMetrics.specificity,
      tp: lrMetrics.tp,
      tn: lrMetrics.tn,
      fp: lrMetrics.fp,
      fn: lrMetrics.fn,
      latencyMs: Number(lrDuration.toFixed(2)),
      modelInstance: lrModel,
    });

    // 2. K-Nearest Neighbors
    const knnStart = performance.now();
    const knnModel = new KNN(knnK);
    knnModel.fit(X_train, y_train);
    const knnPred = knnModel.predict(X_test);
    const knnDuration = performance.now() - knnStart;
    const knnMetrics = calculateMetrics(y_test, knnPred.predictions);

    models.push({
      id: 'knn',
      name: `K-Nearest Neighbors (k=${knnK})`,
      shortName: `KNN (k=${knnK})`,
      category: 'Instance-Based Non-Parametric',
      color: '#22d3ee', // cyan
      accuracy: knnMetrics.accuracy,
      precision: knnMetrics.precision,
      recall: knnMetrics.recall,
      f1Score: knnMetrics.f1Score,
      specificity: knnMetrics.specificity,
      tp: knnMetrics.tp,
      tn: knnMetrics.tn,
      fp: knnMetrics.fp,
      fn: knnMetrics.fn,
      latencyMs: Number(knnDuration.toFixed(2)),
      modelInstance: knnModel,
    });

    // 3. Random Forest (Ensemble)
    const rfStart = performance.now();
    const rfModel = new RandomForest();
    rfModel.fit(X_train, y_train);
    const rfPred = rfModel.predict(X_test);
    const rfDuration = performance.now() - rfStart;
    const rfMetrics = calculateMetrics(y_test, rfPred.predictions);

    models.push({
      id: 'rf',
      name: 'Random Forest Ensemble',
      shortName: 'Random Forest',
      category: 'Multi-Tree Ensemble',
      color: '#c084fc', // purple
      accuracy: rfMetrics.accuracy,
      precision: rfMetrics.precision,
      recall: rfMetrics.recall,
      f1Score: rfMetrics.f1Score,
      specificity: rfMetrics.specificity,
      tp: rfMetrics.tp,
      tn: rfMetrics.tn,
      fp: rfMetrics.fp,
      fn: rfMetrics.fn,
      latencyMs: Number(rfDuration.toFixed(2)),
      modelInstance: rfModel,
    });

    // 4. Support Vector Machine (Linear SGD Hinge)
    const svmStart = performance.now();
    const svmModel = new SVM();
    svmModel.fit(X_train, y_train, 120, 0.02, 0.01);
    const svmPred = svmModel.predict(X_test);
    const svmDuration = performance.now() - svmStart;
    const svmMetrics = calculateMetrics(y_test, svmPred.predictions);

    models.push({
      id: 'svm',
      name: 'Support Vector Machine',
      shortName: 'Linear SVM',
      category: 'Max-Margin Hyperplane',
      color: '#f59e0b', // amber
      accuracy: svmMetrics.accuracy,
      precision: svmMetrics.precision,
      recall: svmMetrics.recall,
      f1Score: svmMetrics.f1Score,
      specificity: svmMetrics.specificity,
      tp: svmMetrics.tp,
      tn: svmMetrics.tn,
      fp: svmMetrics.fp,
      fn: svmMetrics.fn,
      latencyMs: Number(svmDuration.toFixed(2)),
      modelInstance: svmModel,
    });

    return {
      models,
      testCount: X_test.length,
      trainCount: X_train.length,
      lrBaseline: models[0],
    };
  }, [dataset, testRatio, lrEpochs, lrRate, knnK, evalTrigger]);

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[60vh] text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
        <h2 className="text-xl font-bold text-white">Loading Sonar Dataset...</h2>
        <p className="text-slate-400 text-sm">Preparing frequency metrics for benchmark.</p>
      </div>
    );
  }

  const models = benchmarkResults?.models || [];
  const lrBaseline = benchmarkResults?.lrBaseline;

  // Chart 1: Grouped bar chart by Metric
  // Transforms model list into metrics groups: Accuracy, Precision, Recall, F1-Score
  const metricsBarData = [
    {
      metric: 'Accuracy',
      'Logistic Regression': Number(((models.find(m => m.id === 'lr')?.accuracy || 0) * 100).toFixed(1)),
      'KNN': Number(((models.find(m => m.id === 'knn')?.accuracy || 0) * 100).toFixed(1)),
      'Random Forest': Number(((models.find(m => m.id === 'rf')?.accuracy || 0) * 100).toFixed(1)),
      'Linear SVM': Number(((models.find(m => m.id === 'svm')?.accuracy || 0) * 100).toFixed(1)),
    },
    {
      metric: 'Precision (Mine)',
      'Logistic Regression': Number(((models.find(m => m.id === 'lr')?.precision || 0) * 100).toFixed(1)),
      'KNN': Number(((models.find(m => m.id === 'knn')?.precision || 0) * 100).toFixed(1)),
      'Random Forest': Number(((models.find(m => m.id === 'rf')?.precision || 0) * 100).toFixed(1)),
      'Linear SVM': Number(((models.find(m => m.id === 'svm')?.precision || 0) * 100).toFixed(1)),
    },
    {
      metric: 'Recall (Mine)',
      'Logistic Regression': Number(((models.find(m => m.id === 'lr')?.recall || 0) * 100).toFixed(1)),
      'KNN': Number(((models.find(m => m.id === 'knn')?.recall || 0) * 100).toFixed(1)),
      'Random Forest': Number(((models.find(m => m.id === 'rf')?.recall || 0) * 100).toFixed(1)),
      'Linear SVM': Number(((models.find(m => m.id === 'svm')?.recall || 0) * 100).toFixed(1)),
    },
    {
      metric: 'F1-Score',
      'Logistic Regression': Number(((models.find(m => m.id === 'lr')?.f1Score || 0) * 100).toFixed(1)),
      'KNN': Number(((models.find(m => m.id === 'knn')?.f1Score || 0) * 100).toFixed(1)),
      'Random Forest': Number(((models.find(m => m.id === 'rf')?.f1Score || 0) * 100).toFixed(1)),
      'Linear SVM': Number(((models.find(m => m.id === 'svm')?.f1Score || 0) * 100).toFixed(1)),
    },
  ];

  const filteredBarData = activeMetricFilter === 'all'
    ? metricsBarData
    : metricsBarData.filter(d => d.metric.toLowerCase().includes(activeMetricFilter));

  // Chart 2: Radar comparison data
  const radarData = [
    {
      subject: 'Accuracy',
      LR: (models.find(m => m.id === 'lr')?.accuracy || 0) * 100,
      KNN: (models.find(m => m.id === 'knn')?.accuracy || 0) * 100,
      RF: (models.find(m => m.id === 'rf')?.accuracy || 0) * 100,
      SVM: (models.find(m => m.id === 'svm')?.accuracy || 0) * 100,
      fullMark: 100,
    },
    {
      subject: 'Precision',
      LR: (models.find(m => m.id === 'lr')?.precision || 0) * 100,
      KNN: (models.find(m => m.id === 'knn')?.precision || 0) * 100,
      RF: (models.find(m => m.id === 'rf')?.precision || 0) * 100,
      SVM: (models.find(m => m.id === 'svm')?.precision || 0) * 100,
      fullMark: 100,
    },
    {
      subject: 'Recall',
      LR: (models.find(m => m.id === 'lr')?.recall || 0) * 100,
      KNN: (models.find(m => m.id === 'knn')?.recall || 0) * 100,
      RF: (models.find(m => m.id === 'rf')?.recall || 0) * 100,
      SVM: (models.find(m => m.id === 'svm')?.recall || 0) * 100,
      fullMark: 100,
    },
    {
      subject: 'F1-Score',
      LR: (models.find(m => m.id === 'lr')?.f1Score || 0) * 100,
      KNN: (models.find(m => m.id === 'knn')?.f1Score || 0) * 100,
      RF: (models.find(m => m.id === 'rf')?.f1Score || 0) * 100,
      SVM: (models.find(m => m.id === 'svm')?.f1Score || 0) * 100,
      fullMark: 100,
    },
    {
      subject: 'Specificity',
      LR: (models.find(m => m.id === 'lr')?.specificity || 0) * 100,
      KNN: (models.find(m => m.id === 'knn')?.specificity || 0) * 100,
      RF: (models.find(m => m.id === 'rf')?.specificity || 0) * 100,
      SVM: (models.find(m => m.id === 'svm')?.specificity || 0) * 100,
      fullMark: 100,
    },
  ];

  // Chart 3: Detection Error Analysis (False Positives vs False Negatives)
  const errorData = models.map(m => ({
    name: m.shortName,
    'False Positives (Rock classified as Mine)': m.fp,
    'False Negatives (DANGER: Mine classified as Rock)': m.fn,
    'True Positives': m.tp,
    'True Negatives': m.tn,
  }));

  // Best performers
  const bestAcc = [...models].sort((a, b) => b.accuracy - a.accuracy)[0];
  const bestRecall = [...models].sort((a, b) => b.recall - a.recall)[0];
  const bestPrecision = [...models].sort((a, b) => b.precision - a.precision)[0];

  const handleDeploy = (model: ModelBenchmark) => {
    setTrainedModel(model.modelInstance);
    setMetrics({
      accuracy: model.accuracy,
      precision: model.precision,
      recall: model.recall,
      f1Score: model.f1Score,
      confusionMatrix: [
        [model.tn, model.fp],
        [model.fn, model.tp],
      ],
    });
    setDeployedModelId(model.id);
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-500 pb-16">
      {/* Top Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400 uppercase tracking-wider">
          <Scale size={14} />
          <span>Algorithm Benchmark Matrix</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Logistic Regression vs. <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Alternative Classifiers</span>
        </h1>
        <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed">
          Evaluate side-by-side performance metrics—Accuracy, Precision, and Recall—between Logistic Regression and competing Sonar classification architectures on unseen test samples.
        </p>
      </header>

      {/* Top Highlight Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Logistic Regression Baseline Card */}
        <div className="bg-black/40 backdrop-blur-md border border-green-500/40 p-5 rounded-3xl relative overflow-hidden shadow-[0_0_20px_rgba(74,222,128,0.1)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">Baseline Focus</span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
          </div>
          <p className="text-lg font-bold text-white">Logistic Regression</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Accuracy:</span>
              <span className="font-mono text-green-400 font-bold">{((lrBaseline?.accuracy || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Precision:</span>
              <span className="font-mono text-cyan-400 font-bold">{((lrBaseline?.precision || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Recall:</span>
              <span className="font-mono text-white font-bold">{((lrBaseline?.recall || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Highest Accuracy */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-cyan-400/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Top Accuracy</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-lg font-bold text-white truncate">{bestAcc?.name}</p>
          <p className="text-3xl font-mono text-cyan-400 font-bold mt-2">
            {((bestAcc?.accuracy || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {bestAcc?.id === 'lr' ? 'Baseline holds top rank' : `${(((bestAcc?.accuracy || 0) - (lrBaseline?.accuracy || 0)) * 100).toFixed(1)}% vs Logistic Regression`}
          </p>
        </div>

        {/* Highest Recall (Crucial for Defense) */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-purple-400/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Top Mine Recall</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-lg font-bold text-white truncate">{bestRecall?.name}</p>
          <p className="text-3xl font-mono text-purple-400 font-bold mt-2">
            {((bestRecall?.recall || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Minimizes lethal false negatives
          </p>
        </div>

        {/* Highest Precision */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Top Precision</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white truncate">{bestPrecision?.name}</p>
          <p className="text-3xl font-mono text-amber-400 font-bold mt-2">
            {((bestPrecision?.precision || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Reduces false mine alerts on rocks
          </p>
        </div>
      </section>

      {/* Benchmark Controls Toolbar */}
      <section className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-green-400" />
            <span className="font-bold text-white text-sm uppercase tracking-wider">Benchmark Test Parameters</span>
            <span className="text-xs text-slate-500 ml-2">
              ({benchmarkResults?.trainCount} Train / {benchmarkResults?.testCount} Test samples)
            </span>
          </div>

          <button
            onClick={() => setEvalTrigger(prev => prev + 1)}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={14} />
            <span>Re-evaluate Models</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Test Split Ratio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Test Split Size</label>
            <div className="flex gap-1.5">
              {[0.2, 0.25, 0.3, 0.35].map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setTestRatio(ratio)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                    testRatio === ratio
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-black/40 text-slate-400 border border-white/5 hover:bg-white/5'
                  }`}
                >
                  {(ratio * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>

          {/* LR Epochs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LR Training Epochs</label>
            <select
              value={lrEpochs}
              onChange={e => setLrEpochs(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-400 transition-colors"
            >
              <option value={60}>60 Epochs (Fast)</option>
              <option value={120}>120 Epochs (Balanced)</option>
              <option value={200}>200 Epochs (Converged)</option>
            </select>
          </div>

          {/* LR Learning Rate */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">LR Learning Rate (η)</label>
            <select
              value={lrRate}
              onChange={e => setLrRate(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-400 transition-colors"
            >
              <option value={0.03}>0.03 (Conservative)</option>
              <option value={0.08}>0.08 (Optimal)</option>
              <option value={0.15}>0.15 (Aggressive)</option>
            </select>
          </div>

          {/* KNN Neighbors */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">KNN Neighbors (k)</label>
            <select
              value={knnK}
              onChange={e => setKnnK(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-400 transition-colors"
            >
              <option value={1}>k = 1</option>
              <option value={3}>k = 3 (Default)</option>
              <option value={5}>k = 5</option>
              <option value={7}>k = 7</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Recharts Section: Grouped Bar Chart */}
      <section className="bg-black/40 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              Side-by-Side Metric Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Percentage scores across Accuracy, Precision, Recall, and F1-Score rendered with Recharts
            </p>
          </div>

          {/* Metric filter buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All 4 Metrics' },
              { id: 'accuracy', label: 'Accuracy' },
              { id: 'precision', label: 'Precision' },
              { id: 'recall', label: 'Recall' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMetricFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  activeMetricFilter === tab.id
                    ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-black shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                    : 'bg-black/40 text-slate-300 border border-white/10 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Responsive Bar Container */}
        <div className="w-full h-80 md:h-96 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredBarData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              barGap={6}
              barCategoryGap={18}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
              <XAxis
                dataKey="metric"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl space-y-2 min-w-[220px]">
                        <p className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-1">
                          {label}
                        </p>
                        <div className="space-y-1.5 pt-1">
                          {payload.map((entry, index) => {
                            const val = Number(entry.value);
                            const lrVal = Number(payload.find(p => p.name === 'Logistic Regression')?.value || 0);
                            const diff = entry.name !== 'Logistic Regression' ? val - lrVal : 0;
                            return (
                              <div key={`item-${index}`} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-white font-bold">{val.toFixed(1)}%</span>
                                  {entry.name !== 'Logistic Regression' && (
                                    <span
                                      className={`text-[10px] ${
                                        diff >= 0 ? 'text-green-400' : 'text-rose-400'
                                      }`}
                                    >
                                      ({diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '15px' }}
                formatter={(value) => <span className="text-slate-300 text-xs font-semibold px-2">{value}</span>}
              />
              <Bar dataKey="Logistic Regression" fill="#4ade80" radius={[6, 6, 0, 0]} />
              <Bar dataKey="KNN" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Random Forest" fill="#c084fc" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Linear SVM" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Two-Column Deep Dive: Radar Multi-Metric & Error Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <section className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-4 flex flex-col">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Multi-Metric Trade-off Polygon
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Radar visualization contrasting Logistic Regression against alternative decision frontiers
            </p>
          </div>

          <div className="w-full h-80 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.15)" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#94a3b8"
                  tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  stroke="rgba(255, 255, 255, 0.3)"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Radar
                  name="Logistic Regression"
                  dataKey="LR"
                  stroke="#4ade80"
                  fill="#4ade80"
                  fillOpacity={0.35}
                />
                <Radar
                  name="KNN"
                  dataKey="KNN"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.15}
                />
                <Radar
                  name="Random Forest"
                  dataKey="RF"
                  stroke="#c084fc"
                  fill="#c084fc"
                  fillOpacity={0.15}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white border-b border-white/10 pb-1">
                            {payload[0]?.payload?.subject}
                          </p>
                          {payload.map((p, i) => (
                            <div key={i} className="flex justify-between gap-4">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-mono text-white font-bold">{Number(p.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-slate-300 text-xs font-semibold px-1">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Tactical Risk Analysis (False Positives vs False Negatives) */}
        <section className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-4 flex flex-col">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Naval Operational Error Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Missed Mines (False Negatives) vs. False Alarms (False Positives) on test samples
            </p>
          </div>

          <div className="w-full h-80 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={errorData}
                margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3.5 rounded-xl shadow-xl space-y-1.5 text-xs">
                          <p className="font-bold text-white border-b border-white/10 pb-1">{label}</p>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span style={{ color: entry.color }}>{entry.name}:</span>
                              <span className="font-mono font-bold text-white">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-slate-300 text-xs font-semibold px-1">{value}</span>}
                />
                <Bar dataKey="False Negatives (DANGER: Mine classified as Rock)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="False Positives (Rock classified as Mine)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Comprehensive Detailed Matrix Table */}
      <section className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden space-y-4">
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-green-400" />
              Detailed Classification Scorecard
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select any benchmarked model to immediately activate it for live sonar inference in the Predict portal
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-black/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Model Architecture</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Accuracy</th>
                <th className="px-6 py-4 font-bold">Precision (Mine)</th>
                <th className="px-6 py-4 font-bold">Recall (Mine)</th>
                <th className="px-6 py-4 font-bold">F1-Score</th>
                <th className="px-6 py-4 font-bold">Latency</th>
                <th className="px-6 py-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {models.map(m => {
                const isLR = m.id === 'lr';
                const isDeployed = deployedModelId === m.id;
                const accDiff = isLR ? 0 : m.accuracy - (lrBaseline?.accuracy || 0);

                return (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: m.color }}
                        />
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            {isLR && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 uppercase font-extrabold">
                                Baseline
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">{m.shortName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{m.category}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-white">{(m.accuracy * 100).toFixed(1)}%</span>
                        {!isLR && (
                          <span
                            className={`text-[10px] ${
                              accDiff >= 0 ? 'text-green-400' : 'text-rose-400'
                            }`}
                          >
                            {accDiff >= 0 ? `+${(accDiff * 100).toFixed(1)}%` : `${(accDiff * 100).toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-cyan-400">
                      {(m.precision * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-purple-400">
                      {(m.recall * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 font-mono text-white">
                      {(m.f1Score * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {m.latencyMs} ms
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeploy(m)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                          isDeployed
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                            : 'bg-black/50 hover:bg-white/10 text-white border border-white/10 hover:border-white/30'
                        }`}
                      >
                        {isDeployed ? (
                          <>
                            <Check size={13} />
                            <span>Active in Predict</span>
                          </>
                        ) : (
                          <>
                            <span>Deploy</span>
                            <ArrowRight size={13} />
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
      </section>

      {/* Naval Defense Tactical Insight Panel */}
      <section className="bg-black/40 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 text-cyan-400">
          <Info size={22} />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Naval Defense Analysis: Logistic Regression vs. Alternative Classifiers
          </h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed pt-2">
          <div className="space-y-2 p-4 rounded-2xl bg-black/30 border border-white/5">
            <p className="font-bold text-green-400 text-sm">Logistic Regression Merits</p>
            <p>
              Provides smooth sigmoid posterior probabilities $P(Mine|X)$, enabling adjustable decision thresholds.
              In high-stakes waters, operators can lower the classification threshold from 0.50 to 0.35 to maximize Mine Recall.
            </p>
          </div>
          <div className="space-y-2 p-4 rounded-2xl bg-black/30 border border-white/5">
            <p className="font-bold text-cyan-400 text-sm">KNN & Ensemble Dynamics</p>
            <p>
              K-Nearest Neighbors excels at capturing localized non-linear clusters in the 60-band frequency spectrum,
              while Random Forest ensembles mitigate individual sensor noise across acoustic sonar return angles.
            </p>
          </div>
          <div className="space-y-2 p-4 rounded-2xl bg-black/30 border border-white/5">
            <p className="font-bold text-amber-400 text-sm">Operational Safety Priority</p>
            <p>
              In mine countermeasure missions, <strong className="text-white">False Negatives</strong> (mines classified as rocks)
              threaten surface vessels. Models with superior Recall should be prioritized during clearance phases.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
