/**
 * IMF (International Monetary Fund) DataMapper API – Government debt fallback.
 * General government gross debt (% of GDP), World Economic Outlook (WEO).
 * Used when World Bank has no data for a country.
 * @see https://www.imf.org/external/datamapper/api/help
 */

import axios from 'axios';
import type { TimePoint } from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

const IMF_DATAMAPPER_BASE = 'https://www.imf.org/external/datamapper/api';

/**
 * Extract country-year map from IMF API response. Handles both { values: { CHN: { "2022": 77 } } }
 * and top-level { CHN: { "2022": 77 } }. Returns null if not found.
 */
function extractCountryYearMap(
  data: Record<string, unknown>,
  countryKey: string,
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const root = data.values ?? data;
  if (typeof root !== 'object' || root === null || Array.isArray(root)) return null;
  const obj = root as Record<string, unknown>;
  const upper = countryKey.toUpperCase();
  // Try exact key
  let countryData = obj[upper] ?? obj[countryKey];
  if (countryData && typeof countryData === 'object' && !Array.isArray(countryData))
    return countryData as Record<string, unknown>;
  // Try case-insensitive match (some APIs return mixed case)
  for (const [k, v] of Object.entries(obj)) {
    if (k.toUpperCase() === upper && v && typeof v === 'object' && !Array.isArray(v))
      return v as Record<string, unknown>;
  }
  return null;
}

/**
 * Fetch general government gross debt (% of GDP) from IMF WEO for one country
 * over a range of years. Used as fallback for the country dashboard macro timeline.
 * Returns TimePoint[] (WB-compatible); fails gracefully (returns []).
 */
export async function fetchGovernmentDebtSeriesFromIMF(
  iso3Code: string,
  startYear: number,
  endYear: number,
): Promise<TimePoint[]> {
  const points: TimePoint[] = [];
  const safeStart = Math.max(DATA_MIN_YEAR, startYear);
  const safeEnd = Math.min(DATA_MAX_YEAR, endYear);
  if (safeStart > safeEnd) return points;

  const years = Array.from(
    { length: safeEnd - safeStart + 1 },
    (_, i) => safeStart + i,
  );
  const periods = years.join(',');
  const countryKey = iso3Code.toUpperCase();
  const url = `${IMF_DATAMAPPER_BASE}/GGXWDG_NGDP@WEO/${countryKey}?periods=${periods}`;
  try {
    const res = await axios.get<Record<string, unknown>>(url, {
      timeout: 15000,
      validateStatus: (s) => s === 200,
      headers: { Accept: 'application/json' },
    });
    const data = res.data;
    if (!data || typeof data !== 'object') return points;
    const yearMap = extractCountryYearMap(data, countryKey);
    if (!yearMap) return points;
    for (const year of years) {
      const v = yearMap[String(year)];
      const num = typeof v === 'number' && Number.isFinite(v) ? v : null;
      points.push({
        year,
        date: `${year}-01-01`,
        value: num,
      });
    }
  } catch {
    // Network / CORS – return empty
  }
  return points.sort((a, b) => a.year - b.year);
}

/**
 * Fetch general government gross debt (% of GDP) from IMF WEO for given countries and year.
 * Returns a map of ISO3 -> value. Fails gracefully (returns partial or empty map).
 * Uses smaller batches and per-country fallback so countries like China get data when
 * batch response shape differs or batch fails.
 */
export async function fetchGovernmentDebtFromIMF(
  iso3Codes: string[],
  year: number,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!iso3Codes.length) return result;

  const codes = iso3Codes.map((c) => c.toUpperCase());
  const unique = [...new Set(codes)];
  const batchSize = 20;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const path = batch.join('/');
    const url = `${IMF_DATAMAPPER_BASE}/GGXWDG_NGDP@WEO/${path}?periods=${year}`;
    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        timeout: 15000,
        validateStatus: (s) => s === 200,
        headers: { Accept: 'application/json' },
      });
      const data = res.data;
      if (!data || typeof data !== 'object') continue;
      const root = (data as Record<string, unknown>).values ?? data;
      const obj = typeof root === 'object' && root && !Array.isArray(root) ? (root as Record<string, unknown>) : (data as Record<string, unknown>);
      for (const iso3 of batch) {
        const countryData = obj[iso3] ?? (obj as Record<string, unknown>)[iso3];
        if (countryData && typeof countryData === 'object' && !Array.isArray(countryData)) {
          const yearVal = (countryData as Record<string, unknown>)[String(year)];
          if (typeof yearVal === 'number' && Number.isFinite(yearVal)) {
            result.set(iso3, yearVal);
          }
        }
      }
      // If batch response uses different keys (e.g. nested), try extract by matching batch codes
      for (const [key, val] of Object.entries(obj)) {
        if (key === 'metadata' || key === 'label' || key === 'description') continue;
        const code = key.toUpperCase();
        if (batch.includes(code) && !result.has(code) && val && typeof val === 'object' && !Array.isArray(val)) {
          const yearVal = (val as Record<string, unknown>)[String(year)];
          if (typeof yearVal === 'number' && Number.isFinite(yearVal)) {
            result.set(code, yearVal);
          }
        }
      }
    } catch {
      // Network / CORS / timeout – skip this batch
    }
  }

  // Per-country fallback for any still missing (e.g. China when batch shape differs)
  const stillMissing = unique.filter((iso3) => !result.has(iso3));
  if (stillMissing.length > 0) {
    const fallbackResults = await Promise.all(
      stillMissing.map(async (iso3) => {
        try {
          const series = await fetchGovernmentDebtSeriesFromIMF(iso3, year, year);
          const pt = series.find((p) => p.year === year && p.value != null);
          return pt && typeof pt.value === 'number' ? ([iso3, pt.value] as const) : null;
        } catch {
          return null;
        }
      }),
    );
    for (const pair of fallbackResults) {
      if (pair) result.set(pair[0], pair[1]);
    }
  }
  return result;
}

