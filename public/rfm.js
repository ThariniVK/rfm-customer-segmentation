// RFM scoring, the same rules as rfm_analysis.ipynb and app.py.
// Pure functions with no page code, so they can be tested on their own (tests/rfm.test.mjs).

export const SEGMENTS = ["Champions", "Loyal", "At Risk", "Lost"];

/** Recency: fewer days since the last purchase is better, so the score runs 4 -> 1. */
export function recencyScore(days, [q1, q2, q3]) {
  if (days <= q1) return 4;
  if (days <= q2) return 3;
  if (days <= q3) return 2;
  return 1;
}

/** Frequency and monetary: higher is better, so the score runs 1 -> 4. */
export function ascendingScore(value, [q1, q2, q3]) {
  if (value <= q1) return 1;
  if (value <= q2) return 2;
  if (value <= q3) return 3;
  return 4;
}

export function segmentFor(total) {
  if (total >= 10) return "Champions";
  if (total >= 7) return "Loyal";
  if (total >= 4) return "At Risk";
  return "Lost";
}

/** Returns an error message for impossible inputs, or null when they are fine. */
export function validate({ recency, frequency, monetary }) {
  if (![recency, frequency, monetary].every(Number.isFinite)) return "Fill in all three numbers.";
  if (recency < 0) return "Days since the last purchase cannot be negative.";
  if (frequency < 1 || !Number.isInteger(frequency)) return "Orders must be a whole number, 1 or more.";
  if (monetary < 0) return "Total spend cannot be negative.";
  return null;
}

export function scoreCustomer(customer, thresholds) {
  const r = recencyScore(customer.recency, thresholds.recency);
  const f = ascendingScore(customer.frequency, thresholds.frequency);
  const m = ascendingScore(customer.monetary, thresholds.monetary);
  const total = r + f + m;
  return { r, f, m, total, segment: segmentFor(total) };
}

/**
 * Share of customers (0-100) with a value at or below `value`, from 101 quantiles
 * (index i = the i-th percentile). Interpolates between neighbouring quantiles.
 */
export function percentileOf(value, quantiles) {
  const last = quantiles.length - 1;
  if (value < quantiles[0]) return 0;
  if (value >= quantiles[last]) return 100;
  let i = 0;
  while (i < last && quantiles[i + 1] <= value) i++;
  // Many customers share a value (e.g. 1 order): report the top of that tied run.
  const lo = quantiles[i];
  const hi = quantiles[i + 1];
  const within = hi > lo ? (value - lo) / (hi - lo) : 0;
  return Math.round(((i + within) / last) * 100);
}
