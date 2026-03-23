export type BusinessAnalysisConfig = {
  metricX: string;
  metricY: string;
  startYear: number;
  endYear: number;
  excludeIqr: boolean;
  highlight: string;
};

export type BusinessCorrelationNarrative = {
  associationParagraphs: [string, string];
  correlationBullets: [string, string, string];
  causationParagraph: string;
  causationHypotheses: [string, string, string];
  recommendedAnalyses: [string, string, string];
};

type CacheEntry = {
  v: 1;
  config: BusinessAnalysisConfig;
  // CorrResult is intentionally typed as unknown to avoid coupling this helper
  // to the page-local CorrResult type. Consumers cast on read.
  res: unknown;
  narrative: BusinessCorrelationNarrative | null;
};

const STORAGE_KEY = "cap_business_correlation_v1";

function safeRead(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const e = p as Partial<CacheEntry>;
    if (e.v !== 1 || !e.config || !("res" in e)) return null;
    return e as CacheEntry;
  } catch {
    return null;
  }
}

export function loadBusinessCorrelationFromCache(): CacheEntry | null {
  return safeRead();
}

export function saveBusinessCorrelationToCache(entry: CacheEntry): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota/private mode */
  }
}

