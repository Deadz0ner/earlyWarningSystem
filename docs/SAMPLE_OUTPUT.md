# Sample Output & Dashboard Preview

This document shows example outputs from the Early Warning System dashboard and API responses.

---

## Dashboard Overview

### Portfolio Summary Panel
```
┌─────────────────────────────────────────────────┐
│   Dealer Portfolio Early Warning System          │
│   Real-time risk detection for NBFC networks     │
└─────────────────────────────────────────────────┘

[📊 Run Risk Analysis] [🔄 Refresh] [♻️ Reset]
Status: ✅ Ready

┌──────────────────────────────┬─────────────────┐
│   📈 Portfolio Summary        │  📋 Tier Dist   │
├──────────────────────────────┼─────────────────┤
│                              │                 │
│  Total Dealers:        100   │  🔴 Critical: 5 │
│  Flagged:              23    │  🟠 At Risk:  8 │
│  Critical:              5    │  🟡 Watch:   10 │
│  At Risk:               8    │  🟢 Healthy: 77 │
│                              │                 │
└──────────────────────────────┴─────────────────┘
```

---

## Top 10 At-Risk Dealers Table

| Rank | Dealer | Anchor | Risk Tier | Score | DPO (d) | Util. | Action |
|------|--------|--------|-----------|-------|---------|-------|--------|
| 1 | Dealer_042 | ANCHOR_A | 🔴 Critical | 95 | 95 | 92% | [View] |
| 2 | Dealer_071 | ANCHOR_B | 🔴 Critical | 92 | 88 | 91% | [View] |
| 3 | Dealer_089 | ANCHOR_A | 🟠 At Risk | 78 | 82 | 88% | [View] |
| 4 | Dealer_043 | ANCHOR_B | 🟠 At Risk | 72 | 75 | 85% | [View] |
| 5 | Dealer_056 | ANCHOR_A | 🟠 At Risk | 68 | 72 | 82% | [View] |
| 6 | Dealer_021 | ANCHOR_A | 🟡 Watch | 35 | 58 | 76% | [View] |
| 7 | Dealer_034 | ANCHOR_B | 🟡 Watch | 32 | 55 | 74% | [View] |
| 8 | Dealer_067 | ANCHOR_A | 🟡 Watch | 28 | 52 | 72% | [View] |
| 9 | Dealer_098 | ANCHOR_B | 🟡 Watch | 25 | 48 | 70% | [View] |
| 10 | Dealer_012 | ANCHOR_A | 🟡 Watch | 22 | 45 | 68% | [View] |

---

## Drill-Down: Dealer_042 (Top Risk)

### Dealer Details

```
📌 Dealer Details & Risk Explanation

┌──────────────────────────────────────────────────────┐
│ Dealer Name           │ Dealer_042                   │
│ Anchor                │ ANCHOR_A                     │
│ Credit Profile        │ HIGHRISK                     │
│ Sanctioned Limit      │ ₹32L (₹32,00,000)            │
│ Current Balance       │ ₹29.4L (₹29,40,000)          │
│ Days Payable Outst.   │ 95 days                      │
│ Loan Utilization      │ 91.9%                        │
│ Monthly Order Value   │ ₹4.2L (₹4,20,000)            │
└──────────────────────────────────────────────────────┘
```

### Risk Signals

```
Risk Signals:
⚫ DPO: CRITICAL
⚫ Utilization: CRITICAL
⚫ Late Payments: CRITICAL
⚫ Order Trend: CRITICAL
⚫ Order Volatility: CRITICAL
```

### Risk Assessment

```
⚠️ CRITICAL: Dealer_042 is showing severe distress signals.

• Payment delay: Days Payable Outstanding (DPO) is 95 days (critical threshold: 90+ days).

• High leverage: Loan utilization is 91.9% (critical: >90%).

• Business collapse: Orders have dropped 45.0% (3-month vs baseline).

• Payment failures: 3 late payment incidents in last 3 months.

• Erratic behavior: Order volatility is 48.1% (erratic patterns suggest cash stress).

💡 AI Analysis:
Dealer_042 faces critical distress: 95-day payment overdue (exceeded RBI default threshold by 5 days),
loan utilization at 92% (essentially maxed out), orders down 45% (severe demand loss). Immediate
collection action and dealer contact essential—likely unable to recover without significant intervention.
```

