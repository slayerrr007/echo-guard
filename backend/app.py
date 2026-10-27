import os
import time
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    classification_report
)

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATASET_PATH = os.path.join(BASE_DIR, "sonar.csv")

os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_FILES = {
    "logistic_regression": os.path.join(MODELS_DIR, "logistic_regression.pkl"),
    "knn": os.path.join(MODELS_DIR, "knn.pkl"),
    "random_forest": os.path.join(MODELS_DIR, "random_forest.pkl")
}

MODEL_DISPLAY_NAMES = {
    "logistic_regression": "Logistic Regression",
    "knn": "K-Nearest Neighbors (KNN)",
    "random_forest": "Random Forest Classifier"
}

models = {}


def load_sonar_dataset():
    """Loads sonar.csv dataset containing 60 numeric frequency columns and 1 label column."""
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Sonar dataset not found at {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH, header=None)
    X = df.iloc[:, :60].values.astype(float)
    y = df.iloc[:, 60].astype(str).str.strip().values
    return X, y


def train_and_save_defaults():
    """Trains default scikit-learn pipelines with StandardScaler for all three models if not already present."""
    print("Training default scikit-learn pipelines on Sonar dataset...")
    X, y = load_sonar_dataset()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipelines = {
        "logistic_regression": Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(C=1.0, max_iter=1000, solver="lbfgs", random_state=42))
        ]),
        "knn": Pipeline([
            ("scaler", StandardScaler()),
            ("model", KNeighborsClassifier(n_neighbors=3, metric="minkowski", p=2, weights="uniform"))
        ]),
        "random_forest": Pipeline([
            ("scaler", StandardScaler()),
            ("model", RandomForestClassifier(n_estimators=100, criterion="gini", max_features="sqrt", min_samples_split=2, bootstrap=True, random_state=42))
        ])
    }

    for name, pipe in pipelines.items():
        pipe.fit(X_train, y_train)
        joblib.dump(pipe, MODEL_FILES[name])
        models[name] = pipe
        print(f"  [+] Saved {name} to {MODEL_FILES[name]}")


def load_all_models():
    """Loads all scikit-learn models from disk, training defaults if files are missing."""
    global models
    all_exist = all(os.path.exists(MODEL_FILES[name]) for name in MODEL_FILES)
    if not all_exist:
        train_and_save_defaults()
        return

    for name, file_path in MODEL_FILES.items():
        try:
            models[name] = joblib.load(file_path)
            print(f"  [✓] Loaded {name} from {file_path}")
        except Exception as e:
            print(f"  [!] Error loading {name}: {e}. Retraining...")
            train_and_save_defaults()
            break


print("Initializing Echo-Guard ML Backend...")
load_all_models()
print("All scikit-learn models ready.")


def normalize_model_name(name):
    if not name:
        return None
    cleaned = str(name).lower().strip()
    if cleaned in ["lr", "logistic", "logistic_regression", "logisticregression"]:
        return "logistic_regression"
    if cleaned in ["rf", "forest", "random_forest", "randomforest", "random_forest_classifier"]:
        return "random_forest"
    if cleaned in ["knn", "k-nearest-neighbors", "kneighbors", "kneighborsclassifier"]:
        return "knn"
    return cleaned if cleaned in models else None


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Echo-Guard Sonar ML API is running",
        "endpoints": [
            "GET /health",
            "GET /model-info",
            "POST /predict",
            "POST /evaluate",
            "POST /train"
        ]
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "Flask API is healthy",
        "models_loaded": list(models.keys()),
        "dataset_available": os.path.exists(DATASET_PATH)
    })


