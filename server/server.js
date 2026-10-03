const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const predictRoutes = require("./routes/predict");
const historyRoutes = require("./routes/history");
const analyticsRoutes = require("./routes/analytics");
const exportRoutes = require("./routes/export");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/exports", express.static(path.join(__dirname, "exports")));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", predictRoutes);
app.use("/api", historyRoutes);
app.use("/api", analyticsRoutes);
app.use("/api/export", exportRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/energy_forecasting";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅  MongoDB connected"))
  .catch((err) => {
    console.warn(`⚠️  MongoDB not connected: ${err.message}. Running in memory-fallback mode.`);
  });

app.listen(PORT, () => {
  console.log(`🚀  Node server running on port ${PORT}`);
});
