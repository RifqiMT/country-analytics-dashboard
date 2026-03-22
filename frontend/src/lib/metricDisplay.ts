import type { MetricDef } from "../api";

/**
 * Ids used in derived series (charts) — keep in sync with `backend/src/metricShortLabels.ts`.
 */
const DERIVED_SHORT: Record<string, string> = {
  unemployed: "Unemployed (number)",
  labour: "Labour force (total)",
};

function humanizeMetricId(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Compact label for charts, cards, and selectors (API `shortLabel` when present). */
export function metricDisplayLabel(m: Pick<MetricDef, "label" | "shortLabel">): string {
  const s = m.shortLabel?.trim();
  if (s) return s;
  return m.label;
}

export function metricDisplayLabelFromId(id: string, catalog: MetricDef[]): string {
  if (DERIVED_SHORT[id]) return DERIVED_SHORT[id];
  const m = catalog.find((x) => x.id === id);
  if (m) return metricDisplayLabel(m);
  return humanizeMetricId(id);
}
