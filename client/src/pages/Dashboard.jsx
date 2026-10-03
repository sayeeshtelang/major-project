import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Zap, TrendingUp, RefreshCw, UploadCloud, Loader2 } from "lucide-react";
import KPICard from "../components/KPICard";
import DemandChart from "../components/Charts/DemandChart";
import EnergyScoreCard from "../components/EnergyScoreCard";
import { calculateEnergyEfficiencyScore } from "../utils/efficiencyScore";
import { predict, getHistoricalData, getAnalytics, getHistory, saveBatch } from "../services/api";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "DNH", "Delhi", "Goa", "Gujarat", "HP", "Haryana",
  "J&K", "Jharkhand", "Karnataka", "Kerala", "MP", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Pondy",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "UP", "Uttarakhand", "West Bengal"
];
const DEFAULT_STATE = "Karnataka";

// Calculate Future Peak Load in Megawatts (MW) based on Daily Demand (MU)
// Formula: P_peak (MW) = [(E_24h * 1000) / (24 * LF)] * K_coincidence * (1 + alpha_contingency)
const calculatePeakLoadMW = (demandMU) => {
  if (!demandMU || isNaN(demandMU)) return null;
  const loadFactor = 0.78;            // 78% typical grid daily load factor
  const coincidenceFactor = 1.12;     // 12% peak concentration multiplier
  const contingencyReserve = 0.05;    // 5% spinning reserve & weather margin

  const avgPowerMW = (demandMU * 1000) / 24;
  const basePeakMW = avgPowerMW / loadFactor;
  const coincidentPeakMW = basePeakMW * coincidenceFactor;
  const finalPeakMW = coincidentPeakMW * (1 + contingencyReserve);
  return finalPeakMW;
};

