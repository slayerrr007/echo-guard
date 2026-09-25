// Sonar Rock and Mine ML Classification
// Connects to Flask backend API running scikit-learn models at https://echo-guard-api.onrender.com/predict

export type DataPoint = number[];
export type Label = 'R' | 'M';

export interface Dataset {
  features: DataPoint[];
  labels: Label[];
}

export type ValidModelName = 'knn' | 'logistic_regression' | 'random_forest';

export interface FlaskPredictRequest {
  model: ValidModelName;
  features: number[];
}

export interface FlaskPredictResponse {
  model: string;
  prediction: 'R' | 'M' | string;
  confidence?: number;
  probability?: number;
  message?: string;
  error?: string;
}

export const FLASK_API_BASE = 'https://echo-guard-api.onrender.com';
export const FLASK_PREDICT_URL = `${FLASK_API_BASE}/predict`;

/**
 * Predicts Rock vs Mine using the Python Flask API backend.
 * Sends JSON payload:
 * {
 *   "model": "knn" | "logistic_regression" | "random_forest",
 *   "features": [60 numeric values]
 * }
 */
export async function predictWithFlaskAPI(
  model: ValidModelName,
  features: number[]
): Promise<{ prediction: 'R' | 'M'; model: string; confidence: number }> {
  if (!features || features.length !== 60) {
    throw new Error(`Expected exactly 60 sonar features, but got ${features ? features.length : 0}.`);
  }

  // Ensure all 60 inputs are clean numbers
  const sanitizedFeatures = features.map(v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  });

  const payload: FlaskPredictRequest = {
    model,
    features: sanitizedFeatures,
  };

  try {
    const response = await fetch(FLASK_PREDICT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} (${response.statusText})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error || errorJson.message) {
          errorDetail = errorJson.error || errorJson.message;
        }
      } catch {
        const text = await response.text();
        if (text) errorDetail = text.slice(0, 200);
      }
      throw new Error(`Flask API returned error: ${errorDetail}`);
    }

    const data: FlaskPredictResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const rawPred = String(data.prediction || '').trim().toUpperCase();
    const finalPrediction: 'R' | 'M' = rawPred.startsWith('M') ? 'M' : 'R';

    // Support optional confidence/probability field if provided by the Python model
    let confidence = 0.95;
    if (typeof data.confidence === 'number' && !isNaN(data.confidence)) {
      confidence = data.confidence;
    } else if (typeof data.probability === 'number' && !isNaN(data.probability)) {
      confidence = data.probability;
    }

    return {
      prediction: finalPrediction,
      model: data.model || model,
      confidence,
    };
  } catch (err: any) {
    // If it's already an explicit Flask API error, rethrow
    if (err.message && err.message.startsWith('Flask API')) {
      throw err;
    }
    // Handle network / CORS / connection errors
    if (err.name === 'TypeError' || err.message?.toLowerCase().includes('fetch')) {
      throw new Error(
        `Unable to reach Flask API at ${FLASK_API_BASE}. Please ensure your deployed backend service is active (https://echo-guard-api.onrender.com) and that CORS is enabled.`
      );
    }
    throw err;
  }
}

// Euclidean distance helper
function distance(a: DataPoint, b: DataPoint): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

export class KNN {
  private k: number;
  private data: Dataset = { features: [], labels: [] };

  constructor(k: number = 3) {
    this.k = k;
  }

  fit(X: DataPoint[], y: Label[]) {
    this.data.features = X;
    this.data.labels = y;
  }

  predict(X: DataPoint[]): { predictions: Label[], confidences: number[] } {
    const predictions: Label[] = [];
    const confidences: number[] = [];

    for (const testPoint of X) {
      const distances: { dist: number, label: Label }[] = [];
      for (let i = 0; i < this.data.features.length; i++) {
        distances.push({
          dist: distance(testPoint, this.data.features[i]),
          label: this.data.labels[i]
        });
      }

      distances.sort((a, b) => a.dist - b.dist);
      const neighbors = distances.slice(0, this.k);
      
      let countR = 0;
      let countM = 0;
      for (const n of neighbors) {
        if (n.label === 'R') countR++;
        else countM++;
      }

      const isRock = countR >= countM;
      predictions.push(isRock ? 'R' : 'M');
      confidences.push(isRock ? (countR / this.k) : (countM / this.k));
    }

    return { predictions, confidences };
  }
}

export class LogisticRegression {
  private weights: number[] = [];
  private bias: number = 0;

