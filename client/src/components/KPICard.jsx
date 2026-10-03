import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function KPICard({ title, value, unit = "", sub, trend, icon: Icon, accent = "blue", loading }) {
  const colors = {
    blue: "var(--accent-blue)",
    green: "var(--accent-green)",
    red: "var(--accent-red)",
    amber: "var(--accent-amber)",
    cyan: "var(--accent-cyan)",
    purple: "var(--accent-purple)",
  };
  const color = colors[accent] || colors.blue;

  return (
    <div className="card fade-in" style={{ position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: color, opacity: 0.06, filter: "blur(20px)",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase",
          letterSpacing: "0.8px", fontWeight: 600 }}>
          {title}
        </div>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={15} color={color} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ height: 28, background: "var(--border)", borderRadius: 4,
            width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-mono)",
              color: "var(--text-primary)", lineHeight: 1 }}>
              {value ?? "—"}
            </span>
            {unit && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{unit}</span>}
          </div>
        )}
      </div>

      {sub && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          {trend === "up" && <TrendingUp size={12} color="var(--accent-green)" />}
          {trend === "down" && <TrendingDown size={12} color="var(--accent-red)" />}
          {trend === "flat" && <Minus size={12} color="var(--text-muted)" />}
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</span>
        </div>
      )}
    </div>
  );
}
