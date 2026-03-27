import type {
  PropertyInputs,
  PortfolioProperty,
  ScenarioAssumptions,
  ROIProjection,
  YearlyProjection,
  Scenario,
} from "./types";

/**
 * Approximate reference exchange rates: 1 USD = N units of each currency.
 * Users can override these in the Exchange Rates panel.
 */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 17.15,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 149.5,
};

/**
 * Converts a monetary value from one currency to another using stored exchange rates.
 * Rates are "units per 1 USD" (e.g., MXN: 17.15 means 1 USD = 17.15 MXN).
 */
export function convertCurrency(
  value: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return value;
  if (!isFinite(value) || isNaN(value)) return 0;
  const fromRateRaw = rates[from] ?? DEFAULT_EXCHANGE_RATES[from] ?? 1;
  const toRateRaw = rates[to] ?? DEFAULT_EXCHANGE_RATES[to] ?? 1;
  const fromRate = fromRateRaw > 0 && isFinite(fromRateRaw) ? fromRateRaw : 1;
  const toRate = toRateRaw > 0 && isFinite(toRateRaw) ? toRateRaw : 1;
  return (value / fromRate) * toRate;
}

/**
 * Returns a copy of PropertyInputs with all monetary values converted to outputCurrency.
 * Performance fields (ADR, RM costs) are converted from inputs.currency.
 * Duetto investment fields are converted from inputs.duettoCurrency.
 * In portfolio mode (isPortfolio=true) all costs are assumed to be in inputs.currency.
 */
export function normalizeInputCurrencies(
  inputs: PropertyInputs,
  outputCurrency: string,
  rates: Record<string, number>,
  isPortfolio = false
): PropertyInputs {
  const perfCurrency = inputs.currency;
  const duettoCurrency = isPortfolio ? inputs.currency : (inputs.duettoCurrency || inputs.currency);

  const cp = (v: number) => convertCurrency(v, perfCurrency, outputCurrency, rates);
  const cd = (v: number) => convertCurrency(v, duettoCurrency, outputCurrency, rates);

  return {
    ...inputs,
    currentADR: cp(inputs.currentADR),
    annualRMSystemsCost: cp(inputs.annualRMSystemsCost || 0),
    annualConsultingCost: cp(inputs.annualConsultingCost || 0),
    cpor: cp(inputs.cpor || 0),
    subscriptionCost: inputs.subscriptionCost ? cd(inputs.subscriptionCost) : 0,
    implementationFee: cd(inputs.implementationFee || 0),
    ohipConnectivityFee: cd(inputs.ohipConnectivityFee || 0),
    duettoAnnualCost: inputs.duettoAnnualCost ? cd(inputs.duettoAnnualCost) : 0,
    // Tell formatCurrency to use the output currency
    currency: outputCurrency as PropertyInputs["currency"],
    duettoCurrency: outputCurrency as PropertyInputs["currency"],
  };
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  MXN: "MX$",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
};

export const CURRENCY_LOCALES: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  MXN: "es-MX",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
};

