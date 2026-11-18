import { percentileOf, scoreCustomer, SEGMENTS, validate } from "./rfm.js";

const COLORS = {
  Champions: "var(--champions)",
  Loyal: "var(--loyal)",
  "At Risk": "var(--atrisk)",
  Lost: "var(--lost)",
};
const SVG = "http://www.w3.org/2000/svg";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-GB");
const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "style") Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) node.append(child);
  return node;
}

function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

const pct = (v) => `${Number(v).toFixed(1)}%`;
const swatch = (name) => el("span", { class: "swatch", style: { background: COLORS[name] } });
const bySegment = (data, name) => data.segments.find((s) => s.name === name);

// ------------------------------------------------------------------ headline numbers
function renderHeadline(data) {
  const champs = bySegment(data, "Champions");
  const risk = bySegment(data, "At Risk");
  const stat = (big, small) => el("div", {}, [el("dt", { text: big }), el("dd", { text: small })]);
  $("headline-stats").replaceChildren(
    stat(pct(champs.revenue_pct), `of revenue comes from Champions, only ${pct(champs.customer_pct)} of customers`),
    stat(num.format(risk.customers), `customers are At Risk (${pct(risk.customer_pct)}), the largest group`),
    stat(num.format(data.customers), "customers analysed, from over a million transactions"),
  );
}

// ------------------------------------------------------------------ segment table
function renderSegments(data) {
  $("segments-note").textContent =
    "From best to worst. Last order, orders and spend are per customer: averages, except spend, which is the median.";
  const head = el("tr", {}, [
    "Segment", "Score", "Customers", "Share", "Revenue", "Last order", "Orders", "Median spend", "What to do",
  ].map((h) => el("th", { scope: "col", text: h })));
  const rows = data.segments.map((s) =>
    el("tr", {}, [
      el("td", {}, el("span", { class: "seg-name" }, [swatch(s.name), s.name])),
      el("td", { class: "num", text: s.score_range }),
      el("td", { class: "num", text: num.format(s.customers) }),
      el("td", { class: "num", text: pct(s.customer_pct) }),
      el("td", { class: "num", text: pct(s.revenue_pct) }),
      el("td", { class: "num", text: `${Math.round(s.avg_recency)} days` }),
      el("td", { class: "num", text: s.avg_frequency.toFixed(1) }),
      el("td", { class: "num", text: gbp.format(s.median_monetary) }),
      el("td", { class: "strategy", text: s.strategy }),
    ]),
  );
  $("segments").replaceChildren(el("thead", {}, head), el("tbody", {}, rows));
}

// ------------------------------------------------------------------ revenue share
function renderRevenue(data) {
  const champs = bySegment(data, "Champions");
  $("revenue-note").textContent =
    `Champions are ${pct(champs.customer_pct)} of customers but brought in ${pct(champs.revenue_pct)} of the ` +
    `${gbp.format(data.revenue)} total. Keeping them is worth more than anything else here.`;

  const row = (label, key) =>
    el("div", { class: "stack-row" }, [
      el("span", { class: "stack-label", text: label }),
      el(
        "div",
        { class: "stack", role: "img", "aria-label": `${label}: ` + data.segments.map((s) => `${s.name} ${s[key]}%`).join(", ") },
        data.segments.map((s) =>
          el("div", {
            class: "stack-part",
            title: `${s.name}: ${s[key]}%`,
            style: { width: `${s[key]}%`, background: COLORS[s.name] },
            text: s[key] >= 9 ? pct(s[key]) : "",
          }),
        ),
      ),
    ]);
  $("revenue-chart").replaceChildren(row("Customers", "customer_pct"), row("Revenue", "revenue_pct"));
}

// ------------------------------------------------------------------ scatter
const W = 760, H = 400, PAD = { l: 58, r: 12, t: 16, b: 44 };
let scale = null;

