import { getCache, setCache } from "./cache.js";
import { fetchWithRetry } from "./httpClient.js";

export interface WbCountryProfile {
  iso3: string;
  name: string;
  capitalCity: string;
  region: string;
  incomeLevel: string;
  lendingType: string;
  latitude: string;
  longitude: string;
}

function parse(raw: unknown): WbCountryProfile | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const row = (raw[1] as unknown[])[0];
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string") return null;
  const regionObj = o.region;
  const region =
    regionObj && typeof regionObj === "object" && "value" in regionObj
      ? String((regionObj as { value?: string }).value ?? "")
      : "";
  const inc = o.incomeLevel;
  const incomeLevel =
    inc && typeof inc === "object" && "value" in inc
      ? String((inc as { value?: string }).value ?? "")
      : "";
  const lend = o.lendingType;
  const lendingType =
    lend && typeof lend === "object" && "value" in lend
      ? String((lend as { value?: string }).value ?? "")
      : "";
  return {
    iso3: id,
    name: String(o.name ?? id),
    capitalCity: String(o.capitalCity ?? ""),
    region,
    incomeLevel,
    lendingType,
    latitude: String(o.latitude ?? ""),
    longitude: String(o.longitude ?? ""),
  };
}

export async function fetchWbCountryProfile(iso3: string): Promise<WbCountryProfile | null> {
  const key = `wbcountry:${iso3}`;
  const cached = getCache<WbCountryProfile | null>(key);
  if (cached !== undefined) return cached;
  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(iso3)}?format=json`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    setCache(key, null, 1000 * 60 * 5);
    return null;
  }
  const raw = (await res.json()) as unknown;
  const profile = parse(raw);
  setCache(key, profile, 1000 * 60 * 60 * 12);
  return profile;
}