export function formatCurrency(
  value: number,
  currency: string,
  compact = false
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${symbol}${(value / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

// Default assumptions by scenario
export const DEFAULT_ASSUMPTIONS = {
  conservative: {
    revparUpliftPercent: 0.05, // 5% RevPAR uplift
    marketGrowthRate: 0.02,
  },
  moderate: {
    revparUpliftPercent: 0.08, // 8% RevPAR uplift
    marketGrowthRate: 0.025,
  },
  aggressive: {
    revparUpliftPercent: 0.12, // 12% RevPAR uplift
    marketGrowthRate: 0.03,
  },
};

/** ADR share of the RevPAR uplift (open pricing is primarily rate-driven) */
const ADR_SHARE = 0.6;

export function calculateLaborSaved(inputs: PropertyInputs): number {
  // Retained for backwards compatibility — use calculateROI for current logic
  return inputs.annualRMSystemsCost > 0 ? inputs.annualRMSystemsCost : 0;
}

export function calculateROI(
  inputs: PropertyInputs,
  assumptions: ScenarioAssumptions,
  hourlyLaborRate: number
): ROIProjection {
  const { totalRooms } = inputs;
  const currentADR = isFinite(inputs.currentADR) && inputs.currentADR >= 0 ? inputs.currentADR : 0;
  const currentOccupancy = isFinite(inputs.currentOccupancy) && inputs.currentOccupancy >= 0 ? inputs.currentOccupancy : 0;
  const currentRevPAR = currentADR * currentOccupancy;
  const annualRooms = totalRooms * 365;

  // Fraction of room nights the RMS can actually optimize (yieldable segments)
  const yieldable = inputs.yieldablePercent ?? (1 - inputs.groupBusinessPercent);

  // ── RevPAR-led model ──────────────────────────────────────────────────────
  // Single RevPAR uplift assumption; decomposed into ADR (60%) and occupancy (40%).
  const revparUplift = isFinite(assumptions.revparUpliftPercent) ? assumptions.revparUpliftPercent : 0;

  // Yieldable-segment new metrics
  const yieldableNewRevPAR = currentRevPAR * (1 + revparUplift);
  const yieldableNewADR    = currentADR * (1 + revparUplift * ADR_SHARE);
  const yieldableNewOcc    = yieldableNewADR > 0
    ? Math.min(0.98, yieldableNewRevPAR / yieldableNewADR)
    : currentOccupancy;

  // Incremental revenue on yieldable inventory
  const incrementalADRRevenue = (yieldableNewADR - currentADR) * currentOccupancy * annualRooms * yieldable;
  const incrementalOccRevenue = yieldableNewADR * (yieldableNewOcc - currentOccupancy) * annualRooms * yieldable;
  const combinedRevPARUplift  = (yieldableNewRevPAR - currentRevPAR) * annualRooms * yieldable;
  const annualIncrementalRoomRevenue = combinedRevPARUplift;

  // Hotel-wide blended metrics (yieldable uplift scaled by yieldable fraction)
  const newRevPAR    = currentRevPAR + (yieldableNewRevPAR - currentRevPAR) * yieldable;
  const newADR       = currentADR    + (yieldableNewADR    - currentADR)    * yieldable;
  const newOccupancy = newADR > 0 ? Math.min(0.98, newRevPAR / newADR) : currentOccupancy;

  // Group revenue: removed from model per product decision
  const groupRevenue = 0;

  // Distribution savings: removed from model
  const distributionSavings = 0;

  // Hours freed from manual pricing tasks (shown as productivity metric, not monetized labor)
  const hoursSavedPerWeek = Math.min(inputs.hoursPerWeekManual * 0.5, 20);

  // Systems cost savings: direct replacement of existing RM tools & services
  // If the hotel pays for rate shoppers, pricing tools, consulting, or outsourced RM, Duetto consolidates these
  const systemsCostSavings = (inputs.annualRMSystemsCost || 0) + (inputs.annualConsultingCost || 0);

  // Totals
  const totalIncrementalRevenue = annualIncrementalRoomRevenue; // group removed
  const totalCostSavings = systemsCostSavings;
  const totalAnnualImpact = totalIncrementalRevenue + totalCostSavings;

  // ROI metrics
  const netROIPercent   = inputs.duettoAnnualCost > 0
    ? ((totalAnnualImpact - inputs.duettoAnnualCost) / inputs.duettoAnnualCost) * 100 : 0;
  const paybackMonths   = inputs.duettoAnnualCost > 0 && totalAnnualImpact > 0
    ? inputs.duettoAnnualCost / (totalAnnualImpact / 12) : 0;
  const roiMultiple     = inputs.duettoAnnualCost > 0
    ? totalAnnualImpact / inputs.duettoAnnualCost : 0;

  return {
    incrementalADRRevenue,
    incrementalOccRevenue,
    combinedRevPARUplift,
    annualIncrementalRoomRevenue,
    groupRevenue,
    distributionSavings,
    systemsCostSavings,
    hoursSavedPerWeek,
    totalIncrementalRevenue,
    totalCostSavings,
    totalAnnualImpact,
    netROIPercent,
    paybackMonths,
    roiMultiple,
    newADR,
    newOccupancy,
    newRevPAR,
    currentRevPAR,
  };
}

export function calculateYearlyProjections(
  inputs: PropertyInputs,
  assumptions: ScenarioAssumptions,
  hourlyLaborRate: number
): YearlyProjection[] {
  const baseProjection = calculateROI(inputs, assumptions, hourlyLaborRate);
  const yearlyCosts = computeDuettoYearlyCosts(inputs);
  const years: YearlyProjection[] = [];
  let cumulativeNetBenefit = 0;

  // Ramp factors for Year 1 (partial implementation)
  const year1Ramp = 0.75; // Q1: 50%, Q2-Q3: 80%, Q4: 100% → avg ~75%

  for (let year = 1; year <= 5; year++) {
    const marketMultiplier = Math.pow(1 + assumptions.marketGrowthRate, year - 1);
    const rampFactor = year === 1 ? year1Ramp : 1.0;
    const incrementalRevenue =
      baseProjection.totalIncrementalRevenue * marketMultiplier * rampFactor;
    const costSavings =
      baseProjection.totalCostSavings * marketMultiplier * rampFactor;
    const totalImpact = incrementalRevenue + costSavings;
    const duettoInvestment = yearlyCosts[year - 1];
    const netBenefit = totalImpact - duettoInvestment;
    cumulativeNetBenefit += netBenefit;
    const roiPercent = duettoInvestment > 0
      ? ((totalImpact - duettoInvestment) / duettoInvestment) * 100
      : 0;

    years.push({
      year,
      incrementalRevenue,
      costSavings,
      totalImpact,
      duettoInvestment,
      netBenefit,
      cumulativeNetBenefit,
      roiPercent,
    });
  }

  return years;
}

export function estimateDuettoCost(rooms: number): number {
  // Rough subscription estimate based on property size
  if (rooms < 100) return 18000;
  if (rooms < 200) return 28000;
  if (rooms < 350) return 42000;
  if (rooms < 500) return 58000;
  if (rooms < 750) return 75000;
  if (rooms < 1000) return 95000;
  return 120000;
}

/** True when the PMS name indicates Opera Cloud (triggers OHIP fee) */
export function isOperaCloud(pmsName: string): boolean {
  const lower = pmsName.toLowerCase();
  return lower.includes("opera cloud") || lower.includes("ohip");
}

/**
 * Effective annual recurring Duetto cost.
 * = subscription (or auto-estimate) + OHIP fee if Opera Cloud PMS.
 */
export function computeDuettoAnnualCost(inputs: PropertyInputs): number {
  const subscription = inputs.subscriptionCost > 0
    ? inputs.subscriptionCost
    : estimateDuettoCost(inputs.totalRooms);
  const ohip = isOperaCloud(inputs.pmsName || "") ? (inputs.ohipConnectivityFee || 0) : 0;
  return subscription + ohip;
}

/**
 * Per-year Duetto investment for the 5-year projection.
 * Year 1: annualCost + implementationFee (one-time)
 * Years 2..contractYears: annualCost (no change in initial term)
 * Years contractYears+1..5: annualCost × 1.05^(year − contractYears)
 */
export function computeDuettoYearlyCosts(inputs: PropertyInputs): number[] {
  const annualCost = inputs.duettoAnnualCost > 0
    ? inputs.duettoAnnualCost
    : computeDuettoAnnualCost(inputs);
  const implFee = inputs.implementationFee || 0;
  const contractYears = Math.max(1, inputs.initialContractYears || 1);

  return Array.from({ length: 5 }, (_, i) => {
    const year = i + 1;
    const recurring = year > contractYears
      ? annualCost * Math.pow(1.05, year - contractYears)
      : annualCost;
    return recurring + (year === 1 ? implFee : 0);
  });
}

export const SAMPLE_PROPERTY: PropertyInputs = {
  propertyName: "The Grand Metropolitan Hotel",
  propertyType: "luxury-upper-upscale",
  totalRooms: 350,
  starRating: 4,
  location: "New York, NY",
  currency: "USD",
  duettoCurrency: "USD",
  currentADR: 189,
  currentOccupancy: 0.72,
  groupBusinessPercent: 0.35,
  yieldablePercent: 0.65,
  directBookingPercent: 0.42,
  otaPercent: 0.58,
  rmApproach: "spreadsheets",
  competitorRMSName: "",
  rmStaffCount: 2,
  hoursPerWeekManual: 25,
  numberOfProperties: 1,
  otaCommissionRate: 0.18,
  cpor: 45,
  annualRMSystemsCost: 25000, // e.g. rate shopper + pricing tool subscriptions
  annualConsultingCost: 0,
  pmsName: "",
  subscriptionCost: 42000,
  implementationFee: 15000,
  ohipConnectivityFee: 0,
  initialContractYears: 2,
  duettoAnnualCost: 42000,
};

// Labels match CoStar's hotel class segments exactly
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "luxury-upper-upscale": "Luxury & Upper Upscale",
  "upscale-upper-midscale": "Upscale & Upper Midscale",
  "midscale-economy": "Midscale & Economy",
};

export const RM_APPROACH_LABELS: Record<string, string> = {
  spreadsheets: "Spreadsheets/Manual",
  "basic-rms": "Basic/Legacy RMS",
  "competitor-rms": "Competitor RMS",
  none: "No Formal Process",
};

/**
 * Aggregates an array of portfolio properties into a single blended PropertyInputs.
 * ADR, occupancy, group%, and yieldable% are weighted by room count.
 * Labor and Duetto costs are summed across properties.
 * Non-revenue fields (currency, rmApproach, etc.) are inherited from baseInputs.
 */
export function aggregatePortfolioInputs(
  baseInputs: PropertyInputs,
  portfolioProperties: PortfolioProperty[]
): PropertyInputs {
  if (portfolioProperties.length === 0) return baseInputs;

  const totalRooms = portfolioProperties.reduce((s, p) => s + (p.totalRooms || 0), 0);
  if (totalRooms === 0) return baseInputs;

  const weightedAvg = (field: keyof PortfolioProperty) =>
    portfolioProperties.reduce((s, p) => s + (p[field] as number) * p.totalRooms, 0) / totalRooms;

  const currentADR = weightedAvg("currentADR");
  const currentOccupancy = weightedAvg("currentOccupancy");
  const groupBusinessPercent = weightedAvg("groupBusinessPercent");
  const yieldablePercent = weightedAvg("yieldablePercent");
  const annualRMSystemsCost = portfolioProperties.reduce((s, p) => s + (p.annualRMSystemsCost || 0), 0);
  const annualConsultingCost = portfolioProperties.reduce((s, p) => s + (p.annualConsultingCost || 0), 0);
  const duettoAnnualCost = portfolioProperties.reduce(
    (s, p) => s + (p.duettoAnnualCost > 0 ? p.duettoAnnualCost : estimateDuettoCost(p.totalRooms)),
    0
  );

  return {
    ...baseInputs,
    totalRooms,
    currentADR,
    currentOccupancy,
    groupBusinessPercent,
    yieldablePercent,
    annualRMSystemsCost,
    annualConsultingCost,
    duettoAnnualCost,
    numberOfProperties: portfolioProperties.length,
  };
}

/** Creates a blank PortfolioProperty seeded from existing inputs */
export function createPortfolioProperty(
  inputs: PropertyInputs,
  index: number
): PortfolioProperty {
  return {
    id: `prop-${Date.now()}-${index}`,
    propertyName: index === 0 ? inputs.propertyName || `Property ${index + 1}` : `Property ${index + 1}`,
    propertyType: inputs.propertyType,
    totalRooms: inputs.totalRooms,
    currentADR: inputs.currentADR,
    currentOccupancy: inputs.currentOccupancy,
    groupBusinessPercent: inputs.groupBusinessPercent,
    yieldablePercent: inputs.yieldablePercent,
    annualRMSystemsCost: inputs.annualRMSystemsCost,
    annualConsultingCost: inputs.annualConsultingCost,
    duettoAnnualCost: inputs.duettoAnnualCost,
    marketReportId: null,
  };
}
