/**
 * Fallback Service — returns safe predictions when ML service is unavailable.
 * Uses rolling_7d_mean as the fallback demand estimate.
 */

function fallbackPredict(payload) {
  const { rolling_7d_mean = 100, demand_lag_1d = 100, state } = payload;
  console.warn(`[FALLBACK] ML service unavailable — using rolling mean fallback for ${state}`);
  console.warn(`[FALLBACK] Prediction Source: FALLBACK ACTIVATED | reason: ML service unreachable`);

  return {
    state,
    forecast_date: payload.forecast_date,
    prediction_24h: {
      rf_ratio: 1.0,
      rf_demand_MU: rolling_7d_mean,
      xgb_ratio: 1.0,
      xgb_demand_MU: rolling_7d_mean,
      final_demand_MU: rolling_7d_mean,
      final_ratio: 1.0,
      confidence_score: 0.5,
      is_anomaly: false,
      anomaly_score: -0.4,
      anomaly_severity: "none",
      rf_fallback_used: true,
      xgb_fallback_used: true,
    },
    prediction_48h: {
      rf_demand_MU: rolling_7d_mean,
      xgb_demand_MU: rolling_7d_mean,
      final_demand_MU: rolling_7d_mean,
      is_anomaly: false,
      anomaly_score: -0.4,
      anomaly_severity: "none",
    },
    _fallback: true,
  };
}

module.exports = { fallbackPredict };