@app.route("/feature-importance", methods=["GET"])
def feature_importance():
    """Returns actual feature importances computed by the trained scikit-learn RandomForestClassifier."""
    rf_pipe = models.get("random_forest")
    if not rf_pipe:
        return jsonify({"error": "RandomForest model is not loaded"}), 404

    try:
        clf = rf_pipe.named_steps.get("model", rf_pipe)
        if not hasattr(clf, "feature_importances_"):
            return jsonify({"error": "Random Forest model does not contain feature_importances_"}), 500

        importances = [float(x) for x in clf.feature_importances_]
        
        # Build structured feature list matching 60 sonar frequencies
        features = []
        for idx, imp in enumerate(importances):
            features.append({
                "index": idx,
                "name": f"F{idx + 1}",
                "label": f"Frequency F{idx + 1}",
                "importance": round(imp, 6),
                "importancePct": round(imp * 100, 4)
            })

        return jsonify({
            "model": "random_forest",
            "algorithm": "RandomForestClassifier",
            "n_features": len(importances),
            "feature_importances": importances,
            "features": features
        })
    except Exception as e:
        return jsonify({"error": f"Failed to compute feature importance: {str(e)}"}), 500


@app.route("/model-info", methods=["GET"])
def model_info():
    """Returns architecture, parameters, and metadata for each scikit-learn model."""
    info = {}
    for name, pipe in models.items():
        clf = pipe.named_steps.get("model", pipe)
        scaler = pipe.named_steps.get("scaler", None)
        
        params = {}
        try:
            raw_params = clf.get_params()
            for k, v in raw_params.items():
                if isinstance(v, (int, float, str, bool, list)) or v is None:
                    params[k] = v
                else:
                    params[k] = str(v)
        except Exception:
            pass

        info[name] = {
            "algorithm": MODEL_DISPLAY_NAMES.get(name, name),
            "model_key": name,
            "model_type": clf.__class__.__name__,
            "library": "scikit-learn",
            "model_file": f"models/{name}.pkl",
            "pipeline_steps": [s[0] for s in getattr(pipe, "steps", [])] if hasattr(pipe, "steps") else ["model"],
            "has_scaler": scaler is not None,
            "scaler_type": scaler.__class__.__name__ if scaler else None,
            "classes": [str(c) for c in getattr(clf, "classes_", ["M", "R"])],
            "n_features": 60,
            "parameters": params
        }

    return jsonify({
        "models": info,
        "n_models": len(info),
        "dataset": "Sonar (60 Frequency Channels, Mines vs Rocks)"
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts exactly 60 numerical sonar feature values and model choice.
    Returns real class prediction, label, and predict_proba probabilities.
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing JSON payload."}), 400

    raw_model = data.get("model")
    model_name = normalize_model_name(raw_model)
    if not model_name or model_name not in models:
        return jsonify({
            "error": "Requested model is not available. Choose 'logistic_regression', 'knn', or 'random_forest'."
        }), 400

    features = data.get("features")
    if features is None or not isinstance(features, (list, tuple)):
        return jsonify({"error": "Exactly 60 sonar features are required."}), 400

    if len(features) != 60:
        return jsonify({
            "error": f"Exactly 60 sonar features are required. Received {len(features)}."
        }), 400

    # Strict numerical validation
    numeric_features = []
    for idx, val in enumerate(features):
        try:
            if val is None or val == "":
                raise ValueError()
            f_val = float(val)
            if np.isnan(f_val) or np.isinf(f_val):
                raise ValueError()
            numeric_features.append(f_val)
        except (ValueError, TypeError):
            return jsonify({
                "error": f"All sonar features must be numeric. Feature at index {idx} ('{val}') is invalid."
            }), 400

    model = models[model_name]
    X_input = np.array([numeric_features], dtype=float)

    try:
        raw_pred = model.predict(X_input)[0]
        pred_class = str(raw_pred).strip().upper()
        # Normalization to 'M' or 'R'
        pred_class = "M" if pred_class.startswith("M") else "R"
        label = "Mine" if pred_class == "M" else "Rock"

        # Compute probability scores using real predict_proba
        confidence = 0.5
        rock_prob = 0.5
        mine_prob = 0.5

        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_input)[0]
            clf_step = model.named_steps.get("model", model) if hasattr(model, "named_steps") else model
            classes = list(getattr(clf_step, "classes_", getattr(model, "classes_", ["M", "R"])))

            if "M" in classes and "R" in classes:
                m_idx = classes.index("M")
                r_idx = classes.index("R")
                mine_prob = float(probs[m_idx])
                rock_prob = float(probs[r_idx])
            elif len(probs) >= 2:
                # Fallback to binary distribution
                mine_prob = float(probs[0])
                rock_prob = float(probs[1])

            confidence = mine_prob if pred_class == "M" else rock_prob

        return jsonify({
            "prediction": pred_class,
            "label": label,
            "confidence": round(float(confidence), 4),
            "rock_probability": round(float(rock_prob), 4),
            "mine_probability": round(float(mine_prob), 4),
            "model": model_name
        })

    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


@app.route("/evaluate", methods=["GET", "POST"])
def evaluate():
    """
    Evaluates the actual saved scikit-learn models against the reproducible Sonar test dataset.
    Returns real accuracy, precision, recall, F1-score, confusion matrix, and ROC-AUC.
    """
    try:
        X, y = load_sonar_dataset()
        # Reproducible 80/20 train/test split with stratified classes
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        results = {}
        y_test_bin = (np.array(y_test) == "M").astype(int)

        for name, pipe in models.items():
            t0 = time.time()
            y_pred = pipe.predict(X_test)
            latency = (time.time() - t0) * 1000.0

            # Confusion Matrix: [[tn, fp], [fn, tp]] with negative='R' (Rock), positive='M' (Mine)
            cm = confusion_matrix(y_test, y_pred, labels=["R", "M"])
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, pos_label="M", zero_division=0))
            rec = float(recall_score(y_test, y_pred, pos_label="M", zero_division=0))
            f1 = float(f1_score(y_test, y_pred, pos_label="M", zero_division=0))
            spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

            roc_auc = None
            if hasattr(pipe, "predict_proba"):
                try:
                    probs = pipe.predict_proba(X_test)
                    clf_step = pipe.named_steps.get("model", pipe) if hasattr(pipe, "named_steps") else pipe
                    classes = list(getattr(clf_step, "classes_", getattr(pipe, "classes_", ["M", "R"])))
                    if "M" in classes:
                        m_idx = classes.index("M")
                        roc_auc = round(float(roc_auc_score(y_test_bin, probs[:, m_idx])), 4)
                except Exception:
                    pass

            clf_report = classification_report(
                y_test, y_pred, labels=["R", "M"], target_names=["Rock", "Mine"], output_dict=True, zero_division=0
            )

            results[name] = {
                "model": name,
                "name": MODEL_DISPLAY_NAMES.get(name, name),
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "f1Score": round(f1, 4),  # Frontend compatibility alias
                "specificity": round(spec, 4),
                "roc_auc": roc_auc,
                "confusion_matrix": [[tn, fp], [fn, tp]],
                "confusionMatrix": [[tn, fp], [fn, tp]],  # Frontend compatibility alias
                "tp": tp,
                "tn": tn,
                "fp": fp,
                "fn": fn,
                "latency_ms": round(latency, 2),
                "classification_report": clf_report,
                "samples_evaluated": len(y_test)
            }

        return jsonify({
            "models": results,
            "test_samples": len(y_test),
            "train_samples": len(y_train),
            "total_samples": len(X),
            "random_state": 42
        })

    except Exception as e:
        return jsonify({"error": f"Evaluation failed: {str(e)}"}), 500


