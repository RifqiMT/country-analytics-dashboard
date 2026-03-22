import type { PestelAnalysis } from "../types/pestel";

const STORAGE_KEY = "cap_pestel_analysis_v1";

type CacheEntry = { analysis: PestelAnalysis; attribution: string[] };

type CacheMap = Record<string, CacheEntry>;

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

/** Last successful PESTEL for this ISO3, if any (survives route changes until overwritten by Generate). */
export function loadPestelFromCache(cca3: string): CacheEntry | null {
  const key = cca3.trim().toUpperCase();
  if (!key) return null;
  const hit = readMap()[key];
  return hit?.analysis ? hit : null;
}

export function savePestelToCache(cca3: string, analysis: PestelAnalysis, attribution: string[]) {
  const key = cca3.trim().toUpperCase();
  if (!key) return;
  const map = readMap();
  map[key] = { analysis, attribution: attribution ?? [] };
  writeMap(map);
}
