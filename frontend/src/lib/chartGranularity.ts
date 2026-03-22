import { CHART_POINT_PROVENANCE_KEY, type ChartRow } from "./chartSeries";

export type ChartGranularity = "annual" | "quarterly" | "monthly" | "weekly";

export const CHART_GRANULARITIES: { id: ChartGranularity; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "annual", label: "Annual" },
];

function valueAtYear(rows: ChartRow[], key: string, y: number): number | null {
  const row = rows.find((r) => (r.year as number) === y);
  if (!row) return null;
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Linear interpolation between integer-year anchors (annual WDI rows). */
function linearBetween(rows: ChartRow[], key: string, t: number): number | null {
  const y0 = Math.floor(t + 1e-9);
  const frac = t - y0;
  const v0 = valueAtYear(rows, key, y0);
  const v1 = valueAtYear(rows, key, y0 + 1);
  if (v0 === null && v1 === null) return null;
  if (v0 === null) return v1;
  if (v1 === null) return v0;
  return v0 + (v1 - v0) * frac;
}

/**
 * Expands annual dashboard rows to finer “periods” for charting.
 * World Bank WDI is yearly only — sub-annual values are interpolated between years (display only).
 */
export function applyChartGranularity(
  annualRows: ChartRow[],
  valueKeys: readonly string[],
  granularity: ChartGranularity
): ChartRow[] {
  if (annualRows.length === 0) return [];

  if (granularity === "annual") {
    return annualRows.map((r) => ({
      ...r,
      periodKey: r.year as number,
      periodLabel: String(r.year),
    }));
  }

  const years = annualRows.map((r) => r.year as number).filter((y) => Number.isFinite(y));
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  const out: ChartRow[] = [];

  const pushRow = (periodKey: number, periodLabel: string, year: number) => {
    const row: ChartRow = { periodKey, periodLabel, year };
    for (const k of valueKeys) {
      row[k] = linearBetween(annualRows, k, periodKey);
    }
    const anchor = annualRows.find((r) => (r.year as number) === year);
    const p = anchor ? (anchor as Record<string, unknown>)[CHART_POINT_PROVENANCE_KEY] : undefined;
    if (p && typeof p === "object") (row as Record<string, unknown>)[CHART_POINT_PROVENANCE_KEY] = p;
    out.push(row);
  };

  if (granularity === "quarterly") {
    for (let y = lo; y <= hi; y++) {
      for (let q = 1; q <= 4; q++) {
        const periodKey = y + (2 * q - 1) / 8;
        pushRow(periodKey, `${y} Q${q}`, y);
      }
    }
    return out;
  }

  if (granularity === "monthly") {
    for (let y = lo; y <= hi; y++) {
      for (let m = 1; m <= 12; m++) {
        const periodKey = y + (m - 0.5) / 12;
        const periodLabel = `${y}-${String(m).padStart(2, "0")}`;
        pushRow(periodKey, periodLabel, y);
      }
    }
    return out;
  }

  /* weekly */
  for (let y = lo; y <= hi; y++) {
    for (let w = 1; w <= 52; w++) {
      const periodKey = y + (w - 0.5) / 52;
      pushRow(periodKey, `${y} W${String(w).padStart(2, "0")}`, y);
    }
  }
  return out;
}

/** X-axis tick positions (integer years) for sub-annual numeric axis. */
export function yearAxisTicksFromAnnualRows(annualRows: ChartRow[]): number[] {
  const years = annualRows.map((r) => r.year as number).filter((y) => Number.isFinite(y));
  if (years.length === 0) return [];
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  const span = hi - lo;
  const step = span > 24 ? 5 : span > 14 ? 3 : span > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = lo; y <= hi; y += step) ticks.push(y);
  if (ticks[ticks.length - 1] !== hi) ticks.push(hi);
  return ticks;
}

export const GRANULARITY_DISCLAIMER =
  "Weekly, monthly, and quarterly views interpolate linearly between annual World Bank values (illustrative only).";
