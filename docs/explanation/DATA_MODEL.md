# Data Model

## Database Schema

Three SQLite tables: dealers, transactions, and risk_assessments.

### Dealers Table

```sql
CREATE TABLE dealers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  anchorId TEXT NOT NULL,
  profile TEXT NOT NULL,
  sanctionedLimit REAL NOT NULL,
  baselineDPO REAL NOT NULL,
  defaultRisk REAL NOT NULL,
  createdAt TEXT NOT NULL
)
```

- **id:** Dealer identifier (1-100)
- **anchorId:** ANCHOR_A or ANCHOR_B (exclusive)
- **profile:** PREMIUM, GOOD, FAIR, or HIGHRISK
- **sanctionedLimit:** Loan limit in INR (₹15L-₹60L)
- **baselineDPO:** Typical DPO for this dealer (25-70 days by profile)
- **defaultRisk:** Annual default probability (0.01-0.25)

### Transactions Table

Monthly transaction data per dealer — 12 months × 100 dealers = 1,200 records.

| Column | Type | What it is |
|--------|------|-----------|
| dealerId | INT | Reference to dealer |
| month/year/monthIndex | TEXT/INT/INT | Time period (Jan=0, Dec=11) |
| sanctionedLimit | REAL | Dealer's limit (static) |
| currentBalance | REAL | Drawn amount this month |
| utilization | REAL | Balance / sanctionedLimit |
| orderCount | INT | Number of purchase orders |
| totalOrderValue | REAL | Sum of all orders |
| avgOrderValue | REAL | Mean per order |
| daysPayableOutstanding | INT | Avg days to clear invoices |
| expectedMonthlyEMI | REAL | Scheduled EMI |
| paymentReceived | REAL | Actual payment |
| latePaymentCount | INT | Late payment incidents |
| isLatePayment | BOOLEAN | Any late payment this month? |
| isDefault | BOOLEAN | Is dealer in default? |

### Risk Assessments Table

One row per dealer (upserted on each analysis run).

```sql
CREATE TABLE risk_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealerId INTEGER NOT NULL UNIQUE,
  dealerName TEXT, anchorId TEXT, profile TEXT,
  tier TEXT, tierScore INTEGER,
  defaultProbability REAL DEFAULT 0,
  metrics TEXT,          -- JSON blob with all calculated metrics
  signals TEXT,          -- JSON blob with signal states
  explanation TEXT,       -- deterministic explanation
  llmExplanation TEXT,    -- LLM-generated narrative
  analyzedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealerId) REFERENCES dealers(id)
)
```

The `UNIQUE` constraint on `dealerId` means re-running analysis updates existing rows via upsert, not duplicating them.

---

## Key Metrics

### DPO (Days Payable Outstanding)
How long a dealer takes to pay invoices. Simplified in synthetic data as a distribution per dealer with seasonal and deterioration factors. Earliest indicator of cash flow stress — DPO rises before payments are actually missed.

### Utilization Rate
`Current Balance / Sanctioned Limit`. High utilization = dealer is over-leveraged with no buffer.

### Order Value & Volatility
Monthly order totals, averages, and volatility (std dev / mean of last 6 months, seasonal-adjusted). Declining orders precede payment stress. High volatility suggests unstable cash flow.

### DPO Velocity
Month-over-month change in DPO. Trend matters more than absolute value — DPO going from 50→75 is very different from 60→65.

### Late Payments
Count of late payment incidents in a 90-day rolling window. One is a blip, three is systemic.

### Payment Coverage
`Payment Received / Expected EMI`. Below 30% is critical — dealer is barely servicing their debt.

For exact thresholds mapping these to risk tiers, see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md).

---

## Synthetic Data: Behavioral Archetypes

Each dealer gets one archetype assigned at creation. It governs all 12 months.

| Archetype | % | Behavior |
|-----------|---|----------|
| **Stable** | 55% | Consistent, follows seasonal patterns, no default risk |
| **Slow Deterioration** | 15% | Normal first 3 months, gradual decline, possible default in months 10-11 |
| **Recovery** | 8% | Dips mid-year (months 3-6), bounces back by year-end |
| **Sudden Stress** | 7% | Normal for 9 months, then sharp cliff in last 3 months |
| **Seasonal Volatile** | 15% | Exaggerated seasonal swings but fundamentally healthy |

**Profile interaction:** HIGHRISK dealers have a 40% chance of being reassigned to Slow Deterioration. PREMIUM dealers almost never get deterioration archetypes.

**Seasonal patterns:** Q1 orders dip ~15% (post-holiday), Q4 orders rise ~20% (inventory build). Built into all dealers.

**Defaults are probabilistic**, not pre-assigned. Triggered in months 10-11 based on archetype + defaultRisk. Anchor B dealers have 30% higher defaultRisk. Typically 2-5 dealers out of 100 default per run.

---

## Missing Data Handling

| Situation | What happens |
|-----------|-------------|
| New dealer (< 3 months history) | Analyzed with low confidence, score scaled down |
| Less than 6 months | Volatility and seasonal patterns flagged as unreliable |
| Zero orders but payments happening | Flagged as anomaly — possible non-anchor activity or data gap |
| No transaction history at all | Tier = UNKNOWN, excluded from ranking |
| Missing payment data | Forward-fill with 1-month decay, treat as yellow flag |

Data quality assumptions: monthly transaction data is always available, payment amounts are accurate, order data is clean, no reversals.
