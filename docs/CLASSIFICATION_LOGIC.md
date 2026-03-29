# Risk Classification Logic

## Four-Tier Risk System

The system classifies dealers into 4 risk tiers based on deterministic thresholds across 7 signal dimensions.

---

## Tier Definitions

### HEALTHY
All metrics within normal range. No late payments, stable orders, normal utilization. **Action:** Quarterly monitoring.

### WATCH
1-2 early warning signals — DPO creeping up, small order decline, a late payment. Still manageable. **Action:** Weekly monitoring, ops review.

### AT RISK
Multiple signals accumulating (score ≥ 60) but no single critical breach. Clear deterioration trend across several metrics. **Action:** Immediate ops review, dealer contact.

### CRITICAL
Any single critical signal fires and the dealer goes straight here — no matter what else looks fine. This includes DPO ≥ 90 days (RBI's NPA definition), utilization > 90%, 3+ late payments, order collapse > 40%, DPO jumping 20+ days in one month, or paying less than 30% of EMI. **Action:** Collection procedures, immediate intervention.

---

## Thresholds

| Signal | Healthy | Watch | Critical |
|--------|---------|-------|----------|
| DPO (days) | ≤ 50 | 65–89 | ≥ 90 |
| Utilization | < 80% | 80–90% | > 90% |
| Late Payments (90d) | 0 | 1–2 | 3+ |
| Order Decline (seasonal-adj) | < 10% | 10–40% | > 40% |
| Order Volatility (seasonal-adj) | < 15% | 15–25% | > 25% |
| DPO Velocity (MoM) | < 10d | 10–19d | ≥ 20d |
| Payment Coverage (vs EMI) | > 70% | 30–70% | < 30% |

---

## Scoring Weights

Each signal that fires adds to the tier score. The score determines the tier (unless a CRITICAL signal fires — that overrides everything).

| Signal | Watch Weight | Critical Weight |
|--------|-------------|----------------|
| DPO | +40 | +100 |
| Utilization | +30 | +80 |
| Late Payments | +20 | +70 |
| Order Trend | +25 (watch) / +15 (at_risk level) | +60 |
| Volatility | +15 | +30 |
| DPO Velocity | +20 | +50 |
| Payment Coverage | +20 | +60 |

**Tier from score:**
- Any CRITICAL signal → **CRITICAL** (bypasses score)
- Score ≥ 60 → **AT RISK**
- Score ≥ 25 → **WATCH**
- Otherwise → **HEALTHY**

If a dealer has less than 3 months of data, the score gets scaled down by a confidence factor to avoid over-flagging new dealers.

---

## Why These Specific Thresholds?

- **DPO 90 days** — RBI classifies 90+ days past due as NPA (Non-Performing Asset). This is non-negotiable.
- **DPO 65 days (Watch)** — about 30% over baseline; payment stress is starting to show.
- **Utilization > 90%** — dealer has maxed out their credit, no buffer left for any disruption.
- **3+ late payments in 90 days** — one late is a blip, three is a pattern. Systemic issue.
- **Order decline > 40%** — business is collapsing. Before default, business activity drops first.
- **DPO velocity ≥ 20 days** — something broke suddenly. This kind of jump doesn't happen gradually.
- **Payment coverage < 30%** — dealer is barely paying anything on their EMI. Direct default precursor.

Volatility is calculated on seasonal-adjusted order values (each month's orders divided by its seasonal factor) so that natural Q1 dips and Q4 spikes don't trigger false flags.

---

## Top 10 Ranking

Dealers are ranked by their **30-day default probability** (not tier score). This probability comes from a weighted logistic formula in `src/engine/riskEngine.js:calculate30DayDefaultProbability()` that combines DPO proximity to 90 days, velocity, payment coverage, order decline, utilization, and late payment patterns.

---

## False Positive Scenarios

**Seasonal false positive:** A dealer in Q4 hits 90% utilization because of year-end inventory build. System flags CRITICAL, but it's normal seasonal behavior. Fix: learn seasonal baselines per dealer.

**Temporary shock:** A distributor raises prices, orders drop 25% for 2 months, then recover. System flags AT RISK. Fix: require sustained decline (3+ months) before escalating.

**Banking delay:** Payment cleared but arrived 15 days late. System flags WATCH with 1 late incident. Fix: weight recent months more; ignore if isolated.

These false positives are acceptable in the current design — I optimize for catching real defaults over avoiding false alarms. See [FALSE_POSITIVES.md](FALSE_POSITIVES.md) for the full measurement framework.