/**
 * Fetch nominal GDP (current prices, national currency) from IMF WEO.
 * Used as fallback when World Bank has no GDP data for a country/territory.
 * Returns TimePoint[] (WB-compatible); fails gracefully (returns []).
 * Note: Values are in millions of national currency; for USD-using countries
 * (e.g. American Samoa, US territories) the scale is comparable.
 */
export async function fetchGDPFromIMF(
  iso3Code: string,
  startYear: number,
  endYear: number,
): Promise<TimePoint[]> {
  const points: TimePoint[] = [];
  const safeStart = Math.max(DATA_MIN_YEAR, startYear);
  const safeEnd = Math.min(DATA_MAX_YEAR, endYear);
  if (safeStart > safeEnd) return points;

  const years = Array.from(
    { length: safeEnd - safeStart + 1 },
    (_, i) => safeStart + i,
  );
  const periods = years.join(',');
  const url = `${IMF_DATAMAPPER_BASE}/NGDPD@WEO/${iso3Code.toUpperCase()}?periods=${periods}`;
  try {
    const res = await axios.get<Record<string, unknown>>(url, {
      timeout: 15000,
      validateStatus: (s) => s === 200,
      headers: { Accept: 'application/json' },
    });
    const data = res.data;
    if (!data || typeof data !== 'object') return points;
    const root = (data as Record<string, unknown>).values ?? data;
    const obj =
      typeof root === 'object' && root && !Array.isArray(root)
        ? (root as Record<string, unknown>)
        : (data as Record<string, unknown>);
    const countryKey = iso3Code.toUpperCase();
    const countryData = obj[countryKey];
    if (!countryData || typeof countryData !== 'object' || Array.isArray(countryData))
      return points;
    const yearMap = countryData as Record<string, unknown>;
    for (const year of years) {
      const v = yearMap[String(year)];
      const num = typeof v === 'number' && Number.isFinite(v) ? v : null;
      points.push({
        year,
        date: `${year}-01-01`,
        value: num,
      });
    }
  } catch {
    // Network / CORS – return empty
  }
  return points.sort((a, b) => a.year - b.year);
}

/** IMF WEO NGDPD reports in billions USD; scale to match World Bank (current US$). */
const IMF_GDP_BILLIONS = true;

/**
 * Fetch nominal GDP (current prices) from IMF WEO for given countries and year.
 * Used as fallback in the global table when World Bank has no GDP data (e.g. North Korea, some territories).
 * Returns a map of ISO3 -> value in current US$ (scaled from billions if applicable).
 */
export async function fetchGDPFromIMFForYearBatch(
  iso3Codes: string[],
  year: number,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!iso3Codes.length) return result;

  const codes = iso3Codes.map((c) => c.toUpperCase());
  const unique = [...new Set(codes)];
  const batchSize = 40;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const path = batch.join('/');
    const url = `${IMF_DATAMAPPER_BASE}/NGDPD@WEO/${path}?periods=${year}`;
    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        timeout: 15000,
        validateStatus: (s) => s === 200,
        headers: { Accept: 'application/json' },
      });
      const data = res.data;
      if (!data || typeof data !== 'object') continue;
      const root = (data as Record<string, unknown>).values ?? data;
      const obj =
        typeof root === 'object' && root && !Array.isArray(root)
          ? (root as Record<string, unknown>)
          : (data as Record<string, unknown>);
      for (const [key, val] of Object.entries(obj)) {
        if (key === 'metadata' || key === 'label' || key === 'description') continue;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const yearVal = (val as Record<string, unknown>)[String(year)];
          if (typeof yearVal === 'number' && Number.isFinite(yearVal)) {
            const scaled = IMF_GDP_BILLIONS ? yearVal * 1e9 : yearVal;
            result.set(key.toUpperCase(), scaled);
          }
        }
      }
    } catch {
      // Network / CORS / timeout – skip this batch
    }
  }
  return result;
}
