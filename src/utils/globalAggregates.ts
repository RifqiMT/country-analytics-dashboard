/**
 * Shared global aggregate calculations so that Global Charts (Global Analytics)
 * and Country Comparison (Country Dashboard) show identical values for the same
 * year and metric. Formulas match the Country Comparison section exactly.
 */
import type { GlobalCountryMetricsRow } from '../types';

export type GlobalAggregateOption =
  | {
      kind: 'ratio';
      numeratorKey: keyof GlobalCountryMetricsRow;
      denominatorKey: keyof GlobalCountryMetricsRow;
      /** Optional multiplier for display (e.g. 100 for percentages). */
      scale?: number;
    }
  | {
      kind: 'weighted';
      weightKey: keyof GlobalCountryMetricsRow;
    }
  | { kind: 'sum' }
  | { kind: 'average' };

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/**
 * Compute the global value for a metric from a set of country rows.
 * Uses the same formulas as Country Comparison: ratio-of-totals, weighted average, sum, or simple average.
 */
export function computeGlobalValue(
  rows: GlobalCountryMetricsRow[],
  valueKey: keyof GlobalCountryMetricsRow,
  option: GlobalAggregateOption,
): number | null {
  if (option.kind === 'ratio') {
    const { numeratorKey, denominatorKey, scale = 1 } = option;
    const pairs = rows
      .map((r) => ({ num: r[numeratorKey], den: r[denominatorKey] }))
      .filter(
        (p): p is { num: number; den: number } =>
          isNumber(p.num) && isNumber(p.den) && p.den > 0,
      );
    if (!pairs.length) return null;
    const sumNum = pairs.reduce((a, p) => a + p.num, 0);
    const sumDen = pairs.reduce((a, p) => a + p.den, 0);
    if (sumDen <= 0) return null;
    const ratio = sumNum / sumDen;
    return scale !== 1 ? ratio * scale : ratio;
  }

  if (option.kind === 'weighted') {
    const { weightKey } = option;
    const pairs = rows
      .map((r) => ({ val: r[valueKey], w: r[weightKey] }))
      .filter(
        (p): p is { val: number; w: number } =>
          isNumber(p.val) && isNumber(p.w) && p.w > 0,
      );
    if (!pairs.length) return null;
    const sumW = pairs.reduce((a, p) => a + p.w, 0);
    const sumVW = pairs.reduce((a, p) => a + p.val * p.w, 0);
    return sumW > 0 ? sumVW / sumW : null;
  }

  const values = rows
    .map((r) => r[valueKey])
    .filter((v): v is number => isNumber(v));
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return option.kind === 'sum' ? sum : sum / values.length;
}

/** Metric config for global series: value key + aggregate option (matches Country Comparison). */
export const GLOBAL_ECONOMIC_AGGREGATES: Record<
  string,
  { valueKey: keyof GlobalCountryMetricsRow; option: GlobalAggregateOption }
> = {
  inflationCPI: {
    valueKey: 'inflationCPI',
    option: { kind: 'weighted', weightKey: 'gdpNominal' },
  },
  govDebtPercentGDP: {
    valueKey: 'govDebtPercentGDP',
    option: {
      kind: 'ratio',
      numeratorKey: 'govDebtUSD',
      denominatorKey: 'gdpNominal',
      scale: 100,
    },
  },
  interestRate: {
    valueKey: 'interestRate',
    option: { kind: 'weighted', weightKey: 'gdpNominal' },
  },
  unemploymentRate: {
    valueKey: 'unemploymentRate',
    option: {
      kind: 'ratio',
      numeratorKey: 'unemployedTotal',
      denominatorKey: 'labourForceTotal',
      scale: 100,
    },
  },
  povertyHeadcount215: {
    valueKey: 'povertyHeadcount215',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  povertyHeadcountNational: {
    valueKey: 'povertyHeadcountNational',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
};

export const GLOBAL_HEALTH_AGGREGATES: Record<
  string,
  { valueKey: keyof GlobalCountryMetricsRow; option: GlobalAggregateOption }
> = {
  maternalMortalityRatio: {
    valueKey: 'maternalMortalityRatio',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  under5MortalityRate: {
    valueKey: 'under5MortalityRate',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  undernourishmentPrevalence: {
    valueKey: 'undernourishmentPrevalence',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  lifeExpectancy: {
    valueKey: 'lifeExpectancy',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
};

export const GLOBAL_POP_STRUCTURE_AGGREGATES: Record<
  string,
  { valueKey: keyof GlobalCountryMetricsRow; option: GlobalAggregateOption }
> = {
  pop0_14Share: {
    valueKey: 'pop0_14Pct',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  pop15_64Share: {
    valueKey: 'pop15_64Pct',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
  pop65PlusShare: {
    valueKey: 'pop65PlusPct',
    option: { kind: 'weighted', weightKey: 'populationTotal' },
  },
};

/** Unified timeline: totals as sum, per-capita as ratio (same as Country Comparison). */
export const GLOBAL_UNIFIED_AGGREGATES: Record<
  string,
  { valueKey: keyof GlobalCountryMetricsRow; option: GlobalAggregateOption }
> = {
  gdpNominal: { valueKey: 'gdpNominal', option: { kind: 'sum' } },
  gdpPPP: { valueKey: 'gdpPPP', option: { kind: 'sum' } },
  gdpNominalPerCapita: {
    valueKey: 'gdpNominalPerCapita',
    option: {
      kind: 'ratio',
      numeratorKey: 'gdpNominal',
      denominatorKey: 'populationTotal',
    },
  },
  gdpPPPPerCapita: {
    valueKey: 'gdpPPPPerCapita',
    option: {
      kind: 'ratio',
      numeratorKey: 'gdpPPP',
      denominatorKey: 'populationTotal',
    },
  },
  govDebtUSD: { valueKey: 'govDebtUSD', option: { kind: 'sum' } },
  populationTotal: { valueKey: 'populationTotal', option: { kind: 'sum' } },
};

/**
 * Build GlobalAggregateOption from Country Comparison's options format.
 * So CountryTableSection uses the same computeGlobalValue as GlobalChartsSection.
 */
export function toGlobalAggregateOption(
  options?: {
    globalFromRatio?: {
      numeratorKey: keyof GlobalCountryMetricsRow;
      denominatorKey: keyof GlobalCountryMetricsRow;
      scale?: number;
    };
    globalFromWeightedAverage?: { weightKey: keyof GlobalCountryMetricsRow };
  },
): GlobalAggregateOption | null {
  if (!options) return null;
  if (options.globalFromRatio) {
    const { numeratorKey, denominatorKey, scale } = options.globalFromRatio;
    return { kind: 'ratio', numeratorKey, denominatorKey, scale };
  }
  if (options.globalFromWeightedAverage) {
    return { kind: 'weighted', weightKey: options.globalFromWeightedAverage.weightKey };
  }
  return null;
}
