import type { PorterAnalysis } from "../types/porter";

const STORAGE_KEY = "cap_porter_analysis_v1";

type CacheEntry = { analysis: PorterAnalysis; attribution: string[] };

type CacheMap = Record<string, CacheEntry>;

function cacheKey(cca3: string, industrySector: string): string {
  return `${cca3.trim().toUpperCase()}::${industrySector.trim()}`;
}

function readMap(): CacheMap {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === "object" && !Array.isArray(p) ? (p as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: CacheMap) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or private mode */
  }
}

/** Last successful Porter run for this country + industry (persists across routes until overwritten by Generate). */
export function loadPorterFromCache(cca3: string, industrySector: string): CacheEntry | null {
  if (!cca3.trim()) return null;
  const key = cacheKey(cca3, industrySector);
  const hit = readMap()[key];
  return hit?.analysis ? hit : null;
}

export function savePorterToCache(
  cca3: string,
  industrySector: string,
  analysis: PorterAnalysis,
  attribution: string[]
) {
  const key = cacheKey(cca3, industrySector);
  if (!cca3.trim() || !industrySector.trim()) return;
  const map = readMap();
  map[key] = { analysis, attribution: attribution ?? [] };
  writeMap(map);
}
