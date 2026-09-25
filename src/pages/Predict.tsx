import React, { useState } from 'react';
import { useAppContext } from '../lib/dataContext';
import { generatePredictionPDF } from '../lib/pdf';
import { Crosshair, Download, RefreshCw, Upload, AlertCircle, Server } from 'lucide-react';
import { cn } from '../lib/utils';
import Papa from 'papaparse';
import { predictWithFlaskAPI, ValidModelName } from '../lib/ml';

// Default representative sonar frequency baseline (60 floats) from Sonar Mines vs Rocks dataset
const DEFAULT_SAMPLE_FEATURES: number[] = [
  0.0286, 0.0453, 0.0277, 0.0174, 0.0384, 0.0990, 0.1201, 0.1833, 0.2105, 0.3039,
  0.2988, 0.4250, 0.6343, 0.8198, 1.0000, 0.9988, 0.9508, 0.9025, 0.7234, 0.5122,
  0.2074, 0.3985, 0.5890, 0.2872, 0.2043, 0.5782, 0.5389, 0.3750, 0.3411, 0.5067,
  0.5580, 0.4778, 0.3299, 0.2198, 0.1407, 0.2856, 0.3807, 0.4158, 0.4054, 0.3296,
  0.2707, 0.2650, 0.0723, 0.1238, 0.1192, 0.1089, 0.0623, 0.0494, 0.0264, 0.0081,
  0.0104, 0.0045, 0.0014, 0.0038, 0.0013, 0.0089, 0.0057, 0.0027, 0.0051, 0.0062
];

