# Risk Classification Logic

## Four-Tier Risk System

The system classifies dealers into 4 risk tiers based on deterministic thresholds and signal aggregation.

---

## Tier Definitions & Thresholds

### 🟢 HEALTHY (Tier 1)
**Status:** Normal operations. Dealer is managing finances well.

**Criteria (ALL must be true):**
- DPO: ≤ 50 days
- Utilization: < 70%
- Late Payments (90d window): 0 incidents
- Order Trend: Stable or growing (±10%)
- Order Volatility: < 15%

**Tier Score:** 5

**Action:** Quarterly monitoring

**Example:**
```
Dealer_002 (PREMIUM)
- DPO: 32 days ✓
- Utilization: 62% ✓
- Late Payments: 0 ✓
- Orders: ↑ 5% ✓
- Volatility: 8% ✓
→ HEALTHY
```

---

### 🟡 WATCH (Tier 2)
**Status:** Early warning signs. Dealer is manageable but requires attention.

**Criteria (1–2 signals present):**
- DPO: 51–65 days (creeping above baseline)
- Utilization: 70–80% (rising leverage)
- Late Payments (90d window): 1 incident
- Order Trend: Mild decline (10–20%)
- Order Volatility: 15–25% (moderate inconsistency)

**Tier Score:** 25

**Action:** Weekly monitoring, ops review recommended

**Example:**
```
Dealer_023 (GOOD)
- DPO: 58 days ⚠️
- Utilization: 74% ⚠️
- Late Payments: 0 ✓
- Orders: ↓ 12% ⚠️
- Volatility: 18% ⚠️
→ WATCH (3 signals)
```

---

### 🟠 AT RISK (Tier 3)
**Status:** Multiple concerning indicators. Intervention recommended.

**Criteria (2+ signals present):**
- DPO: 66–89 days (approaching critical zone)
- Utilization: 80–90% (high leverage)
- Late Payments (90d window): 2+ incidents
- Order Trend: Significant decline (20–40%)
- Order Volatility: 25–40% (high inconsistency)

**Tier Score:** 60

**Action:** Immediate ops review, dealer contact recommended

**Example:**
```
Dealer_045 (FAIR)
- DPO: 75 days ⚠️⚠️
- Utilization: 85% ⚠️⚠️
- Late Payments: 2 ⚠️⚠️
- Orders: ↓ 25% ⚠️⚠️
- Volatility: 32% ⚠️⚠️
→ AT RISK (all signals present)
```

---

### 🔴 CRITICAL (Tier 4)
**Status:** Imminent or actual default. Collection procedures initiated.

**Criteria (1+ critical signal):**
- DPO: ≥ 90 days ← **DEFINITION OF DEFAULT**
- Utilization: > 90% (maxed out)
- Late Payments (90d window): 3+ incidents
- Order Trend: Severe decline (> 40%) or near-zero
- Order Volatility: > 40% (erratic, loss of control)

**Tier Score:** 100

**Action:** Immediate intervention, collection, possible write-off

**Example:**
```
Dealer_042 (HIGHRISK)
- DPO: 95 days 🔴🔴🔴
- Utilization: 94% 🔴🔴🔴
- Late Payments: 3 🔴🔴🔴
- Orders: ↓ 50% 🔴🔴🔴
- Volatility: 48% 🔴🔴🔴
→ CRITICAL (all signals critical)
```

---

## Threshold Justification

### DPO Thresholds

| Threshold | Reasoning |
|-----------|-----------|
| **50 days (Healthy)** | Industry norm for working capital loans; dealer is within normal payment cycle |
| **65 days (Watch)** | 30% over baseline; payment stress emerging |
| **90 days (Critical)** | 2–3 months overdue; regulatory definition of default for NBFCs |

*Reference: RBI guidelines classify 90+ dpd as NPA (Non-Performing Asset)*

---

### Utilization Thresholds