---

## API Response Examples

### Endpoint: `POST /api/analyze`
**Request:**
```bash
curl -X POST http://localhost:3000/api/analyze
```

**Response:**
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
      "tierScore": 95,
      "metrics": {
        "daysPayableOutstanding": 95,
        "utilization": 0.919,
        "orderDeclinePercent": 0.450,
        "orderVolatility": 0.481,
        "latePaymentCount": 3,
        "totalOrderValue": 420000,
        "currentBalance": 2940000,
        "monthlyEMI": 32000,
        "paymentReceived": 0
      },
      "signals": {
        "dpo": "CRITICAL",
        "utilization": "CRITICAL",
        "latePayments": "CRITICAL",
        "orderTrend": "CRITICAL",
        "volatility": "CRITICAL"
      },
      "explanation": "⚠️ CRITICAL: Dealer_042 is showing severe distress signals. • Payment delay: DPO is 95 days (critical threshold: 90+ days). • High leverage: Utilization is 91.9% (critical: >90%). • Business collapse: Orders have dropped 45.0%. • Payment failures: 3 late payment incidents.",
      "llmExplanation": "Dealer_042 faces critical distress: 95-day payment overdue (exceeded RBI default threshold by 5 days), loan utilization at 92% (essentially maxed out), orders down 45% (severe demand loss). Immediate collection action and dealer contact essential—likely unable to recover without significant intervention."
    },
    {
      "dealerId": 71,
      "dealerName": "Dealer_071",
      "anchorId": "ANCHOR_B",
      "profile": "HIGHRISK",
      "tier": "CRITICAL",
      "tierScore": 92,
      "metrics": {
        "daysPayableOutstanding": 88,
        "utilization": 0.912,
        "orderDeclinePercent": 0.420,
        "orderVolatility": 0.445,
        "latePaymentCount": 3,
        "totalOrderValue": 385000,
        "currentBalance": 2730000,
        "monthlyEMI": 30000,
        "paymentReceived": 0
      },
      "signals": {
        "dpo": "CRITICAL",
        "utilization": "CRITICAL",
        "latePayments": "CRITICAL",
        "orderTrend": "CRITICAL",
        "volatility": "CRITICAL"
      },
      "explanation": "⚠️ CRITICAL: Dealer_071 is showing severe distress signals...",
      "llmExplanation": "Dealer_071 approaching critical default: DPO at 88 days (near 90-day threshold), maxed utilization (91%), orders collapsed 42%. Recommend immediate outreach to understand payment plans..."
    }
  ]
}
```

### Endpoint: `GET /api/risk-assessments`
**Response (Summary):**
```json
{
  "success": true,
  "count": 100,
  "byTier": {
    "CRITICAL": [
      { "dealerId": 42, "dealerName": "Dealer_042", "tier": "CRITICAL", "tierScore": 95 },
      { "dealerId": 71, "dealerName": "Dealer_071", "tier": "CRITICAL", "tierScore": 92 }
    ],
    "AT_RISK": [
      { "dealerId": 89, "dealerName": "Dealer_089", "tier": "AT_RISK", "tierScore": 78 },
      { "dealerId": 43, "dealerName": "Dealer_043", "tier": "AT_RISK", "tierScore": 72 },
      { "dealerId": 56, "dealerName": "Dealer_056", "tier": "AT_RISK", "tierScore": 68 }
    ],
    "WATCH": [
      { "dealerId": 21, "dealerName": "Dealer_021", "tier": "WATCH", "tierScore": 35 },
      { "dealerId": 34, "dealerName": "Dealer_034", "tier": "WATCH", "tierScore": 32 }
    ],
    "HEALTHY": [
      { "dealerId": 1, "dealerName": "Dealer_001", "tier": "HEALTHY", "tierScore": 5 },
      ...
    ]
  }
}
```

### Endpoint: `GET /api/dealers/42`
**Response (Dealer + History):**
```json
{
  "success": true,
  "data": {
    "dealer": {
      "id": 42,
      "name": "Dealer_042",
      "anchorId": "ANCHOR_A",
      "profile": "HIGHRISK",
      "sanctionedLimit": 3200000,
      "baselineDPO": 62,
      "defaultRisk": 0.25,
      "createdAt": "2025-01-01"
    },
    "transactions": [
      {
        "dealerId": 42,
        "month": "Jan",
        "year": 2025,
        "monthIndex": 0,
        "sanctionedLimit": 3200000,
        "currentBalance": 1920000,
        "utilization": 0.60,
        "orderCount": 7,
        "totalOrderValue": 420000,
        "avgOrderValue": 60000,
        "daysPayableOutstanding": 45,
        "expectedMonthlyEMI": 320000,
        "paymentReceived": 320000,
        "latePaymentCount": 0,
        "isLatePayment": false,
        "isDefault": false
      },
      {
        "dealerId": 42,
        "month": "Feb",
        "year": 2025,
        "monthIndex": 1,
        "sanctionedLimit": 3200000,
        "currentBalance": 1984000,
        "utilization": 0.62,
        "orderCount": 6,
        "totalOrderValue": 398000,
        "avgOrderValue": 66333,
        "daysPayableOutstanding": 48,
        "expectedMonthlyEMI": 320000,
        "paymentReceived": 305000,
        "latePaymentCount": 1,
        "isLatePayment": true,
        "isDefault": false
      },
      // ... 10 more months showing deterioration
      {
        "dealerId": 42,
        "month": "Dec",
        "year": 2025,
        "monthIndex": 11,
        "sanctionedLimit": 3200000,
        "currentBalance": 2940000,
        "utilization": 0.919,
        "orderCount": 1,
        "totalOrderValue": 42000,
        "avgOrderValue": 42000,
        "daysPayableOutstanding": 95,
        "expectedMonthlyEMI": 320000,
        "paymentReceived": 0,
        "latePaymentCount": 3,
        "isLatePayment": true,
        "isDefault": true
      }
    ]
  }
}
```

---

## Sample Trend Visualization

### Dealer_042 Deterioration Over 12 Months

```
DPO Trend:
45d ↓ 48d ↓ 52d ↓ 58d ↓ 65d ↓ 72d ↓ 78d ↓ 82d ↓ 88d ↓ 92d ↓ 95d (DEFAULT)
    │    │    │    │    │    │    │    │    │    │    │
    Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
        Watch threshold (65d) ─────────────┐
        At Risk threshold (75d) ────────────┐
        Critical threshold (90d) ──────────────────────┐

