# Approach & Assumptions

> This is the design document I wrote before building. It captures my initial thinking and the assumptions that shaped the implementation. For final specs, see the dedicated docs: [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md), [METHODOLOGY.md](METHODOLOGY.md), [DATA_MODEL.md](DATA_MODEL.md).

---

## Core Idea

Dealers don't default overnight — there are signals weeks before: purchasing slows, payments stretch, utilization rises. I built a system to catch these signals early and rank the top 10 dealers most likely to default in the next 30 days.

## Key Assumptions

1. **Default = DPO ≥ 90 days** (aligned with RBI NPA guidelines)
2. Dealer-anchor relationship is exclusive (1 dealer = 1 anchor)
3. Monthly transaction cadence (not real-time)
4. 70% deterministic rules + 30% AI (explanations only, not scoring)
5. High recall > precision — better to flag a healthy dealer than miss a real default
6. Global thresholds initially — can segment by profile/anchor later

## Synthetic Data Design

Initial proposal: 60% healthy, 15% watch, 15% at-risk, 8% critical, 2% defaulted. Final implementation evolved to **5 behavioral archetypes** (Stable 55%, Slow Deterioration 15%, Recovery 8%, Sudden Stress 7%, Seasonal Volatile 15%) with probabilistic defaults. See [DATA_MODEL.md](DATA_MODEL.md) for details.

## Loan Parameters

| Parameter | Range |
|-----------|-------|
| Sanctioned Limit | ₹15L – ₹60L |
| Monthly EMI | 8–12% of sanctioned limit |
| DPO Baseline | 25–70 days (by profile) |
| Utilization | 50–90% (seasonal variation) |
| Default Probability | 0.5–25% annually (by profile) |

### Credit Profiles

| Profile | % of Portfolio | Limit | Baseline DPO | Risk |
|---------|---------------|-------|-------------|------|
| PREMIUM | 15% | ₹50L–₹60L | 25–35d | Very low |
| GOOD | 50% | ₹25L–₹45L | 35–50d | Low-medium |
| FAIR | 25% | ₹15L–₹35L | 45–60d | Medium |
| HIGHRISK | 10% | ₹15L–₹30L | 55–70d | High |

### Anchors
- Anchor A: 60 dealers, better credit quality
- Anchor B: 40 dealers, 30% higher default risk

## Tech Stack

- **Backend:** Node.js + Express 5
- **Database:** SQLite3
- **Frontend:** Static HTML dashboard (`public/`) + React app with Vite & Recharts (`frontend/`)
- **LLM:** AI model via LLM API — explanation generation for CRITICAL/AT_RISK dealers

## Timeline

- **Wed 3/26:** Synthetic data generator + core engine logic
- **Thu 3/27:** Complete dataset, ranking engine, LLM integration
- **Fri 3/28:** Dashboard MVP, LLM explanations, documentation draft
- **Sat 3/29:** Dashboard polish, React frontend, docs finalized
- **Sun 3/30 EOD:** Final submission
