/**
 * Normalise World Bank WDI JSON `value` fields (number, string, null, "..", NaN).
 */
export function parseWdiNumericValue(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "" || t === ".." || t === "…") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return null;
}

export function isUsableNumber(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function isMissingMetricValue(v: number | null | undefined): boolean {
  return !isUsableNumber(v);
}

/** Prefer a usable numeric observation over null when merging duplicate years. */
export function pickBetterObservation(a: number | null, b: number | null): number | null {
  if (isUsableNumber(b)) return b;
  if (isUsableNumber(a)) return a;
  return null;
}

/**
 * WDI sometimes returns legacy ISO3 codes; align with REST Countries / map datasets.
 */
export function canonicalWbIso3(iso3: string): string {
  const u = iso3.trim().toUpperCase();
  return WB_ISO3_CANONICAL[u] ?? u;
}

const WB_ISO3_CANONICAL: Record<string, string> = {
  ROM: "ROU",
  TMP: "TLS",
  ZAR: "COD",
};