function renderScatter(data) {
  const pts = data.scatter.points;
  $("sample-size").textContent = num.format(pts.length);
  $("legend").replaceChildren(...SEGMENTS.map((name) => el("span", {}, [swatch(name), name])));

  const maxX = Math.ceil(Math.max(...pts.map((p) => p[0])) / 100) * 100;
  const minY = 1; // £10
  const maxY = Math.ceil(Math.log10(Math.max(...pts.map((p) => p[1]))));
  const x = (d) => PAD.l + (Math.min(d, maxX) / maxX) * (W - PAD.l - PAD.r);
  const y = (m) => {
    const v = Math.min(Math.max(Math.log10(Math.max(m, 10)), minY), maxY);
    return H - PAD.b - ((v - minY) / (maxY - minY)) * (H - PAD.t - PAD.b);
  };
  scale = { x, y };

  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Scatter plot of customers by days since last order and total spend" });
  for (let p = minY; p <= maxY; p++) {
    root.append(svg("line", { x1: PAD.l, x2: W - PAD.r, y1: y(10 ** p), y2: y(10 ** p), class: "grid" }));
    const label = 10 ** p >= 1e6 ? `£${10 ** p / 1e6}m` : 10 ** p >= 1e3 ? `£${10 ** p / 1e3}k` : `£${10 ** p}`;
    root.append(svg("text", { x: PAD.l - 8, y: y(10 ** p) + 4, "text-anchor": "end", class: "tick" }, label));
  }
  for (let d = 0; d <= maxX; d += 100) {
    root.append(svg("text", { x: x(d), y: H - PAD.b + 18, "text-anchor": "middle", class: "tick" }, d));
  }
  root.append(svg("text", { x: (W + PAD.l) / 2, y: H - 6, "text-anchor": "middle", class: "axis-label" }, "Days since last order"));

  const dots = svg("g");
  for (const [recency, monetary, , seg] of pts) {
    dots.append(svg("circle", { cx: x(recency), cy: y(monetary), r: 3, fill: COLORS[SEGMENTS[seg]], class: "dot" }));
  }
  root.append(dots);

  // Written notes, placed from the data so they follow it if the analysis changes.
  const note = (seg, text, dx, dy, anchor) => {
    const s = bySegment(data, seg);
    const px = x(s.avg_recency), py = y(s.median_monetary);
    root.append(svg("line", { x1: px, y1: py, x2: px + dx, y2: py + dy, class: "note-line" }));
    root.append(svg("text", { x: px + dx + (anchor === "start" ? 4 : -4), y: py + dy + 4, "text-anchor": anchor, class: "note" }, text));
  };
  note("Champions", "Champions: ordered recently, spend the most", 70, -95, "start");
  note("Lost", "Lost: one order, long ago", 30, 70, "start");

  root.append(svg("circle", { id: "you", r: 9, class: "you", cx: -50, cy: -50 }));
  $("scatter").replaceChildren(root);
}

// ------------------------------------------------------------------ k-means table
function renderKMeans(data) {
  const { clusters, rows } = data.kmeans;
  const head = el("tr", {}, [el("th", { scope: "col", text: "RFM segment" }), ...clusters.map((c) => el("th", { scope: "col", text: `Cluster ${c}` }))]);
  const body = rows.map((r) => {
    const max = Math.max(...r.counts);
    return el("tr", {}, [
      el("td", {}, el("span", { class: "seg-name" }, [swatch(r.segment), r.segment])),
      ...r.counts.map((c) => el("td", { class: `num${c === max && c > 0 ? " top" : ""}`, text: num.format(c) })),
    ]);
  });
  $("kmeans").replaceChildren(el("thead", {}, head), el("tbody", {}, body));
}

// ------------------------------------------------------------------ scorer
function renderResult(data) {
  const form = $("scorer");
  const read = (name) => (form.elements[name].value === "" ? NaN : Number(form.elements[name].value));
  const customer = { recency: read("recency"), frequency: read("frequency"), monetary: read("monetary") };
  const problem = validate(customer);
  const you = document.getElementById("you");
  const result = $("result");

  if (problem) {
    result.style.removeProperty("--seg");
    result.replaceChildren(el("p", { class: "error", text: problem }));
    if (you) you.setAttribute("cx", -50);
    return;
  }

  const s = scoreCustomer(customer, data.thresholds);
  const seg = bySegment(data, s.segment);
  const spendPct = percentileOf(customer.monetary, data.percentiles.monetary);
  const score = (label, value) => el("div", {}, [el("span", { text: label }), el("strong", { text: value })]);

  result.style.setProperty("--seg", COLORS[s.segment]);
  result.replaceChildren(
    el("p", { class: "label", text: "This customer is" }),
    el("p", { class: "segment", text: s.segment }),
    el("div", { class: "scores" }, [
      score("Recency", `${s.r}/4`),
      score("Frequency", `${s.f}/4`),
      score("Spend", `${s.m}/4`),
      score("Total", `${s.total}/12`),
    ]),
    el("p", { class: "action" }, [el("strong", { text: "What to do: " }), seg.strategy]),
    el("p", {
      class: "small",
      text:
        `Spends more than about ${spendPct}% of customers. ` +
        `${num.format(seg.customers)} customers (${pct(seg.customer_pct)}) are in this segment.`,
    }),
  );

  if (you && scale) {
    you.setAttribute("cx", scale.x(customer.recency));
    you.setAttribute("cy", scale.y(customer.monetary));
    you.style.stroke = COLORS[s.segment];
  }
}

// ------------------------------------------------------------------ start
async function main() {
  let data;
  try {
    const response = await fetch("data/summary.json");
    if (!response.ok) throw new Error(`${response.status}`);
    data = await response.json();
  } catch (err) {
    $("result").replaceChildren(el("p", { class: "error", text: `Could not load the data (${err.message}).` }));
    return;
  }
  $("source").textContent = data.source;
  const t = data.thresholds;
  $("cutoffs").textContent =
    `recency ${t.recency.join(" / ")} days, orders ${t.frequency.join(" / ")}, ` +
    `spend ${t.monetary.map((v) => gbp.format(v)).join(" / ")}`;

  renderHeadline(data);
  renderSegments(data);
  renderRevenue(data);
  renderScatter(data);
  renderKMeans(data);
  renderResult(data);
  $("scorer").addEventListener("input", () => renderResult(data));
  $("scorer").addEventListener("submit", (e) => e.preventDefault());
}

main();
