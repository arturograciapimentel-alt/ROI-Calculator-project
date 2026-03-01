import type {
  PropertyInputs,
  PortfolioProperty,
  ScenarioAssumptions,
  ROIProjection,
  YearlyProjection,
  Scenario,
} from "./types";

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
    adrUpliftPercent: 0.03,
    occupancyUpliftPoints: 0.01,
    groupPricingImprovementPercent: 0.02,
    channelShiftPercent: 0, // removed OTA channel shift focus
    laborHoursSavedPerWeek: 0,
    marketGrowthRate: 0.02,
  },
  moderate: {
    adrUpliftPercent: 0.05,
    occupancyUpliftPoints: 0.02,
    groupPricingImprovementPercent: 0.04,
    channelShiftPercent: 0,
    laborHoursSavedPerWeek: 0,
    marketGrowthRate: 0.025,
  },
  aggressive: {
    adrUpliftPercent: 0.08,
    occupancyUpliftPoints: 0.035,
    groupPricingImprovementPercent: 0.07,
    channelShiftPercent: 0,
    laborHoursSavedPerWeek: 0,
    marketGrowthRate: 0.03,
  },
};

export function calculateLaborSaved(inputs: PropertyInputs): number {
  // Based on hours per week saved
  const hoursPerYear = inputs.hoursPerWeekManual * 52;
  const laborSaved = inputs.annualRMLaborCost > 0
    ? inputs.annualRMLaborCost * 0.3
    : hoursPerYear * 50; // $50/hr default if no labor cost entered
  return laborSaved;
}

export function calculateROI(
  inputs: PropertyInputs,
  assumptions: ScenarioAssumptions,
  hourlyLaborRate: number
): ROIProjection {
  const { totalRooms, currentADR, currentOccupancy } = inputs;
  const currentRevPAR = currentADR * currentOccupancy;
  const annualRooms = totalRooms * 365;

  // Fraction of room nights the RMS can actually optimize (yieldable segments)
  // Non-yieldable = group/corporate at static negotiated rates
  const yieldable = inputs.yieldablePercent ?? (1 - inputs.groupBusinessPercent);

  // New metrics after Duetto on yieldable segments
  const newADR = currentADR * (1 + assumptions.adrUpliftPercent);
  const newOccupancy = Math.min(0.98, currentOccupancy + assumptions.occupancyUpliftPoints);
  const yieldableNewRevPAR = newADR * newOccupancy;

  // Incremental ADR revenue on yieldable rooms (current occ as base)
  const incrementalADRRevenue = (newADR - currentADR) * currentOccupancy * annualRooms * yieldable;

  // Incremental occupancy revenue on yieldable rooms (using new ADR)
  const incrementalOccRevenue = newADR * (newOccupancy - currentOccupancy) * annualRooms * yieldable;

  // Combined RevPAR uplift scaled to yieldable inventory
  const combinedRevPARUplift = (yieldableNewRevPAR - currentRevPAR) * annualRooms * yieldable;
  const annualIncrementalRoomRevenue = combinedRevPARUplift;

  // Hotel-wide blended RevPAR after RMS optimization
  const newRevPAR = currentRevPAR + (yieldableNewRevPAR - currentRevPAR) * yieldable;

  // Group revenue optimization via Blockbuster (on group business)
  const currentGroupRevenue = currentRevPAR * totalRooms * 365 * inputs.groupBusinessPercent;
  const groupRevenue = inputs.groupBusinessPercent > 0
    ? currentGroupRevenue * assumptions.groupPricingImprovementPercent
    : 0;

  // Distribution savings zeroed out (OTA channel shift removed from model)
  const distributionSavings = 0;

  // Labor savings from automation of manual pricing tasks
  const hoursWeeklySaved = Math.min(inputs.hoursPerWeekManual * 0.5, 20);
  const laborSavings =
    inputs.annualRMLaborCost > 0
      ? inputs.annualRMLaborCost * 0.25
      : hoursWeeklySaved * 52 * hourlyLaborRate;

  // Totals
  const totalIncrementalRevenue = annualIncrementalRoomRevenue + groupRevenue;
  const totalCostSavings = laborSavings;
  const totalAnnualImpact = totalIncrementalRevenue + totalCostSavings;

  // ROI metrics
  const netROIPercent =
    ((totalAnnualImpact - inputs.duettoAnnualCost) / inputs.duettoAnnualCost) * 100;
  const paybackMonths =
    inputs.duettoAnnualCost / (totalAnnualImpact / 12);
  const roiMultiple = totalAnnualImpact / inputs.duettoAnnualCost;

  return {
    incrementalADRRevenue,
    incrementalOccRevenue,
    combinedRevPARUplift,
    annualIncrementalRoomRevenue,
    groupRevenue,
    distributionSavings,
    laborSavings,
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
    const netBenefit = totalImpact - inputs.duettoAnnualCost;
    cumulativeNetBenefit += netBenefit;
    const roiPercent =
      ((totalImpact - inputs.duettoAnnualCost) / inputs.duettoAnnualCost) * 100;

    years.push({
      year,
      incrementalRevenue,
      costSavings,
      totalImpact,
      duettoInvestment: inputs.duettoAnnualCost,
      netBenefit,
      cumulativeNetBenefit,
      roiPercent,
    });
  }

  return years;
}

export function estimateDuettoCost(rooms: number): number {
  // Rough estimate based on property size
  if (rooms < 100) return 18000;
  if (rooms < 200) return 28000;
  if (rooms < 350) return 42000;
  if (rooms < 500) return 58000;
  if (rooms < 750) return 75000;
  if (rooms < 1000) return 95000;
  return 120000;
}

export const SAMPLE_PROPERTY: PropertyInputs = {
  propertyName: "The Grand Metropolitan Hotel",
  propertyType: "luxury-upper-upscale",
  totalRooms: 350,
  starRating: 4,
  location: "New York, NY",
  currency: "USD",
  currentADR: 189,
  currentOccupancy: 0.72,
  groupBusinessPercent: 0.35,
  yieldablePercent: 0.65, // 65% yieldable (non-group transient + some negotiated flex)
  directBookingPercent: 0.42,
  otaPercent: 0.58,
  rmApproach: "spreadsheets",
  competitorRMSName: "",
  rmStaffCount: 2,
  hoursPerWeekManual: 25,
  numberOfProperties: 1,
  otaCommissionRate: 0.18,
  cpor: 45,
  annualRMLaborCost: 180000,
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
  const annualRMLaborCost = portfolioProperties.reduce((s, p) => s + (p.annualRMLaborCost || 0), 0);
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
    annualRMLaborCost,
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
    annualRMLaborCost: inputs.annualRMLaborCost,
    duettoAnnualCost: inputs.duettoAnnualCost,
  };
}