  fit(X: DataPoint[], y: Label[], epochs: number = 100, lr: number = 0.1) {
    if (X.length === 0) return;
    this.weights = new Array(X[0].length).fill(0);
    this.bias = 0;

    const yBinary = y.map(label => label === 'M' ? 1 : 0);

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < X.length; i++) {
        const linearModel = X[i].reduce((sum, val, j) => sum + val * this.weights[j], this.bias);
        const yPredicted = 1 / (1 + Math.exp(-linearModel));

        const update = lr * (yBinary[i] - yPredicted);
        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] += update * X[i][j];
        }
        this.bias += update;
      }
    }
  }

  predict(X: DataPoint[]): { predictions: Label[], confidences: number[] } {
    const predictions: Label[] = [];
    const confidences: number[] = [];

    for (const testPoint of X) {
      const linearModel = testPoint.reduce((sum, val, j) => sum + val * this.weights[j], this.bias);
      const prob = 1 / (1 + Math.exp(-linearModel));

      const isMine = prob >= 0.5;
      predictions.push(isMine ? 'M' : 'R');
      confidences.push(isMine ? prob : 1 - prob);
    }

    return { predictions, confidences };
  }
}

export class RandomForest {
  private trees: KNN[] = []; // A simplified "ensemble" mock using KNNs with different K values

  fit(X: DataPoint[], y: Label[]) {
    // Ensemble classifier: train KNNs with different k values
    this.trees = [];
    for (let i = 1; i <= 5; i += 2) {
      const tree = new KNN(i);
      tree.fit(X, y);
      this.trees.push(tree);
    }
  }

  predict(X: DataPoint[]): { predictions: Label[], confidences: number[] } {
    const predictions: Label[] = [];
    const confidences: number[] = [];

    const treePredictions = this.trees.map(tree => tree.predict(X));

    for (let i = 0; i < X.length; i++) {
      let countR = 0;
      let countM = 0;
      let sumConf = 0;

      for (let j = 0; j < this.trees.length; j++) {
        const pred = treePredictions[j].predictions[i];
        if (pred === 'R') countR++;
        else countM++;
        sumConf += treePredictions[j].confidences[i];
      }

      const isRock = countR >= countM;
      predictions.push(isRock ? 'R' : 'M');
      confidences.push(sumConf / (this.trees.length || 1));
    }

    return { predictions, confidences };
  }
}

export class SVM {
  private weights: number[] = [];
  private bias: number = 0;

  fit(X: DataPoint[], y: Label[], epochs: number = 100, lr: number = 0.01, lambdaParam: number = 0.01) {
    if (X.length === 0) return;
    this.weights = new Array(X[0].length).fill(0);
    this.bias = 0;

    const yVal = y.map(l => l === 'M' ? 1 : -1);

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < X.length; i++) {
        const linearOutput = X[i].reduce((sum, val, j) => sum + val * this.weights[j], this.bias);
        const condition = yVal[i] * linearOutput >= 1;

        if (condition) {
          for (let j = 0; j < this.weights.length; j++) {
            this.weights[j] -= lr * (2 * lambdaParam * this.weights[j]);
          }
        } else {
          for (let j = 0; j < this.weights.length; j++) {
            this.weights[j] -= lr * (2 * lambdaParam * this.weights[j] - yVal[i] * X[i][j]);
          }
          this.bias += lr * yVal[i];
        }
      }
    }
  }

  predict(X: DataPoint[]): { predictions: Label[], confidences: number[] } {
    const predictions: Label[] = [];
    const confidences: number[] = [];

    for (const testPoint of X) {
      const margin = testPoint.reduce((sum, val, j) => sum + val * this.weights[j], this.bias);
      const isMine = margin >= 0;
      predictions.push(isMine ? 'M' : 'R');
      const pseudoProb = 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, margin * 2))));
      confidences.push(isMine ? pseudoProb : 1 - pseudoProb);
    }

    return { predictions, confidences };
  }
}

export function calculateMetrics(yTrue: Label[], yPred: Label[]) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (let i = 0; i < yTrue.length; i++) {
    const actual = yTrue[i];
    const predicted = yPred[i];
    
    // Let's consider 'M' (Mine) as Positive class, 'R' (Rock) as Negative class for metrics
    if (actual === 'M' && predicted === 'M') tp++;
    if (actual === 'R' && predicted === 'R') tn++;
    if (actual === 'R' && predicted === 'M') fp++;
    if (actual === 'M' && predicted === 'R') fn++;
  }

  const accuracy = yTrue.length > 0 ? (tp + tn) / yTrue.length : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    specificity,
    tp,
    tn,
    fp,
    fn,
    confusionMatrix: [
      [tn, fp], // Actual R
      [fn, tp]  // Actual M
    ]
  };
}

export function trainTestSplit(X: DataPoint[], y: Label[], testSize: number = 0.2) {
  const X_train: DataPoint[] = [];
  const y_train: Label[] = [];
  const X_test: DataPoint[] = [];
  const y_test: Label[] = [];

  // Simple deterministic split for reproducibility without a random seed library
  for (let i = 0; i < X.length; i++) {
    if (i % Math.floor(1 / testSize) === 0) {
      X_test.push(X[i]);
      y_test.push(y[i]);
    } else {
      X_train.push(X[i]);
      y_train.push(y[i]);
    }
  }

  return { X_train, X_test, y_train, y_test };
}
