"""
ML Service — Energy Demand Forecasting
Flask API wrapping RF, XGB, IsolationForest models
"""

import os
import sys
import math
import logging
from datetime import datetime, date, timedelta

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import tempfile
from nldc_psp_extractor import run_pipeline

# ─── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ml-service")

app = Flask(__name__)
CORS(app)

# ─── Model Paths ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = BASE_DIR  # models are in same directory

# ─── Load Models at Startup ────────────────────────────────────────────────────
logger.info("=" * 60)
logger.info("Loading ML models …")

try:
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    rf_model = joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl"))
    xgb_model = joblib.load(os.path.join(MODEL_DIR, "xgb_model.pkl"))
    isolation_forest = joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl"))

    with open(os.path.join(MODEL_DIR, "feature_names.txt")) as f:
        FEATURE_NAMES = [line.strip() for line in f.readlines()]

    # Assertions
    assert scaler.n_features_in_ == 46
    assert rf_model.n_features_in_ == 46
    assert xgb_model.n_features_in_ == 46
    assert isolation_forest.n_features_in_ == 1
    assert len(FEATURE_NAMES) == 46

    logger.info("✅  All models loaded and assertions passed")
    logger.info(f"    Features : {len(FEATURE_NAMES)}")
    logger.info(f"    RF trees : {rf_model.n_estimators}")
    logger.info(f"    XGB trees: {xgb_model.n_estimators}")

except Exception as exc:
    logger.error(f"❌  Model loading failed: {exc}")
    sys.exit(1)

# ─── Load Historical CSV ────────────────────────────────────────────────────────
CSV_PATH = os.path.join(BASE_DIR, "cleaned_energy_data_main_.csv")
try:
    hist_df = pd.read_csv(CSV_PATH, parse_dates=["date"])
    hist_df = hist_df.sort_values(["state", "date"]).reset_index(drop=True)
    logger.info(f"✅  Historical data loaded: {len(hist_df)} rows, {hist_df['state'].nunique()} states")
except Exception as exc:
    logger.warning(f"⚠️   Could not load historical CSV: {exc}. Some endpoints may return empty data.")
    hist_df = pd.DataFrame()

logger.info("=" * 60)

# ─── Constants ─────────────────────────────────────────────────────────────────
ALL_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "DNH", "Delhi", "Goa", "Gujarat", "HP", "Haryana",
    "J&K", "Jharkhand", "Karnataka", "Kerala", "MP", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Pondy",
    "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "UP", "Uttarakhand", "West Bengal",
]


# ─── Helpers ───────────────────────────────────────────────────────────────────
def get_season_flags(month: int):
    return (
        int(month in {6, 7, 8, 9}),
        int(month in {3, 4, 5}),
        int(month in {11, 12, 1, 2}),
    )


def build_feature_row(forecast_date, state: str, demand_lag_1d, demand_lag_7d,
                       rolling_7d_mean, diff_1d=0.0, rolling_diff=0.0):
    if state not in ALL_STATES:
        raise ValueError(f"Unknown state: {state}")

    if isinstance(forecast_date, str):
        forecast_date = datetime.strptime(forecast_date, "%Y-%m-%d").date()

    dow = forecast_date.weekday()
    month = forecast_date.month
    monsoon, summer, winter = get_season_flags(month)

    diff_7d = demand_lag_1d - demand_lag_7d
    ratio_7d = demand_lag_1d / rolling_7d_mean if rolling_7d_mean > 0 else 1.0

    row = {f: 0 for f in FEATURE_NAMES}
    row.update({
        "day_of_week": dow,
        "month": month,
        "is_weekend": int(dow >= 5),
        "demand_lag_1d": demand_lag_1d,
        "demand_lag_7d": demand_lag_7d,
        "rolling_7d_mean": rolling_7d_mean,
        "diff_1d": diff_1d,
        "diff_7d": diff_7d,
        "ratio_7d": ratio_7d,
        "rolling_diff": rolling_diff,
        f"state_{state}": 1,
        "season_monsoon": monsoon,
        "season_summer": summer,
        "season_winter": winter,
    })
    return row