export function Predict() {
  const { dataset, selectedModel, setSelectedModel } = useAppContext();
  const [inputs, setInputs] = useState<number[]>(new Array(60).fill(0));
  const [result, setResult] = useState<{ label: 'ROCK' | 'MINE'; conf: number; modelName: string } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleInputChange = (idx: number, val: string) => {
    const newInputs = [...inputs];
    newInputs[idx] = parseFloat(val) || 0;
    setInputs(newInputs);
  };

  const fillRandomSample = () => {
    setApiError(null);
    if (dataset && dataset.features.length > 0) {
      const randIdx = Math.floor(Math.random() * dataset.features.length);
      setInputs([...dataset.features[randIdx]]);
    } else {
      setInputs([...DEFAULT_SAMPLE_FEATURES]);
    }
    setResult(null); // Clear previous
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    setApiError(null);

    try {
      // Validate all 60 inputs
      if (inputs.length !== 60) {
        throw new Error('Please ensure exactly 60 sonar frequency features are configured.');
      }

      // Requirement 6, 7, 8:
      // "knn" -> "knn"
      // "logistic_regression" -> "logistic_regression"
      // "random_forest" -> "random_forest"
      const res = await predictWithFlaskAPI(selectedModel, inputs);

      const label: 'ROCK' | 'MINE' = res.prediction === 'R' ? 'ROCK' : 'MINE';
      const conf = typeof res.confidence === 'number' ? res.confidence : 0.95;

      setResult({
        label,
        conf,
        modelName: res.model || selectedModel,
      });

      // Save to local history
      const history = JSON.parse(localStorage.getItem('predictHistory') || '[]');
      history.push({
        timestamp: new Date().toISOString(),
        result: label,
        confidence: conf,
        model: res.model || selectedModel,
        inputs: [...inputs],
      });
      localStorage.setItem('predictHistory', JSON.stringify(history));
    } catch (err: any) {
      console.error('Classification error:', err);
      setApiError(err.message || 'Error communicating with Flask prediction API.');
      setResult(null);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setApiError(null);
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length > 0 && data[0].length >= 60) {
          const firstRow = data[0].slice(0, 60).map(Number);
          if (!firstRow.some(isNaN)) {
            setInputs(firstRow);
            setResult(null);
          } else {
            alert('Invalid CSV data. Ensure 60 numeric columns.');
          }
        }
      },
    });
  };

  const getModelLabel = (model: string) => {
    switch (model) {
      case 'knn':
        return 'K-Nearest Neighbors (KNN)';
      case 'logistic_regression':
        return 'Logistic Regression';
      case 'random_forest':
        return 'Random Forest';
      default:
        return model;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <header className="flex flex-col">
          <span className="text-sm text-slate-500">Inference Engine</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Predict Signature</h1>
        </header>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10">
          <Server size={14} className="text-green-400" />
          <span>Flask API:</span>
          <span className="text-green-400 font-mono text-[11px]">https://echo-guard-api.onrender.com/predict</span>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="font-semibold text-sm text-red-100 flex items-center justify-between">
                <span>Flask API Connection Error</span>
                <button
                  onClick={() => setApiError(null)}
                  className="text-xs text-red-400 hover:text-red-200 uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed font-sans">{apiError}</p>
              <div className="mt-3 text-[11px] text-slate-300 bg-black/60 p-3 rounded-xl border border-white/10 space-y-1.5 font-mono">
                <p className="text-green-400 font-bold">Troubleshooting steps:</p>
                <p>1. Check backend status at: <span className="text-white bg-white/10 px-1 py-0.5 rounded break-all">https://echo-guard-api.onrender.com/health</span></p>
                <p>2. Verify endpoint is listening on: <span className="text-cyan-300 break-all">POST https://echo-guard-api.onrender.com/predict</span></p>
                <p>3. Note: Render free tier services may take 30-50s to wake up if dormant.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Controls and Results */}
        <div className="space-y-6">
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-6 hover:border-green-400/50 transition-colors">
            {/* Model Selection UI */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-400">
                Classification Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value as ValidModelName);
                  setApiError(null);
                }}
                className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-2.5 text-white focus:border-green-400 focus:ring-0 focus:outline-none transition-colors rounded-t-lg text-sm cursor-pointer"
              >
                <option value="knn">K-Nearest Neighbors (KNN)</option>
                <option value="logistic_regression">Logistic Regression</option>
                <option value="random_forest">Random Forest</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Active model: <code className="text-green-400">{selectedModel}</code>
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <button
                onClick={fillRandomSample}
                className="w-full py-2.5 px-4 bg-black/40 hover:bg-white/5 text-slate-300 rounded-full font-medium transition-colors flex justify-center items-center gap-2 border border-white/10 cursor-pointer"
              >
                <RefreshCw size={16} />
                Auto-fill Sample Data
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="w-full py-2.5 px-4 bg-black/40 border border-white/10 hover:bg-white/5 text-slate-300 rounded-full font-medium transition-colors flex justify-center items-center gap-2 cursor-pointer"
                >
                  <Upload size={16} />
                  Upload CSV
                </label>
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-4 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)] cursor-pointer"
            >
              {isPredicting ? (
                <>
                  <RefreshCw size={22} className="animate-spin" />
                  <span>Connecting to Flask API...</span>
                </>
              ) : (
                <>
                  <Crosshair size={24} />
                  <span>Run Classification</span>
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-6 animate-in zoom-in-95 duration-300 hover:border-green-400/50 transition-colors">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  <span>Model:</span>
                  <span className="text-green-400 font-bold">{getModelLabel(result.modelName)}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">Prediction Result</h3>
                <div
                  className={cn(
                    'text-5xl font-black tracking-tight bg-clip-text text-transparent',
                    result.label === 'ROCK'
                      ? 'bg-gradient-to-r from-green-400 to-green-200'
                      : 'bg-gradient-to-r from-cyan-400 to-cyan-200'
                  )}
                >
                  {result.label}
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 text-sm font-bold border border-white/10 text-white">
                  Confidence: {(result.conf * 100).toFixed(1)}%
                </div>
              </div>

              <button
                onClick={() => generatePredictionPDF(inputs, result.label, result.conf)}
                className="w-full py-2.5 bg-black/40 hover:bg-white/5 text-white rounded-full font-bold transition-colors flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
              >
                <Download size={16} />
                Export PDF Report
              </button>
            </div>
          )}
        </div>

        {/* 60 Inputs Grid */}
        <div className="lg:col-span-2 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400"></span>Frequency Signatures (60 inputs)
            </h3>
            <button
              onClick={() => {
                setInputs(new Array(60).fill(0));
                setResult(null);
                setApiError(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline cursor-pointer"
            >
              Reset to 0
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {inputs.map((val, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block text-center uppercase tracking-wider">
                  F{idx + 1}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={val}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  className="w-full bg-black/50 border-b border-white/10 border-x-transparent border-t-transparent rounded-t p-1.5 text-xs text-center text-white focus:border-green-400 focus:ring-0 focus:outline-none tabular-nums transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
