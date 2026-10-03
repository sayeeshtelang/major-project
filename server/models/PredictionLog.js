const mongoose = require("mongoose");

const PredictionLogSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, index: true },
    forecast_date: { type: Date, required: true },

    // Input features stored for traceability
    input: {
      demand_lag_1d: Number,
      demand_lag_7d: Number,
      rolling_7d_mean: Number,
      diff_1d: Number,
      rolling_diff: Number,
    },

    // 24h outputs
    rf_demand_24h: Number,
    xgb_demand_24h: Number,
    final_demand_24h: Number,
    confidence_score: Number,
    rf_fallback_used: Boolean,
    xgb_fallback_used: Boolean,

    // 48h outputs
    rf_demand_48h: Number,
    final_demand_48h: Number,

    // Anomaly
    is_anomaly: { type: Boolean, default: false, index: true },
    anomaly_score: Number,
    anomaly_severity: { type: String, enum: ["none", "low", "high"], default: "none" },

    // Meta
    prediction_source: { type: String, default: "ENSEMBLE" },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// In-memory fallback store (when MongoDB is unavailable)
const inMemoryStore = [];

PredictionLogSchema.statics.saveWithFallback = async function (doc) {
  try {
    const saved = await this.create(doc);
    return saved;
  } catch {
    const record = { _id: Date.now().toString(), ...doc, createdAt: new Date() };
    inMemoryStore.push(record);
    if (inMemoryStore.length > 500) inMemoryStore.shift(); // cap at 500
    return record;
  }
};

PredictionLogSchema.statics.findWithFallback = async function (query = {}, limit = 100) {
  try {
    return await this.find(query).sort({ created_at: -1 }).limit(limit).lean();
  } catch {
    return inMemoryStore.slice(-limit).reverse();
  }
};

module.exports = mongoose.model("PredictionLog", PredictionLogSchema);
