const express = require("express");
const router = express.Router();
const { getAnalytics, getStates } = require("../controllers/analyticsController");

router.get("/analytics", getAnalytics);
router.get("/states", getStates);

module.exports = router;
