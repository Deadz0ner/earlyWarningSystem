# False Positives & Measurement Framework

## Definition

**False Positive (FP):** A dealer flagged as at-risk (CRITICAL, AT_RISK, or WATCH) who does NOT default within the next 30 days.

**Positive Predictive Value (Precision):** Of all flagged dealers, what % actually defaulted?
```
Precision = True Positives / (True Positives + False Positives)
```

**Sensitivity (Recall):** Of all dealers who defaulted, what % did we flag?
```
Recall = True Positives / (True Positives + False Negatives)
```

---

## Why False Positives Matter

### Cost of False Positives
- **Ops team burden:** Time spent contacting/reviewing healthy dealers
- **Relationship damage:** Calling a dealer to discuss default risk when they're healthy erodes trust
- **Budget constraint:** Outreach resources are limited; false positives waste them
- **Reputational risk:** If dealer learns they were "flagged for no reason," they may lose confidence in NBFC

### Cost of False Negatives (Missing Real Defaults)
- **Financial loss:** Missed opportunity to intervene; loan goes bad
- **Regulatory impact:** RBI expects early warning systems to catch defaults
- **Portfolio damage:** Cascading defaults (if Anchor A dealer fails, peers under stress)

### Trade-off
```
Higher precision → Miss some real defaults → Higher financial risk
Lower precision → More false positives → Ops team overload → Missed real defaults anyway

Solution: Target HIGH RECALL + acceptable precision
```

---

## Measurement Plan

### Phase 1: Establish Baseline (First 30 Days)

**Setup:**
1. Run risk analysis on full portfolio at Day 0 (today)
2. Capture all flagged dealers (CRITICAL, AT_RISK, WATCH)
3. Log tier and score for each

**Tracking (Daily):**
- Monitor payment status of all 100 dealers
- For each flagged dealer, record:
  - Did they make a payment this week?
  - Has DPO improved, stayed same, or worsened?
  - Any new late payments?
  - Status change (recovered, escalated, defaulted)?

**End of Period (Day 30):**
Classify each flagged dealer:
- **True Positive (TP):** Flagged + defaulted (DPO ≥ 90d or payment missed 2+ months)
- **False Positive (FP):** Flagged + recovered (DPO returned to <60d for 2 weeks)
- **Still At Risk:** Flagged + still deteriorating but not yet defaulted (escalate to next phase)

### Example Tracking Sheet

| Dealer | Day 0 Tier | Day 0 DPO | Day 15 DPO | Day 30 DPO | Outcome | TP/FP |
|--------|-----------|-----------|------------|------------|---------|-------|
| 042 | CRITICAL | 95d | 98d | 105d | Default | ✅ TP |
| 071 | CRITICAL | 88d | 92d | 95d | Default | ✅ TP |
| 089 | AT_RISK | 82d | 80d | 78d | Recovered | ❌ FP |
| 043 | AT_RISK | 75d | 76d | 77d | Still Risk | TBD |
| 021 | WATCH | 58d | 56d | 52d | Recovered | ❌ FP |
| ... | ... | ... | ... | ... | ... | ... |

---

## Expected Outcomes

### Conservative Estimate (Based on Synthetic Data)

With 100 dealers and 2–3 synthetic defaults:

```
Total Dealers Analyzed:     100
Flagged (any tier):          23
     - CRITICAL:              5
     - AT_RISK:               8
     - WATCH:                10
     - HEALTHY:              77

Expected Defaults (30d):     2–3
Expected TP:                 2–3 (flagged + defaulted)
Expected FP:                20–21 (flagged but recovered)

Precision = 2 / 23 = 8.7%
Recall = 2 / 2 = 100%
```

