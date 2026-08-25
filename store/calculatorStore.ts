"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CalculatorState,
  CoStarBenchmark,
  DuettoMarketData,
  DuettoMarketHotel,
  PortfolioProperty,
  PropertyInputs,
  Scenario,
  ScenarioAssumptions,
} from "@/lib/types";
import {
  calculateROI,
  calculateYearlyProjections,
  DEFAULT_ASSUMPTIONS,
  DEFAULT_RMS_EFFECTIVENESS,
  SAMPLE_PROPERTY,
  computeDuettoAnnualCost,
  aggregatePortfolioInputs,
  createPortfolioProperty,
  DEFAULT_EXCHANGE_RATES,
  normalizeInputCurrencies,
} from "@/lib/calculations";
import type { Currency } from "@/lib/types";

type CalculatorStore = CalculatorState & {
  setActiveTab: (tab: number) => void;
  updateInputs: (inputs: Partial<PropertyInputs>) => void;
  setScenario: (scenario: Scenario) => void;
  updateAssumption: (
    scenario: Scenario,
    key: keyof ScenarioAssumptions,
    value: number
  ) => void;
  loadSampleData: () => void;
  resetInputs: () => void;
  setCapRate: (rate: number) => void;
  setHourlyLaborRate: (rate: number) => void;
  setPreparedBy: (name: string) => void;
  setNextSteps: (steps: string) => void;
  addCostarBenchmark: (data: CoStarBenchmark) => void;
  removeCostarBenchmark: (id: string) => void;
  updateCostarBenchmarkCurrency: (id: string, currency: Currency) => void;
  setPortfolioProperties: (props: PortfolioProperty[]) => void;
  updatePortfolioProperty: (id: string, updates: Partial<Omit<PortfolioProperty, "id">>) => void;
  setDuettoHotelCount: (benchmarkId: string, count: number) => void;
  updateDuettoHotel: (benchmarkId: string, hotelId: string, updates: Partial<Omit<DuettoMarketHotel, "id">>) => void;
  updateDuettoMarketCurrency: (benchmarkId: string, currency: Currency) => void;
  applyMarketSignal: (conservative: number, moderate: number, aggressive: number) => void;
  setOutputCurrency: (currency: Currency) => void;
  updateExchangeRate: (currency: Currency, rate: number) => void;
  setRmsEffectiveness: (values: number[]) => void;
};

const DEFAULT_INPUTS: PropertyInputs = {
  propertyName: "",
  propertyType: "upscale-upper-midscale",
  totalRooms: 200,
  starRating: 4,
  location: "",
  currency: "USD",
  duettoCurrency: "USD",
  currentADR: 150,
  currentOccupancy: 0.70,
  groupBusinessPercent: 0.20,
  yieldablePercent: 0.75, // 75% yieldable by default
  directBookingPercent: 0.40,
  otaPercent: 0.60,
  rmApproach: "spreadsheets",
  competitorRMSName: "",
  rmStaffCount: 1,
  hoursPerWeekManual: 20,
  numberOfProperties: 1,
  otaCommissionRate: 0.18,
  cpor: 45,
  annualRMSystemsCost: 0,
  annualConsultingCost: 0,
  pmsName: "",
  subscriptionCost: 0,
  implementationFee: 0,
  ohipConnectivityFee: 0,
  initialContractYears: 1,
  projectionYears: 5,
  subscriptionEscalationRate: 0.05,
  duettoAnnualCost: 0,
};

function createBlankHotel(benchmarkId: string, index: number): DuettoMarketHotel {
  return {
    id: `dh-${benchmarkId}-${Date.now()}-${index}`,
    name: "",
    currentRoomNights: 0,
    currentADR: 0,
    currentRevPAR: 0,
    priorRoomNights: 0,
    priorADR: 0,
    priorRevPAR: 0,
  };
}

