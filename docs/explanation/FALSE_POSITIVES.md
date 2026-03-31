# False Positives & Measurement

## Definitions

- **False Positive (FP):** A dealer flagged as at-risk who does NOT default within 30 days.
- **Precision:** Of all flagged dealers, what % actually defaulted? `TP / (TP + FP)`
- **Recall:** Of all dealers who actually defaulted, what % did I flag? `TP / (TP + FN)`

---

## The Trade-off

I optimize for **high recall over precision**.
I might mark more dealers false positive compared to letting the defaults not marked. The cost of missing a real default (₹12L+ loss per dealer) far exceeds the cost of reviewing a false positive (30 min of ops time). It's better to flag 15 dealers to catch 3 real defaults than to miss even one.

---

## How I'd Measure It

### Setup (Day 0)

Run risk analysis on the full portfolio. Capture every flagged dealer with their tier and score.

### Tracking (Over 30 Days)

For each flagged dealer, track: Did DPO improve or worsen? Any new late payments? Did they recover or escalate?

### Classification (Day 30)

- **True Positive:** Flagged and defaulted (DPO ≥ 90d or payment missed 2+ months)
- **False Positive:** Flagged but recovered (DPO returned to < 60d)
- **False Negative:** Not flagged but defaulted

### Expected Numbers

With 100 dealers and ~2-5 synthetic defaults:

| Metric          | Expected               |
| --------------- | ---------------------- |
| Flagged dealers | ~23                    |
| Actual defaults | ~2-3                   |
| True Positives  | 2-3 (caught them)      |
| False Positives | ~20 (flagged but fine) |
| Precision       | ~10-13%                |
| Recall          | ~100%                  |

This looks low on precision, but the ROI math works out: 20 false positive reviews cost ~10 hours of ops time. Preventing even 1 default saves ₹12L+. That's a 7000x+ return.

---

## Targets

| Metric        | Target |
| ------------- | ------ |
| **Recall**    | ≥ 70%  |
| **Precision** | ≥ 25%  |

---

## Interpreting Results

**Low precision, high recall (e.g., precision 15%, recall 100%):** Acceptable. I'm catching all defaults, ops handles the extra reviews.

**High precision, low recall (e.g., precision 70%, recall 78%):** Needs work. I'm missing defaults — lower DPO thresholds to flag earlier.

**Both low:** Thresholds are miscalibrated. Review the DPO/utilization/orders weights.

---

## Refinement Strategy

### If Precision Is Too Low (< 25%)

Flagging too many healthy dealers.

1. Raise DPO thresholds (Watch: 65d → 70d)
2. Increase order decline thresholds
3. Reduce volatility weight
4. Add "debounce" — require 2 consecutive months above threshold before escalating
5. Review signal interaction score boosts — the interaction escalation layer adds bonus points when signals co-occur (e.g., +25 for utilization + order stress); if this is pushing too many dealers from WATCH to AT_RISK, reduce the boost values

### If Recall Is Too Low (< 70%)

Missing real defaults.

1. Lower DPO thresholds (Watch: 65d → 60d)
2. Track DPO worsening trend (> 5d/month → flag earlier)
3. Reduce late payment threshold
4. Consider segment-specific thresholds:
   - Anchor A → more conservative (better credit quality)
   - Anchor B → more aggressive (higher volatility)
   - PREMIUM profile → higher thresholds (rarely default)
   - HIGHRISK profile → lower thresholds (catch early)

---

## Edge Cases

**Dealer pays after being flagged:** Flagged as AT_RISK, makes a big payment, DPO drops. Classified as FP, but the flag may have prompted the payment — a "successful flag."

**Missing payment data:** Flagged as WATCH but payment data arrived late. Actual DPO was higher than thought. Mark as data quality issue, improve the pipeline.

**Ops never calls:** System correctly flagged a dealer, but ops didn't follow up and the dealer defaulted. System worked; operational failure, not a system failure.

---

## Long-Term Plan

- **Month 1-3:** Run as-is, collect real precision/recall data, no threshold changes yet
- **Month 3-6:** Tune thresholds based on actual results, test segment-specific thresholds
- **Month 6-12:** Build anchor/profile-specific thresholds, add new metrics if available
- **Month 12+:** If enough real defaults exist, train ML model and compare against deterministic approach

After the first 30 days of live data, I'll have real numbers and can start refining. The framework above gives me the tools to measure and improve continuously.
