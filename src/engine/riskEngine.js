/**
 * Risk Classification & Scoring Engine
 * Implements deterministic thresholds + 30-day default probability scoring
 */

const RISK_TIERS = {
  HEALTHY: { value: 1, score: 5, color: "#28a745" },
  WATCH: { value: 2, score: 25, color: "#ffc107" },
  AT_RISK: { value: 3, score: 60, color: "#fd7e14" },
  CRITICAL: { value: 4, score: 100, color: "#dc3545" },
};

const THRESHOLDS = {
  DPO_HEALTHY: 50,
  DPO_WATCH: 65,
  DPO_CRITICAL: 90,

  UTILIZATION_HEALTHY: 0.7,
  UTILIZATION_WATCH: 0.8,
  UTILIZATION_CRITICAL: 0.9,

  ORDER_DECLINE_SMALL: 0.1,
  ORDER_DECLINE_MEDIUM: 0.2,
  ORDER_DECLINE_LARGE: 0.4,

  ORDER_VOLATILITY_WATCH: 0.15,
  ORDER_VOLATILITY_CRITICAL: 0.25,

  LATE_PAYMENT_THRESHOLD_WATCH: 1,
  LATE_PAYMENT_THRESHOLD_CRITICAL: 3,

  // Velocity thresholds (month-over-month change)
  DPO_VELOCITY_WARNING: 10, // DPO jumped 10+ days in one month
  DPO_VELOCITY_CRITICAL: 20, // DPO jumped 20+ days → emergency

  // Payment coverage
  PAYMENT_COVERAGE_WARNING: 0.7, // Paying < 70% of EMI
  PAYMENT_COVERAGE_CRITICAL: 0.3, // Paying < 30% of EMI
};

/**
 * Seasonal adjustment factors for order comparison.
 * Used to normalize order values when comparing across months.
 * E.g., Q1 orders are naturally lower — don't penalize for that.
 */
const SEASONAL_FACTORS = {
  0: 0.85,
  1: 0.85,
  2: 0.85, // Jan-Mar: low season
  3: 1.0,
  4: 1.0,
  5: 1.0, // Apr-Jun: normal
  6: 1.0,
  7: 1.0,
  8: 1.0, // Jul-Sep: normal
  9: 1.2,
  10: 1.2,
  11: 1.2, // Oct-Dec: high season
};

/**
 * Calculate metrics from transaction history.
 * Handles missing data gracefully — returns partial metrics with confidence flags.
 */
