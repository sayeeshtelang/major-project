import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, RefreshCw } from "lucide-react";
import { getAnalytics } from "../services/api";

const titles = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/optimization": "Optimization",
};

export default function Navbar() {
  const loc = useLocation();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottom: "1px solid var(--border)",
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          {titles[loc.pathname] || "EnergyIQ"}
        </h1>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
          India State-wise Electricity Demand Forecasting
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          <RefreshCw size={10} style={{ marginRight: 4 }} />
          {lastRefresh.toLocaleTimeString()}
        </div>


        <div style={{
          width: 34, height: 34,
          background: "var(--gradient-blue)",
          borderRadius: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "white",
        }}>A</div>
      </div>
    </header>
  );
}
