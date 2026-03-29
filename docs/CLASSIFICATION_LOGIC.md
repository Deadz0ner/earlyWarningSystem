# Risk Classification Logic

## Four-Tier Risk System

The system classifies dealers into 4 risk tiers based on deterministic thresholds and signal aggregation.

---

## Tier Definitions & Thresholds

### 🟢 HEALTHY (Tier 1)
**Status:** Normal operations. Dealer is managing finances well.

**Criteria (ALL must be true):**
- DPO: ≤ 50 days
- Utilization: < 80%
- Late Payments (90d window): 0 incidents
- Order Trend: Stable or growing (< 10% decline, seasonal-adjusted)
- Order Volatility: < 15%
- DPO Velocity: < 10d month-over-month
- Payment Coverage: > 70% of EMI

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
- DPO Velocity: +2d ✓
- Payment Coverage: 100% ✓
→ HEALTHY
```

---

### 🟡 WATCH (Tier 2)
**Status:** Early warning signs. Dealer is manageable but requires attention.

**Criteria (1–2 signals at WATCH level, no CRITICAL signals):**
- DPO: 65–89 days (creeping above baseline)
- Utilization: 80–90% (rising leverage)
- Late Payments (90d window): 1–2 incidents
- Order Trend: Mild decline (10–20%, seasonal-adjusted)
- Order Volatility: 15–25% (moderate inconsistency)
- DPO Velocity: 10–19d month-over-month jump
- Payment Coverage: 30–70% of EMI

**Tier Score:** 25+

**Action:** Weekly monitoring, ops review recommended

**Example:**
```
Dealer_023 (GOOD)
- DPO: 58 days ✓
- Utilization: 74% ✓
- Late Payments: 0 ✓
- Orders: ↓ 12% ⚠️ (seasonal-adjusted)
- Volatility: 18% ⚠️
- DPO Velocity: +12d ⚠️
- Payment Coverage: 65% ⚠️
→ WATCH (score = 15 + 15 + 20 + 20 = 70... but no CRITICAL signal, score ≥ 25)
```

---

### 🟠 AT RISK (Tier 3)
**Status:** Multiple concerning indicators. Intervention recommended.

**Criteria (multiple WATCH signals accumulating to score ≥ 60, no CRITICAL signals):**
- DPO: 65–89 days (approaching critical zone)
- Utilization: 80–90% (high leverage)
- Late Payments (90d window): 1–2 incidents
- Order Trend: Moderate decline (20–40%, seasonal-adjusted)
- Order Volatility: 15–25%
- DPO Velocity: 10–19d month-over-month
- Payment Coverage: 30–70% of EMI

**Tier Score:** 60+

**Action:** Immediate ops review, dealer contact recommended

**Example:**
```
Dealer_045 (FAIR)
- DPO: 75 days ⚠️ (+40)
- Utilization: 85% ⚠️ (+30)
- Late Payments: 1 ⚠️ (+20)
- Orders: ↓ 15% ⚠️ (+25)
- Volatility: 20% ⚠️ (+15)
→ AT RISK (score = 130, no single CRITICAL signal)
```

---

### 🔴 CRITICAL (Tier 4)
**Status:** Imminent or actual default. Collection procedures initiated.

**Criteria (ANY single CRITICAL signal triggers this tier):**
- DPO: ≥ 90 days ← **DEFINITION OF DEFAULT**
- Utilization: > 90% (maxed out)
- Late Payments (90d window): 3+ incidents
- Order Trend: Severe decline (> 40%, seasonal-adjusted)
- Order Volatility: > 25% (erratic, loss of control)
- DPO Velocity: ≥ 20d month-over-month jump (emergency signal)
- Payment Coverage: < 30% of EMI

**Tier Score:** 100+

**Action:** Immediate intervention, collection, possible write-off

**Example:**
```
Dealer_042 (HIGHRISK)
- DPO: 95 days 🔴 (+100)
- Utilization: 94% 🔴 (+80)
- Late Payments: 3 🔴 (+70)
- Orders: ↓ 50% 🔴 (+60)
- Volatility: 32% 🔴 (+30)
- DPO Velocity: +22d 🔴 (+50)
- Payment Coverage: 0% 🔴 (+60)
→ CRITICAL (multiple CRITICAL signals, score = 450)
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
| >25% | Critical | Erratic pattern; dealer struggling to manage working capital or in distress |

