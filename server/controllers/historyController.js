const PredictionLog = require("../models/PredictionLog");
const mlService = require("../services/mlService");

async function getHistory(req, res) {
  const { state, limit = 50, anomaly_only } = req.query;
  const query = {};
  if (state) query.state = state;
  if (anomaly_only === "true") query.is_anomaly = true;

  try {
    const records = await PredictionLog.findWithFallback(query, parseInt(limit));
    res.json({ count: records.length, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getAnomalies(req, res) {
  const { state, limit = 50 } = req.query;
  const query = { is_anomaly: true };
  if (state) query.state = state;

  try {
    const records = await PredictionLog.findWithFallback(query, parseInt(limit));
    res.json({ count: records.length, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getHistoricalData(req, res) {
  const { state = "Karnataka", limit = 60 } = req.query;
  try {
    const data = await mlService.getHistorical(state, parseInt(limit));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getHistory, getAnomalies, getHistoricalData };
