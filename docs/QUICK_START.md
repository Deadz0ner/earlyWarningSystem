# Quick Start

## Run the System

```bash
npm install
cp .env.example .env          # add your LLM_API_KEY if you want AI explanations
npm start                      # starts on http://localhost:3000
```

Open `http://localhost:3000` and click **"Run Risk Analysis"**.

### React Frontend (Optional)

```bash
cd frontend
npm install
npm run dev      # usually http://localhost:5173
npm run build    # build to frontend/dist
```

---

## Using the Dashboard

1. Click **"Run Risk Analysis"** — system analyzes all 100 dealers
2. Top 10 at-risk dealers appear ranked by default probability
3. Click **"View"** on any dealer to see:
   - Current metrics (DPO, utilization, orders)
   - Which signals triggered and at what level
   - Deterministic explanation + AI narrative

---

## API Endpoints

```bash
# Run analysis on all dealers
curl -X POST http://localhost:3000/api/analyze

# Get top 10 flagged dealers
curl http://localhost:3000/api/risk-assessments/top10

# Get all assessments grouped by tier
curl http://localhost:3000/api/risk-assessments

# Get a specific dealer + 12-month transaction history
curl http://localhost:3000/api/dealers/42

# List all dealers
curl http://localhost:3000/api/dealers

# Server status
curl http://localhost:3000/api/status

# Reset database & regenerate synthetic data
curl -X POST http://localhost:3000/api/reset
```

---

## Customization

Edit `src/engine/riskEngine.js` — the `THRESHOLDS` object at the top:
```javascript
const THRESHOLDS = {
  DPO_CRITICAL: 90,
  UTILIZATION_WATCH: 0.80,
  // ... etc
};
```

Edit `classifyDealerTier()` in the same file to change how signals combine into tiers.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Server won't start | Run `mkdir data` to create the database directory |
| No AI explanations | Set `LLM_API_KEY` in `.env` (system works without it — deterministic explanations are always generated) |
| Dashboard empty | Click "Run Risk Analysis" first, or `curl -X POST http://localhost:3000/api/reset` |

## Stop the Server

```bash
kill $(lsof -t -i:3000)
```

---

For full documentation, see [INDEX.md](INDEX.md).
