import type {
  PropertyInputs,
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
    channelShiftPercent: 0.02,
    laborHoursSavedPerWeek: 0,
    marketGrowthRate: 0.02,
  },
  moderate: {
    adrUpliftPercent: 0.05,
    occupancyUpliftPoints: 0.02,
    groupPricingImprovementPercent: 0.04,
    channelShiftPercent: 0.04,
    laborHoursSavedPerWeek: 0,
    marketGrowthRate: 0.025,
  },
  aggressive: {
    adrUpliftPercent: 0.08,
    occupancyUpliftPoints: 0.035,
    groupPricingImprovementPercent: 0.07,
    channelShiftPercent: 0.06,
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
  const { totalRooms, currentADR, currentOccupancy, currency } = inputs;
  const currentRevPAR = currentADR * currentOccupancy;
  const annualRooms = totalRooms * 365;

  // New metrics after Duetto
  const newADR = currentADR * (1 + assumptions.adrUpliftPercent);
  const newOccupancy = Math.min(0.98, currentOccupancy + assumptions.occupancyUpliftPoints);
  const newRevPAR = newADR * newOccupancy;

  // Incremental ADR revenue (using current occupancy as base)
  const incrementalADRRevenue = (newADR - currentADR) * currentOccupancy * annualRooms;

  // Incremental occupancy revenue (using new ADR as the rate)
  const incrementalOccRevenue = newADR * (newOccupancy - currentOccupancy) * annualRooms;

  // Combined RevPAR uplift (total room revenue impact)
  const combinedRevPARUplift = (newRevPAR - currentRevPAR) * annualRooms;
  const annualIncrementalRoomRevenue = combinedRevPARUplift;

  // Group revenue optimization
  const currentGroupRevenue =
    currentRevPAR * totalRooms * 365 * inputs.groupBusinessPercent;
  const groupRevenue = inputs.groupBusinessPercent > 0
    ? currentGroupRevenue * assumptions.groupPricingImprovementPercent
    : 0;

  // Distribution cost savings
  const avgBookingValue = currentADR * 2.5; // avg stay length
  const totalAnnualBookings = (currentOccupancy * annualRooms) / 2.5;
  const otaBookings = totalAnnualBookings * inputs.otaPercent;
  const shiftedBookings = otaBookings * assumptions.channelShiftPercent;
  const distributionSavings = shiftedBookings * avgBookingValue * inputs.otaCommissionRate;

  // Labor savings
  const hoursWeeklySaved = Math.min(inputs.hoursPerWeekManual * 0.5, 20); // max 50% of time saved
  const laborSavings =
    inputs.annualRMLaborCost > 0
      ? inputs.annualRMLaborCost * 0.25
      : hoursWeeklySaved * 52 * hourlyLaborRate;

  // Revenue leakage reduction (pricing errors)
  const revenueLeak = annualIncrementalRoomRevenue * 0.05;

  // Totals
  const totalIncrementalRevenue =
    annualIncrementalRoomRevenue + groupRevenue + revenueLeak;
  const totalCostSavings = distributionSavings + laborSavings;
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
  propertyType: "full-service",
  totalRooms: 350,
  starRating: 4,
  location: "New York, NY",
  marketTier: "primary",
  currency: "USD",
  currentADR: 189,
  currentOccupancy: 0.72,
  groupBusinessPercent: 0.35,
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

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "full-service": "Full-Service Hotel",
  "select-service": "Select-Service",
  "resort": "Resort",
  "casino": "Casino Resort",
  "extended-stay": "Extended Stay",
  "boutique": "Boutique/Lifestyle",
  "all-inclusive": "All-Inclusive",
};

export const MARKET_TIER_LABELS: Record<string, string> = {
  primary: "Primary/Gateway",
  secondary: "Secondary",
  tertiary: "Tertiary/Resort",
};

export const RM_APPROACH_LABELS: Record<string, string> = {
  spreadsheets: "Spreadsheets/Manual",
  "basic-rms": "Basic/Legacy RMS",
  "competitor-rms": "Competitor RMS",
  none: "No Formal Process",
};
