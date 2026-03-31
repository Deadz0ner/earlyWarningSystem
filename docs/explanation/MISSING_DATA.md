# How I Handle Missing Data

When a dealer has incomplete, sparse, or anomalous data, the system doesn't just skip them or crash — it degrades gracefully, flags what's missing, and adjusts its confidence accordingly.

---

## The Core Mechanism: Confidence Scoring

Every dealer gets a **confidence score** (0.0 to 1.0) based on how many months of transaction data they have:

```
confidence = min(1.0, monthsAvailable / 6)
```

- 1 month → confidence 0.17
- 3 months → confidence 0.50
- 6+ months → confidence 1.0

This confidence score affects two things:

1. **Tier score penalty** — if confidence < 0.5, the tier score gets multiplied by the confidence factor. A dealer with 2 months of data and a raw score of 80 would get `80 × 0.33 = 26`, dropping them from AT_RISK to WATCH. This prevents over-flagging new dealers.

2. **Default probability scaling** — the 30-day default probability is multiplied by confidence. Less history = less certainty about the prediction.

---

## What Happens With No Data At All

If a dealer has zero transactions:

- All metrics return `null` with `status: "NO_DATA"`
- Tier is set to **UNKNOWN** (a special 5th tier, separate from the 4 risk tiers)
- Tier score = 0, default probability = 0
- Explanation: "No transaction data available for this dealer. Cannot assess risk."
- **Excluded from Top 10 ranking** — UNKNOWN dealers are filtered out of the flagged count and the top 10 list entirely. They're not ranked, they're not flagged.
- No LLM explanation is generated for them

---

## Minimum Data Requirements for Each Metric

Not all metrics need the same amount of history. The system calculates what it can with what it has:

| Metric | Minimum months needed | What happens below minimum |
|--------|----------------------|---------------------------|
| DPO (current) | 1 | Uses the single available month |
| Utilization | 1 | Uses the single available month |
| Late payment count (90d) | 1 | Counts from whatever months exist |
| Payment coverage | 1 | Compares current month's payment vs EMI |
| DPO velocity (MoM change) | 2 | Returns `null` until a prior month exists |
| Order decline (baseline vs recent) | 4 | Returns `null` until enough baseline history exists |
| DPO trend (baseline vs recent) | 4 | Returns `null` |
| Order volatility | 1+ (uses up to 6) | Calculated on whatever is available, but flagged as unreliable below 6 months |

This means a dealer with just 1-2 months of data can still be evaluated on DPO, utilization, late payments, and payment coverage — trend metrics that need more history remain unavailable instead of being silently treated as zero.

---

## Missing Data Flags

The system tracks specific data quality issues per dealer in a `missingDataFlags` array that shows up in the API response and the explanation text:

### Flag 1: Insufficient months
```
"Only 2 month(s) of data — trend analysis unreliable"
```
Triggers when `monthsAvailable < 3`. Means DPO velocity works but order decline and DPO trend don't.

### Flag 2: No seasonal context
```
"Less than 6 months of history — volatility and seasonal patterns may be inaccurate"
```
Triggers when `monthsAvailable < 6`. Volatility is calculated but may not be meaningful without seeing at least half a year.

### Flag 3: Payments without orders
```
"2 month(s) with payments but no recorded orders — possible data gap or non-anchor activity"
```
Triggers when the system detects months where `paymentReceived > 0` but `totalOrderValue === 0` or `orderCount === 0`. This is an anomaly — either the data pipeline missed the orders, or the dealer is doing business outside the anchor channel.

These flags are included in the deterministic explanation:
```
"• Data quality: Only 2 month(s) of data — trend analysis unreliable;
  Less than 6 months of history — volatility and seasonal patterns may be inaccurate."
```

---

## Null-Safe Signal Evaluation

When `classifyDealerTier()` evaluates the 7 signals, it checks every metric for null/undefined before comparing against thresholds:

```javascript
// Order trend — only evaluated if the metric exists
if (decline !== null && decline !== undefined) {
  if (decline > 0.4) signals.orderTrend = "CRITICAL";
  // ...
}

// Same pattern for volatility, DPO velocity, payment coverage
```

If a metric is null (because there wasn't enough data to calculate it), the signal is left as `null` — it doesn't fire at any level. This means missing data **never triggers a false alarm**. A dealer with 1 month of history won't get flagged for "order decline" because that metric simply doesn't exist yet.

---

## Zero-EMI Edge Case

If `expectedMonthlyEMI` is 0 for a given month (shouldn't happen in normal data, but defensive coding):

```javascript
paymentCoverage = expectedMonthlyEMI > 0
  ? paymentReceived / expectedMonthlyEMI
  : 1.0  // assume full coverage if EMI is 0
```

This avoids division by zero and defaults to "healthy" rather than "critical."

---

## Default Probability with Missing Data

The `calculate30DayDefaultProbability()` function uses `|| 0` defaults for all metrics:

```javascript
const dpo = metrics.daysPayableOutstanding || 0;
const velocity = metrics.dpoVelocity || 0;
const decline = metrics.seasonalAdjustedOrderDecline || 0;
const util = metrics.utilization || 0;
const lates = metrics.latePaymentCount || 0;
```

If a metric is null/missing, it contributes 0 to the logit — effectively "no signal" rather than "bad signal." The final probability is then multiplied by the confidence score, so sparse data always results in a lower predicted probability.

---

## Summary: Design Philosophy

The approach can be summed up as: **missing data reduces confidence, it doesn't create false alarms.**

- No data → UNKNOWN tier, excluded from ranking
- Sparse data (1-3 months) → only simple metrics evaluated, score penalized by confidence
- Partial data (3-6 months) → most metrics work, volatility flagged as unreliable
- Full data (6+ months) → all metrics at full confidence
- Anomalous data (payments without orders) → flagged explicitly for ops review
- Null metrics → signals don't fire, default probability unaffected
