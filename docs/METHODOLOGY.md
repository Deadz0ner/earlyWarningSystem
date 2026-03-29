# Methodology: AI vs. Deterministic Decision Matrix

This document details where and why I use AI (LLM API) versus deterministic rules in the early warning engine.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│          Dealer Risk Assessment Pipeline                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [1. Data Input] → [2. Calculate Metrics]               │
│                    ↓                                      │
│              [3. Risk Scoring]                           │
│              (70% Deterministic)                         │
│                    ↓                                      │
│        [4. Tier Classification & Ranking]               │
│             (100% Deterministic)                         │
│                    ↓                                      │
│   [5. Generate Explanations & Alerts]                   │
│   (Rule-based + 30% LLM-Enhanced)                       │
│                    ↓                                      │
│              [Output: Top 10 Dealers]                    │
│              + Explanations + Signals                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Decision Matrix

### Tier 1: **Data Input & Metric Calculation** (100% Deterministic)

| Component | Approach | Why Deterministic |
|-----------|----------|-------------------|
| DPO Calculation | Average of invoice payment dates | Observable fact; no ambiguity |
| Utilization Calculation | Balance / Sanctioned Limit | Math; fully deterministic |
| Order Trend | Month-over-month % change | Mathematical formula |
| Volatility | Std Dev of last 6 months | Statistical formula |
| Late Payment Count | Binary: paid > expected date? | Transaction-level fact |

**Rationale:** These are fundamental metrics derived directly from data. No judgment call needed.

---

### Tier 2: **Risk Thresholds & Signal Detection** (100% Deterministic)

| Signal | Detection | Rule | Why Deterministic |
|--------|-----------|------|-------------------|
| DPO High | `daysPayableOutstanding >= 90` | Hard threshold | RBI compliance definition |
| Utilization High | `utilization > 0.90` | Hard threshold | Accounting standard |
| Late Payments | `count >= 3` (in 90d) | Hard threshold | Objective transaction count |
| Order Decline | `seasonalAdjustedDecline > 0.40` | Hard threshold | Clear business contraction |
| Volatility High | `volatility_coeff > 0.25` | Hard threshold | Statistical threshold |
| DPO Velocity | `dpoVelocity >= 20` (MoM) | Hard threshold | Rapid deterioration signal |
| Payment Coverage | `paymentCoverage < 0.30` | Hard threshold | Direct EMI underpayment |

**Rationale:** Threshold-based classification is:
- ✅ Transparent (ops teams understand "if DPO > 90d, then critical")
- ✅ Auditable (can verify in data)
- ✅ Consistent (same input → same output)
- ✅ Reproducible (no randomness)
- ✅ Compliant (aligns with regulatory definitions)

---

### Tier 3: **Tier Assignment & Ranking** (100% Deterministic)

| Step | Method | Why Deterministic |
|------|--------|-------------------|
| Count Signals | Tally which thresholds breached | Math |
| Assign Tier | Mapping: (signal count, severity) → tier | Lookup table |
| Score Tier | Weighted sum of signal counts | Formula |
| Rank Dealers | Sort by score (descending) | Sorting algorithm |

**Example:**
```javascript
tierScore = 0;
if (dpo >= 90) tierScore += 50;        // Critical
if (utilization >= 0.90) tierScore += 40;  // Critical
if (latePayments >= 3) tierScore += 35;    // Critical
// ... etc
// Result: transparent, reproducible score
```

**Rationale:** Ranking must be deterministic so:
- Operators can dispute/override specific thresholds
- System behaves consistently day-to-day
- Results are auditable for compliance

---

### Tier 4: **Explanation Generation** (30% AI-Enhanced)

#### 4A. Deterministic Explanation Template (70%)

**Method:** Rule-based text generation from signal states.

```javascript
function generateExplanation(assessment) {
  let text = [];

  if (assessment.tier === "CRITICAL") {
    text.push("⚠️ CRITICAL: Dealer is showing severe distress.");
  }

  if (signals.dpo === "CRITICAL") {
    text.push(`• Payment delay: DPO is ${dpo} days (threshold: 90d)`);
  }

  if (signals.orderTrend === "CRITICAL") {
    text.push(`• Orders collapsed: ${decline.toFixed(1)}% decline`);
  }

  return text.join(" ");
}
```

**Output Example:**
```
"⚠️ CRITICAL: Dealer_042 is showing severe distress signals.
• Payment delay: DPO is 95 days (threshold: 90d).
• High leverage: Utilization is 92.0% (critical: >90%).
• Business collapse: Orders have dropped 45.0%."
```

