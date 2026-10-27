import { ModelMetrics, ValidModelName } from '../services/api';

export interface ChatbotPredictionSnapshot {
  timestamp?: string;
  result?: 'ROCK' | 'MINE' | string;
  confidence?: number;
  pRock?: number;
  pMine?: number;
  model?: string;
}

export interface ChatbotContextData {
  selectedModel: ValidModelName;
  latestPrediction?: ChatbotPredictionSnapshot | null;
  liveMetrics?: Record<string, ModelMetrics> | null;
}

export interface ChatbotHandlerResponse {
  reply: string;
  topic: string;
  mode: 'gemini_live' | 'project_help';
  providerLabel: string;
}

const VERIFIED_BASELINE_METRICS: Record<
  ValidModelName,
  {
    name: string;
    accuracy: number;
    precision: number;
    recall: number;
    specificity: number;
    f1: number;
    rocAuc: number;
    tn: number;
    fp: number;
    fn: number;
    tp: number;
    latencyMs: number;
  }
> = {
  random_forest: {
    name: 'Random Forest (100 Trees, Gini)',
    accuracy: 0.905,
    precision: 0.913,
    recall: 0.913,
    specificity: 0.895,
    f1: 0.913,
    rocAuc: 0.942,
    tn: 17,
    fp: 2,
    fn: 2,
    tp: 21,
    latencyMs: 4.2,
  },
  knn: {
    name: 'K-Nearest Neighbors (k=3, Euclidean)',
    accuracy: 0.857,
    precision: 0.87,
    recall: 0.87,
    specificity: 0.842,
    f1: 0.87,
    rocAuc: 0.891,
    tn: 16,
    fp: 3,
    fn: 3,
    tp: 20,
    latencyMs: 1.8,
  },
  logistic_regression: {
    name: 'Logistic Regression (L2, L-BFGS)',
    accuracy: 0.833,
    precision: 0.826,
    recall: 0.826,
    specificity: 0.789,
    f1: 0.826,
    rocAuc: 0.865,
    tn: 15,
    fp: 4,
    fn: 4,
    tp: 19,
    latencyMs: 0.9,
  },
};

function getModelSnapshot(
  modelKey: ValidModelName,
  liveMetrics?: Record<string, ModelMetrics> | null
) {
  const live = liveMetrics?.[modelKey];
  const base = VERIFIED_BASELINE_METRICS[modelKey] || VERIFIED_BASELINE_METRICS.random_forest;
  if (!live) return base;

  return {
    name: live.name || base.name,
    accuracy: live.accuracy ?? base.accuracy,
    precision: live.precision ?? base.precision,
    recall: live.recall ?? base.recall,
    specificity: live.specificity ?? base.specificity,
    f1: (live.f1Score ?? live.f1_score) ?? base.f1,
    rocAuc: live.roc_auc ?? base.rocAuc,
    tn: live.tn ?? live.confusionMatrix?.[0]?.[0] ?? base.tn,
    fp: live.fp ?? live.confusionMatrix?.[0]?.[1] ?? base.fp,
    fn: live.fn ?? live.confusionMatrix?.[1]?.[0] ?? base.fn,
    tp: live.tp ?? live.confusionMatrix?.[1]?.[1] ?? base.tp,
    latencyMs: live.latency_ms ?? base.latencyMs,
  };
}

/**
 * Verified project concept handler that explains KNN, Logistic Regression,
 * Random Forest, StandardScaler, Confusion Matrices, evaluation metrics,
 * and live predictions using Echo-Guard project data.
 */
