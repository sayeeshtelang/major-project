const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

const EXPORT_DIR = path.join(__dirname, "../exports");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

class PSO {
  constructor(demand, numParticles = 30, maxIter = 50) {
    this.demand = demand;
    this.numParticles = numParticles;
    this.maxIter = maxIter;
    this.generators = [
      { min: 10, max: 1000, a: 500, b: 15, c: 0.05 },
      { min: 10, max: 1000, a: 400, b: 20, c: 0.06 },
      { min: 0,  max: 500,  a: 0,   b: 5,  c: 0.01 }
    ];
    this.numGen = this.generators.length;
  }
  costFunction(powers) {
    let cost = 0; let totalPower = 0;
    for (let i = 0; i < this.numGen; i++) {
      let p = powers[i]; let g = this.generators[i];
      cost += g.a + g.b * p + g.c * p * p;
      totalPower += p;
    }
    let penalty = Math.pow(Math.abs(totalPower - this.demand), 2) * 1000;
    return cost + penalty;
  }
  optimize() {
    let particles = [], velocities = [], pBest = [], pBestCost = [], gBest = null, gBestCost = Infinity;
    for (let i = 0; i < this.numParticles; i++) {
      let position = [], velocity = [];
      for (let j = 0; j < this.numGen; j++) {
        let g = this.generators[j];
        let val = (this.demand / this.numGen) + (Math.random() * 20 - 10);
        val = Math.max(g.min, Math.min(g.max, val));
        position.push(val); velocity.push((Math.random() * 2 - 1) * 10);
      }
      let cost = this.costFunction(position);
      particles.push(position); velocities.push(velocity);
      pBest.push([...position]); pBestCost.push(cost);
      if (cost < gBestCost) { gBestCost = cost; gBest = [...position]; }
    }
    let w = 0.7, c1 = 1.5, c2 = 1.5;
    for (let iter = 0; iter < this.maxIter; iter++) {
      for (let i = 0; i < this.numParticles; i++) {
        for (let j = 0; j < this.numGen; j++) {
          let r1 = Math.random(), r2 = Math.random(), g = this.generators[j];
          velocities[i][j] = w * velocities[i][j] + c1 * r1 * (pBest[i][j] - particles[i][j]) + c2 * r2 * (gBest[j] - particles[i][j]);
          particles[i][j] += velocities[i][j];
          particles[i][j] = Math.max(g.min, Math.min(g.max, particles[i][j]));
        }
        let cost = this.costFunction(particles[i]);
        if (cost < pBestCost[i]) {
          pBestCost[i] = cost; pBest[i] = [...particles[i]];
          if (cost < gBestCost) { gBestCost = cost; gBest = [...particles[i]]; }
        }
      }
    }
    let pureCost = 0;
    for (let i = 0; i < this.numGen; i++) {
      pureCost += this.generators[i].a + this.generators[i].b * gBest[i] + this.generators[i].c * gBest[i] * gBest[i];
    }
    return { gBest, pureCost };
  }
}

function processWithOptimization(records) {
  return records.map(r => {
    let demand = r.final_demand_24h || 100;
    let priorCost = 0;
    let equalPower = demand / 3;
    const generators = [
      { min: 10, max: 1000, a: 500, b: 15, c: 0.05 },
      { min: 10, max: 1000, a: 400, b: 20, c: 0.06 },
      { min: 0,  max: 500,  a: 0,   b: 5,  c: 0.01 }
    ];
    for(let i = 0; i < 3; i++) {
       let p = Math.max(generators[i].min, Math.min(generators[i].max, equalPower));
       let g = generators[i];
       priorCost += g.a + g.b * p + g.c * p * p;
    }
    let priorPerUnit = demand > 0 ? (priorCost / demand) : 0;
    let pso = new PSO(demand);
    let { gBest, pureCost } = pso.optimize();
    let postPerUnit = demand > 0 ? (pureCost / demand) : 0;
    let savings = priorPerUnit > 0 ? ((priorPerUnit - postPerUnit) / priorPerUnit) * 100 : 0;
    
    return {
      ...(r._doc || r),
      coal_gen_MU: gBest[0],
      gas_gen_MU: gBest[1],
      renewable_gen_MU: gBest[2],
      prior_cost_per_unit: priorPerUnit,
      optimized_cost_per_unit: postPerUnit,
      savings_percent: savings
    };
  });
}