def is_valid_prediction(val, rolling_7d_mean):
    if val is None or math.isnan(val) or math.isinf(val):
        return False, "NaN or Inf output"
    if val < 0:
        return False, "negative prediction"
    if rolling_7d_mean > 0 and val > rolling_7d_mean * 4:
        return False, "extreme ratio (>4x mean)"
    return True, None


def run_prediction(row: dict):
    """Core inference — returns 24h predictions with anomaly + confidence."""
    X_raw = np.array([[row[f] for f in FEATURE_NAMES]])
    X_scaled = scaler.transform(X_raw)

    # ── RF ──────────────────────────────────────────────────────────────────
    try:
        rf_ratio = float(rf_model.predict(X_scaled)[0])
        rf_demand = rf_ratio * row["rolling_7d_mean"]
        rf_valid, rf_reason = is_valid_prediction(rf_demand, row["rolling_7d_mean"])
        if rf_valid:
            logger.info(f"  Prediction Source: MODEL (RF) | ratio={rf_ratio:.4f} | demand={rf_demand:.2f} MU")
        else:
            logger.warning(f"  Prediction Source: FALLBACK ACTIVATED (RF) | reason={rf_reason}")
            rf_demand = row["rolling_7d_mean"]
            rf_ratio = 1.0
    except Exception as e:
        logger.error(f"  RF prediction error: {e}")
        rf_demand = row["rolling_7d_mean"]
        rf_ratio = 1.0
        rf_valid = False

    # ── XGB ─────────────────────────────────────────────────────────────────
    try:
        xgb_ratio = float(xgb_model.predict(X_scaled)[0])
        xgb_demand = xgb_ratio * row["rolling_7d_mean"]
        xgb_valid, xgb_reason = is_valid_prediction(xgb_demand, row["rolling_7d_mean"])
        if xgb_valid:
            logger.info(f"  Prediction Source: MODEL (XGB) | ratio={xgb_ratio:.4f} | demand={xgb_demand:.2f} MU")
        else:
            logger.warning(f"  Prediction Source: FALLBACK ACTIVATED (XGB) | reason={xgb_reason}")
            xgb_demand = row["rolling_7d_mean"]
            xgb_ratio = 1.0
    except Exception as e:
        logger.error(f"  XGB prediction error: {e}")
        xgb_demand = row["rolling_7d_mean"]
        xgb_ratio = 1.0
        xgb_valid = False

    # ── Ensemble ─────────────────────────────────────────────────────────────
    final_demand = (rf_demand + xgb_demand) / 2.0
    final_ratio = (rf_ratio + xgb_ratio) / 2.0
    logger.info(f"  Prediction Source: ENSEMBLE | final={final_demand:.2f} MU")

    # ── Anomaly (IsolationForest on RF ratio) ─────────────────────────────────
    try:
        anom_label = int(isolation_forest.predict([[rf_ratio]])[0])
        anom_score = float(isolation_forest.score_samples([[rf_ratio]])[0])
        is_anomaly = anom_label == -1

        if anom_score > -0.35:
            severity = "none"
        elif anom_score > -0.61:
            severity = "low"
        else:
            severity = "high"
            logger.warning(f"  ⚠️  ANOMALY DETECTED | score={anom_score:.4f} | severity={severity}")
    except Exception as e:
        logger.error(f"  IsolationForest error: {e}")
        is_anomaly = False
        anom_score = -0.4
        severity = "none"

    # ── Confidence score (heuristic) ─────────────────────────────────────────
    ratio_diff = abs(rf_ratio - xgb_ratio)
    confidence = max(0.5, min(1.0, 1.0 - ratio_diff * 2))

    return {
        "rf_ratio": rf_ratio,
        "rf_demand_MU": round(rf_demand, 3),
        "xgb_ratio": xgb_ratio,
        "xgb_demand_MU": round(xgb_demand, 3),
        "final_demand_MU": round(final_demand, 3),
        "final_ratio": round(final_ratio, 4),
        "confidence_score": round(confidence, 4),
        "is_anomaly": is_anomaly,
        "anomaly_score": round(anom_score, 4),
        "anomaly_severity": severity,
        "rf_fallback_used": not rf_valid,
        "xgb_fallback_used": not xgb_valid,
    }


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models": ["rf", "xgb", "isolation_forest", "scaler"]})


