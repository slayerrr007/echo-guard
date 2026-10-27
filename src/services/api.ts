/**
 * Echo-Guard Centralized Machine Learning API Service
 * 
 * Provides unified communication between the React frontend and the
 * scikit-learn Python Flask backend. The Flask API is the SINGLE SOURCE OF TRUTH
 * for all model predictions, evaluations, training, and architectural metadata.
 */

export type ValidModelName = 'knn' | 'logistic_regression' | 'random_forest';

export type DataPoint = number[];
export type Label = 'R' | 'M';

export interface Dataset {
  features: DataPoint[];
  labels: Label[];
}

export interface PredictionResult {
  prediction: 'M' | 'R';
  label: 'Mine' | 'Rock';
  confidence: number;
  rock_probability: number;
  mine_probability: number;
  model: string;
  hasConfidence?: boolean;
  hasRockProbability?: boolean;
  hasMineProbability?: boolean;
}

export interface ModelMetrics {
  model: string;
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  f1Score: number;
  specificity: number;
  roc_auc: number | null;
  confusion_matrix: number[][]; // [[tn, fp], [fn, tp]]
  confusionMatrix: number[][];
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  latency_ms: number;
  train_duration_ms?: number;
  file_saved?: string;
  classification_report?: any;
  samples_evaluated: number;
}

export interface EvaluationResponse {
  models: {
    logistic_regression: ModelMetrics;
    knn: ModelMetrics;
    random_forest: ModelMetrics;
    [key: string]: ModelMetrics;
  };
  test_samples: number;
  train_samples: number;
  total_samples: number;
  random_state: number;
}

export interface ModelDetail {
  algorithm: string;
  model_key: string;
  model_type: string;
  library: string;
  model_file: string;
  pipeline_steps: string[];
  has_scaler: boolean;
  scaler_type?: string;
  classes: string[];
  n_features: number;
  parameters: Record<string, any>;
}

export interface ModelInfoResponse {
  models: {
    logistic_regression: ModelDetail;
    knn: ModelDetail;
    random_forest: ModelDetail;
    [key: string]: ModelDetail;
  };
  n_models: number;
  dataset: string;
}

export interface TrainResponse {
  message: string;
  results: Record<string, ModelMetrics>;
  trained_models: string[];
  dataset_samples: number;
  test_samples: number;
}

export interface HealthResponse {
  status: string;
  message: string;
  models_loaded: string[];
  dataset_available?: boolean;
}

// Candidates for Flask API endpoints
const LOCAL_PROXY_BASE = '/api';
const RENDER_API_BASE = 'https://echo-guard-api.onrender.com';

// Cache for determined working base URL
let activeApiBase: string | null = null;

/**
 * Resolves the active Flask API base URL.
 * Prefers the local Vite proxy (/api), falling back to Render API if necessary.
 */
export async function getActiveApiBase(): Promise<string> {
  if (activeApiBase) return activeApiBase;

  // 1. Try local proxy /api
  try {
    const res = await fetch(`${LOCAL_PROXY_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      activeApiBase = LOCAL_PROXY_BASE;
      return LOCAL_PROXY_BASE;
    }
  } catch {
    // Local proxy not responding
  }

  // 2. Try remote Render URL
  try {
    const res = await fetch(`${RENDER_API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      activeApiBase = RENDER_API_BASE;
      return RENDER_API_BASE;
    }
  } catch {
    // Remote not responding
  }

  // Default to local proxy
  activeApiBase = LOCAL_PROXY_BASE;
  return LOCAL_PROXY_BASE;
}

/**
 * Executes a JSON fetch request against the active Flask API with automatic fallback.
 */
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const primaryBase = await getActiveApiBase();
  const primaryUrl = `${primaryBase}${path}`;

  try {
    const res = await fetch(primaryUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error || errorJson.message) {
          errorMsg = errorJson.error || errorJson.message;
        }
      } catch {
        const text = await res.text();
        if (text) errorMsg = text.slice(0, 200);
      }
      throw new Error(errorMsg);
    }

    return await res.json() as T;
  } catch (err: any) {
    // If primary failed and it was the local proxy, try the fallback URL
    if (primaryBase === LOCAL_PROXY_BASE) {
      const fallbackUrl = `${RENDER_API_BASE}${path}`;
      try {
        const res = await fetch(fallbackUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options?.headers || {})
          }
        });

        if (res.ok) {
          activeApiBase = RENDER_API_BASE;
          return await res.json() as T;
        }
      } catch {
        // Fallback also failed
      }
    }

    if (err.message && (err.message.includes('HTTP 4') || err.message.includes('features are required') || err.message.includes('numeric'))) {
      throw err;
    }

    throw new Error(
      err.message || 'Unable to communicate with the Flask ML backend. Please ensure the Python service is active.'
    );
  }
}

