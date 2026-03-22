import { getCache, setCache } from "./cache.js";
import { METRIC_BY_ID } from "./metrics.js";
import { MIN_DATA_YEAR, resolveGlobalWdiYear } from "./yearBounds.js";
import { fetchImfWeoSeries } from "./imfWeo.js";
import {
  canonicalWbIso3,
  isMissingMetricValue,
  parseWdiNumericValue,
  pickBetterObservation,
} from "./wdiParse.js";
import { fetchWithRetry } from "./httpClient.js";
import { fetchUisGlobalRowsForYear } from "./uisApi.js";

export interface GlobalRow {
  countryIso3: string;
  countryName: string;
  value: number | null;
}

function isMissingValue(v: number | null | undefined): boolean {
  return isMissingMetricValue(v);
}

/** Paginated fetch: one indicator, one calendar year, all economies returned by WDI. */
async function fetchGlobalIndicatorYearOnce(indicatorCode: string, year: number): Promise<GlobalRow[]> {
  const byIso = new Map<string, GlobalRow>();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(
      indicatorCode
    )}?date=${year}&format=json&per_page=${perPage}&page=${page}`;
    const res = await fetchWithRetry(url, undefined, { attempts: 5, baseDelayMs: 500 });
    if (!res.ok) throw new Error(`World Bank global HTTP ${res.status}`);
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw) || raw.length < 2) break;
    const chunk = raw[1];
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    for (const r of chunk) {
      if (!r || typeof r !== "object") continue;
      const rec = r as {
        countryiso3code?: string;
        country?: { value?: string };
        value?: unknown;
      };
      const rawIso = rec.countryiso3code;
      if (!rawIso || rawIso === "") continue;
      const iso = canonicalWbIso3(rawIso);
      if (!/^[A-Z]{3}$/.test(iso)) continue;
      const name = rec.country?.value ?? iso;
      const parsed = parseWdiNumericValue(rec.value);
      const prev = byIso.get(iso);
      if (!prev) {
        byIso.set(iso, { countryIso3: iso, countryName: name, value: parsed });
      } else {
        const nextVal = pickBetterObservation(prev.value, parsed);
        byIso.set(iso, {
          countryIso3: iso,
          countryName: name || prev.countryName,
          value: nextVal,
        });
      }
    }
    const meta = raw[0] as { pages?: number };
    if (typeof meta?.pages === "number" && page >= meta.pages) break;
    page += 1;
    if (page > 50) break;
  }
  return [...byIso.values()];
}

/**
 * Retries WDI “all economies” pages so a single HTTP blip does not blank the entire global table.
 */
async function fetchGlobalIndicatorYear(indicatorCode: string, year: number): Promise<GlobalRow[]> {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchGlobalIndicatorYearOnce(indicatorCode, year);
    } catch (e) {
      if (attempt >= maxAttempts) {
        console.error(
          `[WDI] global fetch failed for ${indicatorCode} ${year} after ${maxAttempts} attempts:`,
          e instanceof Error ? e.message : e
        );
        return [];
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  return [];
}

/**
 * Cached raw WDI “all economies” page for an indicator code (no metric merge / UIS / IMF pipeline).
 * Used by the global education table for enrollment-based proxies.
 */
export async function fetchWdiGlobalRowsForYear(indicatorCode: string, year: number): Promise<GlobalRow[]> {
  const cacheKey = `wdi:all:${indicatorCode}:${year}`;
  const cached = getCache<GlobalRow[]>(cacheKey);
  if (cached) return cached;
  const rows = await fetchGlobalIndicatorYear(indicatorCode, year);
  setCache(cacheKey, rows, 1000 * 60 * 60);
  return rows;
}

function mergeGlobalRows(primary: GlobalRow[], fallback: GlobalRow[]): GlobalRow[] {
  const byIso = new Map<string, GlobalRow>();
  for (const r of primary) {
    byIso.set(r.countryIso3, { ...r });
  }
  for (const r of fallback) {
    const cur = byIso.get(r.countryIso3);
    if (!cur) {
      byIso.set(r.countryIso3, { ...r });
      continue;
    }
    if (isMissingValue(cur.value) && !isMissingValue(r.value)) {
      byIso.set(r.countryIso3, { ...cur, value: r.value });
    }
  }
  return [...byIso.values()];
}

const IMF_ENRICH_CONCURRENCY = 16;

/** Fill null cells from IMF WEO DataMapper for the same calendar year (e.g. government debt % GDP). */
async function enrichGlobalRowsWithImf(
  rows: GlobalRow[],
  imfIndicator: string,
  year: number,
  scale = 1
): Promise<GlobalRow[]> {
  const need = rows.filter((r) => isMissingValue(r.value));
  if (need.length === 0) return rows;
  const updates = new Map<string, number>();
  for (let i = 0; i < need.length; i += IMF_ENRICH_CONCURRENCY) {
    const chunk = need.slice(i, i + IMF_ENRICH_CONCURRENCY);
    await Promise.all(
      chunk.map(async (r) => {
        const ser = await fetchImfWeoSeries(r.countryIso3, imfIndicator, year, year);
        const pt = ser.find((p) => p.year === year);
        if (pt && !isMissingValue(pt.value)) updates.set(r.countryIso3, pt.value! * scale);
      })
    );
  }
  if (updates.size === 0) return rows;
  return rows.map((row) => {
    const v = updates.get(row.countryIso3);
    if (v !== undefined && isMissingValue(row.value)) return { ...row, value: v };
    return row;
  });
}

/** Same rule as country series: fill missing WDI debt (US$) from nominal GDP × debt % GDP. */
async function enrichGlobalGovDebtUsd(rows: GlobalRow[], year: number): Promise<GlobalRow[]> {
  const [gdpRows, pctRows] = await Promise.all([
    fetchGlobalYearSnapshot("gdp", year),
    fetchGlobalYearSnapshot("gov_debt_pct_gdp", year),
  ]);
  const gdpMap = new Map(gdpRows.map((r) => [r.countryIso3, r.value]));
  const pctMap = new Map(pctRows.map((r) => [r.countryIso3, r.value]));

  const derive = (iso: string): number | null => {
    const g = gdpMap.get(iso);
    const p = pctMap.get(iso);
    if (isMissingValue(g) || isMissingValue(p)) return null;
    return (p! / 100) * g!;
  };

  const byIso = new Map<string, GlobalRow>();
  for (const r of rows) {
    byIso.set(r.countryIso3, { ...r });
  }

  for (const [iso, row] of byIso) {
    if (!isMissingValue(row.value)) continue;
    const v = derive(iso);
    if (v !== null) byIso.set(iso, { ...row, value: v });
  }

  const seen = new Set(byIso.keys());
  for (const gr of gdpRows) {
    if (seen.has(gr.countryIso3)) continue;
    const v = derive(gr.countryIso3);
    if (v === null) continue;
    byIso.set(gr.countryIso3, {
      countryIso3: gr.countryIso3,
      countryName: gr.countryName,
      value: v,
    });
  }

  return [...byIso.values()];
}

/** When the total series is null but male and female WDI series exist, use the simple mean (gap-fill only). */
async function enrichFromSexPairAverage(
  rows: GlobalRow[],
  year: number,
  maleCode: string,
  femaleCode: string
): Promise<GlobalRow[]> {
  const [maleRows, femaleRows] = await Promise.all([
    fetchGlobalIndicatorYear(maleCode, year),
    fetchGlobalIndicatorYear(femaleCode, year),
  ]);
  const maleMap = new Map(maleRows.map((r) => [r.countryIso3.toUpperCase(), r.value] as const));
  const femaleMap = new Map(femaleRows.map((r) => [r.countryIso3.toUpperCase(), r.value] as const));

  return rows.map((row) => {
    if (!isMissingValue(row.value)) return row;
    const iso = row.countryIso3.toUpperCase();
    const m = maleMap.get(iso);
    const f = femaleMap.get(iso);
    if (!isMissingValue(m) && !isMissingValue(f)) {
      return { ...row, value: ((m as number) + (f as number)) / 2 };
    }
    return row;
  });
}

/**
 * One metric, one year — all economies (paginated WDI).
 * Merges secondary WDI code when defined; IMF WEO when `imfWeoIndicator` is set; UNESCO UIS when `uisIndicatorId` is set.
 */
export async function fetchGlobalYearSnapshot(metricId: string, year: number): Promise<GlobalRow[]> {
  const def = METRIC_BY_ID[metricId];
  if (!def) throw new Error(`Unknown metric: ${metricId}`);
  const cacheKey = `global:v9:${metricId}:${year}`;
  const cached = getCache<GlobalRow[]>(cacheKey);
  if (cached) return cached;

  const primary = await fetchGlobalIndicatorYear(def.worldBankCode, year);
  let rows = primary;
  if (def.fallbackWorldBankCode) {
    const fb = await fetchGlobalIndicatorYear(def.fallbackWorldBankCode, year);
    rows = mergeGlobalRows(primary, fb);
  }
  if (def.imfWeoIndicator) {
    rows = await enrichGlobalRowsWithImf(
      rows,
      def.imfWeoIndicator,
      year,
      def.imfWeoScale ?? 1
    );
  }
  if (def.uisIndicatorId) {
    const uis = await fetchUisGlobalRowsForYear(def.uisIndicatorId, year);
    rows = mergeGlobalRows(
      rows,
      uis.map((r) => ({ countryIso3: r.countryIso3, countryName: r.countryName, value: r.value }))
    );
  }

  if (metricId === "gov_debt_usd") {
    rows = await enrichGlobalGovDebtUsd(rows, year);
  }
  if (metricId === "life_expectancy") {
    rows = await enrichFromSexPairAverage(rows, year, "SP.DYN.LE00.MA.IN", "SP.DYN.LE00.FE.IN");
  }
  if (metricId === "mortality_under5") {
    rows = await enrichFromSexPairAverage(rows, year, "SH.DYN.MORT.MA", "SH.DYN.MORT.FE");
  }

  setCache(cacheKey, rows, 1000 * 60 * 60);
  return rows;
}

function countNonNullGlobalRows(rows: GlobalRow[]): number {
  return rows.filter((r) => r.value !== null && Number.isFinite(r.value)).length;
}

const SNAPSHOT_TARGET_MIN_OBS = 50;
const SNAPSHOT_YEAR_FALLBACK_MAX_STEPS = 14;

/**
 * WDI “all economies” pages are often sparse for the latest calendar year(s).
 * Walk backward to the best recent year with enough non-null observations for a choropleth.
 */
export async function fetchGlobalSnapshotWithYearFallback(
  metricId: string,
  requestedYear: number
): Promise<{ dataYear: number; rows: GlobalRow[] }> {
  let y = resolveGlobalWdiYear(requestedYear);
  let rows = await fetchGlobalYearSnapshot(metricId, y);
  let bestY = y;
  let bestRows = rows;
  let bestN = countNonNullGlobalRows(rows);
  if (bestN >= SNAPSHOT_TARGET_MIN_OBS) {
    return { dataYear: bestY, rows: bestRows };
  }
  for (let step = 0; step < SNAPSHOT_YEAR_FALLBACK_MAX_STEPS && y > MIN_DATA_YEAR; step++) {
    y -= 1;
    rows = await fetchGlobalYearSnapshot(metricId, y);
    const n = countNonNullGlobalRows(rows);
    if (n > bestN) {
      bestN = n;
      bestY = y;
      bestRows = rows;
    }
    if (bestN >= SNAPSHOT_TARGET_MIN_OBS) break;
  }
  return { dataYear: bestY, rows: bestRows };
}
