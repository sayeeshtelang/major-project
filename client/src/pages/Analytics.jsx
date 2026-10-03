import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { getAnalytics } from "../services/api";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label || payload[0]?.payload?.state}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || "var(--accent-blue)" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("avg_demand");

  useEffect(() => {
    getAnalytics().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (!data) return <div style={{ color: "var(--text-muted)" }}>No analytics data available</div>;

  const stateStats = [...(data.state_stats || [])].sort((a, b) => {
    if (sortBy === "state") return a.state.localeCompare(b.state);
    return b[sortBy] - a[sortBy];
  });
  const mlSummary = [...(data.ml_historical_summary || [])].sort((a, b) => b.mean - a.mean);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>State-wise demand statistics and model performance</p>
      </div>

      {/* Historical demand chart */}
      {mlSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Historical Avg Demand by State</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mlSummary.slice(0, 20)} margin={{ top: 4, right: 4, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="state" tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                tickLine={false} axisLine={false} angle={-40} textAnchor="end" />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="mean" name="Mean Demand (MU)" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* State stats table */}
      {stateStats.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>State Prediction Stats</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 12, padding: "5px 10px" }}>
              <option value="avg_demand">Sort by Avg Demand</option>
              <option value="state">Sort by State Name</option>
            </select>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>State</th>
                  <th>Avg Demand (MU)</th>
                </tr>
              </thead>
              <tbody>
                {stateStats.map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.state}</td>
                    <td className="mono" style={{ color: "var(--accent-blue)" }}>{s.avg_demand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stateStats.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          Run predictions first to see per-state analytics.
        </div>
      )}
    </div>
  );
}
