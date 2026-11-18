# RFM Customer Segmentation

Live app: **[rfm-customer-segmentation-ten.vercel.app](https://rfm-customer-segmentation-ten.vercel.app)**

Segments 5,878 customers of a UK online retailer by **Recency** (days since last order), **Frequency** (number of orders) and **Monetary** value (total spend), to find the best customers and those likely to churn.

## Results

| Segment | RFM score | Customers | Share of revenue | Action |
|---|---|---|---|---|
| Champions | 10–12 | 1,665 (28.3%) | 79.9% | Reward, upsell, ask for reviews |
| Loyal | 7–9 | 1,765 (30.0%) | 14.5% | Loyalty programme, personalised offers |
| At Risk | 4–6 | 1,825 (31.0%) | 5.0% | Win-back email, time-limited discount |
| Lost | 3 | 623 (10.6%) | 0.6% | Low priority |

- 28% of customers (Champions) bring in 80% of revenue.
- At Risk is the largest segment: 1,825 customers who haven't ordered in about 300 days on average.
- K-Means (k=4) matches Champions and Lost but mixes Loyal and At Risk, so the score-based segments are used.

## Method

1. **Data:** [Online Retail II](https://archive.ics.uci.edu/dataset/502/online+retail+ii), 1,067,371 transactions (2009–2011).
2. **Cleaning:** removed rows with no customer ID, returns, zero-price rows and duplicates, leaving 779,425 rows.
3. **Scoring:** R, F and M are each scored 1–4 by quartile and added up (3–12). Frequency uses fixed quartile cut-offs so customers with the same number of orders get the same score.
4. **Validation:** K-Means on standardised R, F and M.

## Files

| File | Purpose |
|---|---|
| `rfm_analysis.ipynb` | The analysis |
| `rfm_report.xlsx` | All customers with scores and segments |
| `app.py` | Streamlit calculator |
| `public/` | Web app (static, hosted on Vercel) |
| `scripts/build_web_data.py` | Exports the report to the web app's data |
| `tests/` | Checks the web calculator matches the notebook for every customer |

## Run it

```bash
pip install -r requirements.txt
```

- **Notebook:** download the dataset ([Kaggle](https://www.kaggle.com/datasets/mashlyn/online-retail-ii-uci) CSV, or the UCI Excel file with its two sheets combined), save it as `online_retail.csv`, then run all cells.
- **Update the web app** after re-running the notebook: `python scripts/build_web_data.py`
- **Streamlit:** `streamlit run app.py`
- **Web app locally:** `python3 -m http.server 8080 --directory public`
- **Tests:** `npm test`

Built with Python (pandas, scikit-learn, matplotlib, seaborn) and plain HTML/CSS/JavaScript. The web app, tests and deployment were built with help from Claude Code.