*Note: Volatility is calculated on seasonal-adjusted order values (each month's orders divided by its seasonal factor) to avoid penalizing natural Q1/Q4 swings.*

---

## Scoring & Ranking

### Tier Score Calculation

Each dealer is assigned a **tier score** based on which signals fire. The score is the sum of all triggered signal weights:

```
Signal Weights (from riskEngine.js):

DPO:
  CRITICAL (≥90d)      → +100
  WATCH (65-89d)        → +40

Utilization:
  CRITICAL (>90%)       → +80
  WATCH (80-90%)        → +30

Late Payments (90d):
  CRITICAL (3+)         → +70
  WATCH (1-2)           → +20

Order Trend (seasonal-adjusted):
  CRITICAL (>40% decline) → +60
  AT_RISK (20-40%)        → +15  (note: unique intermediate level)
  WATCH (10-20%)          → +25

Order Volatility:
  CRITICAL (>25%)       → +30
  WATCH (15-25%)        → +15

DPO Velocity (month-over-month):
  CRITICAL (≥20d jump)  → +50
  WATCH (10-19d jump)   → +20

Payment Coverage (vs EMI):
  CRITICAL (<30%)       → +60
  WATCH (30-70%)        → +20
```

**Tier Assignment Rules:**
- Any single CRITICAL signal → **CRITICAL** tier (regardless of total score)
- Score ≥ 60 → **AT RISK**
- Score ≥ 25 → **WATCH**
- Otherwise → **HEALTHY**

**Confidence adjustment:** If data confidence < 0.5 (fewer than 3 months of history), the tier score is scaled down by the confidence factor to avoid over-flagging new dealers.

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
| **DPO ≥ 90 days** | Direct to CRITICAL | DPO hits 90+ → CRITICAL (RBI NPA definition) |
| **DPO Jump ≥ 20 days** | Direct to CRITICAL | DPO 55→78 in one month → CRITICAL (dpoVelocity signal) |
| **DPO Jump 10–19 days** | WATCH-level signal (+20) | DPO 50→62 in one month → contributes to score |
| **Payment Coverage < 30%** | Direct to CRITICAL | Paying < 30% of EMI → CRITICAL |
| **Late Payments 3+** | Direct to CRITICAL | 3+ late incidents in 90d → CRITICAL |
| **Order Decline > 40%** | Direct to CRITICAL | Seasonal-adjusted orders collapse → CRITICAL |
| **Utilization > 90%** | Direct to CRITICAL | Maxed out credit → CRITICAL |
| **Order Volatility > 25%** | Direct to CRITICAL | Erratic order patterns → CRITICAL |

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
function classifyDealerTier(metrics) {
  // 1. Evaluate each of the 7 signals independently
  const signals = {
    dpo: null,           // Days Payable Outstanding
    utilization: null,    // Loan utilization rate
    latePayments: null,   // Late payment count (90d)
    orderTrend: null,     // Seasonal-adjusted order decline
    volatility: null,     // Order volatility (CV)
    dpoVelocity: null,    // Month-over-month DPO change
    paymentCoverage: null  // Payment received vs expected EMI
  };

  // 2. Each signal adds to tierScore based on severity
  let tierScore = 0;
  // e.g., if DPO >= 90: signals.dpo = "CRITICAL", tierScore += 100
  // e.g., if utilization >= 0.9: signals.utilization = "CRITICAL", tierScore += 80

  // 3. Confidence adjustment for sparse data
  if (metrics.confidence < 0.5) {
    tierScore = Math.round(tierScore * metrics.confidence);
  }

  // 4. Any single CRITICAL signal → CRITICAL tier
  if (signals.dpo === 'CRITICAL' || signals.utilization === 'CRITICAL' ||
      signals.latePayments === 'CRITICAL' || signals.orderTrend === 'CRITICAL' ||
      signals.dpoVelocity === 'CRITICAL' || signals.paymentCoverage === 'CRITICAL') {
    tier = 'CRITICAL';
  } else if (tierScore >= 60) {
    tier = 'AT_RISK';
  } else if (tierScore >= 25) {
    tier = 'WATCH';
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

| Metric | Healthy | Watch | Critical |
|--------|---------|-------|----------|
| **DPO (days)** | ≤50 | 65–89 | ≥90 |
| **Utilization** | <80% | 80–90% | >90% |
| **Late Payments (90d)** | 0 | 1–2 | 3+ |
| **Order Decline (seasonal-adj)** | <10% | 10–40% | >40% |
| **Volatility (seasonal-adj)** | <15% | 15–25% | >25% |
| **DPO Velocity (MoM)** | <10d | 10–19d | ≥20d |
| **Payment Coverage (vs EMI)** | >70% | 30–70% | <30% |
| **Action** | Monitor Quarterly | Monitor Weekly | Collection |

*Note: AT RISK tier is determined by accumulated score (≥60) from multiple WATCH-level signals, not by its own threshold band. Any single CRITICAL signal bypasses scoring and assigns CRITICAL tier directly.*

---

## Next Steps (With More Data)

1. **Calibrate by Anchor:** Run analysis separately for Anchor A vs. B; adjust thresholds if needed
2. **Build Default History:** Collect actual defaults over 6–12 months; retrain thresholds based on precision/recall
3. **Introduce Lookback Windows:** "Has dealer ever breached this threshold before?" (behavioral risk)
4. **Cascade Anchor Risk:** If anchor fails, all its dealers inherit elevated risk (correlation modeling)
5. **Forecast Default Probability:** With 6+ months of data + actual defaults, build logistic regression model
