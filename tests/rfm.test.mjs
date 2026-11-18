// Run with:  node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ascendingScore,
  percentileOf,
  recencyScore,
  scoreCustomer,
  segmentFor,
  validate,
} from "../public/rfm.js";

const summary = JSON.parse(readFileSync(new URL("../public/data/summary.json", import.meta.url)));
const customers = JSON.parse(readFileSync(new URL("./fixtures/customers.json", import.meta.url)));
const T = summary.thresholds;

test("recency scores fall as days rise, boundaries inclusive", () => {
  assert.deepEqual([0, 26, 27, 96, 97, 380, 381].map((d) => recencyScore(d, T.recency)), [4, 4, 3, 3, 2, 2, 1]);
});

test("frequency and monetary scores rise with the value", () => {
  assert.deepEqual([1, 2, 3, 4, 7, 8].map((f) => ascendingScore(f, T.frequency)), [1, 2, 2, 3, 3, 4]);
  assert.equal(ascendingScore(341.9, T.monetary), 1);
  assert.equal(ascendingScore(341.91, T.monetary), 2);
  assert.equal(ascendingScore(100000, T.monetary), 4);
});

test("segment boundaries match the notebook", () => {
  assert.deepEqual([3, 4, 6, 7, 9, 10, 12].map(segmentFor), [
    "Lost", "At Risk", "At Risk", "Loyal", "Loyal", "Champions", "Champions",
  ]);
});

test("validation rejects impossible input", () => {
  assert.equal(validate({ recency: 10, frequency: 2, monetary: 50 }), null);
  assert.match(validate({ recency: -1, frequency: 2, monetary: 50 }), /negative/);
  assert.match(validate({ recency: 1, frequency: 0, monetary: 50 }), /whole number/);
  assert.match(validate({ recency: 1, frequency: 2.5, monetary: 50 }), /whole number/);
  assert.match(validate({ recency: NaN, frequency: 2, monetary: 50 }), /all three/);
});

test("percentiles are sensible at the edges and middle", () => {
  const q = summary.percentiles.monetary;
  assert.equal(percentileOf(-1e9, q), 0);
  assert.equal(percentileOf(1e12, q), 100);
  const median = percentileOf(q[50], q);
  assert.ok(median >= 49 && median <= 51, `median gave ${median}`);
});

// The important one: does the web scorer agree with the notebook on the real customers?
test("matches the notebook on real customers", () => {
  let r = 0, m = 0, seg = 0;
  for (const [recency, frequency, monetary, R, , M, segment] of customers) {
    const s = scoreCustomer({ recency, frequency, monetary }, T);
    r += s.r === R;
    m += s.m === M;
    seg += s.segment === segment;
  }
  const n = customers.length;
  assert.equal(n, 5881);
  assert.equal(r, n, "recency scores should match exactly");
  assert.equal(m, n, "monetary scores should match exactly");
  // Frequency cannot match exactly: the notebook splits tied order counts by row order
  // (rank(method='first')), so identical customers can get different scores there.
  assert.ok(seg / n >= 0.96, `segment agreement ${(100 * seg / n).toFixed(2)}%`);
});

test("summary figures add up", () => {
  const segs = summary.segments;
  assert.equal(segs.reduce((a, s) => a + s.customers, 0), summary.customers);
  const revPct = segs.reduce((a, s) => a + s.revenue_pct, 0);
  assert.ok(Math.abs(revPct - 100) < 0.5);
});
