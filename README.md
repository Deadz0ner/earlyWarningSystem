# Dealer Portfolio Early Warning System

**An AI-powered early warning system for NBFC dealer portfolio risk detection**

## Overview

This system flags dealers most likely to default in the next 30 days by analyzing 12 months of transaction data. Every flag comes with a clear explanation—not just a score, but the specific signals that triggered it.

### Key Features
- ✅ **Synthetic Dataset**: 100 dealers across 2 anchors with 12 months of realistic transaction data
- ✅ **Risk Tiers**: 4-level classification (Healthy → Watch → At Risk → Critical)
- ✅ **30-Day Default Probability**: Forward-looking default estimate using weighted logistic formula
- ✅ **Top 10 Ranking**: Ranked by 30-day default probability, with transparent signal breakdown
- ✅ **AI Explanations**: Claude API (Haiku) generates human-readable risk narratives for flagged dealers
- ✅ **Interactive Dashboard**: Real-time visualization, drill-down analysis, trend tracking
- ✅ **Deterministic + AI Hybrid**: Explicit thresholds for auditability + LLM for explanation synthesis
- ✅ **Missing Data Handling**: Partial analysis with confidence scoring for dealers with limited history

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set API Key
```bash
# Copy example to .env
cp .env.example .env

# Add your ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=your-key-here
# Or edit .env directly
```

### 3. Start Server
```bash
npm start
```

The system will:
1. Initialize the SQLite database
2. Generate 100 synthetic dealers with 12 months of transaction data
3. Start the API server on `http://localhost:3000`

### 4. Open Dashboard
```
http://localhost:3000
```

Click **"Run Risk Analysis"** to analyze the entire portfolio and identify the top 10 at-risk dealers.

### 5. Stop the Server

If running in the foreground, press `Ctrl+C` in the terminal.

If running in the background, use one of these:

```bash
# Option 1: Kill by port (recommended — no need to know the PID)
kill $(lsof -t -i:3000)

# Option 2: Find the PID first, then kill it
lsof -i :3000                  # note the PID from the output
kill <PID>

# Option 3: Kill all node processes (use with caution)
pkill -f "node index.js"
```

---

## Architecture

### Core Components

#### 1. **Synthetic Data Generator** (`src/data/generateSyntheticData.js`)
- Generates 100 dealers: 60 to Anchor A, 40 to Anchor B
- 4 credit profiles (Premium, Good, Fair, High-Risk) with realistic sanctioned limits
- 12 months of transaction data with:
  - Seasonal patterns (Q4 boost, Q1 decline)
  - Slow deterioration trends (months before default)
  - Recovery arcs (dealers that dip then bounce back)
  - Sudden defaults (for high-risk dealers in late months)

**Key Parameters Modeled:**
- Sanctioned Limit: ₹15L–₹60L per dealer
- Monthly EMI: 8–12% of sanctioned limit
- DPO Baseline: 25–70 days (varies by profile)
- Utilization Rate: 50–90% (seasonal variation)
- Default Probability: 0.5–25% annually (by profile)

#### 2. **Risk Classification Engine** (`src/engine/riskEngine.js`)
Deterministic thresholds (70% of engine):

| Metric | Healthy | Watch | At Risk | Critical |
|--------|---------|-------|---------|----------|
| **DPO** | ≤50d | 51–65d | 66–89d | ≥90d |
| **Utilization** | <70% | 70–80% | 80–90% | >90% |
| **Late Payments (90d)** | 0 | 1 | 2+ | 3+ |
| **Order Decline (seasonal-adj)** | stable | 10–20% | 20–40% | >40% |
| **DPO Velocity (MoM)** | <5d | 10–19d | — | ≥20d |
| **Payment Coverage (vs EMI)** | >70% | 30–70% | — | <30% |

**Movement Triggers:**
- Payment slowdown: DPO +15d → escalate one tier
- Order cliff: >30% drop (seasonal-adjusted) → escalate one tier
- Repeated lates: 3+ in 3 months → escalate
- Velocity boost: DPO jump ≥20d in one month → direct to Critical
- EMI underpayment: <30% of expected EMI → direct to Critical