Orders Trend:
420K │
     ├──────────────────────────────────────────────
 360K│     ╲
     │      ╲
 300K│       ╲
     │        ╲
 240K│         ╲
     │          ╲
 180K│           ╲
     │            ╲
 120K│             ╲___
     │                  ╲
  60K│                   ╲___________
     │                               ╲_______
   0K└─────────────────────────────────────────
     Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
                                        [Order Collapse]

Utilization:
90% │                                   ╭────
    │                                ╭──╯
80% │                             ╭──╯
    │                          ╭──╯
70% │                       ╭──╯
    │                    ╭──╯
60% │──────────────────╯
    │
    └─────────────────────────────────────────
    Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
         [Steady Rise Over 9 Months]
```

---

## Dealer Comparison Matrix

### Cross-Dealer Metrics (Snapshot)

```
Dealer     │ Profile  │ DPO  │ Util. │ Orders   │ Risk
─────────────────────────────────────────────────────
Dealer_042 │ HIGHRISK │  95d │ 91.9% │ ↓↓↓↓↓    │ 🔴 CRITICAL
Dealer_071 │ HIGHRISK │  88d │ 91.2% │ ↓↓↓↓     │ 🔴 CRITICAL
Dealer_089 │ FAIR     │  82d │ 87.9% │ ↓↓↓      │ 🟠 AT RISK
Dealer_043 │ FAIR     │  75d │ 84.8% │ ↓↓↓      │ 🟠 AT RISK
Dealer_021 │ GOOD     │  58d │ 76.2% │ ↓↓       │ 🟡 WATCH
Dealer_034 │ GOOD     │  55d │ 74.1% │ ↓        │ 🟡 WATCH
Dealer_001 │ PREMIUM  │  32d │ 62.0% │ ↑        │ 🟢 HEALTHY
Dealer_002 │ GOOD     │  38d │ 65.5% │ ↑        │ 🟢 HEALTHY
```

---

## Operations Dashboard (For Daily Use)

```
╔════════════════════════════════════════════════════════════════╗
║         DEALER PORTFOLIO EARLY WARNING SYSTEM                  ║
║                 Daily Operations Dashboard                      ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Last Updated: 2025-03-25 08:30 AM IST                         ║
║  Portfolio Status: ⚠️ 23 Dealers Flagged (23% of portfolio)     ║
║                                                                 ║
╟─────────────────────────────────────────────────────────────────╢
║ CRITICAL ALERTS (5 dealers - IMMEDIATE ACTION REQUIRED)        ║
╟─────────────────────────────────────────────────────────────────╢
║                                                                 ║
║  1. Dealer_042 | Score: 95 | DPO: 95d | "Payment 5d overdue"  ║
║     Action: COLLECTION | Contact: [Phone] [Email]             ║
║                                                                 ║
║  2. Dealer_071 | Score: 92 | DPO: 88d | "Approaching default"║
║     Action: OUTREACH | Contact: [Phone] [Email]               ║
║                                                                 ║
║  ...                                                            ║
║                                                                 ║
╟─────────────────────────────────────────────────────────────────╢
║ AT RISK ALERTS (8 dealers - REVIEW THIS WEEK)                  ║
╟─────────────────────────────────────────────────────────────────╢
║                                                                 ║
║  Dealer_089 | Score: 78 | DPO: 82d | "Payment stress emerging"║
║  Dealer_043 | Score: 72 | DPO: 75d | "Rising leverage + lates" ║
║  ...                                                            ║
║                                                                 ║
╟─────────────────────────────────────────────────────────────────╢
║ WATCH ALERTS (10 dealers - MONITOR NEXT 2 WEEKS)               ║
╟─────────────────────────────────────────────────────────────────╢
║                                                                 ║
║  Dealer_021 | Score: 35 | DPO: 58d | "Early warning signals"  ║
║  ...                                                            ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Expected Outcomes

