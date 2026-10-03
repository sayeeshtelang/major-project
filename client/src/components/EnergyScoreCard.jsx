import React from "react";
import { Award, Zap, ShieldCheck, Activity, BarChart2 } from "lucide-react";

export default function EnergyScoreCard({ scoreData, loading }) {
  const {
    score = 82,
    status = "Good",
    color = "var(--accent-blue)",
    badgeClass = "badge-blue",
    metrics = {
      loadFactor: 78.0,
      energySavingPct: 12.5,
      renewableContributionPct: 33.3,
      peakPerformanceScore: 85.0,
    },
  } = scoreData || {};

  // Circular progress dimensions
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (score / 100) * circumference;

  return (
    <div className="card fade-in" style={{ position: "relative", overflow: "hidden", padding: "20px 24px" }}>
      {/* Background glow accent */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: color,
          opacity: 0.08,
          filter: "blur(25px)",
          pointerEvents: "none",
        }}
      />

      {/* Card Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Award size={18} color={color} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontWeight: 700,
              }}
            >
              Energy Efficiency Score
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Normalized Grid & Optimization Index
            </div>
          </div>
        </div>

        <span className={`badge ${badgeClass}`} style={{ fontSize: 11, padding: "4px 12px" }}>
          <ShieldCheck size={12} style={{ marginRight: 2 }} />
          {status}
        </span>
      </div>

      {loading ? (
        <div
          style={{
            height: 120,
            background: "var(--border)",
            borderRadius: 8,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* Circular Progress Gauge */}
          <div
            style={{
              position: "relative",
              width: 96,
              height: 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
              {/* Background Track */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="var(--border)"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={color}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.4s ease",
                }}
              />
            </svg>

            {/* Score Center Display */}
            <div
              style={{
                position: "absolute",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {score}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>/ 100</div>
            </div>
          </div>

          {/* Sub-Metrics Breakdown Grid */}
          <div
            className="grid-2"
            style={{
              gap: "10px 16px",
              background: "var(--bg-secondary)",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Zap size={11} color="var(--accent-amber)" /> Load Factor
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                {metrics.loadFactor.toFixed(1)}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Activity size={11} color="var(--accent-green)" /> Energy Saving %
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-green)", marginTop: 2 }}>
                {metrics.energySavingPct.toFixed(1)}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={11} color="var(--accent-blue)" /> Renewable Share
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-blue)", marginTop: 2 }}>
                {metrics.renewableContributionPct.toFixed(1)}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <BarChart2 size={11} color="var(--accent-purple)" /> Peak Impact
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-purple)", marginTop: 2 }}>
                {metrics.peakPerformanceScore.toFixed(1)} / 100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formula Footnote */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          fontSize: 10,
          color: "var(--text-muted)",
          display: "flex",
          justify: "space-between",
          alignItems: "center",
        }}
      >
        <span>Weighted Formula: 0.30×LF + 0.30×ES + 0.20×RC + 0.20×PP</span>
        <span style={{ fontWeight: 600, color }}>Range: 0 – 100</span>
      </div>
    </div>
  );
}