@app.route("/train", methods=["POST"])
def train():
    """
    Trains one or all scikit-learn models using Python on the Sonar dataset.
    Saves trained models with joblib and returns the real evaluation results.
    """
    data = request.get_json(silent=True) or {}
    model_param = data.get("model", "all")
    params = data.get("parameters", {}) or {}

    try:
        X, y = load_sonar_dataset()
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        target_models = []
        if model_param == "all":
            target_models = ["logistic_regression", "knn", "random_forest"]
        else:
            norm = normalize_model_name(model_param)
            if not norm:
                return jsonify({"error": f"Invalid model '{model_param}'. Choose 'logistic_regression', 'knn', or 'random_forest'."}), 400
            target_models = [norm]

        trained_results = {}

        for m_name in target_models:
            if m_name == "logistic_regression":
                c_val = float(params.get("C", params.get("cValue", 1.0)))
                max_iter = int(params.get("max_iter", params.get("maxIter", 1000)))
                solver = str(params.get("solver", "lbfgs"))
                penalty = str(params.get("penalty", "l2"))
                clf = LogisticRegression(C=c_val, max_iter=max_iter, solver=solver, penalty=penalty, random_state=42)

            elif m_name == "knn":
                k_val = int(params.get("n_neighbors", params.get("kValue", 3)))
                metric = str(params.get("metric", "minkowski"))
                p_val = int(params.get("p", 2))
                weights = str(params.get("weights", "uniform"))
                clf = KNeighborsClassifier(n_neighbors=k_val, metric=metric, p=p_val, weights=weights)

            elif m_name == "random_forest":
                n_est = int(params.get("n_estimators", params.get("nEstimators", 100)))
                criterion = str(params.get("criterion", "gini"))
                max_feat = params.get("max_features", params.get("maxFeatures", "sqrt"))
                if max_feat == "all":
                    max_feat = None
                min_samples = int(params.get("min_samples_split", params.get("minSamplesSplit", 2)))
                bootstrap = bool(params.get("bootstrap", True))
                max_depth_val = params.get("max_depth", params.get("maxDepth", None))
                max_depth = int(max_depth_val) if max_depth_val and str(max_depth_val).isdigit() else None
                clf = RandomForestClassifier(
                    n_estimators=n_est,
                    criterion=criterion,
                    max_features=max_feat,
                    min_samples_split=min_samples,
                    bootstrap=bootstrap,
                    max_depth=max_depth,
                    random_state=42
                )

            # Build production pipeline with StandardScaler
            pipe = Pipeline([
                ("scaler", StandardScaler()),
                ("model", clf)
            ])

            t0 = time.time()
            pipe.fit(X_train, y_train)
            train_duration = (time.time() - t0) * 1000.0

            # Save to models/{name}.pkl
            joblib.dump(pipe, MODEL_FILES[m_name])
            models[m_name] = pipe

            # Real evaluation on test set
            y_pred = pipe.predict(X_test)
            cm = confusion_matrix(y_test, y_pred, labels=["R", "M"])
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, pos_label="M", zero_division=0))
            rec = float(recall_score(y_test, y_pred, pos_label="M", zero_division=0))
            f1 = float(f1_score(y_test, y_pred, pos_label="M", zero_division=0))

            roc_auc = None
            if hasattr(pipe, "predict_proba"):
                try:
                    probs = pipe.predict_proba(X_test)
                    classes = list(getattr(clf, "classes_", ["M", "R"]))
                    if "M" in classes:
                        m_idx = classes.index("M")
                        y_test_bin = (np.array(y_test) == "M").astype(int)
                        roc_auc = round(float(roc_auc_score(y_test_bin, probs[:, m_idx])), 4)
                except Exception:
                    pass

            trained_results[m_name] = {
                "model": m_name,
                "name": MODEL_DISPLAY_NAMES.get(m_name, m_name),
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "f1Score": round(f1, 4),
                "specificity": round(float(tn / (tn + fp)), 4) if (tn + fp) > 0 else 0.0,
                "roc_auc": roc_auc,
                "confusion_matrix": [[tn, fp], [fn, tp]],
                "confusionMatrix": [[tn, fp], [fn, tp]],
                "tp": tp,
                "tn": tn,
                "fp": fp,
                "fn": fn,
                "train_duration_ms": round(train_duration, 2),
                "samples_evaluated": len(y_test),
                "file_saved": MODEL_FILES[m_name]
            }

        return jsonify({
            "message": f"Successfully trained {len(target_models)} model(s) using scikit-learn.",
            "results": trained_results,
            "trained_models": list(trained_results.keys()),
            "dataset_samples": len(X),
            "test_samples": len(y_test)
        })

    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    print(f"Starting Flask API on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
