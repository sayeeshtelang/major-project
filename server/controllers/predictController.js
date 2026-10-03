const mlService = require("../services/mlService");
const { fallbackPredict } = require("../services/fallbackService");
const PredictionLog = require("../models/PredictionLog");

/**
 * POST /api/predict
 * Accepts a state name; auto-fetches latest data from ML service historical endpoint
 * and runs a forecast for the next day.
 */
async function runPredict(req, res) {
  const { state = "Karnataka", forecast_date, demand_lag_1d, demand_lag_7d,
          rolling_7d_mean, diff_1d = 0, rolling_diff = 0 } = req.body;

  let payload = { state, forecast_date, demand_lag_1d, demand_lag_7d,
                  rolling_7d_mean, diff_1d, rolling_diff };

  // Auto-derive from historical data if lag values not provided
  if (!demand_lag_1d || !rolling_7d_mean) {
    try {
      const hist = await mlService.getHistorical(state, 10);
      const rows = hist.data || [];
      if (rows.length >= 1) {
        payload.demand_lag_1d = rows[0].energy_met || rows[0].rolling_7d_mean || 100;
        payload.demand_lag_7d = rows.length >= 7
          ? rows[6].energy_met || rows[6].rolling_7d_mean || 100
          : rows[0].energy_met || 100;
        payload.rolling_7d_mean = rows[0].rolling_7d_mean || payload.demand_lag_1d;
        if (!forecast_date) {
          const lastDate = new Date(rows[0].date);
          lastDate.setDate(lastDate.getDate() + 1);
          payload.forecast_date = lastDate.toISOString().split("T")[0];
        }
        console.log(`[AUTO] Derived features from historical data for ${state}`);
      }
    } catch (err) {
      console.warn(`[WARN] Could not auto-derive features: ${err.message}`);
    }
  }

  // Defaults if still missing
  payload.demand_lag_1d = payload.demand_lag_1d || 100;
  payload.demand_lag_7d = payload.demand_lag_7d || 100;
  payload.rolling_7d_mean = payload.rolling_7d_mean || 100;
  payload.forecast_date = payload.forecast_date || new Date().toISOString().split("T")[0];

  let result;
  let usedFallback = false;

  try {
    result = await mlService.predict(payload);
  } catch (err) {
    console.error(`[ERROR] ML service unavailable: ${err.message}`);
    result = fallbackPredict(payload);
    usedFallback = true;
  }

  // Persist log
  try {
    const logDoc = {
      state,
      forecast_date: new Date(payload.forecast_date),
      input: {
        demand_lag_1d: payload.demand_lag_1d,
        demand_lag_7d: payload.demand_lag_7d,
        rolling_7d_mean: payload.rolling_7d_mean,
        diff_1d: payload.diff_1d,
        rolling_diff: payload.rolling_diff,
      },
      rf_demand_24h: result.prediction_24h?.rf_demand_MU,
      xgb_demand_24h: result.prediction_24h?.xgb_demand_MU,
      final_demand_24h: result.prediction_24h?.final_demand_MU,
      confidence_score: result.prediction_24h?.confidence_score,
      rf_fallback_used: result.prediction_24h?.rf_fallback_used || usedFallback,
      xgb_fallback_used: result.prediction_24h?.xgb_fallback_used || usedFallback,
      rf_demand_48h: result.prediction_48h?.rf_demand_MU,
      final_demand_48h: result.prediction_48h?.final_demand_MU,
      is_anomaly: result.prediction_24h?.is_anomaly || false,
      anomaly_score: result.prediction_24h?.anomaly_score,
      anomaly_severity: result.prediction_24h?.anomaly_severity || "none",
      prediction_source: usedFallback ? "FALLBACK" : "ENSEMBLE",
    };
    await PredictionLog.saveWithFallback(logDoc);
  } catch (logErr) {
    console.warn(`[WARN] Could not save log: ${logErr.message}`);
  }

  res.json({ ...result, _fallback: usedFallback });
}

/**
 * POST /api/anomaly
 */
async function runAnomaly(req, res) {
  const { rf_ratio } = req.body;
  if (rf_ratio === undefined) {
    return res.status(400).json({ error: "rf_ratio required" });
  }
  try {
    const result = await mlService.checkAnomaly(parseFloat(rf_ratio));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function saveBatchPredict(req, res) {
  const { results } = req.body;
  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: "Invalid payload, expected array of results" });
  }

  try {
    for (const r of results) {
      if (!r.state || !r.report_date) continue;
      
      const logDoc = {
        state: r.state,
        forecast_date: new Date(r.report_date),
        input: {},
        rf_demand_24h: r.predicted_energy_MU_rf,
        xgb_demand_24h: r.predicted_energy_MU_xgb,
        final_demand_24h: r.predicted_energy_MU_ensemble || r.predicted_energy_MU_rf,
        final_demand_48h: r.predicted_energy_MU_48h_ensemble,
        confidence_score: r.confidence_score || 0.5,
        rf_fallback_used: false,
        xgb_fallback_used: false,
        is_anomaly: r.is_anomaly === 1 || r.is_anomaly === true,
        anomaly_score: r.anomaly_score,
        anomaly_severity: r.anomaly_score <= -0.61 ? "high" : (r.anomaly_score <= -0.35 ? "low" : "none"),
        prediction_source: "ENSEMBLE (CSV Upload)",
      };
      
      await PredictionLog.saveWithFallback(logDoc);
    }
    res.json({ message: "Batch saved successfully", count: results.length });
  } catch (err) {
    console.error(`[ERROR] Batch save failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { runPredict, runAnomaly, saveBatchPredict };