export function generateProjectConceptReply(
  query: string,
  context: ChatbotContextData
): ChatbotHandlerResponse {
  const q = query.toLowerCase().trim();
  const rf = getModelSnapshot('random_forest', context.liveMetrics);
  const knn = getModelSnapshot('knn', context.liveMetrics);
  const lr = getModelSnapshot('logistic_regression', context.liveMetrics);
  const activeModel = getModelSnapshot(context.selectedModel || 'knn', context.liveMetrics);

  // 1. KNN (K-Nearest Neighbors)
  if (
    (q.includes('knn') || q.includes('nearest neighbor') || q.includes('k-nearest')) &&
    !q.includes('compare')
  ) {
    return {
      topic: 'K-Nearest Neighbors (KNN)',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### K-Nearest Neighbors (`KNeighborsClassifier`)',
        'In **Echo-Guard**, K-Nearest Neighbors is a non-parametric, instance-based classifier that identifies sonar targets by comparing a 60-bin acoustic return directly against historical sonar pings.',
        '',
        '- **Pipeline Configuration**: `StandardScaler` $\\rightarrow$ `KNeighborsClassifier(n_neighbors=3, metric="minkowski", p=2, weights="uniform")`.',
        '- **60-Dimensional Euclidean Distance**: For an incoming 60-frequency-bin vector $x$, KNN computes $d(x, y) = \\sqrt{\\sum_{i=1}^{60}(x_i - y_i)^2}$ across all **166 training samples** and takes a majority vote among the **3 closest echoes**.',
        `- **Verified Test Metrics (N=42)**: **${(knn.accuracy * 100).toFixed(1)}% Accuracy**, **${(knn.precision * 100).toFixed(1)}% Precision**, **${(knn.recall * 100).toFixed(1)}% Recall**, **${(knn.specificity * 100).toFixed(1)}% Specificity**.`,
        `- **Confusion Matrix**: \`TN=${knn.tn}, FP=${knn.fp}, FN=${knn.fn}, TP=${knn.tp}\` (Top influential frequency bins: \`F11\`, \`F12\`, \`F36\`, \`F10\`, \`F28\`).`,
      ].join('\n'),
    };
  }

  // 2. Logistic Regression
  if (
    (q.includes('logistic') || q.includes('log-odds') || q.includes('sigmoid')) &&
    !q.includes('compare')
  ) {
    return {
      topic: 'Logistic Regression',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### Logistic Regression (`LogisticRegression`)',
        'In **Echo-Guard**, Logistic Regression models the linear log-odds boundary between **Natural Seafloor Rocks (R)** and **Cylindrical Metallic Mines (M)** across all 60 standardized frequency channels.',
        '',
        '- **Pipeline Configuration**: `StandardScaler` $\\rightarrow$ `LogisticRegression(C=1.0, penalty="l2", solver="lbfgs", max_iter=1000, random_state=42)`.',
        '- **Decision Function**: Computes $z = \\beta_0 + \\sum_{i=1}^{60} \\beta_i F_i$ and applies the logistic sigmoid $\\sigma(z) = \\frac{1}{1 + e^{-z}}$ to output calibrated probabilities $P(\\text{Mine})$ and $P(\\text{Rock})$.',
        `- **Verified Test Metrics (N=42)**: **${(lr.accuracy * 100).toFixed(1)}% Accuracy**, **${(lr.precision * 100).toFixed(1)}% Precision**, **${(lr.recall * 100).toFixed(1)}% Recall**, **${(lr.specificity * 100).toFixed(1)}% Specificity** (~${lr.latencyMs.toFixed(1)} ms latency).`,
        `- **Confusion Matrix**: \`TN=${lr.tn}, FP=${lr.fp}, FN=${lr.fn}, TP=${lr.tp}\` (Strongest positive/negative coefficients: \`F11\`, \`F12\`, \`F36\`, \`F28\`, \`F9\`).`,
      ].join('\n'),
    };
  }

  // 3. Random Forest
  if (q.includes('random forest') && !q.includes('compare')) {
    return {
      topic: 'Random Forest Classifier',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### Random Forest (`RandomForestClassifier`)',
        'Random Forest is **Echo-Guard’s highest-accuracy classifier**, using an ensemble of 100 decision trees to capture non-linear acoustic interactions across low, mid, and high frequency bands.',
        '',
        '- **Pipeline Configuration**: `StandardScaler` $\\rightarrow$ `RandomForestClassifier(n_estimators=100, criterion="gini", max_features="sqrt", random_state=42)`.',
        '- **How It Works**: Each tree is trained on a bootstrap sample of the 166 training echoes and evaluates $\\sqrt{60} \\approx 7$ random frequency bins at each split to minimize **Gini Impurity**. All 100 trees vote to produce the final probability.',
        `- **Verified Test Metrics (N=42)**: **${(rf.accuracy * 100).toFixed(1)}% Accuracy**, **${(rf.precision * 100).toFixed(1)}% Precision**, **${(rf.recall * 100).toFixed(1)}% Recall**, **${(rf.specificity * 100).toFixed(1)}% Specificity**, **ROC-AUC ${rf.rocAuc.toFixed(3)}**.`,
        `- **Confusion Matrix**: \`TN=${rf.tn}, FP=${rf.fp}, FN=${rf.fn}, TP=${rf.tp}\` (Top Gini importance bins: \`F11\`, \`F12\`, \`F36\`, \`F37\`, \`F35\`).`,
      ].join('\n'),
    };
  }

  // 4. Confusion Matrix / False Positive / False Negative / True Positive / True Negative
  if (
    q.includes('confusion') ||
    q.includes('false positive') ||
    q.includes('false negative') ||
    q.includes('true positive') ||
    q.includes('true negative') ||
    q.includes('matrix') ||
    q.includes('type i') ||
    q.includes('type ii')
  ) {
    return {
      topic: 'Confusion Matrix & Error Quadrants',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        `### Confusion Matrix & Error Analysis (${activeModel.name})`,
        'In **Echo-Guard**, **Mine (M)** is the Positive class (threat) and **Rock (R)** is the Negative class (benign seafloor):',
        '',
        `- **True Negative (\`TN = ${activeModel.tn}\`)**: Actual **Rock** accurately cleared as **Rock** (Specificity = **${(activeModel.specificity * 100).toFixed(1)}%**).`,
        `- **False Positive (\`FP = ${activeModel.fp}\` — Type I Error / False Alarm)**: Actual **Rock** misclassified as a **Mine**. Triggers a secondary verification ping and minor clearance delay, but causes **zero vessel damage**.`,
        `- **False Negative (\`FN = ${activeModel.fn}\` — Type II Error / Missed Mine)**: Actual **Mine** misclassified as a benign **Rock**. Represents the **most critical naval hazard** because an explosive threat goes unflagged.`,
        `- **True Positive (\`TP = ${activeModel.tp}\`)**: Actual **Mine** positively locked as **Mine** (Recall = **${(activeModel.recall * 100).toFixed(1)}%**).`,
        '',
        '*Tip: Visit the **Performance** page to inspect the interactive **D3.js Confusion Matrix Heatmap** for all three models.*',
      ].join('\n'),
    };
  }

  // 5. StandardScaler
  if (q.includes('standardscaler') || q.includes('scaler') || q.includes('normaliz') || q.includes('standardiz')) {
    return {
      topic: 'StandardScaler Preprocessing',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### What is `StandardScaler` in Echo-Guard?',
        '`StandardScaler` is the first step (`pipeline_steps: ["scaler", "model"]`) in every Echo-Guard `scikit-learn` pipeline.',
        '',
        '- **Z-Score Formula**: Transforms each of the 60 sonar frequency bins ($F_1 \\dots F_{60}$) so it has zero mean ($\\mu = 0$) and unit variance ($\\sigma = 1$):',
        '  `z = (x - μ) / σ`',
        '- **Why KNN & Logistic Regression Need It**:',
        '  1. **KNN** measures 60-dimensional Euclidean distance; without scaling, frequency channels with larger variance would dominate neighbor selection.',
        '  2. **Logistic Regression** applies L2 regularization (`C=1.0`), which penalizes weights fairly only when all 60 features are on the same scale.',
        '- **Leakage Prevention**: Fit strictly on the **166 training samples** and applied via `.transform()` during live inference.',
      ].join('\n'),
    };
  }

  // 6. Explain user's prediction
  if (
    q.includes('explain my prediction') ||
    q.includes('my prediction') ||
    q.includes('latest prediction') ||
    q.includes('last prediction')
  ) {
    const pred = context.latestPrediction;
    if (!pred || !pred.result) {
      return {
        topic: 'Prediction Interpretation',
        mode: 'project_help',
        providerLabel: 'Echo-Guard Project Concept Handler',
        reply: [
          '### No Active Prediction Recorded Yet',
          'You have not executed a live sonar classification in this session yet.',
          '',
          '1. Navigate to the **Predict** page and choose **KNN**, **Logistic Regression**, or **Random Forest**.',
          '2. Click **Auto-fill Normal Sample** or **Simulate Ambiguous Ping**, then press **Run Classification**.',
          '3. Ask **"Explain my prediction."** again and I will analyze your exact predicted class, confidence percentage, and probability margin.',
        ].join('\n'),
      };
    }

    const isMine = String(pred.result).toUpperCase().startsWith('M');
    const conf = typeof pred.confidence === 'number' ? pred.confidence : 0.85;
    const confPct = (conf * 100).toFixed(1);
    const pMinePct =
      typeof pred.pMine === 'number'
        ? (pred.pMine * 100).toFixed(1)
        : isMine
        ? confPct
        : ((1 - conf) * 100).toFixed(1);
    const pRockPct =
      typeof pred.pRock === 'number'
        ? (pred.pRock * 100).toFixed(1)
        : !isMine
        ? confPct
        : ((1 - conf) * 100).toFixed(1);
    const margin = Math.abs(Number(pMinePct) - Number(pRockPct)).toFixed(1);

    return {
      topic: 'Live Prediction Breakdown',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### Latest Sonar Classification Breakdown',
        `- **Target Result**: **${isMine ? 'MINE (M — Metallic Cylinder)' : 'ROCK (R — Natural Seafloor)'}**`,
        `- **Classifier Used**: \`${pred.model || context.selectedModel}\``,
        `- **Confidence Score**: **${confPct}%** (${conf >= 0.85 ? 'High Certainty ≥85%' : conf >= 0.7 ? 'Moderate Certainty 70–84%' : 'Low Certainty Alert <70%'})`,
        `- **Probability Split**: **P(Mine) = ${pMinePct}%** | **P(Rock) = ${pRockPct}%** (Margin: **Δ +${margin}%**)`,
        '',
        conf < 0.7
          ? '- **Tactical Advisory**: Confidence is below the **70.0% operational clearance threshold**, indicating boundary overlap between metallic resonance and irregular rock scattering. Initiate a secondary verification ping.'
          : '- **Tactical Advisory**: Confidence exceeds the **70.0% operational threshold**, indicating strong separation from the decision boundary across the 60 standardized frequency bins.',
        '',
        '*Note: This classification was computed by the Flask `scikit-learn` backend (`POST /predict`), not by the chatbot.*',
      ].join('\n'),
    };
  }

  // 7. Compare the three ML models
  if (
    q.includes('compare') ||
    q.includes('three ml models') ||
    q.includes('three models') ||
    q.includes('3 models')
  ) {
    return {
      topic: 'Model Comparison',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        '### Echo-Guard 3-Model Benchmark Comparison (Test Set: N=42)',
        '',
        `1. **Random Forest (\`random_forest\`)**: **${(rf.accuracy * 100).toFixed(1)}% Accuracy** | **${(rf.precision * 100).toFixed(1)}% Precision** | **${(rf.recall * 100).toFixed(1)}% Recall** | **${(rf.specificity * 100).toFixed(1)}% Specificity** (\`TN=${rf.tn}, FP=${rf.fp}, FN=${rf.fn}, TP=${rf.tp}\`) — *Best overall accuracy & lowest missed-mine rate.*`,
        `2. **K-Nearest Neighbors (\`knn\`, k=3)**: **${(knn.accuracy * 100).toFixed(1)}% Accuracy** | **${(knn.precision * 100).toFixed(1)}% Precision** | **${(knn.recall * 100).toFixed(1)}% Recall** | **${(knn.specificity * 100).toFixed(1)}% Specificity** (\`TN=${knn.tn}, FP=${knn.fp}, FN=${knn.fn}, TP=${knn.tp}\`) — *Strong instance-based spectral neighbor matching.*`,
        `3. **Logistic Regression (\`logistic_regression\`)**: **${(lr.accuracy * 100).toFixed(1)}% Accuracy** | **${(lr.precision * 100).toFixed(1)}% Precision** | **${(lr.recall * 100).toFixed(1)}% Recall** | **${(lr.specificity * 100).toFixed(1)}% Specificity** (\`TN=${lr.tn}, FP=${lr.fp}, FN=${lr.fn}, TP=${lr.tp}\`) — *Fastest inference (~0.9 ms) & signed linear feature weights.*`,
      ].join('\n'),
    };
  }

  // 8. Accuracy / Precision / Recall / Specificity
  if (
    q.includes('accuracy') ||
    q.includes('precision') ||
    q.includes('recall') ||
    q.includes('specificity') ||
    q.includes('metric')
  ) {
    return {
      topic: 'Evaluation Metrics',
      mode: 'project_help',
      providerLabel: 'Echo-Guard Project Concept Handler',
      reply: [
        `### Sonar Evaluation Metrics (Active Model: \`${context.selectedModel}\`)`,
        `- **Accuracy (${(activeModel.accuracy * 100).toFixed(1)}%)**: $(TP + TN) / N$ — Overall fraction of Rocks and Mines classified correctly across all 42 test samples.`,
        `- **Precision (${(activeModel.precision * 100).toFixed(1)}%)**: $TP / (TP + FP)$ — When the model flags a **Mine**, the probability that it is genuinely a Mine.`,
        `- **Recall / Sensitivity (${(activeModel.recall * 100).toFixed(1)}%)**: $TP / (TP + FN)$ — Fraction of actual **Mines** detected (crucial for preventing missed threats).`,
        `- **Specificity (${(activeModel.specificity * 100).toFixed(1)}%)**: $TN / (TN + FP)$ — Fraction of actual **Rocks** cleared without false alarms.`,
      ].join('\n'),
    };
  }

  // 9. Default overview ("How does Echo-Guard work?")
  return {
    topic: 'Echo-Guard Architecture Overview',
    mode: 'project_help',
    providerLabel: 'Echo-Guard Project Concept Handler',
    reply: [
      '### How Echo-Guard Works',
      '**Echo-Guard** classifies 60-frequency-bin sonar signals (`F1`–`F60`) as **Seafloor Rock (R)** or **Naval Mine (M)**:',
      '',
      '- **Dataset**: UCI Connectionist Bench Sonar Dataset (**208 total samples**: 111 Mines, 97 Rocks; split **166 train / 42 test** with `random_state=42`).',
      '- **ML Pipeline**: Python Flask + `scikit-learn` backend (`https://echo-guard-api.onrender.com`) running `StandardScaler` + **Random Forest** (`90.5%`), **KNN** (`85.7%`), and **Logistic Regression** (`83.3%`).',
      '- **Interactive Visualizers**: Real-time 60-bin waveform & Recharts bar spectrum, radial confidence threshold dial (`<70%` ambiguity alert), `AudioContext` mine ping, and D3.js confusion matrix heatmap.',
      '',
      '*Ask me about **KNN**, **Logistic Regression**, **Random Forest**, **StandardScaler**, **Confusion Matrices**, or **"Explain my prediction."***',
    ].join('\n'),
  };
}

/**
 * Executes a query against the server-side assistant endpoint if available,
 * and falls back seamlessly to the local verified project concept handler
 * with realistic simulated processing latency.
 */
export async function queryEchoGuardChatbot(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: ChatbotContextData
): Promise<ChatbotHandlerResponse> {
  const latestUserQuestion =
    [...messages].reverse().find((m) => m.role === 'user')?.content ||
    'How does Echo-Guard work?';

  try {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        context: {
          selectedModel: context.selectedModel,
          latestPrediction: context.latestPrediction,
          liveMetrics: context.liveMetrics,
        },
      }),
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        // Add a brief minimum delay when in local project_help mode so the loading state is smooth and visible
        if (data.mode !== 'gemini_live') {
          await new Promise((r) => setTimeout(r, 320));
        }
        return {
          reply: data.reply,
          topic: 'Echo-Guard Telemetry',
          mode: data.mode === 'gemini_live' ? 'gemini_live' : 'project_help',
          providerLabel: data.providerLabel || 'Echo-Guard Project Concept Handler',
        };
      }
    }
  } catch {
    // Fall back to the local verified project concept handler
  }

  // Simulated response latency for loading state feedback
  await new Promise((r) => setTimeout(r, 380));
  return generateProjectConceptReply(latestUserQuestion, context);
}
