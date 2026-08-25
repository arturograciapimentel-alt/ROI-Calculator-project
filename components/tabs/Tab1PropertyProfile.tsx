"use client";
import React, { useCallback, useState } from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, TextInput, SelectInput, SliderInput, StarRating } from "@/components/ui/InputField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, CURRENCY_SYMBOLS, estimateDuettoCost, isOperaCloud, computeDuettoAnnualCost, DEFAULT_EXCHANGE_RATES } from "@/lib/calculations";
import type { CoStarBenchmark, Currency, PortfolioProperty, PropertyInputs, PropertyType } from "@/lib/types";

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
  { value: "MXN", label: "MXN — Mexican Peso (MX$)" },
  { value: "CAD", label: "CAD — Canadian Dollar (CA$)" },
  { value: "AUD", label: "AUD — Australian Dollar (A$)" },
  { value: "JPY", label: "JPY — Japanese Yen (¥)" },
];

function CurrencySelect({ value, onChange }: { value: Currency; onChange: (v: Currency) => void }) {
  return (
    <SelectInput value={value} onChange={(e) => onChange(e.target.value as Currency)}>
      {CURRENCY_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </SelectInput>
  );
}

function ExchangeRatesPanel() {
  const { inputs, exchangeRates, updateExchangeRate, outputCurrency } = useCalculatorStore();
  const [open, setOpen] = useState(false);

  // Only show currencies that are actually in use
  const activeCurrencies = Array.from(new Set([
    inputs.currency,
    inputs.duettoCurrency,
    outputCurrency,
  ])).filter((c) => c !== "USD");

  // If everything is USD (or only one currency), no conversion is needed
  const allSameCurrency =
    inputs.currency === inputs.duettoCurrency &&
    inputs.currency === outputCurrency;

  if (allSameCurrency) return null;

  return (
    <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#7459EE]/15 text-[#7459EE]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 4v8m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-white/80 text-sm font-sans font-medium">Exchange Rates</p>
            <p className="text-white/35 text-xs font-sans">
              {activeCurrencies.length > 0
                ? `Rates in use: ${activeCurrencies.join(", ")} ↔ USD — click to verify or override`
                : "Approximate reference rates — click to verify or override"}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-5 border-t border-white/8">
          <p className="text-white/30 text-[11px] font-sans mt-4 mb-4">
            Rates are expressed as <strong className="text-white/50">1 USD = N units</strong> of each currency.
            Calculations convert all monetary inputs to the output currency using these rates.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(DEFAULT_EXCHANGE_RATES) as Currency[])
              .filter((c) => c !== "USD")
              .map((c) => {
                const currentRate = exchangeRates[c] ?? DEFAULT_EXCHANGE_RATES[c] ?? 1;
                const defaultRate = DEFAULT_EXCHANGE_RATES[c];
                const isActive = [inputs.currency, inputs.duettoCurrency, outputCurrency].includes(c);
                return (
                  <div
                    key={c}
                    className={`p-3 rounded-xl border transition-all ${
                      isActive
                        ? "border-[#7459EE]/30 bg-[#7459EE]/5"
                        : "border-white/8 bg-navy-800/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-sans font-semibold text-white/70">
                        {CURRENCY_SYMBOLS[c]} {c}
                      </span>
                      {isActive && (
                        <span className="text-[9px] bg-[#7459EE]/20 text-[#7459EE] px-1.5 py-0.5 rounded-full font-sans">
                          active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/30 text-[10px] font-sans">1 USD =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={currentRate}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v > 0) updateExchangeRate(c, v);
                        }}
                        className="flex-1 min-w-0 bg-navy-800/80 border border-white/10 rounded px-2 py-1 text-white text-xs font-sans text-right focus:outline-none focus:border-[#7459EE]/50"
                      />
                    </div>
                    {Math.abs(currentRate - defaultRate) / defaultRate > 0.01 && (
                      <button
                        onClick={() => updateExchangeRate(c, defaultRate)}
                        className="mt-1.5 text-[9px] text-white/25 hover:text-white/50 font-sans"
                      >
                        Reset to ~{defaultRate}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
          <p className="text-white/20 text-[10px] font-sans mt-3">
            Reference rates are approximate. For precise calculations, enter the current interbank rate.
          </p>
        </div>
      )}
    </div>
  );
}

function ProfileCompleteness({ inputs }: { inputs: PropertyInputs }) {
  const fields = [
    inputs.propertyName,
    inputs.totalRooms > 0,
    inputs.currentADR > 0,
    inputs.currentOccupancy > 0,
    inputs.location,
    (inputs.annualRMSystemsCost || 0) + (inputs.annualConsultingCost || 0) > 0, // Either tech or consulting costs provided
    inputs.cpor > 0,
  ];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-500 to-emerald-brand rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/50 font-sans tabular-nums">{pct}% complete</span>
    </div>
  );
}

function PortfolioPropertyCard({
  index,
  property,
  sym,
  currency,
  costarBenchmarks,
  onUpdate,
  onRemove,
}: {
  index: number;
  property: PortfolioProperty;
  sym: string;
  currency: string;
  costarBenchmarks: CoStarBenchmark[];
  onUpdate: (updates: Partial<Omit<PortfolioProperty, "id">>) => void;
  onRemove: () => void;
}) {
  const autoEstimate = estimateDuettoCost(property.totalRooms);
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-5 space-y-5">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 text-xs font-bold flex items-center justify-center font-sans">
            {index + 1}
          </span>
          <span className="text-white/80 text-sm font-sans font-medium">
            {property.propertyName || `Property ${index + 1}`}
          </span>
          <span className="text-white/30 text-xs font-sans">
            · {property.totalRooms} rooms
            · {formatCurrency(property.currentADR, currency)} ADR
            · {Math.round(property.currentOccupancy * 100)}% occ
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-white/25 hover:text-[#FF5900] transition-colors p-1 rounded"
          aria-label="Remove property"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Identity row */}
      <div className="grid grid-cols-3 gap-4">
        <InputField label="Property Name">
          <TextInput
            value={property.propertyName}
            onChange={(e) => onUpdate({ propertyName: e.target.value })}
            placeholder={`Property ${index + 1}`}
          />
        </InputField>

        <InputField label="Hotel Class (CoStar)">
          <SelectInput
            value={property.propertyType}
            onChange={(e) => onUpdate({ propertyType: e.target.value as PropertyType })}
          >
            <option value="luxury-upper-upscale">Luxury &amp; Upper Upscale</option>
            <option value="upscale-upper-midscale">Upscale &amp; Upper Midscale</option>
            <option value="midscale-economy">Midscale &amp; Economy</option>
          </SelectInput>
        </InputField>

        <InputField label="Total Rooms" required>
          <TextInput
            type="number"
            value={property.totalRooms || ""}
            onChange={(e) => onUpdate({ totalRooms: parseInt(e.target.value) || 0 })}
            min="1"
            max="5000"
            placeholder="200"
          />
        </InputField>
      </div>

      {/* Market report assignment row */}
      <div className="grid grid-cols-3 gap-4">
        <InputField
          label="Market Report"
          tooltip={costarBenchmarks.length === 0
            ? "Upload a CoStar market report in the Market Context tab, then assign it here"
            : "Assign the CoStar market report that covers this property's location"}
        >
          <SelectInput
            value={property.marketReportId || ""}
            onChange={(e) => onUpdate({ marketReportId: e.target.value || null })}
          >
            <option value="">No market report</option>
            {costarBenchmarks.map((b) => (
              <option key={b.id} value={b.id}>{b.marketName}</option>
            ))}
          </SelectInput>
        </InputField>
        {property.marketReportId && (
          <div className="col-span-2 flex items-end pb-1">
            <p className="text-emerald-brand/70 text-[10px] font-sans">
              ✓ {costarBenchmarks.find((b) => b.id === property.marketReportId)?.reportDate || "CoStar data"} — market benchmarks active for this property
            </p>
          </div>
        )}
      </div>

      {/* Performance row */}
      <div className="grid grid-cols-3 gap-4">
        <InputField label={`Average Daily Rate — ${sym}`} required>
          <TextInput
            type="number"
            value={property.currentADR || ""}
            onChange={(e) => onUpdate({ currentADR: parseFloat(e.target.value) || 0 })}
            prefix={sym}
            placeholder="150"
          />
        </InputField>

        <InputField label="Annual Pricing & RM Technology Costs" tooltip="Annual cost of pricing tools, rate shoppers, and RM software (e.g., Opera Insight, Duetto, IDeaS)">
          <TextInput
            type="number"
            value={property.annualRMSystemsCost || ""}
            onChange={(e) => onUpdate({ annualRMSystemsCost: parseFloat(e.target.value) || 0 })}
            prefix={sym}
            placeholder="15000"
          />
        </InputField>

        <InputField label="Annual Consulting / Outsourced RM Costs" tooltip="Annual cost of consulting services or fully outsourced revenue management (e.g., consulting firms, managed services)">
          <TextInput
            type="number"
            value={property.annualConsultingCost || ""}
            onChange={(e) => onUpdate({ annualConsultingCost: parseFloat(e.target.value) || 0 })}
            prefix={sym}
            placeholder="20000"
          />
        </InputField>

        <InputField
          label="Duetto Annual Cost"
          tooltip={`Leave 0 to auto-estimate (${formatCurrency(autoEstimate, currency)}/yr for ${property.totalRooms} rooms)`}
        >
          <TextInput
            type="number"
            value={property.duettoAnnualCost || ""}
            onChange={(e) => onUpdate({ duettoAnnualCost: parseFloat(e.target.value) || 0 })}
            prefix={sym}
            placeholder={`${autoEstimate.toLocaleString()} (auto)`}
          />
        </InputField>
      </div>

      {/* Sliders row */}
      <div className="grid grid-cols-3 gap-6">
        <InputField label="Occupancy Rate">
          <SliderInput
            value={Math.round(property.currentOccupancy * 100)}
            min={10}
            max={99}
            onChange={(v) => onUpdate({ currentOccupancy: v / 100 })}
            formatValue={(v) => `${v}%`}
          />
        </InputField>

        <InputField label="Group Business">
          <SliderInput
            value={Math.round(property.groupBusinessPercent * 100)}
            min={0}
            max={80}
            onChange={(v) => onUpdate({ groupBusinessPercent: v / 100 })}
            formatValue={(v) => `${v}%`}
          />
        </InputField>

        <InputField label="Yieldable Mix">
          <SliderInput
            value={Math.round(property.yieldablePercent * 100)}
            min={10}
            max={100}
            onChange={(v) => onUpdate({ yieldablePercent: v / 100 })}
            formatValue={(v) => `${v}%`}
          />
        </InputField>
      </div>
    </div>
  );
}

export function Tab1PropertyProfile() {
  const {
    inputs,
    updateInputs,
    loadSampleData,
    portfolioProperties,
    updatePortfolioProperty,
    setPortfolioProperties,
    costarBenchmarks,
    outputCurrency,
    setOutputCurrency,
  } = useCalculatorStore();

  const sym = CURRENCY_SYMBOLS[inputs.currency] || "$";
  const isPortfolioMode = inputs.numberOfProperties > 1;

  // Blended KPI values — from portfolio when active, else from single-property inputs
  const kpiRooms = isPortfolioMode && portfolioProperties.length > 0
    ? portfolioProperties.reduce((s, p) => s + p.totalRooms, 0)
    : inputs.totalRooms;

  const kpiADR = isPortfolioMode && portfolioProperties.length > 0 && kpiRooms > 0
    ? portfolioProperties.reduce((s, p) => s + p.currentADR * p.totalRooms, 0) / kpiRooms
    : inputs.currentADR;

  const kpiOcc = isPortfolioMode && portfolioProperties.length > 0 && kpiRooms > 0
    ? portfolioProperties.reduce((s, p) => s + p.currentOccupancy * p.totalRooms, 0) / kpiRooms
    : inputs.currentOccupancy;

  const kpiYieldable = isPortfolioMode && portfolioProperties.length > 0 && kpiRooms > 0
    ? portfolioProperties.reduce((s, p) => s + p.yieldablePercent * p.totalRooms, 0) / kpiRooms
    : inputs.yieldablePercent;

  const kpiRevPAR = kpiADR * kpiOcc;
  const kpiAnnualRevenue = kpiRevPAR * kpiRooms * 365;

  const update = useCallback(
    (key: keyof PropertyInputs, value: PropertyInputs[keyof PropertyInputs]) => {
      updateInputs({ [key]: value } as Partial<PropertyInputs>);
    },
    [updateInputs]
  );

  const handleRemoveProperty = (id: string) => {
    setPortfolioProperties(portfolioProperties.filter((p) => p.id !== id));
  };

  // Section numbers shift when portfolio mode is active
  const perfSectionNum = isPortfolioMode ? 3 : 2;
  const opsSectionNum = isPortfolioMode ? 4 : 3;

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">
            {isPortfolioMode ? "Portfolio Profile" : "Property Profile"}
          </h2>
          <p className="text-white/40 text-sm font-sans mt-1">
            {isPortfolioMode
              ? `${portfolioProperties.length} properties · enter per-property metrics below`
              : "Enter your property data to generate a personalized ROI analysis"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProfileCompleteness inputs={inputs} />
          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-400 text-sm font-sans font-medium hover:bg-gold-500/25 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load Sample Data
          </button>
        </div>
      </div>

      {/* Live KPI bar */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label={isPortfolioMode ? "Portfolio RevPAR" : "Current RevPAR"}
          value={formatCurrency(kpiRevPAR, inputs.currency)}
          subtitle={isPortfolioMode ? "Blended ADR × Occupancy" : "ADR × Occupancy"}
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Annual Room Revenue"
          value={formatCurrency(kpiAnnualRevenue, inputs.currency, true)}
          subtitle="RevPAR × Rooms × 365"
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Total Rooms"
          value={kpiRooms.toLocaleString()}
          subtitle={isPortfolioMode ? `Across ${portfolioProperties.length} properties` : "Property inventory"}
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Yieldable Mix"
          value={`${Math.round(kpiYieldable * 100)}%`}
          subtitle="RMS-optimizable room nights"
          variant="gold"
          size="sm"
        />
      </div>

      {/* Section 1: Property Configuration */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={1}
          title="Property Configuration"
          subtitle="Basic property information and market context"
        />
        <div className="grid grid-cols-2 gap-5">
          <InputField label={isPortfolioMode ? "Portfolio / Company Name" : "Property Name"} required tooltip="This will appear in PDF exports and reports">
            <TextInput
              value={inputs.propertyName}
              onChange={(e) => update("propertyName", e.target.value)}
              placeholder={isPortfolioMode ? "e.g. Acme Hotel Group" : "e.g. The Grand Metropolitan Hotel"}
            />
          </InputField>

          <InputField label="Hotel Class (CoStar)" tooltip="Matches CoStar's hotel class segments — used for benchmark comparison">
            <SelectInput
              value={inputs.propertyType}
              onChange={(e) => update("propertyType", e.target.value as PropertyInputs["propertyType"])}
            >
              <option value="luxury-upper-upscale">Luxury &amp; Upper Upscale</option>
              <option value="upscale-upper-midscale">Upscale &amp; Upper Midscale</option>
              <option value="midscale-economy">Midscale &amp; Economy</option>
            </SelectInput>
          </InputField>

          <InputField label="Location / Market" tooltip="City, state, or region for market context">
            <TextInput
              value={inputs.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. New York, NY"
            />
          </InputField>

          {!isPortfolioMode && (
            <InputField label="Total Rooms" required tooltip="Total number of sellable guest rooms/suites">
              <TextInput
                type="number"
                value={inputs.totalRooms || ""}
                onChange={(e) => update("totalRooms", parseInt(e.target.value) || 0)}
                min="50"
                max="5000"
                placeholder="200"
              />
            </InputField>
          )}

          <InputField
            label="Performance Metrics Currency"
            tooltip="Currency of your performance inputs: ADR, RM systems cost, and consulting cost. This is the currency your property data is reported in."
          >
            <CurrencySelect
              value={inputs.currency}
              onChange={(v) => update("currency", v)}
            />
          </InputField>

          <InputField label="Star Rating">
            <StarRating value={inputs.starRating} onChange={(v) => update("starRating", v)} />
          </InputField>

          <InputField label="Properties in Portfolio" tooltip="Enter >1 to enable portfolio aggregation mode">
            <TextInput
              type="number"
              value={inputs.numberOfProperties || ""}
              onChange={(e) => update("numberOfProperties", parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              placeholder="1"
            />
          </InputField>
        </div>
      </div>

      {/* Section 2: Portfolio Properties — shown only in portfolio mode */}
      {isPortfolioMode && (
        <div className="glass-card rounded-2xl p-6 border border-white/8">
          <div className="flex items-start justify-between mb-6">
            <SectionHeader
              number={2}
              title="Portfolio Properties"
              subtitle="Enter revenue metrics for each property — ROI is calculated on the blended portfolio"
            />
            <div className="flex items-center gap-2 text-xs text-white/40 font-sans mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-brand/60" />
              Portfolio mode active
            </div>
          </div>

          <div className="space-y-4">
            {portfolioProperties.map((prop, i) => (
              <PortfolioPropertyCard
                key={prop.id}
                index={i}
                property={prop}
                sym={sym}
                currency={inputs.currency}
                costarBenchmarks={costarBenchmarks}
                onUpdate={(updates) => updatePortfolioProperty(prop.id, updates)}
                onRemove={() => handleRemoveProperty(prop.id)}
              />
            ))}
          </div>

          {/* Portfolio blended summary */}
          {portfolioProperties.length >= 2 && (
            <div className="mt-6 pt-5 border-t border-white/8">
              <p className="text-xs text-white/40 font-sans uppercase tracking-wider mb-3">
                Blended Portfolio Summary
              </p>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Total Rooms"
                  value={kpiRooms.toLocaleString()}
                  subtitle={`${portfolioProperties.length} properties`}
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="Blended ADR"
                  value={formatCurrency(kpiADR, inputs.currency)}
                  subtitle="Room-weighted average"
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="Blended Occupancy"
                  value={`${Math.round(kpiOcc * 100)}%`}
                  subtitle="Room-weighted average"
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="Portfolio RevPAR"
                  value={formatCurrency(kpiRevPAR, inputs.currency)}
                  subtitle="Blended ADR × Occ"
                  variant="gold"
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 2 / 3: Current Performance — hidden in portfolio mode (captured per-property above) */}
      {!isPortfolioMode && (
        <div className="glass-card rounded-2xl p-6 border border-white/8">
          <SectionHeader
            number={perfSectionNum}
            title="Current Performance Metrics"
            subtitle="Your property's current revenue management performance"
          />
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <InputField
              label={`Average Daily Rate (ADR) — ${sym}`}
              required
              tooltip="Your current blended ADR across all segments and room types"
            >
              <TextInput
                type="number"
                value={inputs.currentADR || ""}
                onChange={(e) => update("currentADR", parseFloat(e.target.value) || 0)}
                prefix={sym}
                placeholder="150"
              />
            </InputField>

            <div>
              <InputField
                label="Current Occupancy Rate"
                required
                tooltip="Your trailing 12-month average occupancy"
              >
                <SliderInput
                  value={Math.round(inputs.currentOccupancy * 100)}
                  min={10}
                  max={99}
                  onChange={(v) => update("currentOccupancy", v / 100)}
                  formatValue={(v) => `${v}%`}
                />
              </InputField>
            </div>

            <div>
              <InputField
                label="Group Business (% of room nights)"
                tooltip="Percentage of room nights occupied by group/contract business"
              >
                <SliderInput
                  value={Math.round(inputs.groupBusinessPercent * 100)}
                  min={0}
                  max={80}
                  onChange={(v) => update("groupBusinessPercent", v / 100)}
                  formatValue={(v) => `${v}%`}
                />
              </InputField>
            </div>

            <div>
              <InputField
                label="Yieldable Booking Mix (% of room nights)"
                tooltip="Percentage of room nights in segments the RMS can optimize with dynamic pricing. Non-yieldable segments — such as group blocks and corporate contracted rates — operate at static negotiated rates."
              >
                <SliderInput
                  value={Math.round(inputs.yieldablePercent * 100)}
                  min={10}
                  max={100}
                  onChange={(v) => update("yieldablePercent", v / 100)}
                  formatValue={(v) => `${v}% yieldable · ${100 - v}% fixed/non-yieldable`}
                />
              </InputField>
            </div>
          </div>
        </div>
      )}

      {/* Section 3 / 4: Operational Context */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={opsSectionNum}
          title="Operational Context"
          subtitle={isPortfolioMode
            ? "Portfolio-wide revenue management approach and staffing"
            : "Current revenue management approach and staffing"}
        />
        <div className="grid grid-cols-2 gap-5">
          <InputField label="Current RM Approach">
            <SelectInput
              value={inputs.rmApproach}
              onChange={(e) => update("rmApproach", e.target.value as PropertyInputs["rmApproach"])}
            >
              <option value="spreadsheets">Spreadsheets / Manual</option>
              <option value="basic-rms">Basic / Legacy RMS</option>
              <option value="competitor-rms">Competitor RMS</option>
              <option value="none">No Formal Process</option>
            </SelectInput>
          </InputField>

          {inputs.rmApproach === "competitor-rms" && (
            <InputField label="Competitor RMS Name">
              <TextInput
                value={inputs.competitorRMSName}
                onChange={(e) => update("competitorRMSName", e.target.value)}
                placeholder="e.g. IDeaS, Duetto, RevPAR Guru..."
              />
            </InputField>
          )}

          <InputField
            label="Revenue Management Staff"
            tooltip={isPortfolioMode ? "Total FTEs across the portfolio" : "Total FTEs dedicated to revenue management"}
          >
            <TextInput
              type="number"
              value={inputs.rmStaffCount || ""}
              onChange={(e) => update("rmStaffCount", parseInt(e.target.value) || 0)}
              min="0"
              max="50"
              placeholder="2"
            />
          </InputField>

          <div>
            <InputField
              label="Hours/Week on Manual Pricing Tasks"
              tooltip="Estimate of staff hours spent on rate setting, reporting, and spreadsheet management. Duetto automates these tasks, freeing your team for strategic revenue decisions."
            >
              <SliderInput
                value={inputs.hoursPerWeekManual}
                min={0}
                max={60}
                onChange={(v) => update("hoursPerWeekManual", v)}
                formatValue={(v) => `${v} hrs/wk`}
              />
            </InputField>
          </div>

          {!isPortfolioMode && (
            <>
              <InputField
                label={`Annual Pricing & RM Technology Costs — ${sym}`}
                tooltip="Annual cost of pricing tools, rate shoppers, and RM software (e.g., Opera Insight, Duetto, IDeaS). If Duetto replaces these, this becomes direct cost savings."
              >
                <TextInput
                  type="number"
                  value={inputs.annualRMSystemsCost || ""}
                  onChange={(e) => update("annualRMSystemsCost", parseFloat(e.target.value) || 0)}
                  prefix={sym}
                  placeholder="15000"
                />
              </InputField>

              <InputField
                label={`Annual Consulting / Outsourced RM Costs — ${sym}`}
                tooltip="Annual cost of consulting services or fully outsourced revenue management (e.g., consulting firms, managed services). If Duetto replaces these, this becomes direct cost savings."
              >
                <TextInput
                  type="number"
                  value={inputs.annualConsultingCost || ""}
                  onChange={(e) => update("annualConsultingCost", parseFloat(e.target.value) || 0)}
                  prefix={sym}
                  placeholder="20000"
                />
              </InputField>
            </>
          )}
        </div>
      </div>

      {/* Section: Duetto Investment */}
      {(() => {
        const sectionNum = isPortfolioMode ? 5 : 4;
        const autoSubEstimate = estimateDuettoCost(inputs.totalRooms);
        const showOhip = isOperaCloud(inputs.pmsName || "");
        const duettoCurrency = inputs.duettoCurrency || inputs.currency;
        const duettoSym = CURRENCY_SYMBOLS[duettoCurrency] || "$";
        const effectiveSubscription = inputs.subscriptionCost > 0 ? inputs.subscriptionCost : autoSubEstimate;
        const effectiveOhip = showOhip ? (inputs.ohipConnectivityFee || 0) : 0;
        const annualRecurring = effectiveSubscription + effectiveOhip;
        const yearOneCost = annualRecurring + (inputs.implementationFee || 0);
        const contractYears = inputs.initialContractYears || 1;
        return (
          <div className="glass-card rounded-2xl p-6 border border-white/8">
            <div className="flex items-start justify-between mb-5">
              <SectionHeader
                number={sectionNum}
                title="Duetto Investment"
                subtitle="Cost breakdown used across all ROI projections and the 5-year model"
              />
              <div className="flex-shrink-0 ml-4 w-56">
                <InputField
                  label="Investment Currency"
                  tooltip="Currency for Duetto subscription, implementation fee, and OHIP. Duetto pricing is typically quoted in USD or EUR."
                >
                  <CurrencySelect
                    value={duettoCurrency}
                    onChange={(v) => update("duettoCurrency", v)}
                  />
                </InputField>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {/* PMS */}
              <InputField
                label="Current PMS System"
                tooltip="Enter your property management system. If you use Opera Cloud, an OHIP connectivity fee field will appear."
              >
                <TextInput
                  value={inputs.pmsName || ""}
                  onChange={(e) => update("pmsName", e.target.value)}
                  placeholder="e.g. Opera Cloud, Mews, Apaleo..."
                />
              </InputField>

              {/* Initial contract length */}
              <InputField
                label="Initial Contract Length"
                tooltip="Length of the initial Duetto contract term. A 5% annual price escalation applies from year 1 after the contract end date."
              >
                <SelectInput
                  value={String(inputs.initialContractYears || 1)}
                  onChange={(e) => update("initialContractYears", parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>{y} {y === 1 ? "year" : "years"}</option>
                  ))}
                </SelectInput>
              </InputField>

              {/* Projection years */}
              <InputField
                label="Projection Period"
                tooltip="Number of years to include in the multi-year projection. Choose 3, 5, or 10 years depending on your analysis needs."
              >
                <SelectInput
                  value={String(inputs.projectionYears || 5)}
                  onChange={(e) => update("projectionYears", parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => (
                    <option key={y} value={y}>{y} {y === 1 ? "year" : "years"}</option>
                  ))}
                </SelectInput>
              </InputField>

              {/* Post-contract subscription escalation rate */}
              <InputField
                label="Post-Contract Price Escalation"
                tooltip="Annual subscription price increase applied after the initial contract term ends."
              >
                <SelectInput
                  value={String(inputs.subscriptionEscalationRate ?? 0.05)}
                  onChange={(e) => update("subscriptionEscalationRate", parseFloat(e.target.value))}
                >
                  <option value="0.03">3% / year</option>
                  <option value="0.05">5% / year</option>
                </SelectInput>
              </InputField>

              {/* Subscription cost */}
              <InputField
                label={`Annual Subscription Cost — ${duettoSym}`}
                tooltip={`Recurring annual Duetto subscription fee. Leave 0 to auto-estimate (${formatCurrency(autoSubEstimate, duettoCurrency)}/yr for ${inputs.totalRooms} rooms).`}
              >
                <TextInput
                  type="number"
                  value={inputs.subscriptionCost || ""}
                  onChange={(e) => update("subscriptionCost", parseFloat(e.target.value) || 0)}
                  prefix={duettoSym}
                  placeholder={`${autoSubEstimate.toLocaleString()} (auto)`}
                />
              </InputField>

              {/* Implementation fee */}
              <InputField
                label={`Implementation Fee — ${duettoSym}`}
                tooltip="One-time fee charged in Year 1 only. Does not recur in subsequent years."
              >
                <TextInput
                  type="number"
                  value={inputs.implementationFee || ""}
                  onChange={(e) => update("implementationFee", parseFloat(e.target.value) || 0)}
                  prefix={duettoSym}
                  placeholder="0"
                />
              </InputField>

              {/* OHIP fee — only shown for Opera Cloud */}
              {showOhip && (
                <InputField
                  label={`OHIP Connectivity Fee — ${duettoSym}/yr`}
                  tooltip="Annual Oracle Hospitality Integration Platform fee. Applies to Opera Cloud properties only. Recurring every year."
                >
                  <TextInput
                    type="number"
                    value={inputs.ohipConnectivityFee || ""}
                    onChange={(e) => update("ohipConnectivityFee", parseFloat(e.target.value) || 0)}
                    prefix={duettoSym}
                    placeholder="0"
                  />
                </InputField>
              )}
            </div>

            {/* Cost summary */}
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Year 1 Total Cost</p>
                <p className="text-xl font-serif font-bold text-[#FF5900]">{formatCurrency(yearOneCost, duettoCurrency)}</p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  Subscription{inputs.implementationFee > 0 ? " + impl. fee" : ""}{effectiveOhip > 0 ? " + OHIP" : ""}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Annual Recurring Cost</p>
                <p className="text-xl font-serif font-bold text-white">{formatCurrency(annualRecurring, duettoCurrency)}</p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  Yrs 2–{contractYears}{effectiveOhip > 0 ? " (incl. OHIP)" : ""}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Post-Contract Rate</p>
                <p className="text-xl font-serif font-bold text-gold-400">
                  {formatCurrency(annualRecurring * (1 + (inputs.subscriptionEscalationRate ?? 0.05)), duettoCurrency)}<span className="text-sm text-gold-400/60">/yr</span>
                </p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  +{Math.round((inputs.subscriptionEscalationRate ?? 0.05) * 100)}% p.a. from yr {contractYears + 1}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Output Currency & Exchange Rates */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={isPortfolioMode ? 6 : 5}
          title="Report Output Currency"
          subtitle="All ROI projections, 5-year model, and executive summary will display in this currency"
        />
        <div className="grid grid-cols-2 gap-5">
          <InputField
            label="Output / Display Currency"
            tooltip="The currency used for all projected financial results. Inputs in other currencies are converted automatically using the exchange rates below."
          >
            <CurrencySelect value={outputCurrency} onChange={setOutputCurrency} />
          </InputField>
          <div className="flex items-end pb-1">
            {outputCurrency !== inputs.currency || outputCurrency !== (inputs.duettoCurrency || inputs.currency) ? (
              <p className="text-[#7459EE]/70 text-xs font-sans">
                Conversions active: {inputs.currency !== outputCurrency && `performance metrics (${inputs.currency} → ${outputCurrency})`}
                {inputs.currency !== outputCurrency && (inputs.duettoCurrency || inputs.currency) !== outputCurrency && " · "}
                {(inputs.duettoCurrency || inputs.currency) !== outputCurrency && `Duetto investment (${inputs.duettoCurrency || inputs.currency} → ${outputCurrency})`}
              </p>
            ) : (
              <p className="text-white/25 text-xs font-sans">
                All inputs are already in {outputCurrency} — no conversion needed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Exchange Rates — only shown when currencies differ */}
      <ExchangeRatesPanel />
    </div>
  );
}