**Why Deterministic:** Creates consistent, fact-based baseline explanation ops teams can verify.

---

#### 4B. LLM-Enhanced Narrative (30%) ⭐ **Active**

**Method:** LLM API call to synthesize dry facts into actionable context.

**Prompt Template** (from `src/api/server.js`):
```
You are a financial risk analyst for an NBFC (non-banking financial company).
Analyze this dealer's financial signals and provide a brief, actionable explanation for ops teams.

Dealer: Dealer_042
Profile: HIGHRISK
Sanctioned Limit: ₹3.2L
30-Day Default Probability: 87.2%

Current Metrics:
- Days Payable Outstanding: 95 days
- DPO Velocity (month-over-month): +22 days
- Loan Utilization: 91.9%
- Recent Order Value: ₹42000
- Payments This Month: ₹0
- Payment Coverage (vs EMI): 0%
- Order Decline (seasonal-adjusted): 45.0%

Risk Signals:
- DPO Status: CRITICAL
- DPO Velocity: CRITICAL
- Utilization Status: CRITICAL
- Late Payment Status: CRITICAL
- Payment Coverage: CRITICAL
- Order Trend: CRITICAL
- Order Volatility: CRITICAL

Provide a 2-3 sentence explanation suitable for an operations team deciding whether to call this dealer.
Focus on the most critical signals and what they mean together (not separately).
End with a recommended action.
```

**Example LLM Output:**
```
"Dealer_042 has hit critical distress: DPO overdue by 5+ days (default threshold), loan maxed at 92%,
orders collapsed 45%. Immediate contact required to understand cash position. If no payment within 48h,
escalate to collections."
```

**Why AI Here:**
✅ **Summarization:** Condenses 5 metrics into coherent narrative
✅ **Context:** Adds "why this matters" reasoning
✅ **Actionability:** Suggests next step (call, collections, etc.)
✅ **Language:** Converts technical metrics to natural language ops prefer
✅ **Tone:** Adjusts urgency based on context (CRITICAL vs. WATCH)

**Scope:** LLM explanations are only generated for **CRITICAL** and **AT_RISK** dealers (typically 5–15 out of 100). HEALTHY and WATCH dealers use deterministic explanations only.

**Cost/Benefit:**
- **Cost:** API latency (100–500ms per dealer, ~1–8s for 5–15 flagged dealers)
- **Benefit:** Operators report better decision-making with context
- **Fallback:** If API fails or no API key is set, system still works with deterministic explanations

---

### Tier 5: **Anomaly Detection** (Future: 30% AI)

**Current Status:** NOT implemented yet; reserved for future enhancement.

**Proposed Method:**

**Problem Scenario:**
```
Dealer_050:
- DPO: 55 days (WATCH threshold)
- Utilization: 72% (WATCH threshold)
- Orders: Stable
- Late payments: 0
- Tier: WATCH (2 signals)

But human review reveals:
- Payments are arriving, just delayed by banking
- Utilization spike is due to one large order (seasonal)
- This dealer has never had a late payment in 2 years
→ False positive? Or early warning?
```

**LLM Anomaly Check:**

```javascript
async function detectAnomalies(dealer, historicalData) {
  const prompt = `
    Dealer history (24 months):
    [detailed payment patterns, order history, seasonal adjustments]

    Current month signals:
    [DPO jump from 45→55, utilization from 60%→72%]

    Question: Is this dealer showing abnormal stress,
    or is this within their historical variance?

    Answer: [yes/no + reasoning]
  `;

  const response = await llm.messages.create({ /* ... */ });
  return response.content[0].text;
}
```

**Why AI Here:**
- ✅ Detect multivariate patterns (DPO + orders + consistency all shift together)
- ✅ Contextualize against dealer's own history
- ✅ Avoid false positives from seasonal/one-time events
- ✅ Identify early stress before hitting thresholds

**Trade-off:**
- ⚠️ More latency (requires fetching 24-month history)
- ⚠️ Context-dependent (can produce false negatives if history incomplete)
- ⚠️ Requires tuning (what constitutes "abnormal"?)

**Decision to Defer:**
- Current deterministic system has good recall (catches real defaults)
- Need more live data to validate LLM's anomaly detection
- Can add later without breaking existing system

---

## Why NOT AI for Risk Scoring

### Problem 1: Lack of Training Data
- **Synthetic data:** 100 dealers, 12 months, ~2–3 actual defaults
- **Required for ML:** 100+ defaults to train meaningful classifier
- **Time to collect:** 6–12 months of live portfolio + actual defaults
- **Current approach:** Use explicit thresholds + collect real defaults, then retrain

