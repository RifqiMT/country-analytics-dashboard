/**
 * Growth change formatting for timeline and comparison views.
 * For metrics that are already in percentage (e.g. inflation, unemployment, poverty),
 * change is shown in basis points (bps): 1 bps = 0.01 percentage point.
 * Formula: bps = (current − previous) × 100 when both values are in %.
 */

/** Metric IDs that are stored as percentage (0–100 or ratio×100). Growth for these is shown in bps. */
export const PERCENTAGE_METRIC_IDS = new Set<string>([
  'inflationCPI',
  'govDebtPercentGDP',
  'interestRate',
  'unemploymentRate',
  'povertyHeadcount215',
  'povertyHeadcountNational',
  'outOfSchoolPrimaryPct',
  'outOfSchoolSecondaryPct',
  'outOfSchoolTertiaryPct',
  'primaryCompletionRate',
  'secondaryCompletionRate',
  'tertiaryCompletionRate',
  'minProficiencyReadingPct',
  'literacyRateAdultPct',
  'trainedTeachersPrimaryPct',
  'trainedTeachersSecondaryPct',
  'trainedTeachersTertiaryPct',
  'publicExpenditureEducationPctGDP',
  'primaryEnrollmentPct',
  'secondaryEnrollmentPct',
  'tertiaryEnrollmentPct',
  'pop0_14Pct',
  'pop15_64Pct',
  'pop65PlusPct',
  'pop0_14Share',
  'pop15_64Share',
  'pop65PlusShare',
  'undernourishmentPrevalence',
  'genderParityIndexPrimary', // ratio but change in pp → bps
  'genderParityIndexSecondary',
  'genderParityIndexTertiary',
]);

export function isPercentageMetric(metricId: string): boolean {
  return PERCENTAGE_METRIC_IDS.has(metricId);
}

/**
 * Format growth change for display.
 * For percentage metrics: absolute change in percentage points × 100 = bps (e.g. "+50 bps").
 * For other metrics: relative percentage change (e.g. "+2.5%").
 * @param current - Current period value
 * @param previous - Previous period value (must be non-null for relative %)
 * @param freqLabel - Label for frequency (e.g. "YoY", "MoM")
 * @param metricId - Metric ID; if in PERCENTAGE_METRIC_IDS, use bps
 * @returns Formatted string e.g. "+50 bps YoY" or "+2.5% YoY", or null if invalid
 */
export function formatGrowthChange(
  current: number,
  previous: number | null | undefined,
  freqLabel: string,
  metricId: string,
): string | null {
  if (current == null || typeof current !== 'number' || !Number.isFinite(current)) return null;
  const useBps = isPercentageMetric(metricId);
  if (useBps) {
    const prev = previous != null && Number.isFinite(previous) ? previous : 0;
    const changePp = current - prev;
    const bps = Math.round(changePp * 100);
    const sign = bps > 0 ? '+' : '';
    return `${sign}${bps} bps ${freqLabel}`;
  }
  if (previous == null || typeof previous !== 'number' || !Number.isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(pct)) return null;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% ${freqLabel}`;
}

/**
 * Format growth change without frequency label (e.g. for table cells).
 * For percentage metrics returns "+50 bps", else "+2.5%".
 */
export function formatGrowthChangeShort(
  current: number,
  previous: number | null | undefined,
  metricId: string,
): string | null {
  if (current == null || typeof current !== 'number' || !Number.isFinite(current)) return null;
  const useBps = isPercentageMetric(metricId);
  if (useBps) {
    const prev = previous != null && Number.isFinite(previous) ? previous : 0;
    const bps = Math.round((current - prev) * 100);
    const sign = bps > 0 ? '+' : '';
    return `${sign}${bps} bps`;
  }
  if (previous == null || typeof previous !== 'number' || !Number.isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(pct)) return null;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