@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Body: { forecast_date, state, demand_lag_1d, demand_lag_7d, rolling_7d_mean,
            diff_1d?, rolling_diff? }
    Returns 24h + 48h predictions.
    """
    data = request.get_json(force=True)
    logger.info(f"\n{'='*50}")
    logger.info(f"  /predict called | state={data.get('state')} | date={data.get('forecast_date')}")

    try:
        forecast_date_str = data["forecast_date"]
        state = data["state"]
        demand_lag_1d = float(data["demand_lag_1d"])
        demand_lag_7d = float(data["demand_lag_7d"])
        rolling_7d_mean = float(data["rolling_7d_mean"])
        diff_1d = float(data.get("diff_1d", 0.0))
        rolling_diff = float(data.get("rolling_diff", 0.0))
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid input: {e}"}), 400

    try:
        # 24h
        row_24h = build_feature_row(
            forecast_date_str, state,
            demand_lag_1d, demand_lag_7d, rolling_7d_mean,
            diff_1d, rolling_diff
        )
        out_24h = run_prediction(row_24h)

        # 48h — chain on RF output
        forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d").date()
        next_date = forecast_date + timedelta(days=1)

        row_48h = row_24h.copy()
        dow48 = next_date.weekday()
        month48 = next_date.month
        monsoon48, summer48, winter48 = get_season_flags(month48)
        rf_demand_24 = out_24h["rf_demand_MU"]

        row_48h.update({
            "day_of_week": dow48,
            "month": month48,
            "is_weekend": int(dow48 >= 5),
            "demand_lag_1d": rf_demand_24,
            "diff_1d": rf_demand_24 - demand_lag_1d,
            "diff_7d": rf_demand_24 - demand_lag_7d,
            "ratio_7d": rf_demand_24 / rolling_7d_mean if rolling_7d_mean > 0 else 1.0,
            "season_monsoon": monsoon48,
            "season_summer": summer48,
            "season_winter": winter48,
        })
        out_48h_raw = run_prediction(row_48h)
        out_48h = {
            "rf_demand_MU": out_48h_raw["rf_demand_MU"],
            "xgb_demand_MU": out_48h_raw["xgb_demand_MU"],
            "final_demand_MU": out_48h_raw["final_demand_MU"],
            "is_anomaly": out_48h_raw["is_anomaly"],
            "anomaly_score": out_48h_raw["anomaly_score"],
            "anomaly_severity": out_48h_raw["anomaly_severity"],
        }

        logger.info(f"  ✅  Done | 24h={out_24h['final_demand_MU']} MU | 48h={out_48h['final_demand_MU']} MU")

        return jsonify({
            "state": state,
            "forecast_date": forecast_date_str,
            "prediction_24h": out_24h,
            "prediction_48h": out_48h,
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"  ❌  Prediction failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/anomaly", methods=["POST"])
def anomaly():
    """
    POST /anomaly
    Body: { rf_ratio }
    Runs IsolationForest only.
    """
    data = request.get_json(force=True)
    try:
        rf_ratio = float(data["rf_ratio"])
    except (KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 400

    label = int(isolation_forest.predict([[rf_ratio]])[0])
    score = float(isolation_forest.score_samples([[rf_ratio]])[0])
    is_anom = label == -1

    severity = "none"
    if score <= -0.61:
        severity = "high"
    elif score <= -0.35:
        severity = "low"

    return jsonify({
        "rf_ratio": rf_ratio,
        "is_anomaly": is_anom,
        "anomaly_score": round(score, 4),
        "anomaly_severity": severity,
    })


@app.route("/batch-predict", methods=["POST"])
def batch_predict():
    """
    POST /batch-predict
    Body: { state, n_days (default 30) }
    Auto-fetches last n_days from historical data and runs predictions forward.
    """
    data = request.get_json(force=True)
    state = data.get("state", "Karnataka")
    n_days = int(data.get("n_days", 30))

    if hist_df.empty:
        return jsonify({"error": "Historical data not loaded"}), 500

    state_df = hist_df[hist_df["state"] == state].copy()
    if state_df.empty:
        return jsonify({"error": f"No data for state: {state}"}), 404

    results = []
    rows = state_df.tail(n_days + 7).to_dict("records")
    recent = rows[-7:]  # last 7 rows for lag context

    for i, row_hist in enumerate(recent[-n_days:] if n_days <= len(recent) else rows):
        try:
            fdate = row_hist["date"] if isinstance(row_hist["date"], date) else pd.Timestamp(row_hist["date"]).date()
            demand_lag_1d = float(row_hist.get("demand_lag_1d", row_hist.get("energy_met", 100)))
            demand_lag_7d = float(row_hist.get("demand_lag_7d", demand_lag_1d))
            rolling_7d_mean = float(row_hist.get("rolling_7d_mean", demand_lag_1d))

            row = build_feature_row(fdate, state, demand_lag_1d, demand_lag_7d, rolling_7d_mean)
            out = run_prediction(row)
            results.append({
                "date": fdate.isoformat(),
                "actual_demand": float(row_hist.get("energy_met", 0)),
                **out,
            })
        except Exception as e:
            logger.warning(f"  Skipped row {i}: {e}")

    return jsonify({"state": state, "predictions": results})


@app.route("/states", methods=["GET"])
def states():
    return jsonify({"states": ALL_STATES})


@app.route("/historical", methods=["GET"])
def historical():
    """GET /historical?state=Karnataka&limit=60"""
    if hist_df.empty:
        return jsonify({"data": []})

    state = request.args.get("state", "Karnataka")
    limit = int(request.args.get("limit", 60))

    state_data = hist_df[hist_df["state"] == state].tail(limit)
    records = state_data[["date", "energy_met", "rolling_7d_mean"]].copy()
    records["date"] = records["date"].dt.strftime("%Y-%m-%d")
    return jsonify({"state": state, "data": records.to_dict("records")})


@app.route("/analytics/summary", methods=["GET"])
def analytics_summary():
    """Returns aggregate stats per state from historical data."""
    if hist_df.empty:
        return jsonify({"summary": []})

    summary = hist_df.groupby("state")["energy_met"].agg(
        mean="mean", max="max", min="min", count="count"
    ).reset_index()
    summary = summary.round(2)
    return jsonify({"summary": summary.to_dict("records")})


@app.route("/upload-csv", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        temp_path = os.path.join(tempfile.gettempdir(), file.filename)
        file.save(temp_path)

        if file.filename.endswith(('.xls', '.xlsx')):
            import pandas as pd
            df = pd.read_excel(temp_path)
            csv_path = temp_path.rsplit('.', 1)[0] + ".csv"
            df.to_csv(csv_path, index=False)
            logger.info(f"✅ Converted: {csv_path}")
            os.remove(temp_path)
            temp_path = csv_path

        upload_hist_df = hist_df.copy()
        if not upload_hist_df.empty and "energy_met" in upload_hist_df.columns and "energy_met_mu" not in upload_hist_df.columns:
            upload_hist_df = upload_hist_df.rename(columns={"energy_met": "energy_met_mu"})

        pred_df = run_pipeline(csv_path=temp_path, models_dir=MODEL_DIR, history_df=upload_hist_df)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        if pred_df.empty:
            return jsonify({"error": "No valid data extracted from CSV."}), 400

        required_cols = [
            "state", "report_date", "actual_energy_met_MU", "actual_max_demand_MW",
            "demand_ratio_rf", "predicted_energy_MU_rf",
            "demand_ratio_xgb", "predicted_energy_MU_xgb",
            "demand_ratio_ensemble", "predicted_energy_MU_ensemble",
            "predicted_energy_MU_48h_ensemble",
            "is_anomaly", "anomaly_score", "confidence_score"
        ]
        out_cols = [c for c in required_cols if c in pred_df.columns]
        out_df = pred_df[out_cols]

        return jsonify({"data": out_df.to_dict("records")})
    except Exception as e:
        logger.error(f"Error processing CSV: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    logger.info("Starting ML Service on port 5001 …")
    app.run(host="0.0.0.0", port=5001, debug=False)
