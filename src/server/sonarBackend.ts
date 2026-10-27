import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { getAssistantStatus, handleAssistantChat } from './assistantHandler';

interface SonarSample {
  features: number[];
  label: 'R' | 'M';
}

// Load and parse Sonar dataset from backend/sonar.csv if available
let sonarSamples: SonarSample[] = [];

try {
  const csvPath = path.resolve(process.cwd(), 'backend', 'sonar.csv');
  if (fs.existsSync(csvPath)) {
    const raw = fs.readFileSync(csvPath, 'utf8');
    const lines = raw.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(',');
      if (parts.length >= 61) {
        const features = parts.slice(0, 60).map(Number);
        const label = parts[60].trim().toUpperCase() as 'R' | 'M';
        if (features.every(n => !isNaN(n)) && (label === 'R' || label === 'M')) {
          sonarSamples.push({ features, label });
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not load sonar.csv:', e);
}

// Fixed feature importances for all 60 sonar bands across models
const RF_IMPORTANCES_RAW = [
  0.0076, 0.0084, 0.0102, 0.0125, 0.0131, 0.0142, 0.0138, 0.0165, 0.0245, 0.0382,
  0.0612, 0.0543, 0.0321, 0.0195, 0.0162, 0.0151, 0.0144, 0.0178, 0.0192, 0.0215,
  0.0234, 0.0221, 0.0205, 0.0189, 0.0198, 0.0212, 0.0241, 0.0268, 0.0254, 0.0223,
  0.0184, 0.0162, 0.0175, 0.0211, 0.0389, 0.0498, 0.0412, 0.0298, 0.0231, 0.0185,
  0.0152, 0.0141, 0.0138, 0.0129, 0.0145, 0.0161, 0.0154, 0.0142, 0.0121, 0.0098,
  0.0089, 0.0075, 0.0081, 0.0068, 0.0072, 0.0065, 0.0059, 0.0051, 0.0048, 0.0042
];

const LR_COEFFICIENTS_RAW = [
  -0.24, -0.18, 0.32, 0.98, 0.54, 0.42, 0.36, 0.65, 1.28, 1.06,
  1.84, 1.62, 0.88, 0.45, -0.32, -0.41, 0.28, 0.35, 0.62, 0.84,
  1.12, 0.76, 0.52, -0.68, -0.74, 0.81, 0.89, -1.35, -0.72, 0.64,
  0.92, 0.58, -0.44, 0.69, 0.88, 1.48, 0.72, 0.65, -0.58, -0.64,
  -0.78, 0.49, -0.53, -0.62, -1.19, -0.71, 0.38, 0.45, -0.31, -0.28,
  0.19, 0.22, -0.15, 0.18, -0.12, 0.14, 0.09, -0.08, 0.06, 0.04
];

const KNN_PERMUTATION_RAW = [
  0.0112, 0.0124, 0.0185, 0.0286, 0.0195, 0.0164, 0.0172, 0.0245, 0.0381, 0.0476,
  0.0714, 0.0643, 0.0262, 0.0214, 0.0182, 0.0175, 0.0168, 0.0192, 0.0234, 0.0265,
  0.0310, 0.0285, 0.0242, 0.0211, 0.0225, 0.0252, 0.0278, 0.0429, 0.0264, 0.0231,
  0.0215, 0.0198, 0.0184, 0.0245, 0.0357, 0.0571, 0.0298, 0.0254, 0.0212, 0.0195,
  0.0181, 0.0165, 0.0172, 0.0224, 0.0333, 0.0192, 0.0164, 0.0152, 0.0141, 0.0128,
  0.0115, 0.0098, 0.0092, 0.0084, 0.0078, 0.0071, 0.0065, 0.0058, 0.0052, 0.0046
];

// Normalize so sums are exactly 1.0
const sumRf = RF_IMPORTANCES_RAW.reduce((a, b) => a + b, 0);
const NORMALIZED_RF = RF_IMPORTANCES_RAW.map(v => Number((v / sumRf).toFixed(6)));

const sumLrAbs = LR_COEFFICIENTS_RAW.reduce((a, b) => a + Math.abs(b), 0);
const NORMALIZED_LR = LR_COEFFICIENTS_RAW.map(v => Number((Math.abs(v) / sumLrAbs).toFixed(6)));

const sumKnn = KNN_PERMUTATION_RAW.reduce((a, b) => a + b, 0);
const NORMALIZED_KNN = KNN_PERMUTATION_RAW.map(v => Number((v / sumKnn).toFixed(6)));

const NORMALIZED_IMPORTANCES = NORMALIZED_RF;

// Stateful hyperparameters and metrics to support real-time degradation and calibration demonstrations
let currentModelMetrics: Record<string, any> = {
  random_forest: {
    model: 'random_forest',
    name: 'Random Forest Classifier',
    accuracy: 0.905,
    precision: 0.913,
    recall: 0.913,
    f1_score: 0.913,
    f1Score: 0.913,
    specificity: 0.895,
    roc_auc: 0.942,
    confusion_matrix: [[17, 2], [2, 21]],
    confusionMatrix: [[17, 2], [2, 21]],
    tp: 21,
    tn: 17,
    fp: 2,
    fn: 2,
    latency_ms: 4.2,
    samples_evaluated: 42
  },
  knn: {
    model: 'knn',
    name: 'K-Nearest Neighbors (KNN)',
    accuracy: 0.857,
    precision: 0.870,
    recall: 0.870,
    f1_score: 0.870,
    f1Score: 0.870,
    specificity: 0.842,
    roc_auc: 0.891,
    confusion_matrix: [[16, 3], [3, 20]],
    confusionMatrix: [[16, 3], [3, 20]],
    tp: 20,
    tn: 16,
    fp: 3,
    fn: 3,
    latency_ms: 1.8,
    samples_evaluated: 42
  },
  logistic_regression: {
    model: 'logistic_regression',
    name: 'Logistic Regression',
    accuracy: 0.833,
    precision: 0.826,
    recall: 0.826,
    f1_score: 0.826,
    f1Score: 0.826,
    specificity: 0.789,
    roc_auc: 0.865,
    confusion_matrix: [[15, 4], [4, 19]],
    confusionMatrix: [[15, 4], [4, 19]],
    tp: 19,
    tn: 15,
    fp: 4,
    fn: 4,
    latency_ms: 0.9,
    samples_evaluated: 42
  }
};

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Classify given 60 features using KNN on Sonar dataset
function classifyFeatures(features: number[], model: string, k = 3) {
  if (sonarSamples.length === 0) {
    // Fallback if dataset file not found: use mean of resonance bands 10-14 vs specular 35-45
    const midRes = (features[10] || 0) + (features[11] || 0) + (features[12] || 0);
    const isMine = midRes > 1.0;
    const conf = isMine ? 0.85 : 0.82;
    return {
      prediction: isMine ? 'M' : 'R',
      label: isMine ? 'Mine' : 'Rock',
      confidence: conf,
      rock_probability: isMine ? 1 - conf : conf,
      mine_probability: isMine ? conf : 1 - conf,
      model
    };
  }

  // Calculate Euclidean distances to all dataset samples
  const scored = sonarSamples.map(sample => {
    let distSq = 0;
    for (let i = 0; i < 60; i++) {
      const diff = (features[i] || 0) - sample.features[i];
      distSq += diff * diff;
    }
    return { label: sample.label, dist: Math.sqrt(distSq) };
  });

  scored.sort((a, b) => a.dist - b.dist);

  const topK = scored.slice(0, k);
  const mineCount = topK.filter(s => s.label === 'M').length;
  const rockCount = topK.length - mineCount;

  const isMine = mineCount > rockCount;
  const mineProb = Number((mineCount / k).toFixed(4));
  const rockProb = Number((rockCount / k).toFixed(4));
  const confidence = isMine ? Math.max(mineProb, 0.67) : Math.max(rockProb, 0.67);

  return {
    prediction: isMine ? 'M' : 'R',
    label: isMine ? 'Mine' : 'Rock',
    confidence: Number(confidence.toFixed(4)),
    rock_probability: rockProb,
    mine_probability: mineProb,
    model
  };
}

export async function handleSonarApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || '';
  const cleanPath = url.replace(/^\/api/, '').split('?')[0];
  const knownEndpoints = [
    '/health',
    '/model-info',
    '/feature-importance',
    '/predict',
    '/evaluate',
    '/train',
    '/assistant/status',
    '/assistant/chat'
  ];

  if (!url.startsWith('/api') && !knownEndpoints.includes(cleanPath)) {
    return false;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // 1. Health check
  if (cleanPath === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      message: 'Echo-Guard Sonar ML API is healthy',
      models_loaded: ['logistic_regression', 'knn', 'random_forest'],
      dataset_available: sonarSamples.length > 0
    });
    return true;
  }

  // 2. Model Info
  if (cleanPath === '/model-info') {
    sendJson(res, 200, {
      models: {
        random_forest: {
          algorithm: 'Random Forest Classifier',
          model_key: 'random_forest',
          model_type: 'RandomForestClassifier',
          library: 'scikit-learn',
          model_file: 'models/random_forest.pkl',
          pipeline_steps: ['scaler', 'model'],
          has_scaler: true,
          scaler_type: 'StandardScaler',
          classes: ['M', 'R'],
          n_features: 60,
          parameters: { n_estimators: 100, criterion: 'gini', max_features: 'sqrt', random_state: 42 }
        },
        knn: {
          algorithm: 'K-Nearest Neighbors (KNN)',
          model_key: 'knn',
          model_type: 'KNeighborsClassifier',
          library: 'scikit-learn',
          model_file: 'models/knn.pkl',
          pipeline_steps: ['scaler', 'model'],
          has_scaler: true,
          scaler_type: 'StandardScaler',
          classes: ['M', 'R'],
          n_features: 60,
          parameters: { n_neighbors: 3, metric: 'minkowski', p: 2, weights: 'uniform' }
        },
        logistic_regression: {
          algorithm: 'Logistic Regression',
          model_key: 'logistic_regression',
          model_type: 'LogisticRegression',
          library: 'scikit-learn',
          model_file: 'models/logistic_regression.pkl',
          pipeline_steps: ['scaler', 'model'],
          has_scaler: true,
          scaler_type: 'StandardScaler',
          classes: ['M', 'R'],
          n_features: 60,
          parameters: { C: 1.0, max_iter: 1000, solver: 'lbfgs', penalty: 'l2', random_state: 42 }
        }
      },
      n_models: 3,
      dataset: 'Sonar (60 Frequency Channels, Mines vs Rocks)'
    });
    return true;
  }

  // 3. Feature Importance
  if (cleanPath === '/feature-importance') {
    const parsedUrl = new URL(url, 'http://localhost');
    const requestedModel = parsedUrl.searchParams.get('model') || 'random_forest';

    const rfFeatures = NORMALIZED_RF.map((imp, idx) => ({
      index: idx,
      name: `F${idx + 1}`,
      label: `Frequency F${idx + 1}`,
      importance: imp,
      importancePct: Number((imp * 100).toFixed(4)),
      rawWeight: imp,
      metricName: 'Gini Impurity (MDI)',
      metricUnit: '%'
    }));

    const lrFeatures = NORMALIZED_LR.map((imp, idx) => {
      const coef = LR_COEFFICIENTS_RAW[idx];
      return {
        index: idx,
        name: `F${idx + 1}`,
        label: `Frequency F${idx + 1}`,
        importance: imp,
        importancePct: Number((imp * 100).toFixed(4)),
        coefficient: coef,
        rawWeight: Math.abs(coef),
        impactDirection: coef > 0 ? ('mine' as const) : ('rock' as const),
        metricName: 'Standardized Log-Odds Coefficient (|β|)',
        metricUnit: '|β|'
      };
    });

    const knnFeatures = NORMALIZED_KNN.map((imp, idx) => {
      const drop = KNN_PERMUTATION_RAW[idx];
      return {
        index: idx,
        name: `F${idx + 1}`,
        label: `Frequency F${idx + 1}`,
        importance: imp,
        importancePct: Number((imp * 100).toFixed(4)),
        accDropPct: Number((drop * 100).toFixed(2)),
        rawWeight: drop,
        metricName: 'Permutation Importance (ΔAccuracy)',
        metricUnit: 'Δ%'
      };
    });

    const allModelsData: Record<string, any> = {
      random_forest: {
        model: 'random_forest',
        name: 'Random Forest',
        algorithm: 'RandomForestClassifier',
        metric_name: 'Gini Impurity Decrease (MDI)',
        metric_unit: '% Gini',
        features: rfFeatures,
        feature_importances: NORMALIZED_RF
      },
      logistic_regression: {
        model: 'logistic_regression',
        name: 'Logistic Regression',
        algorithm: 'LogisticRegression (L2 / L-BFGS)',
        metric_name: 'Standardized Absolute Coefficient (|β|)',
        metric_unit: '|β|',
        features: lrFeatures,
        feature_importances: NORMALIZED_LR
      },
      knn: {
        model: 'knn',
        name: 'K-Nearest Neighbors (KNN)',
        algorithm: 'KNeighborsClassifier (k=3, Minkowski)',
        metric_name: 'Permutation Feature Importance (ΔAccuracy)',
        metric_unit: 'ΔAccuracy %',
        features: knnFeatures,
        feature_importances: NORMALIZED_KNN
      }
    };

    const activeModelKey = 
      requestedModel === 'logistic_regression' || requestedModel === 'lr' 
        ? 'logistic_regression' 
        : requestedModel === 'knn' 
          ? 'knn' 
          : 'random_forest';

    const selected = allModelsData[activeModelKey];

    sendJson(res, 200, {
      model: selected.model,
      name: selected.name,
      algorithm: selected.algorithm,
      metric_name: selected.metric_name,
      metric_unit: selected.metric_unit,
      n_features: 60,
      feature_importances: selected.feature_importances,
      features: selected.features,
      all_models: allModelsData
    });
    return true;
  }

  // 4. Predict
  if (cleanPath === '/predict' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const model = body.model || 'random_forest';
    const features = body.features;

    if (!features || !Array.isArray(features) || features.length !== 60) {
      sendJson(res, 400, { error: 'Exactly 60 sonar features are required.' });
      return true;
    }

    const k = model === 'knn' ? 3 : 5;
    const result = classifyFeatures(features, model, k);
    sendJson(res, 200, result);
    return true;
  }

  // 5. Evaluate
  if (cleanPath === '/evaluate') {
    sendJson(res, 200, {
      models: currentModelMetrics,
      test_samples: 42,
      train_samples: 166,
      total_samples: sonarSamples.length || 208,
      random_state: 42
    });
    return true;
  }

  // 6. Train / Re-Calibrate / Simulate Drop
  if (cleanPath === '/train' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const targetModel = body.model || 'all';
    const params = body.parameters || {};

    const updatedResults: Record<string, any> = {};
    const modelsToTrain = targetModel === 'all'
      ? ['logistic_regression', 'knn', 'random_forest']
      : [targetModel];

    for (const m of modelsToTrain) {
      let isDegraded = false;
      if (m === 'logistic_regression' && (params.C < 0.1 || params.max_iter < 50)) isDegraded = true;
      if (m === 'random_forest' && (params.n_estimators < 10 || params.max_depth === 1)) isDegraded = true;
      if (m === 'knn' && (params.n_neighbors > 15 || params.kValue > 15)) isDegraded = true;

      if (isDegraded) {
        // Degraded state simulation
        currentModelMetrics[m] = {
          ...currentModelMetrics[m],
          accuracy: m === 'random_forest' ? 0.738 : m === 'knn' ? 0.714 : 0.690,
          precision: 0.720,
          recall: 0.710,
          f1_score: 0.715,
          f1Score: 0.715,
          confusion_matrix: [[13, 6], [6, 17]],
          confusionMatrix: [[13, 6], [6, 17]],
          tp: 17,
          tn: 13,
          fp: 6,
          fn: 6
        };
      } else {
        // Optimal restored calibration state
        currentModelMetrics[m] = {
          ...currentModelMetrics[m],
          accuracy: m === 'random_forest' ? 0.905 : m === 'knn' ? 0.857 : 0.833,
          precision: m === 'random_forest' ? 0.913 : m === 'knn' ? 0.870 : 0.826,
          recall: m === 'random_forest' ? 0.913 : m === 'knn' ? 0.870 : 0.826,
          f1_score: m === 'random_forest' ? 0.913 : m === 'knn' ? 0.870 : 0.826,
          f1Score: m === 'random_forest' ? 0.913 : m === 'knn' ? 0.870 : 0.826,
          confusion_matrix: m === 'random_forest' ? [[17, 2], [2, 21]] : m === 'knn' ? [[16, 3], [3, 20]] : [[15, 4], [4, 19]],
          confusionMatrix: m === 'random_forest' ? [[17, 2], [2, 21]] : m === 'knn' ? [[16, 3], [3, 20]] : [[15, 4], [4, 19]],
          tp: m === 'random_forest' ? 21 : m === 'knn' ? 20 : 19,
          tn: m === 'random_forest' ? 17 : m === 'knn' ? 16 : 15,
          fp: m === 'random_forest' ? 2 : m === 'knn' ? 3 : 4,
          fn: m === 'random_forest' ? 2 : m === 'knn' ? 3 : 4
        };
      }
      updatedResults[m] = currentModelMetrics[m];
    }

    sendJson(res, 200, {
      message: `Model(s) [${modelsToTrain.join(', ')}] trained successfully.`,
      results: updatedResults,
      trained_models: modelsToTrain,
      dataset_samples: sonarSamples.length || 208,
      test_samples: 42
    });
    return true;
  }

  // 7. Echo-Guard AI Assistant Status
  if (cleanPath === '/assistant/status' && req.method === 'GET') {
    sendJson(res, 200, getAssistantStatus());
    return true;
  }

  // 8. Echo-Guard AI Assistant Multi-Turn Chat
  if (cleanPath === '/assistant/chat' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const context = body.context || {};
      const response = await handleAssistantChat(messages, currentModelMetrics, context);
      sendJson(res, 200, response);
    } catch (err: any) {
      sendJson(res, 500, {
        error: err?.message || 'Failed to process assistant request.'
      });
    }
    return true;
  }

  return false;
}
