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
  SAMPLE_PROPERTY,
  estimateDuettoCost,
  aggregatePortfolioInputs,
  createPortfolioProperty,
} from "@/lib/calculations";

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
  setPortfolioProperties: (props: PortfolioProperty[]) => void;
  updatePortfolioProperty: (id: string, updates: Partial<Omit<PortfolioProperty, "id">>) => void;
  setDuettoHotelCount: (benchmarkId: string, count: number) => void;
  updateDuettoHotel: (benchmarkId: string, hotelId: string, updates: Partial<Omit<DuettoMarketHotel, "id">>) => void;
};

const DEFAULT_INPUTS: PropertyInputs = {
  propertyName: "",
  propertyType: "upscale-upper-midscale",
  totalRooms: 200,
  starRating: 4,
  location: "",
  currency: "USD",
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
  annualRMLaborCost: 100000,
  duettoAnnualCost: 0,
};

function createBlankHotel(benchmarkId: string, index: number): DuettoMarketHotel {
  return {
    id: `dh-${benchmarkId}-${Date.now()}-${index}`,
    name: "",
    currentRoomNights: 0,
    currentADR: 0,
    currentRevPAR: 0,
    currentRoomRevenue: 0,
    priorRoomNights: 0,
    priorADR: 0,
    priorRevPAR: 0,
    priorRoomRevenue: 0,
  };
}

function recalculate(
  inputs: PropertyInputs,
  assumptions: CalculatorState["assumptions"],
  hourlyLaborRate: number,
  capRate: number,
  portfolioProperties: PortfolioProperty[] = []
) {
  // When portfolio mode is active, aggregate per-property data into blended inputs
  const baseInputs = portfolioProperties.length >= 2
    ? aggregatePortfolioInputs(inputs, portfolioProperties)
    : inputs;

  const duettoAnnualCost = baseInputs.duettoAnnualCost || estimateDuettoCost(baseInputs.totalRooms);
  const effectiveInputs = { ...baseInputs, duettoAnnualCost };

  const projections = {
    conservative: calculateROI(effectiveInputs, assumptions.conservative, hourlyLaborRate),
    moderate: calculateROI(effectiveInputs, assumptions.moderate, hourlyLaborRate),
    aggressive: calculateROI(effectiveInputs, assumptions.aggressive, hourlyLaborRate),
  };

  const yearlyProjections = calculateYearlyProjections(
    effectiveInputs,
    assumptions.moderate,
    hourlyLaborRate
  );

  return { projections, yearlyProjections };
}

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
      activeTab: 0,
      inputs: DEFAULT_INPUTS,
      portfolioProperties: [],
      scenario: "moderate",
      assumptions: {
        conservative: { ...DEFAULT_ASSUMPTIONS.conservative },
        moderate: { ...DEFAULT_ASSUMPTIONS.moderate },
        aggressive: { ...DEFAULT_ASSUMPTIONS.aggressive },
      },
      projections: {
        conservative: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.conservative, 50),
        moderate: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.moderate, 50),
        aggressive: calculateROI(DEFAULT_INPUTS, DEFAULT_ASSUMPTIONS.aggressive, 50),
      },
      yearlyProjections: calculateYearlyProjections(
        DEFAULT_INPUTS,
        DEFAULT_ASSUMPTIONS.moderate,
        50
      ),
      capRate: 0.075,
      hourlyLaborRate: 50,
      preparedBy: "",
      costarBenchmarks: [],
      duettoMarketData: [],
      nextSteps:
        "• Schedule a 60-minute technical demo with the Duetto implementation team\n• Review integration requirements with your PMS vendor\n• Connect with references from similar properties in your market",

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

        const { projections, yearlyProjections } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          portfolioProperties
        );
        set({ inputs, portfolioProperties, projections, yearlyProjections });
      },

      setScenario: (scenario) => set({ scenario }),

      updateAssumption: (scenario, key, value) => {
        const state = get();
        const assumptions = {
          ...state.assumptions,
          [scenario]: {
            ...state.assumptions[scenario],
            [key]: value,
          },
        };
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          assumptions,
          state.hourlyLaborRate,
          state.capRate,
          state.portfolioProperties
        );
        set({ assumptions, projections, yearlyProjections });
      },

      loadSampleData: () => {
        const state = get();
        const inputs = { ...SAMPLE_PROPERTY };
        const { projections, yearlyProjections } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          []
        );
        set({ inputs, portfolioProperties: [], projections, yearlyProjections });
      },

      resetInputs: () => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          DEFAULT_INPUTS,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate,
          []
        );
        set({ inputs: DEFAULT_INPUTS, portfolioProperties: [], projections, yearlyProjections });
      },

      setCapRate: (capRate) => {
        const state = get();
        set({ capRate });
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          capRate,
          state.portfolioProperties
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
          state.portfolioProperties
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
          portfolioProperties
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
          portfolioProperties
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
        const entry: DuettoMarketData = { costarBenchmarkId: benchmarkId, hotels };
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
      }),
    }
  )
);
