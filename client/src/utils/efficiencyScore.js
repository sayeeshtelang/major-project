/**
 * Energy Efficiency Score Calculator
 * 
 * Computes a normalized 0-100 Energy Efficiency Score using existing system metrics:
 *  - Load Factor (78% grid baseline or dynamic)
 *  - Energy Saving Percentage (from PSO load dispatch optimization)
 *  - Renewable Energy Contribution % (from PSO generator mix)
 *  - Peak Performance Score (from grid peak headroom ratio)
 * 
 * Efficiency Score = 0.30 × Load Factor + 0.30 × Energy Saving % + 0.20 × Renewable Contribution % + 0.20 × Peak Performance Score
 */

export const DEFAULT_WEIGHTS = {
  loadFactor: 0.30,
  energySaving: 0.30,
  renewableContribution: 0.20,
  peakPerformance: 0.20,
};

/**
 * Calculates the normalized energy efficiency score (0 - 100)
 * 
 * @param {Object} metrics
 * @param {number} [metrics.loadFactor=78.0] - Grid load factor in % (0 - 100)
 * @param {number} [metrics.energySavingPct=12.5] - Energy cost savings % (0 - 100)
 * @param {number} [metrics.renewableContributionPct=33.3] - Renewable share % (0 - 100)
 * @param {number} [metrics.peakPerformanceScore=85.0] - Peak performance score (0 - 100)
 * @param {Object} [weights=DEFAULT_WEIGHTS] - Custom weight configuration
 * @returns {Object} Score result with metrics, status, and theme properties
 */
export function calculateEnergyEfficiencyScore(metrics = {}, weights = DEFAULT_WEIGHTS) {
  const loadFactor = metrics.loadFactor ?? 78.0;
  const energySavingPct = metrics.energySavingPct ?? 12.5;
  const renewableContributionPct = metrics.renewableContributionPct ?? 33.3;
  const peakPerformanceScore = metrics.peakPerformanceScore ?? 85.0;

  // Transparent weighted sum formula
  const rawScore =
    (weights.loadFactor ?? 0.30) * loadFactor +
    (weights.energySaving ?? 0.30) * energySavingPct +
    (weights.renewableContribution ?? 0.20) * renewableContributionPct +
    (weights.peakPerformance ?? 0.20) * peakPerformanceScore;

  // Clamp strictly to 0 - 100 range
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Determine status range & color coding
  let status = "Needs Improvement";
  let color = "var(--accent-red)";
  let badgeClass = "badge-red";
  let accent = "red";

  if (score >= 85) {
    status = "Excellent";
    color = "var(--accent-green)";
    badgeClass = "badge-green";
    accent = "green";
  } else if (score >= 70) {
    status = "Good";
    color = "var(--accent-blue)";
    badgeClass = "badge-blue";
    accent = "blue";
  } else if (score >= 50) {
    status = "Moderate";
    color = "var(--accent-amber)";
    badgeClass = "badge-amber";
    accent = "amber";
  }

  return {
    score,
    status,
    color,
    badgeClass,
    accent,
    metrics: {
      loadFactor: Math.min(100, Math.max(0, loadFactor)),
      energySavingPct: Math.min(100, Math.max(0, energySavingPct)),
      renewableContributionPct: Math.min(100, Math.max(0, renewableContributionPct)),
      peakPerformanceScore: Math.min(100, Math.max(0, peakPerformanceScore)),
    },
    weights,
  };
}
