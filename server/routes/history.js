const express = require("express");
const router = express.Router();
const { getHistory, getAnomalies, getHistoricalData } = require("../controllers/historyController");

router.get("/history", getHistory);
router.get("/anomalies", getAnomalies);
router.get("/historical-data", getHistoricalData);

module.exports = router;