| Threshold | Reasoning |
|-----------|-----------|
| **70% (Watch)** | Dealer is using majority of available credit; reduced flexibility for emergencies |
| **80% (At Risk)** | Dealer is highly leveraged; any stress forces default or restructuring |
| **90% (Critical)** | Dealer has exhausted credit; unable to manage further business needs |

---

### Late Payment Incident Thresholds

| Count | Tier | Reasoning |
|-------|------|-----------|
| 0 | Healthy | Dealer is reliable payer |
| 1 | Watch | Single incident; could be administrative error or minor stress |
| 2 | At Risk | Pattern emerging; suggests ongoing cash flow issues |
| 3+ | Critical | Systemic problem; dealer cannot pay consistently |

---

### Order Decline Thresholds

| Decline | Tier | Reasoning |
|---------|------|-----------|
| 0–10% | Healthy | Normal monthly variation, seasonality |
| 10–20% | Watch | Noticeable decline; losing customers or cutting inventory |
| 20–40% | At Risk | Significant business shrinkage; major demand loss |
| >40% | Critical | Business collapse; dealer may be closing or pivoting channels |

---

### Order Volatility Thresholds

| Volatility (CV) | Tier | Reasoning |
|-----------------|------|-----------|
| <15% | Healthy | Consistent orders; dealer has stable customer base |
| 15–25% | Watch | Moderate swings; dealer may be facing demand uncertainty |
| 25–40% | At Risk | High swings; dealer struggling to manage working capital |
| >40% | Critical | Erratic pattern; dealer in distress, lost control |

---

## Scoring & Ranking

### Tier Score Calculation

Each dealer is assigned a **tier score** (0–100) based on signal presence:

```
Tier Score = Base_Score_for_Tier + Signal_Bonuses

Where:
- DPO signal present → +30 (if critical: +50)
- Utilization signal present → +25 (if critical: +40)
- Late Payment signal present → +20 (if critical: +35)
- Order Decline signal present → +20 (if critical: +35)
- Order Volatility signal present → +10 (if critical: +20)
```

**Score Ranges:**
- 0–10: HEALTHY (score 5)
- 11–40: WATCH (score 25)
- 41–80: AT RISK (score 60)
- 81–100: CRITICAL (score 100)

### Top 10 Ranking

Dealers are ranked by tier score (descending), then by analysis timestamp (most recent first):

```
1. Dealer_042 (CRITICAL, Score 95)
2. Dealer_071 (CRITICAL, Score 92)
3. Dealer_089 (AT RISK, Score 78)
4. Dealer_043 (AT RISK, Score 72)
...
```

---

## Movement Triggers

### Escalation Rules (Dealer Moves Up in Tier)

A dealer escalates if:

| Trigger | Effect | Example |
|---------|--------|---------|
| **New Payment Threshold Hit** | Escalate one tier immediately | DPO hits 65+ → WATCH; DPO hits 90+ → CRITICAL |
| **DPO Jump >15 days** | Escalate one tier | DPO 50→68 in one month → Watch to At Risk |
| **DPO Jump >20 days** | Escalate directly to CRITICAL | DPO 55→78 in one month → Critical |
| **2+ New Late Payments** | Escalate one tier | 0 lates → 2+ lates → escalate |
| **Order Cliff >30%** | Escalate one tier | Orders drop 35% MoM → escalate |
| **Velocity Breach** | Escalate directly to CRITICAL | DPO increasing by >10d/month × 3 months → Critical |

### De-escalation Rules (Dealer Moves Down in Tier)

A dealer de-escalates if:

| Condition | Effect | Duration |
|-----------|--------|----------|
| **All metrics in healthy range** | Descend one tier | 2 consecutive months |
| **DPO returns to baseline** | Descend one tier | 2 consecutive months <threshold |
| **Late payments cease** | Descend one tier | 3 consecutive months without late |

### Example Trajectory