**30-Day Default Probability:**
Each dealer receives a forward-looking default probability (0–100%) based on a weighted logistic formula combining DPO proximity to 90-day threshold, DPO velocity, payment coverage, order decline, utilization pressure, and late payment patterns. Top 10 dealers are ranked by this probability. See `src/engine/riskEngine.js:calculate30DayDefaultProbability()` for the full formula.

#### 3. **API & Database** (`src/api/server.js`, `src/data/database.js`)
- Express API with SQLite backend
- 3 tables: dealers, transactions, risk_assessments
- Endpoints for analysis, drill-down, reset

#### 4. **Dashboard** (`public/index.html`)
- Real-time visualization of top 10 flagged dealers
- Portfolio summary (tier distribution, counts)
- Drill-down with metrics, signals, and explanations
- One-click analysis and data reset

---

## Data Model & Monitoring Points

### What We Track Per Dealer (Monthly)

**Loan Account Health**
- Current balance (drawn amount)
- Utilization rate (balance / sanctioned limit)
- Days Payable Outstanding (DPO)
- Late payment incidents

**Purchasing Behavior**
- Order count per month
- Total order value per month
- Average order value per order
- Order volatility (variance)

**Payment Behavior**
- EMI expected vs. received
- Consistency of DPO (trend)
- Payment gaps

**Derived Signals**
- Month-over-month order decline (%)
- DPO trend (worsening vs. improving)
- Seasonality-adjusted baseline comparison

### Why These Metrics?

1. **Orders** = Business demand proxy; declining orders → demand loss or competitive pressure
2. **Payments** = Repayment capacity; slowdown → cash flow stress *before* default
3. **Balance + Utilization** = Leverage & concentration risk
4. **Consistency** = Behavioral baseline; deviations = early warning

---

## Risk Classification Logic

### Four-Tier System

#### 🟢 **Healthy**
- All metrics within baseline
- No late payments (90d)
- Stable/growing orders
- Normal utilization (<70%)
- **Action:** Quarterly monitoring

#### 🟡 **Watch**
- 1–2 minor signals emerging
- DPO creeping up, small order decline
- 1 late payment incident
- **Action:** Weekly monitoring, ops review

#### 🟠 **At Risk**
- Multiple signals: DPO ↑15%, orders ↓20%, 2+ late payments
- Utilization 80–90%
- Clear deterioration trend
- **Action:** Immediate ops review, dealer outreach suggested

#### 🔴 **Critical**
- Default threshold hit: DPO ≥90 days
- Severe order decline (>40%) or near-zero
- 3+ late payments in 3 months
- Erratic volatility (>40%)
- **Action:** Intervention, collection procedures

---

## AI vs. Deterministic: Decision Matrix

### Where We Use Deterministic Rules (70% of Engine)
✅ **Why:** Ops teams need transparent, auditable logic. A late payment is objective.

- **Payment thresholds**: Hard boundaries (DPO >30d, >60d, >90d)
- **Utilization checks**: Account balance / sanctioned amount
- **Order trend calculation**: Month-over-month %, rolling averages
- **Late payment counting**: Transaction-level flags
- **Risk scoring**: Weighted sum of signal counts

### Where We Use AI/LLM (30% of Engine)
✅ **Why:** Provide actionable, synthesized context that deterministic bullet points can't

**Explanation Generation** (Claude Haiku) ⭐ *Active Now*
- **Input:** Structured flag data (tier, signals, metrics, 30-day default probability)
- **Output:** 2–3 sentence narrative suitable for ops teams
- **Example:** "Dealer_045 is facing acute payment stress: DPO jumped 25 days, orders fell 35%, and 2 payments slipped. Recommend immediate contact."
- **Why AI:** An LLM can reason about *combinations* of signals ("high DPO + declining orders = losing customer base, not just cash flow") and suggest next steps. Deterministic rules list individual thresholds; the LLM synthesizes them.
- **Why Haiku (not Opus):** This is structured-data summarization, not complex reasoning. Haiku is 60x cheaper and fast enough for batch analysis of 10-20 flagged dealers.
- **Graceful degradation:** If no API key is set, the system still works — deterministic explanations are always generated.

