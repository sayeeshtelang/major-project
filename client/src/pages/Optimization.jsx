import React, { useEffect, useState } from "react";
import { getHistory } from "../services/api";
import { Activity } from "lucide-react";

// PSO Implementation for Economic Load Dispatch
class PSO {
  constructor(demand, numParticles = 30, maxIter = 50) {
    this.demand = demand;
    this.numParticles = numParticles;
    this.maxIter = maxIter;
    
    // 3 Generators (e.g. Coal, Gas, Solar/Wind)
    // Cost = a + bP + cP^2
    this.generators = [
      { min: 10, max: 1000, a: 500, b: 15, c: 0.05 }, // Coal
      { min: 10, max: 1000, a: 400, b: 20, c: 0.06 }, // Gas
      { min: 0,  max: 500,  a: 0,   b: 5,  c: 0.01 }  // Renewables
    ];
    
    this.numGen = this.generators.length;
  }

  costFunction(powers) {
    let cost = 0;
    let totalPower = 0;
    for (let i = 0; i < this.numGen; i++) {
      let p = powers[i];
      let g = this.generators[i];
      cost += g.a + g.b * p + g.c * p * p;
      totalPower += p;
    }
    
    // Penalty for not meeting demand
    let penalty = Math.pow(Math.abs(totalPower - this.demand), 2) * 1000;
    return cost + penalty;
  }

  optimize() {
    let particles = [];
    let velocities = [];
    let pBest = [];
    let pBestCost = [];
    let gBest = null;
    let gBestCost = Infinity;

    // Initialize
    for (let i = 0; i < this.numParticles; i++) {
      let position = [];
      let velocity = [];
      for (let j = 0; j < this.numGen; j++) {
        let g = this.generators[j];
        // Naive initialization: equal split + noise
        let val = (this.demand / this.numGen) + (Math.random() * 20 - 10);
        val = Math.max(g.min, Math.min(g.max, val));
        position.push(val);
        velocity.push((Math.random() * 2 - 1) * 10);
      }
      
      let cost = this.costFunction(position);
      particles.push(position);
      velocities.push(velocity);
      pBest.push([...position]);
      pBestCost.push(cost);
      
      if (cost < gBestCost) {
        gBestCost = cost;
        gBest = [...position];
      }
    }

    // PSO Loop
    let w = 0.7; // inertia
    let c1 = 1.5; // cognitive
    let c2 = 1.5; // social

    for (let iter = 0; iter < this.maxIter; iter++) {
      for (let i = 0; i < this.numParticles; i++) {
        for (let j = 0; j < this.numGen; j++) {
          let r1 = Math.random();
          let r2 = Math.random();
          let g = this.generators[j];
          
          velocities[i][j] = w * velocities[i][j] 
                           + c1 * r1 * (pBest[i][j] - particles[i][j])
                           + c2 * r2 * (gBest[j] - particles[i][j]);
          
          particles[i][j] += velocities[i][j];
          
          // Apply bounds
          particles[i][j] = Math.max(g.min, Math.min(g.max, particles[i][j]));
        }
        
        let cost = this.costFunction(particles[i]);
        if (cost < pBestCost[i]) {
          pBestCost[i] = cost;
          pBest[i] = [...particles[i]];
          if (cost < gBestCost) {
            gBestCost = cost;
            gBest = [...particles[i]];
          }
        }
      }
    }
    
    // Recalculate pure cost without penalty for the optimal values
    let pureCost = 0;
    for (let i = 0; i < this.numGen; i++) {
      let p = gBest[i];
      let g = this.generators[i];
      pureCost += g.a + g.b * p + g.c * p * p;
    }
    
    return { gBest, pureCost };
  }
}

export default function Optimization() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    getHistory({ limit: 200 })
      .then(r => {
        const records = r.data.records || [];
        // Get the latest prediction for each state
        const uniqueStates = new Map();
        records.forEach(rec => {
          if (!uniqueStates.has(rec.state) && rec.prediction_source === "ENSEMBLE (CSV Upload)") {
            uniqueStates.set(rec.state, rec);
          }
        });
        
        const latestPreds = Array.from(uniqueStates.values());

        const results = latestPreds.map(rec => {
          let demand = rec.final_demand_24h || 100; // MU
          
          // 1. Prior Cost Calculation (Naive equal distribution)
          const numGen = 3;
          let priorCost = 0;
          const generators = [
            { min: 10, max: 1000, a: 500, b: 15, c: 0.05 },
            { min: 10, max: 1000, a: 400, b: 20, c: 0.06 },
            { min: 0,  max: 500,  a: 0,   b: 5,  c: 0.01 }
          ];
          
          let equalPower = demand / numGen;
          for(let i = 0; i < numGen; i++) {
             let p = Math.max(generators[i].min, Math.min(generators[i].max, equalPower));
             let g = generators[i];
             priorCost += g.a + g.b * p + g.c * p * p;
          }
          let priorPerUnit = demand > 0 ? (priorCost / demand) : 0;
          
          // 2. Post Optimization
          let pso = new PSO(demand);
          let { gBest, pureCost } = pso.optimize();
          
          let postPerUnit = demand > 0 ? (pureCost / demand) : 0;
          let savings = priorPerUnit > 0 ? ((priorPerUnit - postPerUnit) / priorPerUnit) * 100 : 0;

          return {
            state: rec.state,
            demand: demand,
            priorPerUnit: priorPerUnit,
            postPerUnit: postPerUnit,
            savings: savings,
            mixture: {
              coal: gBest[0],
              gas: gBest[1],
              renewables: gBest[2]
            }
          };
        });
        
        // Sort alphabetically by state
        results.sort((a, b) => a.state.localeCompare(b.state));
        setData(results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Economic Dispatch Optimization</h1>
        <p>Particle Swarm Optimization (PSO) on state predicted demand</p>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Predicted Demand (MU)</th>
                <th>Prior Cost (Rs/Unit)</th>
                <th>Optimized Cost (Rs/Unit)</th>
                <th>Cost Savings (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <React.Fragment key={i}>
                  <tr 
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    style={{ cursor: "pointer", background: expandedRow === i ? "var(--bg-secondary)" : "transparent" }}
                    title="Click to view optimal mixture"
                  >
                    <td style={{ fontWeight: 600 }}>{row.state}</td>
                    <td className="mono" style={{ color: "var(--accent-blue)" }}>{row.demand.toFixed(2)}</td>
                    <td className="mono" style={{ color: "var(--accent-red)" }}>
                      {row.priorPerUnit.toFixed(2)}
                    </td>
                    <td className="mono" style={{ color: "var(--accent-green)" }}>
                      {row.postPerUnit.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Activity size={14} color={row.savings > 0 ? "var(--accent-green)" : "var(--text-muted)"} />
                        <span className="mono" style={{ color: row.savings > 0 ? "var(--accent-green)" : "var(--text-muted)", fontWeight: 600 }}>
                          {row.savings > 0 ? row.savings.toFixed(2) + "%" : "0.00%"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                      <td colSpan="5" style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-around", fontSize: 13 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Coal Generation</span>
                            <span className="mono" style={{ color: "var(--text-primary)" }}>{row.mixture.coal.toFixed(2)} MU</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Gas Generation</span>
                            <span className="mono" style={{ color: "var(--text-primary)" }}>{row.mixture.gas.toFixed(2)} MU</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>Renewables (Solar/Wind)</span>
                            <span className="mono" style={{ color: "var(--accent-green)" }}>{row.mixture.renewables.toFixed(2)} MU</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