function recalculate(
  inputs: PropertyInputs,
  assumptions: CalculatorState["assumptions"],
  hourlyLaborRate: number,
  capRate: number,
  portfolioProperties: PortfolioProperty[] = [],
  outputCurrency: Currency = "USD",
  exchangeRates: Record<string, number> = DEFAULT_EXCHANGE_RATES,
  rmsEffectiveness: number[] = DEFAULT_RMS_EFFECTIVENESS
) {
  // When portfolio mode is active, aggregate per-property data into blended inputs
  const isPortfolio = portfolioProperties.length >= 2;
  const baseInputs = isPortfolio
    ? aggregatePortfolioInputs(inputs, portfolioProperties)
    : inputs;

  // Derive annual recurring cost from breakdown fields; fall back to auto-estimate
  const duettoAnnualCost = computeDuettoAnnualCost(baseInputs);
  const withCost = { ...baseInputs, duettoAnnualCost };

  // Normalize all monetary values to outputCurrency before calculation
  const effectiveInputs = normalizeInputCurrencies(withCost, outputCurrency, exchangeRates, isPortfolio);

  const projections = {
    conservative: calculateROI(effectiveInputs, assumptions.conservative, hourlyLaborRate, rmsEffectiveness),
    moderate: calculateROI(effectiveInputs, assumptions.moderate, hourlyLaborRate, rmsEffectiveness),
    aggressive: calculateROI(effectiveInputs, assumptions.aggressive, hourlyLaborRate, rmsEffectiveness),
  };

  const yearlyProjections = calculateYearlyProjections(
    effectiveInputs,
    assumptions.moderate,
    hourlyLaborRate,
    rmsEffectiveness,
    effectiveInputs.projectionYears
  );

  return { projections, yearlyProjections, duettoAnnualCost };
}

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
      activeTab: 0,
      inputs: DEFAULT_INPUTS,
      portfolioProperties: [],
      scenario: "moderate",
      marketSignalApplied: false,
      outputCurrency: "USD",
      exchangeRates: { ...DEFAULT_EXCHANGE_RATES } as Record<Currency, number>,
      rmsEffectivenessMonthly: [...DEFAULT_RMS_EFFECTIVENESS],
      assumptions: {
        conservative: { ...DEFAULT_ASSUMPTIONS.conservative },
        moderate: { ...DEFAULT_ASSUMPTIONS.moderate },
        aggressive: { ...DEFAULT_ASSUMPTIONS.aggressive },
      },
      projections: {
        conservative: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.conservative, 50, DEFAULT_RMS_EFFECTIVENESS),
        moderate: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.moderate, 50, DEFAULT_RMS_EFFECTIVENESS),
        aggressive: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.aggressive, 50, DEFAULT_RMS_EFFECTIVENESS),
      },
      yearlyProjections: calculateYearlyProjections(
        DEFAULT_INPUTS,
        DEFAULT_ASSUMPTIONS.moderate,
        50,
        DEFAULT_RMS_EFFECTIVENESS
      ),
      capRate: 0.075,
      hourlyLaborRate: 50,
      preparedBy: "",
      costarBenchmarks: [],
      duettoMarketData: [],
      nextSteps:
        "• Schedule internal approval meeting with GM, CFO, and revenue leadership\n• Define Year 1 KPIs and success metrics for the implementation\n• Confirm implementation timeline and required IT/PMS integration resources\n• Begin contract negotiation and commercial term discussions",

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateInputs: (newInputs) => {
        const state = get();
        const inputs = { ...state.inputs, ...newInputs };

        // When numberOfProperties changes, sync the portfolioProperties array
        let portfolioProperties = state.portfolioProperties;
        if (
          newInputs.numberOfProperties !== undefined &&
          newInputs.numberOfProperties !== state.inputs.numberOfProperties
        ) {
          const n = Math.max(1, newInputs.numberOfProperties);
          if (n <= 1) {
            portfolioProperties = [];
          } else {
            // Grow or shrink array to match n
            const current = state.portfolioProperties;
            if (current.length < n) {
              const added = Array.from({ length: n - current.length }, (_, i) =>
                createPortfolioProperty(inputs, current.length + i)
              );
              portfolioProperties = [...current, ...added];
            } else {
              portfolioProperties = current.slice(0, n);
            }
          }
        }

        const { projections, yearlyProjections, duettoAnnualCost } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        // Keep inputs.duettoAnnualCost in sync with the derived value (single-property mode only)
        const syncedInputs = portfolioProperties.length < 2
          ? { ...inputs, duettoAnnualCost }
          : inputs;
        set({ inputs: syncedInputs, portfolioProperties, projections, yearlyProjections });
      },

      setScenario: (scenario) => set({ scenario }),

      updateAssumption: (scenario, key, value) => {
        const state = get();
        // Ensure revparUpliftPercent is never set below 1% (0.01)
        const safeValue = key === "revparUpliftPercent" ? Math.max(0.01, value) : value;
        const assumptions = {
          ...state.assumptions,
          [scenario]: {
            ...state.assumptions[scenario],
            [key]: safeValue,
          },
        };
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ assumptions, projections, yearlyProjections, marketSignalApplied: false });
      },

      applyMarketSignal: (conservative, moderate, aggressive) => {
        const state = get();
        const assumptions = {
          conservative: { ...state.assumptions.conservative, revparUpliftPercent: conservative },
          moderate:     { ...state.assumptions.moderate,     revparUpliftPercent: moderate     },
          aggressive:   { ...state.assumptions.aggressive,   revparUpliftPercent: aggressive   },
        };
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ assumptions, projections, yearlyProjections, marketSignalApplied: true });
      },

      loadSampleData: () => {
        const state = get();
        const inputs = { ...SAMPLE_PROPERTY };
        const { projections, yearlyProjections, duettoAnnualCost } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          [],
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ inputs: { ...inputs, duettoAnnualCost }, portfolioProperties: [], projections, yearlyProjections });
      },

      resetInputs: () => {
        const state = get();
        const { projections, yearlyProjections, duettoAnnualCost } = recalculate(
          DEFAULT_INPUTS,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          [],
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ inputs: { ...DEFAULT_INPUTS, duettoAnnualCost }, portfolioProperties: [], projections, yearlyProjections });
      },

      setCapRate: (capRate) => {
        const state = get();
        set({ capRate });
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          capRate,
          state.portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ projections, yearlyProjections });
      },

      setHourlyLaborRate: (hourlyLaborRate) => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ hourlyLaborRate, projections, yearlyProjections });
      },

      setPortfolioProperties: (portfolioProperties) => {
        const state = get();
        // Keep numberOfProperties in sync with the actual array length
        const n = Math.max(1, portfolioProperties.length);
        const inputs = { ...state.inputs, numberOfProperties: n };
        const { projections, yearlyProjections } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ inputs, portfolioProperties, projections, yearlyProjections });
      },

      updatePortfolioProperty: (id, updates) => {
        const state = get();
        const portfolioProperties = state.portfolioProperties.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ portfolioProperties, projections, yearlyProjections });
      },

      setPreparedBy: (preparedBy) => set({ preparedBy }),
      setNextSteps: (nextSteps) => set({ nextSteps }),

      addCostarBenchmark: (data) => {
        const state = get();
        // Replace if same market name already exists, otherwise append
        const exists = state.costarBenchmarks.findIndex(
          (b) => b.marketName === data.marketName
        );
        const costarBenchmarks =
          exists >= 0
            ? state.costarBenchmarks.map((b, i) => (i === exists ? data : b))
            : [...state.costarBenchmarks, data];
        set({ costarBenchmarks });
      },

      removeCostarBenchmark: (id) => {
        const state = get();
        const costarBenchmarks = state.costarBenchmarks.filter((b) => b.id !== id);
        // Clear marketReportId from any portfolio properties that referenced this benchmark
        const portfolioProperties = state.portfolioProperties.map((p) =>
          p.marketReportId === id ? { ...p, marketReportId: null } : p
        );
        // Remove associated Duetto market data
        const duettoMarketData = state.duettoMarketData.filter((d) => d.costarBenchmarkId !== id);
        set({ costarBenchmarks, portfolioProperties, duettoMarketData });
      },

      updateCostarBenchmarkCurrency: (id, currency) => {
        const state = get();
        const costarBenchmarks = state.costarBenchmarks.map((b) =>
          b.id === id ? { ...b, currency } : b
        );
        set({ costarBenchmarks });
      },

      setDuettoHotelCount: (benchmarkId, count) => {
        const state = get();
        const existing = state.duettoMarketData.find((d) => d.costarBenchmarkId === benchmarkId);
        const currentHotels = existing?.hotels ?? [];
        let hotels: DuettoMarketHotel[];
        if (count <= 0) {
          hotels = [];
        } else if (count > currentHotels.length) {
          const added = Array.from({ length: count - currentHotels.length }, (_, i) =>
            createBlankHotel(benchmarkId, currentHotels.length + i)
          );
          hotels = [...currentHotels, ...added];
        } else {
          hotels = currentHotels.slice(0, count);
        }
        const entry: DuettoMarketData = {
          costarBenchmarkId: benchmarkId,
          hotels,
          currency: existing?.currency ?? "USD",
        };
        const duettoMarketData = existing
          ? state.duettoMarketData.map((d) => (d.costarBenchmarkId === benchmarkId ? entry : d))
          : [...state.duettoMarketData, entry];
        set({ duettoMarketData });
      },

      updateDuettoHotel: (benchmarkId, hotelId, updates) => {
        const state = get();
        const duettoMarketData = state.duettoMarketData.map((d) => {
          if (d.costarBenchmarkId !== benchmarkId) return d;
          return {
            ...d,
            hotels: d.hotels.map((h) => (h.id === hotelId ? { ...h, ...updates } : h)),
          };
        });
        set({ duettoMarketData });
      },

      updateDuettoMarketCurrency: (benchmarkId, currency) => {
        const state = get();
        const duettoMarketData = state.duettoMarketData.map((d) =>
          d.costarBenchmarkId === benchmarkId ? { ...d, currency } : d
        );
        set({ duettoMarketData });
      },

      setRmsEffectiveness: (rmsEffectivenessMonthly) => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          state.outputCurrency,
          state.exchangeRates,
          rmsEffectivenessMonthly
        );
        set({ rmsEffectivenessMonthly, projections, yearlyProjections });
      },

      setOutputCurrency: (outputCurrency) => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          outputCurrency,
          state.exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ outputCurrency, projections, yearlyProjections });
      },

      updateExchangeRate: (currency, rate) => {
        const state = get();
        const exchangeRates = { ...state.exchangeRates, [currency]: rate };
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties,
          state.outputCurrency,
          exchangeRates,
          state.rmsEffectivenessMonthly
        );
        set({ exchangeRates, projections, yearlyProjections });
      },
    }),
    {
      name: "duetto-roi-calculator",
      partialize: (state) => ({
        inputs: state.inputs,
        portfolioProperties: state.portfolioProperties,
        scenario: state.scenario,
        assumptions: state.assumptions,
        capRate: state.capRate,
        hourlyLaborRate: state.hourlyLaborRate,
        preparedBy: state.preparedBy,
        nextSteps: state.nextSteps,
        duettoMarketData: state.duettoMarketData,
        outputCurrency: state.outputCurrency,
        exchangeRates: state.exchangeRates,
        costarBenchmarks: state.costarBenchmarks,
        rmsEffectivenessMonthly: state.rmsEffectivenessMonthly,
      }),
      // Recalculate projections from restored inputs/settings on page load,
      // so they reflect the correct outputCurrency instead of the default USD values.
      merge: (persisted, current) => {
        const p = persisted as Partial<CalculatorState>;
        const merged = { ...current, ...p } as typeof current;
        const rmsEff = merged.rmsEffectivenessMonthly?.length === 12
          ? merged.rmsEffectivenessMonthly
          : DEFAULT_RMS_EFFECTIVENESS;
        const { projections, yearlyProjections } = recalculate(
          merged.inputs,
          merged.assumptions,
          merged.hourlyLaborRate,
          merged.capRate,
          merged.portfolioProperties,
          merged.outputCurrency,
          merged.exchangeRates,
          rmsEff
        );
        return { ...merged, rmsEffectivenessMonthly: rmsEff, projections, yearlyProjections };
      },
    }
  )
);