function calculateMetrics(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      status: "NO_DATA",
      confidence: 0,
      daysPayableOutstanding: null,
      utilization: null,
      orderDeclinePercent: null,
      seasonalAdjustedOrderDecline: null,
      orderVolatility: null,
      dpoDifference: null,
      dpoVelocity: null,
      latePaymentCount: null,
      paymentCoverage: null,
      totalOrderValue: null,
      currentBalance: null,
      monthlyEMI: null,
      paymentReceived: null,
      monthsAvailable: 0,
    };
  }

  const monthsAvailable = transactions.length;

  // Current month (last transaction)
  const current = transactions[transactions.length - 1];

  // Confidence based on data availability (0-1)
  // Full confidence at 6+ months, partial below
  const confidence = Math.min(1.0, monthsAvailable / 6);

  // Last 3 months for trends (or whatever we have)
  const last3 = transactions.slice(-Math.min(3, monthsAvailable));
  const last3avg =
    last3.reduce((sum, t) => sum + t.totalOrderValue, 0) / last3.length;

  // --- Seasonal-adjusted order decline ---
  // Compare same-season-adjusted values to avoid penalizing natural Q1 dips vs Q4 highs
  let orderDeclinePercent = 0;
  let seasonalAdjustedOrderDecline = 0;

  if (monthsAvailable >= 4) {
    // Use months 2-4 as baseline (enough history, not the very first month)
    const baselineMonths = transactions.slice(1, 4);
    const recentMonths = transactions.slice(-3);

    const rawBaseline =
      baselineMonths.reduce((sum, t) => sum + t.totalOrderValue, 0) /
      baselineMonths.length;
    const rawRecent =
      recentMonths.reduce((sum, t) => sum + t.totalOrderValue, 0) /
      recentMonths.length;

    orderDeclinePercent =
      rawBaseline > 0 ? (rawBaseline - rawRecent) / rawBaseline : 0;

    // Seasonal-adjusted: normalize each month's value by its seasonal factor
    const adjustedBaseline =
      baselineMonths.reduce((sum, t) => {
        const factor = SEASONAL_FACTORS[t.monthIndex] || 1.0;
        return sum + t.totalOrderValue / factor;
      }, 0) / baselineMonths.length;

    const adjustedRecent =
      recentMonths.reduce((sum, t) => {
        const factor = SEASONAL_FACTORS[t.monthIndex] || 1.0;
        return sum + t.totalOrderValue / factor;
      }, 0) / recentMonths.length;

    seasonalAdjustedOrderDecline =
      adjustedBaseline > 0
        ? (adjustedBaseline - adjustedRecent) / adjustedBaseline
        : 0;
  }

  // --- Volatility (std dev / mean of last 6 months, seasonal-adjusted) ---
  const last6 = transactions.slice(-Math.min(6, monthsAvailable));
  const adjustedOrders = last6.map(
    (t) => t.totalOrderValue / (SEASONAL_FACTORS[t.monthIndex] || 1.0),
  );
  const avgAdjustedOrder =
    adjustedOrders.reduce((a, b) => a + b, 0) / adjustedOrders.length;
  const variance =
    adjustedOrders.reduce(
      (sum, val) => sum + Math.pow(val - avgAdjustedOrder, 2),
      0,
    ) / adjustedOrders.length;
  const volatility =
    avgAdjustedOrder > 0 ? Math.sqrt(variance) / avgAdjustedOrder : 0;

  // --- DPO trend and velocity ---
  let dpoDiff = 0;
  let dpoVelocity = 0;

  if (monthsAvailable >= 4) {
    const baselineDPO =
      transactions
        .slice(1, 4)
        .reduce((sum, t) => sum + t.daysPayableOutstanding, 0) / 3;
    const recentDPO =
      last3.reduce((sum, t) => sum + t.daysPayableOutstanding, 0) /
      last3.length;
    dpoDiff = recentDPO - baselineDPO;
  }

  if (monthsAvailable >= 2) {
    const prevMonth = transactions[transactions.length - 2];
    dpoVelocity =
      current.daysPayableOutstanding - prevMonth.daysPayableOutstanding;
  }

  // --- Late payments in last 3 months ---
  const latePaymentCount = last3.filter((t) => t.isLatePayment).length;

  // --- Payment coverage (last month: payment / EMI) ---
  const paymentCoverage =
    current.expectedMonthlyEMI > 0
      ? current.paymentReceived / current.expectedMonthlyEMI
      : 1.0;

  return {
    status: "OK",
    confidence,
    monthsAvailable,
    daysPayableOutstanding: current.daysPayableOutstanding,
    utilization: current.utilization,
    orderDeclinePercent,
    seasonalAdjustedOrderDecline,
    orderVolatility: volatility,
    dpoDifference: dpoDiff,
    dpoVelocity,
    latePaymentCount,
    paymentCoverage,
    totalOrderValue: current.totalOrderValue,
    currentBalance: current.currentBalance,
    monthlyEMI: current.expectedMonthlyEMI,
    paymentReceived: current.paymentReceived,
  };
}

/**
 * Classify dealer into risk tier using deterministic thresholds
 */
