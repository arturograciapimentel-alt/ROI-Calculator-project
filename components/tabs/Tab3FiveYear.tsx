"use client";
import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend,
  ComposedChart, Line,
} from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, SliderInput } from "@/components/ui/InputField";
import { formatCurrency, formatPercent, estimateDuettoCost, aggregatePortfolioInputs } from "@/lib/calculations";
import { clsx } from "clsx";

const YEAR_LABELS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

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
  const { inputs, yearlyProjections, assumptions, scenario, updateAssumption, capRate, setCapRate, portfolioProperties } = useCalculatorStore();
  const currency = inputs.currency;
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;
  const effectiveCost = effectiveInputs.duettoAnnualCost || estimateDuettoCost(effectiveInputs.totalRooms);
  const asmp = assumptions[scenario];

  const totalFiveYearImpact = yearlyProjections.reduce((sum, y) => sum + y.totalImpact, 0);
  const totalFiveYearNet = yearlyProjections.reduce((sum, y) => sum + y.netBenefit, 0);
  const totalFiveYearInvestment = yearlyProjections.reduce((sum, y) => sum + y.duettoInvestment, 0);
  const fiveYearROIMultiple = totalFiveYearImpact / totalFiveYearInvestment;

  // Valuation impact uses moderate scenario year 5 incremental NOI
  const year5Projection = yearlyProjections[4];
  const incrementalNOI = year5Projection ? year5Projection.totalImpact * 0.85 : 0; // ~85% flows to NOI
  const valuationImpact = incrementalNOI / capRate;

  // Break-even month calculation
  const monthlyImpact = yearlyProjections[0] ? yearlyProjections[0].totalImpact / 12 : 0;
  const breakEvenMonth = monthlyImpact > 0 ? Math.ceil(effectiveCost / monthlyImpact) : 99;

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

  const cumulativeChartData = Array.from({ length: 60 }, (_, i) => {
    const month = i + 1;
    const yearIdx = Math.floor(i / 12);
    const yearData = yearlyProjections[Math.min(yearIdx, 4)];
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
      name: "ADR Uplift\n(Yr 5)",
      base: baseAnnualRevenue,
      value: Math.round(year5Projection?.incrementalRevenue * 0.5 || 0),
      type: "positive",
    },
    {
      name: "Occ. Uplift\n(Yr 5)",
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
      name: "Projected Yr 5\nTotal Revenue",
      base: 0,
      value: baseAnnualRevenue + Math.round(year5Projection?.totalImpact || 0),
      type: "total",
    },
  ];

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white">5-Year Financial Projection</h2>
        <p className="text-white/40 text-sm font-sans mt-1">
          Long-term compounding value — the strategic case for asset managers and owners
        </p>
      </div>

      {/* Key callout cards */}
      <div className="grid grid-cols-4 gap-4">
        <CalloutBadge
          label="5-Year Total Impact"
          value={formatCurrency(totalFiveYearImpact, currency, true)}
          sub="Cumulative revenue + savings"
        />
        <CalloutBadge
          label="5-Year Net Benefit"
          value={formatCurrency(totalFiveYearNet, currency, true)}
          sub="After Duetto investment"
        />
        <CalloutBadge
          label="5-Year ROI Multiple"
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
        <p className="text-white/40 text-xs font-sans mb-5">
          Year 1 assumes 75% average impact due to implementation ramp (50% Q1, 80% Q2-Q3, 100% Q4+)
        </p>
        <div className="grid grid-cols-2 gap-8">
          <InputField label="Annual Market Growth Rate" tooltip="Market-wide ADR/RevPAR growth assumption applied to compound projections">
            <SliderInput
              value={Math.round(asmp.marketGrowthRate * 100)}
              min={0}
              max={8}
              step={0.5}
              onChange={(v) => updateAssumption(scenario, "marketGrowthRate", v / 100)}
              formatValue={(v) => `${v}%/year`}
            />
          </InputField>

          <InputField
            label="Cap Rate (for valuation impact)"
            tooltip="The capitalization rate used to convert incremental NOI into property valuation impact"
          >
            <SliderInput
              value={Math.round(capRate * 100 * 10) / 10}
              min={4}
              max={12}
              step={0.5}
              onChange={(v) => setCapRate(v / 100)}
              formatValue={(v) => `${v}%`}
            />
          </InputField>
        </div>
      </div>

      {/* 5-Year Area Chart */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Revenue Impact Over 5 Years</h3>
        <p className="text-white/40 text-xs font-sans mb-5">Stacked annual financial impact by source</p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A853" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#D4A853" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C389" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#00C389" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} />
            <Tooltip
              contentStyle={{ background: "rgba(10,22,40,0.98)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 8, color: "white" }}
              formatter={(v: number, name: string) => [formatCurrency(v, currency), name === "revenue" ? "Incremental Revenue" : "Cost Savings"]}
            />
            <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue" stackId="1" stroke="#D4A853" fill="url(#revGrad)" name="revenue" />
            <Area type="monotone" dataKey="savings" stackId="1" stroke="#00C389" fill="url(#savGrad)" name="savings" />
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
              contentStyle={{ background: "rgba(10,22,40,0.98)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 8, color: "white" }}
              formatter={(v: number, name: string) => [formatCurrency(v, currency), name === "benefit" ? "Cumulative Benefit" : name === "cost" ? "Cumulative Investment" : "Net Position"]}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="benefit" fill="rgba(212,168,83,0.1)" stroke="#D4A853" strokeWidth={2} name="benefit" />
            <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="cost" />
            <Area type="monotone" dataKey="net" fill="rgba(0,195,137,0.08)" stroke="#00C389" strokeWidth={2} name="net" />
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
                <th className="text-right text-gold-500 text-xs uppercase tracking-wider pb-3 pl-3 border-l border-white/10">5-Year Total</th>
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
                  color: "text-red-400",
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
                  color: "text-blue-400",
                  bold: true,
                },
                {
                  label: "Annual ROI %",
                  values: yearlyProjections.map((y) => null),
                  roiValues: yearlyProjections.map((y) => y.roiPercent),
                  total: null,
                  fiveYearROI: ((totalFiveYearImpact / totalFiveYearInvestment - 1) * 100),
                  color: "text-purple-400",
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

      {/* Valuation Impact — Owner/Investor section */}
      <div className="glass-card rounded-2xl p-6 border border-emerald-brand/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-brand/5 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-brand/15">
              <svg className="w-6 h-6 text-emerald-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-serif font-bold text-xl mb-1">Asset Valuation Impact</h3>
              <p className="text-white/50 text-sm font-sans">
                For asset managers and owners — incremental NOI drives property valuation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="text-center p-4 rounded-xl bg-navy-800/60 border border-white/10">
              <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-2">Year 5 Incremental NOI</p>
              <p className="text-2xl font-serif font-bold text-emerald-brand">
                {formatCurrency(incrementalNOI, currency, true)}
              </p>
              <p className="text-white/30 text-xs font-sans mt-1">85% of Yr 5 impact → NOI</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-navy-800/60 border border-white/10">
              <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-2">Cap Rate Applied</p>
              <p className="text-2xl font-serif font-bold text-white">{formatPercent(capRate)}</p>
              <p className="text-white/30 text-xs font-sans mt-1">Adjustable above</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-emerald-brand/10 border border-emerald-brand/30">
              <p className="text-emerald-brand text-xs font-sans uppercase tracking-wider mb-2 font-semibold">Implied Valuation Increase</p>
              <p className="text-3xl font-serif font-bold text-emerald-brand">
                {formatCurrency(valuationImpact, currency, true)}
              </p>
              <p className="text-emerald-brand/50 text-xs font-sans mt-1">Incremental NOI ÷ Cap Rate</p>
            </div>
          </div>

          <p className="text-white/30 text-xs font-sans mt-4 text-center">
            Property Valuation Increase = Incremental NOI / Cap Rate · Formula used by institutional real estate investors
          </p>
        </div>
      </div>

      {/* Narrative callouts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            text: `In 5 years, Duetto is projected to generate ${formatCurrency(totalFiveYearNet, currency, true)} in net incremental value for ${inputs.propertyName || (isPortfolioMode ? "your portfolio" : "your property")} — driven by sustained RevPAR improvement on ${Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable inventory${isPortfolioMode ? ` across ${portfolioProperties.length} properties` : ""}.`,
            color: "border-gold-500/30 bg-gold-500/5",
            textColor: "text-gold-400",
          },
          {
            text: `For every $1 invested in Duetto, ${inputs.propertyName || (isPortfolioMode ? "the portfolio" : "your property")} receives ${fiveYearROIMultiple.toFixed(1)}x back over 5 years through compounding RevPAR growth and group rate optimization.`,
            color: "border-emerald-brand/30 bg-emerald-brand/5",
            textColor: "text-emerald-brand",
          },
          {
            text: `The implied property valuation increase from Duetto's RevPAR impact is ${formatCurrency(valuationImpact, currency, true)} at a ${formatPercent(capRate)} cap rate.`,
            color: "border-purple-500/30 bg-purple-500/5",
            textColor: "text-purple-400",
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
