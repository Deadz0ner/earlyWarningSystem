# Dealer Portfolio Early Warning System – Approach & Assumptions

## 1. Data Model & Monitoring Points

### Core Data Points (Monthly + Transaction-Level)
I'm proposing to track these per dealer:

**Loan Account Health**
- Current outstanding balance
- Loan utilization rate (balance / sanctioned amount)
- Days past due (most recent transaction)
- Payment frequency (% of on-time payments in last 3 months)

**Purchasing Behavior** (proxy for business health)
- Order count per month
- Average order value
- Total order value per month
- Variance in order sizes (volatility indicator)
- Order cancellation rate

**Payment Behavior**
- Avg days to clear invoice (DPO – Days Payable Outstanding)
- Payment consistency (std dev of DPO)
- Late payment incidents in rolling 90 days
- Pattern of minimum vs full payments

**Derived Signals**
- Month-over-month order growth rate
- Order frequency trend (is it accelerating or decaying?)
- Payment slowdown trend (is DPO increasing?)
- Seasonal adjustment (dealers may have seasonal patterns)

**Anchor Context**
- Which anchor each dealer is tied to
- Anchor health (simple: total receivables, default rate)

### Why These Points?
- **Orders** = business demand; declining orders suggest demand loss or shifting to competitors
- **Payments** = repayment capacity; slowdown suggests cash flow stress before default
- **Balance + utilization** = leverage and concentration risk
- **Consistency** = behavioral baseline; deviations from baseline are early signals

---

## 2. Risk Classification Logic

### Four-Tier System

| Category | Criteria | Action |
|----------|----------|--------|
| **Healthy** | DPO within normal range, orders stable/growing, 0 late payments in 90d, utilization <70% | Monitor quarterly |
| **Watch** | 1–2 minor signals: slight DPO increase, small order decline, or 1 late payment | Monitor weekly, ops review |
| **At Risk** | Multiple signals: DPO +15% trend, order decline >20%, 2+ late payments, utilization >75% | Immediate ops review, possible outreach |
| **Critical** | Severe signals: DPO >60 days, order decline >40%, 3+ late payments, utilization >85% | Immediate intervention |

### Movement Triggers (What Bumps a Dealer Up?)
1. **Payment slowdown**: DPO increases by >X days in a single month → escalate one tier
2. **Order cliff**: Orders drop >30% month-over-month → escalate one tier
3. **Repeated late payments**: 3+ incidents in 3 months → escalate
4. **Volatility spike**: Order size variance increases 2x → escalate (suggests cash constraints)

### De-escalation
A dealer can move down if: healthy behavior for 2 consecutive months.

---

## 3. Early Warning Engine – AI vs Deterministic

### Deterministic Rules (70% of the Engine)
- **Payment threshold checks**: Hard boundaries (e.g., >30 days late)
- **Order trend calculation**: Month-over-month %, rolling averages
- **Utilization checks**: Account balance / sanctioned amount
- **Seasonality adjustment**: Historical pattern baseline (e.g., Q4 boost, Q1 decline)

**Why deterministic here?** Ops teams need transparent, auditable rules. A late payment is objective. "Why this dealer?" must be traceable to specific facts.

### AI/LLM Usage (30% of the Engine)

**Use case 1: Anomaly Detection**
- *Where*: Multivariate outlier detection on dealer behavior
- *Why*: A dealer might hit no single threshold but exhibit unusual *combinations* (e.g., steady orders but suddenly 45-day payments + cancellations). Deterministic rules miss this.
- *How*: Embed dealer metrics, use Claude to flag "does this behavior pattern indicate hidden stress?"
- *Trade-off*: Slightly higher false positives, but catches subtler risks

**Use case 2: Explanation Generation**
- *Where*: User-facing text explaining each flag
- *Why*: "Dealer flagged" means nothing; "Orders down 35%, DPO up 20 days, 1 late payment" is actionable. LLM can synthesize these into natural language ops teams trust.
- *How*: Pass structured flag data → Claude generates explanation + suggested next steps
- *Trade-off*: Slight latency, but critical for adoption