function classifyDealerTier(metrics) {
  const signals = {
    dpo: null,
    utilization: null,
    latePayments: null,
    orderTrend: null,
    volatility: null,
    dpoVelocity: null,
    paymentCoverage: null,
  };

  let tierScore = 0;

  // --- DPO signal ---
  if (metrics.daysPayableOutstanding >= THRESHOLDS.DPO_CRITICAL) {
    signals.dpo = "CRITICAL";
    tierScore += 100;
  } else if (metrics.daysPayableOutstanding >= THRESHOLDS.DPO_WATCH) {
    signals.dpo = "WATCH";
    tierScore += 40;
  } else if (metrics.daysPayableOutstanding <= THRESHOLDS.DPO_HEALTHY) {
    signals.dpo = "HEALTHY";
  }

  // --- Utilization signal ---
  if (metrics.utilization >= THRESHOLDS.UTILIZATION_CRITICAL) {
    signals.utilization = "CRITICAL";
    tierScore += 80;
  } else if (metrics.utilization >= THRESHOLDS.UTILIZATION_WATCH) {
    signals.utilization = "WATCH";
    tierScore += 30;
  } else {
    signals.utilization = "HEALTHY";
  }

  // --- Late payment signal (last 90 days) ---
  if (metrics.latePaymentCount >= THRESHOLDS.LATE_PAYMENT_THRESHOLD_CRITICAL) {
    signals.latePayments = "CRITICAL";
    tierScore += 70;
  } else if (
    metrics.latePaymentCount >= THRESHOLDS.LATE_PAYMENT_THRESHOLD_WATCH
  ) {
    signals.latePayments = "WATCH";
    tierScore += 20;
  } else {
    signals.latePayments = "HEALTHY";
  }

  // --- Order trend signal (seasonal-adjusted) ---
  const decline = metrics.seasonalAdjustedOrderDecline;
  if (decline !== null && decline !== undefined) {
    if (decline > THRESHOLDS.ORDER_DECLINE_LARGE) {
      signals.orderTrend = "CRITICAL";
      tierScore += 60;
    } else if (decline > THRESHOLDS.ORDER_DECLINE_MEDIUM) {
      signals.orderTrend = "WATCH";
      tierScore += 25;
    } else if (decline > THRESHOLDS.ORDER_DECLINE_SMALL) {
      signals.orderTrend = "AT_RISK";
      tierScore += 15;
    } else {
      signals.orderTrend = "HEALTHY";
    }
  }

  // --- Volatility signal (seasonal-adjusted) ---
  if (
    metrics.orderVolatility !== null &&
    metrics.orderVolatility !== undefined
  ) {
    if (metrics.orderVolatility > THRESHOLDS.ORDER_VOLATILITY_CRITICAL) {
      signals.volatility = "CRITICAL";
      tierScore += 30;
    } else if (metrics.orderVolatility > THRESHOLDS.ORDER_VOLATILITY_WATCH) {
      signals.volatility = "WATCH";
      tierScore += 15;
    } else {
      signals.volatility = "HEALTHY";
    }
  }

  // --- DPO velocity signal (month-over-month jump) ---
  if (metrics.dpoVelocity !== null && metrics.dpoVelocity !== undefined) {
    if (metrics.dpoVelocity >= THRESHOLDS.DPO_VELOCITY_CRITICAL) {
      signals.dpoVelocity = "CRITICAL";
      tierScore += 50; // Emergency signal
    } else if (metrics.dpoVelocity >= THRESHOLDS.DPO_VELOCITY_WARNING) {
      signals.dpoVelocity = "WATCH";
      tierScore += 20;
    } else {
      signals.dpoVelocity = "HEALTHY";
    }
  }

  // --- Payment coverage signal ---
  if (
    metrics.paymentCoverage !== null &&
    metrics.paymentCoverage !== undefined
  ) {
    if (metrics.paymentCoverage < THRESHOLDS.PAYMENT_COVERAGE_CRITICAL) {
      signals.paymentCoverage = "CRITICAL";
      tierScore += 60;
    } else if (metrics.paymentCoverage < THRESHOLDS.PAYMENT_COVERAGE_WARNING) {
      signals.paymentCoverage = "WATCH";
      tierScore += 20;
    } else {
      signals.paymentCoverage = "HEALTHY";
    }
  }

  // --- Determine tier based on signals and score ---
  let tier = "HEALTHY";

  // Reduce tier score if data is sparse
  if (metrics.confidence < 0.5) {
    tierScore = Math.round(tierScore * metrics.confidence);
  }

  // Any single CRITICAL signal → CRITICAL tier
  if (
    signals.dpo === "CRITICAL" ||
    signals.utilization === "CRITICAL" ||
    signals.latePayments === "CRITICAL" ||
    signals.orderTrend === "CRITICAL" ||
    signals.dpoVelocity === "CRITICAL" ||
    signals.paymentCoverage === "CRITICAL"
  ) {
    tier = "CRITICAL";
  } else if (tierScore >= 60) {
    tier = "AT_RISK";
  } else if (tierScore >= 25) {
    tier = "WATCH";
  }

  return {
    tier,
    tierScore,
    signals,
  };
}

