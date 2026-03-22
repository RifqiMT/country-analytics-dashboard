import { createHash } from "node:crypto";
import type { CountrySummary } from "./restCountries.js";
import { EEZ_SQKM_FALLBACK } from "./eezSqKmFallback.js";
import { fetchSeaAroundUsEezAreaKm2 } from "./seaAroundUsEez.js";
import { getCache, setCache } from "./cache.js";

const EEZ_MAP_TTL_MS = 1000 * 60 * 60 * 24;

function eezMapCacheKey(countries: CountrySummary[]): string {
  const ids = countries
    .map((c) => (c.cca3 || "").toUpperCase())
    .filter((x) => /^[A-Z]{3}$/.test(x))
    .sort();
  const h = createHash("sha256").update(ids.join(",")).digest("hex").slice(0, 24);
  return `eez:sqkm-map:v2:${h}`;
}

const DEFAULT_CONCURRENCY = 12;

async function mapPoolLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      out[i] = await fn(items[i]!, i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

/**
 * EEZ area (km²) per ISO3 for a country list: static reference table first, then Sea Around Us (UN M.49 / ccn3).
 * Landlocked countries resolve to `null` (UI shows “no EEZ”).
 */
export async function resolveEezSqKmMap(
  countries: CountrySummary[],
  concurrency = DEFAULT_CONCURRENCY
): Promise<Map<string, number | null>> {
  const cacheKey = eezMapCacheKey(countries);
  const cached = getCache<Record<string, number | null>>(cacheKey);
  if (cached) {
    return new Map(
      Object.entries(cached).map(([k, v]) => [k.toUpperCase(), v])
    );
  }

  const pairs = await mapPoolLimit(countries, concurrency, async (c) => {
    const iso = c.cca3.toUpperCase();
    if (c.landlocked === true) return [iso, null] as const;
    const fb = EEZ_SQKM_FALLBACK[iso];
    if (fb != null && Number.isFinite(fb) && fb > 0) return [iso, fb] as const;
    const api = await fetchSeaAroundUsEezAreaKm2(c.ccn3);
    if (api != null && Number.isFinite(api) && api > 0) return [iso, api] as const;
    return [iso, null] as const;
  });
  const map = new Map(pairs);
  setCache(cacheKey, Object.fromEntries(map), EEZ_MAP_TTL_MS);
  return map;
}
