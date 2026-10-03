const PredictionLog = require("../models/PredictionLog");
const mlService = require("../services/mlService");

async function getAnalytics(req, res) {
  try {
    const [logs, mlSummary] = await Promise.allSettled([
      PredictionLog.findWithFallback({}, 200),
      mlService.getAnalyticsSummary(),
    ]);

    const records = logs.status === "fulfilled" ? logs.value : [];
    const statSummary = mlSummary.status === "fulfilled" ? mlSummary.value.summary : [];

    // Per-state aggregation from logs
    const stateMap = {};
    for (const r of records) {
      if (!stateMap[r.state]) {
        stateMap[r.state] = {
          state: r.state,
          count: 0,
          totalDemand: 0,
          anomalies: 0,
          totalConfidence: 0,
        };
      }
      stateMap[r.state].count++;
      stateMap[r.state].totalDemand += r.final_demand_24h || 0;
      stateMap[r.state].anomalies += r.is_anomaly ? 1 : 0;
      stateMap[r.state].totalConfidence += r.confidence_score || 0;
    }

    const stateStats = Object.values(stateMap).map((s) => ({
      state: s.state,
      predictions: s.count,
      avg_demand: s.count > 0 ? +(s.totalDemand / s.count).toFixed(2) : 0,
      anomaly_rate: s.count > 0 ? +((s.anomalies / s.count) * 100).toFixed(1) : 0,
      avg_confidence: s.count > 0 ? +(s.totalConfidence / s.count).toFixed(3) : 0,
    }));

    // Model comparison from logs
    const rfValues = records.map((r) => r.rf_demand_24h).filter(Boolean);
    const xgbValues = records.map((r) => r.xgb_demand_24h).filter(Boolean);
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const modelComparison = {
      rf: { avg_demand: +avg(rfValues).toFixed(2), count: rfValues.length },
      xgb: { avg_demand: +avg(xgbValues).toFixed(2), count: xgbValues.length },
    };

    res.json({
      total_predictions: records.length,
      total_anomalies: records.filter((r) => r.is_anomaly).length,
      state_stats: stateStats,
      model_comparison: modelComparison,
      ml_historical_summary: statSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getStates(req, res) {
  try {
    const data = await mlService.getStates();
    res.json(data);
  } catch {
    res.json({
      states: [
        "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh",
        "Chhattisgarh","DNH","Delhi","Goa","Gujarat","HP","Haryana",
        "J&K","Jharkhand","Karnataka","Kerala","MP","Maharashtra",
        "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Pondy",
        "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
        "UP","Uttarakhand","West Bengal",
      ],
    });
  }
}

module.exports = { getAnalytics, getStates };
