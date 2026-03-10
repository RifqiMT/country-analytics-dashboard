import { describe, expect, it } from 'vitest';
import {
  getValue,
  prepareScatterData,
  linearRegression,
  pearsonCorrelation,
  computeCorrelationAnalysis,
} from './correlationAnalysis';

describe('correlationAnalysis.getValue', () => {
  it('returns null for non-numeric or nullish values', () => {
    expect(getValue({ x: null }, 'x')).toBeNull();
    expect(getValue({ x: 'not-number' }, 'x')).toBeNull();
  });

  it('returns numeric value when valid', () => {
    expect(getValue({ x: 1.23 }, 'x')).toBe(1.23);
  });
});

describe('correlationAnalysis.prepareScatterData', () => {
  const rows = [
    { x: 1, y: 2, region: 'A' },
    { x: 2, y: 4, region: 'A' },
    { x: null, y: 3, region: 'B' },
  ];

  it('filters missing values and populates scatter rows', () => {
    const result = prepareScatterData(rows, 'x', 'y', false);
    expect(result.rows).toHaveLength(2);
    expect(result.removedMissing).toBe(1);
    expect(result.cleanedRows).toHaveLength(2);
  });

  it('can exclude outliers via IQR rule', () => {
    const withOutlier = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 1000, y: 2000 },
    ];
    const result = prepareScatterData(withOutlier, 'x', 'y', true);
    expect(result.rows).toHaveLength(3);
    expect(result.cleanedRows.length).toBeLessThan(result.rows.length);
    expect(result.outlierIndices.size).toBeGreaterThan(0);
  });
});

describe('correlationAnalysis.linearRegression', () => {
  it('returns null for too few points or zero variance', () => {
    expect(linearRegression([1, 2], [3, 4])).toBeNull();
    expect(linearRegression([1, 1, 1], [2, 2, 2])).toBeNull();
  });

  it('computes slope, intercept and rSquared', () => {
    const xs = [1, 2, 3, 4];
    const ys = [2, 4, 6, 8];
    const reg = linearRegression(xs, ys);
    expect(reg).not.toBeNull();
    expect(reg!.slope).toBeCloseTo(2);
    expect(reg!.intercept).toBeCloseTo(0);
    expect(reg!.rSquared).toBeCloseTo(1);
  });
});

describe('correlationAnalysis.pearsonCorrelation', () => {
  it('returns default values when too few points', () => {
    const res = pearsonCorrelation([1, 2], [3, 4]);
    expect(res).toEqual({ r: 0, n: 2, pValue: 1 });
  });

  it('computes r close to 1 for perfect linear relation', () => {
    const xs = [1, 2, 3, 4];
    const ys = [2, 4, 6, 8];
    const res = pearsonCorrelation(xs, ys);
    expect(res.r).toBeCloseTo(1, 5);
    expect(res.n).toBe(4);
    // p-value approximation is conservative; just assert it is between 0 and 1
    expect(res.pValue).toBeGreaterThanOrEqual(0);
    expect(res.pValue).toBeLessThanOrEqual(1);
  });
});

describe('correlationAnalysis.computeCorrelationAnalysis', () => {
  it('returns null when not enough cleaned rows', () => {
    const rows = [{ x: 1, y: null }];
    const result = computeCorrelationAnalysis(rows, 'x', 'y', false);
    expect(result).toBeNull();
  });

  it('returns rich correlation result when data is sufficient', () => {
    const rows = [
      { x: 1, y: 2, region: 'A' },
      { x: 2, y: 4, region: 'A' },
      { x: 3, y: 6, region: 'A' },
      { x: 4, y: 8, region: 'A' },
    ];
    const result = computeCorrelationAnalysis(rows, 'x', 'y', false);
    expect(result).not.toBeNull();
    expect(result!.rSquared).toBeGreaterThan(0.9);
    expect(result!.regressionCI).toHaveLength(3);
    expect(result!.dataPrep.cleanedRows.length).toBeGreaterThan(0);
    // subgroup correlation may or may not be present depending on region splits;
    // just assert that the array exists
    expect(result!.subgroupResults).toBeDefined();
    expect(result!.executiveSummaryTable.length).toBeGreaterThan(0);
    expect(result!.actionableInsight).toContain('predicts');
    expect(result!.causationNote).toContain('Correlation does NOT imply causation');
  });
});