/**
 * Calculate 30-day default probability.
 *
 * This is a forward-looking score (0.0 – 1.0) estimating likelihood of default
 * in the next 30 days, based on:
 *   1. Current DPO proximity to 90-day default threshold
 *   2. DPO velocity (how fast it's worsening)
 *   3. Payment coverage trend (are they paying less of their EMI?)
 *   4. Order trajectory (declining business = declining repayment capacity)
 *   5. Utilization pressure (maxed-out credit = no buffer)
 *
 * WHY DETERMINISTIC (not ML):
 *   With 100 synthetic dealers and ~2-5 actual defaults, we don't have enough
 *   labeled data to train a model. A weighted logistic-like formula with domain
 *   priors is more appropriate. Once 6+ months of live data with actual defaults
 *   exist, replace this with a trained logistic regression.
 */
function calculate30DayDefaultProbability(metrics) {
  if (!metrics || metrics.status === "NO_DATA") return 0;

  let logit = -3.0; // Base: low default probability (~5%)

  // 1. DPO proximity to default (90 days)
  //    DPO 90+ → already defaulted, prob ~1.0
  //    DPO 70-89 → danger zone
  const dpo = metrics.daysPayableOutstanding || 0;
  if (dpo >= 90) {
    logit += 4.0;
  } else if (dpo >= 75) {
    logit += 2.5 + ((dpo - 75) / 15) * 1.5;
  } else if (dpo >= 60) {
    logit += 1.0 + ((dpo - 60) / 15) * 1.5;
  } else if (dpo >= 50) {
    logit += 0.3;
  }

  // 2. DPO velocity — fast-worsening DPO is a strong predictor
  const velocity = metrics.dpoVelocity || 0;
  if (velocity >= 20) {
    logit += 1.5;
  } else if (velocity >= 10) {
    logit += 0.8;
  } else if (velocity >= 5) {
    logit += 0.3;
  }

  // 3. Payment coverage — not paying EMI is a direct default precursor
  const coverage = metrics.paymentCoverage;
  if (coverage !== null && coverage !== undefined) {
    if (coverage < 0.1) {
      logit += 2.0; // Near-zero payment
    } else if (coverage < 0.3) {
      logit += 1.2;
    } else if (coverage < 0.7) {
      logit += 0.5;
    }
  }

  // 4. Order decline (seasonal-adjusted) — proxy for business health
  const decline = metrics.seasonalAdjustedOrderDecline || 0;
  if (decline > 0.5) {
    logit += 1.2;
  } else if (decline > 0.3) {
    logit += 0.6;
  } else if (decline > 0.15) {
    logit += 0.2;
  }

  // 5. Utilization — maxed credit with declining orders = stress
  const util = metrics.utilization || 0;
  if (util > 0.9 && decline > 0.15) {
    logit += 0.8; // Combined stress signal
  } else if (util > 0.9) {
    logit += 0.3;
  }

  // 6. Late payment pattern — consistent lates compound risk
  const lates = metrics.latePaymentCount || 0;
  if (lates >= 3) {
    logit += 1.0;
  } else if (lates >= 2) {
    logit += 0.5;
  }

  // Convert logit to probability via sigmoid
  const probability = 1.0 / (1.0 + Math.exp(-logit));

  // Scale by data confidence (less history = lower confidence in prediction)
  const confidence = metrics.confidence || 1.0;
  return Math.round(probability * confidence * 1000) / 1000;
}

