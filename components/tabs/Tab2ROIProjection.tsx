"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, SliderInput, SelectInput } from "@/components/ui/InputField";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, formatPercent, computeDuettoAnnualCost, aggregatePortfolioInputs, DEFAULT_RMS_EFFECTIVENESS } from "@/lib/calculations";
import type { Currency, Scenario, ScenarioAssumptions } from "@/lib/types";

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "MXN", label: "MXN (MX$)" },
  { value: "CAD", label: "CAD (CA$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "JPY", label: "JPY (¥)" },
];
import { clsx } from "clsx";

const SCENARIO_COLORS: Record<Scenario, string> = {
  conservative: "#7459EE",
  moderate: "#68FFF2",
  aggressive: "#C4FF45",
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
    blue: "border-[#7459EE]/30 bg-[#7459EE]/5",
  };
  const textColors = {
    gold: "text-gold-400",
    emerald: "text-emerald-brand",
    blue: "text-[#7459EE]",
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
  const { inputs, scenario, assumptions, projections, setScenario, updateAssumption, portfolioProperties, marketSignalApplied, outputCurrency, setOutputCurrency, rmsEffectivenessMonthly, setRmsEffectiveness } = useCalculatorStore();
  const proj = projections[scenario];
  const currency = outputCurrency;
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;
  const effectiveCost = computeDuettoAnnualCost(effectiveInputs);
  const currentRevPAR = effectiveInputs.currentADR * effectiveInputs.currentOccupancy;
  const revPARLift = proj.newRevPAR - currentRevPAR;
  const revPARLiftPercent = currentRevPAR > 0 ? (revPARLift / currentRevPAR) * 100 : 0;

  // RevPAR is the primary chart — current vs projected
  const revPARChartData = [
    { name: "Current RevPAR", value: parseFloat(currentRevPAR.toFixed(2)), fill: "#7459EE" },
    { name: "Projected RevPAR", value: parseFloat(proj.newRevPAR.toFixed(2)), fill: "#68FFF2" },
  ];

  // RevPAR uplift decomposed into ADR contribution and Occupancy contribution
  const revPARBreakdownData = [
    { name: "ADR Impact",          value: proj.incrementalADRRevenue,  fill: "#C4FF45" },
    { name: "Occ. Impact",        value: proj.incrementalOccRevenue,  fill: "#68FFF2" },
    { name: "Systems Cost Savings", value: proj.systemsCostSavings,   fill: "#FFD9A0" },
  ].filter((d) => d.value > 0);

  const asmp = assumptions[scenario];

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">ROI Projection Engine</h2>
          <p className="text-white/40 text-sm font-sans mt-1">
            Adjust scenario assumptions and see your projected RevPAR impact update in real time
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white/30 text-xs font-sans whitespace-nowrap">Display in</span>
          <SelectInput
            value={outputCurrency}
            onChange={(e) => setOutputCurrency(e.target.value as Currency)}
            className="w-32 text-xs"
          >
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectInput>
        </div>
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
            {inputs.propertyName || (isPortfolioMode ? "Portfolio" : "Your Property")}
            {isPortfolioMode ? ` · ${portfolioProperties.length} properties` : ""} · {effectiveInputs.totalRooms} rooms ·{" "}
            {formatPercent(effectiveInputs.currentOccupancy)} {isPortfolioMode ? "blended " : ""}occupancy
          </p>
          <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-3xl font-serif font-bold text-emerald-brand">
                {revPARLift >= 0 ? "+" : ""}{formatCurrency(revPARLift, currency)}
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">RevPAR Lift</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-serif font-bold text-gold-400">
                {revPARLiftPercent >= 0 ? "+" : ""}{revPARLiftPercent.toFixed(1)}%
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">RevPAR Improvement</p>
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
              <p className="text-3xl font-serif font-bold text-[#7459EE]">
                {proj.roiMultiple.toFixed(1)}x
              </p>
              <p className="text-white/40 text-xs font-sans mt-1">ROI Multiple</p>
            </div>
          </div>
        </div>
      </div>

      {/* RevPAR Impact Charts — primary focus */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-emerald-brand/20">
          <h3 className="text-white font-serif font-semibold mb-1">RevPAR Improvement</h3>
          <p className="text-white/40 text-xs font-sans mb-4">
            Current vs. Projected Revenue Per Available Room
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revPARChartData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "rgba(14,33,36,0.98)", border: "1px solid rgba(104,255,242,0.3)", borderRadius: 8, color: "white" }}
                formatter={(v: number) => [formatCurrency(v, currency), ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {revPARChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 rounded-xl bg-emerald-brand/8 border border-emerald-brand/20 flex items-center justify-between">
            <span className="text-white/50 text-xs font-sans">RevPAR lift on {Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable inventory</span>
            <span className="text-emerald-brand font-semibold text-sm">{revPARLiftPercent >= 0 ? "+" : ""}{revPARLiftPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-white/8">
          <h3 className="text-white font-serif font-semibold mb-1">Revenue Impact Breakdown</h3>
          <p className="text-white/40 text-xs font-sans mb-4">Annual value by source</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revPARBreakdownData} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} />
              <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: "rgba(14,33,36,0.98)", border: "1px solid rgba(196,255,69,0.3)", borderRadius: 8, color: "white" }}
                formatter={(v: number) => [formatCurrency(v, currency), "Annual Value"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {revPARBreakdownData.map((entry, i) => (
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
        <p className="text-white/40 text-xs font-sans mb-2">
          Set the expected RevPAR uplift for this scenario. The model decomposes it: 60% attributed to ADR improvement (open pricing), 40% to occupancy (demand intelligence).
        </p>
        <div className="mb-4 p-2.5 rounded-lg bg-[#7459EE]/8 border border-[#7459EE]/20">
          <p className="text-[#7459EE]/80 text-[10px] font-sans leading-relaxed">
            <span className="font-semibold">Note on displayed RevPAR improvement:</span> The uplift you set here applies to <span className="font-semibold">yieldable inventory only</span> ({Math.round(effectiveInputs.yieldablePercent * 100)}% of room nights). The hotel-wide blended RevPAR improvement shown in charts and the Executive Summary will be lower: it equals <span className="font-semibold">scenario uplift × yieldable%</span>. Non-yieldable nights (group blocks, contracted rates) remain unchanged.
          </p>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white/60 text-xs font-sans uppercase tracking-wider">RevPAR Uplift</p>
          {marketSignalApplied && (
            <span className="flex items-center gap-1 text-[9px] font-bold bg-[#7459EE]/20 text-[#7459EE] px-1.5 py-0.5 rounded-full uppercase">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Market Calibrated
            </span>
          )}
        </div>
        <InputField
          label=""
          tooltip="Total RevPAR improvement from Duetto vs. current performance. Applied to yieldable inventory only. Decomposed internally: 60% from ADR (open pricing), 40% from occupancy (demand forecasting)."
        >
          <SliderInput
            value={Math.round(asmp.revparUpliftPercent * 100)}
            min={1}
            max={50}
            step={1}
            onChange={(v) => updateAssumption(scenario, "revparUpliftPercent", v / 100)}
            formatValue={(v) => `+${v}%`}
          />
        </InputField>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gold-500/8 border border-gold-500/20 text-center">
            <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider">ADR component</p>
            <p className="text-gold-400 font-semibold text-sm mt-0.5">
              +{(asmp.revparUpliftPercent * 60).toFixed(1)}%
            </p>
            <p className="text-white/20 text-[10px] font-sans">open pricing</p>
          </div>
          <div className="p-3 rounded-lg bg-[#7459EE]/8 border border-[#7459EE]/20 text-center">
            <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider">Occupancy component</p>
            <p className="text-[#7459EE] font-semibold text-sm mt-0.5">
              +{(asmp.revparUpliftPercent * 40).toFixed(1)}%
            </p>
            <p className="text-white/20 text-[10px] font-sans">demand intelligence</p>
          </div>
        </div>

        {/* Market Growth Rate */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-white/60 text-xs font-sans uppercase tracking-wider mb-3">Long-term Market Growth</p>
          <InputField
            label=""
            tooltip="Annual market growth rate for your region. Used to project revenue impact over the projection period."
          >
            <SliderInput
              value={Math.round((asmp.marketGrowthRate || 0) * 100)}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => updateAssumption(scenario, "marketGrowthRate", v / 100)}
              formatValue={(v) => `+${v}%`}
            />
          </InputField>
        </div>

        {/* RevPAR Uplift Degradation */}
        <div className="mt-4">
          <p className="text-white/60 text-xs font-sans uppercase tracking-wider mb-3">Competitive Response</p>
          <InputField
            label=""
            tooltip="Annual degradation of your RevPAR advantage as competitors implement similar strategies. 0% = maintain advantage; 5% = lose 5% of uplift per year."
          >
            <SliderInput
              value={Math.round((asmp.revparUpliftDegradationRate ?? 0) * 100)}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateAssumption(scenario, "revparUpliftDegradationRate", v / 100)}
              formatValue={(v) => `${v}% decay/yr`}
            />
          </InputField>
        </div>
      </div>

      {/* Revenue Component Cards — RevPAR focused */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-emerald-brand/20 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-brand" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">RevPAR Impact</p>
          </div>
          <div>
            <p className="text-2xl font-serif font-bold text-emerald-brand">
              +{formatCurrency(revPARLift, currency)}
            </p>
            <p className="text-xs text-white/30 font-sans mt-0.5">per available room per night</p>
          </div>
          <div className="flex gap-4 pt-1">
            <div>
              <p className="text-white/40 text-xs font-sans">Current</p>
              <p className="text-white font-semibold font-sans text-sm">{formatCurrency(currentRevPAR, currency)}</p>
            </div>
            <div className="text-white/20">→</div>
            <div>
              <p className="text-emerald-brand text-xs font-sans">Projected</p>
              <p className="text-emerald-brand font-semibold font-sans text-sm">{formatCurrency(proj.newRevPAR, currency)}</p>
            </div>
          </div>
          <ExplanationCard
            title="Yieldable Scope"
            body={`${Math.round(effectiveInputs.yieldablePercent * 100)}% of ${isPortfolioMode ? "portfolio" : "your"} room nights are in yieldable segments where Duetto's open pricing applies. The RevPAR lift is calculated on this optimizable inventory.`}
            color="emerald"
          />
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold-500" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">ADR Optimization</p>
          </div>
          <p className="text-2xl font-serif font-bold text-gold-400">
            {formatCurrency(proj.annualIncrementalRoomRevenue * (proj.incrementalADRRevenue / (proj.incrementalADRRevenue + proj.incrementalOccRevenue || 1)), currency, true)}
          </p>
          <p className="text-white/40 text-xs font-sans">
            {formatCurrency(effectiveInputs.currentADR, currency)} → {formatCurrency(proj.newADR, currency)} {isPortfolioMode ? "blended " : ""}ADR on yieldable segments
          </p>
          <ExplanationCard
            title="Open Pricing"
            body="Rate each room type, segment, and channel independently — not just BAR-based flat adjustments."
            color="gold"
          />
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7459EE]" />
            <p className="text-white/60 text-xs font-sans uppercase tracking-wider">Occupancy Uplift</p>
          </div>
          <p className="text-2xl font-serif font-bold text-[#7459EE]">
            {formatCurrency(proj.incrementalOccRevenue, currency, true)}
          </p>
          <p className="text-white/40 text-xs font-sans">
            {formatPercent(effectiveInputs.currentOccupancy)} → {formatPercent(proj.newOccupancy)} {isPortfolioMode ? "blended " : ""}occupancy
          </p>
          <ExplanationCard
            title="Demand Intelligence"
            body="AI-powered demand forecasting fills shoulder dates, optimizes LOS restrictions, and reduces occupancy gaps across all yieldable segments."
            color="blue"
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
                  label: "RevPAR Lift",
                  fmt: (p: typeof projections.conservative) => {
                    const lift = p.newRevPAR - currentRevPAR;
                    const pct = currentRevPAR > 0 ? (lift / currentRevPAR * 100).toFixed(1) : "0";
                    const sign = lift >= 0 ? "+" : "";
                    return `${sign}${formatCurrency(lift, currency)} (${sign}${pct}%)`;
                  },
                  bold: true,
                },
                {
                  label: "New RevPAR",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.newRevPAR, currency),
                  bold: true,
                },
                {
                  label: "ADR Uplift",
                  fmt: (p: typeof projections.conservative) =>
                    formatCurrency(p.newADR - effectiveInputs.currentADR, currency) + "/night",
                },
                {
                  label: "New Occupancy",
                  fmt: (p: typeof projections.conservative) => formatPercent(p.newOccupancy),
                },
                {
                  label: "Incremental Room Rev.",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.annualIncrementalRoomRevenue, currency, true),
                },
                {
                  label: "Systems Cost Savings",
                  fmt: (p: typeof projections.conservative) => formatCurrency(p.systemsCostSavings, currency, true),
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
                  label: "Payback Period (Yr 1)",
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

      {/* RMS Effectiveness Schedule */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h3 className="text-white font-serif font-semibold">RMS Effectiveness Schedule — Year 1</h3>
            <p className="text-white/40 text-xs font-sans mt-1 max-w-2xl">
              Models the learning curve as your team adopts Duetto. Months 1–2 default to 0% (implementation &amp; go-live, ~6–8 weeks). Revenue each month = <span className="text-gold-400 font-mono">effectiveness% × (Projected RevPAR − Current RevPAR) × rooms × 30</span>. Year 1 total drives the 5-year projection Year 1 value.
            </p>
          </div>
          <button
            onClick={() => setRmsEffectiveness([...DEFAULT_RMS_EFFECTIVENESS])}
            className="text-[10px] font-sans text-white/30 hover:text-white/60 border border-white/10 rounded px-2 py-1 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Reset defaults
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2 mt-4">
          {rmsEffectivenessMonthly.map((val, i) => {
            const isImpl = i < 2;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <p className="text-white/30 text-[10px] font-sans">M{i + 1}</p>
                {isImpl && (
                  <p className="text-[9px] font-sans text-[#7459EE]/60 -mt-0.5 mb-0.5">impl.</p>
                )}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(val * 100)}
                  onChange={(e) => {
                    const next = [...rmsEffectivenessMonthly];
                    next[i] = Math.min(1, Math.max(0, Number(e.target.value) / 100));
                    setRmsEffectiveness(next);
                  }}
                  className={clsx(
                    "w-full text-center text-sm font-sans font-semibold rounded-lg border py-2 bg-navy-800/60 outline-none focus:border-gold-500/50 transition-colors",
                    isImpl
                      ? "border-[#7459EE]/30 text-[#7459EE]/70"
                      : val === 0
                      ? "border-white/10 text-white/30"
                      : val >= 1
                      ? "border-emerald-brand/40 text-emerald-brand"
                      : "border-white/15 text-white"
                  )}
                />
                <p className="text-white/20 text-[10px] font-sans">%</p>
                {/* Mini bar */}
                <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all", isImpl ? "bg-[#7459EE]/50" : "bg-gold-500/60")}
                    style={{ width: `${val * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-white/30 text-[10px] font-sans">
            Year 1 avg. effectiveness: <span className="text-gold-400 font-semibold">
              {Math.round(rmsEffectivenessMonthly.reduce((s, e) => s + e, 0) / rmsEffectivenessMonthly.length * 100)}%
            </span>
          </p>
          <p className="text-white/20 text-[10px] font-sans">
            Edit each month (0–100%). Months 1–2 represent the implementation period.
          </p>
        </div>
      </div>

      {/* Time Efficiency Callout */}
      {proj.hoursSavedPerWeek > 0 && (
        <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white/3 border border-white/8">
          <div className="p-2 rounded-lg bg-gold-500/15 text-gold-400 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white/80 text-sm font-sans font-semibold">
              ~{proj.hoursSavedPerWeek.toFixed(0)} hrs/week reclaimed for strategic work
            </p>
            <p className="text-white/35 text-xs font-sans mt-0.5">
              Duetto automates rate-setting, inventory management, and reporting tasks — freeing your team to focus on strategy, not spreadsheets.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="RevPAR Improvement"
          value={`${revPARLiftPercent >= 0 ? "+" : ""}${revPARLiftPercent.toFixed(1)}%`}
          subtitle={`${formatCurrency(currentRevPAR, currency)} → ${formatCurrency(proj.newRevPAR, currency)}`}
          variant="emerald"
          size="sm"
        />
        <MetricCard
          label="Incremental Revenue"
          value={formatCurrency(proj.totalIncrementalRevenue, currency, true)}
          subtitle="Room revenue + group uplift"
          variant="gold"
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
