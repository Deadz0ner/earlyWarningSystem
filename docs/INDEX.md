# Documentation Index

This file maps each submission requirement from the problem statement to the document(s) that address it.

---

## Submission Requirements

### 1. What data points I chose to monitor and why

| Document | What it covers |
|----------|---------------|
| [CHOSEN_DATAPOINTS.md](CHOSEN_DATAPOINTS.md) | **Primary.** The 7 data dimensions, why I chose each, what I excluded, and how they combine via the weighted logistic formula. |
| [DATA_MODEL.md](DATA_MODEL.md) | Database schema, field definitions, derived feature calculations, and data quality assumptions. |

---

### 2. My risk classification logic (categories, thresholds, movement triggers)

| Document | What it covers |
|----------|---------------|
| [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md) | **Primary.** Four-tier definitions (HEALTHY/WATCH/AT_RISK/CRITICAL), all 7 signal thresholds, exact scoring weights from code, escalation rules, false positive scenarios. |

---

### 3. Where I used AI vs deterministic rules, and the reasoning

| Document | What it covers |
|----------|---------------|
| [METHODOLOGY.md](METHODOLOGY.md) | **Primary.** Full decision matrix across all pipeline stages. Where I use deterministic rules and why (metric calculation, thresholds, scoring, tier assignment). Where I use AI and why (explanation generation via LLM for CRITICAL/AT_RISK dealers). Why I chose NOT to use AI for scoring, thresholds, or default prediction. Evolution path for future AI additions. |

---

### 4. What happens when data is missing for a dealer

| Document | What it covers |
|----------|---------------|
| [DATA_MODEL.md](DATA_MODEL.md) | **Primary.** Edge case handling table (new dealers, missing payments, zero orders, no transactions). Data quality assumptions. |

---

### 5. What my false positive rate looks like and how I would measure it

| Document | What it covers |
|----------|---------------|
| [FALSE_POSITIVES.md](FALSE_POSITIVES.md) | **Primary.** Definitions (precision/recall), 30-day measurement plan, tracking sheet template, expected outcomes, interpretation scenarios, refinement strategy, cost-benefit analysis, long-term roadmap. |

---

### 6. What I would improve with more time

| Document | What it covers |
|----------|---------------|
| [FUTURE_WORK.md](FUTURE_WORK.md) | **Primary.** Prioritized roadmap: anomaly detection, anchor cascading, profile-specific thresholds, real-time monitoring, ML model training, inventory integration, cohort analysis, intervention tracking, macro integration, XAI, mobile app, regulatory reporting. |

---

## Other Documentation

| Document | Purpose |
|----------|---------|
| [APPROACH.md](APPROACH.md) | My initial design document written before building. Shows my assumptions, proposed approach, and loan parameter research. Kept as a record of the design process. |
| [BUILD_SUMMARY.md](BUILD_SUMMARY.md) | Post-build summary of what I implemented, key design decisions, and current status. |
| [SAMPLE_OUTPUT.md](SAMPLE_OUTPUT.md) | Example API responses, dashboard previews, trend visualizations, and dealer comparison matrices. |
| [QUICK_START.md](QUICK_START.md) | How to install, run, and use the system. |
| [../README.md](../README.md) | Project overview with architecture, quick start, and links to all docs. |