function toCSV(records) {
  const fields = [
    "state", "forecast_date", "final_demand_24h", "rf_demand_24h",
    "xgb_demand_24h", "final_demand_48h", "confidence_score",
    "is_anomaly", "anomaly_score", "anomaly_severity",
    "rf_fallback_used", "xgb_fallback_used", "created_at",
    "coal_gen_MU", "gas_gen_MU", "renewable_gen_MU",
    "prior_cost_per_unit", "optimized_cost_per_unit", "savings_percent"
  ];
  const parser = new Parser({ fields });
  return parser.parse(records);
}

function generateCSV(records) {
  const processedRecords = processWithOptimization(records);
  const csv = toCSV(processedRecords);
  const filename = `energy_report_${Date.now()}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);
  fs.writeFileSync(filepath, csv);
  return filepath;
}

function generatePDF(records, title = "Energy Demand Forecast Report") {
  const filename = `energy_report_${Date.now()}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#1e3a5f")
    .text(title, { align: "center" });

  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666")
    .text(`Generated: ${new Date().toISOString()}`, { align: "center" });

  doc.moveDown(1);

  const processedRecords = processWithOptimization(records);

  // Summary stats
  const anomalyCount = processedRecords.filter((r) => r.is_anomaly).length;
  const avgDemand = processedRecords.reduce((s, r) => s + (r.final_demand_24h || 0), 0) / processedRecords.length;

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1e3a5f").text("Summary");
  doc.moveDown(0.3);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#333")
    .text(`Total Records: ${processedRecords.length}`)
    .text(`Anomalies Detected: ${anomalyCount}`)
    .text(`Average Predicted Demand: ${avgDemand.toFixed(2)} MU`);

  doc.moveDown(1);

  // Table header
  const colWidths = [80, 60, 50, 40, 50, 50, 50, 45, 50];
  const headers = ["State", "Date", "Final(MU)", "Anom.", "Coal(MU)", "Gas(MU)", "Solar(MU)", "Cost", "Savings"];
  const startX = 20;

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#fff");
  let xPos = startX;
  const headerY = doc.y;
  doc.rect(startX, headerY - 2, colWidths.reduce((a, b) => a + b, 0), 16).fill("#1e3a5f");

  headers.forEach((h, i) => {
    doc.fillColor("#fff").text(h, xPos + 3, headerY, { width: colWidths[i], lineBreak: false });
    xPos += colWidths[i];
  });

  doc.moveDown(0.5);

  // Table rows
  processedRecords.slice(0, 60).forEach((r, idx) => {
    const rowY = doc.y;
    if (idx % 2 === 0) {
      doc.rect(startX, rowY - 2, colWidths.reduce((a, b) => a + b, 0), 14).fill("#f0f4f8");
    }

    const cols = [
      r.state || "-",
      r.forecast_date ? new Date(r.forecast_date).toLocaleDateString() : "-",
      (r.final_demand_24h || 0).toFixed(1),
      r.is_anomaly ? "YES ⚠" : "No",
      (r.coal_gen_MU || 0).toFixed(1),
      (r.gas_gen_MU || 0).toFixed(1),
      (r.renewable_gen_MU || 0).toFixed(1),
      "₹" + (r.optimized_cost_per_unit || 0).toFixed(2),
      (r.savings_percent || 0).toFixed(1) + "%",
    ];

    let xPosLoop = startX;
    doc.font("Helvetica").fontSize(7).fillColor(r.is_anomaly ? "#c0392b" : "#333");
    cols.forEach((c, i) => {
      doc.text(String(c), xPosLoop + 3, rowY, { width: colWidths[i], lineBreak: false });
      xPosLoop += colWidths[i];
    });
    doc.moveDown(0.4);

    if (doc.y > 760) {
      doc.addPage();
    }
  });

  if (processedRecords.length > 60) {
    doc.moveDown().font("Helvetica").fontSize(9).fillColor("#666")
      .text(`… and ${processedRecords.length - 60} more records. Export CSV for full data.`);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}

module.exports = { generateCSV, generatePDF };
