const express = require("express");
const router = express.Router();
const { runPredict, runAnomaly, saveBatchPredict } = require("../controllers/predictController");

router.post("/predict", runPredict);
router.post("/anomaly", runAnomaly);
router.post("/predict/batch", saveBatchPredict);

module.exports = router;
