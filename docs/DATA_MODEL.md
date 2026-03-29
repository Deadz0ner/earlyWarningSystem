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
- **defaultRisk:** Annual default probability (0.005–0.25)
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
  dealerId INTEGER NOT NULL,
  dealerName TEXT NOT NULL,
  anchorId TEXT NOT NULL,
  profile TEXT NOT NULL,
  tier TEXT NOT NULL,
  tierScore INTEGER NOT NULL,
  defaultProbability FLOAT NOT NULL,
  metrics TEXT NOT NULL,        -- JSON
  signals TEXT NOT NULL,        -- JSON
  explanation TEXT,
  analyzedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealerId) REFERENCES dealers(id)
)
```

---

## Key Metrics & Definitions

### 1. Days Payable Outstanding (DPO)

**Definition:** Average number of days it takes the dealer to pay an invoice.

**Calculation:**

```
DPO = (Accounts Payable / Cost of Goods Sold) × Days in Period = (unpaid amount) / (average daily purchases)
```

_Simplified in synthetic data: modeled as distribution per dealer with seasonal & deterioration factors_

**Interpretation:**

- **25–35 days:** Normal, premium dealers
- **35–50 days:** Acceptable, typical range
- **50–70 days:** Concerning, early warning
- **70–90 days:** High risk, escalate
- **90+ days:** DEFAULT, intervention required

**Why Track:**

- Earliest indicator of cash flow stress
- Before payment is missed entirely, DPO extends
- Monthly metric = high frequency for early detection

---

### 2. Utilization Rate

**Definition:** Percentage of sanctioned limit currently drawn.

**Calculation:**

```
Utilization = Current Balance / Sanctioned Limit
```

**Interpretation:**

- **<70%:** Healthy, normal working capital usage
- **70–80%:** Rising leverage, monitor
- **80–90%:** High leverage, dealer may be over-extended
- **>90%:** Critical, dealer maxed out on credit

**Why Track:**

- Concentration risk (if dealer defaults, NBFC loses X% of portfolio)
- Stress indicator (dealers draw more as business deteriorates)
- Constraint signal (dealer can't adjust drawdown if needed)

---

### 3. Order Value & Frequency

**Definition:** Volume and value of purchase orders placed by dealer.

**Calculation:**

```
Monthly Order Value = Sum of all order invoices
Average Order Value = Total Order Value / Order Count
Order Volatility = Std Dev of last 6 months / Mean
```

**Interpretation (Month-over-Month Decline):**

- **0–10%:** Healthy, normal variation
- **10–20%:** Slight decline, monitor seasonality
- **20–40%:** Significant decline, watch trend
- **>40%:** Severe collapse, critical signal

**Why Track:**

- Orders = proxy for dealer's retail demand
- Declining orders → losing customers or losing to competitors
- Sudden drop → unexpected shock (job loss, lockdown, supplier switch)
- Before default, business activity falls _first_

---

### 4. Payment Consistency (Trend)

**Definition:** Month-over-month change in DPO.

**Interpretation:**

- **DPO ↓:** Improving; dealer paying faster
- **DPO →:** Stable; consistent behavior
- **DPO ↑:** Worsening; dealer paying slower (early stress signal)

**Critical Thresholds:**

- DPO increase >15 days in one month → escalate risk tier
- DPO jump >20 days in one month → escalate directly to CRITICAL

**Why Track:**

- Trend is stronger signal than point-in-time metric
- Velocity (rate of change) matters: DPO 60→65 is different from 50→75
- Catches emerging stress before hitting hard threshold

---

### 5. Late Payment Incidents

**Definition:** Count of months where payment arrived after expected date.

**Tracked Over:**

- 30-day window (current month)
- 90-day window (last 3 months)
- 180-day window (last 6 months)

**Interpretation:**

- **0 incidents:** Reliable payer
- **1 incident (90d):** Minor slip, watch
- **2 incidents (90d):** Concerning pattern emerging
- **3+ incidents (90d):** High risk, likely systemic issue

**Why Track:**

- Hard evidence of payment failure (not just slowdown)
- Patterns indicate systemic problem vs. one-time delay
- Repeated lates = behavioral signal of financial stress

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

### Deterioration Trajectories

Three types of dealers modeled:

**1. Healthy Throughout (60% of portfolio)**

- Stable DPO (within ±5 days)
- Consistent orders (month-to-month variance <10%)
- 0 late payments
- No default risk

**2. Slow Deterioration (15% of portfolio)**

- Months 1–4: Healthy baseline
- Months 5–8: DPO +10d/month, orders ↓5% per month
- Months 9–12: Approaching critical (DPO 70–85d, orders ↓30%)
- High likelihood of default in month 12

**3. Sudden Stress (5% of portfolio)**

- Months 1–8: Healthy
- Month 9: Sharp shock (DPO jump +25d, orders ↓40%)
- Months 10–12: Attempts recovery or defaults
- Simulates unexpected event (job loss, major customer loss)

---

### Default Simulation

2% of dealers (2/100) are assigned to default by month 12:

- **Default month:** Last 2–3 months (high-risk dealers)
- **Signals:**
  - Payment stops (paymentReceived = 0)
  - Orders collapse (totalOrderValue → 0)
  - DPO hits 95+ days (exceeds 90d threshold)
  - Multiple late payment incidents

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

### What We Assume is Always Available

- Monthly transaction data (no gaps)
- Payment amounts
- Sanctioned limits (fixed per dealer)
- Order data

### What We Assume is Clean

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
- Foundation for ML models once we have default history
