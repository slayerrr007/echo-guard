import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../lib/dataContext';
import { Dumbbell, CheckCircle, AlertCircle, Settings, Scale, Crosshair, Activity, Sparkles, RefreshCw, BookOpen, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ConfusionMatrixHeatmap, ConfusionMatrixData } from '../components/charts/ConfusionMatrixHeatmap';
import { FeatureImportanceChart } from '../components/charts/FeatureImportanceChart';
import { trainModel, evaluateModels, ValidModelName } from '../services/api';

export function Train() {
  const { dataset, setMetrics, metrics, setTrainedModel, setSelectedModel, selectedModel } = useAppContext();
  const [training, setTraining] = useState(false);
  const [algorithm, setAlgorithm] = useState<string>(selectedModel || 'knn');
  const [kValue, setKValue] = useState(3);
  const [complete, setComplete] = useState(false);
  const [liveEvaluated, setLiveEvaluated] = useState(false);
  const [trainDurationMs, setTrainDurationMs] = useState<number | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [benchmarkMatrices, setBenchmarkMatrices] = useState<Record<string, ConfusionMatrixData>>({});
  const [loadingBenchmark, setLoadingBenchmark] = useState(true);
  const navigate = useNavigate();

  // Load real scikit-learn evaluation metrics on mount from Flask backend
  useEffect(() => {
    setLoadingBenchmark(true);
    evaluateModels()
      .then((res) => {
        if (res && res.models) {
          const updated: Record<string, ConfusionMatrixData> = {};
          if (res.models.random_forest) {
            updated.random_forest = {
              tn: res.models.random_forest.tn,
              fp: res.models.random_forest.fp,
              fn: res.models.random_forest.fn,
              tp: res.models.random_forest.tp,
            };
          }
          if (res.models.knn) {
            updated.knn = {
              tn: res.models.knn.tn,
              fp: res.models.knn.fp,
              fn: res.models.knn.fn,
              tp: res.models.knn.tp,
            };
          }
          if (res.models.logistic_regression) {
            updated.logistic_regression = {
              tn: res.models.logistic_regression.tn,
              fp: res.models.logistic_regression.fp,
              fn: res.models.logistic_regression.fn,
              tp: res.models.logistic_regression.tp,
            };
          }
          setBenchmarkMatrices(updated);
        }
      })
      .catch((err) => {
        console.warn('Backend evaluation preload notice:', err);
      })
      .finally(() => {
        setLoadingBenchmark(false);
      });
  }, []);

  const handleAlgorithmChange = (val: string) => {
    setAlgorithm(val);
    setLiveEvaluated(false);
    setTrainError(null);
    if (val === 'knn') setSelectedModel('knn');
    else if (val === 'logistic_regression' || val === 'lr') setSelectedModel('logistic_regression');
    else if (val === 'random_forest' || val === 'rf') setSelectedModel('random_forest');
  };

  const handleTrain = async () => {
    setTraining(true);
    setComplete(false);
    setTrainError(null);

    const normModel: ValidModelName = 
      algorithm === 'logistic_regression' || algorithm === 'lr' 
        ? 'logistic_regression' 
        : algorithm === 'random_forest' || algorithm === 'rf' 
          ? 'random_forest' 
          : 'knn';

    try {
      const params = normModel === 'knn' ? { kValue } : {};
      const res = await trainModel(normModel, params);
      
      const modelResult = res.results?.[normModel];
      if (!modelResult) {
        throw new Error(`Model '${normModel}' training result missing from backend response.`);
      }

      setMetrics({
        accuracy: modelResult.accuracy,
        precision: modelResult.precision,
        recall: modelResult.recall,
        f1Score: modelResult.f1Score || modelResult.f1_score,
        specificity: modelResult.specificity,
        confusionMatrix: modelResult.confusionMatrix || modelResult.confusion_matrix,
        rocAuc: modelResult.roc_auc,
        model: normModel,
        tp: modelResult.tp,
        tn: modelResult.tn,
        fp: modelResult.fp,
        fn: modelResult.fn,
      });

      setTrainedModel({
        name: normModel,
        type: 'scikit-learn',
        savedFile: modelResult.file_saved,
      });
      setSelectedModel(normModel);

      if (typeof modelResult.train_duration_ms === 'number') {
        setTrainDurationMs(modelResult.train_duration_ms);
      }

      setComplete(true);
      setLiveEvaluated(true);
    } catch (err: any) {
      console.error('Training error:', err);
      setTrainError(err.message || 'Failed to train model via Flask scikit-learn backend.');
    } finally {
      setTraining(false);
    }
  };

  const getModelLabel = (algo: string) => {
    switch (algo) {
      case 'knn':
        return 'K-Nearest Neighbors (KNN)';
      case 'logistic_regression':
      case 'lr':
        return 'Logistic Regression';
      case 'random_forest':
      case 'rf':
        return 'Random Forest';
      default:
        return algo;
    }
  };

  // Active matrix: use live calculated metrics from Flask if trained, otherwise backend benchmark
  const activeMatrix: ConfusionMatrixData | null = useMemo(() => {
    if (liveEvaluated && metrics && metrics.confusionMatrix) {
      return {
        tn: metrics.confusionMatrix[0][0],
        fp: metrics.confusionMatrix[0][1],
        fn: metrics.confusionMatrix[1][0],
        tp: metrics.confusionMatrix[1][1],
      };
    }
    const key = algorithm === 'lr' ? 'logistic_regression' : algorithm === 'rf' ? 'random_forest' : algorithm;
    return benchmarkMatrices[key] || null;
  }, [liveEvaluated, metrics, algorithm, benchmarkMatrices]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Model Pipeline</span>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Model Training & Evaluation
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/documentation"
            className="px-4 py-1.5 rounded-full bg-black/40 text-slate-300 hover:text-white font-medium text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <BookOpen size={14} className="text-emerald-400" />
            <span>Mathematical Theory & Docs</span>
          </Link>
          <Link
            to="/model-comparison"
            className="px-4 py-1.5 rounded-full bg-black/40 text-slate-300 hover:text-white font-medium text-xs border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Scale size={14} className="text-cyan-400" />
            <span>Benchmark Comparison</span>
          </Link>
        </div>
      </header>

      {/* Model Configuration Form */}
      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400"></span>Model Configuration
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Dataset: 208 Sonar Signatures
            </span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-400">Algorithm</label>
              <select 
                value={algorithm}
                onChange={(e) => handleAlgorithmChange(e.target.value)}
                className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-2.5 text-white focus:border-green-400 focus:ring-0 focus:outline-none transition-colors rounded-t-lg cursor-pointer text-sm"
              >
                <option value="knn">K-Nearest Neighbors (KNN)</option>
                <option value="logistic_regression">Logistic Regression</option>
                <option value="random_forest">Random Forest</option>
              </select>
            </div>
            
            {algorithm === 'knn' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400">K Value (Neighbors)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value) || 3)}
                  className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-2.5 text-white focus:border-green-400 focus:ring-0 focus:outline-none transition-colors rounded-t-lg tabular-nums text-sm"
                />
              </div>
            ) : algorithm === 'random_forest' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400">Ensemble Estimators</label>
                <input 
                  type="text" 
                  value="100 Trees (Gini Criterion)" 
                  disabled
                  className="w-full bg-black/30 border-b-2 border-white/5 border-x-transparent border-t-transparent px-4 py-2.5 text-slate-400 rounded-t-lg text-sm font-mono cursor-not-allowed"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400">Solver & Regularization</label>
                <input 
                  type="text" 
                  value="L-BFGS / C=1.0 (L2 Norm)" 
                  disabled
                  className="w-full bg-black/30 border-b-2 border-white/5 border-x-transparent border-t-transparent px-4 py-2.5 text-slate-400 rounded-t-lg text-sm font-mono cursor-not-allowed"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleTrain}
            disabled={training || !dataset}
            className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)] cursor-pointer"
          >
            {training ? (
              <>
                <Dumbbell className="animate-spin" size={20} />
                <span>Training & Evaluating Model...</span>
              </>
            ) : (
              <>
                <Dumbbell size={20} />
                <span>{liveEvaluated ? 'Re-train & Re-evaluate Model' : 'Initialize Training Sequence'}</span>
              </>
            )}
          </button>
        </div>

        {trainError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-in fade-in">
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-xs">
              <strong className="block text-white font-bold mb-0.5">Flask Training Error</strong>
              <span>{trainError}</span>
            </div>
          </div>
        )}

        {complete && metrics && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle size={22} className="shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Model Training Sequence Completed via Flask</p>
                <p className="text-xs text-green-400/80">
                  Evaluated on 42 test samples. Test Accuracy: <strong className="text-white font-mono">{((metrics.accuracy || 0) * 100).toFixed(1)}%</strong>
                  {typeof trainDurationMs === 'number' && (
                    <span className="ml-2 text-slate-400">• Latency: {trainDurationMs.toFixed(1)}ms</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/predict')}
                className="px-4 py-2 bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold rounded-full hover:opacity-90 transition-opacity text-xs shadow-[0_0_12px_rgba(74,222,128,0.25)] flex items-center gap-1.5 cursor-pointer"
              >
                <Crosshair size={14} />
                <span>Test Live Prediction</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* D3.js Confusion Matrix Heatmap Section */}
      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Confusion Matrix Heatmap Visualization
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 2x2 error matrix for <strong className="text-white">{getModelLabel(algorithm)}</strong>.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium border self-start sm:self-auto ${
            liveEvaluated 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          }`}>
            {liveEvaluated ? '✓ Live Test Split' : 'Reference Benchmark Split'}
          </span>
        </div>

        {/* D3 Component */}
        {activeMatrix ? (
          <ConfusionMatrixHeatmap 
            matrix={activeMatrix} 
            modelName={getModelLabel(algorithm)} 
          />
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Loading confusion matrix from Flask backend...</span>
          </div>
        )}
      </div>

      {/* Influential Frequency Bins Visualization Section (Multi-Model Horizontal Bar Chart) */}
      <FeatureImportanceChart 
        isRandomForestActive={algorithm === 'random_forest' || algorithm === 'rf'} 
        activeAlgorithm={algorithm}
      />
    </div>
  );
}

