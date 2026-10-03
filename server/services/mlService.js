const axios = require("axios");

const ML_BASE = process.env.ML_SERVICE_URL || "http://localhost:5001";

const mlClient = axios.create({
  baseURL: ML_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Run 24h + 48h prediction for a state on a given date.
 */
async function predict(payload) {
  const { data } = await mlClient.post("/predict", payload);
  return data;
}

/**
 * Run IsolationForest anomaly check on a raw rf_ratio.
 */
async function checkAnomaly(rf_ratio) {
  const { data } = await mlClient.post("/anomaly", { rf_ratio });
  return data;
}

/**
 * Batch-predict for a state over last n_days of historical data.
 */
async function batchPredict(state, n_days = 30) {
  const { data } = await mlClient.post("/batch-predict", { state, n_days });
  return data;
}

/**
 * Fetch historical demand from ML service.
 */
async function getHistorical(state, limit = 60) {
  const { data } = await mlClient.get("/historical", { params: { state, limit } });
  return data;
}

/**
 * Fetch analytics summary from ML service.
 */
async function getAnalyticsSummary() {
  const { data } = await mlClient.get("/analytics/summary");
  return data;
}

async function getStates() {
  const { data } = await mlClient.get("/states");
  return data;
}

async function checkHealth() {
  const { data } = await mlClient.get("/health");
  return data;
}

module.exports = {
  predict,
  checkAnomaly,
  batchPredict,
  getHistorical,
  getAnalyticsSummary,
  getStates,
  checkHealth,
};
