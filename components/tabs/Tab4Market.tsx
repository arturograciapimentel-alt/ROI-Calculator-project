"use client";
import React, { useEffect, useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { formatCurrency, MARKET_TIER_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/calculations";
import { clsx } from "clsx";

// Market benchmarks by property type and tier
const BENCHMARKS: Record<string, Record<string, { adr: [number, number]; occ: [number, number] }>> = {
  "full-service": {
    primary: { adr: [180, 280], occ: [0.70, 0.80] },
    secondary: { adr: [120, 190], occ: [0.65, 0.75] },
    tertiary: { adr: [100, 160], occ: [0.60, 0.70] },
  },
  "select-service": {
    primary: { adr: [130, 190], occ: [0.72, 0.82] },
    secondary: { adr: [90, 140], occ: [0.68, 0.78] },
    tertiary: { adr: [75, 120], occ: [0.62, 0.72] },
  },
  resort: {
    primary: { adr: [250, 500], occ: [0.65, 0.80] },
    secondary: { adr: [160, 320], occ: [0.60, 0.75] },
    tertiary: { adr: [120, 250], occ: [0.55, 0.72] },
  },
  casino: {
    primary: { adr: [150, 280], occ: [0.80, 0.92] },
    secondary: { adr: [100, 200], occ: [0.75, 0.88] },
    tertiary: { adr: [80, 160], occ: [0.70, 0.84] },
  },
  boutique: {
    primary: { adr: [200, 380], occ: [0.68, 0.80] },
    secondary: { adr: [140, 260], occ: [0.62, 0.75] },
    tertiary: { adr: [110, 200], occ: [0.58, 0.70] },
  },
  "extended-stay": {
    primary: { adr: [100, 160], occ: [0.78, 0.90] },
    secondary: { adr: [75, 130], occ: [0.75, 0.87] },
    tertiary: { adr: [60, 110], occ: [0.70, 0.84] },
  },
  "all-inclusive": {
    primary: { adr: [280, 600], occ: [0.72, 0.88] },
    secondary: { adr: [180, 380], occ: [0.68, 0.82] },
    tertiary: { adr: [120, 280], occ: [0.62, 0.78] },
  },
};

function RunningCounter({ target, currency }: { target: number; currency: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const timer = setInterval(() => {
      setValue((v) => {
        const next = v + Math.max(target * 0.02, 50);
        if (next >= target) {
          clearInterval(timer);
          return target;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [target]);
  return <>{formatCurrency(Math.round(value), currency)}</>;
}

interface DuettoFeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
}
function DuettoFeatureCard({ title, description, badge, icon }: DuettoFeatureCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/8 hover:border-gold-500/20 transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-gold-500/15 text-gold-500 group-hover:bg-gold-500/25 transition-colors flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-sans font-semibold text-sm">{title}</h4>
            {badge && (
              <span className="text-[9px] font-bold bg-emerald-brand/20 text-emerald-brand px-1.5 py-0.5 rounded-full uppercase">
                {badge}
              </span>
            )}
          </div>
          <p className="text-white/40 text-xs font-sans leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function Tab4Market() {
  const { inputs, projections, scenario } = useCalculatorStore();
  const currency = inputs.currency;
  const proj = projections[scenario];

  const bench = BENCHMARKS[inputs.propertyType]?.[inputs.marketTier] || BENCHMARKS["full-service"]["primary"];
  const benchmarkADRMid = (bench.adr[0] + bench.adr[1]) / 2;
  const benchmarkOccMid = (bench.occ[0] + bench.occ[1]) / 2;
  const benchmarkRevPAR = benchmarkADRMid * benchmarkOccMid;
  const currentRevPAR = inputs.currentADR * inputs.currentOccupancy;

  const adrVsBenchmark = ((inputs.currentADR - benchmarkADRMid) / benchmarkADRMid) * 100;
  const occVsBenchmark = ((inputs.currentOccupancy - benchmarkOccMid) / benchmarkOccMid) * 100;
  const revParVsBenchmark = ((currentRevPAR - benchmarkRevPAR) / benchmarkRevPAR) * 100;

  // Cost of inaction
  const monthlyOpportunityCost = proj.totalAnnualImpact / 12;
  const [delayMonths, setDelayMonths] = useState(6);

  const radarData = [
    {
      metric: "ADR",
      current: Math.round(((inputs.currentADR - bench.adr[0]) / (bench.adr[1] - bench.adr[0])) * 100),
      market: 50,
    },
    {
      metric: "Occupancy",
      current: Math.round(((inputs.currentOccupancy - bench.occ[0]) / (bench.occ[1] - bench.occ[0])) * 100),
      market: 50,
    },
    {
      metric: "RevPAR",
      current: Math.round(((currentRevPAR - benchmarkRevPAR * 0.8) / (benchmarkRevPAR * 0.4)) * 100),
      market: 50,
    },
    { metric: "Yieldable Mix", current: Math.round(inputs.yieldablePercent * 100), market: 70 },
    { metric: "RM Maturity", current: inputs.rmApproach === "spreadsheets" ? 10 : inputs.rmApproach === "competitor-rms" ? 70 : 30, market: 50 },
  ];

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white">Competitive & Market Context</h2>
        <p className="text-white/40 text-sm font-sans mt-1">
          The "why now" — market positioning and cost of inaction
        </p>
      </div>

      {/* Benchmark comparison */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-1">Industry Benchmark Comparison</h3>
        <p className="text-white/40 text-xs font-sans mb-5">
          {PROPERTY_TYPE_LABELS[inputs.propertyType]} ·{" "}
          {MARKET_TIER_LABELS[inputs.marketTier]} Market · {inputs.totalRooms} rooms
        </p>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {[
            { label: "ADR vs. Market", current: formatCurrency(inputs.currentADR, currency), bench: formatCurrency(benchmarkADRMid, currency), delta: adrVsBenchmark },
            { label: "Occupancy vs. Market", current: `${Math.round(inputs.currentOccupancy * 100)}%`, bench: `${Math.round(benchmarkOccMid * 100)}%`, delta: occVsBenchmark },
            { label: "RevPAR vs. Market", current: formatCurrency(currentRevPAR, currency), bench: formatCurrency(benchmarkRevPAR, currency), delta: revParVsBenchmark },
          ].map(({ label, current, bench: b, delta }) => (
            <div key={label} className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
              <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">{label}</p>
              <div className="flex items-center justify-center gap-6">
                <div>
                  <p className="text-xl font-serif font-bold text-white">{current}</p>
                  <p className="text-white/30 text-xs font-sans">Your Property</p>
                </div>
                <div className="text-white/20 text-xl">→</div>
                <div>
                  <p className="text-xl font-serif font-bold text-white/50">{b}</p>
                  <p className="text-white/30 text-xs font-sans">Market Avg</p>
                </div>
              </div>
              <div className={clsx("mt-3 text-sm font-semibold font-sans", delta >= 0 ? "text-emerald-brand" : "text-red-400")}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs. market
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">Performance Radar vs. Market Median</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <Radar name="Your Property" dataKey="current" stroke="#D4A853" fill="#D4A853" fillOpacity={0.2} />
                <Radar name="Market Avg" dataKey="market" stroke="#00C389" fill="#00C389" fillOpacity={0.1} strokeDasharray="4 4" />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className={clsx("p-4 rounded-xl border", revParVsBenchmark >= 0 ? "border-emerald-brand/20 bg-emerald-brand/5" : "border-red-400/20 bg-red-400/5")}>
              <p className={clsx("text-xs font-sans font-semibold uppercase tracking-wider mb-1", revParVsBenchmark >= 0 ? "text-emerald-brand" : "text-red-400")}>
                {revParVsBenchmark >= 0 ? "Market Outperformer" : "Below Market Average"}
              </p>
              <p className="text-white/60 text-xs font-sans leading-relaxed">
                {revParVsBenchmark >= 0
                  ? `Your property is already performing ${revParVsBenchmark.toFixed(1)}% above market average RevPAR. Duetto will help you extend that lead and defend it as competitors upgrade their RM capabilities.`
                  : `Your property is ${Math.abs(revParVsBenchmark).toFixed(1)}% below market average RevPAR. Duetto's demand intelligence and open pricing are designed to close this gap — often within the first 90 days.`}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/3">
              <p className="text-white/50 text-xs font-sans font-semibold uppercase tracking-wider mb-1">Yieldable Inventory Opportunity</p>
              <p className="text-white/40 text-xs font-sans leading-relaxed">
                {Math.round(inputs.yieldablePercent * 100)}% of your room nights are in yieldable segments — the inventory Duetto can dynamically optimize.{" "}
                {inputs.rmApproach === "spreadsheets" || inputs.rmApproach === "none"
                  ? "Properties with manual RM average 8-12% lower RevPAR on yieldable inventory. Duetto closes that gap typically within the first 90 days."
                  : "Even with an existing system, Duetto's open pricing and AI-driven forecasting deliver measurable RevPAR lifts on yieldable segments."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost of Inaction */}
      <div className="glass-card rounded-2xl p-6 border border-red-400/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
        <div className="relative z-10">
          <h3 className="text-white font-serif font-semibold mb-1">Cost of Inaction Calculator</h3>
          <p className="text-white/40 text-xs font-sans mb-5">
            Every month without Duetto is measurable, unrealized revenue
          </p>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-5 rounded-xl bg-red-500/8 border border-red-400/20">
              <p className="text-red-400 text-xs font-sans uppercase tracking-wider mb-2">Monthly Opportunity Cost</p>
              <p className="text-3xl font-serif font-bold text-red-400">
                <RunningCounter target={monthlyOpportunityCost} currency={currency} />
              </p>
              <p className="text-white/30 text-xs font-sans mt-1">Unrealized revenue/month</p>
            </div>

            <div className="col-span-2">
              <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">
                Cumulative cost of delay — {delayMonths} months
              </p>
              <div className="flex items-center gap-3 mb-3">
                {[3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDelayMonths(m)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all",
                      delayMonths === m
                        ? "bg-red-500/20 border border-red-400/40 text-red-400"
                        : "bg-white/5 border border-white/10 text-white/40 hover:text-white/70"
                    )}
                  >
                    {m} mo
                  </button>
                ))}
              </div>
              <div className="text-4xl font-serif font-bold text-red-400">
                {formatCurrency(monthlyOpportunityCost * delayMonths, currency, true)}
              </div>
              <p className="text-white/30 text-xs font-sans mt-1">
                in unrealized revenue over {delayMonths} months of inaction
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Adoption Context */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <h3 className="text-white font-serif font-semibold mb-5">Technology Adoption Landscape</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { stat: "50%+", label: "of hotel rooms globally influenced by RMS technology", source: "Skift Research" },
            { stat: "4x", label: "consecutive years Duetto rated #1 RMS on Hotel Tech Report", source: "HTR 2021-2024" },
            { stat: "685+", label: "verified reviews from hoteliers worldwide", source: "Hotel Tech Report" },
          ].map(({ stat, label, source }) => (
            <div key={stat} className="p-5 rounded-xl bg-navy-800/60 border border-white/10 text-center">
              <p className="text-4xl font-serif font-bold text-gold-400 mb-2">{stat}</p>
              <p className="text-white/60 text-sm font-sans leading-relaxed">{label}</p>
              <p className="text-white/25 text-xs font-sans mt-2 italic">{source}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 rounded-xl border border-gold-500/20 bg-gold-500/5">
          <p className="text-gold-400 text-sm font-sans italic leading-relaxed">
            "Duetto is a very powerful RMS with advanced forecasting capabilities... enabling hoteliers to achieve a high ROI in a short timeframe."
          </p>
          <p className="text-white/30 text-xs font-sans mt-2">— Verified review, Hotel Tech Report</p>
        </div>
      </div>

      {/* Duetto Differentiators */}
      <div>
        <h3 className="text-white font-serif font-semibold mb-4">Why Duetto</h3>
        <div className="grid grid-cols-2 gap-4">
          <DuettoFeatureCard
            title="Open Pricing"
            description="Rate each room type, segment, and channel completely independently. Unlike BAR-based systems, you never have to ladder every segment off a single best available rate."
            badge="Core"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
          <DuettoFeatureCard
            title="GameChanger — Pricing Engine"
            description="AI-powered open pricing that reads demand signals across all channels and segments in real time, recommending optimal rates without human bottlenecks."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <DuettoFeatureCard
            title="ScoreBoard — Forecasting & BI"
            description="Enterprise-grade demand forecasting and business intelligence. See the full picture: pace, pickup, segments, channels — all in one dashboard."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <DuettoFeatureCard
            title="BlockBuster — Group Optimization"
            description="Evaluate group opportunities against transient displacement in seconds. Price groups profitably with full visibility into the true cost of every piece of group business."
            badge={inputs.groupBusinessPercent > 0.15 ? "Key for you" : undefined}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <DuettoFeatureCard
            title="Cloud-Native Architecture"
            description="No servers to maintain, no overnight batch runs, no legacy infrastructure. Real-time rate updates push to your PMS and booking engine automatically."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            }
          />
          <DuettoFeatureCard
            title="Integration Ecosystem"
            description="Pre-built connectors for 150+ PMS, CMS, and channel manager systems. Plug into your existing tech stack without disruption."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Case Study Placeholders */}
      <div>
        <h3 className="text-white font-serif font-semibold mb-4">Client Success Stories</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              logo: "NH Hotel Group",
              rooms: "350+ properties",
              metric: "+8.2% RevPAR",
              quote: "Duetto's open pricing fundamentally changed how we think about rate strategy across our portfolio.",
            },
            {
              logo: "Graduate Hotels",
              rooms: "35 boutique hotels",
              metric: "+11% ADR",
              quote: "The forecasting accuracy alone has reduced overstaffing costs significantly — the ROI was evident within 60 days.",
            },
            {
              logo: "Warwick Hotels",
              rooms: "55 global properties",
              metric: "2.1 mo payback",
              quote: "We moved from spreadsheets to Duetto and never looked back. The time savings alone justified the investment.",
            },
          ].map(({ logo, rooms, metric, quote }) => (
            <div key={logo} className="glass-card rounded-2xl p-5 border border-white/8 hover:border-gold-500/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-sans font-semibold text-sm">{logo}</p>
                  <p className="text-white/30 text-xs font-sans">{rooms}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-brand font-serif font-bold text-lg">{metric}</p>
                </div>
              </div>
              <p className="text-white/40 text-xs font-sans leading-relaxed italic">"{quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
