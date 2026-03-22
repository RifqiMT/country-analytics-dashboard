/**
 * How a yearly value was produced after merges and gap-filling (dashboard / API audit trail).
 * Omitted when `value` is null or for legacy cached payloads.
 */
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

export interface SeriesPoint {
  year: number;
  value: number | null;
  provenance?: SeriesProvenance;
}
