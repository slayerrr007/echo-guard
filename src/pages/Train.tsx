import React, { useState } from 'react';
import { useAppContext } from '../lib/dataContext';
import { KNN, LogisticRegression, RandomForest, SVM, calculateMetrics, trainTestSplit } from '../lib/ml';
import { Dumbbell, CheckCircle, AlertCircle, Settings, Scale } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function Train() {
  const { dataset, setMetrics, setTrainedModel, setSelectedModel } = useAppContext();
  const [training, setTraining] = useState(false);
  const [algorithm, setAlgorithm] = useState('knn');
  const [kValue, setKValue] = useState(3);
  const [complete, setComplete] = useState(false);
  const navigate = useNavigate();

  const handleAlgorithmChange = (val: string) => {
    setAlgorithm(val);
    if (val === 'knn') setSelectedModel('knn');
    else if (val === 'logistic_regression' || val === 'lr') setSelectedModel('logistic_regression');
    else if (val === 'random_forest' || val === 'rf') setSelectedModel('random_forest');
  };

  const handleTrain = () => {
    if (!dataset) return;
    setTraining(true);
    setComplete(false);

    // Simulate slight delay for UI feedback
    setTimeout(() => {
      const { X_train, X_test, y_train, y_test } = trainTestSplit(dataset.features, dataset.labels, 0.2);
      
      let model;
      if (algorithm === 'knn') {
        model = new KNN(kValue);
        setSelectedModel('knn');
      } else if (algorithm === 'logistic_regression' || algorithm === 'lr') {
        model = new LogisticRegression();
        setSelectedModel('logistic_regression');
      } else if (algorithm === 'random_forest' || algorithm === 'rf') {
        model = new RandomForest();
        setSelectedModel('random_forest');
      } else if (algorithm === 'svm') {
        model = new SVM();
      } else {
        model = new KNN(5);
        setSelectedModel('knn');
      }

      model.fit(X_train, y_train);
      const { predictions } = model.predict(X_test);
      
      const metrics = calculateMetrics(y_test, predictions);
      
      setMetrics(metrics);
      setTrainedModel(model);
      
      setTraining(false);
      setComplete(true);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Model Pipeline</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Train Model</h2>
        </div>
      </header>

      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-8">
        
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400"></span>Model Configuration
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-400">Algorithm</label>
              <select 
                value={algorithm}
                onChange={(e) => handleAlgorithmChange(e.target.value)}
                className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-2.5 text-white focus:border-green-400 focus:ring-0 focus:outline-none transition-colors rounded-t-lg cursor-pointer"
              >
                <option value="knn">K-Nearest Neighbors (KNN)</option>
                <option value="logistic_regression">Logistic Regression</option>
                <option value="random_forest">Random Forest</option>
              </select>
            </div>
            
            {algorithm === 'knn' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-400">K Value (Neighbors)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value) || 3)}
                  className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-2.5 text-white focus:border-green-400 focus:ring-0 focus:outline-none transition-colors rounded-t-lg tabular-nums"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleTrain}
            disabled={training || !dataset}
            className="w-full py-4 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
          >
            {training ? (
              <>
                <Dumbbell className="animate-spin" size={24} />
                <span>Training Model...</span>
              </>
            ) : (
              <>
                <Dumbbell size={24} />
                <span>Initialize Training Sequence</span>
              </>
            )}
          </button>
        </div>

        {complete && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4 text-green-400">
              <CheckCircle size={28} />
              <div>
                <p className="font-bold text-white text-lg">Training Complete!</p>
                <p className="text-sm text-green-400/80">Model weights updated and ready for inference.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => navigate('/predict')}
                className="px-5 py-2.5 bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold rounded-full hover:opacity-90 transition-opacity whitespace-nowrap text-sm shadow-[0_0_15px_rgba(74,222,128,0.25)] flex items-center gap-2 cursor-pointer"
              >
                <span>Run Prediction</span>
              </button>
              <button 
                onClick={() => navigate('/performance')}
                className="px-5 py-2.5 bg-black/40 text-white font-bold rounded-full border border-white/20 hover:bg-white/10 transition-colors whitespace-nowrap text-sm cursor-pointer"
              >
                View Performance
              </button>
              <button 
                onClick={() => navigate('/model-comparison')}
                className="px-5 py-2.5 bg-black/40 text-white font-bold rounded-full border border-white/20 hover:bg-white/10 transition-colors whitespace-nowrap text-sm flex items-center gap-2 cursor-pointer"
              >
                <Scale size={16} />
                <span>Compare Models</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