### Acceptable Thresholds
- **Recall ≥ 70%:** Catch most real defaults (can't be perfect without full info)
- **Precision ≥ 30%:** 1 in 3 flagged dealers is real risk (operators handle this)

---

## Interpreting Results

### Scenario A: Low Precision, High Recall
```
Precision: 15% (flagged 20, caught 3 real defaults)
Recall: 100% (caught all defaults)
Status: ✅ ACCEPTABLE
Action: Keep current thresholds; ops team manages 17 false positives
```

### Scenario B: High Precision, Low Recall
```
Precision: 70% (flagged 10, caught 7 real defaults)
Recall: 78% (missed 2 defaults)
Status: ⚠️ NEEDS IMPROVEMENT
Action: Lower DPO thresholds (flag earlier); aim for higher recall
```

### Scenario C: Low Precision, Low Recall
```
Precision: 12% (flagged 25, caught 3 real defaults)
Recall: 60% (missed 2 defaults)
Status: ❌ BOTH POOR
Action: Thresholds miscalibrated; review DPO/utilization/orders weights
```

---

## Refinement Strategy

### If Precision Too Low (<25%)

**Symptom:** Flagging 15+ dealers per 30-day period but only 2–3 actually default

**Root Cause Options:**
1. Threshold too aggressive (DPO 65d for Watch is too low)
2. Order decline threshold too strict
3. Volatility signal too sensitive

**Fix (in order of impact):**
1. Increase DPO thresholds:
   - Watch: 65d → 70d
   - At Risk: 75d → 80d
   - Critical: 90d → 90d (keep for RBI compliance)

2. Increase order decline threshold:
   - Watch: 10–20% → 15–25%
   - At Risk: 20–40% → 30–50%

3. Reduce volatility weight (currently worth 10 points, reduce to 5)

4. Require 2 consecutive months above threshold (add "debounce" logic)

### If Recall Too Low (<70%)

**Symptom:** Missing defaults; dealers default even though not flagged

**Root Cause Options:**
1. Thresholds too conservative
2. Missing important metric (e.g., inventory turnover)
3. Dealers defaulted very suddenly (no 30-day warning)

**Fix (in order of impact):**
1. Lower DPO thresholds:
   - Watch: 65d → 60d
   - At Risk: 75d → 70d

2. Add payment consistency metric:
   - Track: "Is this dealer's DPO getting worse each month?"
   - If trend(DPO) > 5d/month, flag earlier

3. Reduce late payment incident threshold:
   - Watch: 1 late → 1+ late (any late payment)

4. Add cash conversion cycle metric (if available):
   - Longer cycle = more working capital stress

### Segment-Specific Thresholds

If precision/recall differs by anchor or profile:

```
Anchor A (Better Credit) → More conservative thresholds
Anchor B (Volatile)      → More aggressive thresholds

Profile: PREMIUM   → Higher thresholds (rarely default)
Profile: HIGHRISK  → Lower thresholds (frequently default)
```

---

## Monitoring Dashboard

### Metric to Track Weekly

```
┌──────────────────────────────────────────────┐
│       Risk Assessment Metrics (Weekly)        │
├──────────────────────────────────────────────┤
│                                              │
│ Week 1:                                      │
│   Flagged Dealers:           10              │
│   Defaults (Confirmed):       0              │
│   Recovered:                  1              │
│   Still At Risk:              9              │
│   Precision YTD:             N/A             │
│   Recall YTD:                N/A             │
│                                              │
│ Week 2:                                      │
│   Flagged Dealers:           12 (+2)         │
│   Defaults (Confirmed):       1              │
│   Recovered:                  2              │
│   Still At Risk:             10              │
│   Precision YTD:           1/12 = 8%         │
│   Recall YTD:               1/2 = 50%        │
│                                              │
│ Week 3:                                      │
│   Flagged Dealers:           14 (+2)         │
│   Defaults (Confirmed):       2 (+1)         │
│   Recovered:                  3 (+1)         │
│   Still At Risk:             10              │
│   Precision YTD:           2/14 = 14%        │
│   Recall YTD:               2/3 = 67%        │
│                                              │
│ Week 4:                                      │
│   Flagged Dealers:           16 (+2)         │
│   Defaults (Confirmed):       3 (+1)         │
│   Recovered:                  4 (+1)         │
│   Still At Risk:             10              │
│   Precision YTD:           3/16 = 19%        │
│   Recall YTD:               3/4 = 75%        │
│                                              │
│ ✅ TARGET MET: Recall ≥ 70%, Precision ≥ 15%
│                                              │
└──────────────────────────────────────────────┘
```

---

## Handling Edge Cases

### Case 1: Dealer Pays, DPO Improves, But Still Flagged
```
Dealer_089:
Day 0:  Flagged as AT_RISK (DPO 82d)
Day 15: Makes large payment, DPO drops to 45d
Day 30: Status = RECOVERED

Classification: False Positive ✓

Lesson: Dealer had stress but recovered via payment.
System correctly identified stress (TP), but didn't default (FP classification ok).
This is a "successful flag" – dealer paid because we called them.
```

### Case 2: Dealer Flagged, No Payment Data Available
```
Dealer_056:
Day 0:  Flagged as WATCH (DPO 58d)
Day 20: Payment data becomes available late
Day 30: DPO was actually 75d (At Risk, not Watch)

Classification: Unclear

Decision: Mark as "data error, review manually"
→ Improve data pipeline to catch missing payments earlier
```

### Case 3: System Flags, Ops Never Call, Dealer Defaults
```
Dealer_034:
Day 0:  Flagged as WATCH
Day 30: Defaulted

Did system work?
→ YES. We flagged correctly (TP).
→ Ops didn't follow up (operational failure, not system failure).

Lesson: System works; ops needs training/resources to act on flags.
```

---

## Cost-Benefit Analysis

### Scenario: System Flags 15 Dealers, Prevents 2 Defaults

**Cost of False Positives:**
- 13 dealers × 30 min call/review = 6.5 hours ops time
- At ₹500/hour loaded cost = ₹3,250

**Benefit of True Positives:**
- 2 defaults prevented
- Average loan size: ₹40L (₹40,00,000)
- Default recovery rate: 70% (recover ₹28L per default, lose ₹12L)
- Loss prevented: 2 × ₹12L = ₹24L

**ROI:**
```
Benefit = ₹24L (recovered via intervention)
Cost = ₹3,250 (ops time for false positives)
ROI = ₹24L / ₹3,250 = 7,385x
```

Even with 50% false positives, ROI is massive. **System pays for itself many times over.**

---

## Long-Term Refinement

### Month 1–3: Establish Baseline
- Run system as-is
- Track precision/recall
- No threshold changes
- Gather feedback from ops team

### Month 3–6: Threshold Tuning
- Adjust thresholds based on initial results
- A/B test (run two configs, compare)
- Reduce false positives while maintaining recall

### Month 6–12: Segmentation
- Build anchor-specific thresholds
- Build profile-specific thresholds
- Add new metrics (if data available)

### Month 12+: ML Model
- Collect 6–12 months of real defaults
- Retrain logistic regression on real data
- Validate precision/recall
- Keep SHAP explanations for interpretability

---

## Success Criteria

| Metric | Target | Success? |
|--------|--------|----------|
| **Recall (catch real defaults)** | ≥ 70% | Yes if TP / (TP + FN) ≥ 70% |
| **Precision (reduce false alarms)** | ≥ 25% | Yes if TP / (TP + FP) ≥ 25% |
| **Ops satisfaction** | ≥ 4/5 | Track in surveys |
| **Time saved (vs manual review)** | ≥ 10h/week | Compare to prior workflow |
| **Cost per prevented default** | ≤ ₹50K | (Ops cost) / (defaults prevented) |

---

## Conclusion

The system is designed with **high recall prioritized over precision**. Ops teams expect to review some false positives; the cost of missing a default far exceeds the cost of reviewing a healthy dealer.

After the first 30 days of live data, we'll have real precision/recall numbers and can refine thresholds accordingly. The framework above provides the tools to measure and improve continuously.
