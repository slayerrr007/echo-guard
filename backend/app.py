from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os


app = Flask(__name__)
CORS(app)

print("Loading ML models...")

models = {
    "knn": joblib.load("models/knn.pkl"),
    "logistic_regression": joblib.load("models/logistic_regression.pkl"),
    "random_forest": joblib.load("models/random_forest.pkl")
}

print("All ML models loaded successfully.")


@app.route("/")
def home():
    return jsonify({
        "message": "Sonar ML API is running"
    })


@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "message": "Flask API is healthy"
    })


@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    model_name = data.get("model")
    features = data.get("features")

    if model_name not in models:
        return jsonify({
            "error": "Invalid model name"
        }), 400

    if not features or len(features) != 60:
        return jsonify({
            "error": "Exactly 60 features are required"
        }), 400

    model = models[model_name]

    prediction = model.predict([features])[0]

    response = {
        "model": model_name,
        "prediction": prediction
    }

    # Add probability/confidence if available
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([features])[0]
        response["confidence"] = float(max(probabilities))

    return jsonify(response)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    print("Starting Flask API...")
    print(f"API running on port {port}")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )




