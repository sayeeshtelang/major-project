import React, { useState } from "react";
import { FileText, Download, Table } from "lucide-react";
import { exportCSV, exportPDF } from "../services/api";

const ALL_STATES = [
  "All States","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh",
  "Chhattisgarh","DNH","Delhi","Goa","Gujarat","HP","Haryana",
  "J&K","Jharkhand","Karnataka","Kerala","MP","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Pondy",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "UP","Uttarakhand","West Bengal",
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [state, setState] = useState("All States");
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const handleExport = async (type) => {
    setLoading(type);
    setMessage(null);
    try {
      const stateParam = state === "All States" ? undefined : state;
      const res = type === "csv"
        ? await exportCSV(stateParam)
        : await exportPDF(stateParam);

      const ext = type === "csv" ? "csv" : "pdf";
      const fname = `energy_report_${state.replace(/ /g, "_")}_${Date.now()}.${ext}`;
      downloadBlob(new Blob([res.data]), fname);
      setMessage({ type: "success", text: `${ext.toUpperCase()} downloaded: ${fname}` });
    } catch (err) {
      setMessage({ type: "error", text: `Export failed: ${err.message}` });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Export prediction and anomaly data as PDF or CSV</p>
      </div>

      {/* Export card */}
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Generate Report</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
          Includes prediction logs, anomaly status, model outputs, and timestamps.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)",
            marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Filter by State
          </label>
          <select value={state} onChange={e => setState(e.target.value)} style={{ width: "100%" }}>
            {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => handleExport("pdf")}
            disabled={!!loading}
            style={{ flex: 1 }}
          >
            <FileText size={14} />
            {loading === "pdf" ? "Generating PDF…" : "Export PDF"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("csv")}
            disabled={!!loading}
            style={{ flex: 1 }}
          >
            <Table size={14} />
            {loading === "csv" ? "Generating CSV…" : "Export CSV"}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12,
            background: message.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: message.type === "success" ? "var(--accent-green)" : "var(--accent-red)",
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* Report contents info */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Report Contents</div>
        <div className="grid-2">
          {[
            { title: "Prediction & Optimization Report", items: ["State & Date", "Final Predicted Demand", "Optimal Coal Generation (MU)", "Optimal Gas Generation (MU)", "Optimal Renewables (MU)", "Cost per unit (₹)", "Cost Savings (%)", "Anomaly Flag & Severity"] },
          ].map(section => (
            <div key={section.title} style={{
              background: "var(--bg-secondary)", borderRadius: 8, padding: 16,
            }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent-blue)", marginBottom: 10 }}>
                {section.title}
              </div>
              {section.items.map(item => (
                <div key={item} style={{
                  fontSize: 12, color: "var(--text-secondary)", padding: "4px 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: "var(--accent-green)", fontSize: 10 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
