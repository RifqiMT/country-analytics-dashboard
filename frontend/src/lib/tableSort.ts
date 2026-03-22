export type SortDir = "asc" | "desc";

/** First click on a column → asc; same column again → toggles direction. */
export function toggleColumnSort(
  prevCol: string | null,
  prevDir: SortDir,
  col: string
): { col: string; dir: SortDir } {
  if (prevCol !== col) return { col, dir: "asc" };
  return { col, dir: prevDir === "asc" ? "desc" : "asc" };
}

export function cmpNullableNumber(a: number | null | undefined, b: number | null | undefined, dir: SortDir): number {
  const na = a != null && Number.isFinite(a) ? a : null;
  const nb = b != null && Number.isFinite(b) ? b : null;
  if (na === null && nb === null) return 0;
  if (na === null) return 1;
  if (nb === null) return -1;
  const d = na - nb;
  return dir === "asc" ? d : -d;
}

export function cmpString(a: string, b: string, dir: SortDir): number {
  const c = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return dir === "asc" ? c : -c;
}
