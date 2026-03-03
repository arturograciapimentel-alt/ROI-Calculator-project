"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useCalculatorStore } from "@/store/calculatorStore";
import { formatCurrency, PROPERTY_TYPE_LABELS, aggregatePortfolioInputs } from "@/lib/calculations";
import type { CoStarBenchmark, CoStarClassMetrics, DuettoMarketHotel } from "@/lib/types";
import { clsx } from "clsx";

// ─── Static fallback benchmarks ───────────────────────────────────────────────
const BENCHMARKS: Record<string, { adr: [number, number]; occ: [number, number] }> = {
  "luxury-upper-upscale":   { adr: [250, 480], occ: [0.75, 0.87] },
  "upscale-upper-midscale": { adr: [140, 270], occ: [0.72, 0.87] },
  "midscale-economy":       { adr: [80,  170], occ: [0.65, 0.80] },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RunningCounter({ target, currency }: { target: number; currency: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const timer = setInterval(() => {
      setValue((v) => {
        const next = v + Math.max(target * 0.02, 50);
        if (next >= target) { clearInterval(timer); return target; }
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

// ─── CoStar class breakdown card ──────────────────────────────────────────────

function CoStarClassCard({
  label, metrics, currency, highlighted,
}: {
  label: string;
  metrics: CoStarClassMetrics;
  currency: string;
  highlighted: boolean;
}) {
  return (
    <div className={clsx(
      "p-4 rounded-xl border transition-all",
      highlighted ? "border-gold-500/30 bg-gold-500/8" : "border-white/10 bg-navy-800/40"
    )}>
      <p className={clsx("text-[10px] font-sans uppercase tracking-wider mb-2 font-semibold", highlighted ? "text-gold-400" : "text-white/40")}>
        {label}
        {highlighted && <span className="ml-1.5 normal-case text-[9px] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded-full">Your segment</span>}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Occupancy", value: `${Math.round(metrics.occupancy * 100)}%` },
          { label: "ADR", value: formatCurrency(metrics.adr, currency) },
          { label: "RevPAR", value: formatCurrency(metrics.revpar, currency) },
        ].map(({ label: l, value }) => (
          <div key={l} className="text-center">
            <p className="text-white font-serif font-bold text-base">{value}</p>
            <p className="text-white/30 text-[10px] font-sans">{l}</p>
          </div>
        ))}
      </div>
      {metrics.rooms > 0 && (
        <p className="text-white/20 text-[10px] font-sans text-right mt-2">
          {metrics.rooms.toLocaleString()} rooms
        </p>
      )}
    </div>
  );
}

// ─── Historical trend mini-charts ─────────────────────────────────────────────

function HistoricalCharts({ benchmark, currency }: { benchmark: CoStarBenchmark; currency: string }) {
  const data = benchmark.historical
    .filter((r) => !r.isForecast || r.year <= new Date().getFullYear() + 2)
    .map((r) => ({
      year: r.year,
      ADR: r.adr,
      Occupancy: Math.round(r.occupancy * 100),
      RevPAR: r.revpar,
      isForecast: r.isForecast,
    }));
  if (data.length === 0) return null;
  const tooltipStyle = { background: "#0E2124", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 };
  return (
    <div className="mt-5 pt-5 border-t border-white/8">
      <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-4">
        {benchmark.marketName} — Historical &amp; Forecast Performance
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-white/30 text-[10px] font-sans mb-2">RevPAR ($/room)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`$${v.toFixed(0)}`, "RevPAR"]}
                labelFormatter={(l) => {
                  const r = data.find((d) => d.year === l);
                  return `${l}${r?.isForecast ? " (Forecast)" : ""}`;
                }}
              />
              <Line type="monotone" dataKey="RevPAR" stroke="#C4FF45" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-white/30 text-[10px] font-sans mb-2">Occupancy (%)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Occupancy"]} />
              <Line type="monotone" dataKey="Occupancy" stroke="#68FFF2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-white/15 text-[10px] font-sans mt-3 text-right">
        Source: CoStar Group · Dashed lines indicate forecast
      </p>
    </div>
  );
}

// ─── Single-market upload zone (empty state or loading) ───────────────────────

function UploadZone({
  onUpload, isLoading, error,
}: {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }, [onUpload]);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") onUpload(file);
  }, [onUpload]);

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={clsx(
          "border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer",
          isLoading ? "border-gold-500/30 bg-gold-500/5" : "border-white/15 hover:border-gold-500/30 hover:bg-white/3"
        )}
        onClick={() => !isLoading && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleChange} />
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gold-400 text-xs font-sans">Parsing CoStar report…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-5 h-5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-white/40 text-xs font-sans">
              Drop a CoStar Hospitality Market Report PDF, or{" "}
              <span className="text-gold-400 underline underline-offset-2">browse</span>
            </p>
            <p className="text-white/20 text-[10px] font-sans">Extracts Occ, ADR &amp; RevPAR by class · Replaces static benchmarks</p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-[#FF5900] text-xs font-sans">{error}</p>}
    </div>
  );
}

