import { getCache, setCache } from "./cache.js";
import { fetchWithRetry } from "./httpClient.js";

/**
 * Sea Around Us exposes EEZ area (km²) per UN M.49 numeric code in the URL path.
 * Many large economies are missing; callers should fall back to {@link EEZ_SQKM_FALLBACK}.
 */
export async function fetchSeaAroundUsEezAreaKm2(ccn3: string | undefined): Promise<number | null> {
  if (!ccn3 || !/^\d{1,3}$/.test(ccn3.trim())) return null;
  const code = ccn3.trim().padStart(3, "0");
  const cacheKey = `sau:eez:${code}`;
  const hit = getCache<number | null>(cacheKey);
  if (hit !== undefined) return hit;

  try {
    const res = await fetchWithRetry(
      `https://api.seaaroundus.org/api/v1/eez/${code}`,
      { headers: { Accept: "application/json" } },
      { attempts: 5, baseDelayMs: 500 }
    );
    if (!res.ok) {
      setCache(cacheKey, null, 1000 * 60 * 60 * 12);
      return null;
    }
    const j = (await res.json()) as {
      data?: { metrics?: Array<{ title?: string; value?: unknown }> };
    };
    const metrics = j.data?.metrics;
    const row = metrics?.find((m) => m.title === "EEZ area");
    const n = row?.value;
    const num = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(num)) {
      setCache(cacheKey, null, 1000 * 60 * 60 * 6);
      return null;
    }
    setCache(cacheKey, num, 1000 * 60 * 60 * 24);
    return num;
  } catch {
    setCache(cacheKey, null, 1000 * 60 * 30);
    return null;
  }
}
