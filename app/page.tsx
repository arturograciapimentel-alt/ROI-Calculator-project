"use client";
import React, { useEffect } from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { Navigation } from "@/components/Navigation";
import { Tab1PropertyProfile } from "@/components/tabs/Tab1PropertyProfile";
import { Tab2ROIProjection } from "@/components/tabs/Tab2ROIProjection";
import { Tab3FiveYear } from "@/components/tabs/Tab3FiveYear";
import { Tab4Market } from "@/components/tabs/Tab4Market";
import { Tab5Executive } from "@/components/tabs/Tab5Executive";
import { formatCurrency, estimateDuettoCost } from "@/lib/calculations";
import { clsx } from "clsx";

function LiveROIBadge() {
  const { inputs, projections, scenario } = useCalculatorStore();
  const proj = projections[scenario];
  const currency = inputs.currency;

  return (
    <div className="flex items-center gap-4 no-print">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-brand/10 border border-emerald-brand/30">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-brand animate-pulse" />
        <span className="text-emerald-brand text-xs font-sans font-medium">Live calculation</span>
      </div>
      <div className="hidden xl:flex items-center gap-6">
        <div className="text-center">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider">Annual Impact</p>
          <p className="text-gold-400 font-serif font-semibold text-sm">
            {formatCurrency(proj.totalAnnualImpact, currency, true)}
          </p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider">ROI</p>
          <p className="text-gold-400 font-serif font-semibold text-sm">{proj.roiMultiple.toFixed(1)}x</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider">Payback</p>
          <p className="text-gold-400 font-serif font-semibold text-sm">{proj.paybackMonths.toFixed(1)} mo</p>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  Tab1PropertyProfile,
  Tab2ROIProjection,
  Tab3FiveYear,
  Tab4Market,
  Tab5Executive,
];

export default function HomePage() {
  const { activeTab } = useCalculatorStore();

  // Hydration guard for Zustand persist
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-brand/20 border border-emerald-brand/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-emerald-brand font-bold text-lg">D</span>
          </div>
          <p className="text-white/30 text-sm font-sans">Loading Duetto ROI Calculator...</p>
        </div>
      </div>
    );
  }

  const ActiveTab = TABS[activeTab];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-navy-950/90 backdrop-blur-xl no-print">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-brand flex items-center justify-center shadow-emerald">
              <span className="text-navy-950 font-bold font-sans text-base leading-none">D</span>
            </div>
            <div>
              <p className="text-emerald-brand font-sans font-bold text-base leading-none tracking-widest">
                DUETTO
              </p>
              <p className="text-white/25 text-[9px] font-sans tracking-[0.15em] uppercase leading-none mt-0.5">
                ROI Calculator
              </p>
            </div>
          </div>

          {/* Navigation */}
          <Navigation />

          {/* Live ROI badge */}
          <LiveROIBadge />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-8">
        <ActiveTab key={activeTab} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 no-print">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <p className="text-white/20 text-xs font-sans">
            Duetto ROI Calculator · Projections are estimates based on industry benchmarks
          </p>
          <p className="text-white/15 text-xs font-sans">
            Data is stored locally in your browser · No information is transmitted
          </p>
        </div>
      </footer>
    </div>
  );
}
