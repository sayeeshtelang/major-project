import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
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
        <div key={i} style={{ color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span>{p.name}:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value} MU
          </span>
        </div>
      ))}
    </div>
  );
};

export default function DemandChart({ data, title = "Demand Trend" }) {
  return (
    <div className="card" style={{ gridColumn: "span 2" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Actual vs Predicted demand (MU)
          </div>
        </div>
        <div className="badge badge-blue">LIVE</div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false} axisLine={false}
            tickFormatter={v => v?.slice(5) || v}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickLine={false} axisLine={false}
            tickFormatter={v => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }}
          />
          <Area
            type="monotone" dataKey="energy_met" name="Actual"
            stroke="#06b6d4" strokeWidth={1.5}
            fill="url(#gradActual)" dot={false}
          />
          <Area
            type="monotone" dataKey="final_demand_24h" name="Predicted 24h"
            stroke="#3b82f6" strokeWidth={2}
            fill="url(#gradPred)" dot={false}
            strokeDasharray="5 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
