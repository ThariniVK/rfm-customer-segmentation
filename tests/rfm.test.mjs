// Run with:  node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ascendingScore,
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
  assert.equal(ascendingScore(T.monetary[0], T.monetary), 1);
  assert.equal(ascendingScore(T.monetary[0] + 0.01, T.monetary), 2);
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

test("matches the notebook exactly on every real customer", () => {
  const n = customers.length;
  assert.equal(n, summary.customers);
  let mismatches = 0;
  for (const [recency, frequency, monetary, R, F, M, segment] of customers) {
    const s = scoreCustomer({ recency, frequency, monetary }, T);
    if (s.r !== R || s.f !== F || s.m !== M || s.segment !== segment) mismatches++;
  }
  assert.equal(mismatches, 0, `${mismatches} of ${n} customers scored differently`);
});

test("summary figures add up", () => {
  const segs = summary.segments;
  assert.equal(segs.reduce((a, s) => a + s.customers, 0), summary.customers);
  const revPct = segs.reduce((a, s) => a + s.revenue_pct, 0);
  assert.ok(Math.abs(revPct - 100) < 0.5);
});
