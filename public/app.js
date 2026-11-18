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

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// ------------------------------------------------------------------ segments
function renderSegments(data) {
  $("segment-cards").replaceChildren(
    ...data.segments.map((s) =>
      el("article", { class: "card", style: { "--accent": COLORS[s.name] } }, [
        el("div", { class: "card-top" }, [
          el("h3", { text: s.name }),
          el("span", { class: "badge", text: `Score ${s.score_range}` }),
        ]),
        el("p", { class: "big", text: num.format(s.customers) }),
        el("p", { class: "muted", text: `customers (${s.customer_pct}%) · ${s.revenue_pct}% of revenue` }),
        el("dl", {}, [
          el("dt", { text: "Last order" }), el("dd", { text: `${Math.round(s.avg_recency)} days ago` }),
          el("dt", { text: "Orders" }), el("dd", { text: s.avg_frequency.toFixed(1) }),
          el("dt", { text: "Median spend" }), el("dd", { text: gbp.format(s.median_monetary) }),
        ]),
        el("p", { class: "strategy", text: s.strategy }),
      ]),
    ),
  );
}

// ------------------------------------------------------------------ revenue share
function renderRevenue(data) {
  const champs = data.segments.find((s) => s.name === "Champions");
  $("revenue-note").textContent =
    `Champions are ${champs.customer_pct}% of customers but bring in ${champs.revenue_pct}% of the ` +
    `${gbp.format(data.revenue)} total. Keeping them matters more than anything else here.`;

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
            text: s[key] >= 8 ? `${Math.round(s[key])}%` : "",
          }),
        ),
      ),
    ]);
  $("revenue-chart").replaceChildren(row("Customers", "customer_pct"), row("Revenue", "revenue_pct"));
}

// ------------------------------------------------------------------ scatter
const W = 720, H = 380, PAD = { l: 56, r: 16, t: 12, b: 42 };
let scale = null;

function renderScatter(data) {
  const pts = data.scatter.points;
  $("sample-size").textContent = num.format(pts.length);
  $("legend").replaceChildren(
    ...SEGMENTS.map((name) =>
      el("span", {}, [el("i", { style: { background: COLORS[name] } }), name]),
    ),
  );

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
    const t = svg("text", { x: PAD.l - 8, y: y(10 ** p) + 4, "text-anchor": "end", class: "tick" });
    t.textContent = gbp.format(10 ** p).replace(",000,000", "m").replace(",000", "k");
    root.append(t);
  }
  for (let d = 0; d <= maxX; d += 100) {
    const t = svg("text", { x: x(d), y: H - PAD.b + 18, "text-anchor": "middle", class: "tick" });
    t.textContent = d;
    root.append(t);
  }
  const xl = svg("text", { x: (W + PAD.l) / 2, y: H - 4, "text-anchor": "middle", class: "axis-label" });
  xl.textContent = "Days since last order";
  root.append(xl);

  const dots = svg("g");
  for (const [recency, monetary, , seg] of pts) {
    dots.append(svg("circle", { cx: x(recency), cy: y(monetary), r: 3, fill: COLORS[SEGMENTS[seg]], class: "dot" }));
  }
  root.append(dots);
  root.append(svg("circle", { id: "you", r: 9, class: "you", cx: -50, cy: -50 }));
  $("scatter").replaceChildren(root);
}

// ------------------------------------------------------------------ k-means table
function renderKMeans(data) {
  const { clusters, rows } = data.kmeans;
  const head = el("tr", {}, [el("th", { text: "Segment" }), ...clusters.map((c) => el("th", { text: `Cluster ${c}` }))]);
  const body = rows.map((r) => {
    const max = Math.max(...r.counts);
    return el("tr", {}, [
      el("th", { scope: "row", text: r.segment }),
      ...r.counts.map((c) => el("td", { class: c === max && c > 0 ? "top" : "", text: num.format(c) })),
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

  if (problem) {
    $("result").replaceChildren(el("p", { class: "error", text: problem }));
    if (you) you.setAttribute("cx", -50);
    return;
  }

  const s = scoreCustomer(customer, data.thresholds);
  const seg = data.segments.find((x) => x.name === s.segment);
  const spendPct = percentileOf(customer.monetary, data.percentiles.monetary);
  const chip = (label, value) =>
    el("div", { class: "chip" }, [el("span", { text: label }), el("strong", { text: value })]);

  $("result").replaceChildren(
    el("p", { class: "muted small", text: "This customer is" }),
    el("p", { class: "segment", style: { color: COLORS[s.segment] }, text: s.segment }),
    el("div", { class: "chips" }, [
      chip("Recency", `${s.r}/4`),
      chip("Frequency", `${s.f}/4`),
      chip("Monetary", `${s.m}/4`),
      chip("Total", `${s.total}/12`),
    ]),
    el("p", { class: "action" }, [el("strong", { text: "Recommended action: " }), seg.strategy]),
    el("p", {
      class: "muted small",
      text:
        `Spends more than about ${spendPct}% of customers. ` +
        `${num.format(seg.customers)} customers (${seg.customer_pct}%) are in this segment.`,
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
  $("source").textContent = `${num.format(data.customers)} customers · ${data.source}`;
  const t = data.thresholds;
  $("cutoffs").textContent =
    `recency ${t.recency.join(" / ")} days, orders ${t.frequency.join(" / ")}, ` +
    `spend ${t.monetary.map((v) => gbp.format(v)).join(" / ")}`;

  renderSegments(data);
  renderRevenue(data);
  renderScatter(data);
  renderKMeans(data);
  renderResult(data);
  $("scorer").addEventListener("input", () => renderResult(data));
  $("scorer").addEventListener("submit", (e) => e.preventDefault());
}

main();
