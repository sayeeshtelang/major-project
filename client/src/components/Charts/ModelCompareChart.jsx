import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill, display: "flex", gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {Number(p.value).toFixed(2)} MU
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ModelCompareChart({ data }) {
  return (
    <div className="card">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Model Comparison</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          RF vs XGB average demand per state
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="state"
            tick={{ fill: "var(--text-muted)", fontSize: 9 }}
            tickLine={false} axisLine={false}
            interval={0} angle={-35} textAnchor="end" height={50}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            tickLine={false} axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }} />
          <Bar dataKey="avg_demand" name="Avg Demand" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
