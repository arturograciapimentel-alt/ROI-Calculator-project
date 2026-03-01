"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CalculatorState,
  CoStarBenchmark,
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
  setCostarBenchmark: (data: CoStarBenchmark | null) => void;
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

function recalculate(
  inputs: PropertyInputs,
  assumptions: CalculatorState["assumptions"],
  hourlyLaborRate: number,
  capRate: number
) {
  const duettoAnnualCost = inputs.duettoAnnualCost || estimateDuettoCost(inputs.totalRooms);
  const effectiveInputs = { ...inputs, duettoAnnualCost };

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
      costarBenchmark: null,
      nextSteps:
        "• Schedule a 60-minute technical demo with the Duetto implementation team\n• Review integration requirements with your PMS vendor\n• Connect with references from similar properties in your market",

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateInputs: (newInputs) => {
        const state = get();
        const inputs = { ...state.inputs, ...newInputs };
        const { projections, yearlyProjections } = recalculate(
          inputs,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate
        );
        set({ inputs, projections, yearlyProjections });
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
          state.capRate
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
          state.capRate
        );
        set({ inputs, projections, yearlyProjections });
      },

      resetInputs: () => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          DEFAULT_INPUTS,
          state.assumptions,
          state.hourlyLaborRate,
          state.capRate
        );
        set({ inputs: DEFAULT_INPUTS, projections, yearlyProjections });
      },

      setCapRate: (capRate) => {
        const state = get();
        set({ capRate });
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          state.hourlyLaborRate,
          capRate
        );
        set({ projections, yearlyProjections });
      },

      setHourlyLaborRate: (hourlyLaborRate) => {
        const state = get();
        const { projections, yearlyProjections } = recalculate(
          state.inputs,
          state.assumptions,
          hourlyLaborRate,
          state.capRate
        );
        set({ hourlyLaborRate, projections, yearlyProjections });
      },

      setPreparedBy: (preparedBy) => set({ preparedBy }),
      setNextSteps: (nextSteps) => set({ nextSteps }),
      setCostarBenchmark: (costarBenchmark) => set({ costarBenchmark }),
    }),
    {
      name: "duetto-roi-calculator",
      partialize: (state) => ({
        inputs: state.inputs,
        scenario: state.scenario,
        assumptions: state.assumptions,
        capRate: state.capRate,
        hourlyLaborRate: state.hourlyLaborRate,
        preparedBy: state.preparedBy,
        nextSteps: state.nextSteps,
      }),
    }
  )
);
