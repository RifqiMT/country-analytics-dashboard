import { METRIC_BY_ID } from "./metrics.js";
import { getMetricShortLabel } from "./metricShortLabels.js";
import { fetchGlobalYearSnapshot, type GlobalRow } from "./globalSnapshot.js";
import type { SeriesPoint } from "./series.js";
import { fetchCountryBundle } from "./worldBank.js";
import { listCountries, type CountrySummary } from "./restCountries.js";
import { resolveEezSqKmMap } from "./eezResolve.js";
import { currentDataYear, MIN_DATA_YEAR } from "./yearBounds.js";
import { isUsableNumber } from "./wdiParse.js";
import { getCache, setCache } from "./cache.js";

/**
 * Comparison rows intentionally use a curated dashboard-relevant subset.
 * Fetching the full catalog can exceed serverless budgets for many countries.
 */
const COMPARISON_COUNTRY_METRIC_IDS: string[] = [
  "population",
  "gdp",
  "gdp_ppp",
  "gdp_per_capita",
  "gdp_per_capita_ppp",
  "gni_per_capita_atlas",
  "gov_debt_usd",
  "gov_debt_pct_gdp",
  "inflation",
  "unemployment_ilo",
  "lending_rate",
  "labor_force_total",
  "poverty_headcount",
  "poverty_national",
  "life_expectancy",
  "mortality_under5",
  "maternal_mortality",
  "undernourishment",
  "birth_rate",
  "tb_incidence",
  "uhc_service_coverage",
  "hospital_beds",
  "physicians_density",
  "nurses_midwives_density",
  "immunization_dpt",
  "immunization_measles",
  "health_expenditure_gdp",
  "smoking_prevalence",
  "pop_age_0_14",
  "pop_15_64_pct",
  "pop_age_65_plus",
  "literacy_adult",
].filter((id) => Boolean(METRIC_BY_ID[id]));

const COMPARISON_CACHE_TTL_MS = 1000 * 60 * 15;

export type ComparisonCell = {
  value: number | null;
  yoyPct: number | null;
  yoyBps: number | null;
};

export type ComparisonRow = {
  id: string;
  label: string;
  country: ComparisonCell;
  avgCountry: ComparisonCell;
  global: ComparisonCell;
  /** How the global column was derived (WLD series vs snapshot fallbacks). */
  note?: string;
};

const SNAPSHOT_LOOKBACK_YEARS = 6;
const MIN_COUNTRIES_FOR_UNEMPLOYED_AVG = 8;

function memberIsoSet(countries: CountrySummary[]): Set<string> {
  const s = new Set<string>();
  for (const c of countries) {
    const iso = (c.cca3 || "").toUpperCase();
    if (/^[A-Z]{3}$/.test(iso)) s.add(iso);
  }
  return s;
}

function filterMemberRows(rows: GlobalRow[], members: Set<string>): GlobalRow[] {
  return rows.filter((r) => members.has(r.countryIso3.toUpperCase()));
}