/**
 * Analyze dealer and generate risk assessment.
 * Handles missing data: dealers with < 3 months get partial analysis with low confidence.
 */
function analyzeDealerRisk(dealer, transactions) {
  const metrics = calculateMetrics(transactions);

  // No data at all
  if (metrics.status === "NO_DATA") {
    return {
      dealerId: dealer.id,
      dealerName: dealer.name,
      anchorId: dealer.anchorId,
      profile: dealer.profile,
      tier: "UNKNOWN",
      tierScore: 0,
      defaultProbability: 0,
      metrics: {
        ...metrics,
        missingDataFlags: ["No transaction history available"],
      },
      signals: {},
      explanation:
        "No transaction data available for this dealer. Cannot assess risk.",
    };
  }

  // Partial data (1-2 months) — still analyze but flag low confidence
  const missingDataFlags = [];
  if (metrics.monthsAvailable < 3) {
    missingDataFlags.push(
      `Only ${metrics.monthsAvailable} month(s) of data — trend analysis unreliable`,
    );
  }
  if (metrics.monthsAvailable < 6) {
    missingDataFlags.push(
      "Less than 6 months of history — volatility and seasonal patterns may be inaccurate",
    );
  }

  // Check for data gaps: months with zero orders but payments happening
  const zeroOrderMonths = transactions.filter(
    (t) => t.totalOrderValue === 0 || t.orderCount === 0,
  );
  const paidButNoOrders = zeroOrderMonths.filter((t) => t.paymentReceived > 0);
  if (paidButNoOrders.length > 0) {
    missingDataFlags.push(
      `${paidButNoOrders.length} month(s) with payments but no recorded orders — possible data gap or non-anchor activity`,
    );
  }

  const classification = classifyDealerTier(metrics);
  const defaultProbability = calculate30DayDefaultProbability(metrics);

  return {
    dealerId: dealer.id,
    dealerName: dealer.name,
    anchorId: dealer.anchorId,
    profile: dealer.profile,
    tier: classification.tier,
    tierScore: classification.tierScore,
    defaultProbability,
    signals: classification.signals,
    metrics: { ...metrics, missingDataFlags },
    createdAt: dealer.createdAt,
    lastUpdated: transactions[transactions.length - 1].month,
  };
}

/**
 * Generate human-readable explanation for a dealer flag
 */
