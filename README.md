# RFM Customer Segmentation

**🔗 Live app: [rfm-customer-segmentation-ten.vercel.app](https://rfm-customer-segmentation-ten.vercel.app)**: score any customer and explore the segments.

## What is RFM?

| Metric | Question | Why It Matters |
|---|---|---|
| 🕐 Recency | When did they last buy? | Recent buyers are more likely to buy again |
| 🔁 Frequency | How often do they buy? | Frequent buyers are more loyal and engaged |
| 💰 Monetary | How much do they spend? | High spenders drive the most revenue |

## Why RFM?
> A simple, interpretable method used by marketing teams worldwide to identify best customers, spot churn risk early, and personalise campaigns.

## Who Uses It?
| Industry | Use Case |
|---|---|
| E-commerce | Identify VIP shoppers, re-engage inactive users |
| Retail | Personalise promotions based on purchase history |
| Banking | Segment customers by transaction behaviour |
| Subscriptions | Reduce churn by targeting at-risk users |

## Project Overview
Customer segmentation on a UK-based e-commerce dataset (1M+ transactions).
Customers scored and grouped into **4 segments** with actionable marketing recommendations.


## Dataset
- Source: Online Retail II UCI Dataset (Kaggle)
- 1 million+ transactions from a UK online retailer (2009–2011)
- 779,495 transactions and 5,881 unique customers after cleaning

## Key Findings
- Champions (29.6% of customers) contribute 80.7% of total revenue
- 1,790 customers are At Risk, the largest segment, requiring immediate attention
- K-Means clustering (k=4) agrees with the RFM segments at the extremes (1,681 of 1,740 Champions share one cluster; all 572 Lost customers share another) but mixes Loyal and At Risk, so the score-based segments are clearer for business use
- Lost customers average 547 days since last purchase with only 1 order

## Segments & Recommendations
| Segment | Criteria | Customers | Share of Revenue | Strategy |
|---|---|---|---|---|
| Champions | Score 10–12 | 1,740 | 80.7% | Reward, upsell, ask for reviews |
| Loyal | Score 7–9 | 1,779 | 14.0% | Loyalty programme, personalised offers |
| At Risk | Score 4–6 | 1,790 | 4.7% | Win-back email, time-limited discount |
| Lost | Score 3 | 572 | 0.6% | Re-engage only with significant offer |

## Tech Stack
- Python, Pandas, NumPy
- Matplotlib, Seaborn
- Scikit-learn (KMeans, StandardScaler)
- Openpyxl (Excel export)
- Streamlit (interactive calculator)
- HTML, CSS and JavaScript (web app, hosted on Vercel)

## How to Run
1. Download the dataset from Kaggle: [Online Retail II UCI](https://www.kaggle.com/datasets/mashlyn/online-retail-ii-uci)
2. Place the CSV in the project folder and name it `online_retail.csv` (the name the notebook reads)
3. Install dependencies: `pip install -r requirements.txt`
4. Open `rfm_analysis.ipynb` in VSCode or Jupyter
5. Run all cells in order

## Web App

A static web version lives in `public/` and is ready to host on Vercel (no server needed):

- **Score a customer**: enter days since last purchase, number of orders and total spend to get the segment and recommended action.
- **Dashboard**: segment sizes, share of customers vs share of revenue, a scatter of customers, and the K-Means check.

Run it locally: `python3 -m http.server 8080 --directory public`, then open http://localhost:8080.
Test the scoring: `npm test` (checks the web scorer against all 5,881 customers in `rfm_report.xlsx`).
After re-running the notebook, refresh the web data: `python scripts/build_web_data.py`.

**Deployment:** hosted on Vercel, which redeploys automatically whenever `main` changes. `vercel.json` tells Vercel to serve the `public/` folder; there is no build step.

**Scoring note:** the web app and `app.py` share the same quartile cut-offs (`public/data/summary.json`) and give the same recency and monetary scores as the notebook for every customer, and the same segment for 96.3% of them. The difference is frequency: the notebook scores it with `rank(method='first')`, which splits customers with the same number of orders by row order, so identical customers can get different scores. A calculator for new customers has to use fixed cut-offs instead.

## How to Run the Streamlit App
1. Install dependencies: `pip install -r requirements.txt`
2. Run: `streamlit run app.py`
