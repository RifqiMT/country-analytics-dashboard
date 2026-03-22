/** Earliest year used in WDI ranges across the API. */
export const MIN_DATA_YEAR = 2000;

export function currentDataYear(): number {
  return new Date().getFullYear();
}

/** Clamp a calendar year to [MIN_DATA_YEAR, currentDataYear()]. */
export function clampYear(y: number): number {
  if (!Number.isFinite(y)) return currentDataYear();
  const yi = Math.floor(y);
  const maxY = currentDataYear();
  return Math.min(Math.max(yi, MIN_DATA_YEAR), maxY);
}

/**
 * World Bank WDI global snapshots rarely include the current calendar year in full.
 * When the UI requests the current or a future year, use the latest year we expect WDI to publish.
 */
export function resolveGlobalWdiYear(requestedYear: number): number {
  const y = Math.floor(requestedYear);
  const cal = currentDataYear();
  if (!Number.isFinite(y)) return Math.max(MIN_DATA_YEAR, cal - 1);
  const clamped = Math.min(Math.max(y, MIN_DATA_YEAR), cal);
  if (clamped >= cal) return Math.max(MIN_DATA_YEAR, cal - 1);
  return clamped;
}

/** Clamp start/end, ensure start <= end, both within bounds. */
export function clampYearRange(start: number, end: number): { start: number; end: number } {
  let s = clampYear(start);
  let e = clampYear(end);
  if (s > e) {
    const t = s;
    s = e;
    e = t;
  }
  return { start: s, end: e };
}
