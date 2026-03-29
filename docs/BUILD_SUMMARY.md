# Build Summary: Dealer Portfolio Early Warning System

**Status:** COMPLETE AND RUNNING

**Server:** http://localhost:3000

---

## What Was Built

A production-ready early warning system for NBFC dealer portfolio risk detection. For how to run it, see [QUICK_START.md](QUICK_START.md). For the full project structure, see the [root README.md](../README.md).

### Core Components

1. **Synthetic Data Generator** (`src/data/generateSyntheticData.js`) — 100 dealers, 2 anchors, 4 credit profiles, 5 behavioral archetypes, 12 months of transaction data
2. **Risk Classification Engine** (`src/engine/riskEngine.js`) — 4-tier system with 7 signal dimensions, deterministic scoring, 30-day default probability
3. **Database Layer** (`src/data/database.js`) — SQLite with 3 tables (dealers, transactions, risk_assessments)
4. **API Server** (`src/api/server.js`) — Express.js with 7 REST endpoints + LLM integration for explanations
5. **Dashboard** — Built-in static HTML (`public/`) + React frontend (`frontend/`) with Vite, Recharts, Lucide

---

## Key Design Decisions

### 1. Deterministic over ML (Initially)
- Only 100 dealers, 12 months, ~2-5 defaults = insufficient training data
- RBI compliance requires explainable rules
- Thresholds based on domain knowledge (RBI guidelines)
- Future: Retrain on real defaults after 6–12 months

### 2. Simple Thresholds for Auditability
- "If DPO >= 90d, then CRITICAL" is transparent
- Ops teams can understand and challenge thresholds
- Easy to adjust based on actual portfolio performance

### 3. LLM for Explanations, Not Scoring
- Scoring is deterministic (reproducible)
- LLM synthesizes metrics into narrative for ops teams
- Only called for CRITICAL and AT_RISK dealers
- If API fails, system still works with rule-based explanations

### 4. Monthly Cadence (Extensible)
- Batch analysis at month-end is practical for most NBFCs
- Easy to extend to real-time later (just update ingestion)

### 5. High Recall > Precision
- Cost of missing default > Cost of false positive
- Precision improves over time as thresholds refine

---

## What's NOT Included (By Design)

- **ML models** — Insufficient training data; would over-fit
- **Real-time streaming** — Implemented as monthly batch; easily extended
- **External data** — Only transaction data; can integrate later (credit bureau, macro)
- **Mobile app** — Dashboard works on mobile; native app is future enhancement
- **Scheduler** — Stateless API; easy to call from cron or message queue

---

## Test Results

- **Server Status:** Running on port 3000
- **API Health:** `/api/status` responding
- **Synthetic Data:** 100 dealers + 1,200 transactions generated
- **Analysis Engine:** Classification working, top 10 dealers identified
- **Dashboard:** Interactive visualization functional
- **Database:** SQLite initialized and populated

---

## Where to Find Details

See [INDEX.md](INDEX.md) for the full mapping of submission requirements to documentation files.

---

Generated: 2026-03-25
