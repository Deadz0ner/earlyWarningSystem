# Data Points: What I Monitor and Why

This document explains the data points chosen for the Dealer Portfolio Early Warning System (dpEws), the rationale behind each, and how they combine to predict 30-day default risk.

---

## Core Principle

Default doesn't happen overnight. It follows a pattern: business slows down, payments stretch, utilization climbs, and eventually the dealer can't service debt. Each data point below captures a stage in that deterioration arc.

I chose metrics that are **leading indicators** (they change before default happens) over lagging ones (which only confirm what already occurred).

---

## The 7 Data Dimensions

### 1. Days Payable Outstanding (DPO)

| What | Average number of days a dealer takes to clear invoices |
|------|--------------------------------------------------------|
| Range | 25-95+ days |
| Why | DPO is the single strongest predictor of default. RBI NPA guidelines define default at 90+ days. A dealer whose DPO creeps from 40 to 70 days is showing clear stress before they formally default. |

**Derived signals:**
- **DPO Velocity** - Month-over-month change in DPO. A jump of 20+ days in a single month triggers direct escalation to CRITICAL regardless of other metrics.
- **DPO Trend** - 3-month moving average vs. baseline. Catches slow, steady deterioration that single-month snapshots miss.

---

### 2. Loan Utilization Rate

| What | Current balance / Sanctioned limit (0-100%) |
|------|----------------------------------------------|
| Why | High utilization means the dealer is drawing heavily on credit with little headroom. When utilization exceeds 80-90%, the dealer has exhausted their buffer and any business disruption becomes a solvency risk. |

A dealer at 45% utilization can absorb a bad quarter. A dealer at 92% cannot.

---

### 3. Order Activity (Count, Value, Average)

| What | Monthly purchase orders — count, total value, and average order size |
|------|----------------------------------------------------------------------|
| Why | Orders are a proxy for business health. A dealer who stops buying inventory has either lost customers or run out of working capital — both precursors to default. |

**Derived signals:**
- **Order Decline Percent** - Baseline vs. recent orders, adjusted for seasonality (Q1 naturally dips ~15%, Q4 rises ~20%). Without seasonal adjustment, healthy Q1 dealers would be falsely flagged.
- **Order Volatility** - Standard deviation / mean of order values. High volatility (>25%) suggests unstable cash flows.

---

### 4. Payment Behavior

| What | Expected monthly EMI vs. actual payment received |
|------|--------------------------------------------------|
| Why | The most direct signal of a dealer's willingness and ability to service debt. A dealer paying only 15% of their expected EMI is in acute distress. |

**Derived signals:**
- **Payment Coverage Ratio** - Payment received / Expected EMI. Below 1.0 means underpayment; below 0.5 is a strong default signal.
- **Late Payment Count (90-day window)** - Number of late payment incidents in the last 3 months. Multiple late payments in a short window indicate a pattern, not a one-off.

---

### 5. Credit Profile

| What | Dealer classification: PREMIUM, GOOD, FAIR, HIGHRISK |
|------|------------------------------------------------------|
| Why | Not all dealers start from the same baseline. A PREMIUM dealer with DPO of 50 is behaving normally; a HIGHRISK dealer with the same DPO is already at the edge of their typical range. Profile determines baseline thresholds, sanctioned limits (15L-60L), and prior default probability (0.5%-25%). |

---

### 6. Anchor Relationship

| What | Which anchor entity the dealer is tied to (e.g., ANCHOR_A, ANCHOR_B) |
|------|----------------------------------------------------------------------|
| Why | Anchor characteristics affect dealer risk. Anchor B dealers carry ~30% higher default risk due to different supply chain dynamics. This contextual factor prevents the system from applying a one-size-fits-all model. |

---

### 7. Behavioral Anomalies

| What | Unusual metric combinations that don't fit normal patterns |
|------|-----------------------------------------------------------|
| Why | Some risk signals only emerge in combination. A dealer with steady orders but a sudden 45-day DPO jump may be diverting cash flow. Payments arriving but zero orders may indicate non-anchor activity. These anomalies are hard to catch with individual thresholds alone. |

---

## Why These Specific Metrics?

### What I included — and the reasoning

| Metric | Leading or Lagging | Signal Strength | Rationale |
|--------|-------------------|-----------------|-----------|
| DPO | Leading | Very High | Changes weeks/months before formal default |
| DPO Velocity | Leading | High | Catches sudden deterioration that absolute DPO misses |
| Utilization | Leading | High | Shows financial headroom (or lack of it) |
| Order Decline | Leading | Medium-High | Business health proxy; precedes payment stress |
| Order Volatility | Leading | Medium | Unstable cash flow = unstable repayment |
| Payment Coverage | Leading | High | Direct measure of debt service ability |
| Late Payment Count | Lagging (near-term) | High | Confirms emerging pattern within 90-day window |
| Credit Profile | Static context | Medium | Sets appropriate baselines per dealer segment |
| Anchor ID | Static context | Low-Medium | Adjusts for supply chain risk factors |

### What I excluded — and why

- **External credit bureau scores** - Not available in the synthetic data scope; would be a future addition for live deployment.
- **Industry/sector codes** - All dealers operate within the same NBFC supply chain finance context, so sector doesn't differentiate.
- **Macroeconomic indicators** - Useful for portfolio-level stress testing but too noisy for individual dealer prediction at the 30-day horizon.
- **Social/unstructured data** - News, social media sentiment, etc. High noise-to-signal ratio for this use case.

---

## How Data Points Combine

No single metric determines risk. The system uses a **weighted logistic formula** that combines all dimensions:

```
Base logit = -3.0
  + DPO proximity to 90-day threshold    (weight: 0–4.0)
  + DPO velocity                         (weight: 0–1.5)
  + Payment coverage shortfall           (weight: 0–2.0)
  + Order decline (seasonal-adjusted)    (weight: 0–1.2)
  + Utilization pressure                 (weight: 0–0.8)
  + Late payment pattern                 (weight: 0–1.0)
→ Sigmoid function → 30-day default probability (0–100%)
```

DPO proximity carries the highest weight because it's closest to the regulatory definition of default. Payment coverage is second because it directly measures repayment ability. Order decline and utilization provide early warning before payment stress manifests.

---

## Tier Classification

These data points map to four risk tiers (HEALTHY / WATCH / AT_RISK / CRITICAL) via deterministic thresholds. Any single CRITICAL signal triggers CRITICAL tier immediately. The system optimizes for **high recall** over precision, because missing a real default is far more costly than investigating a false alarm.

For the complete threshold table, scoring weights, and escalation rules, see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md).

---

## Related Documentation

- [DATA_MODEL.md](DATA_MODEL.md) - Detailed schema and field definitions
- [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md) - Full tier threshold rules and escalation triggers
- [METHODOLOGY.md](METHODOLOGY.md) - AI vs. deterministic decision matrix
- [FALSE_POSITIVES.md](FALSE_POSITIVES.md) - Precision/recall trade-off framework
