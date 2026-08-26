"use client";
import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend,
  ComposedChart, Line,
} from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, SliderInput, SelectInput } from "@/components/ui/InputField";
import type { Currency } from "@/lib/types";

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "MXN", label: "MXN (MX$)" },
  { value: "CAD", label: "CAD (CA$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "JPY", label: "JPY (¥)" },
];
import { formatCurrency, estimateDuettoCost, computeDuettoAnnualCost, computeDuettoYearlyCosts, aggregatePortfolioInputs } from "@/lib/calculations";
import { clsx } from "clsx";

function yearLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Year ${i + 1}`);
}

function CalloutBadge({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-gold-500/30 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent" />
      <div className="relative z-10">
        <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-2">{label}</p>
        <p className="text-3xl font-serif font-bold text-gold-400">{value}</p>
        {sub && <p className="text-white/40 text-xs font-sans mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function Tab3FiveYear() {
  const { inputs, yearlyProjections, assumptions, scenario, updateAssumption, portfolioProperties, outputCurrency, setOutputCurrency, marketGrowthCalibrated } = useCalculatorStore();
  const currency = outputCurrency;
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;
  const effectiveCost = computeDuettoAnnualCost(effectiveInputs);
  const projectionYears = inputs.projectionYears || 5;
  const yearlyCosts = computeDuettoYearlyCosts(effectiveInputs, projectionYears);
  const contractYears = effectiveInputs.initialContractYears || 1;
  const projectionLabel = `${projectionYears}-Year`;
  const hasImplementationFee = (effectiveInputs.implementationFee || 0) > 0;
  const hasEscalation = contractYears <= projectionYears; // escalation kicks in within the projection window
  const asmp = assumptions[scenario];

  const totalFiveYearImpact = yearlyProjections.reduce((sum, y) => sum + y.totalImpact, 0);
  const totalFiveYearNet = yearlyProjections.reduce((sum, y) => sum + y.netBenefit, 0);
  const totalFiveYearInvestment = yearlyProjections.reduce((sum, y) => sum + y.duettoInvestment, 0);
  const fiveYearROIMultiple = totalFiveYearImpact / totalFiveYearInvestment;

  // Final-year projection, used by the revenue waterfall chart
  const year5Projection = yearlyProjections[yearlyProjections.length - 1];

  // Break-even month calculation
  const monthlyImpact = yearlyProjections[0] ? yearlyProjections[0].totalImpact / 12 : 0;
  const breakEvenMonth = monthlyImpact > 0 ? Math.ceil(effectiveCost / monthlyImpact) : 99;

  const YEAR_LABELS = yearLabels(projectionYears);

  // Chart data
  const chartData = yearlyProjections.map((y, i) => ({
    name: YEAR_LABELS[i],
    revenue: Math.round(y.incrementalRevenue),
    savings: Math.round(y.costSavings),
    investment: Math.round(y.duettoInvestment),
    cumulative: Math.round(y.cumulativeNetBenefit),
    total: Math.round(y.totalImpact),
    net: Math.round(y.netBenefit),
  }));

  const cumulativeChartData = Array.from({ length: projectionYears * 12 }, (_, i) => {
    const month = i + 1;
    const yearIdx = Math.floor(i / 12);
    const yearData = yearlyProjections[Math.min(yearIdx, projectionYears - 1)];
    const monthlyTotal = yearData ? yearData.totalImpact / 12 : 0;
    const cumulativeTotal = monthlyTotal * month;
    const cumulativeCost = effectiveCost * (month / 12);
    return {
      month: `M${month}`,
      benefit: Math.round(cumulativeTotal),
      cost: Math.round(cumulativeCost),
      net: Math.round(cumulativeTotal - cumulativeCost),
    };
  });

  const baseAnnualRevenue = Math.round(effectiveInputs.currentADR * effectiveInputs.currentOccupancy * effectiveInputs.totalRooms * 365);
  const waterfall = [
    { name: "Current Annual\nRevenue", base: 0, value: baseAnnualRevenue, type: "base" },
    {
      name: `ADR Uplift\n(Yr ${projectionYears})`,
      base: baseAnnualRevenue,
      value: Math.round(year5Projection?.incrementalRevenue * 0.5 || 0),
      type: "positive",
    },
    {
      name: `Occ. Uplift\n(Yr ${projectionYears})`,
      base: baseAnnualRevenue + Math.round((year5Projection?.incrementalRevenue || 0) * 0.5),
      value: Math.round((year5Projection?.incrementalRevenue || 0) * 0.35),
      type: "positive",
    },
    {
      name: "Group\nOptimization",
      base: baseAnnualRevenue + Math.round((year5Projection?.incrementalRevenue || 0) * 0.85),
      value: Math.round((year5Projection?.incrementalRevenue || 0) * 0.15 + (year5Projection?.costSavings || 0)),
      type: "positive",
    },
    {
      name: `Projected Yr ${projectionYears}\nTotal Revenue`,
      base: 0,
      value: baseAnnualRevenue + Math.round(year5Projection?.totalImpact || 0),
      type: "total",
    },
  ];

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">{projectionLabel} Financial Projection</h2>
          <p className="text-white/40 text-sm font-sans mt-1">
            Long-term compounding value — the strategic case for asset managers and owners
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

      {/* Key callout cards */}
      <div className="grid grid-cols-4 gap-4">
        <CalloutBadge
          label={`${projectionLabel} Total Impact`}
          value={formatCurrency(totalFiveYearImpact, currency, true)}
          sub="Cumulative revenue + savings"
        />
        <CalloutBadge
          label={`${projectionLabel} Net Benefit`}
          value={formatCurrency(totalFiveYearNet, currency, true)}
          sub="After Duetto investment"
        />
        <CalloutBadge
          label={`${projectionLabel} ROI Multiple`}
          value={`${fiveYearROIMultiple.toFixed(1)}x`}
          sub="Total impact ÷ total investment"
        />
        <CalloutBadge
          label="Break-Even"
          value={`Month ${breakEvenMonth}`}
          sub="ROI positive within weeks"
        />
      </div>

      {/* Year assumptions */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Projection Settings</h3>
        <p className="text-white/40 text-xs font-sans mb-1">
          Year 1 assumes 75% average impact due to implementation ramp (50% Q1, 80% Q2-Q3, 100% Q4+)
        </p>
        <p className="text-white/30 text-xs font-sans mb-5">
          {hasImplementationFee && `Year 1 Duetto investment includes one-time implementation fee (${formatCurrency(effectiveInputs.implementationFee || 0, currency)}). `}
          {hasEscalation
            ? `Annual subscription escalates +${Math.round((effectiveInputs.subscriptionEscalationRate ?? 0.05) * 100)}%/yr from Year ${contractYears + 1} (after initial ${contractYears}-year term).`
            : `No price escalation within the ${projectionLabel} window (contract term covers full period).`}
        </p>
        <div className="grid grid-cols-2 gap-8">
          <InputField
            label={
              <span className="flex items-center gap-2">
                Annual Market Growth Rate
                {marketGrowthCalibrated && (
                  <span className="flex items-center gap-1 text-[9px] font-bold bg-[#7459EE]/20 text-[#7459EE] px-1.5 py-0.5 rounded-full uppercase">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Market Calibrated
                  </span>
                )}
              </span>
            }
            tooltip="Market-wide ADR/RevPAR growth assumption applied to compound projections"
          >
            <SliderInput
              value={Math.round(asmp.marketGrowthRate * 100)}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => updateAssumption(scenario, "marketGrowthRate", v / 100)}
              formatValue={(v) => `${v}%/year`}
            />
          </InputField>

          <InputField
            label="RevPAR Uplift Degradation"
            tooltip="Annual erosion of the RevPAR advantage as competitors catch up. 0% = maintain advantage indefinitely."
          >
            <SliderInput
              value={Math.round((asmp.revparUpliftDegradationRate ?? 0) * 100)}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateAssumption(scenario, "revparUpliftDegradationRate", v / 100)}
              formatValue={(v) => `${v}%/year`}
            />
          </InputField>
        </div>
      </div>

      {/* Projection Area Chart */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Revenue Impact Over {projectionYears} Years</h3>
        <p className="text-white/40 text-xs font-sans mb-5">Stacked annual financial impact by source</p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C4FF45" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#C4FF45" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#68FFF2" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#68FFF2" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} />
            <Tooltip
              contentStyle={{ background: "rgba(14,33,36,0.98)", border: "1px solid rgba(196,255,69,0.3)", borderRadius: 8, color: "white" }}
              formatter={(v: number, name: string) => [formatCurrency(v, currency), name === "revenue" ? "Incremental Revenue" : "Cost Savings"]}
            />
            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue" stackId="1" stroke="#C4FF45" fill="url(#revGrad)" name="revenue" />
            <Area type="monotone" dataKey="savings" stackId="1" stroke="#68FFF2" fill="url(#savGrad)" name="savings" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Break-even chart */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Cumulative Break-Even Timeline</h3>
        <p className="text-white/40 text-xs font-sans mb-5">
          Month-by-month view — cumulative benefits vs. cumulative Duetto investment
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={cumulativeChartData.filter((_, i) => i % 3 === 0)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} />
            <Tooltip
              contentStyle={{ background: "rgba(14,33,36,0.98)", border: "1px solid rgba(196,255,69,0.3)", borderRadius: 8, color: "white" }}
              formatter={(v: number, name: string) => [formatCurrency(v, currency), name === "benefit" ? "Cumulative Benefit" : name === "cost" ? "Cumulative Investment" : "Net Position"]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="benefit" fill="rgba(196,255,69,0.1)" stroke="#C4FF45" strokeWidth={2} name="benefit" />
            <Line type="monotone" dataKey="cost" stroke="#FF5900" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="cost" />
            <Area type="monotone" dataKey="net" fill="rgba(104,255,242,0.08)" stroke="#68FFF2" strokeWidth={2} name="net" />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-white/30 font-sans mt-2">
          Break-even occurs at approximately <span className="text-gold-400 font-semibold">Month {breakEvenMonth}</span>
        </p>
      </div>

      {/* 5-Year Table */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-5">Cumulative Impact Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider pb-3">Metric</th>
                {YEAR_LABELS.map((y) => (
                  <th key={y} className="text-right text-white/40 text-xs uppercase tracking-wider pb-3 px-3">{y}</th>
                ))}
                <th className="text-right text-gold-500 text-xs uppercase tracking-wider pb-3 pl-3 border-l border-white/10">{projectionLabel} Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                {
                  label: "Incremental Revenue",
                  values: yearlyProjections.map((y) => y.incrementalRevenue),
                  total: yearlyProjections.reduce((s, y) => s + y.incrementalRevenue, 0),
                  color: "text-gold-400",
                },
                {
                  label: "Cost Savings",
                  values: yearlyProjections.map((y) => y.costSavings),
                  total: yearlyProjections.reduce((s, y) => s + y.costSavings, 0),
                  color: "text-emerald-brand",
                },
                {
                  label: "Total Impact",
                  values: yearlyProjections.map((y) => y.totalImpact),
                  total: totalFiveYearImpact,
                  color: "text-white",
                  bold: true,
                },
                {
                  label: "Duetto Investment",
                  values: yearlyProjections.map((y) => -y.duettoInvestment),
                  total: -totalFiveYearInvestment,
                  color: "text-[#FF5900]",
                },
                {
                  label: "Net Benefit",
                  values: yearlyProjections.map((y) => y.netBenefit),
                  total: totalFiveYearNet,
                  color: "text-emerald-brand",
                  bold: true,
                },
                {
                  label: "Cumulative Net",
                  values: yearlyProjections.map((y) => y.cumulativeNetBenefit),
                  total: yearlyProjections[4]?.cumulativeNetBenefit || 0,
                  color: "text-[#7459EE]",
                  bold: true,
                },
                {
                  label: "Annual ROI %",
                  values: yearlyProjections.map((y) => null),
                  roiValues: yearlyProjections.map((y) => y.roiPercent),
                  total: null,
                  fiveYearROI: ((totalFiveYearImpact / totalFiveYearInvestment - 1) * 100),
                  color: "text-[#7459EE]",
                },
              ].map(({ label, values, total, color, bold, roiValues, fiveYearROI }) => (
                <tr key={label} className={clsx("hover:bg-white/2 transition-colors", bold && "bg-white/2")}>
                  <td className={clsx("py-3 text-white/60", bold && "text-white/80 font-semibold")}>{label}</td>
                  {(roiValues || values).map((v, i) => (
                    <td key={i} className={clsx("text-right py-3 px-3 tabular-nums", color, bold && "font-semibold")}>
                      {v === null && roiValues
                        ? `${roiValues[i].toFixed(0)}%`
                        : typeof v === "number"
                        ? formatCurrency(v, currency, Math.abs(v) > 100000)
                        : "—"}
                    </td>
                  ))}
                  <td className={clsx("text-right py-3 pl-3 tabular-nums font-bold border-l border-white/10", color)}>
                    {total === null && fiveYearROI !== undefined
                      ? `${fiveYearROI.toFixed(0)}%`
                      : typeof total === "number"
                      ? formatCurrency(total, currency, Math.abs(total) > 100000)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Narrative callouts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            text: `In ${projectionYears} years, Duetto is projected to generate ${formatCurrency(totalFiveYearNet, currency, true)} in net incremental value for ${inputs.propertyName || (isPortfolioMode ? "your portfolio" : "your property")} — driven by sustained RevPAR improvement on ${Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable inventory${isPortfolioMode ? ` across ${portfolioProperties.length} properties` : ""}.`,
            color: "border-gold-500/30 bg-gold-500/5",
            textColor: "text-gold-400",
          },
          {
            text: `For every $1 invested in Duetto, ${inputs.propertyName || (isPortfolioMode ? "the portfolio" : "your property")} receives ${fiveYearROIMultiple.toFixed(1)}x back over ${projectionYears} years through compounding RevPAR growth and group rate optimization.`,
            color: "border-emerald-brand/30 bg-emerald-brand/5",
            textColor: "text-emerald-brand",
          },
          {
            text: `Annual impact grows from ${formatCurrency(yearlyProjections[0]?.totalImpact || 0, currency, true)} in Year 1 to ${formatCurrency(year5Projection?.totalImpact || 0, currency, true)} by Year ${projectionYears}, as the RMS effectiveness ramp completes and compounding market growth takes hold.`,
            color: "border-[#7459EE]/30 bg-[#7459EE]/5",
            textColor: "text-[#7459EE]",
          },
        ].map((card, i) => (
          <div key={i} className={clsx("rounded-2xl p-5 border", card.color)}>
            <svg className={clsx("w-6 h-6 mb-3", card.textColor)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <p className={clsx("text-sm font-sans font-medium", card.textColor)}>{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
