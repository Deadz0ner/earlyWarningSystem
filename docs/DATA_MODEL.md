# Data Model & Monitoring Points

## Database Schema

### 1. Dealers Table

Core information about each dealer in the portfolio.

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

**Fields:**

- **id:** Unique dealer identifier (1–100)
- **name:** Dealer name (e.g., Dealer_042)
- **anchorId:** Anchor relationship (ANCHOR_A or ANCHOR_B) — exclusive
- **profile:** Credit profile (PREMIUM, GOOD, FAIR, HIGHRISK)
- **sanctionedLimit:** Sanctioned loan limit in INR (₹15L–₹60L)
- **baselineDPO:** Typical Days Payable Outstanding for this dealer (25–70 days)
- **defaultRisk:** Annual default probability (0.01–0.25)
- **createdAt:** Account opening date (fixed: 2025-01-01)

---

### 2. Transactions Table

Monthly transaction-level data for each dealer.

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealerId INTEGER NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  monthIndex INTEGER NOT NULL,

  -- Account metrics
  sanctionedLimit REAL NOT NULL,
  currentBalance REAL NOT NULL,
  utilization REAL NOT NULL,

  -- Purchasing behavior
  orderCount INTEGER NOT NULL,
  totalOrderValue REAL NOT NULL,
  avgOrderValue REAL NOT NULL,

  -- Payment behavior
  daysPayableOutstanding INTEGER NOT NULL,
  expectedMonthlyEMI REAL NOT NULL,
  paymentReceived REAL NOT NULL,
  latePaymentCount INTEGER NOT NULL,

  -- Flags
  isLatePayment BOOLEAN NOT NULL,
  isDefault BOOLEAN NOT NULL,

  FOREIGN KEY (dealerId) REFERENCES dealers(id)
)
```

**Fields:**

| Column                 | Type    | Description                        | Example |
| ---------------------- | ------- | ---------------------------------- | ------- |
| dealerId               | INT     | Reference to dealer                | 42      |
| month                  | TEXT    | Month name                         | "Jan"   |
| year                   | INT     | Year                               | 2025    |
| monthIndex             | INT     | 0–11 (Jan=0, Dec=11)               | 5       |
| sanctionedLimit        | REAL    | Dealer's sanctioned limit (static) | 400000  |
| currentBalance         | REAL    | Drawn amount this month            | 320000  |
| utilization            | REAL    | Balance / sanctionedLimit          | 0.80    |
| orderCount             | INT     | # of purchase orders placed        | 8       |
| totalOrderValue        | REAL    | Sum of all orders this month       | 60000   |
| avgOrderValue          | REAL    | Mean per order                     | 7500    |
| daysPayableOutstanding | INT     | Avg days to clear invoices         | 45      |
| expectedMonthlyEMI     | REAL    | Scheduled EMI for month            | 40000   |
| paymentReceived        | REAL    | Actual payment received            | 40000   |
| latePaymentCount       | INT     | # of late payment incidents        | 0       |
| isLatePayment          | BOOLEAN | Any late payment this month?       | false   |
| isDefault              | BOOLEAN | Is dealer in default?              | false   |

---

### 3. Risk Assessments Table

Latest risk assessment for each dealer (updated after each analysis run).

```sql
CREATE TABLE risk_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealerId INTEGER NOT NULL UNIQUE,
  dealerName TEXT NOT NULL,
  anchorId TEXT NOT NULL,
  profile TEXT NOT NULL,
  tier TEXT NOT NULL,
  tierScore INTEGER NOT NULL,
  defaultProbability REAL DEFAULT 0,
  metrics TEXT NOT NULL,        -- JSON
  signals TEXT NOT NULL,        -- JSON
  explanation TEXT,
  llmExplanation TEXT,
  analyzedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealerId) REFERENCES dealers(id)
)
```

**Notes:**
- `dealerId` has a `UNIQUE` constraint — re-running analysis uses `INSERT OR REPLACE` (upsert) to update existing rows rather than creating duplicates.
- `llmExplanation` stores the LLM-generated narrative separately from the deterministic `explanation`.

---

## Key Metrics & Definitions

### 1. Days Payable Outstanding (DPO)

**Definition:** Average number of days it takes the dealer to pay an invoice.

**Calculation:**

```
DPO = (Accounts Payable / Cost of Goods Sold) × Days in Period = (unpaid amount) / (average daily purchases)
```

_Simplified in synthetic data: modeled as distribution per dealer with seasonal & deterioration factors_

**Why Track:** Earliest indicator of cash flow stress. Before payment is missed entirely, DPO extends. Monthly metric = high frequency for early detection. RBI defines 90+ days as NPA (Non-Performing Asset).

---

### 2. Utilization Rate

**Definition:** Percentage of sanctioned limit currently drawn. `Utilization = Current Balance / Sanctioned Limit`

**Why Track:** Concentration risk (if dealer defaults, NBFC exposure = utilization % of limit). Stress indicator — dealers draw more as business deteriorates. Constraint signal — high utilization means no buffer for emergencies.

---

### 3. Order Value & Frequency

**Definition:** Volume and value of purchase orders placed by dealer.

**Calculations:**
- `Monthly Order Value = Sum of all order invoices`
- `Average Order Value = Total Order Value / Order Count`
- `Order Volatility = Std Dev of last 6 months (seasonal-adjusted) / Mean`

**Why Track:** Orders are a proxy for retail demand. Declining orders precede payment stress. Volatility suggests unstable cash flows.

---

### 4. Payment Consistency (DPO Trend & Velocity)

**Definition:** Month-over-month change in DPO.

**Why Track:** Trend is a stronger signal than point-in-time DPO. Velocity (rate of change) matters: DPO 60→65 is very different from 50→75. Catches emerging stress before hitting hard thresholds.

---

### 5. Late Payment Incidents

**Definition:** Count of months with late payments, tracked over a 90-day rolling window.

**Why Track:** Hard evidence of payment failure (not just slowdown). Patterns indicate systemic problems vs. one-time delays.

---

For the exact thresholds that map these metrics to risk tiers (HEALTHY/WATCH/AT_RISK/CRITICAL), see [CLASSIFICATION_LOGIC.md](CLASSIFICATION_LOGIC.md).

---

## Synthetic Data Patterns

### Seasonal Patterns

Dealers exhibit realistic seasonal behavior:

```
Q1 (Jan–Mar):  Orders ↓15%, Utilization ↓ (post-holiday)
Q2 (Apr–Jun):  Orders →, Utilization → (steady)
Q3 (Jul–Sep):  Orders →, Utilization → (steady)
Q4 (Oct–Dec):  Orders ↑20%, Utilization ↑ (inventory build for year-end)
```

This is modeled into each dealer's order values and utilization rates.

---

### Behavioral Archetypes

Five archetypes are assigned once per dealer at creation and govern all 12 months of transaction data:

**1. Stable (55% of portfolio)**

- Consistent behavior throughout the year
- DPO stays near baseline (±5 days)
- Orders follow normal seasonal patterns
- 0 late payments, no default risk

**2. Slow Deterioration (15% of portfolio)**

- Months 1–3: Healthy baseline
- Months 4–8: Gradual decline (trend factor drops from 1.0 to ~0.6)
- Months 9–11: Approaching critical (DPO rises via 1.0 + (month-5)*0.12 factor)
- Months 10–11: Probabilistic default trigger (based on `defaultRisk * 3`)

**3. Recovery (8% of portfolio)**

- Months 1–2: Normal operations
- Months 3–6: V-shaped dip (trend factor drops to ~0.65)
- Months 7–11: Gradual recovery (trend factor climbs back toward 1.0)
- Simulates dealers that experience temporary stress but bounce back

**4. Sudden Stress (7% of portfolio)**

- Months 1–8: Normal operations (trend factor 1.0)
- Months 9–11: Sharp cliff (trend factor drops to 0.4–0.5)
- DPO factor spikes to 1.3+ in last 3 months
- Months 10–11: Probabilistic default trigger (based on `defaultRisk * 4`)

**5. Seasonal Volatile (15% of portfolio)**

- Exaggerated seasonal swings but mean-reverting
- Q1 dips harder (0.75–0.85), Q4 spikes higher (1.1–1.2)
- Fundamentally healthy — no default trajectory
- Can trigger false positives during low-season months

**Profile-Archetype Interaction:**
- HIGHRISK dealers have a 40% chance of being reassigned to SLOW_DETERIORATION
- PREMIUM dealers with SLOW_DETERIORATION are rerolled to STABLE (70%) or SEASONAL_VOLATILE (30%)

---

### Default Simulation

Defaults are **probabilistic**, not pre-assigned. Whether a dealer defaults depends on their archetype and profile:

- **SLOW_DETERIORATION** dealers: In months 10–11, default triggers with probability `defaultRisk * 3`
- **SUDDEN_STRESS** dealers: In months 10–11, default triggers with probability `defaultRisk * 4`
- **Other archetypes**: Very rare random defaults in months 9+ with probability `defaultRisk * 0.3`
- **Anchor B** dealers have 30% higher `defaultRisk` than Anchor A

**When default triggers:**
- Payment stops (`paymentReceived = 0`)
- Orders near-collapse (5–10% of normal)
- DPO spikes via 1.8–2.2x factor (capped at 95 days)
- Multiple late payment incidents

**Expected defaults:** Varies per run due to randomness, but typically 2–5 dealers out of 100.

**Ground Truth:** Used to measure false positive rate during evaluation.

---

## Derived Features (Calculated At Analysis Time)

### 1. DPO Trend (3-month comparison)

```
dpoTrend = DPO_last3months_avg - DPO_first3months_avg
```

- **Result > 0:** Worsening (positive = bad)
- **Result ≈ 0:** Stable
- **Result < 0:** Improving

### 2. Order Decline Percent

```
orderDeclinePercent = (OrderValue_first3months - OrderValue_last3months) / OrderValue_first3months
```

- **Result > 0.4:** Severe decline (orders collapsed)
- **Result > 0.2:** Significant decline
- **Result > 0.1:** Minor decline
- **Result ≈ 0:** Stable

### 3. Order Volatility (Coefficient of Variation)

```
volatility = StdDev(last_6_months_orders) / Mean(last_6_months_orders)
```

- **Result > 0.25:** High volatility (erratic behavior)
- **Result > 0.15:** Moderate volatility
- **Result < 0.15:** Low volatility (consistent)

**Why Volatility Matters:**

- High volatility suggests cash constraints (dealer can't maintain steady orders)
- Erratic patterns indicate loss of control / distress
- Consistency is hallmark of healthy dealer

---

## Data Quality Assumptions

### What I Assume is Always Available

- Monthly transaction data (no gaps)
- Payment amounts
- Sanctioned limits (fixed per dealer)
- Order data

### What I Assume is Clean

- Order dates, amounts, quantities are accurate
- Payments are correctly recorded (no reversals)
- No data entry errors in core fields

### Handling Edge Cases

| Case                           | Treatment                                            |
| ------------------------------ | ---------------------------------------------------- |
| New dealer (<2 months history) | Flag as "INSUFFICIENT_DATA"; don't rank              |
| Missing payment data           | Assume no payment made; treat as late                |
| Missing order data             | Assume no orders; treat as severe signal             |
| Zero orders in a month         | If seasonal, adjust baseline; if anomalous, escalate |
| Dealer with no transactions    | Remove from analysis                                 |

---

## Summary: Why This Model?

### Simplicity & Transparency

- Data model is minimal (3 tables)
- Metrics are directly observable (not derived from complex formulas)
- Ops teams can verify numbers in the data and understand the logic

### Forward-Looking Signals

- DPO & orders are _leading_ indicators (change before default)
- Late payments are confirming indicator (already stressed)
- Volatility captures uncertainty / loss of control

### Real-World Alignment

- NBFC default signals: payment slowdown, demand loss, leverage stress
- This model captures all three
- Parameters calibrated to typical dealer financing

### Extensibility

- Easy to add more metrics later (cash conversion cycle, inventory turns, etc.)
- Foundation for ML models once I have default history
