import React, { useState } from "react";
import { UploadCloud, FileText, Download, Loader2, AlertCircle } from "lucide-react";
import { saveBatch } from "../services/api";

export default function UploadCSV() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResults([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // The ML service runs on port 5001
      const res = await fetch("http://localhost:5001/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process CSV");
      }

      setResults(data.data || []);
      
      if (data.data && data.data.length > 0) {
        try {
          await saveBatch(data.data);
        } catch (saveErr) {
          console.warn("Failed to save batch to DB:", saveErr);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (results.length === 0) return;

    const headers = [
      "state",
      "report_date",
      "actual_energy_met_MU",
      "actual_max_demand_MW",
      "demand_ratio_rf",
      "predicted_energy_MU_rf",
      "demand_ratio_xgb",
      "predicted_energy_MU_xgb",
      "demand_ratio_ensemble",
      "predicted_energy_MU_ensemble",
      "predicted_energy_MU_48h_ensemble",
      "confidence_score",
      "is_anomaly",
      "anomaly_score"
    ];

    const csvContent = [
      headers.join(","),
      ...results.map(row => headers.map(header => row[header] ?? "").join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `predictions_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
        Upload PSP Report
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>
        Upload the daily NLDC PSP report (CSV/XLS) to extract features and generate predictions.
      </p>

      <div style={{ 
        background: "var(--bg-secondary)", 
        padding: 32, 
        borderRadius: 16, 
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20
      }}>
        <div style={{
          width: 80, height: 80,
          background: "rgba(59,130,246,0.1)",
          borderRadius: 40,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <UploadCloud size={40} color="var(--accent-blue)" />
        </div>

        <div style={{ textAlign: "center" }}>
          <label style={{
            background: "var(--accent-blue)", color: "#fff",
            padding: "10px 24px", borderRadius: 8,
            cursor: "pointer", fontWeight: 600,
            display: "inline-block", marginBottom: 12
          }}>
            Choose File
            <input type="file" accept=".csv, .xls, .xlsx" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
          {file && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: "var(--text-primary)", fontSize: 14 }}>
              <FileText size={16} />
              <span>{file.name}</span>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload} 
          disabled={!file || loading}
          style={{
            background: file && !loading ? "var(--text-primary)" : "var(--border)",
            color: file && !loading ? "var(--bg-primary)" : "var(--text-muted)",
            padding: "12px 32px", borderRadius: 8,
            fontWeight: 600, border: "none", cursor: file && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s"
          }}
        >
          {loading ? <Loader2 size={18} className="spin" /> : null}
          {loading ? "Processing..." : "Run Predictions"}
        </button>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-red)", background: "rgba(239,68,68,0.1)", padding: "12px 20px", borderRadius: 8 }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Prediction Results</h2>
            <button 
              onClick={handleDownloadCSV}
              style={{
                background: "var(--accent-green)", color: "#fff", border: "none",
                padding: "8px 16px", borderRadius: 6, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                fontSize: 14
              }}
            >
              <Download size={16} /> Export to CSV
            </button>
          </div>

          <div style={{ overflowX: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  {Object.keys(results[0]).map(key => (
                    <th key={key} style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: row.is_anomaly ? "rgba(239,68,68,0.05)" : "transparent" }}>
                    {Object.keys(results[0]).map(key => (
                      <td key={key} style={{ padding: "16px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                        {typeof row[key] === "number" ? row[key].toFixed(4) : row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}