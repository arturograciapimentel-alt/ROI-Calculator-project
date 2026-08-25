"use client";
import React, { useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { DuettoIcon, DuettoWordmark } from "@/components/ui/DuettoLogo";
import {
  formatCurrency,
  formatPercent,
  computeDuettoAnnualCost,
  aggregatePortfolioInputs,
  PROPERTY_TYPE_LABELS,
  RM_APPROACH_LABELS,
  normalizeInputCurrencies,
  convertCurrency,
  CURRENCY_SYMBOLS,
  computeSegmentYoY,
} from "@/lib/calculations";
import { clsx } from "clsx";
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

const PIE_COLORS = ["#C4FF45", "#68FFF2", "#7459EE", "#FFD9A0"];

export function Tab5Executive() {
  const {
    inputs, projections, scenario, yearlyProjections,
    preparedBy, nextSteps, setPreparedBy, setNextSteps, portfolioProperties,
    outputCurrency, setOutputCurrency, exchangeRates, costarBenchmarks,
  } = useCalculatorStore();

  const [isExporting, setIsExporting] = useState(false);
  const [includeFiveYear, setIncludeFiveYear] = useState(true);
  const [includePayback, setIncludePayback] = useState(true);
  const [includeTimeReclaimed, setIncludeTimeReclaimed] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const currency = outputCurrency;
  const projectionYears = inputs.projectionYears || 5;
  const projectionLabel = `${projectionYears}-Year`;
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;

  // Normalize all monetary display values to the selected output currency
  const normalizedInputs = normalizeInputCurrencies(effectiveInputs, currency, exchangeRates, isPortfolioMode);
  const currentRevPAR = normalizedInputs.currentADR * normalizedInputs.currentOccupancy;

  // Compute effective Duetto cost in outputCurrency.
  // estimateDuettoCost() always returns USD, so we must convert from the appropriate source.
  const duettoCurrencyForConversion = isPortfolioMode
    ? inputs.currency
    : (inputs.duettoCurrency || "USD");
  const rawEffectiveCost = computeDuettoAnnualCost(effectiveInputs);
  const costSourceCurrency = (effectiveInputs.subscriptionCost > 0 || effectiveInputs.duettoAnnualCost > 0)
    ? duettoCurrencyForConversion
    : "USD";
  const effectiveCost = convertCurrency(rawEffectiveCost, costSourceCurrency, currency, exchangeRates);
  const effectiveImplFee = convertCurrency(effectiveInputs.implementationFee || 0, costSourceCurrency, currency, exchangeRates);

  const SCENARIO_LABELS: Record<string, string> = { conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive" };
  const proj = projections[scenario];

  // Market segment benchmark context
  const primaryBenchmark = costarBenchmarks[0] ?? null;
  const segmentKey = inputs.propertyType as keyof NonNullable<typeof primaryBenchmark>["byClass"];
  const segmentYoY = primaryBenchmark
    ? computeSegmentYoY(primaryBenchmark.byClassHistorical?.[segmentKey])
    : null;
  // Projected hotel RevPAR improvement % (hotel-wide blended, driven by selected scenario)
  const projectedRevPARPct = proj.currentRevPAR > 0
    ? ((proj.newRevPAR - proj.currentRevPAR) / proj.currentRevPAR) * 100
    : 0;
  // How many percentage points above the market segment trend
  const outperformancePP = segmentYoY !== null ? projectedRevPARPct - segmentYoY.revparPct : null;

  // Performance indices vs. the CoStar segment average (RGI/ARI/MPI) — industry-standard
  // benchmarking terms. NOTE: this compares against the segment/class average from the
  // uploaded CoStar report, not a curated competitive set.
  const segmentMetrics = primaryBenchmark?.byClass[segmentKey] ?? null;
  const benchmarkCurrency = primaryBenchmark?.currency ?? "USD";
  const propADRForIndex = convertCurrency(normalizedInputs.currentADR, currency, benchmarkCurrency, exchangeRates);
  const propRevPARForIndex = convertCurrency(currentRevPAR, currency, benchmarkCurrency, exchangeRates);
  const ariIndex = segmentMetrics && segmentMetrics.adr > 0 ? (propADRForIndex / segmentMetrics.adr) * 100 : null;
  const mpiIndex = segmentMetrics && segmentMetrics.occupancy > 0 ? (normalizedInputs.currentOccupancy / segmentMetrics.occupancy) * 100 : null;
  const rgiIndex = segmentMetrics && segmentMetrics.revpar > 0 ? (propRevPARForIndex / segmentMetrics.revpar) * 100 : null;

  // Build exchange rate disclosure for any currency that differs from outputCurrency
  const sourceCurrencies = new Set<string>();
  if (inputs.currency !== currency) sourceCurrencies.add(inputs.currency);
  if (!isPortfolioMode && inputs.duettoCurrency !== currency) sourceCurrencies.add(inputs.duettoCurrency);
  const exchangeRateLines = Array.from(sourceCurrencies).map((from) => {
    const rate = convertCurrency(1, from, currency, exchangeRates);
    const sym = CURRENCY_SYMBOLS[currency] ?? currency;
    return `1 ${from} = ${sym}${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  });
  const showExchangeNote = exchangeRateLines.length > 0;
  const totalFiveYearNet = yearlyProjections.reduce((s, y) => s + y.netBenefit, 0);
  const totalFiveYearImpact = yearlyProjections.reduce((s, y) => s + y.totalImpact, 0);
  const totalFiveYearInvestment = yearlyProjections.reduce((s, y) => s + y.duettoInvestment, 0);
  const fiveYearROIMultiple = totalFiveYearInvestment > 0 ? totalFiveYearImpact / totalFiveYearInvestment : 0;

  const adrContrib = proj.incrementalADRRevenue;
  const occContrib = proj.incrementalOccRevenue;
  const total = adrContrib + occContrib || 1;
  const pieData = [
    { name: "ADR Uplift", value: Math.max(proj.annualIncrementalRoomRevenue * (adrContrib / total), 0) },
    { name: "Occ. Uplift", value: Math.max(proj.annualIncrementalRoomRevenue * (occContrib / total) + proj.groupRevenue, 0) },
    { name: "Systems Cost Savings", value: Math.max(proj.systemsCostSavings, 0) },
  ].filter((d) => d.value > 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      if (!printRef.current) return;

      // Preload images to ensure they're available for html2canvas
      await Promise.all([
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = "/duetto-icon.png";
        }),
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = "/duetto-wordmark.png";
        }),
      ]);

      const canvas = await html2canvas(printRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0E2124",
        logging: false,
        // Expand the clip to the full scrollable height so nothing is cut off
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.88);
      const A4_WIDTH_MM = 210;
      const imgWidth    = A4_WIDTH_MM;
      const imgHeight   = (canvas.height * imgWidth) / canvas.width;

      // Always use a custom page height equal to the content so the PDF is
      // exactly one page with no blank space or background mismatch.
      const pdf = new jsPDF({ unit: "mm", format: [A4_WIDTH_MM, imgHeight] });
      // Fill background first so any sub-pixel gap never shows as white.
      pdf.setFillColor(14, 33, 36); // #0E2124
      pdf.rect(0, 0, A4_WIDTH_MM, imgHeight, "F");
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");

      pdf.save(
        `Duetto-ROI-${inputs.propertyName || "Property"}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 tab-content-enter">
      {/* Export controls — not printed */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Executive Summary</h2>
          <p className="text-white/40 text-sm font-sans mt-1">
            Board-ready summary — share via PDF or print after the meeting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIncludeFiveYear((v) => !v)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-sans transition-all",
              includeFiveYear
                ? "bg-gold-500/15 border-gold-500/40 text-gold-400"
                : "bg-white/5 border-white/15 text-white/40"
            )}
            title={`Toggle ${projectionLabel} projection section in summary and PDF`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={includeFiveYear ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
            {projectionLabel} Projection
          </button>
          <button
            onClick={() => setIncludePayback((v) => !v)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-sans transition-all",
              includePayback
                ? "bg-[#7459EE]/15 border-[#7459EE]/40 text-[#7459EE]"
                : "bg-white/5 border-white/15 text-white/40"
            )}
            title="Toggle payback period metric in summary and PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={includePayback ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
            Payback Period
          </button>
          <button
            onClick={() => setIncludeTimeReclaimed((v) => !v)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-sans transition-all",
              includeTimeReclaimed
                ? "bg-emerald-brand/15 border-emerald-brand/40 text-emerald-brand"
                : "bg-white/5 border-white/15 text-white/40"
            )}
            title="Toggle Strategic Time Reclaimed metric — hide for properties switching from another RMS rather than manual work"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={includeTimeReclaimed ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
            Time Reclaimed
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs font-sans whitespace-nowrap">Display in</span>
            <select
              value={outputCurrency}
              onChange={(e) => setOutputCurrency(e.target.value as Currency)}
              className="bg-navy-800/80 border border-white/15 rounded-lg px-3 py-2 text-white text-xs font-sans focus:outline-none focus:border-gold-500/50 w-32"
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white/70 text-sm font-sans hover:bg-white/15 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-navy-900 text-sm font-sans font-semibold hover:bg-gold-400 transition-all disabled:opacity-60 shadow-gold"
          >
            {isExporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {isExporting ? "Generating PDF..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Prepared by field */}
      <div className="grid grid-cols-2 gap-4 no-print">
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <label className="text-white/40 text-xs font-sans uppercase tracking-wider block mb-2">Prepared By</label>
          <input
            value={preparedBy}
            onChange={(e) => setPreparedBy(e.target.value)}
            placeholder="Your name / Director of Hospitality Solutions"
            className="w-full bg-transparent text-white text-sm font-sans outline-none placeholder-white/20"
          />
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <label className="text-white/40 text-xs font-sans uppercase tracking-wider block mb-1">Date</label>
          <p className="text-white text-sm font-sans">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      {/* ===== THE PRINTABLE SUMMARY ===== */}
      <div ref={printRef} className="space-y-0">
        {/* Page 1: Executive Summary */}
        <div className="bg-navy-900 rounded-2xl overflow-hidden border border-white/10 print-page">
          {/* Header */}
          <div className="bg-navy-950 border-b border-white/10 px-8 py-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <DuettoWordmark height={38} />
                <div className="w-px h-5 bg-white/20" />
                <span className="text-white/40 text-sm font-sans">Revenue Profit OS</span>
              </div>
              <h1 className="text-white font-serif font-bold text-2xl">
                ROI Impact Analysis — {inputs.propertyName || "Property Name"}
              </h1>
              <p className="text-white/40 text-xs font-sans mt-1">
                Prepared by {preparedBy || "[Director of Hospitality Solutions]"} ·{" "}
                {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} ·{" "}
                <span className="text-gold-500">CONFIDENTIAL</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/30 text-xs font-sans">Total Duetto Investment (Yr 1)</p>
              <p className="text-2xl font-serif font-bold text-white">{formatCurrency(effectiveCost + effectiveImplFee, currency)}</p>
              <p className="text-white/30 text-[10px] font-sans mt-1">Annual subscription: {formatCurrency(effectiveCost, currency)}</p>
              {effectiveImplFee > 0 && (
                <p className="text-white/30 text-[10px] font-sans">Implementation fee: {formatCurrency(effectiveImplFee, currency)} <span className="text-gold-500/60">(one-time, Yr 1 only)</span></p>
              )}
              {showExchangeNote && (
                <p className="text-white/25 text-[10px] font-sans mt-0.5">
                  {exchangeRateLines.join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="p-8 space-y-7">
            {/* Property Snapshot */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">
                  {isPortfolioMode ? "Portfolio Profile" : "Property Profile"}
                </p>
                <div className="space-y-2">
                  {[
                    [isPortfolioMode ? "Portfolio" : "Property", inputs.propertyName || "—"],
                    ...(isPortfolioMode ? [["Properties", portfolioProperties.length.toString()]] : []),
                    ["Class", PROPERTY_TYPE_LABELS[inputs.propertyType]],
                    ["Total Rooms", effectiveInputs.totalRooms.toLocaleString()],
                    ["Location", inputs.location || "—"],
                    ["Star Rating", "★".repeat(inputs.starRating)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                      <span className="text-white/40 text-xs font-sans w-28 flex-shrink-0">{k}</span>
                      <span className="text-white text-sm font-sans font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">
                  {isPortfolioMode ? "Portfolio Performance (Blended)" : "Current Performance"}
                </p>
                <div className="space-y-2">
                  {[
                    [isPortfolioMode ? "Blended ADR" : "Current ADR", formatCurrency(normalizedInputs.currentADR, currency)],
                    [isPortfolioMode ? "Blended Occupancy" : "Current Occupancy", formatPercent(normalizedInputs.currentOccupancy)],
                    [isPortfolioMode ? "Portfolio RevPAR" : "Current RevPAR", formatCurrency(currentRevPAR, currency)],
                    ["Yieldable Mix", `${Math.round(normalizedInputs.yieldablePercent * 100)}% of room nights`],
                    ["RM Approach", RM_APPROACH_LABELS[inputs.rmApproach]],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 py-1.5 border-b border-white/5">
                      <span className="text-white/40 text-xs font-sans w-36 flex-shrink-0">{k}</span>
                      <span className="text-white text-sm font-sans font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Portfolio Breakdown — shown when portfolio mode is active */}
            {isPortfolioMode && (
              <div>
                <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">Portfolio Composition</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans">
                    <thead>
                      <tr className="border-b border-white/10">
                        {["Property", "Class", "Rooms", "ADR", "Occupancy", "RevPAR"].map((h) => (
                          <th key={h} className="text-left text-white/40 pb-2 pr-4 uppercase tracking-wider font-normal">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {portfolioProperties.map((p) => {
                        const pADR = convertCurrency(p.currentADR, inputs.currency, currency, exchangeRates);
                        const pRevPAR = pADR * p.currentOccupancy;
                        return (
                          <tr key={p.id}>
                            <td className="py-1.5 pr-4 text-white font-medium">{p.propertyName || "—"}</td>
                            <td className="py-1.5 pr-4 text-white/50">{PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}</td>
                            <td className="py-1.5 pr-4 text-white/70">{p.totalRooms}</td>
                            <td className="py-1.5 pr-4 text-white/70">{formatCurrency(pADR, currency)}</td>
                            <td className="py-1.5 pr-4 text-white/70">{formatPercent(p.currentOccupancy)}</td>
                            <td className="py-1.5 text-emerald-brand font-semibold">{formatCurrency(pRevPAR, currency)}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-gold-500/30">
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">Portfolio Blended</td>
                        <td className="py-1.5 pr-4 text-white/40">—</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{normalizedInputs.totalRooms}</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{formatCurrency(normalizedInputs.currentADR, currency)}</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{formatPercent(normalizedInputs.currentOccupancy)}</td>
                        <td className="py-1.5 text-gold-400 font-semibold">{formatCurrency(currentRevPAR, currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Hero KPIs */}
            <div>
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-4">
                Financial Impact Summary — {SCENARIO_LABELS[scenario]} Scenario
              </p>
              <div className={clsx("grid gap-4", includePayback ? "grid-cols-4" : "grid-cols-3")}>
                {/* RevPAR Improvement */}
                <div className="rounded-2xl p-5 text-center border bg-emerald-brand/10 border-emerald-brand/30">
                  <p className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">RevPAR Improvement</p>
                  <p className="text-3xl font-serif font-bold text-emerald-brand">
                    +{proj.currentRevPAR > 0 ? (((proj.newRevPAR - proj.currentRevPAR) / proj.currentRevPAR) * 100).toFixed(1) : "0"}%
                  </p>
                  <p className="text-white/30 text-xs font-sans mt-1">
                    {formatCurrency(proj.currentRevPAR, currency)} → {formatCurrency(proj.newRevPAR, currency)}
                  </p>
                  <p className="text-white/20 text-[10px] font-sans mt-1">
                    Hotel-wide blended · {Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable
                  </p>
                </div>
                {/* Annual Financial Impact */}
                <div className="rounded-2xl p-5 text-center border bg-gold-500/10 border-gold-500/30">
                  <p className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">Annual Financial Impact</p>
                  <p className="text-3xl font-serif font-bold text-gold-400">
                    {formatCurrency(proj.totalAnnualImpact, currency, true)}
                  </p>
                  <p className="text-white/30 text-xs font-sans mt-1">Revenue uplift + systems cost savings</p>
                </div>
                {/* ROI Multiple */}
                <div className="rounded-2xl p-5 text-center border bg-white/5 border-white/15">
                  <p className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">ROI Multiple</p>
                  <p className="text-3xl font-serif font-bold text-white">{proj.roiMultiple.toFixed(1)}x</p>
                  <p className="text-white/30 text-xs font-sans mt-1">Return on Duetto investment</p>
                </div>
                {/* Payback Period — conditionally shown */}
                {includePayback && (
                  <div className="rounded-2xl p-5 text-center border bg-white/5 border-white/15">
                    <p className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">Payback Period</p>
                    <p className="text-3xl font-serif font-bold text-white">{proj.paybackMonths.toFixed(1)} months</p>
                    <p className="text-white/30 text-xs font-sans mt-1">Year 1 investment incl. implementation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Market Segment Benchmark Comparison — only when CoStar data is available */}
            {primaryBenchmark && segmentYoY !== null && (
              <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold">
                    Market Positioning vs. {PROPERTY_TYPE_LABELS[inputs.propertyType]} Segment
                  </p>
                  <span className="text-[10px] font-sans text-white/30 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    CoStar · {primaryBenchmark.marketName}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Market segment YoY */}
                  <div className="rounded-xl p-4 bg-navy-800/60 border border-white/10 text-center">
                    <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-2">Market Segment YoY</p>
                    <p className={`text-2xl font-serif font-bold ${segmentYoY.revparPct >= 0 ? "text-white" : "text-[#FF5900]"}`}>
                      {segmentYoY.revparPct >= 0 ? "+" : ""}{segmentYoY.revparPct.toFixed(1)}%
                    </p>
                    <p className="text-white/30 text-[10px] font-sans mt-1">RevPAR growth · prior year</p>
                  </div>
                  {/* Projected with Duetto */}
                  <div className="rounded-xl p-4 bg-emerald-brand/10 border border-emerald-brand/30 text-center">
                    <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-2">With Duetto ({SCENARIO_LABELS[scenario]})</p>
                    <p className="text-2xl font-serif font-bold text-emerald-brand">
                      +{projectedRevPARPct.toFixed(1)}%
                    </p>
                    <p className="text-white/30 text-[10px] font-sans mt-1">Projected RevPAR improvement</p>
                  </div>
                  {/* Outperformance delta */}
                  <div className="rounded-xl p-4 bg-gold-500/10 border border-gold-500/30 text-center">
                    <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-2">Above Market Average</p>
                    <p className="text-2xl font-serif font-bold text-gold-400">
                      {outperformancePP !== null && outperformancePP >= 0 ? "+" : ""}{outperformancePP?.toFixed(1)}pp
                    </p>
                    <p className="text-white/30 text-[10px] font-sans mt-1">Percentage points above segment</p>
                  </div>
                </div>
                {outperformancePP !== null && (
                  <p className="text-white/30 text-[10px] font-sans mt-3 text-center">
                    {outperformancePP >= 0
                      ? `Duetto positions this property to grow RevPAR ${outperformancePP.toFixed(1)}pp above the ${PROPERTY_TYPE_LABELS[inputs.propertyType]} segment average.`
                      : `Market segment is growing faster than current projection; consider a more aggressive scenario.`}
                  </p>
                )}

                {/* Performance Index (RGI/ARI/MPI) — current standing vs. segment average */}
                {(ariIndex !== null || mpiIndex !== null || rgiIndex !== null) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-3 text-center">
                      Current Performance Index — vs. {PROPERTY_TYPE_LABELS[inputs.propertyType]} Segment Average
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-xl p-3 bg-navy-800/60 border border-white/10 text-center">
                        <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-1">ARI</p>
                        <p className={`text-xl font-serif font-bold ${ariIndex !== null && ariIndex >= 100 ? "text-white" : "text-[#FF5900]"}`}>
                          {ariIndex !== null ? ariIndex.toFixed(0) : "—"}
                        </p>
                        <p className="text-white/25 text-[10px] font-sans mt-0.5">ADR Index</p>
                      </div>
                      <div className="rounded-xl p-3 bg-navy-800/60 border border-white/10 text-center">
                        <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-1">MPI</p>
                        <p className={`text-xl font-serif font-bold ${mpiIndex !== null && mpiIndex >= 100 ? "text-white" : "text-[#FF5900]"}`}>
                          {mpiIndex !== null ? mpiIndex.toFixed(0) : "—"}
                        </p>
                        <p className="text-white/25 text-[10px] font-sans mt-0.5">Occupancy Index</p>
                      </div>
                      <div className="rounded-xl p-3 bg-navy-800/60 border border-white/10 text-center">
                        <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-1">RGI</p>
                        <p className={`text-xl font-serif font-bold ${rgiIndex !== null && rgiIndex >= 100 ? "text-white" : "text-[#FF5900]"}`}>
                          {rgiIndex !== null ? rgiIndex.toFixed(0) : "—"}
                        </p>
                        <p className="text-white/25 text-[10px] font-sans mt-0.5">RevPAR Index</p>
                      </div>
                    </div>
                    <p className="text-white/20 text-[10px] font-sans mt-3 text-center">
                      100 = performance at parity with the {PROPERTY_TYPE_LABELS[inputs.propertyType]} segment average. Benchmarked against the CoStar segment/class average for {primaryBenchmark.marketName}, not a curated competitive set.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Revenue breakdown donut */}
            <div className="grid grid-cols-5 gap-6 items-center">
              <div className="col-span-2">
                <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">Impact Breakdown</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "rgba(14,33,36,0.98)", border: "1px solid rgba(196,255,69,0.3)", borderRadius: 8, color: "white", fontSize: 11 }}
                      formatter={(v: number) => [formatCurrency(v, currency, true), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-3 space-y-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-white/60 text-sm font-sans">{item.name}</span>
                    </div>
                    <span className="text-white font-sans font-semibold text-sm">
                      {formatCurrency(item.value, currency, true)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-t border-gold-500/30">
                  <span className="text-gold-400 text-sm font-sans font-bold">Total Annual Impact</span>
                  <span className="text-gold-400 font-serif font-bold text-lg">
                    {formatCurrency(proj.totalAnnualImpact, currency, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* Projection Summary */}
            {includeFiveYear && (
            <div>
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-4">{projectionLabel} Value Creation</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {yearlyProjections.map((y) => (
                  <div key={y.year} className="rounded-xl p-3 bg-navy-800/60 border border-white/10 text-center">
                    <p className="text-white/40 text-xs font-sans mb-1">Year {y.year}</p>
                    <p className="text-white font-serif font-bold text-sm">
                      {formatCurrency(y.totalImpact, currency, true)}
                    </p>
                    <p className="text-emerald-brand text-xs font-sans mt-0.5">
                      {y.roiPercent.toFixed(0)}% ROI
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl p-4 bg-gold-500/8 border border-gold-500/20 text-center">
                  <p className="text-white/40 text-xs font-sans mb-1">{projectionLabel} Total Impact</p>
                  <p className="text-gold-400 font-serif font-bold text-xl">{formatCurrency(totalFiveYearImpact, currency, true)}</p>
                </div>
                <div className="rounded-xl p-4 bg-emerald-brand/8 border border-emerald-brand/20 text-center">
                  <p className="text-white/40 text-xs font-sans mb-1">{projectionLabel} Net Benefit</p>
                  <p className="text-emerald-brand font-serif font-bold text-xl">{formatCurrency(totalFiveYearNet, currency, true)}</p>
                </div>
                <div className="rounded-xl p-4 bg-[#7459EE]/8 border border-[#7459EE]/20 text-center">
                  <p className="text-white/40 text-xs font-sans mb-1">{projectionLabel} ROI Multiple</p>
                  <p className="text-[#7459EE] font-serif font-bold text-xl">{fiveYearROIMultiple.toFixed(1)}x</p>
                </div>
              </div>
            </div>
            )}

            {/* Investment Recommendation */}
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-4">Investment Recommendation</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="py-2 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-sm font-sans">Total Duetto Investment (Yr 1)</span>
                      <span className="text-white font-semibold font-sans">{formatCurrency(effectiveCost + effectiveImplFee, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-white/30 text-xs font-sans pl-2">↳ Annual subscription</span>
                      <span className="text-white/50 text-xs font-sans">{formatCurrency(effectiveCost, currency)}</span>
                    </div>
                    {effectiveImplFee > 0 && (
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-white/30 text-xs font-sans pl-2">↳ Implementation fee <span className="text-gold-500/60">(one-time, Yr 1 only)</span></span>
                        <span className="text-white/50 text-xs font-sans">{formatCurrency(effectiveImplFee, currency)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/50 text-sm font-sans">Annual Financial Impact ({SCENARIO_LABELS[scenario]})</span>
                    <span className="text-gold-400 font-semibold font-sans">{formatCurrency(proj.totalAnnualImpact, currency, true)}</span>
                  </div>
                  {includeTimeReclaimed && proj.hoursSavedPerWeek > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-white/50 text-sm font-sans">Strategic Time Reclaimed</span>
                      <span className="text-gold-400 font-semibold font-sans">~{proj.hoursSavedPerWeek.toFixed(0)} hrs/week</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-white/70 text-sm font-sans leading-relaxed">
                    <span className="text-emerald-brand font-semibold">RevPAR improvement of {proj.currentRevPAR > 0 ? (((proj.newRevPAR - proj.currentRevPAR) / proj.currentRevPAR) * 100).toFixed(1) : "0"}%</span>{" "}
                    on {Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable inventory{isPortfolioMode ? ` across ${portfolioProperties.length} properties` : ""} delivers{" "}
                    <span className="text-gold-400 font-bold">{proj.roiMultiple.toFixed(1)}x</span> ROI annually
                    {includeFiveYear && <> — and <span className="text-emerald-brand font-bold">{fiveYearROIMultiple.toFixed(1)}x</span> over {projectionYears} years</>}.
                  </p>
                  <p className="text-white/40 text-xs font-sans mt-3">
                    {SCENARIO_LABELS[scenario]} scenario projects {formatCurrency(proj.totalAnnualImpact, currency, true)} annual financial impact
                    on {effectiveInputs.totalRooms.toLocaleString()} rooms at {formatPercent(effectiveInputs.currentOccupancy)} occupancy.
                    {includePayback && ` Payback in ${proj.paybackMonths.toFixed(1)} months (Year 1, including implementation).`}
                  </p>
                </div>
              </div>
            </div>

            {/* Implementation Period Note */}
            <div className="rounded-xl border border-[#7459EE]/20 bg-[#7459EE]/5 p-4">
              <p className="text-[#7459EE] text-[10px] font-sans font-semibold uppercase tracking-wider mb-1">Implementation &amp; Go-Live Timeline</p>
              <p className="text-white/50 text-xs font-sans leading-relaxed">
                Following contract execution, Duetto's implementation team begins a <span className="text-white/70 font-semibold">6–8 week onboarding process</span> covering PMS integration, data configuration, and team training. No incremental RevPAR impact is expected during this period. The Year 1 projections above reflect the RMS effectiveness ramp — starting from Month 3 through Month 12 — as your team progressively applies open pricing and demand intelligence across your yieldable inventory. Full effectiveness is reached in Month 12.
              </p>
            </div>

            {/* Next Steps */}
            <div>
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">Recommended Next Steps</p>
              <div className="rounded-xl border border-white/10 bg-navy-800/40 p-4 min-h-[80px]">
                {isExporting ? (
                  /* Static div for html2canvas — textarea doesn't render reliably */
                  <p className="text-white/70 text-sm font-sans leading-relaxed whitespace-pre-wrap">
                    {nextSteps || "Enter personalized next steps for this prospect..."}
                  </p>
                ) : (
                  <textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent text-white/70 text-sm font-sans outline-none resize-none leading-relaxed placeholder-white/20"
                    placeholder="Enter personalized next steps for this prospect..."
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              {showExchangeNote && (
                <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white/3 border border-white/8">
                  <svg className="w-3 h-3 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <p className="text-white/40 text-[10px] font-sans">
                    All figures displayed in <span className="text-white/60 font-semibold">{currency}</span>.
                    Exchange rate{exchangeRateLines.length > 1 ? "s" : ""} applied:{" "}
                    <span className="text-white/60">{exchangeRateLines.join(" · ")}</span>
                    {" "}· Rates configurable in Property Profile → Exchange Rates.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DuettoIcon size={22} />
                  <span className="text-white/30 text-xs font-sans">duettocloud.com</span>
                </div>
                <p className="text-white/20 text-xs font-sans">
                  Projections are estimates based on industry benchmarks and provided property data. Actual results may vary.
                  Confidential — prepared for {inputs.propertyName || "prospect"}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
