import { describe, expect, it } from 'vitest';
import type { GlobalCountryMetricsRow } from '../types';
import {
  computeGlobalValue,
  toGlobalAggregateOption,
  GLOBAL_ECONOMIC_AGGREGATES,
  GLOBAL_LABOUR_AGGREGATES,
} from './globalAggregates';

const rows: GlobalCountryMetricsRow[] = [
  {
    iso2Code: 'A',
    name: 'A',
    year: 2020,
    gdpNominal: 100,
    populationTotal: 10,
    govDebtUSD: 50,
    govDebtPercentGDP: 50,
    unemployedTotal: 1,
    labourForceTotal: 5,
  },
  {
    iso2Code: 'B',
    name: 'B',
    year: 2020,
    gdpNominal: 300,
    populationTotal: 30,
    govDebtUSD: 150,
    govDebtPercentGDP: 50,
    unemployedTotal: 3,
    labourForceTotal: 15,
  },
];

describe('globalAggregates.computeGlobalValue', () => {
  it('computes ratio-of-totals with scaling', () => {
    const option = toGlobalAggregateOption({
      globalFromRatio: { numeratorKey: 'govDebtUSD', denominatorKey: 'gdpNominal', scale: 100 },
    })!;
    const result = computeGlobalValue(rows, 'govDebtPercentGDP', option);
    // (50+150)/(100+300) * 100 = 50
    expect(result).toBeCloseTo(50);
  });

  it('returns null when denominator is non-positive', () => {
    const badRows = rows.map((r) => ({ ...r, gdpNominal: 0 }));
    const option = toGlobalAggregateOption({
      globalFromRatio: { numeratorKey: 'govDebtUSD', denominatorKey: 'gdpNominal' },
    })!;
    const result = computeGlobalValue(badRows, 'govDebtPercentGDP', option);
    expect(result).toBeNull();
  });

  it('computes weighted average', () => {
    const option = toGlobalAggregateOption({
      globalFromWeightedAverage: { weightKey: 'populationTotal' },
    })!;
    const result = computeGlobalValue(rows, 'govDebtPercentGDP', option);
    // both countries have 50%, so weighted avg is 50
    expect(result).toBeCloseTo(50);
  });

  it('computes sum and average', () => {
    const sum = computeGlobalValue(rows, 'unemployedTotal', { kind: 'sum' });
    const avg = computeGlobalValue(rows, 'unemployedTotal', { kind: 'average' });
    expect(sum).toBe(4);
    expect(avg).toBe(2);
  });
});

describe('globalAggregates helpers', () => {
  it('toGlobalAggregateOption maps ratio and weighted config', () => {
    const ratioOpt = toGlobalAggregateOption({
      globalFromRatio: { numeratorKey: 'govDebtUSD', denominatorKey: 'gdpNominal', scale: 100 },
    });
    expect(ratioOpt).toEqual({
      kind: 'ratio',
      numeratorKey: 'govDebtUSD',
      denominatorKey: 'gdpNominal',
      scale: 100,
    });

    const weightedOpt = toGlobalAggregateOption({
      globalFromWeightedAverage: { weightKey: 'populationTotal' },
    });
    expect(weightedOpt).toEqual({
      kind: 'weighted',
      weightKey: 'populationTotal',
    });

    expect(toGlobalAggregateOption(undefined)).toBeNull();
  });

  it('exposes aggregate configs for economic and labour metrics', () => {
    expect(GLOBAL_ECONOMIC_AGGREGATES.inflationCPI.option.kind).toBe('weighted');
    expect(GLOBAL_LABOUR_AGGREGATES.unemployedTotal.option.kind).toBe('sum');
  });
});

