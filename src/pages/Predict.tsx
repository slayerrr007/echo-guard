import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../lib/dataContext';
import { useAuth } from '../lib/authContext';
import { isFirebaseConfigured } from '../lib/firebase';
import { generatePredictionPDF } from '../lib/pdf';
import { 
  Crosshair, 
  Download, 
  RefreshCw, 
  Upload, 
  AlertCircle, 
  Server,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Activity,
  Percent,
  TrendingUp,
  ShieldAlert,
  Volume2,
  VolumeX,
  Radio,
  Database,
  CheckCircle2,
  Lock,
  History as HistoryIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import Papa from 'papaparse';
import { predict, ValidModelName } from '../services/api';
import {
  savePredictionToFirestore,
  parseFirestoreErrorMessage,
} from '../services/predictionHistoryService';
import { useToast } from '../components/ui/ToastContext';
import { SonarWaveChart } from '../components/charts/SonarWaveChart';
import { SonarBarSpectrumMiniChart } from '../components/charts/SonarBarSpectrumMiniChart';
import { RadialConfidenceDial } from '../components/charts/RadialConfidenceDial';
import { SignalFeature3D } from '../components/three/SignalFeature3D';
import { PredictionResult3D } from '../components/three/PredictionResult3D';
import { playSonarMinePing } from '../lib/sonarAudio';

const FLASK_PREDICT_URL = '/api/predict';

// Default representative sonar frequency baseline (60 floats) from Sonar Mines vs Rocks dataset
const DEFAULT_SAMPLE_FEATURES: number[] = [
  0.0286, 0.0453, 0.0277, 0.0174, 0.0384, 0.0990, 0.1201, 0.1833, 0.2105, 0.3039,
  0.2988, 0.4250, 0.6343, 0.8198, 1.0000, 0.9988, 0.9508, 0.9025, 0.7234, 0.5122,
  0.2074, 0.3985, 0.5890, 0.2872, 0.2043, 0.5782, 0.5389, 0.3750, 0.3411, 0.5067,
  0.5580, 0.4778, 0.3299, 0.2198, 0.1407, 0.2856, 0.3807, 0.4158, 0.4054, 0.3296,
  0.2707, 0.2650, 0.0723, 0.1238, 0.1192, 0.1089, 0.0623, 0.0494, 0.0264, 0.0081,
  0.0104, 0.0045, 0.0014, 0.0038, 0.0013, 0.0089, 0.0057, 0.0027, 0.0051, 0.0062
];

// Borderline sonar frequency signature near the 50% decision boundary (~55% - 68% confidence)
const BORDERLINE_SAMPLE_FEATURES: number[] = [
  0.0130, 0.0120, 0.0180, 0.0360, 0.0770, 0.0850, 0.0590, 0.0640, 0.1100, 0.1090,
  0.1120, 0.1280, 0.0790, 0.1180, 0.1780, 0.1850, 0.1410, 0.1270, 0.2620, 0.3340,
  0.3980, 0.3940, 0.4770, 0.6580, 0.6910, 0.6960, 0.7490, 0.7960, 0.7350, 0.6130,
  0.4480, 0.3340, 0.3540, 0.2440, 0.3300, 0.3660, 0.3150, 0.2830, 0.3010, 0.2720,
  0.2060, 0.1450, 0.1380, 0.1340, 0.1070, 0.0680, 0.0700, 0.0640, 0.0360, 0.0100,
  0.0090, 0.0078, 0.0174, 0.0121, 0.0036, 0.0078, 0.0174, 0.0121, 0.0036, 0.0062
];

interface PredictionResult {
  label: 'ROCK' | 'MINE';
  code: 'R' | 'M';
  conf: number;
  pRock: number;
  pMine: number;
  modelName: string;
  hasConfidence: boolean;
  hasRockProbability: boolean;
  hasMineProbability: boolean;
}

export function Predict() {
  const { dataset, selectedModel, setSelectedModel } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [inputs, setInputs] = useState<number[]>([...DEFAULT_SAMPLE_FEATURES]);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSavingFirestore, setIsSavingFirestore] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [firestoreSaveError, setFirestoreSaveError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('echo_guard_audio_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [isPinging, setIsPinging] = useState(false);
  const [focusedBinIndex, setFocusedBinIndex] = useState<number | null>(null);

  const handleSelectBinFromSpectrum = (idx: number) => {
    setFocusedBinIndex(idx);
    const inputEl = document.getElementById(`sonar-bin-input-${idx}`) as HTMLInputElement | null;
    if (inputEl) {
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      inputEl.focus();
      inputEl.select();
    }
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    try {
      localStorage.setItem('echo_guard_audio_enabled', String(next));
    } catch {
      // Ignore localStorage exceptions
    }
    if (next) {
      playSonarMinePing({ volume: 0.14 });
      setIsPinging(true);
      setTimeout(() => setIsPinging(false), 850);
    }
  };

  const handleTestPing = () => {
    playSonarMinePing();
    setIsPinging(true);
    setTimeout(() => setIsPinging(false), 850);
  };

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

  const fillBorderlineSample = () => {
    setApiError(null);
    setInputs([...BORDERLINE_SAMPLE_FEATURES]);
    setResult(null);
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    setApiError(null);
    setSavedDocId(null);
    setFirestoreSaveError(null);

    try {
      // Validate all 60 inputs
      if (inputs.length !== 60) {
        throw new Error('Please ensure exactly 60 sonar frequency features are configured.');
      }

      // Requirement 6, 7, 8:
      // "knn" -> "knn"
      // "logistic_regression" -> "logistic_regression"
      // "random_forest" -> "random_forest"
      const res = await predict(selectedModel, inputs);

      const label: 'ROCK' | 'MINE' = res.prediction === 'R' ? 'ROCK' : 'MINE';
      const code: 'R' | 'M' = res.prediction === 'R' ? 'R' : 'M';
      const conf = res.confidence;
      const pRock = res.rock_probability;
      const pMine = res.mine_probability;

      setResult({
        label,
        code,
        conf,
        pRock,
        pMine,
        modelName: res.model || selectedModel,
        hasConfidence: Boolean(res.hasConfidence),
        hasRockProbability: Boolean(res.hasRockProbability),
        hasMineProbability: Boolean(res.hasMineProbability),
      });

      // Play subtle submarine acoustic sonar ping via AudioContext when a 'MINE' target is classified
      if (label === 'MINE' && audioEnabled) {
        playSonarMinePing({ volume: 0.18 });
        setIsPinging(true);
        setTimeout(() => setIsPinging(false), 900);
      }

      // Alert user via toast notification if prediction falls below 70% confidence threshold
      if (conf < 0.70) {
        toast.warning(
          'Low Confidence Alert (< 70%)',
          `Prediction certainty is only ${(conf * 100).toFixed(1)}% for ${label}. Sonar acoustic returns exhibit significant ambiguity near the 50% decision boundary. Recommend taking a secondary reading.`,
          {
            badge: `${(conf * 100).toFixed(1)}% Sub-Threshold`,
            duration: 8000,
            action: {
              label: 'Inspect Warning State',
              onClick: () => {
                document.getElementById('prediction-result-panel')?.scrollIntoView({ behavior: 'smooth' });
              },
            },
          }
        );
      }
    } catch (err: any) {
      console.error('Classification error:', err);
      setApiError(err.message || 'Error communicating with Flask prediction API.');
      setResult(null);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!result || !user) return;
    setIsSavingFirestore(true);
    setFirestoreSaveError(null);

    try {
      const docId = await savePredictionToFirestore({
        predictedClass: result.label === 'ROCK' ? 'Rock' : 'Mine',
        predictedCode: result.code,
        selectedModel: result.modelName,
        confidence: result.hasConfidence ? result.conf : undefined,
        rockProbability: result.hasRockProbability ? result.pRock : undefined,
        mineProbability: result.hasMineProbability ? result.pMine : undefined,
      });
      setSavedDocId(docId);
      toast.success(
        'Saved to Cloud Firestore',
        `Prediction (${result.label === 'ROCK' ? 'Rock' : 'Mine'}) saved to your personal history.`
      );
    } catch (err: unknown) {
      const parsed = parseFirestoreErrorMessage(err);
      setFirestoreSaveError(parsed.message);
    } finally {
      setIsSavingFirestore(false);
    }
  };

  const getCertaintyTier = (confidence: number) => {
    if (confidence >= 0.85) {
      return {
        level: 'High Certainty',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        barColor: 'from-emerald-400 to-green-500',
        glowColor: 'shadow-[0_0_12px_rgba(52,211,153,0.35)]',
        description: 'Distinctive acoustic resonance pattern aligning decisively with target signature.',
        icon: ShieldCheck,
      };
    }
    if (confidence >= 0.70) {
      return {
        level: 'Moderate Certainty',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        barColor: 'from-cyan-400 to-blue-500',
        glowColor: 'shadow-[0_0_12px_rgba(34,211,238,0.35)]',
        description: 'Substantial harmonic spectral match with moderate separation from decision boundary.',
        icon: Gauge,
      };
    }
    return {
      level: 'Low Certainty (< 70% Alert)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse',
      barColor: 'from-amber-400 via-orange-500 to-amber-600',
      glowColor: 'shadow-[0_0_15px_rgba(251,191,36,0.6)]',
      description: 'Acoustic returns fall below the 70% operational confidence threshold. High classification ambiguity near the decision boundary.',
      icon: AlertTriangle,
    };
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Sonar Audio Alert Toggle using AudioContext */}
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
            <button
              type="button"
              onClick={toggleAudio}
              className={cn(
                'flex items-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer',
                audioEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              )}
              title={audioEnabled ? 'Sonar ping audio alert active (plays subtle tone when Mine is detected)' : 'Sonar ping audio alert muted'}
            >
              {audioEnabled ? (
                <Volume2 size={15} className={cn("text-emerald-400", isPinging && "animate-bounce text-cyan-300")} />
              ) : (
                <VolumeX size={15} className="text-slate-500" />
              )}
              <span>{audioEnabled ? 'Sonar Ping: Armed' : 'Audio: Muted'}</span>
            </button>

            {audioEnabled && (
              <button
                type="button"
                onClick={handleTestPing}
                className="ml-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer border border-white/10"
                title="Preview subtle sonar ping via AudioContext"
              >
                <Radio size={11} className={cn("text-cyan-400", isPinging && "animate-ping")} />
                <span>Test</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10">
            <Server size={14} className="text-green-400" />
            <span>Flask API:</span>
            <span className="text-green-400 font-mono text-[11px]">{FLASK_PREDICT_URL}</span>
          </div>
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
                className="w-full py-2.5 px-4 bg-black/40 hover:bg-white/5 text-slate-300 rounded-full font-medium transition-colors flex justify-center items-center gap-2 border border-white/10 cursor-pointer text-xs"
              >
                <RefreshCw size={14} />
                Auto-fill Normal Sample
              </button>

              <button
                onClick={fillBorderlineSample}
                className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-full font-medium transition-colors flex justify-center items-center gap-2 border border-amber-500/30 cursor-pointer text-xs"
              >
                <AlertTriangle size={14} className="text-amber-400" />
                Simulate Ambiguous Ping (&lt; 70% Test)
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

            {/* Real-Time Recharts 60-Bin Bar Spectrum Mini-Chart */}
            <SonarBarSpectrumMiniChart
              inputs={inputs}
              isPredicting={isPredicting}
              predictionLabel={result?.label ?? null}
              selectedBinIndex={focusedBinIndex}
              onSelectBin={handleSelectBinFromSpectrum}
              title="Live 60-Bin Bar Spectrum"
            />

            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="w-full py-4 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)] cursor-pointer"
            >
              {isPredicting ? (
                <>
                  <RefreshCw size={22} className="animate-spin" />
                  <span>Scanning 60-Bin Spectrum...</span>
                </>
              ) : (
                <>
                  <Crosshair size={24} />
                  <span>Run Classification</span>
                </>
              )}
            </button>

            {/* AudioContext Sonar Feedback Status */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <Volume2 size={13} className={audioEnabled ? "text-emerald-400" : "text-slate-500"} />
                <span>Sonar Audio: {audioEnabled ? 'Armed (Ping on Mine)' : 'Muted'}</span>
              </span>
              <button
                type="button"
                onClick={handleTestPing}
                className="text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Preview subtle sonar ping sound"
              >
                <Radio size={11} className={cn("text-cyan-400", isPinging && "animate-ping")} />
                <span>Test Ping</span>
              </button>
            </div>
          </div>

          {result && (() => {
            const certainty = getCertaintyTier(result.conf);
            const CertaintyIcon = certainty.icon;
            const pMinePct = (result.pMine * 100).toFixed(1);
            const pRockPct = (result.pRock * 100).toFixed(1);
            const margin = Math.abs(result.pMine - result.pRock) * 100;
            const isLowConfidence = result.conf < 0.70;

            return (
              <div 
                id="prediction-result-panel"
                className={cn(
                  'p-6 rounded-3xl space-y-6 animate-in zoom-in-95 duration-300 transition-all backdrop-blur-md relative overflow-hidden',
                  isLowConfidence
                    ? 'bg-slate-950/90 border-2 border-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
                    : 'bg-black/40 border border-white/10 hover:border-green-400/50'
                )}
              >
                {/* Visual Warning Banner for < 70% Confidence */}
                {isLowConfidence && (
                  <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl p-4 space-y-2.5 animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    
                    <div className="flex items-center justify-between gap-2 pl-1.5">
                      <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-xs uppercase tracking-wider">
                        <AlertTriangle size={17} className="animate-bounce shrink-0" />
                        <span>Acoustic Ambiguity Warning</span>
                      </div>
                      <span className="bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full animate-pulse shrink-0">
                        &lt; 70% Operational Threshold
                      </span>
                    </div>

                    <p className="text-xs text-amber-100/90 leading-relaxed font-sans pl-1.5">
                      Model certainty is <strong className="text-white font-mono font-bold">{(result.conf * 100).toFixed(1)}%</strong>, which falls below the mandatory <strong>70.0%</strong> naval clearance threshold. Acoustic returns indicate boundary overlap between metallic resonance and irregular seafloor mineral scattering.
                    </p>

                    <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-amber-300/80 pl-1.5">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert size={13} className="text-amber-400" />
                        <span>Tactical Protocol: Initiate secondary verification ping</span>
                      </span>
                      <span className="text-slate-400">Margin: ±{margin.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Result Header & Classification */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    <span>Model:</span>
                    <span className="text-green-400 font-bold">{getModelLabel(result.modelName)}</span>
                  </div>
                  
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">Classification Result</h3>
                  
                  <div className="relative inline-flex items-center justify-center">
                    <div
                      className={cn(
                        'text-5xl font-black tracking-tight bg-clip-text text-transparent flex items-center justify-center gap-2 relative z-10',
                        result.label === 'ROCK'
                          ? 'bg-gradient-to-r from-green-400 to-emerald-200'
                          : 'bg-gradient-to-r from-cyan-400 to-rose-400'
                      )}
                    >
                      {result.label}
                    </div>
                    {result.label === 'MINE' && isPinging && (
                      <span className="absolute -inset-4 rounded-3xl border-2 border-rose-400/60 animate-ping pointer-events-none" />
                    )}
                  </div>

                  {/* Mine Sonar Acoustic Ping Notification */}
                  {result.label === 'MINE' && (
                    <div className="pt-1 flex items-center justify-center">
                      <div className={cn(
                        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all',
                        audioEnabled 
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      )}>
                        <Radio size={13} className={cn(audioEnabled ? "text-rose-400" : "text-slate-500", (isPinging || audioEnabled) && "animate-pulse")} />
                        <span>
                          {audioEnabled ? 'Acoustic Sonar Ping Emitted (~1.05 kHz)' : 'Audio Muted — Unmute in header'}
                        </span>
                        {audioEnabled && (
                          <button
                            type="button"
                            onClick={handleTestPing}
                            className="text-[11px] text-cyan-300 hover:text-cyan-100 underline cursor-pointer ml-1"
                            title="Replay subtle ping tone"
                          >
                            Replay
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certainty Tier Badge & Low Confidence Warning State */}
                  <div className="pt-1 flex flex-col items-center gap-1.5">
                    {isLowConfidence ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span>Low Certainty (&lt; 70% Alert)</span>
                      </span>
                    ) : (
                      <span className={cn('inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border', certainty.badgeClass)}>
                        <CertaintyIcon size={14} />
                        <span>{certainty.level}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 3D Prediction Result Scene (Rock vs. Mine Composite 3D Assembly) */}
                <PredictionResult3D
                  label={result.label}
                  confidence={result.conf}
                  modelName={getModelLabel(result.modelName)}
                  heightClass="h-[310px]"
                />

                {/* Radial Progress Dial for Classification Probability & Thresholds */}
                <RadialConfidenceDial
                  confidence={result.conf}
                  label={result.label}
                  pRock={result.pRock}
                  pMine={result.pMine}
                  modelName={getModelLabel(result.modelName)}
                  isPredicting={isPredicting}
                />

                {/* Primary Confidence Score & Probability Card */}
                <div className={cn(
                  'p-4 rounded-2xl border space-y-3 transition-colors',
                  isLowConfidence
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-black/60 border border-white/10'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Percent size={14} className={isLowConfidence ? 'text-amber-400' : 'text-green-400'} />
                      Linear Confidence Bar
                    </span>
                    <div className="flex items-center gap-2">
                      {isLowConfidence && (
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 font-bold animate-pulse">
                          <AlertTriangle size={11} />
                          &lt; 70% Warning Zone
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                        p = {result.conf.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Big percentage & visual progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className={cn(
                        'text-2xl font-black tracking-tight font-mono tabular-nums',
                        isLowConfidence ? 'text-amber-400' : 'text-white'
                      )}>
                        {(result.conf * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Certainty Margin: <span className="text-white font-mono tabular-nums">+{margin.toFixed(1)}%</span>
                      </span>
                    </div>

                    {/* Animated gradient progress bar */}
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out', certainty.barColor, certainty.glowColor)}
                        style={{ width: `${Math.min(100, Math.max(5, result.conf * 100))}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {certainty.description}
                  </p>
                </div>

                {/* Granular Class Probability Distribution */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Class Probability Distribution</span>
                    <span className="text-[10px] text-slate-500 font-mono">P(M) + P(R) = 1.00</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Mine Probability */}
                    <div className={cn(
                      'p-3 rounded-xl border space-y-1.5 transition-all',
                      result.label === 'MINE'
                        ? 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                        : 'bg-black/40 border-white/5 opacity-70'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          P(Mine)
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {pMinePct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${result.pMine * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Cylindrical metallic
                      </span>
                    </div>

                    {/* Rock Probability */}
                    <div className={cn(
                      'p-3 rounded-xl border space-y-1.5 transition-all',
                      result.label === 'ROCK'
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.15)]'
                        : 'bg-black/40 border-white/5 opacity-70'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          P(Rock)
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {pRockPct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                          style={{ width: `${result.pRock * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Natural seafloor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acoustic Signal Fingerprint Preview (Recharts 60-Bin Bar Spectrum) */}
                <SonarBarSpectrumMiniChart
                  inputs={inputs}
                  isPredicting={isPredicting}
                  predictionLabel={result.label}
                  selectedBinIndex={focusedBinIndex}
                  onSelectBin={handleSelectBinFromSpectrum}
                  compact
                  title={`Classified Signal Fingerprint (${result.label})`}
                />

                {/* Cloud Firestore Personal Prediction History Save Panel */}
                <div className="p-4 rounded-2xl bg-black/60 border border-green-500/25 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                      <Database size={14} className="text-green-400" />
                      Cloud Firestore History
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {user ? 'Authenticated' : 'Sign-In Required'}
                    </span>
                  </div>

                  {!isFirebaseConfigured ? (
                    <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 font-mono">
                      Firebase Cloud Firestore is not configured in this environment. Check{' '}
                      <code>firebase-applet-config.json</code>.
                    </div>
                  ) : !user ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Sign in with your Echo-Guard account to save this verified prediction result to your personal Cloud Firestore history.
                      </p>
                      <Link
                        to="/login"
                        className="w-full py-2.5 px-4 bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/40 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Lock size={14} />
                        Sign In to Save Prediction History
                      </Link>
                    </div>
                  ) : savedDocId ? (
                    <div className="space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-emerald-200">
                            Saved to Cloud Firestore
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 break-all">
                            Doc ID: <span className="text-emerald-300">{savedDocId}</span>
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/history"
                        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-green-300 border border-green-500/30 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <HistoryIcon size={14} />
                        View in Prediction History
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Save this verified <code className="text-green-400">/predict</code> result (
                        <strong className="text-white">{result.label === 'ROCK' ? 'Rock' : 'Mine'}</strong>,{' '}
                        <code className="text-cyan-300">{result.modelName}</code>
                        {result.hasConfidence ? `, ${(result.conf * 100).toFixed(1)}% confidence` : ''}) to your personal Firestore collection.
                      </p>

                      {firestoreSaveError && (
                        <div className="text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1">
                          <div className="font-semibold text-red-300 flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            <span>Failed to Save to Firestore</span>
                          </div>
                          <p className="text-[11px] font-mono text-red-200/90 break-words">
                            {firestoreSaveError}
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveToFirestore}
                        disabled={isSavingFirestore}
                        className="w-full py-2.5 px-4 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-300 border border-green-400/40 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(74,222,128,0.15)]"
                      >
                        {isSavingFirestore ? (
                          <>
                            <RefreshCw size={14} className="animate-spin text-green-400" />
                            <span>Saving to Cloud Firestore...</span>
                          </>
                        ) : (
                          <>
                            <Database size={14} className="text-green-400" />
                            <span>Save Prediction to Cloud History</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* PDF Export with confidence details */}
                <button
                  onClick={() => generatePredictionPDF(inputs, result.label, result.conf, {
                    pRock: result.pRock,
                    pMine: result.pMine,
                    modelName: getModelLabel(result.modelName),
                  })}
                  className="w-full py-2.5 bg-black/40 hover:bg-white/5 text-white rounded-full font-bold transition-colors flex items-center justify-center gap-2 border border-white/10 cursor-pointer text-sm"
                >
                  <Download size={16} />
                  Export PDF Report
                </button>
              </div>
            );
          })()}
          {!result && (
            <PredictionResult3D
              label={null}
              modelName={getModelLabel(selectedModel)}
              heightClass="h-[290px]"
            />
          )}
        </div>

        {/* 60 Inputs Column with 3D Signal Feature Visualization & Dynamic Canvas Waveform Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive 3D 60-Bin Signal Feature Visualization */}
          <SignalFeature3D
            features={inputs}
            selectedBinIndex={focusedBinIndex}
            onSelectBin={handleSelectBinFromSpectrum}
            sourceLabel="Live 60-Bin Prediction Input Vector"
            classLabel={result ? `${result.label} (${(result.conf * 100).toFixed(1)}%)` : undefined}
            heightClass="h-[360px] sm:h-[390px]"
          />

          {/* Dynamic 60-Bin Sonar Acoustic Waveform Component */}
          <SonarWaveChart
            features={inputs}
            onFeaturesChange={(updated) => {
              setInputs(updated);
              setResult(null);
              setApiError(null);
            }}
            predictedLabel={result?.label}
            confidence={result?.conf}
          />

          {/* 60 Inputs Grid */}
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-green-400/50 transition-colors">
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[45vh] overflow-y-auto p-1">
              {inputs.map((val, idx) => {
                const isSelected = focusedBinIndex === idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'space-y-1 p-1 rounded-lg transition-colors',
                      isSelected && 'bg-amber-500/15 ring-1 ring-amber-400/60'
                    )}
                  >
                    <label
                      htmlFor={`sonar-bin-input-${idx}`}
                      className={cn(
                        'text-[10px] font-bold block text-center uppercase tracking-wider',
                        isSelected ? 'text-amber-300' : 'text-slate-400'
                      )}
                    >
                      F{idx + 1}
                    </label>
                    <input
                      id={`sonar-bin-input-${idx}`}
                      type="number"
                      step="0.0001"
                      value={val}
                      onFocus={() => setFocusedBinIndex(idx)}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className={cn(
                        'w-full bg-black/50 border-b border-x-transparent border-t-transparent rounded-t p-1.5 text-xs text-center text-white focus:ring-0 focus:outline-none tabular-nums transition-colors',
                        isSelected
                          ? 'border-amber-400 text-amber-200 font-semibold'
                          : 'border-white/10 focus:border-green-400'
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