**NOT using AI for:**
- Risk scoring / ranking → deterministic weighted sum (transparent, reproducible)
- Threshold detection → explicit rules (auditable)
- Default prediction → see below; consider simpler approach first

---

## 4. Top 10 Dealer Ranking

**Ranking methodology**:
- Each dealer gets a **default probability score** (0–100)
- Score = weighted combination of:
  - Tier level (Healthy=5, Watch=25, At Risk=60, Critical=100)
  - Recency weight (more recent signals count more)
  - Velocity (how fast are they deteriorating?)
  - No individual factor dominates (avoids gaming)

**Why not ML/LLM for this?**
- With only 100 dealers and 12 months, we don't have enough historical defaults to train a model reliably
- Interpretability matters more than precision here—ops teams need to understand *why* a dealer ranks #3
- Simpler deterministic formula is reproducible and stable

**Future improvement**: Once we have 6–12 months of live data + actual defaults, retrain a logistic regression or simple tree on real signals.

---

## 5. Missing Data Handling

**Scenario 1: New dealer (< 2 months history)**
- Flag as "insufficient history"
- Show what we do know
- Don't rank until 2+ months

**Scenario 2: Missing recent payment data**
- Forward-fill with 1-month decay (assume last known state, reduce confidence each month)
- Treat as yellow flag: "payment data stale for X days"

**Scenario 3: No orders in a month**
- If it's seasonal (e.g., Q1 for some categories), adjust baseline
- If anomalous, escalate (business may have stopped)

**Scenario 4: Missing order data but payments happening**
- Treat as anomaly: cash flowing but no recorded transactions
- Could indicate non-anchor channel activity or data gap

---

## 6. False Positive Rate & Measurement

**How I'd measure it:**
1. Track flagged dealers over next 30 days
2. Count: How many actually default? How many recover?
3. Calculate:
   - **Precision**: Of 10 flagged, N actually defaulted → precision = N/10
   - **Recall**: Of all dealers who defaulted, how many were flagged? → recall = flagged ∩ defaulted / all defaulted

**Initial expectation**:
- High recall (catch most real defaults) > High precision (false positives are cheaper than missed defaults)
- Target: 70%+ recall, 40%+ precision initially; refine thresholds over time

**Handling false positives:**
- Review non-defaulting flagged dealers quarterly
- Adjust thresholds (maybe "Watch" tier is too aggressive)
- Segment by anchor or dealer type (thresholds may differ)

---

## 7. Synthetic Data Design

### 100 Dealers, 12 Months

**Distribution (opinionated):**
- 60% Healthy (consistent payments, stable orders, low utilization)
- 15% Watch (minor stress signals, recoverable)
- 15% At Risk (trending down, but could stabilize)
- 8% Critical (headed for default)
- 2% Already defaulted (simulate missed last payment)

**Anchors:**
- Anchor A: 60 dealers (maybe better credit quality)
- Anchor B: 40 dealers (more volatile)

**Patterns to simulate:**
- **Seasonal**: Q4 boost (inventory for year-end), Q1 decline
- **Slow deterioration**: 3–4 month trend down (real default risk looks like this)
- **Sudden stress**: Job loss / lockdown → sharp drop (should be rare)
- **Recovery arc**: Dips then bounces back (healthy dealers navigate stress)
- **Anchor dependency**: If anchor raises prices, some dealers suffer more

---

## 8. Concrete Loan Parameters (NBFC Working Capital Financing)

Based on typical small dealer financing structures, here's what I'm modeling:

