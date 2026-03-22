import { getCache, setCache } from "./cache.js";
import { fetchWithRetry } from "./httpClient.js";
import type { SeriesPoint } from "./series.js";
import { currentDataYear, MIN_DATA_YEAR } from "./yearBounds.js";
import { canonicalWbIso3 } from "./wdiParse.js";

const IMF_DATAMAPPER = "https://www.imf.org/external/datamapper/api/v1";

/** IMF DataMapper uses ISO 3-letter codes; a few differ from common WB/REST usage */
const IMF_COUNTRY_CODE: Record<string, string> = {
  // World Bank / REST "ROM" is historical; modern Romania is ROU everywhere relevant
  ROM: "ROU",
};

function buildPeriodsParam(startYear: number, endYear: number): string {
  const parts: string[] = [];
  for (let y = startYear; y <= endYear; y++) parts.push(String(y));
  return parts.join(",");
}

function parseImfSeries(
  raw: unknown,
  indicator: string,
  imfCountry: string,
  startYear: number,
  endYear: number
): SeriesPoint[] {
  if (!raw || typeof raw !== "object") return [];
  const values = (raw as { values?: Record<string, Record<string, Record<string, number>>> }).values;
  const byYear = values?.[indicator]?.[imfCountry];
  if (!byYear || typeof byYear !== "object") return [];
  const out: SeriesPoint[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const key = String(y);
    const v: unknown = byYear[key];
    let n: number | null = null;
    if (typeof v === "number" && Number.isFinite(v)) n = v;
    else if (typeof v === "string") {
      const t = v.trim();
      if (t !== "" && t !== "..") {
        const p = Number(t);
        if (Number.isFinite(p)) n = p;
      }
    }
    out.push({ year: y, value: n });
  }
  return out;
}

/**
 * IMF WEO series via public DataMapper JSON API (GGXWDG_NGDP = general government gross debt, % of GDP).
 */
export async function fetchImfWeoSeries(
  countryIso3: string,
  indicator: string,
  startYear = MIN_DATA_YEAR,
  endYear = currentDataYear()
): Promise<SeriesPoint[]> {
  const iso = canonicalWbIso3(countryIso3.toUpperCase());
  const imfCountry = IMF_COUNTRY_CODE[iso] ?? iso;
  const periods = buildPeriodsParam(startYear, endYear);
  const cacheKey = `imf:${indicator}:${imfCountry}:${startYear}:${endYear}`;
  const cached = getCache<SeriesPoint[]>(cacheKey);
  if (cached) return cached;

  const url = `${IMF_DATAMAPPER}/${encodeURIComponent(indicator)}/${encodeURIComponent(
    imfCountry
  )}?periods=${encodeURIComponent(periods)}`;
  const res = await fetchWithRetry(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const empty = parseImfSeries({}, indicator, imfCountry, startYear, endYear);
    setCache(cacheKey, empty, 1000 * 60 * 30);
    return empty;
  }
  const raw = (await res.json()) as unknown;
  const series = parseImfSeries(raw, indicator, imfCountry, startYear, endYear);
  setCache(cacheKey, series, 1000 * 60 * 60 * 12);
  return series;
}
