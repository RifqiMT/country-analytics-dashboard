const base = "";

function parseErrorDetail(text: string): { message: string; excerpt: string } {
  const trimmed = text.trim();
  let message = trimmed;
  try {
    const j = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof j.error === "string") message = j.error;
    else if (typeof j.message === "string") message = j.message;
  } catch {
    /* keep trimmed */
  }
  const excerpt = trimmed.length > 800 ? `${trimmed.slice(0, 800)}…` : trimmed;
  return { message: message || trimmed || "(empty response body)", excerpt };
}

function durationSecFrom(t0: number): number {
  const sec = (performance.now() - t0) / 1000;
  return Math.round(sec * 1000) / 1000;
}

let eventSeq = 0;
function nextEventId(): string {
  eventSeq = (eventSeq + 1) % 1_000_000_000;
  return `api-${Date.now()}-${eventSeq}`;
}

export type ApiTransportEvent =
  | {
      id: string;
      outcome: "success";
      method: "GET" | "POST";
      path: string;
      status: number;
      durationSec: number;
      responseBytes: number;
      at: number;
    }
  | {
      id: string;
      outcome: "failure";
      method: "GET" | "POST";
      path: string;
      status: number | null;
      durationSec: number;
      error: string;
      bodyExcerpt?: string;
      at: number;
    };

const transportSubscribers = new Set<(e: ApiTransportEvent) => void>();

export function subscribeApiTransport(cb: (e: ApiTransportEvent) => void): () => void {
  transportSubscribers.add(cb);
  return () => transportSubscribers.delete(cb);
}

function emitTransport(e: ApiTransportEvent): void {
  for (const fn of transportSubscribers) {
    try {
      fn(e);
    } catch {
      /* ignore */
    }
  }
}

/** Browser-side actions (CSV/PNG export, etc.) — not part of `subscribeApiTransport`. */
export type ClientToastEvent = {
  id: string;
  source: "client";
  outcome: "success" | "failure";
  title: string;
  detail?: string;
  durationSec?: number;
  error?: string;
  at: number;
};

let clientToastSeq = 0;
const clientToastSubscribers = new Set<(e: ClientToastEvent) => void>();

export function subscribeClientToast(cb: (e: ClientToastEvent) => void): () => void {
  clientToastSubscribers.add(cb);
  return () => clientToastSubscribers.delete(cb);
}

export function emitClientToast(
  payload: Omit<ClientToastEvent, "id" | "at" | "source"> & { id?: string }
): void {
  const e: ClientToastEvent = {
    id: payload.id ?? `client-${Date.now()}-${++clientToastSeq}`,
    source: "client",
    at: Date.now(),
    outcome: payload.outcome,
    title: payload.title,
    detail: payload.detail,
    durationSec: payload.durationSec,
    error: payload.error,
  };
  for (const fn of clientToastSubscribers) {
    try {
      fn(e);
    } catch {
      /* ignore */
    }
  }
}

function responseByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export async function getJson<T>(path: string): Promise<T> {
  const method = "GET" as const;
  const t0 = performance.now();
  const url = `${base}${path}`;
  let status: number | null = null;
  try {
    const res = await fetch(url);
    status = res.status;
    const text = await res.text();
    const durationSec = durationSecFrom(t0);
    if (!res.ok) {
      const { message, excerpt } = parseErrorDetail(text);
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status,
        durationSec,
        error: message || `Request failed (HTTP ${status})`,
        bodyExcerpt: excerpt || undefined,
        at: Date.now(),
      });
      throw new Error(message || `Request failed (HTTP ${status})`);
    }
    let data: T;
    try {
      data = (text ? JSON.parse(text) : null) as T;
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
      const excerpt = text.length > 800 ? `${text.slice(0, 800)}…` : text;
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status,
        durationSec,
        error: `JSON parse error: ${errMsg}`,
        bodyExcerpt: excerpt,
        at: Date.now(),
      });
      throw parseErr;
    }
    emitTransport({
      id: nextEventId(),
      outcome: "success",
      method,
      path,
      status,
      durationSec,
      responseBytes: responseByteLength(text),
      at: Date.now(),
    });
    return data;
  } catch (e) {
    const durationSec = durationSecFrom(t0);
    if (status === null) {
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status: null,
        durationSec,
        error: e instanceof Error ? e.message : String(e),
        at: Date.now(),
      });
    }
    throw e;
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const method = "POST" as const;
  const t0 = performance.now();
  const url = `${base}${path}`;
  let status: number | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    status = res.status;
    const text = await res.text();
    const durationSec = durationSecFrom(t0);
    if (!res.ok) {
      const { message, excerpt } = parseErrorDetail(text);
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status,
        durationSec,
        error: message || `Request failed (HTTP ${status})`,
        bodyExcerpt: excerpt || undefined,
        at: Date.now(),
      });
      throw new Error(message || `Request failed (HTTP ${status})`);
    }
    let data: T;
    try {
      data = (text ? JSON.parse(text) : null) as T;
    } catch (parseErr) {
      const errMsg = parseErr instanceof Error ? parseErr.message : "Invalid JSON";
      const excerpt = text.length > 800 ? `${text.slice(0, 800)}…` : text;
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status,
        durationSec,
        error: `JSON parse error: ${errMsg}`,
        bodyExcerpt: excerpt,
        at: Date.now(),
      });
      throw parseErr;
    }
    emitTransport({
      id: nextEventId(),
      outcome: "success",
      method,
      path,
      status,
      durationSec,
      responseBytes: responseByteLength(text),
      at: Date.now(),
    });
    return data;
  } catch (e) {
    const durationSec = durationSecFrom(t0);
    if (status === null) {
      emitTransport({
        id: nextEventId(),
        outcome: "failure",
        method,
        path,
        status: null,
        durationSec,
        error: e instanceof Error ? e.message : String(e),
        at: Date.now(),
      });
    }
    throw e;
  }
}

export type CountrySummary = {
  cca3: string;
  name: string;
  /** REST Countries `name.official` — matches map labels like "United States of America". */
  nameOfficial?: string;
  region: string;
  subregion: string;
  capital: string[];
  population: number;
  area: number;
  latlng: [number, number];
  flags: { png?: string; svg?: string };
  timezones?: string[];
  currencies?: string[];
  government?: string;
  /** Wikidata office label shortened (e.g. President), when REST Countries omits government. */
  headOfGovernmentTitle?: string;
  /** Exclusive economic zone area (km²); null if landlocked or unknown. */
  eezSqKm?: number | null;
  ccn3?: string;
  landlocked?: boolean;
  currencyDisplay?: string;
  /** ISO 3166-1 alpha-2 (REST Countries) — flag emoji / map patterns */
  cca2?: string;
};

export type WbCountryProfile = {
  iso3: string;
  name: string;
  capitalCity: string;
  region: string;
  incomeLevel: string;
  lendingType: string;
  latitude: string;
  longitude: string;
} | null;

export type MetricDef = {
  id: string;
  label: string;
  /** Canonical short name for charts, maps, and tables (from API) */
  shortLabel?: string;
  unit: string;
  category: string;
  worldBankCode: string;
  fallbackWorldBankCode?: string;
  imfWeoIndicator?: string;
  uisIndicatorId?: string;
  formula?: string;
  sourceUrl: string;
  sourceName: string;
  description: string;
};

/** Mirrors backend `SeriesProvenance` (`backend/src/series.ts`). */
export type SeriesProvenance =
  | "reported"
  | "wb_alternate_code"
  | "imf_weo"
  | "uis"
  | "derived_cross_metric"
  | "carried_short"
  | "interpolated"
  | "filled_range"
  | "wld_proxy";

export type SeriesPoint = {
  year: number;
  value: number | null;
  provenance?: SeriesProvenance;
};

/** Institutions and APIs (`GET /api/data-providers`). */
export type DataProviderDto = {
  id: string;
  institution: string;
  name: string;
  role: string;
  url: string;
  seriesMergeOrder?: number;
  usedFor: string[];
  notes?: string;
};

export type DataProvidersPayload = {
  seriesMergePipeline: string;
  providers: DataProviderDto[];
};
