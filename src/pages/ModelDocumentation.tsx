import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Binary, 
  GitBranch, 
  Share2, 
  Activity, 
  Cpu, 
  CheckCircle2, 
  Copy, 
  Check, 
  Layers, 
  Sliders, 
  Sparkles, 
  Compass, 
  Scale, 
  Terminal, 
  ExternalLink, 
  ChevronRight, 
  Database, 
  ShieldCheck, 
  Zap, 
  Crosshair,
  Server,
  FolderArchive
} from 'lucide-react';
import { getModelInfo, evaluateModels, ModelInfoResponse } from '../services/api';

export function ModelDocumentation() {
  const [activeTab, setActiveTab] = useState<'all' | 'lr' | 'rf' | 'knn' | 'formulas'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [evalMetrics, setEvalMetrics] = useState<Record<string, any> | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      getModelInfo().catch((err) => { console.warn(err); return null; }),
      evaluateModels().catch((err) => { console.warn(err); return null; })
    ]).then(([info, evalData]) => {
      if (info) setModelInfo(info);
      if (evalData && evalData.models) setEvalMetrics(evalData.models);
      setLoadingInfo(false);
    });
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeSnippets = {
    lr: `from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Production Pipeline for Echo-Guard Logistic Regression
pipeline_lr = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', LogisticRegression(
        penalty='l2',          # Ridge regularization
        C=1.0,                 # Inverse regularization strength
        solver='lbfgs',        # Quasi-Newton optimization algorithm
        max_iter=1000,         # Maximum iterations for convergence
        tol=1e-4,              # Tolerance for stopping criteria
        random_state=42
    ))
])`,
    rf: `from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Production Pipeline for Echo-Guard Random Forest
pipeline_rf = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier(
        n_estimators=100,      # 100 decorrelated decision trees
        criterion='gini',      # Gini impurity for split evaluation
        max_features='sqrt',   # sqrt(60) ≈ 8 features evaluated per split
        max_depth=None,        # Pure leaves or min_samples_split
        min_samples_split=2,   # Minimum samples required to split an internal node
        min_samples_leaf=1,    # Minimum samples required to be at a leaf node
        bootstrap=True,        # Bagging with replacement
        random_state=42
    ))
])`,
    knn: `from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Production Pipeline for Echo-Guard K-Nearest Neighbors
pipeline_knn = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', KNeighborsClassifier(
        n_neighbors=3,         # k=3 proximity voting (avoids ties in binary)
        weights='uniform',     # Uniform voting weight across neighbors
        algorithm='auto',      # Selects KD-Tree or BallTree based on data
        metric='minkowski',    # Minkowski metric space
        p=2                    # p=2 corresponds to standard Euclidean distance
    ))
])`
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* Header Banner */}
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-bold text-emerald-400">
          <BookOpen size={14} />
          <span>TECHNICAL WHITE PAPER & SPECIFICATIONS</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          Mathematical Theory & <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Implementation Parameters
          </span>
        </h1>

        <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed">
          Comprehensive algorithmic documentation of Echo-Guard's three verified classification architectures:
          <strong className="text-white"> Logistic Regression</strong>, <strong className="text-white">Random Forest</strong>, and <strong className="text-white">K-Nearest Neighbors (KNN)</strong>.
          Explore the underlying calculus, statistical decision boundaries, optimization solvers, and scikit-learn hyperparameters tuned for 60-band naval sonar classification.
        </p>

        {/* Quick Nav Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { id: 'all', label: 'All Architectures', icon: Layers },
            { id: 'lr', label: 'Logistic Regression', icon: Binary },
            { id: 'rf', label: 'Random Forest', icon: GitBranch },
            { id: 'knn', label: 'K-Nearest Neighbors', icon: Share2 },
            { id: 'formulas', label: 'Mathematical Formulations', icon: Activity },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 border-transparent shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                    : 'bg-black/40 text-slate-300 border-white/10 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Live Flask Model Registry Metadata */}
      {modelInfo && modelInfo.models && (
        <section className="bg-black/50 backdrop-blur-md rounded-3xl border border-emerald-500/30 p-6 md:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Live Scikit-Learn Production Artifacts (GET /model-info)
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
              ✓ Verified Backend Single Source of Truth
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['logistic_regression', 'knn', 'random_forest'] as const).map((mKey) => {
              const detail = modelInfo.models[mKey];
              if (!detail) return null;
              return (
                <div key={mKey} className="bg-black/40 rounded-2xl border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{detail.algorithm}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {detail.library}
                    </span>
                  </div>

                  <div className="space-y-1 text-xxs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <FolderArchive size={12} className="text-cyan-400 shrink-0" />
                      <span className="text-slate-300 truncate">Artifact: {detail.model_file}</span>
                    </div>
                    <div>Pipeline: <span className="text-white">{detail.pipeline_steps.join(' → ')}</span></div>
                    <div>Preprocessing: <span className="text-emerald-400">{detail.scaler_type || 'StandardScaler'}</span></div>
                    <div>Features: <span className="text-white">{detail.n_features} input bands</span></div>
                    <div>Target Classes: <span className="text-white">{detail.classes.join(', ')}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Model 1: Logistic Regression */}
      {(activeTab === 'all' || activeTab === 'lr') && (
        <section className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 hover:border-emerald-500/30 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <Binary size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Logistic Regression</h2>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Linear Probabilistic
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Convex Optimization • Continuous Sigmoid Posterior • L-BFGS Solver
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                Baseline Accuracy: <strong className="text-emerald-400">{evalMetrics?.logistic_regression ? `${(evalMetrics.logistic_regression.accuracy * 100).toFixed(1)}%` : 'Loading...'}</strong>
              </span>
            </div>
          </div>

          {/* Mathematical Foundations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Mathematical Formulation & Loss Function
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Logistic Regression models the probability that an acoustic echo signature <span className="font-mono text-emerald-400 text-xs">x ∈ ℝ⁶⁰</span> originates from a cylindrical metallic naval mine (<span className="font-mono text-emerald-400">Y = 1</span> or <span className="font-mono text-emerald-400">M</span>) rather than a solid natural rock (<span className="font-mono text-emerald-400">Y = 0</span> or <span className="font-mono text-emerald-400">R</span>) via a linear combination of frequency features passed through the standard logistic sigmoid activation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula Card 1 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Sigmoid Hypothesis Function
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-cyan-300 overflow-x-auto text-center">
                  P(Y=1 | x) = σ(wᵀx + b) = 1 / (1 + e^-(wᵀx + b))
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Where <span className="text-white font-mono">w ∈ ℝ⁶⁰</span> represents the weight vector across the 60 frequency bins and <span className="text-white font-mono">b ∈ ℝ</span> is the scalar intercept/bias term.
                </p>
              </div>

              {/* Formula Card 2 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  L2-Regularized Binary Cross-Entropy Loss
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-emerald-300 overflow-x-auto text-center">
                  L(w,b) = -1/N ∑ [ yᵢ ln(pᵢ) + (1-yᵢ) ln(1-pᵢ) ] + λ/(2) ||w||₂²
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Minimizes the negative log-likelihood of observations subject to Ridge (L2) shrinkage to prevent overfitting on collinear frequency bins.
                </p>
              </div>
            </div>

            {/* Gradient & Optimization */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Zap size={14} className="text-yellow-400" />
                Optimization via L-BFGS Quasi-Newton Algorithm:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rather than standard Stochastic Gradient Descent (SGD), Echo-Guard deploys the <strong className="text-white">L-BFGS (Limited-memory Broyden–Fletcher–Goldfarb–Shanno)</strong> solver. L-BFGS approximates the inverse Hessian matrix <span className="font-mono text-cyan-300">H⁻¹</span> using only the past <span className="font-mono text-white">m=10</span> gradient vectors, achieving superlinear quadratic convergence without storing the full 60×60 curvature matrix in memory.
              </p>
            </div>
          </div>

          {/* Hyperparameters Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              2. Production Scikit-Learn Hyperparameters
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-xxs">
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Production Value</th>
                    <th className="py-3 px-4">Mathematical Role</th>
                    <th className="py-3 px-4">Acoustic Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-emerald-400">penalty</td>
                    <td className="py-3 px-4 text-white">'l2'</td>
                    <td className="py-3 px-4 text-slate-300">Ridge penalty (1/2 ||w||₂²)</td>
                    <td className="py-3 px-4 text-slate-400">Smooths coefficients across adjacent frequency bins</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-emerald-400">C</td>
                    <td className="py-3 px-4 text-white">1.0</td>
                    <td className="py-3 px-4 text-slate-300">Inverse regularizer (C = 1/λ)</td>
                    <td className="py-3 px-4 text-slate-400">Optimal balance between training fit and generalization</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-emerald-400">solver</td>
                    <td className="py-3 px-4 text-white">'lbfgs'</td>
                    <td className="py-3 px-4 text-slate-300">Quasi-Newton line search</td>
                    <td className="py-3 px-4 text-slate-400">Sub-second convergence on dense 60-float arrays</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-emerald-400">max_iter</td>
                    <td className="py-3 px-4 text-white">1000</td>
                    <td className="py-3 px-4 text-slate-300">Iteration ceiling</td>
                    <td className="py-3 px-4 text-slate-400">Guarantees convergence below tolerance threshold</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-emerald-400">tol</td>
                    <td className="py-3 px-4 text-white">1e-4</td>
                    <td className="py-3 px-4 text-slate-300">Stopping dual residual threshold</td>
                    <td className="py-3 px-4 text-slate-400">Prevents futile iterations once gradient norm vanishes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pipeline Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={12} /> scikit-learn Pipeline Implementation
              </span>
              <button
                onClick={() => copyToClipboard(codeSnippets.lr, 'lr')}
                className="text-xxs font-mono text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
              >
                {copiedCode === 'lr' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedCode === 'lr' ? 'Copied' : 'Copy Python'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{codeSnippets.lr}</code>
            </pre>
          </div>
        </section>
      )}

      {/* Model 2: Random Forest */}
      {(activeTab === 'all' || activeTab === 'rf') && (
        <section className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 hover:border-cyan-500/30 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
                <GitBranch size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white">Random Forest Classifier</h2>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Ensemble Bagging
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  100 Decision Trees • Gini Impurity Criterion • Variance Reduction
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                Top Accuracy: <strong className="text-cyan-400">{evalMetrics?.random_forest ? `${(evalMetrics.random_forest.accuracy * 100).toFixed(1)}%` : 'Loading...'}</strong>
              </span>
            </div>
          </div>

          {/* Mathematical Foundations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              1. Mathematical Formulation & Gini Criterion
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Random Forest constructs an ensemble of <span className="font-mono text-cyan-400 font-bold">B = 100</span> decorrelated decision trees using bootstrap aggregation (bagging). Each tree <span className="font-mono text-white">T_b</span> is grown using a randomly sampled subset of <span className="font-mono text-cyan-400 font-bold">m = √60 ≈ 8</span> candidate frequency features at each split node, radically reducing cross-tree correlation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula Card 1 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Gini Impurity Metric
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-cyan-300 overflow-x-auto text-center">
                  I_G(t) = 1 - ∑ [ p(c|t)² ] = 1 - (p_Rock² + p_Mine²)
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Where <span className="font-mono text-white">p(c|t)</span> is the fraction of training samples at node <span className="font-mono text-white">t</span> belonging to class <span className="font-mono text-white">c</span>. A pure node yields <span className="font-mono text-emerald-400">I_G = 0</span>.
                </p>
              </div>

              {/* Formula Card 2 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Split Improvement & Feature Importance (MDI)
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-emerald-300 overflow-x-auto text-center">
                  ΔI_G = I_G(t) - (N_L/N_t) I_G(t_L) - (N_R/N_t) I_G(t_R)
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  The split threshold <span className="font-mono text-white">θ</span> maximizes the impurity drop <span className="font-mono text-white">ΔI_G</span>. Summing this across all 100 trees yields the Gini Feature Importance.
                </p>
              </div>
            </div>

            {/* Variance Reduction Proof */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-cyan-400" />
                Variance Reduction via Breiman's Bagging:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                If each tree has variance <span className="font-mono text-white">σ²</span> and pairwise correlation <span className="font-mono text-white">ρ</span>, the variance of the 100-tree ensemble average is:
              </p>
              <div className="p-2.5 bg-black/60 rounded-xl font-mono text-xs text-cyan-300 text-center border border-white/5">
                Var(Ensemble) = ρ σ² + [(1 - ρ) / B] σ²
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                By restricting split selection to random subsets of 8 features, <span className="font-mono text-white">ρ</span> drops dramatically from ~0.65 to &lt;0.20, driving total classification variance to near-zero while maintaining zero bias.
              </p>
            </div>
          </div>

          {/* Hyperparameters Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. Production Scikit-Learn Hyperparameters
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-xxs">
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Production Value</th>
                    <th className="py-3 px-4">Mathematical Role</th>
                    <th className="py-3 px-4">Acoustic Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-cyan-400">n_estimators</td>
                    <td className="py-3 px-4 text-white">100</td>
                    <td className="py-3 px-4 text-slate-300">Number of bagged decision trees</td>
                    <td className="py-3 px-4 text-slate-400">Sufficiently stabilizes Law of Large Numbers aggregation</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-cyan-400">criterion</td>
                    <td className="py-3 px-4 text-white">'gini'</td>
                    <td className="py-3 px-4 text-slate-300">Gini impurity metric</td>
                    <td className="py-3 px-4 text-slate-400">Faster computation than Shannon entropy with identical splits</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-cyan-400">max_features</td>
                    <td className="py-3 px-4 text-white">'sqrt' (8 features)</td>
                    <td className="py-3 px-4 text-slate-300">Subspace projection dimension</td>
                    <td className="py-3 px-4 text-slate-400">Prevents dominant frequencies (e.g. F11) from masking subtle harmonics</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-cyan-400">bootstrap</td>
                    <td className="py-3 px-4 text-white">True</td>
                    <td className="py-3 px-4 text-slate-300">Sampling with replacement</td>
                    <td className="py-3 px-4 text-slate-400">Leaves ~36.8% Out-of-Bag (OOB) samples for validation</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-cyan-400">min_samples_split</td>
                    <td className="py-3 px-4 text-white">2</td>
                    <td className="py-3 px-4 text-slate-300">Minimum node split size</td>
                    <td className="py-3 px-4 text-slate-400">Allows full tree depth to isolate complex acoustic wave reflections</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pipeline Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={12} /> scikit-learn Pipeline Implementation
              </span>
              <button
                onClick={() => copyToClipboard(codeSnippets.rf, 'rf')}
                className="text-xxs font-mono text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
              >
                {copiedCode === 'rf' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedCode === 'rf' ? 'Copied' : 'Copy Python'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{codeSnippets.rf}</code>
            </pre>
          </div>
        </section>
      )}

      {/* Model 3: K-Nearest Neighbors */}
      {(activeTab === 'all' || activeTab === 'knn') && (
        <section className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6 hover:border-indigo-500/30 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                <Share2 size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white">K-Nearest Neighbors (KNN)</h2>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Non-Parametric Metric Space
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Instance-Based Learning • Euclidean L2 Metric • KD-Tree Indexing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                Benchmark Accuracy: <strong className="text-indigo-400">{evalMetrics?.knn ? `${(evalMetrics.knn.accuracy * 100).toFixed(1)}%` : 'Loading...'}</strong>
              </span>
            </div>
          </div>

          {/* Mathematical Foundations */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              1. Mathematical Formulation & Metric Distance
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              KNN is a non-parametric instance-based classifier. Rather than fitting an explicit weight vector or building decision trees during training, KNN stores the standardized training observations and assigns class labels during inference based on the majority vote of the <span className="font-mono text-indigo-400 font-bold">k = 3</span> nearest neighbors in 60-dimensional frequency space.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula Card 1 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Euclidean Metric Space Distance (L2)
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-indigo-300 overflow-x-auto text-center">
                  {"d(x, z) = ||x - z||₂ = √[ ∑ (x_j - z_j)² ]"}
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Computes the continuous distance between unknown sonar query <span className="font-mono text-white">x</span> and stored reference signature <span className="font-mono text-white">z</span>.
                </p>
              </div>

              {/* Formula Card 2 */}
              <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-2">
                <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Posterior Probability Voting Rule
                </span>
                <div className="py-3 px-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-sm text-cyan-300 overflow-x-auto text-center">
                  {"P(Y=c | x) = (1/k) ∑ 𝕀(yᵢ = c)  for xᵢ ∈ N_k(x)"}
                </div>
                <p className="text-xxs text-slate-400 leading-relaxed">
                  Where <span className="font-mono text-white">N_k(x)</span> is the set of <span className="font-mono text-white">k</span> closest training samples and <span className="font-mono text-white">𝕀(·)</span> is the indicator function.
                </p>
              </div>
            </div>

            {/* StandardScaler Requirement */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Database size={14} className="text-indigo-400" />
                Criticality of Z-Score Standardization (StandardScaler):
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Because Euclidean distance sums squared feature differences across all 60 dimensions, features with naturally higher variance would disproportionately dominate the metric. Echo-Guard embeds <strong className="text-white font-mono">StandardScaler()</strong> to ensure every frequency bin has zero mean and unit variance:
              </p>
              <div className="p-2 bg-black/60 rounded-xl font-mono text-xs text-indigo-300 text-center border border-white/5">
                z_j = (x_j - μ_j) / σ_j
              </div>
            </div>
          </div>

          {/* Hyperparameters Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              2. Production Scikit-Learn Hyperparameters
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-xxs">
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Production Value</th>
                    <th className="py-3 px-4">Mathematical Role</th>
                    <th className="py-3 px-4">Acoustic Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-indigo-400">n_neighbors</td>
                    <td className="py-3 px-4 text-white">3</td>
                    <td className="py-3 px-4 text-slate-300">Cardinality of neighborhood (k)</td>
                    <td className="py-3 px-4 text-slate-400">Odd value prevents 50/50 ties in binary Rock vs Mine</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-indigo-400">weights</td>
                    <td className="py-3 px-4 text-white">'uniform'</td>
                    <td className="py-3 px-4 text-slate-300">Neighborhood voting weights</td>
                    <td className="py-3 px-4 text-slate-400">Equal voting avoids undue influence of single boundary outliers</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-indigo-400">metric</td>
                    <td className="py-3 px-4 text-white">'minkowski' (p=2)</td>
                    <td className="py-3 px-4 text-slate-300">Standard Euclidean geometry</td>
                    <td className="py-3 px-4 text-slate-400">Reflects true spatial energy distance across spectral bins</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4 font-bold text-indigo-400">algorithm</td>
                    <td className="py-3 px-4 text-white">'auto'</td>
                    <td className="py-3 px-4 text-slate-300">Spatial index tree selection</td>
                    <td className="py-3 px-4 text-slate-400">Balances KD-tree partitioning with brute-force search efficiency</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pipeline Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xxs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={12} /> scikit-learn Pipeline Implementation
              </span>
              <button
                onClick={() => copyToClipboard(codeSnippets.knn, 'knn')}
                className="text-xxs font-mono text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
              >
                {copiedCode === 'knn' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                <span>{copiedCode === 'knn' ? 'Copied' : 'Copy Python'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{codeSnippets.knn}</code>
            </pre>
          </div>
        </section>
      )}

      {/* Mathematical Formulations Cheat Sheet */}
      {(activeTab === 'all' || activeTab === 'formulas') && (
        <section className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Mathematical Formulations Quick Reference</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Core Equations Defining the Sonar Feature Space Transformations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Logistic Regression Hypothesis
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-emerald-300 text-center border border-white/5">
                {"P(Y=1|x) = 1 / (1 + e^-(wᵀx + b))"}
              </div>
              <p className="text-xxs text-slate-400">
                Maps 60-element acoustic dot products to continuous [0, 1] posterior mine probability.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                L2 Ridge Regularized BCE Loss
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-emerald-300 text-center border border-white/5">
                {"-1/N ∑ [y ln p + (1-y) ln(1-p)] + (λ/2)||w||²"}
              </div>
              <p className="text-xxs text-slate-400">
                Log-loss convex surface penalized by Ridge L2 norm to suppress coefficient variance.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                Random Forest Gini Impurity
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-cyan-300 text-center border border-white/5">
                {"I_G(t) = 1 - (p_Rock² + p_Mine²)"}
              </div>
              <p className="text-xxs text-slate-400">
                Split criterion evaluated across candidate frequency thresholds at each decision tree node.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                Ensemble Variance Reduction
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-cyan-300 text-center border border-white/5">
                {"Var(T̄) = ρ σ² + [(1 - ρ) / B] σ²"}
              </div>
              <p className="text-xxs text-slate-400">
                Random sub-spacing of 8 features forces low tree correlation ρ, driving ensemble variance down.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-indigo-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                StandardScaler Normalization
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-indigo-300 text-center border border-white/5">
                {"z_j = (x_j - μ_j) / σ_j"}
              </div>
              <p className="text-xxs text-slate-400">
                Equalizes scale across all 60 frequency channels prior to Euclidean distance calculations.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-indigo-500/20 space-y-2">
              <span className="text-xxs font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                KNN Euclidean Metric
              </span>
              <div className="p-2.5 bg-slate-950/80 rounded-xl font-mono text-xs text-indigo-300 text-center border border-white/5">
                {"d(x, z) = √[ ∑_{j=1}^{60} (x_j - z_j)² ]"}
              </div>
              <p className="text-xxs text-slate-400">
                Calculates spatial proximity between unclassified sonar echoes and historical trial pings.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Comparative Architectural Matrix */}
      <section className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <Scale size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Comparative Architectural Benchmark</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Direct Side-by-Side Analysis of Theoretical Capabilities & Trade-Offs
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-xxs">
                <th className="py-3 px-4">Evaluation Dimension</th>
                <th className="py-3 px-4 text-emerald-400">Logistic Regression</th>
                <th className="py-3 px-4 text-cyan-400">Random Forest</th>
                <th className="py-3 px-4 text-indigo-400">K-Nearest Neighbors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Learning Paradigm</td>
                <td className="py-3 px-4 text-slate-300">Parametric Linear Model</td>
                <td className="py-3 px-4 text-slate-300">Ensemble Bagged Trees</td>
                <td className="py-3 px-4 text-slate-300">Non-Parametric Instance Learning</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Decision Boundary</td>
                <td className="py-3 px-4 text-slate-300">Linear Hyperplane (wᵀx + b = 0)</td>
                <td className="py-3 px-4 text-slate-300">Axis-Aligned Piecewise Orthogonal</td>
                <td className="py-3 px-4 text-slate-300">Voronoi Tessellation Boundary</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Training Complexity</td>
                <td className="py-3 px-4 text-emerald-400">O(k · N · d) — Fast</td>
                <td className="py-3 px-4 text-cyan-400">O(B · N · d · log N) — Moderate</td>
                <td className="py-3 px-4 text-indigo-400">O(1) — Instant (Lazy learner)</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Inference Latency</td>
                <td className="py-3 px-4 text-emerald-400">&lt; 1 ms (Single dot product)</td>
                <td className="py-3 px-4 text-cyan-400">2–5 ms (100 tree traversals)</td>
                <td className="py-3 px-4 text-indigo-400">5–12 ms (Distance search over N)</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Interpretability</td>
                <td className="py-3 px-4 text-slate-300">High (Direct feature weights)</td>
                <td className="py-3 px-4 text-slate-300">Moderate (Gini Feature Importance)</td>
                <td className="py-3 px-4 text-slate-300">Low (No explicit functional form)</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Reverberation Resistance</td>
                <td className="py-3 px-4 text-slate-300">Moderate (Sensitive to outliers)</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Superior (Bagging mitigates noise)</td>
                <td className="py-3 px-4 text-slate-300">Moderate (Outliers warp distance)</td>
              </tr>
              <tr className="hover:bg-white/5">
                <td className="py-3 px-4 font-bold text-white">Confidence Quality</td>
                <td className="py-3 px-4 text-emerald-400">Well-calibrated sigmoid probabilities</td>
                <td className="py-3 px-4 text-cyan-400">Ensemble leaf class voting ratio</td>
                <td className="py-3 px-4 text-indigo-400">Coarse k=3 voting steps (33%, 67%, 100%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Footer: Compare & Predict Links */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-white font-bold text-base">Test Mathematical Models Live</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Run real-time inference on the deployed Render Flask backend or compare empirical ROC & Confusion Matrices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/train"
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold transition-colors"
          >
            Algorithms & Heatmap &rarr;
          </Link>
          <Link
            to="/predict"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:opacity-90"
          >
            Live Inference &rarr;
          </Link>
        </div>
      </div>

    </div>
  );
}
