"""Turn rfm_report.xlsx (written by rfm_analysis.ipynb) into the data the web app reads.

Run after re-running the notebook:   python scripts/build_web_data.py

Writes:
  public/data/summary.json      segment statistics, scoring thresholds, chart sample
  tests/fixtures/customers.json every customer's R/F/M and segment, to test the JS scorer
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "rfm_report.xlsx"
ORDER = ["Champions", "Loyal", "At Risk", "Lost"]
SCORE_RANGE = {"Champions": "10–12", "Loyal": "7–9", "At Risk": "4–6", "Lost": "3"}
STRATEGY = {
    "Champions": "Reward with loyalty perks, offer early access to new products, ask for reviews.",
    "Loyal": "Enrol in a loyalty programme, send personalised offers, encourage higher spend.",
    "At Risk": "Send a win-back email, offer a time-limited discount, ask for feedback.",
    "Lost": "Low priority: only re-engage with a significant offer.",
}
SAMPLE_SIZE = 1200


def r1(x: float) -> float:
    return round(float(x), 1)


def main() -> None:
    df = pd.read_excel(REPORT, sheet_name="All Customers")
    revenue = df["Monetary"].sum()

    # Quartile cut-offs, computed exactly as the notebook does for its Streamlit thresholds.
    thresholds = {
        col.lower(): [round(float(v), 2) for v in df[col].quantile([0.25, 0.5, 0.75])]
        for col in ["Recency", "Frequency", "Monetary"]
    }

    segments = []
    for name in ORDER:
        g = df[df["Segment"] == name]
        segments.append(
            {
                "name": name,
                "score_range": SCORE_RANGE[name],
                "strategy": STRATEGY[name],
                "customers": int(len(g)),
                "customer_pct": r1(len(g) / len(df) * 100),
                "revenue": round(float(g["Monetary"].sum()), 2),
                "revenue_pct": r1(g["Monetary"].sum() / revenue * 100),
                "avg_recency": r1(g["Recency"].mean()),
                "avg_frequency": r1(g["Frequency"].mean()),
                "avg_monetary": round(float(g["Monetary"].mean()), 2),
                "median_monetary": round(float(g["Monetary"].median()), 2),
            }
        )

    # 101 quantiles per metric, so the page can say "spends more than 72% of customers".
    qs = np.linspace(0, 1, 101)
    percentiles = {
        col.lower(): [round(float(v), 2) for v in df[col].quantile(qs)]
        for col in ["Recency", "Frequency", "Monetary"]
    }

    # Same-size random sample per segment would distort the picture; sample proportionally.
    sample = df.sample(n=min(SAMPLE_SIZE, len(df)), random_state=42)
    points = [
        [int(r.Recency), round(float(r.Monetary), 2), int(r.Frequency), ORDER.index(r.Segment)]
        for r in sample.itertuples()
    ]

    crosstab = pd.crosstab(df["Segment"], df["Cluster"]).reindex(ORDER).fillna(0).astype(int)

    summary = {
        "source": "Online Retail II (UCI), UK online retailer, 2009–2011",
        "currency": "GBP",
        "customers": int(len(df)),
        "revenue": round(float(revenue), 2),
        "thresholds": thresholds,
        "segments": segments,
        "percentiles": percentiles,
        "scatter": {"columns": ["recency", "monetary", "frequency", "segment_index"], "points": points},
        "kmeans": {
            "clusters": [int(c) for c in crosstab.columns],
            "rows": [{"segment": s, "counts": [int(v) for v in crosstab.loc[s]]} for s in ORDER],
        },
    }
    out = ROOT / "public" / "data" / "summary.json"
    out.write_text(json.dumps(summary, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

    fixture = df[["Recency", "Frequency", "Monetary", "R_score", "F_score", "M_score", "Segment"]]
    (ROOT / "tests" / "fixtures" / "customers.json").write_text(
        fixture.to_json(orient="values"), encoding="utf-8"
    )
    print(f"Wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} KB), {len(df)} customers")


if __name__ == "__main__":
    main()
