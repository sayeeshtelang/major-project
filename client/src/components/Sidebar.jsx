import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Zap, AlertTriangle, BarChart3,
  FileText, Activity, UploadCloud
} from "lucide-react";

const nav = [
  { path: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { path: "/analytics",   label: "Analytics",   icon: BarChart3 },
  { path: "/reports",     label: "Reports",     icon: FileText },
  { path: "/optimization",label: "Optimization",icon: Zap },
  { path: "/upload-csv",  label: "Upload CSV",  icon: UploadCloud },
];

export default function Sidebar() {
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: 240,
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "var(--gradient-blue)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Activity size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              EnergyIQ
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              INDIA FORECAST
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s",
              background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
              color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
              borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid var(--border)",
        fontSize: 11,
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
      }}>
        <div>ML MODELS ACTIVE</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {["RF", "XGB", "ISO", "SCALER"].map(m => (
            <span key={m} style={{
              padding: "2px 6px", borderRadius: 4,
              background: "rgba(16,185,129,0.1)",
              color: "var(--accent-green)",
              fontSize: 10, fontWeight: 700,
            }}>{m}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}