export default function Dashboard() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [kpi, setKpi] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastPred, setLastPred] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5001/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process file");
      }

      if (data.data && data.data.length > 0) {
        try {
          await saveBatch(data.data);
          await refresh();
        } catch (saveErr) {
          console.warn("Failed to save batch to DB:", saveErr);
          setUploadError("Failed to save predictions.");
        }
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
      e.target.value = null;
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, predRes, analyticsRes] = await Promise.allSettled([
        getHistoricalData({ state, limit: 60 }),
        getHistory({ state, limit: 1 }),
        getAnalytics(),
      ]);

      let histData = [];
      if (histRes.status === "fulfilled") {
        histData = histRes.value.data?.data || [];
      }

      let predData = null;
      if (predRes.status === "fulfilled" && predRes.value.data?.records?.length > 0) {
        const record = predRes.value.data.records[0];
        predData = {
          forecast_date: record.forecast_date,
          prediction_24h: {
            rf_demand_MU: record.rf_demand_24h,
            xgb_demand_MU: record.xgb_demand_24h,
            final_demand_MU: record.final_demand_24h,
            confidence_score: record.confidence_score,
            rf_fallback_used: record.rf_fallback_used,
            xgb_fallback_used: record.xgb_fallback_used,
          },
          prediction_48h: {
            final_demand_MU: record.final_demand_48h || null,
          },
          _fallback: record.prediction_source === "FALLBACK",
          source: record.prediction_source
        };
        setLastPred(predData);
      } else {
        setLastPred(null);
      }

      // Merge historical + predictions for chart
      const merged = histData.map((h, i) => ({
        date: h.date,
        energy_met: h.energy_met || h.rolling_7d_mean,
        rolling_7d_mean: h.rolling_7d_mean,
        final_demand_24h: null,
      }));

      if (predData?.prediction_24h) {
        merged.push({
          date: predData.forecast_date.split("T")[0],
          energy_met: null,
          rolling_7d_mean: null,
          final_demand_24h: predData.prediction_24h.final_demand_MU,
        });
      }
      setChartData(merged.slice(-40));

      if (analyticsRes.status === "fulfilled") {
        setAnalytics(analyticsRes.value.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => { refresh(); }, [refresh]);

  const pred24 = lastPred?.prediction_24h;
  const pred48 = lastPred?.prediction_48h;
  const peakLoadMW = pred24?.final_demand_MU ? calculatePeakLoadMW(pred24.final_demand_MU) : null;

  // Compute normalized Energy Efficiency Score dynamically
  const efficiencyScoreData = useMemo(() => {
    if (!pred24?.final_demand_MU) {
      return calculateEnergyEfficiencyScore({
        loadFactor: 78.0,
        energySavingPct: 12.5,
        renewableContributionPct: 33.3,
        peakPerformanceScore: 85.0,
      });
    }

    const demandMU = pred24.final_demand_MU;
    const loadFactor = 78.0;
    const coincidenceFactor = 1.12;
    const contingencyReserve = 0.05;

    // Peak Performance Score (0 - 100)
    const peakPerformanceScore = Math.min(100, Math.max(0, 100 / (coincidenceFactor * (1 + contingencyReserve))));

    // PSO cost saving heuristic for current state demand
    const numGen = 3;
    const generators = [
      { min: 10, max: 1000, a: 500, b: 15, c: 0.05 },
      { min: 10, max: 1000, a: 400, b: 20, c: 0.06 },
      { min: 0,  max: 500,  a: 0,   b: 5,  c: 0.01 }
    ];

    let equalPower = demandMU / numGen;
    let priorCost = 0;
    for (let i = 0; i < numGen; i++) {
      let p = Math.max(generators[i].min, Math.min(generators[i].max, equalPower));
      priorCost += generators[i].a + generators[i].b * p + generators[i].c * p * p;
    }
    let priorPerUnit = priorCost / demandMU;

    // Dispatch renewables up to 35% of total demand
    let pRenewables = Math.min(generators[2].max, demandMU * 0.35);
    let remDemand = demandMU - pRenewables;
    let pCoal = remDemand * 0.55;
    let pGas = remDemand * 0.45;

    let postCost = (generators[0].a + generators[0].b * pCoal + generators[0].c * pCoal * pCoal) +
                   (generators[1].a + generators[1].b * pGas + generators[1].c * pGas * pGas) +
                   (generators[2].a + generators[2].b * pRenewables + generators[2].c * pRenewables * pRenewables);
    let postPerUnit = postCost / demandMU;

    let energySavingPct = priorPerUnit > 0 ? Math.max(0, ((priorPerUnit - postPerUnit) / priorPerUnit) * 100) : 12.5;
    let totalGen = pCoal + pGas + pRenewables;
    let renewableContributionPct = totalGen > 0 ? (pRenewables / totalGen) * 100 : 33.3;

    return calculateEnergyEfficiencyScore({
      loadFactor,
      energySavingPct,
      renewableContributionPct,
      peakPerformanceScore,
    });
  }, [pred24?.final_demand_MU]);

  return (
    <div className="fade-in">
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <select value={state} onChange={e => setState(e.target.value)}>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {(!lastPred || lastPred.source !== "ENSEMBLE (CSV Upload)") ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            No Data Available
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto", marginBottom: 24 }}>
            The dashboard currently shows no optimization results. Upload your daily report (CSV/XLS) to view regional metrics.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <label className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: uploadLoading ? "not-allowed" : "pointer", background: "var(--accent-blue)", color: "#fff", padding: "10px 24px", borderRadius: 8 }}>
              {uploadLoading ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
              {uploadLoading ? "Processing..." : "Upload Report"}
              <input type="file" accept=".csv, .xls, .xlsx" onChange={handleFileUpload} disabled={uploadLoading} style={{ display: "none" }} />
            </label>
            {uploadError && <div style={{ color: "var(--accent-red)", fontSize: 14 }}>{uploadError}</div>}
          </div>
        </div>
      ) : (
        <>
          {/* Energy Efficiency Score Section */}
          <div style={{ marginBottom: 20 }}>
            <EnergyScoreCard scoreData={efficiencyScoreData} loading={loading} />
          </div>

          {/* KPI Row */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <KPICard
              title="24h Predicted Demand"
              value={pred24?.final_demand_MU ? pred24.final_demand_MU.toFixed(1) : "—"}
              unit="MU" icon={Zap} accent="blue"
              loading={loading}
            />
            <KPICard
              title="Future Peak Load Prediction"
              value={peakLoadMW ? peakLoadMW.toFixed(1) : "—"}
              unit="MW" icon={TrendingUp} accent="purple"
              sub={peakLoadMW ? "Est. Peak Window: 18:00–22:00 | LF: 78%" : null}
              loading={loading}
            />
          </div>

          {/* Charts */}
          <div style={{ marginBottom: 20 }}>
            <DemandChart data={chartData} title={`${state} — Demand Trend`} />
          </div>
        </>
      )}
    </div>
  );
}