### Loan Account Structure
| Parameter | Range | Reasoning |
|-----------|-------|-----------|
| **Sanctioned Limit per Dealer** | ₹15L – ₹60L | Typical for small retailers in electronics, auto, FMCG sectors |
| **Average Utilization** | 50–85% | Dealers don't draw full amount; seasonal variation |
| **Loan Tenure** | 12 months (rolling) | Standard NBFC working capital; renewed annually |
| **Repayment Schedule** | Monthly installments | Aligns with dealer business cycles |
| **Monthly EMI Range** | 8–12% of sanctioned limit | For a ₹40L limit: ₹3.2L–₹4.8L/month |
| **Interest Rate** | 18–22% p.a. | Typical NBFC rate for this segment |
| **Moratorium Period** | 0–1 month | Some dealers get grace before first EMI |

### Drawdown & Usage Patterns
| Pattern | % of Dealers | Behavior |
|---------|--------------|----------|
| **Steady utilization** | 50% | Stable draw, consistent DPO, reliable |
| **Seasonal spikes** | 30% | High utilization Q4 (Oct–Dec), low Q1 (Jan–Mar) |
| **Revolving drawdown** | 20% | Prepay in good months, redraw in weak months |

### Default Thresholds (Derived)
- **Days Payable Outstanding (DPO) baseline**: 30–45 days (industry norm for small dealers)
- **Late payment flag**: DPO exceeds 60 days for any month
- **Critical flag**: DPO exceeds 90 days → **DEFINITION OF DEFAULT**
- **Repeated breach**: 3+ months with DPO > 60 days → **Technical default**

### Collateral & Security
- **Primary collateral**: Goods supplied by anchor (inventory pledge)
- **Secondary**: Personal guarantees from dealer proprietor
- **Concentration risk**: Average dealer represents 5–8% of total portfolio value

### Expected Default Rates (in synthetic data)
- **Healthy dealers**: 0.5–2% annual default rate
- **Watch-list dealers**: 8–15% annual default rate
- **At-Risk dealers**: 30–50% annual default rate

### Dealer Credit Profile Segmentation
To add realism to synthetic data:

| Profile | % of Portfolio | Sanctioned Limit | Typical Utilization | Baseline DPO | Risk Profile |
|---------|----------------|-----------------|---------------------|--------------|--------------|
| **Premium** | 15% | ₹50L–₹60L | 60–70% | 25–35 days | Very low default risk |
| **Good** | 50% | ₹25L–₹45L | 65–80% | 35–50 days | Low to medium risk |
| **Fair** | 25% | ₹15L–₹35L | 70–85% | 45–60 days | Medium risk |
| **High-Risk** | 10% | ₹15L–₹30L | 75–90% | 55–70 days | High default risk |

---

## 9. Refined Risk Classification Logic (with Loan Parameters)

### Threshold Calibration

**Healthy Tier**
- DPO: 30–50 days (within baseline)
- Utilization: < 70%
- Late payments: 0 in 90 days
- Order trend: Stable or growing (±10%)
- Monthly order volatility: < 15%
- Signal: Dealer is operating normally

**Watch Tier**
- DPO: 51–65 days (creeping above baseline)
- Utilization: 70–80%
- Late payments: 1 incident in 90 days
- Order trend: Slight decline (10–20%)
- Monthly order volatility: 15–25%
- Signal: Early stress signals; manageable with monitoring

**At Risk Tier**
- DPO: 66–89 days (approaching default zone)
- Utilization: 80–90%
- Late payments: 2+ incidents in 90 days
- Order trend: Significant decline (20–40%)
- Monthly order volatility: 25–40%
- Payment consistency: Multiple changes to EMI amount
- Signal: Multiple stress indicators; intervention needed

**Critical Tier**
- DPO: 90+ days (**DEFAULT DEFINITION**)
- Utilization: > 90% or declining fast
- Late payments: 3+ incidents in 90 days
- Order trend: Severe decline (> 40%) or near-zero
- Order volatility: > 40% (erratic behavior)
- Signal: Imminent or actual default; collection action required

### Movement Triggers
- **Escalation**: One tier up if new threshold breached (e.g., DPO hits 65+, or 2 late payments in one month)
- **De-escalation**: One tier down if: 2 consecutive months of healthy metrics + DPO returns to baseline
- **Velocity boost**: Accelerated to Critical if DPO jumps >20 days in single month (emergency signal)

