"use client";
import React from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { clsx } from "clsx";

const TABS = [
  {
    id: 0,
    label: "Property Profile",
    shortLabel: "Property",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 1,
    label: "ROI Projection",
    shortLabel: "ROI",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 2,
    label: "5-Year Projection",
    shortLabel: "5-Year",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 3,
    label: "Market Context",
    shortLabel: "Market",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 4,
    label: "Executive Summary",
    shortLabel: "Summary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function Navigation() {
  const { activeTab, setActiveTab, inputs } = useCalculatorStore();

  return (
    <nav className="flex items-center gap-1 p-1.5 bg-navy-950/80 backdrop-blur-xl border border-white/8 rounded-2xl no-print">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-sans font-medium transition-all duration-200 relative",
            activeTab === tab.id
              ? "bg-navy-700/80 text-white shadow-lg border border-white/10"
              : "text-white/40 hover:text-white/70 hover:bg-white/5"
          )}
        >
          <span className={clsx(activeTab === tab.id ? "text-gold-400" : "text-white/30")}>
            {tab.icon}
          </span>
          <span className="hidden lg:block">{tab.label}</span>
          <span className="block lg:hidden">{tab.shortLabel}</span>
          {tab.id === 4 && (
            <span className="hidden xl:flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-gold-500/20 text-gold-500 text-[9px] font-bold">
              PDF
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