// ─── Uploaded market row (in the market list) ────────────────────────────────

function MarketRow({
  benchmark,
  propertyCount,
  onRemove,
  warnings,
}: {
  benchmark: CoStarBenchmark;
  propertyCount: number;
  onRemove: () => void;
  warnings: string[];
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-brand/8 border border-emerald-brand/20">
      <div className="p-1.5 rounded-lg bg-emerald-brand/20 text-emerald-brand flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-emerald-brand text-xs font-sans font-semibold truncate">{benchmark.marketName}</p>
        <p className="text-white/40 text-[10px] font-sans">
          {benchmark.reportDate || "CoStar Report"}
          {propertyCount > 0 && (
            <span className="ml-2 text-white/50">· {propertyCount} {propertyCount === 1 ? "property" : "properties"} assigned</span>
          )}
          {warnings.length > 0 && (
            <span className="ml-2 text-amber-400">{warnings.length} field{warnings.length > 1 ? "s" : ""} not parsed</span>
          )}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="text-white/25 hover:text-[#FF5900] transition-colors p-1 rounded flex-shrink-0"
        aria-label="Remove market"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Per-market benchmark card (detail view) ─────────────────────────────────

function MarketDetailCard({
  benchmark,
  currency,
  assignedProperties,
  highlightedClass,
  showHistorical,
  benchmarkId,
}: {
  benchmark: CoStarBenchmark;
  currency: string;
  assignedProperties: { id: string; propertyName: string; propertyType: string; currentADR: number; currentOccupancy: number }[];
  highlightedClass: keyof CoStarBenchmark["byClass"] | null;
  showHistorical: boolean;
  benchmarkId: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800/30 p-5 space-y-4">
      {/* Market header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-sans font-semibold text-sm">{benchmark.marketName}</p>
          {benchmark.reportDate && (
            <p className="text-white/30 text-[10px] font-sans">{benchmark.reportDate}</p>
          )}
        </div>
        {assignedProperties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {assignedProperties.map((p) => (
              <span key={p.id} className="text-[9px] font-sans bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {p.propertyName || "Unnamed"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Class breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {(["luxury-upper-upscale", "upscale-upper-midscale", "midscale-economy"] as const).map((key) => (
          <CoStarClassCard
            key={key}
            label={PROPERTY_TYPE_LABELS[key]}
            metrics={benchmark.byClass[key]}
            currency={currency}
            highlighted={key === highlightedClass}
          />
        ))}
      </div>

      {/* Per-property vs benchmark comparison (when properties are assigned) */}
      {assignedProperties.length > 0 && (
        <div className="pt-3 border-t border-white/8">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-2">Property vs. Market</p>
          <div className="space-y-2">
            {assignedProperties.map((p) => {
              const benchClass = benchmark.byClass[p.propertyType as keyof CoStarBenchmark["byClass"]];
              const revpar = p.currentADR * p.currentOccupancy;
              const benchRevpar = benchClass?.revpar || 0;
              const delta = benchRevpar > 0 ? ((revpar - benchRevpar) / benchRevpar) * 100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-3 text-xs font-sans">
                  <span className="text-white/50 w-28 truncate flex-shrink-0">{p.propertyName || "Unnamed"}</span>
                  <span className="text-white/70">{formatCurrency(revpar, currency)} RevPAR</span>
                  <span className="text-white/20">vs.</span>
                  <span className="text-white/40">{formatCurrency(benchRevpar, currency)} market</span>
                  <span className={clsx("font-semibold ml-auto", delta >= 0 ? "text-emerald-brand" : "text-[#FF5900]")}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submarket table */}
      {benchmark.submarkets.length > 0 && (
        <div className="pt-3 border-t border-white/8">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-2">Submarket Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="text-white/25 text-[10px] uppercase tracking-wider">
                  <th className="text-left py-1 pr-3">Submarket</th>
                  <th className="text-right py-1 px-2">Occ</th>
                  <th className="text-right py-1 px-2">ADR</th>
                  <th className="text-right py-1 pl-2">RevPAR</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.submarkets.map((sm) => (
                  <tr key={sm.name} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-1.5 pr-3 text-white/50 truncate max-w-[140px]">{sm.name}</td>
                    <td className="text-right py-1.5 px-2 text-white/70">{Math.round(sm.occupancy * 100)}%</td>
                    <td className="text-right py-1.5 px-2 text-white/70">{formatCurrency(sm.adr, currency)}</td>
                    <td className="text-right py-1.5 pl-2 font-semibold text-white">{formatCurrency(sm.revpar, currency)}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/15">
                  <td className="py-1.5 pr-3 text-gold-400 font-semibold">Market Total</td>
                  <td className="text-right py-1.5 px-2 text-gold-400 font-semibold">{Math.round(benchmark.overall.occupancy * 100)}%</td>
                  <td className="text-right py-1.5 px-2 text-gold-400 font-semibold">{formatCurrency(benchmark.overall.adr, currency)}</td>
                  <td className="text-right py-1.5 pl-2 text-gold-400 font-semibold">{formatCurrency(benchmark.overall.revpar, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical charts */}
      {showHistorical && <HistoricalCharts benchmark={benchmark} currency={currency} />}

      {/* Duetto client hotels — one section per market */}
      <DuettoClientHotelsSection
        benchmarkId={benchmarkId}
        marketName={benchmark.marketName}
        currency={currency}
      />
    </div>
  );
}

// ─── Duetto Client Hotels in Market ──────────────────────────────────────────

function pctChange(current: number, prior: number): number | null {
  if (!prior) return null;
  return ((current - prior) / prior) * 100;
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-white/20 text-xs font-sans">—</span>;
  return (
    <span className={clsx("text-xs font-sans font-semibold", value >= 0 ? "text-emerald-brand" : "text-[#FF5900]")}>
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

// Extracted to module level so React never unmounts it on parent re-render
function HotelNumInput({
  storeValue,
  field,
  isInteger,
  onUpdate,
}: {
  storeValue: number;
  field: keyof Omit<DuettoMarketHotel, "id" | "name">;
  isInteger: boolean;
  onUpdate: (updates: Partial<Omit<DuettoMarketHotel, "id">>) => void;
}) {
  const [local, setLocal] = React.useState(storeValue === 0 ? "" : String(storeValue));
  // Sync when the store value changes from an external source (not user typing)
  const prevStore = React.useRef(storeValue);
  if (prevStore.current !== storeValue && document.activeElement?.getAttribute("data-field") !== field) {
    prevStore.current = storeValue;
    setLocal(storeValue === 0 ? "" : String(storeValue));
  }
  return (
    <input
      type="number"
      min={0}
      step={isInteger ? 1 : 0.01}
      value={local}
      data-field={field}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        const parsed = parseFloat(e.target.value) || 0;
        prevStore.current = parsed;
        onUpdate({ [field]: parsed });
      }}
      className="w-full bg-navy-900/60 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-sans text-right focus:border-gold-500/50 focus:outline-none focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-white/20"
      placeholder="0"
    />
  );
}

function HotelInputCard({
  hotel,
  index,
  currency,
  onUpdate,
}: {
  hotel: DuettoMarketHotel;
  index: number;
  currency: string;
  onUpdate: (updates: Partial<Omit<DuettoMarketHotel, "id">>) => void;
}) {
  const currSymbol = (
    { USD: "$", EUR: "€", GBP: "£", MXN: "$", CAD: "$", AUD: "$", JPY: "¥" } as Record<string, string>
  )[currency] ?? "$";

  const rnPct   = pctChange(hotel.currentRoomNights,   hotel.priorRoomNights);
  const adrPct  = pctChange(hotel.currentADR,          hotel.priorADR);
  const rvrPct  = pctChange(hotel.currentRevPAR,       hotel.priorRevPAR);
  const revPct  = pctChange(hotel.currentRoomRevenue,  hotel.priorRoomRevenue);

  return (
    <div className="p-4 rounded-xl border border-white/8 bg-navy-900/40 mb-3 last:mb-0">
      {/* Hotel label row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white/30 text-[10px] font-sans uppercase tracking-wider font-semibold flex-shrink-0">
          Hotel {index + 1}
        </span>
        <input
          type="text"
          value={hotel.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Optional label"
          className="flex-1 bg-transparent border-b border-white/10 text-white/60 text-xs font-sans px-1 py-0.5 focus:border-gold-500/30 focus:outline-none placeholder:text-white/15 transition-colors min-w-0"
        />
      </div>

      {/* Metrics table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs font-sans min-w-[480px]">
          <thead>
            <tr className="text-white/25 text-[10px] uppercase tracking-wider">
              <th className="text-left py-1.5 pr-3 w-16" />
              <th className="text-right py-1.5 px-2">Room Nights</th>
              <th className="text-right py-1.5 px-2">ADR ({currSymbol})</th>
              <th className="text-right py-1.5 px-2">RevPAR ({currSymbol})</th>
              <th className="text-right py-1.5 pl-2">Room Revenue ({currSymbol})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/5">
              <td className="py-1.5 pr-3 text-white/35 text-[10px] uppercase tracking-wider whitespace-nowrap">Current</td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.currentRoomNights}  field="currentRoomNights"  isInteger onUpdate={onUpdate} /></td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.currentADR}         field="currentADR"         isInteger={false} onUpdate={onUpdate} /></td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.currentRevPAR}      field="currentRevPAR"      isInteger={false} onUpdate={onUpdate} /></td>
              <td className="py-1.5 pl-2"><HotelNumInput storeValue={hotel.currentRoomRevenue} field="currentRoomRevenue"  isInteger onUpdate={onUpdate} /></td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1.5 pr-3 text-white/35 text-[10px] uppercase tracking-wider whitespace-nowrap">Prior</td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.priorRoomNights}    field="priorRoomNights"    isInteger onUpdate={onUpdate} /></td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.priorADR}           field="priorADR"           isInteger={false} onUpdate={onUpdate} /></td>
              <td className="py-1.5 px-2"><HotelNumInput storeValue={hotel.priorRevPAR}        field="priorRevPAR"        isInteger={false} onUpdate={onUpdate} /></td>
              <td className="py-1.5 pl-2"><HotelNumInput storeValue={hotel.priorRoomRevenue}   field="priorRoomRevenue"   isInteger onUpdate={onUpdate} /></td>
            </tr>
            <tr className="border-t border-white/12">
              <td className="py-1.5 pr-3 text-white/25 text-[10px] uppercase tracking-wider whitespace-nowrap">YoY</td>
              <td className="py-1.5 px-2 text-right"><PctBadge value={rnPct} /></td>
              <td className="py-1.5 px-2 text-right"><PctBadge value={adrPct} /></td>
              <td className="py-1.5 px-2 text-right"><PctBadge value={rvrPct} /></td>
              <td className="py-1.5 pl-2 text-right"><PctBadge value={revPct} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AggregateCard({
  hotels,
  currency,
}: {
  hotels: DuettoMarketHotel[];
  currency: string;
}) {
  // Weighted aggregation
  const totalCurrentRN  = hotels.reduce((s, h) => s + h.currentRoomNights,  0);
  const totalPriorRN    = hotels.reduce((s, h) => s + h.priorRoomNights,    0);
  const totalCurrentRev = hotels.reduce((s, h) => s + h.currentRoomRevenue, 0);
  const totalPriorRev   = hotels.reduce((s, h) => s + h.priorRoomRevenue,   0);

  // Available room nights = Revenue / RevPAR (per hotel, then summed)
  const totalCurrentAvailRN = hotels.reduce(
    (s, h) => s + (h.currentRevPAR > 0 ? h.currentRoomRevenue / h.currentRevPAR : 0), 0
  );
  const totalPriorAvailRN = hotels.reduce(
    (s, h) => s + (h.priorRevPAR > 0 ? h.priorRoomRevenue / h.priorRevPAR : 0), 0
  );

  const currentADR    = totalCurrentRN    > 0 ? totalCurrentRev / totalCurrentRN    : 0;
  const priorADR      = totalPriorRN      > 0 ? totalPriorRev   / totalPriorRN      : 0;
  const currentRevPAR = totalCurrentAvailRN > 0 ? totalCurrentRev / totalCurrentAvailRN : 0;
  const priorRevPAR   = totalPriorAvailRN   > 0 ? totalPriorRev   / totalPriorAvailRN   : 0;

  const metrics = [
    {
      label: "Room Nights",
      current: totalCurrentRN.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      prior:   totalPriorRN.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      pct: pctChange(totalCurrentRN, totalPriorRN),
    },
    {
      label: "Wtd. ADR",
      current: formatCurrency(currentADR, currency),
      prior:   formatCurrency(priorADR, currency),
      pct: pctChange(currentADR, priorADR),
    },
    {
      label: "Wtd. RevPAR",
      current: formatCurrency(currentRevPAR, currency),
      prior:   formatCurrency(priorRevPAR, currency),
      pct: pctChange(currentRevPAR, priorRevPAR),
    },
    {
      label: "Room Revenue",
      current: formatCurrency(totalCurrentRev, currency, true),
      prior:   formatCurrency(totalPriorRev, currency, true),
      pct: pctChange(totalCurrentRev, totalPriorRev),
    },
  ];

  return (
    <div className="mt-3 p-4 rounded-xl border border-gold-500/20 bg-gold-500/5">
      <p className="text-gold-400 text-[10px] font-sans uppercase tracking-wider font-semibold mb-3">
        Market Portfolio — {hotels.length} Duetto Hotels Combined
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ label, current, prior, pct: p }) => (
          <div key={label} className="text-center p-3 rounded-lg bg-navy-800/40">
            <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-1.5">{label}</p>
            <div className="mb-1"><PctBadge value={p} /></div>
            <p className="text-white font-serif font-bold text-sm leading-tight">{current}</p>
            <p className="text-white/25 text-[10px] font-sans mt-0.5">vs. {prior}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DuettoClientHotelsSection({
  benchmarkId,
  marketName,
  currency,
}: {
  benchmarkId: string;
  marketName: string;
  currency: string;
}) {
  const { duettoMarketData, setDuettoHotelCount, updateDuettoHotel } = useCalculatorStore();
  const marketData = duettoMarketData.find((d) => d.costarBenchmarkId === benchmarkId);
  const hotels = marketData?.hotels ?? [];
  const hotelCount = hotels.length;

  const hasAnyData = hotels.some(
    (h) => h.currentRoomNights > 0 || h.priorRoomNights > 0 || h.currentADR > 0
  );

  return (
    <div className="mt-5 pt-5 border-t border-white/8">
      {/* Section header + counter */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <p className="text-white/50 text-xs font-sans font-semibold">
            Duetto Client Hotels in {marketName}
          </p>
          <p className="text-white/25 text-[10px] font-sans mt-0.5">
            12-month production data from same-market Duetto hotels
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white/30 text-[10px] font-sans">Hotels:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDuettoHotelCount(benchmarkId, Math.max(0, hotelCount - 1))}
              disabled={hotelCount === 0}
              className="w-6 h-6 rounded-md bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/12 transition-all font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Remove hotel"
            >
              −
            </button>
            <span className="w-6 text-center text-white font-sans font-semibold text-sm tabular-nums">
              {hotelCount}
            </span>
            <button
              onClick={() => setDuettoHotelCount(benchmarkId, Math.min(20, hotelCount + 1))}
              className="w-6 h-6 rounded-md bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/12 transition-all font-bold text-sm flex items-center justify-center"
              aria-label="Add hotel"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {hotelCount === 0 && (
        <p className="text-white/20 text-xs font-sans text-center py-3 italic">
          Use + to add Duetto client hotels from this market and benchmark real production growth
        </p>
      )}

      {/* Hotel input cards */}
      {hotels.map((hotel, idx) => (
        <HotelInputCard
          key={hotel.id}
          hotel={hotel}
          index={idx}
          currency={currency}
          onUpdate={(updates) => updateDuettoHotel(benchmarkId, hotel.id, updates)}
        />
      ))}

      {/* Aggregate summary — only when 2+ hotels have data */}
      {hotelCount >= 2 && hasAnyData && (
        <AggregateCard hotels={hotels} currency={currency} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Tab4Market() {
  const {
    inputs, projections, scenario, costarBenchmarks,
    addCostarBenchmark, removeCostarBenchmark, portfolioProperties,
  } = useCalculatorStore();

  const currency = inputs.currency;
  const proj = projections[scenario];
  const isPortfolioMode = inputs.numberOfProperties > 1 && portfolioProperties.length >= 2;
  const effectiveInputs = isPortfolioMode ? aggregatePortfolioInputs(inputs, portfolioProperties) : inputs;

  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Track parse warnings per benchmark id
  const [warningsMap, setWarningsMap] = useState<Record<string, string[]>>({});
  const [delayMonths, setDelayMonths] = useState(6);

  // ── Benchmark for single-property mode (first uploaded, or null) ──────────
  const primaryBenchmark = costarBenchmarks[0] ?? null;
  const costarClassKey = effectiveInputs.propertyType as keyof CoStarBenchmark["byClass"];

  // ── Benchmark values for the main comparison (single mode) ───────────────
  const currentRevPAR = effectiveInputs.currentADR * effectiveInputs.currentOccupancy;
  let benchmarkADR: number;
  let benchmarkOcc: number;
  let benchmarkRevPAR: number;
  let benchmarkSource: "costar" | "static" = "static";

  if (primaryBenchmark) {
    benchmarkSource = "costar";
    const cls = primaryBenchmark.byClass[costarClassKey];
    benchmarkADR = cls.adr;
    benchmarkOcc = cls.occupancy;
    benchmarkRevPAR = cls.revpar;
  } else {
    const bench = BENCHMARKS[effectiveInputs.propertyType] ?? BENCHMARKS["upscale-upper-midscale"];
    benchmarkADR = (bench.adr[0] + bench.adr[1]) / 2;
    benchmarkOcc = (bench.occ[0] + bench.occ[1]) / 2;
    benchmarkRevPAR = benchmarkADR * benchmarkOcc;
  }

  const adrVsBenchmark = benchmarkADR > 0 ? ((effectiveInputs.currentADR - benchmarkADR) / benchmarkADR) * 100 : 0;
  const occVsBenchmark = benchmarkOcc > 0 ? ((effectiveInputs.currentOccupancy - benchmarkOcc) / benchmarkOcc) * 100 : 0;
  const revParVsBenchmark = benchmarkRevPAR > 0 ? ((currentRevPAR - benchmarkRevPAR) / benchmarkRevPAR) * 100 : 0;

  const monthlyOpportunityCost = proj.totalAnnualImpact / 12;

  // ── Radar data ────────────────────────────────────────────────────────────
  const radarData = [
    { metric: "ADR", current: benchmarkADR > 0 ? Math.round((effectiveInputs.currentADR / benchmarkADR) * 50) : 50, market: 50 },
    { metric: "Occupancy", current: benchmarkOcc > 0 ? Math.round((effectiveInputs.currentOccupancy / benchmarkOcc) * 50) : 50, market: 50 },
    { metric: "RevPAR", current: benchmarkRevPAR > 0 ? Math.round((currentRevPAR / benchmarkRevPAR) * 50) : 50, market: 50 },
    { metric: "Yieldable Mix", current: Math.round(effectiveInputs.yieldablePercent * 100), market: 70 },
    { metric: "RM Maturity", current: effectiveInputs.rmApproach === "spreadsheets" ? 10 : effectiveInputs.rmApproach === "competitor-rms" ? 70 : 30, market: 50 },
  ];

  // ── PDF upload handler ────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const { parseCoStarPDF } = await import("@/lib/costar-parser");
      const { benchmark, warnings } = await parseCoStarPDF(file);

      if (!benchmark.overall.adr && !benchmark.byClass["luxury-upper-upscale"].adr) {
        setUploadError("Could not extract performance data from this PDF. Make sure it is a CoStar Hospitality Market Report.");
        return;
      }

      addCostarBenchmark(benchmark);
      setWarningsMap((prev) => ({ ...prev, [benchmark.id]: warnings }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [addCostarBenchmark]);

  // ── Property count per benchmark id ──────────────────────────────────────
  const propertiesPerBenchmark = (id: string) =>
    portfolioProperties.filter((p) => p.marketReportId === id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 tab-content-enter">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-white">Competitive &amp; Market Context</h2>
        <p className="text-white/40 text-sm font-sans mt-1">
          The "why now" — market positioning and cost of inaction
        </p>
      </div>

      {/* ── Benchmark comparison ─────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h3 className="text-white font-serif font-semibold">Market Benchmarks</h3>
            <p className="text-white/40 text-xs font-sans mt-0.5">
              {isPortfolioMode
                ? `${portfolioProperties.length} properties · upload one CoStar report per market`
                : `${PROPERTY_TYPE_LABELS[effectiveInputs.propertyType]} · ${effectiveInputs.totalRooms} rooms`}
            </p>
          </div>
          {costarBenchmarks.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-brand font-sans bg-emerald-brand/10 border border-emerald-brand/20 rounded-full px-2.5 py-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {costarBenchmarks.length} market{costarBenchmarks.length > 1 ? "s" : ""} loaded
            </div>
          )}
        </div>

        {/* ── Market report list ────────────────────────────────────────── */}
        <div className="space-y-2 mb-4">
          {costarBenchmarks.map((b) => (
            <MarketRow
              key={b.id}
              benchmark={b}
              propertyCount={propertiesPerBenchmark(b.id).length}
              onRemove={() => removeCostarBenchmark(b.id)}
              warnings={warningsMap[b.id] ?? []}
            />
          ))}

          {/* Unassigned properties note — portfolio mode only */}
          {isPortfolioMode && portfolioProperties.filter((p) => !p.marketReportId).length > 0 && costarBenchmarks.length > 0 && (
            <p className="text-amber-400/70 text-[10px] font-sans px-1">
              {portfolioProperties.filter((p) => !p.marketReportId).length} {portfolioProperties.filter((p) => !p.marketReportId).length === 1 ? "property has" : "properties have"} no market report assigned — assign one in Property Profile (Tab 1)
            </p>
          )}
        </div>

        {/* Upload zone */}
        <div className="mb-5">
          <p className="text-white/30 text-[10px] font-sans uppercase tracking-wider mb-2">
            {costarBenchmarks.length === 0
              ? "Import CoStar Report to replace static benchmarks"
              : isPortfolioMode
              ? "Add another market report"
              : "Replace market report"}
          </p>
          <UploadZone onUpload={handleUpload} isLoading={isLoading} error={uploadError} />
        </div>

        {/* ── Portfolio mode: per-market detail cards ───────────────────── */}
        {isPortfolioMode && costarBenchmarks.length > 0 ? (
          <div className="space-y-5">
            {costarBenchmarks.map((b) => {
              const assigned = propertiesPerBenchmark(b.id).map((p) => ({
                id: p.id,
                propertyName: p.propertyName,
                propertyType: p.propertyType,
                currentADR: p.currentADR,
                currentOccupancy: p.currentOccupancy,
              }));
              // Highlighted class = most common class among assigned properties, or first property's class
              const dominantClass = assigned[0]?.propertyType as keyof CoStarBenchmark["byClass"] | null ?? null;
              return (
                <MarketDetailCard
                  key={b.id}
                  benchmark={b}
                  currency={currency}
                  assignedProperties={assigned}
                  highlightedClass={dominantClass}
                  showHistorical={true}
                  benchmarkId={b.id}
                />
              );
            })}
          </div>
        ) : (
          <>
            {/* Single mode / no portfolio: original layout */}
            {primaryBenchmark && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {(["luxury-upper-upscale", "upscale-upper-midscale", "midscale-economy"] as const).map((key) => (
                  <CoStarClassCard
                    key={key}
                    label={PROPERTY_TYPE_LABELS[key]}
                    metrics={primaryBenchmark.byClass[key]}
                    currency={currency}
                    highlighted={key === costarClassKey}
                  />
                ))}
              </div>
            )}

            {/* 3-metric comparison */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {[
                { label: "ADR vs. Market", current: formatCurrency(effectiveInputs.currentADR, currency), bench: formatCurrency(benchmarkADR, currency), delta: adrVsBenchmark },
                { label: "Occupancy vs. Market", current: `${Math.round(effectiveInputs.currentOccupancy * 100)}%`, bench: `${Math.round(benchmarkOcc * 100)}%`, delta: occVsBenchmark },
                { label: "RevPAR vs. Market", current: formatCurrency(currentRevPAR, currency), bench: formatCurrency(benchmarkRevPAR, currency), delta: revParVsBenchmark },
              ].map(({ label, current, bench: b, delta }) => (
                <div key={label} className="p-4 rounded-xl bg-navy-800/60 border border-white/10 text-center">
                  <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">{label}</p>
                  <div className="flex items-center justify-center gap-6">
                    <div>
                      <p className="text-xl font-serif font-bold text-white">{current}</p>
                      <p className="text-white/30 text-xs font-sans">{isPortfolioMode ? "Portfolio Blended" : "Your Property"}</p>
                    </div>
                    <div className="text-white/20 text-xl">→</div>
                    <div>
                      <p className="text-xl font-serif font-bold text-white/50">{b}</p>
                      <p className="text-white/30 text-xs font-sans">{benchmarkSource === "costar" ? "CoStar Market" : "Market Avg"}</p>
                    </div>
                  </div>
                  <div className={clsx("mt-3 text-sm font-semibold font-sans", delta >= 0 ? "text-emerald-brand" : "text-[#FF5900]")}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs. market
                  </div>
                </div>
              ))}
            </div>

            {/* Radar + context */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">Performance Radar vs. Market</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                    <Radar name={isPortfolioMode ? "Portfolio" : "Your Property"} dataKey="current" stroke="#C4FF45" fill="#C4FF45" fillOpacity={0.2} />
                    <Radar name="Market Avg" dataKey="market" stroke="#68FFF2" fill="#68FFF2" fillOpacity={0.1} strokeDasharray="4 4" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className={clsx("p-4 rounded-xl border", revParVsBenchmark >= 0 ? "border-emerald-brand/20 bg-emerald-brand/5" : "border-[#FF5900]/20 bg-[#FF5900]/5")}>
                  <p className={clsx("text-xs font-sans font-semibold uppercase tracking-wider mb-1", revParVsBenchmark >= 0 ? "text-emerald-brand" : "text-[#FF5900]")}>
                    {revParVsBenchmark >= 0 ? "Market Outperformer" : "Below Market Average"}
                  </p>
                  <p className="text-white/60 text-xs font-sans leading-relaxed">
                    {revParVsBenchmark >= 0
                      ? `${isPortfolioMode ? "Portfolio" : "Your property"} is ${revParVsBenchmark.toFixed(1)}% above ${benchmarkSource === "costar" && primaryBenchmark ? `CoStar ${primaryBenchmark.marketName}` : "market average"} RevPAR.`
                      : `${isPortfolioMode ? "Portfolio" : "Your property"} is ${Math.abs(revParVsBenchmark).toFixed(1)}% below ${benchmarkSource === "costar" && primaryBenchmark ? `CoStar ${primaryBenchmark.marketName}` : "market average"} RevPAR. Duetto's demand intelligence and open pricing are designed to close this gap.`}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-white/10 bg-white/3">
                  <p className="text-white/50 text-xs font-sans font-semibold uppercase tracking-wider mb-1">Yieldable Inventory Opportunity</p>
                  <p className="text-white/40 text-xs font-sans leading-relaxed">
                    {Math.round(effectiveInputs.yieldablePercent * 100)}% of {isPortfolioMode ? "portfolio" : "your"} room nights are in yieldable segments.{" "}
                    {effectiveInputs.rmApproach === "spreadsheets" || effectiveInputs.rmApproach === "none"
                      ? "Properties with manual RM average 8-12% lower RevPAR on yieldable inventory."
                      : "Even with an existing system, Duetto's open pricing delivers measurable RevPAR lifts."}
                  </p>
                </div>
              </div>
            </div>

            {/* Historical charts for primary market */}
            {primaryBenchmark && primaryBenchmark.historical.length > 0 && (
              <HistoricalCharts benchmark={primaryBenchmark} currency={currency} />
            )}

            {/* Submarket table for primary market */}
            {primaryBenchmark && primaryBenchmark.submarkets.length > 0 && (
              <div className="mt-5 pt-5 border-t border-white/8">
                <p className="text-white/40 text-xs font-sans uppercase tracking-wider mb-3">
                  Submarket Breakdown — {primaryBenchmark.marketName}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans">
                    <thead>
                      <tr className="text-white/30 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-1.5 pr-4">Submarket</th>
                        <th className="text-right py-1.5 px-3">Occupancy</th>
                        <th className="text-right py-1.5 px-3">ADR</th>
                        <th className="text-right py-1.5 pl-3">RevPAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {primaryBenchmark.submarkets.map((sm) => (
                        <tr key={sm.name} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-2 pr-4 text-white/60">{sm.name}</td>
                          <td className="text-right py-2 px-3 text-white/80">{Math.round(sm.occupancy * 100)}%</td>
                          <td className="text-right py-2 px-3 text-white/80">{formatCurrency(sm.adr, currency)}</td>
                          <td className="text-right py-2 pl-3 font-semibold text-white">{formatCurrency(sm.revpar, currency)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-white/15">
                        <td className="py-2 pr-4 text-gold-400 font-semibold">Market Total</td>
                        <td className="text-right py-2 px-3 text-gold-400 font-semibold">{Math.round(primaryBenchmark.overall.occupancy * 100)}%</td>
                        <td className="text-right py-2 px-3 text-gold-400 font-semibold">{formatCurrency(primaryBenchmark.overall.adr, currency)}</td>
                        <td className="text-right py-2 pl-3 text-gold-400 font-semibold">{formatCurrency(primaryBenchmark.overall.revpar, currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Duetto client hotels — single-mode (tied to primary benchmark) */}
            {primaryBenchmark && (
              <DuettoClientHotelsSection
                benchmarkId={primaryBenchmark.id}
                marketName={primaryBenchmark.marketName}
                currency={currency}
              />
            )}
          </>
        )}
      </div>

      {/* ── Cost of Inaction ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 border border-[#FF5900]/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF5900]/5 to-transparent" />
        <div className="relative z-10">
          <h3 className="text-white font-serif font-semibold mb-1">Cost of Inaction Calculator</h3>
          <p className="text-white/40 text-xs font-sans mb-5">
            Every month without Duetto is measurable, unrealized revenue
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-5 rounded-xl bg-[#FF5900]/8 border border-[#FF5900]/20">
              <p className="text-[#FF5900] text-xs font-sans uppercase tracking-wider mb-2">Monthly Opportunity Cost</p>
              <p className="text-3xl font-serif font-bold text-[#FF5900]">
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
                        ? "bg-[#FF5900]/20 border border-[#FF5900]/40 text-[#FF5900]"
                        : "bg-white/5 border border-white/10 text-white/40 hover:text-white/70"
                    )}
                  >
                    {m} mo
                  </button>
                ))}
              </div>
              <div className="text-4xl font-serif font-bold text-[#FF5900]">
                {formatCurrency(monthlyOpportunityCost * delayMonths, currency, true)}
              </div>
              <p className="text-white/30 text-xs font-sans mt-1">
                in unrealized revenue over {delayMonths} months of inaction
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Technology adoption ──────────────────────────────────────────── */}
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

      {/* ── Why Duetto ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-white font-serif font-semibold mb-4">Why Duetto</h3>
        <div className="grid grid-cols-2 gap-4">
          <DuettoFeatureCard title="Open Pricing" description="Rate each room type, segment, and channel completely independently. Unlike BAR-based systems, you never have to ladder every segment off a single best available rate." badge="Core"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
          <DuettoFeatureCard title="GameChanger — Pricing Engine" description="AI-powered open pricing that reads demand signals across all channels and segments in real time, recommending optimal rates without human bottlenecks."
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
          <DuettoFeatureCard title="ScoreBoard — Forecasting & BI" description="Enterprise-grade demand forecasting and business intelligence. See the full picture: pace, pickup, segments, channels — all in one dashboard."
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
          <DuettoFeatureCard title="BlockBuster — Group Optimization" description="Evaluate group opportunities against transient displacement in seconds. Price groups profitably with full visibility into the true cost of every piece of group business."
            badge={effectiveInputs.groupBusinessPercent > 0.15 ? "Key for you" : undefined}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <DuettoFeatureCard title="Cloud-Native Architecture" description="No servers to maintain, no overnight batch runs, no legacy infrastructure. Real-time rate updates push to your PMS and booking engine automatically."
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>} />
          <DuettoFeatureCard title="Integration Ecosystem" description="Pre-built connectors for 150+ PMS, CMS, and channel manager systems. Plug into your existing tech stack without disruption."
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
        </div>
      </div>

      {/* ── Client success stories ───────────────────────────────────────── */}
      <div>
        <h3 className="text-white font-serif font-semibold mb-4">Client Success Stories</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { logo: "NH Hotel Group", rooms: "350+ properties", metric: "+8.2% RevPAR", quote: "Duetto's open pricing fundamentally changed how we think about rate strategy across our portfolio." },
            { logo: "Graduate Hotels", rooms: "35 boutique hotels", metric: "+11% ADR", quote: "The forecasting accuracy alone has reduced overstaffing costs significantly — the ROI was evident within 60 days." },
            { logo: "Warwick Hotels", rooms: "55 global properties", metric: "2.1 mo payback", quote: "We moved from spreadsheets to Duetto and never looked back. The time savings alone justified the investment." },
          ].map(({ logo, rooms, metric, quote }) => (
            <div key={logo} className="glass-card rounded-2xl p-5 border border-white/8 hover:border-gold-500/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-sans font-semibold text-sm">{logo}</p>
                  <p className="text-white/30 text-xs font-sans">{rooms}</p>
                </div>
                <p className="text-emerald-brand font-serif font-bold text-lg">{metric}</p>
              </div>
              <p className="text-white/40 text-xs font-sans leading-relaxed italic">"{quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
