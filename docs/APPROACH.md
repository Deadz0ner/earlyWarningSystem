# Dealer Portfolio Early Warning System – Approach & Assumptions

> **Note:** This is the initial design document, written before building. It captures the assumptions, proposed approach, and reasoning that shaped the implementation. For the final, accurate specifications, see the dedicated docs linked below.
>
> - Final data points and rationale: [CHOSEN_DATAPOINTS.md](CHOSEN_DATAPOINTS.md)
> - Final thresholds and scoring: [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md)
> - Final AI vs deterministic decisions: [METHODOLOGY.md](METHODOLOGY.md)
> - Database schema and edge cases: [DATA_MODEL.md](DATA_MODEL.md)

---

## 1. Proposed Data Points

The initial data points proposed for monitoring were: loan account health (balance, utilization, DPO, payment frequency), purchasing behavior (orders, volatility, cancellation rate), payment behavior (DPO consistency, late payments), derived signals (trends, seasonality), and anchor context.

For the final set of 7 monitored dimensions and why each was chosen, see [CHOSEN_DATAPOINTS.md](CHOSEN_DATAPOINTS.md).

---

## 2. Risk Classification Logic

### Four-Tier System

The initial proposal was a four-tier system (Healthy / Watch / At Risk / Critical) with escalation triggers. This was refined significantly during implementation — the final system uses 7 signal dimensions with weighted scoring.

For the complete tier definitions, exact thresholds, scoring weights, and escalation rules, see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md).

---

## 3. Early Warning Engine – AI vs Deterministic

The initial plan was: 70% deterministic rules (thresholds, scoring) + 30% AI (anomaly detection, explanation generation). In the final build, anomaly detection was deferred (insufficient validation data), and AI is used solely for explanation generation on CRITICAL/AT_RISK dealers via LLM API.

For the full decision matrix of where AI vs deterministic is used and why, see [METHODOLOGY.md](METHODOLOGY.md).

---

## 4. Top 10 Dealer Ranking

The initial proposal was a weighted combination of tier level, recency, and velocity. The final implementation uses a **30-day default probability** calculated via a weighted logistic formula (see `src/engine/riskEngine.js:calculate30DayDefaultProbability()`). Dealers are ranked by this probability, not tier score.

**Why deterministic formula over ML:** With only 100 synthetic dealers and ~2-5 defaults, there's not enough labeled data to train a model. Once 6+ months of live data exist, replace with trained logistic regression.

---

## 5. Missing Data Handling

See [DATA_MODEL.md](DATA_MODEL.md) for the full edge case handling table. Key approach: confidence scoring based on data availability (full confidence at 6+ months), forward-fill with decay for gaps, and flagging anomalies like payments without orders.

---

## 6. False Positive Rate & Measurement

See [FALSE_POSITIVES.md](FALSE_POSITIVES.md) for the full measurement framework. The key design decision: optimize for **high recall** over precision — the cost of missing a default far exceeds the cost of investigating a false alarm.

---

## 7. Synthetic Data Design

The initial distribution proposal was: 60% healthy, 15% watch, 15% at-risk, 8% critical, 2% defaulted. The final implementation uses **5 behavioral archetypes** (Stable 55%, Slow Deterioration 15%, Recovery 8%, Sudden Stress 7%, Seasonal Volatile 15%) assigned per dealer, with probabilistic defaults based on archetype + credit profile.

For full archetype definitions and default simulation logic, see [DATA_MODEL.md](DATA_MODEL.md).

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

## 9. Refined Risk Classification Logic

The refined thresholds, incorporating loan parameters and all 7 signal dimensions, are documented in [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md).

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

- **Backend**: Node.js + Express 5
- **Database**: SQLite3 (synthetic data + results)
- **Frontend**: Built-in static dashboard (`public/`) + React app with Vite, Recharts, Lucide (`frontend/`)
- **LLM**: AI model via LLM API — for explanation generation on CRITICAL/AT_RISK dealers only
- **Deployment**: Standalone (can run locally or deploy to simple server)

---

## 12. Deliverables Structure

See the file structure in the [root README.md](../README.md).

---

## 13. Timeline

- **Wed 3/26**: Synthetic data generator + core engine logic
- **Thu 3/27**: Complete dataset, test ranking engine, start LLM integration
- **Fri 3/28**: Dashboard MVP, LLM explanations working, documentation draft
- **Sat 3/29**: Full dashboard polish, React frontend, docs finalized
- **Sun 3/30 EOD**: Final submission

---

## 14. Key Assumptions & Locked Decisions

1. **Default definition**: 90+ days past due (DPO ≥ 90 days) = technical default
2. **Loan tenure**: 12-month rolling cycle; dealers renew annually
3. **Dealer-Anchor relationship**: Exclusive (one dealer = one anchor)
4. **Sanctioned amounts**: ₹15L–₹60L per dealer, distributed across 4 credit profiles
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

✓ **Synthetic dataset**: 100 dealers, 12 months, 4 credit profiles, realistic seasonal & deterioration patterns
✓ **Risk engine**: Deterministic thresholds (DPO, orders, utilization) + LLM for anomaly detection + explanations
✓ **Top 10 ranking**: Transparent weighted formula (tier + recency + velocity)
✓ **Dashboard**: Real-time visualization, drill-down per dealer, flagging explanation
✓ **Documentation**: Full methodology, AI vs deterministic decision matrix, false positive framework

**Ready to build. Starting now.**
