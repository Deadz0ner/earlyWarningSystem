# Quick Start Guide

## Start the System

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-...
# or edit .env directly

# 3. Start the server
npm start

# Server will output:
# ✨ Server running at http://localhost:3000
```

## Access the Dashboard

Open your browser to: **http://localhost:3000**

You'll see:
- Portfolio summary (100 dealers, 23 flagged)
- Top 10 at-risk dealers table
- Risk tier distribution

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

✅ **Analyzes 100 dealers across 12 months of transaction data**
- 60 dealers under Anchor A
- 40 dealers under Anchor B
- Realistic patterns: seasonal variation, deterioration, recovery, defaults

✅ **Classifies dealers into 4 risk tiers**
- 🔴 **CRITICAL** (DPO ≥90 days) → immediate intervention
- 🟠 **AT RISK** (multiple signals) → ops review
- 🟡 **WATCH** (early warnings) → monitor weekly
- 🟢 **HEALTHY** (normal) → routine monitoring

✅ **Provides explanations for every flag**
- Deterministic: "DPO is 95 days (threshold: 90d)"
- AI-enhanced: Claude API adds context and recommendations

✅ **Ranks dealers by default risk**
- Top 10 shown on dashboard
- Score reflects combined signal intensity
- Transparent scoring formula

---

## Key Concepts

### Days Payable Outstanding (DPO)
How many days it takes a dealer to pay an invoice. Rising DPO = cash stress.

### Utilization Rate
Percentage of sanctioned loan being used (balance / limit). High utilization = less flexibility.

### Order Trend
Month-over-month change in purchase orders. Falling orders = demand loss.

### Risk Tiers
Four levels (Healthy → Watch → At Risk → Critical) based on thresholds for DPO, utilization, late payments, orders.

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
Use API query: `/api/risk-assessments?anchor=ANCHOR_A`

---

## Troubleshooting

### Server won't start
```
Error: unable to open database file
→ Create data directory: mkdir data
```

### LLM explanations not showing
```
Error: ANTHROPIC_API_KEY not set
→ Set env: export ANTHROPIC_API_KEY=sk-...
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

- **README.md** - Full overview and features
- **APPROACH.md** - Methodology, assumptions, loan parameters
- **DATA_MODEL.md** - Database schema and metric definitions
- **CLASSIFICATION_LOGIC.md** - Risk tiers, thresholds, scoring
- **METHODOLOGY.md** - AI vs deterministic decision matrix
- **SAMPLE_OUTPUT.md** - Example dashboard output and API responses
- **FALSE_POSITIVES.md** - Measurement framework and refinement
- **FUTURE_WORK.md** - Roadmap for improvements

---

## Questions?

All design decisions, assumptions, and trade-offs are documented in the docs/ folder. Start with APPROACH.md for high-level overview.

Happy analyzing! 🚀