function medianFromSorted(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function medianFromRows(rows: { value: number | null }[]): number | null {
  const vals = rows.map((r) => r.value).filter((v): v is number => isUsableNumber(v));
  if (vals.length === 0) return null;
  vals.sort((a, b) => a - b);
  return medianFromSorted(vals);
}

function latestUpToYear(
  points: { year: number; value: number | null }[],
  year: number
): { year: number; value: number } | null {
  let best: { year: number; value: number } | null = null;
  for (const p of points) {
    const v = p.value;
    if (p.year > year || !isUsableNumber(v)) continue;
    if (!best || p.year > best.year) best = { year: p.year, value: v };
  }
  return best;
}

function yoyFromSeries(
  points: { year: number; value: number | null }[],
  year: number
): { pct: number | null; bps: number | null } {
  const cur = latestUpToYear(points, year);
  if (!cur) return { pct: null, bps: null };
  let prevVal: number | null = null;
  for (const p of points) {
    const pv = p.value;
    if (p.year === cur.year - 1 && isUsableNumber(pv)) {
      prevVal = pv;
      break;
    }
  }
  if (prevVal === null) return { pct: null, bps: null };
  if (prevVal === 0) return { pct: null, bps: null };
  const delta = cur.value - prevVal;
  const pct = (delta / Math.abs(prevVal)) * 100;
  const bps = delta * 100;
  return { pct, bps };
}

function worldPointFromBundle(
  bundle: Record<string, SeriesPoint[]>,
  metricId: string,
  year: number
): number | null {
  if (!METRIC_BY_ID[metricId]) return null;
  const series = bundle[metricId] ?? [];
  const lv = latestUpToYear(series, year);
  return lv?.value ?? null;
}

function aggregateSnapshot(
  rows: { value: number | null }[],
  mode: "mean" | "sum"
): number | null {
  const vals = rows.map((r) => r.value).filter((v): v is number => isUsableNumber(v));
  if (vals.length === 0) return null;
  if (mode === "sum") return vals.reduce((a, b) => a + b, 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

type SnapshotMemberStats = {
  refYear: number | null;
  mean: number | null;
  median: number | null;
  sum: number | null;
  count: number;
};

/**
 * WDI global snapshots often omit the requested calendar year (reporting lag).
 * Walk backward to the latest year with at least one country observation, then
 * aggregate across **REST member countries** only (excludes WLD/regions in WDI “all”).
 */
async function snapshotMemberAggregates(
  metricId: string,
  year: number,
  members: Set<string>
): Promise<SnapshotMemberStats> {
  const yMin = Math.max(MIN_DATA_YEAR, year - SNAPSHOT_LOOKBACK_YEARS);
  for (let y = year; y >= yMin; y--) {
    const rows = filterMemberRows(await fetchGlobalYearSnapshot(metricId, y), members);
    const mean = aggregateSnapshot(rows, "mean");
    const sum = aggregateSnapshot(rows, "sum");
    const median = medianFromRows(rows);
    const count = rows.filter((r) => isUsableNumber(r.value)).length;
    if (mean !== null || sum !== null) {
      return { refYear: y, mean, median, sum, count };
    }
  }
  return { refYear: null, mean: null, median: null, sum: null, count: 0 };
}

type GlobalKind = "level_total" | "rate_or_pc";

type ResolveStats = { mean: number | null; sum: number | null; median: number | null };

function resolveGlobalValue(
  globalKind: GlobalKind,
  wld: number | null,
  stats: ResolveStats,
  weightedFallback: number | null
): { value: number | null; note: string } {
  if (wld !== null && Number.isFinite(wld)) return { value: wld, note: "wld" };
  if (weightedFallback !== null && Number.isFinite(weightedFallback)) {
    return { value: weightedFallback, note: "weighted_countries" };
  }
  if (globalKind === "level_total" && stats.sum !== null) return { value: stats.sum, note: "sum_countries" };
  if (stats.median !== null) return { value: stats.median, note: "median_countries" };
  if (stats.mean !== null) return { value: stats.mean, note: "mean_countries" };
  return { value: null, note: "none" };
}

async function impliedPerCapitaAtYear(
  gdpMetricId: "gdp" | "gdp_ppp",
  y: number,
  members: Set<string>
): Promise<number | null> {
  const [gRows, pRows] = await Promise.all([
    fetchGlobalYearSnapshot(gdpMetricId, y),
    fetchGlobalYearSnapshot("population", y),
  ]);
  const gF = filterMemberRows(gRows, members);
  const pF = filterMemberRows(pRows, members);
  const pMap = new Map(pF.map((r) => [r.countryIso3.toUpperCase(), r.value]));
  let sumG = 0;
  let sumP = 0;
  for (const r of gF) {
    const p = pMap.get(r.countryIso3.toUpperCase());
    if (!isUsableNumber(r.value) || !isUsableNumber(p) || p <= 0) continue;
    sumG += r.value;
    sumP += p;
  }
  return sumP > 0 ? sumG / sumP : null;
}

async function populationWeightedRateWithFallback(
  metricId: string,
  year: number,
  members: Set<string>
): Promise<{ value: number | null; refYear: number | null }> {
  const yMin = Math.max(MIN_DATA_YEAR, year - SNAPSHOT_LOOKBACK_YEARS);
  for (let y = year; y >= yMin; y--) {
    const [rateRows, popRows] = await Promise.all([
      fetchGlobalYearSnapshot(metricId, y),
      fetchGlobalYearSnapshot("population", y),
    ]);
    const rr = filterMemberRows(rateRows, members);
    const pr = filterMemberRows(popRows, members);
    const popMap = new Map(pr.map((r) => [r.countryIso3.toUpperCase(), r.value]));
    let w = 0;
    let popSum = 0;
    for (const r of rr) {
      const rate = r.value;
      const pop = popMap.get(r.countryIso3.toUpperCase());
      if (!isUsableNumber(rate) || !isUsableNumber(pop) || pop <= 0) continue;
      w += rate * pop;
      popSum += pop;
    }
    if (popSum > 0) return { value: w / popSum, refYear: y };
  }
  return { value: null, refYear: null };
}

async function laborForceWeightedUnemploymentWithFallback(
  year: number,
  members: Set<string>
): Promise<{ value: number | null; refYear: number | null }> {
  const yMin = Math.max(MIN_DATA_YEAR, year - SNAPSHOT_LOOKBACK_YEARS);
  for (let y = year; y >= yMin; y--) {
    const [uRows, lfRows] = await Promise.all([
      fetchGlobalYearSnapshot("unemployment_ilo", y),
      fetchGlobalYearSnapshot("labor_force_total", y),
    ]);
    const ur = filterMemberRows(uRows, members);
    const lfr = filterMemberRows(lfRows, members);
    const lfMap = new Map(lfr.map((r) => [r.countryIso3.toUpperCase(), r.value]));
    let num = 0;
    let den = 0;
    for (const r of ur) {
      const u = r.value;
      const lf = lfMap.get(r.countryIso3.toUpperCase());
      if (!isUsableNumber(u) || !isUsableNumber(lf)) continue;
      num += (u / 100) * lf;
      den += lf;
    }
    if (den > 0) return { value: (num / den) * 100, refYear: y };
  }
  return { value: null, refYear: null };
}

/**
 * Median national unemployed count and WLD-based (or summed) global unemployed.
 * WLD values are read at the same reference year as the snapshot used for medians/sums.
 */
async function aggregatesUnemployedNumber(
  requestYear: number,
  wldBundle: Record<string, SeriesPoint[]>,
  members: Set<string>
): Promise<{
  avg: number | null;
  global: number | null;
}> {
  const yMin = Math.max(MIN_DATA_YEAR, requestYear - SNAPSHOT_LOOKBACK_YEARS);
  let lastCounts: number[] = [];

  for (let y = requestYear; y >= yMin; y--) {
    const [uRows, lfRows] = await Promise.all([
      fetchGlobalYearSnapshot("unemployment_ilo", y),
      fetchGlobalYearSnapshot("labor_force_total", y),
    ]);
    const byLf = new Map(
      filterMemberRows(lfRows, members).map((r) => [r.countryIso3.toUpperCase(), r.value])
    );
    const counts: number[] = [];
    for (const r of filterMemberRows(uRows, members)) {
      const u = r.value;
      const lf = byLf.get(r.countryIso3.toUpperCase());
      if (!isUsableNumber(u) || !isUsableNumber(lf)) continue;
      counts.push((u / 100) * lf);
    }
    if (counts.length >= MIN_COUNTRIES_FOR_UNEMPLOYED_AVG) {
      const sorted = [...counts].sort((a, b) => a - b);
      const avg = medianFromSorted(sorted);
      const wu = worldPointFromBundle(wldBundle, "unemployment_ilo", y);
      const wf = worldPointFromBundle(wldBundle, "labor_force_total", y);
      if (isUsableNumber(wu) && isUsableNumber(wf)) {
        return { avg, global: (wu / 100) * wf };
      }
      const globalSum = counts.reduce((a, b) => a + b, 0);
      return { avg, global: globalSum };
    }
    if (counts.length > lastCounts.length) lastCounts = counts;
  }

  const wu = worldPointFromBundle(wldBundle, "unemployment_ilo", requestYear);
  const wf = worldPointFromBundle(wldBundle, "labor_force_total", requestYear);
  if (isUsableNumber(wu) && isUsableNumber(wf)) {
    return { avg: null, global: (wu / 100) * wf };
  }
  if (lastCounts.length > 0) {
    const sorted = [...lastCounts].sort((a, b) => a - b);
    const avg = medianFromSorted(sorted);
    return { avg, global: lastCounts.reduce((a, b) => a + b, 0) };
  }
  return { avg: null, global: null };
}

function geographyFromRest(all: CountrySummary[]) {
  const areas = all.map((c) => c.area).filter((a) => a > 0).sort((a, b) => a - b);
  const sum = areas.reduce((a, b) => a + b, 0);
  const median = medianFromSorted(areas);
  return { medianArea: median, sumArea: sum };
}

async function computeDashboardComparison(iso3: string, year: number) {
  const upper = iso3.toUpperCase();
  const allCountries = await listCountries();
  const eezMap = await resolveEezSqKmMap(allCountries);
  const members = memberIsoSet(allCountries);
  const { medianArea, sumArea } = geographyFromRest(allCountries);
  const meta = allCountries.find((c) => c.cca3.toUpperCase() === upper);

  const eezCoastalValues = [...eezMap.values()].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > 0
  );
  const eezSorted = [...eezCoastalValues].sort((a, b) => a - b);
  const eezMedianAll = medianFromSorted(eezSorted);
  const eezSumAll = eezCoastalValues.length > 0 ? eezCoastalValues.reduce((a, b) => a + b, 0) : null;
  const countryEez =
    meta?.landlocked === true ? null : (eezMap.get(upper) ?? null);
  const bundle = await fetchCountryBundle(upper, [...COMPARISON_COUNTRY_METRIC_IDS], MIN_DATA_YEAR, currentDataYear());

  const wldMetricIds = [...COMPARISON_COUNTRY_METRIC_IDS];
  const wldBundle = await fetchCountryBundle("WLD", [...new Set(wldMetricIds)], MIN_DATA_YEAR, currentDataYear());

  const unemployedSeries = bundle.unemployment_ilo ?? [];
  const laborSeries = bundle.labor_force_total ?? [];

  const derivedUnemployed = (y: number): number | null => {
    const u = latestUpToYear(unemployedSeries, y)?.value;
    const lf = latestUpToYear(laborSeries, y)?.value;
    if (!isUsableNumber(u) || !isUsableNumber(lf)) return null;
    return (u / 100) * lf;
  };

  const cellFromMetric = async (metricId: string, globalKind: GlobalKind): Promise<ComparisonRow> => {
    const label = getMetricShortLabel(metricId);
    const cSeries = bundle[metricId] ?? [];
    const cur = latestUpToYear(cSeries, year);
    const { pct, bps } = yoyFromSeries(cSeries, cur?.year ?? year);

    let avg: number | null = null;
    let refY = year;
    let stats: ResolveStats = { mean: null, sum: null, median: null };
    let weightedFallback: number | null = null;

    if (metricId === "gdp" || metricId === "gdp_ppp") {
      const s = await snapshotMemberAggregates(metricId, year, members);
      refY = s.refYear ?? year;
      stats = { mean: s.mean, sum: s.sum, median: s.median };
      avg = s.median;
    } else if (metricId === "gdp_per_capita") {
      const s = await snapshotMemberAggregates("gdp_per_capita", year, members);
      refY = s.refYear ?? year;
      stats = { mean: s.mean, sum: s.sum, median: s.median };
      const implied = await impliedPerCapitaAtYear("gdp", refY, members);
      avg = implied ?? s.mean;
      weightedFallback = implied ?? s.mean;
    } else if (metricId === "gdp_per_capita_ppp") {
      const s = await snapshotMemberAggregates("gdp_per_capita_ppp", year, members);
      refY = s.refYear ?? year;
      stats = { mean: s.mean, sum: s.sum, median: s.median };
      const implied = await impliedPerCapitaAtYear("gdp_ppp", refY, members);
      avg = implied ?? s.mean;
      weightedFallback = implied ?? s.mean;
    } else if (metricId === "gni_per_capita_atlas") {
      const s = await snapshotMemberAggregates("gni_per_capita_atlas", year, members);
      refY = s.refYear ?? year;
      stats = { mean: s.mean, sum: s.sum, median: s.median };
      avg = s.median;
    } else if (metricId === "unemployment_ilo") {
      const w = await laborForceWeightedUnemploymentWithFallback(year, members);
      refY = w.refYear ?? year;
      avg = w.value;
      weightedFallback = w.value;
      const s = await snapshotMemberAggregates(metricId, refY, members);
      stats = { mean: s.mean, sum: s.sum, median: s.median };
    } else if (
      metricId === "inflation" ||
      metricId === "lending_rate" ||
      metricId === "poverty_headcount" ||
      metricId === "poverty_national"
    ) {
      const w = await populationWeightedRateWithFallback(metricId, year, members);
      refY = w.refYear ?? year;
      avg = w.value;
      weightedFallback = w.value;
      const s = await snapshotMemberAggregates(metricId, refY, members);
      stats = { mean: s.mean, sum: s.sum, median: s.median };
    } else {
      const s = await snapshotMemberAggregates(metricId, year, members);
      refY = s.refYear ?? year;
      stats = { mean: s.mean, sum: s.sum, median: s.median };
      avg = s.mean;
    }

    const wld = worldPointFromBundle(wldBundle, metricId, refY);
    const { value: globalVal, note } = resolveGlobalValue(globalKind, wld, stats, weightedFallback);

    return {
      id: metricId,
      label,
      country: {
        value: cur?.value ?? null,
        yoyPct: pct,
        yoyBps: bps,
      },
      avgCountry: { value: avg, yoyPct: null, yoyBps: null },
      global: { value: globalVal, yoyPct: null, yoyBps: null },
      note,
    };
  };

  const rows: ComparisonRow[] = [];

  if (meta) {
    rows.push({
      id: "land_area",
      label: getMetricShortLabel("land_area"),
      country: { value: meta.area > 0 ? meta.area : null, yoyPct: null, yoyBps: null },
      avgCountry: { value: medianArea, yoyPct: null, yoyBps: null },
      global: { value: sumArea, yoyPct: null, yoyBps: null },
    });
    rows.push({
      id: "total_area",
      label: getMetricShortLabel("total_area"),
      country: { value: meta.area > 0 ? meta.area : null, yoyPct: null, yoyBps: null },
      avgCountry: { value: medianArea, yoyPct: null, yoyBps: null },
      global: { value: sumArea, yoyPct: null, yoyBps: null },
    });
    rows.push({
      id: "eez",
      label: getMetricShortLabel("eez"),
      country: { value: countryEez, yoyPct: null, yoyBps: null },
      avgCountry: { value: eezMedianAll, yoyPct: null, yoyBps: null },
      global: { value: eezSumAll, yoyPct: null, yoyBps: null },
    });
  }

  const financialIds: { id: string; globalKind: GlobalKind }[] = [
    { id: "gdp", globalKind: "level_total" },
    { id: "gdp_ppp", globalKind: "level_total" },
    { id: "gdp_per_capita", globalKind: "rate_or_pc" },
    { id: "gdp_per_capita_ppp", globalKind: "rate_or_pc" },
    { id: "gni_per_capita_atlas", globalKind: "rate_or_pc" },
    { id: "inflation", globalKind: "rate_or_pc" },
    { id: "unemployment_ilo", globalKind: "rate_or_pc" },
  ];
  const explicitlyRanked = new Set<string>([
    ...financialIds.map((f) => f.id),
    "lending_rate",
    "poverty_headcount",
    "poverty_national",
    "birth_rate",
    "tb_incidence",
    "uhc_service_coverage",
    "hospital_beds",
    "physicians_density",
    "nurses_midwives_density",
    "immunization_dpt",
    "immunization_measles",
    "health_expenditure_gdp",
    "smoking_prevalence",
    "labor_force_total",
  ]);

  const lfCur = latestUpToYear(laborSeries, year);
  const lfYo = yoyFromSeries(laborSeries, lfCur?.year ?? year);
  const du = derivedUnemployed(year);
  const duPrev = derivedUnemployed(year - 1);
  let duPct: number | null = null;
  if (du !== null && duPrev !== null && duPrev !== 0) duPct = ((du - duPrev) / Math.abs(duPrev)) * 100;

  const [finRows, unempAgg, lfStats, tailRows, healthRows, remainingRows] = await Promise.all([
    Promise.all(financialIds.map((f) => cellFromMetric(f.id, f.globalKind))),
    aggregatesUnemployedNumber(year, wldBundle, members),
    snapshotMemberAggregates("labor_force_total", year, members),
    Promise.all([
      cellFromMetric("lending_rate", "rate_or_pc"),
      cellFromMetric("poverty_headcount", "rate_or_pc"),
      cellFromMetric("poverty_national", "rate_or_pc"),
    ]),
    Promise.all([
      cellFromMetric("birth_rate", "rate_or_pc"),
      cellFromMetric("tb_incidence", "rate_or_pc"),
      cellFromMetric("uhc_service_coverage", "rate_or_pc"),
      cellFromMetric("hospital_beds", "rate_or_pc"),
      cellFromMetric("physicians_density", "rate_or_pc"),
      cellFromMetric("nurses_midwives_density", "rate_or_pc"),
      cellFromMetric("immunization_dpt", "rate_or_pc"),
      cellFromMetric("immunization_measles", "rate_or_pc"),
      cellFromMetric("health_expenditure_gdp", "rate_or_pc"),
      cellFromMetric("smoking_prevalence", "rate_or_pc"),
    ]),
    Promise.all(
      COMPARISON_COUNTRY_METRIC_IDS.filter((id) => !explicitlyRanked.has(id)).map((id) =>
        cellFromMetric(id, "rate_or_pc")
      )
    ),
  ]);

  rows.push(...finRows);

  rows.push({
    id: "unemployed_number",
    label: getMetricShortLabel("unemployed_number"),
    country: { value: du, yoyPct: duPct, yoyBps: null },
    avgCountry: { value: unempAgg.avg, yoyPct: null, yoyBps: null },
    global: { value: unempAgg.global, yoyPct: null, yoyBps: null },
  });

  const lfRefY = lfStats.refYear ?? year;
  let lfGlobal = worldPointFromBundle(wldBundle, "labor_force_total", lfRefY);
  if (lfGlobal === null && lfStats.sum !== null) lfGlobal = lfStats.sum;

  rows.push({
    id: "labor_force_total",
    label: getMetricShortLabel("labor_force_total"),
    country: {
      value: lfCur?.value ?? null,
      yoyPct: lfYo.pct,
      yoyBps: lfYo.bps,
    },
    avgCountry: { value: lfStats.median, yoyPct: null, yoyBps: null },
    global: { value: lfGlobal, yoyPct: null, yoyBps: null },
  });

  rows.push(...tailRows);
  rows.push(...healthRows);
  rows.push(...remainingRows);

  return {
    year,
    countryIso3: upper,
    countryName: meta?.name ?? upper,
    rows,
    geographyMeta: { medianArea, sumArea },
  };
}

export async function buildDashboardComparison(iso3: string, year: number) {
  const upper = iso3.toUpperCase();
  const key = `dash:comparison:v5-fast:${upper}:${year}`;
  const hit = getCache<Awaited<ReturnType<typeof computeDashboardComparisonFast>>>(key);
  if (hit) return hit;
  const data = await computeDashboardComparisonFast(upper, year);
  setCache(key, data, COMPARISON_CACHE_TTL_MS);
  return data;
}

/**
 * Fast serverless-safe comparison builder.
 * Uses selected-country + WLD series (same metric pipeline as dashboard) and avoids
 * expensive cross-country snapshot scans that can exceed Vercel time limits.
 */
async function computeDashboardComparisonFast(iso3: string, year: number) {
  const upper = iso3.toUpperCase();
  const allCountries = await listCountries();
  const meta = allCountries.find((c) => c.cca3.toUpperCase() === upper);
  const members = memberIsoSet(allCountries);
  const { medianArea, sumArea } = geographyFromRest(allCountries);
  const eezMap = await resolveEezSqKmMap(allCountries);

  const metricIds = [...COMPARISON_COUNTRY_METRIC_IDS];
  const [bundle, wldBundle] = await Promise.all([
    fetchCountryBundle(upper, metricIds, MIN_DATA_YEAR, currentDataYear()),
    fetchCountryBundle("WLD", metricIds, MIN_DATA_YEAR, currentDataYear()),
  ]);

  const rows: ComparisonRow[] = [];

  const pushMetricRow = (metricId: string) => {
    const countrySeries = bundle[metricId] ?? [];
    const worldSeries = wldBundle[metricId] ?? [];
    const cur = latestUpToYear(countrySeries, year);
    const yoy = yoyFromSeries(countrySeries, cur?.year ?? year);
    const globalVal = latestUpToYear(worldSeries, year)?.value ?? null;
    rows.push({
      id: metricId,
      label: getMetricShortLabel(metricId),
      country: { value: cur?.value ?? null, yoyPct: yoy.pct, yoyBps: yoy.bps },
      avgCountry: { value: null, yoyPct: null, yoyBps: null },
      global: { value: globalVal, yoyPct: null, yoyBps: null },
      note: "wld-only-fast",
    });
  };

  if (meta) {
    const eezCoastalValues = [...eezMap.values()].filter(
      (v): v is number => v != null && Number.isFinite(v) && v > 0
    );
    const eezSorted = [...eezCoastalValues].sort((a, b) => a - b);
    const eezMedianAll = medianFromSorted(eezSorted);
    const eezSumAll =
      eezCoastalValues.length > 0 ? eezCoastalValues.reduce((a, b) => a + b, 0) : null;
    const countryEez = meta.landlocked === true ? null : (eezMap.get(upper) ?? null);

    rows.push({
      id: "land_area",
      label: getMetricShortLabel("land_area"),
      country: { value: meta.area > 0 ? meta.area : null, yoyPct: null, yoyBps: null },
      avgCountry: { value: medianArea, yoyPct: null, yoyBps: null },
      global: { value: sumArea, yoyPct: null, yoyBps: null },
      note: "rest-area",
    });
    rows.push({
      id: "total_area",
      label: getMetricShortLabel("total_area"),
      country: { value: meta.area > 0 ? meta.area : null, yoyPct: null, yoyBps: null },
      avgCountry: { value: medianArea, yoyPct: null, yoyBps: null },
      global: { value: sumArea, yoyPct: null, yoyBps: null },
      note: "rest-area",
    });
    rows.push({
      id: "eez",
      label: getMetricShortLabel("eez"),
      country: { value: countryEez, yoyPct: null, yoyBps: null },
      avgCountry: { value: eezMedianAll, yoyPct: null, yoyBps: null },
      global: { value: eezSumAll, yoyPct: null, yoyBps: null },
      note: "eez-rest",
    });
  }

  for (const metricId of metricIds) {
    if (metricId === "labor_force_total" || metricId === "unemployment_ilo") {
      // handled below + as normal row for consistency
      pushMetricRow(metricId);
      continue;
    }
    pushMetricRow(metricId);
  }

  const unemployedCountry = (() => {
    const u = latestUpToYear(bundle.unemployment_ilo ?? [], year)?.value;
    const lf = latestUpToYear(bundle.labor_force_total ?? [], year)?.value;
    if (!isUsableNumber(u) || !isUsableNumber(lf)) return null;
    return (u / 100) * lf;
  })();
  const unemployedWorld = (() => {
    const u = latestUpToYear(wldBundle.unemployment_ilo ?? [], year)?.value;
    const lf = latestUpToYear(wldBundle.labor_force_total ?? [], year)?.value;
    if (!isUsableNumber(u) || !isUsableNumber(lf)) return null;
    return (u / 100) * lf;
  })();
  const unemployedPrev = (() => {
    const u = latestUpToYear(bundle.unemployment_ilo ?? [], year - 1)?.value;
    const lf = latestUpToYear(bundle.labor_force_total ?? [], year - 1)?.value;
    if (!isUsableNumber(u) || !isUsableNumber(lf)) return null;
    return (u / 100) * lf;
  })();
  const unemployedYoYPct =
    unemployedCountry !== null &&
    unemployedPrev !== null &&
    unemployedPrev !== 0
      ? ((unemployedCountry - unemployedPrev) / Math.abs(unemployedPrev)) * 100
      : null;

  rows.push({
    id: "unemployed_number",
    label: getMetricShortLabel("unemployed_number"),
    country: { value: unemployedCountry, yoyPct: unemployedYoYPct, yoyBps: null },
    avgCountry: { value: null, yoyPct: null, yoyBps: null },
    global: { value: unemployedWorld, yoyPct: null, yoyBps: null },
    note: "derived-from-unemployment-and-labor-force",
  });

  return {
    year,
    countryIso3: upper,
    countryName: meta?.name ?? upper,
    rows,
    geographyMeta: { medianArea, sumArea },
    membersCount: members.size,
    mode: "fast-wld",
  };
}
