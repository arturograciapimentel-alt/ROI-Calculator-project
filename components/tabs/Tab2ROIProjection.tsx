"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, SliderInput } from "@/components/ui/InputField";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, formatPercent, estimateDuettoCost } from "@/lib/calculations";
import type { Scenario, ScenarioAssumptions } from "@/lib/types";
import { clsx } from "clsx";

const SCENARIO_COLORS: Record<Scenario, string> = {
  conservative: "#60a5fa",
  moderate: "#00C389",
  aggressive: "#D4A853",
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
};

function AnimatedValue({ value, currency }: { value: number; currency: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, value);
      setDisplayed(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{formatCurrency(displayed, currency, true)}</>;
}

interface ExplanationCardProps {
  title: string;
  body: string;
  color?: "gold" | "emerald" | "blue";
}
function ExplanationCard({ title, body, color = "gold" }: ExplanationCardProps) {
  const colors = {
    gold: "border-gold-500/30 bg-gold-500/5",
    emerald: "border-emerald-brand/30 bg-emerald-brand/5",
    blue: "border-blue-400/30 bg-blue-400/5",
  };
  const textColors = {
    gold: "text-gold-400",
    emerald: "text-emerald-brand",
    blue: "text-blue-400",
  };
  return (
    <div className={clsx("rounded-xl p-4 border", colors[color])}>
      <p className={clsx("text-xs font-semibold font-sans uppercase tracking-wider mb-1", textColors[color])}>
        {title}
      </p>
      <p className="text-white/50 text-xs font-sans leading-relaxed">{body}</p>
    </div>
  );
}

export function Tab2ROIProjection() {
  const { inputs, scenario, assumptions, projections, setScenario, updateAssumption } = useCalculatorStore();
  const proj = projections[scenario];
  const currency = inputs.currency;
  const effectiveCost = inputs.duettoAnnualCost || estimateDuettoCost(inputs.totalRooms);
  const currentRevPAR = inputs.currentADR * inputs.currentOccupancy;

  const adrChartData = [
    { name: "Current ADR", value: inputs.currentADR, fill: "#60a5fa" },
    { name: "Projected ADR", value: proj.newADR, fill: "#D4A853" },
  ];

  const revPARChartData = [
    { name: "Current RevPAR", value: parseFloat(currentRevPAR.toFixed(2)), fill: "#60a5fa" },
    { name: "Projected RevPAR", value: parseFloat(proj.newRevPAR.toFixed(2)), fill: "#00C389" },
  ];

  const breakdownData = [
    { name: "ADR Uplift", value: proj.annualIncrementalRoomRevenue * 0.6, fill: "#D4A853" },
    { name: "Occ. Uplift", value: proj.annualIncrementalRoomRevenue * 0.4, fill: "#00C389" },
    { name: "Group Rev.", value: proj.groupRevenue, fill: "#818cf8" },
    { name: "Distribution", value: proj.distributionSavings, fill: "#fb923c" },
    { name: "Labor Savings", value: proj.laborSavings, fill: "#e879f9" },
  ].filter((d) => d.value > 0);

  const scenarioCompareData = [
    {
      metric: "Annual Impact",
      conservative: Math.round(projections.conservative.totalAnnualImpact),
      moderate: Math.round(projections.moderate.totalAnnualImpact),
      aggressive: Math.round(projections.aggressive.totalAnnualImpact),
    },
    {
      metric: "ROI Multiple",
      conservative: parseFloat(projections.conservative.roiMultiple.toFixed(1)),
      moderate: parseFloat(projections.moderate.roiMultiple.toFixed(1)),
      aggressive: parseFloat(projections.aggressive.roiMultiple.toFixed(1)),
    },
  ];

  const asmp = assumptions[scenario];

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white">ROI Projection Engine</h2>
        <p className="text-white/40 text-sm font-sans mt-1">
          Adjust scenario assumptions and see your projected financial impact update in real time
        </p>
      </div>

      {/* Scenario Toggle */}
      <div className="flex items-center gap-2 p-1.5 bg-navy-800/60 border border-white/10 rounded-2xl w-fit">
        {(["conservative", "moderate", "aggressive"] as Scenario[]).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-sans font-medium transition-all duration-200 relative",
              scenario === s
                ? "text-navy-900 shadow-lg"
                : "text-white/50 hover:text-white/80"
            )}
            style={scenario === s ? { backgroundColor: SCENARIO_COLORS[s] } : {}}
          >
            {SCENARIO_LABELS[s]}
            {s === "moderate" && scenario !== "moderate" && (
              <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-navy-900 text-[9px] font-bold px-1 rounded-full">
                LIKELY
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Hero Impact Number */}
      <div className="glass-card rounded-3xl p-8 border border-gold-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-emerald-brand/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/8 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 text-center">
          <p className="text-white/40 text-sm font-sans uppercase tracking-[0.2em] mb-3">
            Total Annual Financial Impact — {SCENARIO_LABELS[scenario]} Scenario
          </p>
          <div className="text-6xl font-serif font-bold text-gold-400 hero-number mb-3">
            <AnimatedValue value={proj.totalAnnualImpact} currency={currency} />
          </div>
          <p className="text-white/40 text-sm font-sans">
            {inputs.propertyName || "Your Property"} · {inputs.totalRooms} rooms ·{" "}
            {formatPercent(inputs.currentOccupancy)} occupancy
          </p>
          <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-3xl font-serif font-bold text-emerald-brand">
                {proj.roiMultiple.toFixed(1)}x
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">ROI Multiple</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-serif font-bold text-white">
                {proj.paybackMonths.toFixed(1)} mo
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">Payback Period</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-serif font-bold text-blue-400">
                {proj.netROIPercent.toFixed(0)}%
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">Net ROI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Breakdown Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-white/8">
          <h3 className="text-white font-serif font-semibold mb-1">ADR Comparison</h3>
          <p className="text-white/40 text-xs font-sans mb-4">Current vs. Projected Average Daily Rate</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={adrChartData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "rgba(10,22,40,0.98)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 8, color: "white" }}
                formatter={(v: number) => [formatCurrency(v, currency), ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {adrChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-white/8">
          <h3 className="text-white font-serif font-semibold mb-1">Revenue Impact Breakdown</h3>
          <p className="text-white/40 text-xs font-sans mb-4">Annual value by source</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={breakdownData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} />
              <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: "rgba(10,22,40,0.98)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 8, color: "white" }}
                formatter={(v: number) => [formatCurrency(v, currency), "Annual Value"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {breakdownData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assumption Sliders */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">
          {SCENARIO_LABELS[scenario]} Scenario Assumptions
        </h3>
        <p className="text-white/40 text-xs font-sans mb-6">
          Fine-tune the projections for this scenario. Changes update all calculations instantly.
        </p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-6">
          <div className="space-y-4">
            <InputField label="ADR Uplift from Open Pricing" tooltip="Additional rate revenue from Duetto's dynamic open pricing methodology vs. BAR-based systems">
              <SliderInput
                value={Math.round(asmp.adrUpliftPercent * 100)}
                min={1}
                max={15}
                step={0.5}
                onChange={(v) => updateAssumption(scenario, "adrUpliftPercent", v / 100)}
                formatValue={(v) => `+${v}%`}
              />
            </InputField>

            <InputField label="Occupancy Point Improvement" tooltip="Additional occupancy percentage points from superior demand forecasting and length-of-stay optimization">
              <SliderInput
                value={Math.round(asmp.occupancyUpliftPoints * 100)}
                min={0}
                max={8}
                step={0.5}
                onChange={(v) => updateAssumption(scenario, "occupancyUpliftPoints", v / 100)}
                formatValue={(v) => `+${v} pts`}
              />
            </InputField>
          </div>

          <div className="space-y-4">
            <InputField label="Group Pricing Improvement" tooltip="Improved group rates and displacement analysis reduces underpriced group business">
              <SliderInput
                value={Math.round(asmp.groupPricingImprovementPercent * 100)}
                min={0}
                max={15}
                step={0.5}
                onChange={(v) => updateAssumption(scenario, "groupPricingImprovementPercent", v / 100)}
                formatValue={(v) => `+${v}%`}
              />
            </InputField>

            <InputField label="OTA→Direct Channel Shift" tooltip="% of OTA bookings shifted to direct channels, reducing commission costs">
              <SliderInput
                value={Math.round(asmp.channelShiftPercent * 100)}
                min={0}
                max={15}
                step={0.5}
                onChange={(v) => updateAssumption(scenario, "channelShiftPercent", v / 100)}
                formatValue={(v) => `+${v}%`}
              />
            </InputField>
          </div>
        </div>
      </div>

      {/* Revenue Component Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold-500" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">ADR Optimization</p>
          </div>
          <p className="text-2xl font-serif font-bold text-gold-400">
            {formatCurrency(proj.annualIncrementalRoomRevenue * 0.6, currency, true)}
          </p>
          <p className="text-white/40 text-xs font-sans">
            +{formatCurrency(proj.newADR - inputs.currentADR, currency)} per night average
          </p>
          <ExplanationCard
            title="Open Pricing"
            body="Rate each room type, segment, and channel independently — not just BAR-based flat adjustments."
            color="gold"
          />
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-brand" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">Occupancy Uplift</p>
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-brand">
            {formatCurrency(proj.annualIncrementalRoomRevenue * 0.4 + proj.groupRevenue, currency, true)}
          </p>
          <p className="text-white/40 text-xs font-sans">
            {formatPercent(inputs.currentOccupancy)} → {formatPercent(proj.newOccupancy)} occupancy
          </p>
          <ExplanationCard
            title="Demand Intelligence"
            body="AI-powered forecasting fills shoulder dates, optimizes LOS restrictions, and reduces occupancy gaps."
            color="emerald"
          />
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">Cost Savings</p>
          </div>
          <p className="text-2xl font-serif font-bold text-orange-400">
            {formatCurrency(proj.totalCostSavings, currency, true)}
          </p>
          <p className="text-white/40 text-xs font-sans">
            Distribution: {formatCurrency(proj.distributionSavings, currency, true)} · Labor: {formatCurrency(proj.laborSavings, currency, true)}
          </p>
          <ExplanationCard
            title="Channel Optimization"
            body="Shift bookings from high-commission OTAs to direct channels and automate manual pricing workflows."
            color="gold"
          />
        </div>
      </div>

      {/* Scenario Comparison Table */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Scenario Comparison</h3>
        <p className="text-white/40 text-xs font-sans mb-5">
          Side-by-side view of all three projection scenarios
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider pb-3 pr-6">Metric</th>
                {(["conservative", "moderate", "aggressive"] as Scenario[]).map((s) => (
                  <th
                    key={s}
                    className={clsx(
                      "text-center pb-3 px-4 text-xs uppercase tracking-wider",
                      s === "moderate" ? "text-emerald-brand" : "text-white/40"
                    )}
                  >
                    {SCENARIO_LABELS[s]}
                    {s === "moderate" && (
                      <span className="ml-1.5 bg-emerald-brand/20 text-emerald-brand text-[9px] px-1.5 py-0.5 rounded-full">
                        MOST LIKELY
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                {
                  label: "ADR Uplift",
                  fmt: (p: typeof projections.conservative) =>
                    formatCurrency(p.newADR - inputs.currentADR, currency) + "/night",
                },
                {
                  label: "New Occupancy",
                  fmt: (p: typeof projections.conservative) => formatPercent(p.newOccupancy),
                },
                {
                  label: "New RevPAR",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.newRevPAR, currency),
                },
                {
                  label: "Incremental Room Rev.",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.annualIncrementalRoomRevenue, currency, true),
                },
                {
                  label: "Group Revenue Uplift",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.groupRevenue, currency, true),
                },
                {
                  label: "Distribution Savings",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.distributionSavings, currency, true),
                },
                {
                  label: "Labor Savings",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.laborSavings, currency, true),
                },
                {
                  label: "Total Annual Impact",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.totalAnnualImpact, currency, true),
                  bold: true,
                },
                {
                  label: "ROI Multiple",
                  fmt: (p: typeof projections.conservative) => `${p.roiMultiple.toFixed(1)}x`,
                  bold: true,
                },
                {
                  label: "Payback Period",
                  fmt: (p: typeof projections.conservative) => `${p.paybackMonths.toFixed(1)} months`,
                  bold: true,
                },
              ].map(({ label, fmt, bold }) => (
                <tr key={label} className="hover:bg-white/2 transition-colors">
                  <td className={clsx("py-3 pr-6 text-white/50", bold && "text-white/70 font-semibold")}>{label}</td>
                  {(["conservative", "moderate", "aggressive"] as Scenario[]).map((s) => (
                    <td
                      key={s}
                      className={clsx(
                        "text-center py-3 px-4",
                        bold ? "text-white font-semibold" : "text-white/70",
                        s === "moderate" && bold && "text-emerald-brand"
                      )}
                    >
                      {fmt(projections[s])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Incremental Revenue"
          value={formatCurrency(proj.totalIncrementalRevenue, currency, true)}
          subtitle="New room + group revenue"
          variant="gold"
          size="sm"
        />
        <MetricCard
          label="Cost Savings"
          value={formatCurrency(proj.totalCostSavings, currency, true)}
          subtitle="Distribution + labor"
          variant="emerald"
          size="sm"
        />
        <MetricCard
          label="Duetto Investment"
          value={formatCurrency(effectiveCost, currency)}
          subtitle="Annual subscription"
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Net Annual Benefit"
          value={formatCurrency(proj.totalAnnualImpact - effectiveCost, currency, true)}
          subtitle="Impact minus investment"
          variant="gold"
          size="sm"
        />
      </div>
    </div>
  );
}
