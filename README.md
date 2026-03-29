# Dealer Portfolio Early Warning System

**An AI-powered early warning system for NBFC dealer portfolio risk detection**

## Overview

This system flags dealers most likely to default in the next 30 days by analyzing 12 months of transaction data. Every flag comes with a clear explanation—not just a score, but the specific signals that triggered it.

### Key Features
- ✅ **Synthetic Dataset**: 100 dealers across 2 anchors with 12 months of realistic transaction data
- ✅ **Risk Tiers**: 4-level classification (Healthy → Watch → At Risk → Critical)
- ✅ **30-Day Default Probability**: Forward-looking default estimate using weighted logistic formula
- ✅ **Top 10 Ranking**: Ranked by 30-day default probability, with transparent signal breakdown
- ✅ **AI Explanations**: LLM generates human-readable risk narratives for flagged dealers
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

# Add your LLM API key
export LLM_API_KEY=your-key-here
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
- 4-tier system: HEALTHY → WATCH → AT_RISK → CRITICAL
- 7 signal dimensions with deterministic thresholds (DPO, utilization, late payments, order trend, volatility, DPO velocity, payment coverage)
- Any single CRITICAL signal → CRITICAL tier immediately
- 30-day default probability via weighted logistic formula — top 10 ranked by this
- Full thresholds, scoring weights, and escalation rules: see [CLASSIFICATION_LOGIC.md](docs/CLASSIFICATION_LOGIC.md)

#### 3. **API & Database** (`src/api/server.js`, `src/data/database.js`)
- Express API with SQLite backend
- 3 tables: dealers, transactions, risk_assessments
- Endpoints for analysis, drill-down, reset

#### 4. **Dashboard**
- **Built-in** (`public/index.html`): Static HTML dashboard served by Express
- **React frontend** (`frontend/`): Full React app with Vite, Recharts for charts, Lucide for icons
  - Components: Header, SummaryCards, TierDistribution, DealerTable, DealerDetail, SignalIndicator, TransactionChart
  - Run with `cd frontend && npm run dev` or build with `npm run build`
- Both show: real-time visualization of top 10 flagged dealers, portfolio summary, drill-down with metrics/signals/explanations

---

## Detailed Documentation

Each submission requirement is covered in a dedicated document. See [docs/INDEX.md](docs/INDEX.md) for a full mapping.

| Requirement | Document |
|-------------|----------|
| What data points I chose to monitor and why | [CHOSEN_DATAPOINTS.md](docs/CHOSEN_DATAPOINTS.md) |
| Risk classification logic, thresholds, triggers | [CLASSIFICATION_LOGIC.md](docs/CLASSIFICATION_LOGIC.md) |
| Where I used AI vs deterministic rules, and reasoning | [METHODOLOGY.md](docs/METHODOLOGY.md) |
| What happens when data is missing | [DATA_MODEL.md](docs/DATA_MODEL.md) |
| False positive rate and measurement | [FALSE_POSITIVES.md](docs/FALSE_POSITIVES.md) |
| What I would improve with more time | [FUTURE_WORK.md](docs/FUTURE_WORK.md) |
| Database schema and metric definitions | [DATA_MODEL.md](docs/DATA_MODEL.md) |
| Example API responses and dashboard output | [SAMPLE_OUTPUT.md](docs/SAMPLE_OUTPUT.md) |
| Initial design assumptions and loan parameters | [APPROACH.md](docs/APPROACH.md) |

---

## File Structure

```
/
├── README.md                           # This file
├── index.js                            # Entry point
├── package.json                        # Dependencies
├── .env                                # API key (add yours here)
├── .env.example                        # Template
│
├── src/
│   ├── data/
│   │   ├── generateSyntheticData.js   # 100 dealers, 12 months, 5 archetypes
│   │   └── database.js                 # SQLite management
│   ├── engine/
│   │   └── riskEngine.js               # Classification, scoring, 30-day default probability
│   └── api/
│       └── server.js                   # Express API + LLM integration
│
├── public/                             # Built-in static dashboard
│   ├── index.html
│   ├── favicon.svg
│   ├── icons.svg
│   └── assets/
│
├── frontend/                           # React frontend (Vite + React + Recharts)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
│           ├── Header.jsx
│           ├── SummaryCards.jsx
│           ├── TierDistribution.jsx
│           ├── DealerTable.jsx
│           ├── DealerDetail.jsx
│           ├── SignalIndicator.jsx
│           └── TransactionChart.jsx
│
├── data/
│   └── portfolio.db                    # SQLite database (auto-created)
│
└── docs/                               # Full documentation
    ├── APPROACH.md                     # Initial methodology & assumptions
    ├── CHOSEN_DATAPOINTS.md            # Data points: what I monitor and why
    ├── BUILD_SUMMARY.md                # Build summary & key decisions
    ├── QUICK_START.md                  # Getting started guide
    ├── DATA_MODEL.md                   # Database schema & metric definitions
    ├── CLASSIFICATION_LOGIC.md         # Risk tiers, thresholds, scoring
    ├── METHODOLOGY.md                  # AI vs deterministic decision matrix
    ├── SAMPLE_OUTPUT.md                # Example dashboard output & API responses
    ├── FALSE_POSITIVES.md              # Measurement framework & refinement
    └── FUTURE_WORK.md                  # Roadmap for improvements
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
LLM_API_KEY=sk-...            # LLM API key (required for AI explanations)
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
- **Built-in dashboard** (`public/`): Self-contained HTML. No build step.
- **React frontend** (`frontend/`): Requires `npm install` and `npm run dev` or `npm run build`.

