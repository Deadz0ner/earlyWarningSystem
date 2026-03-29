/**
 * Synthetic Data Generator for Dealer Portfolio
 * Creates 100 dealers with 12 months of realistic transaction data
 */

// Credit profiles with sanctioned limits and default risks
const CREDIT_PROFILES = {
  PREMIUM: {
    sanctionedLimit: [500000, 600000],
    utilization: [0.6, 0.7],
    baselineDPO: [25, 35],
    defaultRisk: 0.01,
  },
  GOOD: {
    sanctionedLimit: [250000, 450000],
    utilization: [0.65, 0.8],
    baselineDPO: [35, 50],
    defaultRisk: 0.05,
  },
  FAIR: {
    sanctionedLimit: [150000, 350000],
    utilization: [0.7, 0.85],
    baselineDPO: [45, 60],
    defaultRisk: 0.12,
  },
  HIGHRISK: {
    sanctionedLimit: [150000, 300000],
    utilization: [0.75, 0.9],
    baselineDPO: [55, 70],
    defaultRisk: 0.25,
  },
};

const PROFILE_DISTRIBUTION = {
  PREMIUM: 0.15,
  GOOD: 0.5,
  FAIR: 0.25,
  HIGHRISK: 0.1,
};

// Behavioral archetypes assigned once per dealer
const BEHAVIOR_ARCHETYPES = {
  STABLE: 0.55, // Healthy, consistent behavior
  SLOW_DETERIORATION: 0.15, // Gradual decline over months → potential default
  RECOVERY: 0.08, // Dips mid-year, recovers by year-end
  SUDDEN_STRESS: 0.07, // Sharp drop in last 2-3 months
  SEASONAL_VOLATILE: 0.15, // High seasonal swings but fundamentally okay
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Generate random number between min and max
 */
function random(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Assign credit profile based on distribution
 */
function assignProfile() {
  //Weighted random selection (CDF method)
  const roll = Math.random();
  let cumulative = 0;

  for (const [profile, prob] of Object.entries(PROFILE_DISTRIBUTION)) {
    cumulative += prob;
    if (roll <= cumulative) return profile;
  }
  return "GOOD";
}

/**
 * Assign behavioral archetype based on distribution
 */
function assignArchetype() {
  //Weighted random selection (CDF method)
  const roll = Math.random();
  let cumulative = 0;

  for (const [archetype, prob] of Object.entries(BEHAVIOR_ARCHETYPES)) {
    cumulative += prob;
    if (roll <= cumulative) return archetype;
  }
  return "STABLE";
}

/**
 * Create a single dealer with initial parameters
 * Archetype is assigned ONCE here and governs all 12 months
 */
function createDealer(dealerId, anchorId) {
  const profile = assignProfile();
  const profileConfig = CREDIT_PROFILES[profile];
  const archetype = assignArchetype();

  // Higher-risk profiles are more likely to deteriorate
  let finalArchetype = archetype;
  if (profile === "HIGHRISK" && Math.random() < 0.4) {
    finalArchetype = "SLOW_DETERIORATION";
  } else if (profile === "PREMIUM" && archetype === "SLOW_DETERIORATION") {
    // Premium dealers rarely deteriorate — reroll
    finalArchetype = Math.random() < 0.7 ? "STABLE" : "SEASONAL_VOLATILE";
  }

  return {
    id: dealerId,
    name: `Dealer_${String(dealerId).padStart(3, "0")}`,
    anchorId: anchorId,
    profile: profile,
    archetype: finalArchetype,
    sanctionedLimit: random(...profileConfig.sanctionedLimit),
    baselineDPO: random(...profileConfig.baselineDPO),
    defaultRisk: profileConfig.defaultRisk,
    createdAt: "2025-01-01",
  };
}

/**
 * Calculate trend factor for a given month based on dealer's archetype.
 * This is deterministic per (archetype, monthIndex) — no random re-rolling.
 */
function getArchetypeTrendFactor(archetype, monthIndex) {
  switch (archetype) {
    case "STABLE":
      // Small random noise around 1.0 but no systematic trend
      return 1.0;

    case "SLOW_DETERIORATION":
      // Gradual decline starting month 4, accelerating toward year-end
      if (monthIndex < 4) return 1.0;
      // Linear ramp: 1.0 at month 4 → 0.45 at month 11
      return Math.max(0.45, 1.0 - (monthIndex - 4) * 0.07);

    case "RECOVERY":
      // V-shaped: normal → dip months 3-6 → recovery months 7-11
      if (monthIndex < 3) return 1.0;
      if (monthIndex <= 6) return 0.65 + Math.random() * 0.05; // trough
      // Recovery ramp: 0.7 at month 7 → 0.95 at month 11
      return Math.min(1.0, 0.7 + (monthIndex - 7) * 0.06);

    case "SUDDEN_STRESS":
      // Normal for 9 months, then sharp drop
      if (monthIndex < 9) return 1.0;
      // Cliff: drops to 0.4-0.5 in last 3 months
      return 0.5 - (monthIndex - 9) * 0.05;

    case "SEASONAL_VOLATILE":
      // Exaggerated seasonal swings but mean-reverting
      const seasonMap = [
        0.75, 0.8, 0.85, 0.95, 1.0, 1.05, 1.0, 0.95, 1.05, 1.15, 1.2, 1.1,
      ];
      return seasonMap[monthIndex] || 1.0;

    default:
      return 1.0;
  }
}

/**
 * Generate monthly data for a dealer.
 * Uses the dealer's fixed archetype to drive trends — no per-month random archetype rolls.
 */
function generateMonthlyData(dealer, monthIndex) {
  const profile = CREDIT_PROFILES[dealer.profile];
  const baseUtilization = random(...profile.utilization);

  // Seasonal pattern (Q4 high, Q1 low) — applies to all dealers
  const seasonalFactor =
    monthIndex >= 9
      ? 1.2 // Oct, Nov, Dec = +20%
      : monthIndex <= 2
        ? 0.85 // Jan, Feb, Mar = -15%
        : 1.0;

  // Archetype-driven trend (assigned once per dealer)
  const trendFactor = getArchetypeTrendFactor(dealer.archetype, monthIndex);

  // Default detection: deteriorating or sudden-stress dealers may default in late months
  let isDefault = false;
  let dpoFactor = 1.0;
  let ordersAdjustment = 1.0;

  if (
    dealer.archetype === "SLOW_DETERIORATION" &&
    monthIndex >= 10 &&
    Math.random() < dealer.defaultRisk * 3
  ) {
    isDefault = true;
    dpoFactor = 2.0;
    ordersAdjustment = 0.1;
  } else if (
    dealer.archetype === "SUDDEN_STRESS" &&
    monthIndex >= 10 &&
    Math.random() < dealer.defaultRisk * 4
  ) {
    isDefault = true;
    dpoFactor = 2.2;
    ordersAdjustment = 0.05;
  } else if (
    dealer.archetype !== "SLOW_DETERIORATION" &&
    dealer.archetype !== "SUDDEN_STRESS"
  ) {
    // Random default for other archetypes (very rare)
    if (monthIndex >= 9 && Math.random() < dealer.defaultRisk * 0.3) {
      isDefault = true;
      dpoFactor = 1.8;
      ordersAdjustment = 0.1;
    }
  }

  // For deteriorating dealers, DPO naturally worsens even without hitting default
  if (dealer.archetype === "SLOW_DETERIORATION" && monthIndex >= 5) {
    dpoFactor = Math.max(dpoFactor, 1.0 + (monthIndex - 5) * 0.12);
  }
  if (dealer.archetype === "SUDDEN_STRESS" && monthIndex >= 9) {
    dpoFactor = Math.max(dpoFactor, 1.3 + (monthIndex - 9) * 0.2);
  }

  // Utilization: seasonal has muted effect (dealers draw more in Q4 but not proportionally)
  const utilizationSeasonalDampened = 1.0 + (seasonalFactor - 1.0) * 0.3; // e.g., 1.2 → 1.06
  const utilization = Math.max(
    0.3,
    Math.min(0.95, baseUtilization * utilizationSeasonalDampened * trendFactor),
  );
  const currentBalance = dealer.sanctionedLimit * utilization;

  const baselineOrderValue = dealer.sanctionedLimit * 0.15;
  const monthlyOrderValue = Math.max(
    0,
    baselineOrderValue *
      seasonalFactor *
      trendFactor *
      ordersAdjustment *
      random(0.85, 1.15),
  );
  const orderCount = Math.max(
    isDefault ? 0 : 1,
    Math.round((monthlyOrderValue / random(15000, 50000)) * random(0.9, 1.1)),
  );

  // DPO calculation
  const baseDPO = dealer.baselineDPO;
  const monthlyDPO = Math.min(95, baseDPO * dpoFactor * random(0.95, 1.05));

  // Late payment indicators
  let latePaymentCount = 0;
  if (monthlyDPO > 60) {
    latePaymentCount = monthlyDPO > 90 ? 3 : monthlyDPO > 75 ? 2 : 1;
  } else if (Math.random() < 0.05) {
    latePaymentCount = 1;
  }

  // Monthly EMI (8-12% of sanctioned)
  const emiPercentage = random(0.08, 0.12);
  const monthlyEMI = dealer.sanctionedLimit * emiPercentage;

  // Payment amount
  let paymentAmount =
    monthlyEMI + (monthlyDPO > 60 ? random(0, monthlyEMI * 0.3) : 0);
  if (isDefault) {
    paymentAmount = 0;
  }

  return {
    dealerId: dealer.id,
    month: MONTHS[monthIndex],
    year: 2025,
    monthIndex: monthIndex,

    // Account metrics
    sanctionedLimit: dealer.sanctionedLimit,
    currentBalance: currentBalance,
    utilization: utilization,

    // Orders/Purchases
    orderCount: orderCount,
    totalOrderValue: monthlyOrderValue,
    avgOrderValue: monthlyOrderValue / Math.max(1, orderCount),

    // Payment metrics
    daysPayableOutstanding: Math.round(monthlyDPO),
    expectedMonthlyEMI: monthlyEMI,
    paymentReceived: paymentAmount,
    latePaymentCount: latePaymentCount,

    // Flags
    isLatePayment: latePaymentCount > 0,
    isDefault: isDefault,
  };
}

/**
 * Generate complete dataset
 */
function generateDataset() {
  const dataset = {
    dealers: [],
    transactions: [],
  };

  let dealerId = 1;

  // Create dealers for Anchor A (60 dealers)
  for (let i = 0; i < 60; i++) {
    const dealer = createDealer(dealerId++, "ANCHOR_A");
    dataset.dealers.push(dealer);

    for (let month = 0; month < 12; month++) {
      const monthData = generateMonthlyData(dealer, month);
      dataset.transactions.push(monthData);
    }
  }

  // Create dealers for Anchor B (40 dealers) — slightly higher default risk
  for (let i = 0; i < 40; i++) {
    const dealer = createDealer(dealerId++, "ANCHOR_B");
    dealer.defaultRisk *= 1.3;
    dataset.dealers.push(dealer);

    for (let month = 0; month < 12; month++) {
      const monthData = generateMonthlyData(dealer, month);
      dataset.transactions.push(monthData);
    }
  }

  return dataset;
}

/**
 * Calculate summary statistics for a dealer
 */
function calculateDealerStats(dealer, transactions) {
  const stats = {
    dealerId: dealer.id,
    dealerName: dealer.name,
    anchorId: dealer.anchorId,
    profile: dealer.profile,
    sanctionedLimit: dealer.sanctionedLimit,

    avgUtilization: 0,
    avgDPO: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    totalOrderValue: 0,
    totalPayments: 0,
    latePaymentMonths: 0,
    monthsInDefault: 0,
    dpoTrend: 0,
    orderTrend: 0,
  };

  if (!transactions || transactions.length === 0) {
    return stats;
  }

  let utilizationSum = 0;
  let dpoSum = 0;
  let lateMonths = 0;
  let defaultMonths = 0;

  for (const tx of transactions) {
    utilizationSum += tx.utilization;
    dpoSum += tx.daysPayableOutstanding;
    stats.totalOrders += tx.orderCount;
    stats.totalOrderValue += tx.totalOrderValue;
    stats.totalPayments += tx.paymentReceived;
    if (tx.isLatePayment) lateMonths++;
    if (tx.isDefault) defaultMonths++;
  }

  stats.avgUtilization = utilizationSum / transactions.length;
  stats.avgDPO = dpoSum / transactions.length;
  stats.avgOrderValue = stats.totalOrderValue / Math.max(1, stats.totalOrders);
  stats.latePaymentMonths = lateMonths;
  stats.monthsInDefault = defaultMonths;

  // Trend calculation (compare first 3 months vs last 3 months)
  if (transactions.length >= 6) {
    const firstThree = transactions.slice(0, 3);
    const lastThree = transactions.slice(-3);

    const firstAvgDPO =
      firstThree.reduce((sum, t) => sum + t.daysPayableOutstanding, 0) / 3;
    const lastAvgDPO =
      lastThree.reduce((sum, t) => sum + t.daysPayableOutstanding, 0) / 3;
    stats.dpoTrend =
      lastAvgDPO > firstAvgDPO ? 1 : lastAvgDPO < firstAvgDPO ? -1 : 0;

    const firstAvgOrder =
      firstThree.reduce((sum, t) => sum + t.totalOrderValue, 0) / 3;
    const lastAvgOrder =
      lastThree.reduce((sum, t) => sum + t.totalOrderValue, 0) / 3;
    stats.orderTrend =
      lastAvgOrder > firstAvgOrder ? 1 : lastAvgOrder < firstAvgOrder ? -1 : 0;
  }

  return stats;
}

module.exports = {
  generateDataset,
  calculateDealerStats,
  MONTHS,
  CREDIT_PROFILES,
};