/**
 * Predicts rock vs mine using the scikit-learn model on the Flask backend.
 * Validates exactly 60 numeric features and returns actual model confidence and probabilities.
 */
export async function predict(
  model: ValidModelName,
  features: number[]
): Promise<PredictionResult> {
  if (!features || !Array.isArray(features)) {
    throw new Error('Exactly 60 sonar features are required.');
  }

  if (features.length !== 60) {
    throw new Error(`Exactly 60 sonar features are required. Received ${features.length}.`);
  }

  for (let i = 0; i < features.length; i++) {
    const val = features[i];
    if (val === null || val === undefined || isNaN(Number(val))) {
      throw new Error(`All sonar features must be numeric. Feature at index ${i} is invalid.`);
    }
  }

  const payload = {
    model,
    features: features.map(Number)
  };

  const response = await fetchApi<{
    prediction: string;
    label?: string;
    confidence?: number;
    probability?: number;
    rock_probability?: number;
    mine_probability?: number;
    model: string;
    error?: string;
  }>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const rawPred = String(response.prediction || '').trim().toUpperCase();
  const predClass: 'M' | 'R' = rawPred.startsWith('M') ? 'M' : 'R';
  const label: 'Mine' | 'Rock' = predClass === 'M' ? 'Mine' : 'Rock';

  let confidence = typeof response.confidence === 'number' ? response.confidence : 0.85;
  confidence = Math.min(1, Math.max(0, confidence));

  let rock_probability = typeof response.rock_probability === 'number'
    ? response.rock_probability
    : (predClass === 'R' ? confidence : Math.max(0, 1 - confidence));

  let mine_probability = typeof response.mine_probability === 'number'
    ? response.mine_probability
    : (predClass === 'M' ? confidence : Math.max(0, 1 - confidence));

  return {
    prediction: predClass,
    label,
    confidence: Number(confidence.toFixed(4)),
    rock_probability: Number(rock_probability.toFixed(4)),
    mine_probability: Number(mine_probability.toFixed(4)),
    model: response.model || model
  };
}

/**
 * Evaluates the saved scikit-learn models against the Sonar dataset.
 * Returns real accuracy, precision, recall, F1, confusion matrix, ROC-AUC, and latency.
 */
export async function evaluateModels(): Promise<EvaluationResponse> {
  return await fetchApi<EvaluationResponse>('/evaluate', {
    method: 'POST'
  });
}

/**
 * Trains one or all scikit-learn models on the backend.
 * Saves trained models to disk and returns real test evaluation results.
 */
export async function trainModel(
  model: ValidModelName | 'all',
  parameters?: Record<string, any>
): Promise<TrainResponse> {
  return await fetchApi<TrainResponse>('/train', {
    method: 'POST',
    body: JSON.stringify({
      model,
      parameters: parameters || {}
    })
  });
}

/**
 * Retrieves architecture, parameters, and metadata for each scikit-learn model.
 */
export async function getModelInfo(): Promise<ModelInfoResponse> {
  return await fetchApi<ModelInfoResponse>('/model-info', {
    method: 'GET'
  });
}

export interface FeatureImportanceItem {
  index: number;
  name: string;
  label: string;
  importance: number;
  importancePct: number;
  rawWeight?: number;
  coefficient?: number;
  impactDirection?: 'mine' | 'rock';
  accDropPct?: number;
  metricName?: string;
  metricUnit?: string;
}

export interface ModelFeatureImportanceGroup {
  model: string;
  name: string;
  algorithm: string;
  metric_name: string;
  metric_unit: string;
  features: FeatureImportanceItem[];
  feature_importances: number[];
}

export interface FeatureImportanceResponse {
  model: string;
  name?: string;
  algorithm: string;
  metric_name?: string;
  metric_unit?: string;
  n_features: number;
  feature_importances: number[];
  features: FeatureImportanceItem[];
  all_models?: {
    random_forest: ModelFeatureImportanceGroup;
    logistic_regression: ModelFeatureImportanceGroup;
    knn: ModelFeatureImportanceGroup;
    [key: string]: ModelFeatureImportanceGroup;
  };
}

/**
 * Retrieves real feature importances from trained models (Random Forest, Logistic Regression, KNN).
 */
export async function getFeatureImportance(model?: string): Promise<FeatureImportanceResponse> {
  const query = model ? `?model=${encodeURIComponent(model)}` : '';
  return await fetchApi<FeatureImportanceResponse>(`/feature-importance${query}`, {
    method: 'GET'
  });
}

/**
 * Verifies backend health and status.
 */
export async function checkHealth(): Promise<HealthResponse> {
  return await fetchApi<HealthResponse>('/health', {
    method: 'GET'
  });
}
