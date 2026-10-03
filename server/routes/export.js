const express = require("express");
const router = express.Router();
const { exportCSV, exportPDF } = require("../controllers/exportController");

router.get("/csv", exportCSV);
router.get("/pdf", exportPDF);

module.exports = router;
