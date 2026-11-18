# RFM Customer Segmentation

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
- 5,881 unique customers after cleaning

## Key Findings
- Champions (29% of customers) contribute 80.8% of total revenue
- 1,787 customers are At Risk the largest segment, requiring immediate attention
- K-Means clustering (k=4) validated the manual RFM segments
- Lost customers average 547 days since last purchase with only 1 order

## Segments & Recommendations
| Segment | Criteria | Strategy |
|---|---|---|
| Champions | Score 10–12 | Reward, upsell, ask for reviews |
| Loyal | Score 7–9 | Loyalty programme, personalised offers |
| At Risk | Score 4–6 | Win-back email, time-limited discount |
| Lost | Score 3 | Re-engage only with significant offer |

## Tech Stack
- Python, Pandas, NumPy
- Matplotlib, Seaborn
- Scikit-learn (KMeans, StandardScaler)
- Openpyxl (Excel export)
- Streamlit (interactive web app)

## How to Run
1. Download the dataset from Kaggle: [Online Retail II UCI](https://www.kaggle.com/datasets/mashlyn/online-retail-ii-uci)
2. Place the CSV in the project folder
3. Install dependencies: `pip install pandas numpy matplotlib seaborn scikit-learn openpyxl`
4. Open `rfm_analysis.ipynb` in VSCode or Jupyter
5. Run all cells in order

## Web App

A static web version lives in `public/` and is ready to host on Vercel (no server needed):

- **Score a customer**: enter days since last purchase, number of orders and total spend to get the segment and recommended action.
- **Dashboard**: segment sizes, share of customers vs share of revenue, a scatter of customers, and the K-Means check.

Run it locally: `python3 -m http.server 8080 --directory public`, then open http://localhost:8080.
Test the scoring: `npm test` (checks the web scorer against all 5,881 customers in `rfm_report.xlsx`).
After re-running the notebook, refresh the web data: `python scripts/build_web_data.py`.

**Deploy on Vercel:** import this repository at vercel.com/new. `vercel.json` already tells Vercel to serve the `public/` folder, so no settings need changing.

Note: the web scorer uses quartile cut-offs recomputed from `rfm_report.xlsx` (spend £341.90 / £865.60 / £2,247.72). The Streamlit `app.py` still has older spend cut-offs (£347.80 / £897.62 / £2,304.18).

## How to Run the Streamlit App
1. Install Streamlit: `pip install streamlit`
2. Run: `streamlit run app.py`
