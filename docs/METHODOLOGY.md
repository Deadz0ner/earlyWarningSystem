# AI vs Deterministic — Where and Why

This document explains where and why I use AI (LLM API) versus deterministic rules in the early warning engine.

---

## Pipeline Overview

```
Data Input → Calculate Metrics (deterministic)
  → Risk Scoring (deterministic)
  → Tier Classification & Ranking (deterministic)
  → Generate Explanations (rule-based + LLM-enhanced)
  → Output: Top 10 Dealers + Explanations
```

---

## What's Deterministic (and Why)

### Metric Calculation — 100% deterministic
DPO, utilization, order trends, volatility, late payment counts — these are all straight math from transaction data. No judgment call needed, no AI required.

### Threshold Detection — 100% deterministic
Each of the 7 signals is checked against hard thresholds (e.g., `DPO >= 90` → CRITICAL). I keep these deterministic because:
- Ops teams can understand "if DPO > 90d, that's default"
- It's auditable — same input always gives same output
- It aligns with RBI's regulatory definitions
- No black box

### Scoring & Tier Assignment — 100% deterministic
Signal weights get summed, tier gets assigned from the score. Ranking uses 30-day default probability from a weighted logistic formula. All reproducible, all transparent.

### 30-Day Default Probability — deterministic formula (not ML)
With only 100 synthetic dealers and ~2-5 actual defaults, there's nowhere near enough labeled data to train an ML model. So I use a weighted logistic formula with domain priors (DPO proximity to 90d gets the heaviest weight, then payment coverage, then velocity, etc.). Once 6+ months of live data with real defaults exist, this can be replaced with a trained logistic regression.

---

## What Uses AI (and Why)

### Explanation Generation — LLM-enhanced

The deterministic explanation lists which signals fired — it's a structured bullet list. But ops teams deciding whether to call a dealer need more than that. They need synthesis: "this combination of rising DPO and falling orders suggests the dealer is losing their customer base, not just having a cash flow hiccup."

An LLM takes the structured signal data and produces a 2-3 sentence narrative that connects the dots and suggests a next step. It doesn't change the score or tier — it just makes the output more useful for humans.

**How it works:**
- Only runs for **CRITICAL** and **AT_RISK** dealers (typically 5-15 out of 100)
- Sends the dealer's metrics, signals, and default probability to the LLM
- Gets back a brief explanation suitable for ops teams
- If no API key is set or the call fails, the system still works — deterministic explanations are always there as fallback

**Example LLM output:**
```
"Dealer_042 has hit critical distress: DPO overdue by 5+ days past the default threshold,
loan maxed at 92%, orders collapsed 45%. Immediate contact required — if no payment
within 48h, escalate to collections."
```

---

## What I'm NOT Using AI For (and Why)

| Component | Why not AI |
|-----------|-----------|
| Risk scoring | Need reproducible, auditable output. ML black box doesn't work for compliance. |
| Threshold detection | RBI defines 90+ dpd as default. I don't need AI to tell me that. |
| Default prediction | Not enough training data. ~2-5 defaults in 100 synthetic dealers isn't enough. |
| Anomaly detection | Would be useful for catching subtle multivariate patterns, but I need real data to validate it first. This is future work. |

---

## What Changes With More Data

**Phase 1 (now):** Deterministic scoring + LLM explanations. Builds ops confidence, collects real default data.

**Phase 2 (3-6 months):** Add LLM-based anomaly detection — "is this dealer's behavior actually unusual given their history, or is it seasonal noise?"

**Phase 3 (6-12 months):** Replace the deterministic probability formula with a trained ML model (logistic regression or gradient boosting). Add SHAP values so the model's decisions are still explainable.

Each phase builds on the previous. I don't rush to ML until the deterministic approach is proven and there's enough real data to train on.