### Problem 2: Lack of Interpretability
- **Ops teams need to know:** "Why is this dealer flagged?"
- **ML models give:** Black-box score (0.87 probability of default)
- **Missing:** Which metrics drove the score?
- **Fix required:** SHAP values, feature importance, counterfactual explanations
- **Complexity:** Adds 2–4 weeks of additional work

### Problem 3: Regulatory Risk
- **RBI guidelines** for NBFCs require traceable, documented default risk logic
- **ML model:** Hard to audit ("how did you decide 0.87 is high risk?")
- **Deterministic rules:** Easy to audit ("if DPO > 90d, that's default per RBI guidelines")
- **Decision:** Stay deterministic until I can fully explain ML logic

---

## Why NOT AI for Threshold Detection

**Example Problem:**
```
System A (AI-based):
  "Based on your portfolio statistics, DPO threshold should be 72 days"

System B (Deterministic):
  "RBI defines 90+ days past due as NPA (non-performing asset)"

Which is correct?
  → System B is aligned with regulatory definition
  → System A might be over-optimized for your data
```

**Rationale:**
- Thresholds should reflect **standard definitions**, not data-driven optimization
- RBI guidance: 90+ dpd = default; 30–90 dpd = watch
- Trying to "optimize" thresholds too early risks missing real defaults

---

## Decision Summary Table

| Component | Deterministic | AI | Reasoning |
|-----------|:---:|:---:|-----------|
| Metric Calculation | ✅ | | Direct computation; no judgment |
| Threshold Detection | ✅ | | Regulatory alignment; interpretability |
| Risk Scoring | ✅ | | Transparency; auditability |
| Tier Assignment | ✅ | | Consistency; reproducibility |
| **Explanation Text** | ⚠️ Baseline | ✅ Enhanced | LLM adds context without changing score |
| Anomaly Detection | | ✅ Future | Once I have validation data |
| Default Prediction | | ✅ Future | After 6–12 months of live defaults |

---

## Evolution Path (Next 6–12 Months)

### Phase 1 (Now): Deterministic + LLM Explanations
```
Deterministic scoring → LLM narrative enhancement → Dashboard
```
- ✅ Fast iteration
- ✅ Builds ops confidence
- ✅ Collects real default data

### Phase 2 (3–6 months): Add Anomaly Detection
```
Deterministic scoring
    ↓
+ LLM anomaly detection (is this really anomalous?)
    ↓
Risk assessment (possibly downgrade false positives)
    ↓
LLM narrative
```
- Goal: Reduce false positives while maintaining recall

### Phase 3 (6–12 months): Build ML Default Model
```
6 months of real data + actual defaults
  ↓
Retrain logistic regression / simple tree on real signals
  ↓
Validate precision/recall
  ↓
Deploy if better than deterministic approach
  ↓
Keep SHAP explanations for interpretability
```

---

## Testing Strategy

### Baseline Validation (Deterministic System)
1. Run system on synthetic data
2. Measure: Correctly identifies all 2–3 synthetic defaults?
3. Measure: False positive rate on healthy dealers?
4. Benchmark: For next 30 days, track which flagged dealers actually default

### LLM Explanation Quality
1. Collect 10 random dealer explanations (deterministic + LLM)
2. Have 2 ops team members score on:
   - **Accuracy**: Does explanation match the data? (✓/✗)
   - **Clarity**: Would this explanation help you decide to call? (1–5)
   - **Completeness**: Does it mention all critical signals? (✓/✗)
3. Refine prompt based on feedback

### Future Anomaly Detection (When Implemented)
1. Collect 20 dealers flagged by deterministic system but not defaulted
2. Run LLM anomaly detection: "Is this really anomalous?"
3. Measure: Does LLM correctly downgrade false positives?
4. Iterate on prompt + thresholds

---

## Key Principles

### 1. **Transparency First**
All outputs must be explainable. If ops asks "why was this dealer flagged?", I must be able to point to specific data.

### 2. **Data-Driven Thresholds**
Thresholds come from domain knowledge (RBI guidelines) + statistical analysis, not arbitrary gut feel.

### 3. **Iterate on Real Data**
Synthetic data is useful for building, but system accuracy only improves with actual defaults. Plan for refinement after first 30 days.

### 4. **AI as Enhancement, Not Core**
AI is used to enhance explanations and (future) detect anomalies, but core scoring is deterministic. If AI fails, system still works.

### 5. **Audit Trail**
Every flag, every score, every decision should be logged and reviewable. Deterministic logic makes this easier.
