/**
 * UNESCO Institute for Statistics (UIS) Data API client.
 * Used for tertiary education teachers (indicator not in World Bank WDI).
 * API: https://api.uis.unesco.org/api/public/documentation
 */
import axios from 'axios';
import type { TimePoint } from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

const UIS_API_BASE = 'https://api.uis.unesco.org/api/public';

/** UIS indicator: Teachers in tertiary education programmes, both sexes (number). */
const TERTIARY_TEACHERS_INDICATOR_ID = '25003';

interface UISIndicatorRecord {
  indicatorId: string;
  geoUnit: string;
  year: number;
  value: number | null;
}

interface UISIndicatorDataResponse {
  records: UISIndicatorRecord[];
  hints?: Array<{ code: string; message: string }>;
}

/**
 * Fetch tertiary education teachers (both sexes) for one country as a time series.
 * Returns empty array if the indicator is not available or API fails.
 */
export async function fetchTertiaryInstitutionsSeries(
  iso3Code: string,
  startYear: number = DATA_MIN_YEAR,
  endYear: number = DATA_MAX_YEAR,
): Promise<TimePoint[]> {
  const start = Math.max(startYear, DATA_MIN_YEAR);
  const end = Math.min(endYear, DATA_MAX_YEAR);
  try {
    const { data } = await axios.get<UISIndicatorDataResponse>(
      `${UIS_API_BASE}/data/indicators`,
      {
        params: {
          indicator: TERTIARY_TEACHERS_INDICATOR_ID,
          geoUnit: iso3Code.toUpperCase(),
          start,
          end,
        },
        timeout: 15000,
        headers: { 'Accept-Encoding': 'gzip' },
      },
    );
    const records = data?.records ?? [];
    return records
      .filter((r) => r.year >= start && r.year <= end && r.value != null && Number.isFinite(r.value))
      .map((r) => ({
        date: `${r.year}-01-01`,
        year: r.year,
        value: r.value as number,
      }))
      .sort((a, b) => a.year - b.year);
  } catch {
    return [];
  }
}

/**
 * Fetch tertiary education teachers for many countries for a single year.
 * Returns a Map from ISO3 to value (or undefined if missing).
 */
export async function fetchTertiaryInstitutionsForYear(
  iso3Codes: string[],
  year: number,
): Promise<Map<string, number>> {
  if (iso3Codes.length === 0) return new Map();
  if (year < DATA_MIN_YEAR || year > DATA_MAX_YEAR) return new Map();
  try {
    const { data } = await axios.get<UISIndicatorDataResponse>(
      `${UIS_API_BASE}/data/indicators`,
      {
        params: {
          indicator: TERTIARY_TEACHERS_INDICATOR_ID,
          geoUnit: iso3Codes.map((c) => c.toUpperCase()),
          start: year,
          end: year,
        },
        timeout: 20000,
        headers: { 'Accept-Encoding': 'gzip' },
      },
    );
    const map = new Map<string, number>();
    const records = data?.records ?? [];
    for (const r of records) {
      if (r.year === year && r.value != null && Number.isFinite(r.value)) {
        map.set(r.geoUnit.toUpperCase(), r.value);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}
