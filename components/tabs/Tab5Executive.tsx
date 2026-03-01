"use client";
import React, { useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { DuettoIcon, DuettoWordmark } from "@/components/ui/DuettoLogo";
import {
  formatCurrency,
  formatPercent,
  estimateDuettoCost,
  aggregatePortfolioInputs,
  PROPERTY_TYPE_LABELS,
  RM_APPROACH_LABELS,
} from "@/lib/calculations";
import { clsx } from "clsx";

const PIE_COLORS = ["#C4FF45", "#68FFF2", "#7459EE", "#FFD9A0"];

export function Tab5Executive() {
  const {
    inputs, projections, scenario, yearlyProjections, capRate,
    preparedBy, nextSteps, setPreparedBy, setNextSteps, portfolioProperties,
  } = useCalculatorStore();

  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currency = inputs.currency;
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;
  const proj = projections.moderate;
  const conservProj = projections.conservative;
  const effectiveCost = effectiveInputs.duettoAnnualCost || estimateDuettoCost(effectiveInputs.totalRooms);
  const currentRevPAR = effectiveInputs.currentADR * effectiveInputs.currentOccupancy;
  const annualRevenue = currentRevPAR * effectiveInputs.totalRooms * 365;
  const totalFiveYearNet = yearlyProjections.reduce((s, y) => s + y.netBenefit, 0);
  const totalFiveYearImpact = yearlyProjections.reduce((s, y) => s + y.totalImpact, 0);
  const totalFiveYearInvestment = yearlyProjections.reduce((s, y) => s + y.duettoInvestment, 0);
  const fiveYearROIMultiple = totalFiveYearImpact / totalFiveYearInvestment;
  const incrementalNOI = (yearlyProjections[4]?.totalImpact || 0) * 0.85;
  const valuationImpact = incrementalNOI / capRate;

  const adrContrib = proj.incrementalADRRevenue;
  const occContrib = proj.incrementalOccRevenue;
  const total = adrContrib + occContrib || 1;
  const pieData = [
    { name: "ADR Uplift", value: Math.max(proj.annualIncrementalRoomRevenue * (adrContrib / total), 0) },
    { name: "Occ. Uplift", value: Math.max(proj.annualIncrementalRoomRevenue * (occContrib / total) + proj.groupRevenue, 0) },
    { name: "Labor Savings", value: Math.max(proj.laborSavings, 0) },
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

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0E2124",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

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
            placeholder="Your name / Sales rep"
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
                Prepared by {preparedBy || "[Sales Representative]"} ·{" "}
                {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} ·{" "}
                <span className="text-gold-500">CONFIDENTIAL</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/30 text-xs font-sans">Annual Duetto Investment</p>
              <p className="text-2xl font-serif font-bold text-white">{formatCurrency(effectiveCost, currency)}</p>
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
                    [isPortfolioMode ? "Blended ADR" : "Current ADR", formatCurrency(effectiveInputs.currentADR, currency)],
                    [isPortfolioMode ? "Blended Occupancy" : "Current Occupancy", formatPercent(effectiveInputs.currentOccupancy)],
                    [isPortfolioMode ? "Portfolio RevPAR" : "Current RevPAR", formatCurrency(currentRevPAR, currency)],
                    ["Yieldable Mix", `${Math.round(effectiveInputs.yieldablePercent * 100)}% of room nights`],
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
                        const pRevPAR = p.currentADR * p.currentOccupancy;
                        return (
                          <tr key={p.id}>
                            <td className="py-1.5 pr-4 text-white font-medium">{p.propertyName || "—"}</td>
                            <td className="py-1.5 pr-4 text-white/50">{PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}</td>
                            <td className="py-1.5 pr-4 text-white/70">{p.totalRooms}</td>
                            <td className="py-1.5 pr-4 text-white/70">{formatCurrency(p.currentADR, currency)}</td>
                            <td className="py-1.5 pr-4 text-white/70">{formatPercent(p.currentOccupancy)}</td>
                            <td className="py-1.5 text-emerald-brand font-semibold">{formatCurrency(pRevPAR, currency)}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-gold-500/30">
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">Portfolio Blended</td>
                        <td className="py-1.5 pr-4 text-white/40">—</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{effectiveInputs.totalRooms}</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{formatCurrency(effectiveInputs.currentADR, currency)}</td>
                        <td className="py-1.5 pr-4 text-gold-400 font-semibold">{formatPercent(effectiveInputs.currentOccupancy)}</td>
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
                Financial Impact Summary — Moderate Scenario
              </p>
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: "RevPAR Improvement",
                    value: `+${currentRevPAR > 0 ? (((proj.newRevPAR - currentRevPAR) / currentRevPAR) * 100).toFixed(1) : "0"}%`,
                    sub: `${formatCurrency(currentRevPAR, currency)} → ${formatCurrency(proj.newRevPAR, currency)}`,
                    variant: "emerald",
                  },
                  {
                    label: "Annual Financial Impact",
                    value: formatCurrency(proj.totalAnnualImpact, currency, true),
                    sub: "Revenue uplift + labor savings",
                    variant: "gold",
                  },
                  {
                    label: "ROI Multiple",
                    value: `${proj.roiMultiple.toFixed(1)}x`,
                    sub: "Return on Duetto investment",
                    variant: "default",
                  },
                  {
                    label: "Payback Period",
                    value: `${proj.paybackMonths.toFixed(1)} months`,
                    sub: "Time to positive ROI",
                    variant: "default",
                  },
                ].map(({ label, value, sub, variant }) => (
                  <div
                    key={label}
                    className={clsx(
                      "rounded-2xl p-5 text-center border",
                      variant === "gold" && "bg-gold-500/10 border-gold-500/30",
                      variant === "emerald" && "bg-emerald-brand/10 border-emerald-brand/30",
                      variant === "default" && "bg-white/5 border-white/15"
                    )}
                  >
                    <p className="text-white/50 text-xs font-sans uppercase tracking-wider mb-2">{label}</p>
                    <p
                      className={clsx(
                        "text-3xl font-serif font-bold",
                        variant === "gold" && "text-gold-400",
                        variant === "emerald" && "text-emerald-brand",
                        variant === "default" && "text-white"
                      )}
                    >
                      {value}
                    </p>
                    <p className="text-white/30 text-xs font-sans mt-1">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

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

            {/* 5-Year Summary */}
            <div>
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-4">5-Year Value Creation</p>
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
                  <p className="text-white/40 text-xs font-sans mb-1">5-Year Total Impact</p>
                  <p className="text-gold-400 font-serif font-bold text-xl">{formatCurrency(totalFiveYearImpact, currency, true)}</p>
                </div>
                <div className="rounded-xl p-4 bg-emerald-brand/8 border border-emerald-brand/20 text-center">
                  <p className="text-white/40 text-xs font-sans mb-1">5-Year Net Benefit</p>
                  <p className="text-emerald-brand font-serif font-bold text-xl">{formatCurrency(totalFiveYearNet, currency, true)}</p>
                </div>
                <div className="rounded-xl p-4 bg-[#7459EE]/8 border border-[#7459EE]/20 text-center">
                  <p className="text-white/40 text-xs font-sans mb-1">Property Valuation +</p>
                  <p className="text-[#7459EE] font-serif font-bold text-xl">{formatCurrency(valuationImpact, currency, true)}</p>
                </div>
              </div>
            </div>

            {/* Investment Recommendation */}
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-4">Investment Recommendation</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/50 text-sm font-sans">Annual Duetto Investment</span>
                    <span className="text-white font-semibold font-sans">{formatCurrency(effectiveCost, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/50 text-sm font-sans">Annual Financial Impact (Mod.)</span>
                    <span className="text-gold-400 font-semibold font-sans">{formatCurrency(proj.totalAnnualImpact, currency, true)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/50 text-sm font-sans">Annual Financial Impact (Con.)</span>
                    <span className="text-emerald-brand font-semibold font-sans">{formatCurrency(conservProj.totalAnnualImpact, currency, true)}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-white/70 text-sm font-sans leading-relaxed">
                    <span className="text-emerald-brand font-semibold">RevPAR improvement of {currentRevPAR > 0 ? (((proj.newRevPAR - currentRevPAR) / currentRevPAR) * 100).toFixed(1) : "0"}%</span>{" "}
                    on {Math.round(effectiveInputs.yieldablePercent * 100)}% yieldable inventory{isPortfolioMode ? ` across ${portfolioProperties.length} properties` : ""} delivers{" "}
                    <span className="text-gold-400 font-bold">{proj.roiMultiple.toFixed(1)}x</span> ROI annually —
                    and <span className="text-emerald-brand font-bold">{fiveYearROIMultiple.toFixed(1)}x</span> over 5 years.
                  </p>
                  <p className="text-white/40 text-xs font-sans mt-3">
                    The conservative scenario alone delivers {formatCurrency(conservProj.totalAnnualImpact, currency, true)}, with
                    moderate projections suggesting {formatCurrency(proj.totalAnnualImpact, currency, true)}.
                    Risk-adjusted payback in as little as {conservProj.paybackMonths.toFixed(1)} months.
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <p className="text-gold-500 text-xs font-sans uppercase tracking-[0.15em] font-semibold mb-3">Recommended Next Steps</p>
              <div className="rounded-xl border border-white/10 bg-navy-800/40 p-4">
                <textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent text-white/70 text-sm font-sans outline-none resize-none leading-relaxed placeholder-white/20 no-print-border"
                  placeholder="Enter personalized next steps for this prospect..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
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
  );
}