```
Month 1–2:   HEALTHY (baseline)
Month 3:     DPO: 50→62, orders ↓12% → WATCH (1 signal)
Month 4–5:   DPO: 62→75, orders ↓25%, 1 late payment → AT RISK (3 signals)
Month 6:     DPO: 75→88, utilization ↑ 85%, 2 late payments → CRITICAL (4 signals)
Month 7:     DPO: 88→95 (>90d) → CRITICAL (confirmed default)
Month 8–12:  DEFAULT (90+ DPO maintained)
```

---

## Implementation (Code Logic)

The classification is implemented in `src/engine/riskEngine.js`:

```javascript
function classifyDealerTier(currentMetrics, historicalMetrics) {
  // 1. Evaluate each signal independently
  const signals = {
    dpo: evaluateDPO(currentMetrics.daysPayableOutstanding),
    utilization: evaluateUtilization(currentMetrics.utilization),
    latePayments: evaluateLatePayments(currentMetrics.latePaymentCount),
    orderTrend: evaluateOrderTrend(historicalMetrics.orderDeclinePercent),
    volatility: evaluateVolatility(historicalMetrics.orderVolatility)
  };

  // 2. Aggregate signal counts and severity
  let tier = HEALTHY;
  let tierScore = 0;

  // 3. Apply escalation rules
  if (signals.dpo === CRITICAL || signals.utilization === CRITICAL) {
    tier = CRITICAL;
  } else if (tierScore >= 60) {
    tier = AT_RISK;
  } else if (tierScore >= 25) {
    tier = WATCH;
  }

  return { tier, tierScore, signals };
}
```

---

## False Positive Scenarios

### Type 1: Seasonal False Positive
**Scenario:** Dealer in Q4 typically has high utilization (90%) due to year-end inventory build.
- **System flags:** CRITICAL (utilization >90%)
- **Reality:** Normal seasonal pattern
- **Refinement:** Learn seasonal baselines, adjust thresholds per quarter

### Type 2: External Shock (Temporary)
**Scenario:** Distributor raises prices → dealer's orders drop 25% for 2 months → recover.
- **System flags:** AT RISK (order decline 20–40%)
- **Reality:** Temporary stress, dealer recovers
- **Refinement:** Require sustained decline (3+ months) to escalate

### Type 3: Payment Delay (Not Distress)
**Scenario:** Dealer's payment cleared but arrived 15 days late (banking delay).
- **System flags:** WATCH (1 late payment incident)
- **Reality:** No financial distress
- **Refinement:** Weight recent months more heavily; ignore if isolated

### Mitigation Strategy
1. **Track precision/recall** over next 30 days (measure false positives)
2. **Adjust thresholds** if precision too low
3. **Add "debounce"** logic: require 2 consecutive months above threshold before escalating
4. **Segment thresholds** by anchor/profile (High-Risk dealers have higher baselines)

---

## Summary Table

| Metric | Healthy | Watch | At Risk | Critical |
|--------|---------|-------|---------|----------|
| **DPO (days)** | ≤50 | 51–65 | 66–89 | ≥90 |
| **Utilization** | <70% | 70–80% | 80–90% | >90% |
| **Late Payments (90d)** | 0 | 1 | 2 | 3+ |
| **Order Decline** | ±10% | 10–20% | 20–40% | >40% |
| **Volatility** | <15% | 15–25% | 25–40% | >40% |
| **Tier Score** | 5 | 25 | 60 | 100 |
| **Action** | Monitor Quarterly | Monitor Weekly | Immediate Review | Collection |

---

## Next Steps (With More Data)

1. **Calibrate by Anchor:** Run analysis separately for Anchor A vs. B; adjust thresholds if needed
2. **Build Default History:** Collect actual defaults over 6–12 months; retrain thresholds based on precision/recall
3. **Introduce Lookback Windows:** "Has dealer ever breached this threshold before?" (behavioral risk)
4. **Cascade Anchor Risk:** If anchor fails, all its dealers inherit elevated risk (correlation modeling)
5. **Forecast Default Probability:** With 6+ months of data + actual defaults, build logistic regression model