**NOT Using AI For:**
- Risk scoring → Deterministic weighted formula (reproducible, auditable)
- Threshold detection → Explicit thresholds (rule-based, transparent)
- 30-day default probability → Deterministic weighted logistic formula. With only 100 synthetic dealers and ~2-5 actual defaults, there's not enough labeled data to train an ML model. The formula uses domain priors (DPO proximity, velocity, payment coverage). Once 6+ months of live data + actual defaults exist, replace with trained logistic regression.
- Anomaly detection → Future improvement. Multivariate outlier detection on unusual *combinations* of metrics (e.g., steady orders but suddenly 45-day payments + cancellations) would benefit from AI. Not implemented yet due to insufficient data for validation.

---

## Handling Missing Data

| Scenario | Approach |
|----------|----------|
| **New dealer (<2 months)** | Flag as "insufficient history"; show available data; don't rank yet |
| **Missing recent payment data** | Forward-fill with 1-month decay; treat as yellow flag |
| **No orders in a month** | If seasonal, adjust baseline; if anomalous, escalate as signal |
| **Missing order data but payments happening** | Treat as anomaly; could indicate non-anchor channel activity |

---

## False Positives & Measurement

### Precision vs. Recall Trade-off

**Current Target:** High recall > High precision (catch most real defaults, accept false positives)

**Metrics to Track Over 30 Days:**
1. **True Positives (TP):** Flagged dealers who actually defaulted
2. **False Positives (FP):** Flagged dealers who recovered/stayed healthy
3. **False Negatives (FN):** Non-flagged dealers who defaulted

**Formulas:**
- **Precision** = TP / (TP + FP) — Of 10 flagged, how many actually defaulted?
- **Recall** = TP / (TP + FN) — Of all real defaults, how many did we catch?

### Initial Expectations
- **Recall:** 70%+ (catch most real defaults; cost of FP < cost of missed default)
- **Precision:** 40%+ (acceptable; ops can handle manual review)

### Refinement Loop
1. Track next 30 days: which flagged dealers default?
2. Calculate actual precision/recall
3. Adjust thresholds per tier:
   - If recall too low: Lower DPO threshold (flag earlier)
   - If precision too low: Raise threshold (reduce false positives)
   - Segment by anchor or profile (thresholds may vary)

---

## Sample Output

### Dashboard Summary (Once Analysis Runs)
```
Portfolio Summary:
- Total Dealers: 100
- Flagged: 23 (Critical: 5, At Risk: 8, Watch: 10)
- Healthy: 77

Top 10 At-Risk:
1. Dealer_042 (Critical, Score: 95)
   DPO: 95d | Utilization: 92% | Orders ↓45%
   → "Payment overdue 5 days beyond critical threshold; business activity has nearly ceased"

2. Dealer_071 (At Risk, Score: 72)
   DPO: 78d | Utilization: 85% | Orders ↓28%
   → "Payment delays escalating; order volume trending downward"
```

