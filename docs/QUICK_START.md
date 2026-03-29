# Quick Start Guide

## Start the System

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Set your API key
export LLM_API_KEY=sk-...
# or edit .env directly

# 3. Start the server
npm start

# Server will output:
# ✨ Server running at http://localhost:3000
```

## Access the Dashboard

Open your browser to: **http://localhost:3000**

The built-in dashboard (`public/index.html`) shows:
- Portfolio summary (100 dealers, flagged count varies per run)
- Top 10 at-risk dealers table
- Risk tier distribution

### React Frontend (Optional)

There is also a full React frontend in the `frontend/` directory (Vite + React + Recharts):

```bash
cd frontend
npm install
npm run dev      # Dev server (usually http://localhost:5173)
npm run build    # Build to frontend/dist
```

## Run Risk Analysis

1. Click **"📊 Run Risk Analysis"** button
2. System analyzes all 100 dealers
3. Results show top 10 most likely to default in next 30 days

## View Dealer Details

1. Click **"View"** on any dealer row
2. Drill-down panel shows:
   - Current metrics (DPO, utilization, orders)
   - Risk signals (which thresholds triggered)
   - Deterministic explanation
   - LLM-enhanced narrative explaining why dealer is flagged

## API Endpoints

### Get Top 10 Flagged Dealers
```bash
curl http://localhost:3000/api/risk-assessments/top10
```

### Get Specific Dealer + History
```bash
curl http://localhost:3000/api/dealers/42
```

### Run Analysis Manually
```bash
curl -X POST http://localhost:3000/api/analyze
```

### Reset & Regenerate Data
```bash
curl -X POST http://localhost:3000/api/reset
```

---

## What the System Does

The system classifies 100 dealers into 4 risk tiers (HEALTHY / WATCH / AT_RISK / CRITICAL) using 7 signal dimensions, ranks them by 30-day default probability, and generates both deterministic and AI-powered explanations.

For details on the risk tiers, thresholds, and scoring, see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md). For data points monitored, see [CHOSEN_DATAPOINTS.md](CHOSEN_DATAPOINTS.md).

---

## Understanding the Output

### Example: Dealer_042
```
Rank: #1
Risk Tier: 🔴 CRITICAL
Score: 95

Metrics:
- DPO: 95 days (threshold: 90d) → CRITICAL
- Utilization: 92% (threshold: 90%) → CRITICAL
- Late Payments: 3 in 90d → CRITICAL
- Orders: ↓45% (threshold: >40%) → CRITICAL

Explanation:
"⚠️ CRITICAL: Dealer is showing severe distress. DPO overdue by 5+ days (RBI default threshold).
Loan maxed at 92%. Orders collapsed 45%. Immediate collection action essential."
```

**What it means:** This dealer is in legal default (90+ dpd) and cannot be saved. Recommend collection procedures.

---

## Customization

### Adjust Risk Thresholds
Edit `src/engine/riskEngine.js`:
```javascript
const THRESHOLDS = {
  DPO_CRITICAL: 90,    // Change default threshold
  UTILIZATION_WATCH: 0.70,
  // ... etc
};
```

### Change Tier Scoring
Edit `classifyDealerTier()` function in same file to adjust how signals combine.

### Filter by Anchor
The API returns all assessments; filter client-side by `anchorId` field in the response.

---

## Troubleshooting

### Server won't start
```
Error: unable to open database file
→ Create data directory: mkdir data
```

### LLM explanations not showing
```
Error: LLM_API_KEY not set
→ Set env: export LLM_API_KEY=sk-...
→ System still works with deterministic explanations
```

### Dashboard shows no dealers
```
→ Click "Run Risk Analysis" button first
→ Or reset data: curl -X POST http://localhost:3000/api/reset
```

---

## Next Steps

1. **Explore the data:** View different dealers, understand why they're flagged
2. **Test the API:** Use `curl` to hit endpoints directly
3. **Integrate with your system:** API is stateless; easy to call from other apps
4. **Measure accuracy:** Track which flagged dealers actually default (measure precision/recall)
5. **Refine thresholds:** Adjust based on real portfolio outcomes

---

## Documentation

See [INDEX.md](INDEX.md) for a full mapping of submission requirements to documentation files.
