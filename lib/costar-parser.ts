/**
 * Client-side CoStar Hospitality Market Report parser.
 * Uses pdfjs-dist to extract text from uploaded PDFs, then applies
 * regex patterns tuned to CoStar's report format.
 */

import type { CoStarBenchmark, CoStarClassMetrics, CoStarHistoricalRow, CoStarSubmarket } from "./types";

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }
  return pageTexts.join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function parsePercent(s: string): number {
  return parseNum(s) / 100;
}

// ─── Extraction patterns ──────────────────────────────────────────────────────

function extractMarketName(text: string): string {
  // "New York - NY USA PREPARED BY ..." → "New York"
  const m = text.match(/^([^\n-]+?)\s*-\s*[A-Z]{2}\s+USA/m);
  if (m) return m[1].trim();
  // Fallback: look for "Overview <Name> Hospitality"
  const m2 = text.match(/Overview\s+(.+?)\s+Hospitality/);
  return m2 ? m2[1].trim() : "Unknown Market";
}

function extractReportDate(text: string): string {
  const m = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*[©\u00a9]\s*\d{4}\s*CoStar/);
  return m ? m[1] : "";
}

function extractOverall(text: string): CoStarClassMetrics | null {
  // "12 Mo Occupancy 84.1% 12 Mo ADR $331 12 Mo RevPAR $279"
  const m = text.match(
    /12\s+Mo\s+Occupancy\s+([\d.]+)%\s+12\s+Mo\s+ADR\s+\$([\d,]+)\s+12\s+Mo\s+RevPAR\s+\$([\d,]+)/
  );
  if (!m) return null;
  const occ = parsePercent(m[1]);
  const adr = parseNum(m[2]);
  return { rooms: 0, occupancy: occ, adr, revpar: adr * occ };
}

function extractClassMetrics(
  text: string,
  classLabel: string
): CoStarClassMetrics | null {
  // Pattern: "<Class Label>  59,753  82.1%  $429  $352  537  2,119"
  // Fields after label: Rooms, 12MoOcc%, 12MoADR, 12MoRevPAR, Delivered, UnderConst
  const escaped = classLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(
    escaped + "\\s+([\\d,]+)\\s+([\\d.]+)%\\s+\\$([\\d,]+)\\s+\\$([\\d,]+)"
  );
  const m = text.match(re);
  if (!m) return null;
  return {
    rooms: parseNum(m[1]),
    occupancy: parsePercent(m[2]),
    adr: parseNum(m[3]),
    revpar: parseNum(m[4]),
  };
}

function extractHistorical(text: string): CoStarHistoricalRow[] {
  // Looks for the OVERALL PERFORMANCE table section.
  // Each row: "(year|YTD)  84.1%  -0.2%  $333.71  4.7%  $280.71  4.5%"
  // Forecast rows (2026+) appear before the current year in the CoStar layout.
  const rows: CoStarHistoricalRow[] = [];
  const seen = new Set<number>();

  // Identify the year range — find all years 20xx near the pattern
  const overallIdx = text.indexOf("OVERALL PERFORMANCE");
  const luxuryIdx = text.indexOf("LUXURY & UPPER UPSCALE PERFORMANCE");
  const slice = overallIdx >= 0
    ? text.slice(overallIdx, luxuryIdx > overallIdx ? luxuryIdx : overallIdx + 4000)
    : text;

  const re =
    /\b(20\d{2})\s+([\d.]+)%\s+[-\d.]+%\s+\$([\d.,]+)\s+[-\d.]+%\s+\$([\d.,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice)) !== null) {
    const year = parseInt(match[1]);
    if (seen.has(year)) continue;
    seen.add(year);
    rows.push({
      year,
      occupancy: parsePercent(match[2]),
      adr: parseNum(match[3]),
      revpar: parseNum(match[4]),
      isForecast: year > new Date().getFullYear(),
    });
  }

  return rows.sort((a, b) => a.year - b.year);
}

function extractSubmarkets(text: string): CoStarSubmarket[] {
  // Looks for the SUBMARKET PERFORMANCE table.
  // Each row: "#  Name  rank  80.4%  -2.7%  rank  $256.60  -1.6%  rank  $206.38  -4.3%"
  const results: CoStarSubmarket[] = [];
  const startIdx = text.indexOf("SUBMARKET PERFORMANCE");
  if (startIdx < 0) return results;

  const slice = text.slice(startIdx, startIdx + 3000);

  // Pattern: digit space name (truncated with …) ... occ% ... adr ... revpar
  // The name is followed by rank numbers, so we match: name then rank(num) occ% ...
  const re =
    /\d+\s+([\w/\s().-]+?(?:…)?)\s+\d+\s+([\d.]+)%\s+[-\d.]+%\s+\d+\s+\$([\d.,]+)\s+[-\d.]+%\s+\d+\s+\$([\d.,]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice)) !== null) {
    const name = match[1].trim().replace(/…$/, "").trim();
    if (!name || name.length < 3) continue;
    // Skip header artifacts that contain performance metric keywords
    if (/Occupancy|RevPAR|\bADR\b|Growth|Rank/i.test(name)) continue;
    results.push({
      name,
      occupancy: parsePercent(match[2]),
      adr: parseNum(match[3]),
      revpar: parseNum(match[4]),
    });
  }
  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ParseResult {
  benchmark: CoStarBenchmark;
  warnings: string[];
}

export async function parseCoStarPDF(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  const text = await extractPDFText(file);

  const marketName = extractMarketName(text);
  const reportDate = extractReportDate(text);

  const overall = extractOverall(text);
  if (!overall) warnings.push("Could not extract overall 12-month metrics.");

  const lux = extractClassMetrics(text, "Luxury & Upper Upscale");
  if (!lux) warnings.push("Could not extract Luxury & Upper Upscale metrics.");

  const ups = extractClassMetrics(text, "Upscale & Upper Midscale");
  if (!ups) warnings.push("Could not extract Upscale & Upper Midscale metrics.");

  const mid = extractClassMetrics(text, "Midscale & Economy");
  if (!mid) warnings.push("Could not extract Midscale & Economy metrics.");

  const historical = extractHistorical(text);
  const submarkets = extractSubmarkets(text);

  const benchmark: CoStarBenchmark = {
    id: `costar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    marketName,
    reportDate,
    overall: overall ?? { rooms: 0, occupancy: 0, adr: 0, revpar: 0 },
    byClass: {
      "luxury-upper-upscale": lux ?? { rooms: 0, occupancy: 0, adr: 0, revpar: 0 },
      "upscale-upper-midscale": ups ?? { rooms: 0, occupancy: 0, adr: 0, revpar: 0 },
      "midscale-economy": mid ?? { rooms: 0, occupancy: 0, adr: 0, revpar: 0 },
    },
    submarkets,
    historical,
  };

  return { benchmark, warnings };
}