### API Response (`/api/risk-assessments/top10`)
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "dealerId": 42,
      "dealerName": "Dealer_042",
      "anchorId": "ANCHOR_A",
      "tier": "CRITICAL",
      "tierScore": 95,
      "metrics": {
        "daysPayableOutstanding": 95,
        "utilization": 0.92,
        "orderDeclinePercent": 0.45,
        "latePaymentCount": 3
      },
      "signals": {
        "dpo": "CRITICAL",
        "utilization": "CRITICAL",
        "latePayments": "CRITICAL",
        "orderTrend": "CRITICAL"
      },
      "explanation": "⚠️ CRITICAL: Dealer_042 is showing severe distress signals. • Payment delay: DPO is 95 days (critical threshold: 90+ days). • High leverage: Utilization is 92.0% (critical: >90%). • Business decline: Orders have dropped 45.0% (3-month vs baseline).",
      "llmExplanation": "Dealer_042 faces critical distress: 95-day payment overdue (critical threshold hit), 92% loan utilization (maxed out), orders collapsed 45%. Immediate collection action and dealer contact essential."
    }
  ]
}
```

---

## What Would Improve With More Time

### 1. **More Sophisticated ML Models**
- With 6+ months of live data + actual defaults, train logistic regression or random forest
- Use historical patterns to predict default probability (not just thresholds)
- Segment models by anchor/profile (different default drivers)

### 2. **External Data Integration**
- Credit bureau scores (if available)
- Anchor health metrics (supplier pressure cascades to dealers)
- Macro signals (market interest rates, inflation affecting small business)
- Inventory levels (proxy for demand)

### 3. **Explainability Enhancement**
- SHAP values: quantify each feature's contribution to risk score
- Counterfactual explanations: "If DPO were 45d instead of 78d, score would be X"
- Peer comparison: "This dealer's DPO is X percentile vs. similar profile peers"

### 4. **Real-Time Monitoring**
- Streaming transaction ingestion (not monthly batch)
- Alert thresholds: notify ops *when* DPO hits 75d (not at month-end)
- Dealer-specific trends: learn each dealer's normal volatility, flag deviations

### 5. **Intervention Tracking**
- When ops outreach a dealer, log it (contact date, topic, outcome)
- Measure intervention effectiveness: did outreach prevent default?
- Build feedback loop into model training

### 6. **Operational Dashboards**
- Anchor-level view (all 60 dealers in Anchor A, aggregate metrics)
- Cohort analysis (dealers added Q1 2025 vs. Q1 2024)
- Seasonal decomposition (isolate trend from seasonality)
- Forecasting: predict next month's default rate

### 7. **A/B Testing Thresholds**
- Run two threshold configs in parallel; measure precision/recall on each
- Gradually shift high-precision orgs to higher-recall thresholds
- Document why each org's thresholds diverged

---

## File Structure

```
/
├── README.md                           # This file
├── APPROACH.md                         # Methodology & assumptions
├── index.js                            # Entry point
├── package.json                        # Dependencies
├── .env                                # API key (add yours here)
├── .env.example                        # Template
│
├── src/
│   ├── data/
│   │   ├── generateSyntheticData.js   # 100 dealers, 12 months
│   │   └── database.js                 # SQLite management
│   ├── engine/
│   │   └── riskEngine.js               # Classification & scoring
│   └── api/
│       └── server.js                   # Express API
│
├── public/
│   └── index.html                      # Interactive dashboard
│
├── data/
│   └── portfolio.db                    # SQLite database (auto-created)
│
└── docs/                               # Full documentation
    ├── DATA_MODEL.md
    ├── CLASSIFICATION_LOGIC.md
    ├── METHODOLOGY.md
    ├── SAMPLE_OUTPUT.md
    ├── FALSE_POSITIVES.md
    └── FUTURE_WORK.md
```

---

## API Endpoints

### Portfolio Analysis
- `POST /api/analyze` — Run risk analysis on all dealers
- `GET /api/risk-assessments` — Get all assessments (grouped by tier)
- `GET /api/risk-assessments/top10` — Get top 10 at-risk dealers

### Dealer Lookup
- `GET /api/dealers` — Get all dealers
- `GET /api/dealers/:id` — Get dealer + 12-month transaction history

### Admin
- `POST /api/reset` — Reset database + regenerate synthetic data
- `GET /api/status` — Check server status

---

## Environment Variables

```bash
PORT=3000                      # Server port (default 3000)
ANTHROPIC_API_KEY=sk-...      # Claude API key (required for explanations)
```

---

## Running in Development

```bash
# Watch for changes (if nodemon installed)
npx nodemon index.js

# Manual restart
npm start
```

---

## Notes

- **Synthetic data is reproducible:** Same random seed will generate identical dealers/transactions. (Update `generateSyntheticData.js` if you need determinism.)
- **Database is ephemeral:** Runs on SQLite in memory/disk. Reset via `/api/reset` endpoint.
- **LLM calls are optional:** If API key missing, explanations won't be generated, but deterministic flags still work.
- **Dashboard is self-contained:** Pure HTML + vanilla JS. No build step.

---

## Questions?

See `APPROACH.md` for:
- Data model rationale
- Loan parameter assumptions
- AI vs. deterministic decision matrix
- False positive measurement framework
- Improvement roadmap
