"use client";
import React, { useCallback } from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, TextInput, SelectInput, SliderInput, StarRating } from "@/components/ui/InputField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, CURRENCY_SYMBOLS, estimateDuettoCost, isOperaCloud, computeDuettoAnnualCost } from "@/lib/calculations";
import type { CoStarBenchmark, PortfolioProperty, PropertyInputs, PropertyType } from "@/lib/types";

function ProfileCompleteness({ inputs }: { inputs: PropertyInputs }) {
  const fields = [
    inputs.propertyName,
    inputs.totalRooms > 0,
    inputs.currentADR > 0,
    inputs.currentOccupancy > 0,
    inputs.location,
    inputs.annualRMSystemsCost > 0,
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

        <InputField label="Annual Pricing & RM Technology Costs" tooltip="Annual cost of rate shoppers, pricing tools, or outsourced RM consulting">
          <TextInput
            type="number"
            value={property.annualRMSystemsCost || ""}
            onChange={(e) => onUpdate({ annualRMSystemsCost: parseFloat(e.target.value) || 0 })}
            prefix={sym}
            placeholder="15000"
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
            min={30}
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

          <InputField label="Currency">
            <SelectInput
              value={inputs.currency}
              onChange={(e) => update("currency", e.target.value as PropertyInputs["currency"])}
            >
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
              <option value="MXN">MXN — Mexican Peso</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="JPY">JPY — Japanese Yen (¥)</option>
            </SelectInput>
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
                  min={30}
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
            <InputField
              label={`Annual Pricing & RM Technology Costs — ${sym}`}
              tooltip="Annual cost of existing RM tools & services (e.g. rate shoppers, pricing tools, outsourced RM consulting). If Duetto replaces these, this becomes direct cost savings."
            >
              <TextInput
                type="number"
                value={inputs.annualRMSystemsCost || ""}
                onChange={(e) => update("annualRMSystemsCost", parseFloat(e.target.value) || 0)}
                prefix={sym}
                placeholder="15000"
              />
            </InputField>
          )}
        </div>
      </div>

      {/* Section: Duetto Investment */}
      {(() => {
        const sectionNum = isPortfolioMode ? 5 : 4;
        const autoSubEstimate = estimateDuettoCost(inputs.totalRooms);
        const showOhip = isOperaCloud(inputs.pmsName || "");
        const effectiveSubscription = inputs.subscriptionCost > 0 ? inputs.subscriptionCost : autoSubEstimate;
        const effectiveOhip = showOhip ? (inputs.ohipConnectivityFee || 0) : 0;
        const annualRecurring = effectiveSubscription + effectiveOhip;
        const yearOneCost = annualRecurring + (inputs.implementationFee || 0);
        const contractYears = inputs.initialContractYears || 1;
        return (
          <div className="glass-card rounded-2xl p-6 border border-white/8">
            <SectionHeader
              number={sectionNum}
              title="Duetto Investment"
              subtitle="Cost breakdown used across all ROI projections and the 5-year model"
            />
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

              {/* Subscription cost */}
              <InputField
                label={`Annual Subscription Cost — ${sym}`}
                tooltip={`Recurring annual Duetto subscription fee. Leave 0 to auto-estimate (${formatCurrency(autoSubEstimate, inputs.currency)}/yr for ${inputs.totalRooms} rooms).`}
              >
                <TextInput
                  type="number"
                  value={inputs.subscriptionCost || ""}
                  onChange={(e) => update("subscriptionCost", parseFloat(e.target.value) || 0)}
                  prefix={sym}
                  placeholder={`${autoSubEstimate.toLocaleString()} (auto)`}
                />
              </InputField>

              {/* Implementation fee */}
              <InputField
                label={`Implementation Fee — ${sym}`}
                tooltip="One-time fee charged in Year 1 only. Does not recur in subsequent years."
              >
                <TextInput
                  type="number"
                  value={inputs.implementationFee || ""}
                  onChange={(e) => update("implementationFee", parseFloat(e.target.value) || 0)}
                  prefix={sym}
                  placeholder="0"
                />
              </InputField>

              {/* OHIP fee — only shown for Opera Cloud */}
              {showOhip && (
                <InputField
                  label={`OHIP Connectivity Fee — ${sym}/yr`}
                  tooltip="Annual Oracle Hospitality Integration Platform fee. Applies to Opera Cloud properties only. Recurring every year."
                >
                  <TextInput
                    type="number"
                    value={inputs.ohipConnectivityFee || ""}
                    onChange={(e) => update("ohipConnectivityFee", parseFloat(e.target.value) || 0)}
                    prefix={sym}
                    placeholder="0"
                  />
                </InputField>
              )}
            </div>

            {/* Cost summary */}
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Year 1 Total Cost</p>
                <p className="text-xl font-serif font-bold text-[#FF5900]">{formatCurrency(yearOneCost, inputs.currency)}</p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  Subscription{inputs.implementationFee > 0 ? " + impl. fee" : ""}{effectiveOhip > 0 ? " + OHIP" : ""}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Annual Recurring Cost</p>
                <p className="text-xl font-serif font-bold text-white">{formatCurrency(annualRecurring, inputs.currency)}</p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  Yrs 2–{contractYears}{effectiveOhip > 0 ? " (incl. OHIP)" : ""}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1.5">Post-Contract Rate</p>
                <p className="text-xl font-serif font-bold text-gold-400">
                  {formatCurrency(annualRecurring * 1.05, inputs.currency)}<span className="text-sm text-gold-400/60">/yr</span>
                </p>
                <p className="text-white/25 text-[10px] font-sans mt-1">
                  +5% p.a. from yr {contractYears + 1}
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
