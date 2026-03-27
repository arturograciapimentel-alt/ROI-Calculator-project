// Individual property entry in a portfolio
export interface PortfolioProperty {
  id: string;
  propertyName: string;
  propertyType: PropertyType;
  totalRooms: number;
  currentADR: number;
  currentOccupancy: number; // 0-1
  groupBusinessPercent: number; // 0-1
  yieldablePercent: number; // 0-1
  annualRMSystemsCost: number;
  annualConsultingCost: number;
  duettoAnnualCost: number; // 0 = auto-estimate
  marketReportId: string | null; // ID of the CoStarBenchmark assigned to this property
}

// CoStar hotel class — aligns directly with CoStar Hospitality Market Report segments
export type PropertyType =
  | "luxury-upper-upscale"
  | "upscale-upper-midscale"
  | "midscale-economy";

export type RMApproach =
  | "spreadsheets"
  | "basic-rms"
  | "competitor-rms"
  | "none";

export type Scenario = "conservative" | "moderate" | "aggressive";

export type Currency = "USD" | "EUR" | "GBP" | "MXN" | "CAD" | "AUD" | "JPY";

export interface PropertyInputs {
  // Property Configuration
  propertyName: string;
  propertyType: PropertyType;
  totalRooms: number;
  starRating: number;
  location: string;
  /** Currency for performance metrics: ADR, RM systems cost, consulting cost */
  currency: Currency;
  /** Currency for Duetto investment fields: subscription, implementation fee, OHIP */
  duettoCurrency: Currency;

  // Current Performance
  currentADR: number;
  currentOccupancy: number; // 0-1
  groupBusinessPercent: number; // 0-1
  yieldablePercent: number; // 0-1 — fraction of room nights the RMS can optimize
  directBookingPercent: number; // 0-1
  otaPercent: number; // 0-1

  // Operational Context
  rmApproach: RMApproach;
  competitorRMSName: string;
  rmStaffCount: number;
  hoursPerWeekManual: number;
  numberOfProperties: number;

  // Cost Context
  otaCommissionRate: number; // 0-1
  cpor: number;
  annualRMSystemsCost: number; // Annual cost of pricing tools, rate shoppers
  annualConsultingCost: number; // Annual cost of consulting / outsourced RM services

  // Duetto investment breakdown
  pmsName: string;              // PMS system (e.g. "Opera Cloud" triggers OHIP fee)
  subscriptionCost: number;     // Annual recurring subscription (0 = auto-estimate)
  implementationFee: number;    // One-time fee charged in Year 1 only
  ohipConnectivityFee: number;  // Annual OHIP fee (Opera Cloud only, recurring)
  initialContractYears: number; // Length of initial contract term (1-5)
  /** Derived — computed from breakdown above before passing to calculations */
  duettoAnnualCost: number;
}

export interface ScenarioAssumptions {
  /** Primary RevPAR uplift driver (0–0.50). Decomposed internally: 60% ADR / 40% occupancy. */
  revparUpliftPercent: number;
  marketGrowthRate: number;
}

export interface ROIProjection {
  // Revenue impacts
  incrementalADRRevenue: number;
  incrementalOccRevenue: number;
  combinedRevPARUplift: number;
  annualIncrementalRoomRevenue: number;
  groupRevenue: number;
  distributionSavings: number;
  systemsCostSavings: number;
  hoursSavedPerWeek: number;

  // Summary
  totalIncrementalRevenue: number;
  totalCostSavings: number;
  totalAnnualImpact: number;
  netROIPercent: number;
  paybackMonths: number;
  roiMultiple: number;

  // Per-metric new values
  newADR: number;
  newOccupancy: number;
  newRevPAR: number;
  currentRevPAR: number;
}

export interface YearlyProjection {
  year: number;
  incrementalRevenue: number;
  costSavings: number;
  totalImpact: number;
  duettoInvestment: number;
  netBenefit: number;
  cumulativeNetBenefit: number;
  roiPercent: number;
}

export interface CoStarClassMetrics {
  rooms: number;
  occupancy: number; // 0–1
  adr: number;
  revpar: number;
}

export interface CoStarHistoricalRow {
  year: number;
  occupancy: number; // 0–1
  adr: number;
  revpar: number;
  isForecast: boolean;
}

export interface CoStarSubmarket {
  name: string;
  occupancy: number; // 0–1
  adr: number;
  revpar: number;
}

export interface CoStarBenchmark {
  id: string;
  marketName: string;
  reportDate: string;
  /** Currency of the ADR/RevPAR values in this report (default: USD) */
  currency: Currency;
  overall: CoStarClassMetrics;
  byClass: {
    "luxury-upper-upscale": CoStarClassMetrics;
    "upscale-upper-midscale": CoStarClassMetrics;
    "midscale-economy": CoStarClassMetrics;
  };
  submarkets: CoStarSubmarket[];
  historical: CoStarHistoricalRow[];
  /** Historical rows per class segment for YoY display (parsed from class-specific tables) */
  byClassHistorical?: {
    "luxury-upper-upscale"?: CoStarHistoricalRow[];
    "upscale-upper-midscale"?: CoStarHistoricalRow[];
    "midscale-economy"?: CoStarHistoricalRow[];
  };
}

// One Duetto-client hotel entry in a market (12-month production data)
// Manual inputs: roomNights, ADR, revPAR
// Derived (not stored): roomRevenue = ADR × roomNights, availableRooms = roomRevenue / revPAR, occupancy = revPAR / ADR
export interface DuettoMarketHotel {
  id: string;
  name: string; // optional label for reference
  // Current 12 months — manual inputs
  currentRoomNights: number;
  currentADR: number;
  currentRevPAR: number;
  // Prior 12 months — manual inputs
  priorRoomNights: number;
  priorADR: number;
  priorRevPAR: number;
}

// All Duetto-client hotel data tied to a CoStar market
export interface DuettoMarketData {
  costarBenchmarkId: string;
  hotels: DuettoMarketHotel[];
  /** Currency of the ADR/RevPAR values entered for these hotels (default: USD) */
  currency: Currency;
}

export interface CalculatorState {
  activeTab: number;
  inputs: PropertyInputs;
  portfolioProperties: PortfolioProperty[];
  scenario: Scenario;
  assumptions: {
    conservative: ScenarioAssumptions;
    moderate: ScenarioAssumptions;
    aggressive: ScenarioAssumptions;
  };
  projections: {
    conservative: ROIProjection;
    moderate: ROIProjection;
    aggressive: ROIProjection;
  };
  yearlyProjections: YearlyProjection[];
  capRate: number;
  hourlyLaborRate: number;
  preparedBy: string;
  nextSteps: string;
  costarBenchmarks: CoStarBenchmark[];
  duettoMarketData: DuettoMarketData[];
  marketSignalApplied: boolean;
  /** Currency used for all ROI output display (Tabs 2, 3, 5) */
  outputCurrency: Currency;
  /** Exchange rates relative to USD: 1 USD = N units of currency */
  exchangeRates: Record<Currency, number>;
}