### Precision & Recall (After 30 Days)

Assuming the system runs for 30 days and we track actual defaults:

```
Scenario 1: High Recall (Goal)
─────────────────────────────────
Total Defaults: 3 dealers
Flagged Dealers: 23 (top 10 critical/at-risk, others watch)
True Positives: 3 (all defaults caught)
False Positives: 20 (flagged but recovered)
Recall: 100% (caught all real defaults)
Precision: 3/23 = 13% (acceptable for safety)

Scenario 2: Balanced (Target)
─────────────────────────────────
Total Defaults: 3 dealers
Flagged: Critical + At Risk only (13 dealers)
True Positives: 3
False Positives: 10
Recall: 100%
Precision: 3/13 = 23% (better, still acceptable)

Scenario 3: Refined (Future)
─────────────────────────────────
(After threshold adjustments based on real data)
Total Defaults: 3 dealers
Flagged: 8 dealers (conservative)
True Positives: 3
False Positives: 5
Recall: 100%
Precision: 3/8 = 38% (good balance)
```

---

## Notes

- All sample outputs use **synthetic data** generated by the system
- Real portfolio will show different patterns and dealer names
- LLM explanations will vary based on current Claude API output
- Dashboard updates after each `/api/analyze` call
- All metrics are traceable to underlying transaction data
