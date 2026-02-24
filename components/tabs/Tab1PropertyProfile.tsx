"use client";
import React, { useCallback } from "react";
import { useCalculatorStore } from "@/store/calculatorStore";
import { InputField, TextInput, SelectInput, SliderInput, StarRating } from "@/components/ui/InputField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatCurrency, CURRENCY_SYMBOLS, estimateDuettoCost } from "@/lib/calculations";
import type { PropertyInputs } from "@/lib/types";

function ProfileCompleteness({ inputs }: { inputs: PropertyInputs }) {
  const fields = [
    inputs.propertyName,
    inputs.totalRooms > 0,
    inputs.currentADR > 0,
    inputs.currentOccupancy > 0,
    inputs.location,
    inputs.annualRMLaborCost > 0,
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

export function Tab1PropertyProfile() {
  const { inputs, updateInputs, loadSampleData } = useCalculatorStore();
  const sym = CURRENCY_SYMBOLS[inputs.currency] || "$";

  const currentRevPAR = inputs.currentADR * inputs.currentOccupancy;
  const annualRevenue = currentRevPAR * inputs.totalRooms * 365;
  const estimatedCost = inputs.duettoAnnualCost || estimateDuettoCost(inputs.totalRooms);

  const update = useCallback(
    (key: keyof PropertyInputs, value: PropertyInputs[keyof PropertyInputs]) => {
      updateInputs({ [key]: value } as Partial<PropertyInputs>);
    },
    [updateInputs]
  );

  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-white">Property Profile</h2>
          <p className="text-white/40 text-sm font-sans mt-1">
            Enter your property data to generate a personalized ROI analysis
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
          label="Current RevPAR"
          value={formatCurrency(currentRevPAR, inputs.currency)}
          subtitle="ADR × Occupancy"
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Annual Room Revenue"
          value={formatCurrency(annualRevenue, inputs.currency, true)}
          subtitle="RevPAR × Rooms × 365"
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Total Rooms"
          value={inputs.totalRooms.toLocaleString()}
          subtitle="Property inventory"
          variant="default"
          size="sm"
        />
        <MetricCard
          label="Est. Duetto Investment"
          value={formatCurrency(estimatedCost, inputs.currency)}
          subtitle="Annual subscription est."
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
          <InputField label="Property Name" required tooltip="This will appear in PDF exports and reports">
            <TextInput
              value={inputs.propertyName}
              onChange={(e) => update("propertyName", e.target.value)}
              placeholder="e.g. The Grand Metropolitan Hotel"
            />
          </InputField>

          <InputField label="Property Type">
            <SelectInput
              value={inputs.propertyType}
              onChange={(e) => update("propertyType", e.target.value as PropertyInputs["propertyType"])}
            >
              <option value="full-service">Full-Service Hotel</option>
              <option value="select-service">Select-Service</option>
              <option value="resort">Resort</option>
              <option value="casino">Casino Resort</option>
              <option value="extended-stay">Extended Stay</option>
              <option value="boutique">Boutique/Lifestyle</option>
              <option value="all-inclusive">All-Inclusive</option>
            </SelectInput>
          </InputField>

          <InputField label="Location / Market" tooltip="City, state, or region for market context">
            <TextInput
              value={inputs.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. New York, NY"
            />
          </InputField>

          <InputField label="Market Tier">
            <SelectInput
              value={inputs.marketTier}
              onChange={(e) => update("marketTier", e.target.value as PropertyInputs["marketTier"])}
            >
              <option value="primary">Primary/Gateway</option>
              <option value="secondary">Secondary</option>
              <option value="tertiary">Tertiary/Resort</option>
            </SelectInput>
          </InputField>

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

      {/* Section 2: Current Performance */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={2}
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
              label="OTA Booking Mix"
              tooltip="Percentage of bookings coming through OTA channels (Expedia, Booking.com, etc.)"
            >
              <div className="space-y-1">
                <SliderInput
                  value={Math.round(inputs.otaPercent * 100)}
                  min={0}
                  max={95}
                  onChange={(v) => {
                    update("otaPercent", v / 100);
                    update("directBookingPercent", (100 - v) / 100);
                  }}
                  formatValue={(v) => `OTA ${v}% / Direct ${100 - v}%`}
                />
              </div>
            </InputField>
          </div>
        </div>
      </div>

      {/* Section 3: Operational Context */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={3}
          title="Operational Context"
          subtitle="Current revenue management approach and staffing"
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
            tooltip="Total FTEs dedicated to revenue management"
          >
            <TextInput
              type="number"
              value={inputs.rmStaffCount || ""}
              onChange={(e) => update("rmStaffCount", parseInt(e.target.value) || 0)}
              min="0"
              max="20"
              placeholder="2"
            />
          </InputField>

          <div>
            <InputField
              label="Hours/Week on Manual Pricing Tasks"
              tooltip="Estimate of staff hours spent on rate setting, reporting, and spreadsheet management"
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
        </div>
      </div>

      {/* Section 4: Cost Context */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <SectionHeader
          number={4}
          title="Cost Context"
          subtitle="Optional — enables deeper cost savings analysis"
        />
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <InputField
              label="OTA Commission Rate"
              tooltip="Your average OTA commission rate. Industry average is 17-22%."
            >
              <SliderInput
                value={Math.round(inputs.otaCommissionRate * 100)}
                min={10}
                max={30}
                onChange={(v) => update("otaCommissionRate", v / 100)}
                formatValue={(v) => `${v}%`}
              />
            </InputField>
          </div>

          <InputField
            label={`Cost Per Occupied Room (CPOR) — ${sym}`}
            tooltip="Variable cost per occupied room night including housekeeping, amenities, etc."
          >
            <TextInput
              type="number"
              value={inputs.cpor || ""}
              onChange={(e) => update("cpor", parseFloat(e.target.value) || 0)}
              prefix={sym}
              placeholder="45"
            />
          </InputField>

          <InputField
            label={`Annual RM Labor Cost — ${sym}`}
            tooltip="Total fully-loaded annual cost of revenue management staff"
          >
            <TextInput
              type="number"
              value={inputs.annualRMLaborCost || ""}
              onChange={(e) => update("annualRMLaborCost", parseFloat(e.target.value) || 0)}
              prefix={sym}
              placeholder="100,000"
            />
          </InputField>

          <InputField
            label={`Duetto Annual Investment — ${sym}`}
            tooltip="Leave blank to auto-estimate based on property size. Duetto pricing varies by property size and modules."
          >
            <TextInput
              type="number"
              value={inputs.duettoAnnualCost || ""}
              onChange={(e) => update("duettoAnnualCost", parseFloat(e.target.value) || 0)}
              prefix={sym}
              placeholder={`Auto: ${formatCurrency(estimatedCost, inputs.currency)}`}
            />
          </InputField>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-emerald-brand/5 border border-emerald-brand/20">
          <p className="text-emerald-brand text-xs font-sans">
            <strong>Auto-estimate:</strong> Based on {inputs.totalRooms} rooms, Duetto investment estimated at{" "}
            <strong>{formatCurrency(estimatedCost, inputs.currency)}/year</strong>. Actual pricing subject to Duetto proposal.
          </p>
        </div>
      </div>
    </div>
  );
}
