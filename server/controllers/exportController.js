const path = require("path");
const PredictionLog = require("../models/PredictionLog");
const { generateCSV, generatePDF } = require("../services/exportService");

async function exportCSV(req, res) {
  const { state } = req.query;
  const query = {};
  if (state) query.state = state;

  try {
    const records = await PredictionLog.findWithFallback(query, 500);
    const uniqueStates = new Map();
    for (const r of records) {
        if (!uniqueStates.has(r.state) && r.prediction_source === "ENSEMBLE (CSV Upload)") {
            uniqueStates.set(r.state, r);
        }
    }
    // If state param was provided, uniqueStates will just have that 1 state
    const latestRecords = Array.from(uniqueStates.values());

    const filepath = generateCSV(latestRecords);
    res.download(filepath, path.basename(filepath), () => {
      // cleanup optional
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function exportPDF(req, res) {
  const { state } = req.query;
  const query = {};
  if (state) query.state = state;

  try {
    const records = await PredictionLog.findWithFallback(query, 500);
    const uniqueStates = new Map();
    for (const r of records) {
        if (!uniqueStates.has(r.state) && r.prediction_source === "ENSEMBLE (CSV Upload)") {
            uniqueStates.set(r.state, r);
        }
    }
    const latestRecords = Array.from(uniqueStates.values());

    const title = state
      ? `Energy Demand Forecast & Optimization Report — ${state}`
      : "Energy Demand Forecast & Optimization Report — All States";
    const filepath = await generatePDF(latestRecords, title);
    res.download(filepath, path.basename(filepath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportCSV, exportPDF };
