import { getCache, setCache } from "./cache.js";
import { fetchWithRetry, OUTBOUND_USER_AGENT } from "./httpClient.js";
import type { SeriesPoint } from "./series.js";
import { canonicalWbIso3 } from "./wdiParse.js";

const UIS_BASE = "https://api.uis.unesco.org";

type UisDataResponse = {
  records?: Array<{ indicatorId?: string; geoUnit?: string; year?: number; value?: unknown }>;
};

async function getPublishedVersion(): Promise<string> {
  const key = "uis:published:version";
  const hit = getCache<string>(key);
  if (hit) return hit;
  const res = await fetchWithRetry(`${UIS_BASE}/api/public/versions/default`, {
    headers: { Accept: "application/json", "Accept-Encoding": "gzip" },
  });
  if (!res.ok) {
    setCache(key, "20260311-78618c3e", 1000 * 60 * 60);
    return "20260311-78618c3e";
  }
  const j = (await res.json()) as { version?: string };
  const v = typeof j.version === "string" && j.version.length > 0 ? j.version : "20260311-78618c3e";
  setCache(key, v, 1000 * 60 * 60 * 12);
  return v;
}

function parseNumeric(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "" || t === "..") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Country-level UIS series (one indicator). Merged after WDI (+ IMF where configured) only into null years.
 */
export async function fetchUisCountrySeries(
  countryIso3: string,
  indicatorId: string,
  startYear: number,
  endYear: number
): Promise<SeriesPoint[]> {
  const iso = canonicalWbIso3(countryIso3.toUpperCase());
  if (!/^[A-Z]{3}$/.test(iso)) return [];
  const lo = Math.min(startYear, endYear);
  const hi = Math.max(startYear, endYear);
  const version = await getPublishedVersion();
  const cacheKey = `uis:series:${iso}:${indicatorId}:${lo}:${hi}:${version}`;
  const cached = getCache<SeriesPoint[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    geoUnit: iso,
    indicator: indicatorId,
    start: String(lo),
    end: String(hi),
    version,
  });
  const url = `${UIS_BASE}/api/public/data/indicators?${params.toString()}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json", "User-Agent": OUTBOUND_USER_AGENT, "Accept-Encoding": "gzip" },
    });
    if (!res.ok) {
      setCache(cacheKey, [], 1000 * 60 * 30);
      return [];
    }
    const j = (await res.json()) as UisDataResponse;
    const byYear = new Map<number, number | null>();
    for (let y = lo; y <= hi; y++) byYear.set(y, null);
    for (const r of j.records ?? []) {
      const y = r.year;
      if (typeof y !== "number" || !Number.isFinite(y)) continue;
      const n = parseNumeric(r.value);
      byYear.set(y, n);
    }
    const out: SeriesPoint[] = [...byYear.entries()]
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);
    setCache(cacheKey, out, 1000 * 60 * 60 * 6);
    return out;
  } catch {
    setCache(cacheKey, [], 1000 * 60 * 15);
    return [];
  }
}

/**
 * All economies for one UIS indicator and calendar year (for global WDI snapshot parity).
 */
export type UisGlobalRow = { countryIso3: string; countryName: string; value: number | null };

export async function fetchUisGlobalRowsForYear(indicatorId: string, year: number): Promise<UisGlobalRow[]> {
  const version = await getPublishedVersion();
  const cacheKey = `uis:global:${indicatorId}:${year}:${version}`;
  const cached = getCache<UisGlobalRow[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    indicator: indicatorId,
    start: String(year),
    end: String(year),
    version,
  });
  const url = `${UIS_BASE}/api/public/data/indicators?${params.toString()}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json", "User-Agent": OUTBOUND_USER_AGENT, "Accept-Encoding": "gzip" },
    });
    if (!res.ok) {
      setCache(cacheKey, [], 1000 * 60 * 30);
      return [];
    }
    const j = (await res.json()) as UisDataResponse;
    const byIso = new Map<string, UisGlobalRow>();
    for (const r of j.records ?? []) {
      const raw = r.geoUnit;
      if (!raw || typeof raw !== "string") continue;
      const iso = canonicalWbIso3(raw.toUpperCase());
      if (!/^[A-Z]{3}$/.test(iso)) continue;
      const v = parseNumeric(r.value);
      const name = iso;
      const prev = byIso.get(iso);
      if (!prev || prev.value === null) byIso.set(iso, { countryIso3: iso, countryName: name, value: v });
    }
    const out = [...byIso.values()];
    setCache(cacheKey, out, 1000 * 60 * 60 * 6);
    return out;
  } catch {
    setCache(cacheKey, [], 1000 * 60 * 15);
    return [];
  }
}
