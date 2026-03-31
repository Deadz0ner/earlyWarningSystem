# What I'd Improve With More Time

---

## High Priority (3-6 Months)

### 1. LLM-Based Anomaly Detection
The system now has a deterministic **signal interaction escalation layer** that catches three high-conviction compounding patterns (e.g., high utilization + declining orders). This addresses the most obvious signal combinations with hard rules. But there are subtler multivariate anomalies that rules alone won't catch — for example, a dealer with steady orders but a sudden 45-day DPO jump might be diverting cash flow. With more data, I'd have the LLM analyze whether unusual metric patterns signal hidden stress that the rule-based interactions don't cover.

**Needs:** 3-6 months of historical patterns per dealer to validate against.
**Already done:** Deterministic interaction rules for 3 high-conviction combinations (see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md)).

### 2. Anchor-Level Risk Cascading
Currently each dealer is assessed independently. If an anchor is struggling (high average DPO across all its dealers, rising default rate), that risk should cascade down — lower thresholds for all dealers under that anchor. If the anchor fails, every dealer connected to it is at elevated risk.

### 3. Profile-Specific Thresholds
Right now thresholds are global — same for PREMIUM and HIGHRISK dealers. That's not ideal. PREMIUM dealers rarely default, so they get flagged too aggressively. HIGHRISK dealers need tighter thresholds to catch stress earlier. I'd build a `PROFILE_THRESHOLDS` config that adjusts DPO, utilization, and other thresholds per credit profile.

### 4. Real-Time Payment Monitoring
The system currently runs monthly batch analysis. With a real-time payment API, I could trigger alerts the moment DPO crosses a threshold instead of waiting for month-end. This means faster outreach — call within 24 hours of hitting critical instead of discovering it weeks later.

---

## Medium Priority (6-12 Months)

### 5. ML Default Prediction Model
Once I have 6-12 months of live data with actual defaults (need 50-100+ observed defaults), I'd train a logistic regression or gradient boosting model on real signals. Add SHAP values for interpretability so ops teams can still understand why a dealer was flagged. This would likely outperform the current deterministic formula.

### 6. Inventory-Adjusted Risk Scoring
Currently I only track orders as a demand proxy. If inventory data were available from the distributor, I could calculate the full cash conversion cycle (DIO + DSO - DPO). A long cash cycle means tied-up working capital — a much stronger stress signal.

### 7. Cohort Analysis & Peer Comparison
Compare dealers against peers with the same profile and anchor. "This dealer's DPO is in the 90th percentile vs. similar dealers" is more meaningful than an absolute number. Also useful for spotting systemic trends — if all FAIR-credit dealers under Anchor B are degrading, that's an anchor problem, not individual dealer problems.

### 8. Intervention Tracking
Log when ops contacts a dealer (date, method, outcome). Track whether the intervention prevented default. Use this data to optimize outreach timing — "when I call dealers at 70d DPO, 60% recover; at 85d, only 20% do." This creates a feedback loop that improves the system over time.

---

## Nice to Have (12+ Months)

- **Macro integration** — adjust thresholds based on interest rates, inflation
- **Counterfactual explanations** — "if DPO dropped to 60d, score would be X"
- **Mobile app** for field teams with offline support
- **Automated RBI compliance reports**
- **Stress testing** — "what if Anchor A raises prices 10%?"
- **Predictive alerts** — "based on trend, this dealer will hit 90d in 12 days"
- **Dealer self-service portal** — let dealers see their own risk score
- **A/B testing thresholds** — run two configs in parallel, compare precision/recall

---

## Roadmap Summary

```
Month 1-3:  Current system live, collect real data, measure precision/recall
Month 3-6:  Threshold tuning, anchor cascading, profile segmentation, real-time monitoring
Month 6-12: ML model, inventory integration, cohort analysis, intervention tracking
Month 12+:  Macro integration, mobile app, advanced XAI, automation
```

Each phase builds on the previous. Don't rush to ML until deterministic thresholds are proven and there's enough real data.
