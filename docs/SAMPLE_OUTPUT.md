# Sample Output

Example outputs from the dashboard and API. Numbers are illustrative — actual values vary per run since the synthetic data has random elements.

---

## Dashboard Overview

After clicking "Run Risk Analysis":

```
Portfolio Summary:
  Total Dealers: 100
  Flagged: ~23 (Critical: ~5, At Risk: ~8, Watch: ~10)
  Healthy: ~77
```

### Top 10 Table

| Rank | Dealer | Anchor | Tier | Score | DPO | Util. |
|------|--------|--------|------|-------|-----|-------|
| 1 | Dealer_042 | ANCHOR_A | CRITICAL | 450 | 95d | 92% |
| 2 | Dealer_071 | ANCHOR_B | CRITICAL | 380 | 88d | 91% |
| 3 | Dealer_089 | ANCHOR_A | AT RISK | 110 | 82d | 88% |
| 4 | Dealer_043 | ANCHOR_B | AT RISK | 85 | 75d | 85% |
| 5 | Dealer_056 | ANCHOR_A | AT RISK | 68 | 72d | 82% |
| 6 | Dealer_021 | ANCHOR_A | WATCH | 40 | 58d | 76% |
| ... | ... | ... | ... | ... | ... | ... |

---

## Drill-Down: Dealer_042

```
Dealer: Dealer_042 | Anchor: ANCHOR_A | Profile: HIGHRISK
Sanctioned Limit: ₹32L | Current Balance: ₹29.4L | DPO: 95 days | Utilization: 91.9%

Risk Signals:
  DPO: CRITICAL | DPO Velocity: CRITICAL | Utilization: CRITICAL
  Late Payments: CRITICAL | Payment Coverage: CRITICAL
  Order Trend: CRITICAL | Order Volatility: CRITICAL

Signal Interactions:
  UTILIZATION_ORDER_STRESS: High credit utilization combined with declining order volume
  DPO_ORDER_DETERIORATION: Payment delays worsening alongside declining business activity
  PAYMENT_STRESS: Underpaying EMI and making late payments — active cash crisis

Explanation:
  CRITICAL: Dealer_042 is showing severe distress.
  • DPO is 95 days (threshold: 90d)
  • Utilization is 91.9% (threshold: 90%)
  • Orders dropped 45% (seasonal-adjusted)
  • 3 late payments in last 3 months
  • Paying 0% of expected EMI
  • Compounding risk: High credit utilization combined with declining order volume;
    Payment delays worsening alongside declining business activity;
    Underpaying EMI and making late payments — active cash crisis.

AI Analysis:
  "Dealer_042 faces critical distress: 95-day payment overdue, loan maxed at 92%,
   orders collapsed 45%. Immediate collection action essential."
```

---

## API Responses

### `POST /api/analyze`

Top 10 sorted by `defaultProbability` (descending), then `tierScore` as tiebreaker.

```json
{
  "success": true,
  "totalDealers": 100,
  "flaggedCount": 23,
  "top10": [
    {
      "dealerId": 42,
      "dealerName": "Dealer_042",
      "anchorId": "ANCHOR_A",
      "profile": "HIGHRISK",
      "tier": "CRITICAL",
      "tierScore": 450,
      "defaultProbability": 0.872,
      "metrics": {
        "daysPayableOutstanding": 95,
        "utilization": 0.919,
        "seasonalAdjustedOrderDecline": 0.43,
        "orderVolatility": 0.321,
        "dpoVelocity": 22,
        "latePaymentCount": 3,
        "paymentCoverage": 0.0
      },
      "signals": {
        "dpo": "CRITICAL",
        "utilization": "CRITICAL",
        "latePayments": "CRITICAL",
        "orderTrend": "CRITICAL",
        "volatility": "CRITICAL",
        "dpoVelocity": "CRITICAL",
        "paymentCoverage": "CRITICAL"
      },
      "interactionFlags": [
        { "rule": "UTILIZATION_ORDER_STRESS", "description": "High credit utilization combined with declining order volume", "scoreBoost": 25, "floor": "AT_RISK" },
        { "rule": "DPO_ORDER_DETERIORATION", "description": "Payment delays worsening alongside declining business activity", "scoreBoost": 20, "floor": null },
        { "rule": "PAYMENT_STRESS", "description": "Underpaying EMI and making late payments — active cash crisis", "scoreBoost": 25, "floor": "AT_RISK" }
      ],
      "explanation": "CRITICAL: Dealer_042 is showing severe distress signals. ...",
      "llmExplanation": "Dealer_042 faces critical distress: 95-day payment overdue..."
    }
  ]
}
```

### `GET /api/risk-assessments`

Returns all 100 assessments grouped by tier + a flat `all` array. Sorted by tierScore descending.

```json
{
  "success": true,
  "count": 100,
  "byTier": {
    "CRITICAL": [ { "dealerId": 42, "tier": "CRITICAL", "tierScore": 450, "defaultProbability": 0.872 } ],
    "AT_RISK": [ { "dealerId": 89, "tier": "AT_RISK", "tierScore": 110, "defaultProbability": 0.42 } ],
    "WATCH": [ { "dealerId": 21, "tier": "WATCH", "tierScore": 40, "defaultProbability": 0.12 } ],
    "HEALTHY": [ { "dealerId": 1, "tier": "HEALTHY", "tierScore": 0, "defaultProbability": 0.018 } ]
  },
  "all": [ ... ]
}
```

### `GET /api/dealers/42`

Returns dealer record + all 12 months of transactions showing the deterioration from healthy (month 1) through default (month 12).

### Other Endpoints

- `GET /api/status` — server health + whether LLM is available
- `GET /api/risk-assessments/top10` — cached top 10 from last analysis
- `POST /api/reset` — wipe database and regenerate synthetic data