---

## 10. Anchor Relationship (Exclusive Model)

Since dealers are **exclusive to one anchor**:
- Each dealer gets exactly 1 relationship (Anchor A or Anchor B)
- Anchor A (60 dealers): Better credit quality, lower baseline default risk
- Anchor B (40 dealers): Higher volatility, seasonal stress, slightly higher risk
- Anchor health: Average of its dealer portfolio (used for contextual analysis)
- Cascade risk: If anchor faces supply/demand shock, all dealers suffer (simulate rare events in synthetic data)

---

## 11. Tech Stack Outline

- **Backend**: Node.js + Express
- **Database**: SQLite (synthetic data + results)
- **Frontend**: React dashboard (show top 10, drill down per dealer)
- **LLM**: Claude API (anomaly detection + explanations)
- **Deployment**: Standalone (can run locally or deploy to simple server)

---

## 12. Deliverables Structure

```
/
├── README.md (main overview)
├── docs/
│   ├── DATA_MODEL.md (detailed explanation of each metric)
│   ├── CLASSIFICATION_LOGIC.md (full risk tiers + thresholds)
│   ├── METHODOLOGY.md (AI vs deterministic decision matrix)
│   ├── SAMPLE_OUTPUT.md (example dashboard screenshot + flagged dealer explanations)
│   ├── FALSE_POSITIVES.md (measurement approach + initial results)
│   └── FUTURE_WORK.md (improvements with more time/data)
├── src/
│   ├── engine/ (core scoring logic)
│   ├── data/ (synthetic data generation)
│   ├── api/ (Express endpoints)
│   └── ui/ (React dashboard)
└── data/ (SQLite database with synthetic dealers + transactions)
```

---

## 13. Timeline

- **Today (Wed 3/26)**: Build synthetic data generator + core engine logic
- **Thursday 3/27**: Complete synthetic dataset, test ranking engine, start LLM integration
- **Friday 3/28**: Dashboard MVP, LLM explanations working, documentation draft
- **Saturday 3/29**: Full dashboard polish, anomaly detection refinement, docs finalized
- **Sunday 3/30 EOD**: Final submission (tool + complete docs)

---

## 14. Key Assumptions & Locked Decisions

1. **Default definition**: 90+ days past due (DPO ≥ 90 days) = technical default
2. **Loan tenure**: 12-month rolling cycle; dealers renew annually
3. **Dealer-Anchor relationship**: Exclusive (one dealer = one anchor)
4. **Sanctioned amounts**: ₹15L–₹60L per dealer, distributed across 5 credit profiles
5. **Monthly cadence**: System evaluates on 15th/end of each month; flags generated for ops next day
6. **False positive tolerance**: Ops can absorb flagging 15 dealers to catch 10 real defaults (60% precision acceptable for safety)
7. **Thresholds**: Global initially; can segment by anchor or credit profile in future
8. **Operational focus**: Transparency > precision; every flag must be explainable to ops team
9. **Data assumptions**: Monthly transaction data only (no external credit bureau, no market indicators)
10. **Default rates in synthetic data**:
    - Healthy: 0.5–2% annual
    - Watch: 8–15% annual
    - At Risk: 30–50% annual

---

## 15. Summary: What I'm Building

✓ **Synthetic dataset**: 100 dealers, 12 months, 5 credit profiles, realistic seasonal & deterioration patterns
✓ **Risk engine**: Deterministic thresholds (DPO, orders, utilization) + LLM for anomaly detection + explanations
✓ **Top 10 ranking**: Transparent weighted formula (tier + recency + velocity)
✓ **Dashboard**: Real-time visualization, drill-down per dealer, flagging explanation
✓ **Documentation**: Full methodology, AI vs deterministic decision matrix, false positive framework

**Ready to build. Starting now.**