function generateExplanation(assessment) {
  const { tier, signals, metrics, defaultProbability } = assessment;

  const explanation = [];

  if (tier === "CRITICAL") {
    explanation.push(
      `CRITICAL: ${assessment.dealerName} is showing severe distress signals.`,
    );
  } else if (tier === "AT_RISK") {
    explanation.push(
      `AT RISK: ${assessment.dealerName} is showing multiple concerning indicators.`,
    );
  } else if (tier === "WATCH") {
    explanation.push(`WATCH: ${assessment.dealerName} requires monitoring.`);
  } else if (tier === "UNKNOWN") {
    explanation.push(
      `INSUFFICIENT DATA: ${assessment.dealerName} — cannot reliably assess risk.`,
    );
    return explanation.join(" ");
  }

  // 30-day default probability
  if (defaultProbability > 0.5) {
    explanation.push(
      `• 30-day default probability: ${(defaultProbability * 100).toFixed(0)}% (HIGH).`,
    );
  } else if (defaultProbability > 0.2) {
    explanation.push(
      `• 30-day default probability: ${(defaultProbability * 100).toFixed(0)}% (ELEVATED).`,
    );
  }

  // DPO
  if (signals.dpo === "CRITICAL") {
    explanation.push(
      `• Payment delay: DPO is ${Math.round(metrics.daysPayableOutstanding)} days (critical threshold: 90+ days).`,
    );
  } else if (signals.dpo === "WATCH") {
    explanation.push(
      `• Payment slowdown: DPO has risen to ${Math.round(metrics.daysPayableOutstanding)} days (warning threshold: 65+ days).`,
    );
  }

  // DPO velocity
  if (signals.dpoVelocity === "CRITICAL") {
    explanation.push(
      `• Rapid DPO acceleration: DPO jumped ${Math.round(metrics.dpoVelocity)} days in one month (emergency signal).`,
    );
  } else if (signals.dpoVelocity === "WATCH") {
    explanation.push(
      `• DPO acceleration: DPO increased ${Math.round(metrics.dpoVelocity)} days month-over-month.`,
    );
  }

  // Utilization
  if (signals.utilization === "CRITICAL") {
    explanation.push(
      `• High leverage: Loan utilization is ${(metrics.utilization * 100).toFixed(1)}% (critical: >90%).`,
    );
  } else if (signals.utilization === "WATCH") {
    explanation.push(
      `• Rising leverage: Utilization has climbed to ${(metrics.utilization * 100).toFixed(1)}% (warning: >80%).`,
    );
  }

  // Late payments
  if (signals.latePayments === "CRITICAL") {
    explanation.push(
      `• Payment failures: ${metrics.latePaymentCount} late payment incidents in last 3 months.`,
    );
  } else if (signals.latePayments === "WATCH") {
    explanation.push(
      `• Delayed payments: ${metrics.latePaymentCount} late payment incident(s) in last 3 months.`,
    );
  }

  // Payment coverage
  if (signals.paymentCoverage === "CRITICAL") {
    explanation.push(
      `• EMI underpayment: Only paying ${(metrics.paymentCoverage * 100).toFixed(0)}% of expected EMI (critical: <30%).`,
    );
  } else if (signals.paymentCoverage === "WATCH") {
    explanation.push(
      `• Partial EMI: Paying ${(metrics.paymentCoverage * 100).toFixed(0)}% of expected EMI (warning: <70%).`,
    );
  }

  // Order trend (seasonal-adjusted)
  if (signals.orderTrend === "CRITICAL") {
    const decline = Math.abs(metrics.seasonalAdjustedOrderDecline * 100);
    explanation.push(
      `• Business decline: Orders dropped ${decline.toFixed(1)}% (seasonal-adjusted, 3-month vs baseline).`,
    );
  } else if (signals.orderTrend === "WATCH") {
    const decline = Math.abs(metrics.seasonalAdjustedOrderDecline * 100);
    explanation.push(
      `• Slower activity: Orders declining by ${decline.toFixed(1)}% (seasonal-adjusted).`,
    );
  }

  // Volatility
  if (signals.volatility === "CRITICAL") {
    explanation.push(
      `• Erratic behavior: Order volatility is ${(metrics.orderVolatility * 100).toFixed(1)}% (suggests cash stress).`,
    );
  } else if (signals.volatility === "WATCH") {
    explanation.push(
      `• Inconsistent orders: Volatility ${(metrics.orderVolatility * 100).toFixed(1)}% in order patterns.`,
    );
  }

  // Missing data warnings
  if (metrics.missingDataFlags && metrics.missingDataFlags.length > 0) {
    explanation.push(`• Data quality: ${metrics.missingDataFlags.join("; ")}.`);
  }

  return explanation.join(" ");
}

module.exports = {
  RISK_TIERS,
  THRESHOLDS,
  classifyDealerTier,
  calculateMetrics,
  calculate30DayDefaultProbability,
  analyzeDealerRisk,
  generateExplanation,
};
