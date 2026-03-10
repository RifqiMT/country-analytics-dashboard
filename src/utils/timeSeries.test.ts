import { describe, expect, it } from 'vitest';
import { resampleSeries } from './timeSeries';
import type { MetricSeries } from '../types';

const baseSeries: MetricSeries = {
  id: 'gdpNominal',
  label: 'GDP',
  unit: 'USD',
  points: [
    { year: 2000, date: '2000-01-01', value: 100 },
    { year: 2001, date: '2001-01-01', value: 200 },
  ],
};

describe('timeSeries.resampleSeries', () => {
  it('returns original series for yearly frequency', () => {
    const result = resampleSeries(baseSeries, 'yearly');
    expect(result.points).toEqual(baseSeries.points);
  });

  it('returns empty for empty input points', () => {
    const series: MetricSeries = { ...baseSeries, points: [] };
    const result = resampleSeries(series, 'monthly');
    expect(result.points).toEqual([]);
  });

  it('duplicates single point across target steps', () => {
    const single: MetricSeries = {
      ...baseSeries,
      points: [{ year: 2000, date: '2000-01-01', value: 50 }],
    };
    const result = resampleSeries(single, 'quarterly');
    expect(result.points).toHaveLength(4);
    expect(new Set(result.points.map((p) => p.value))).toEqual(new Set([50]));
  });

  it('interpolates between points for monthly frequency', () => {
    const result = resampleSeries(baseSeries, 'monthly');
    expect(result.points.length).toBeGreaterThan(12);
    // Check that we have values at both ends and they are within the expected range.
    const first = result.points[0]?.value;
    const last = result.points[result.points.length - 1]?.value;
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    if (first != null && last != null) {
      expect(first).toBeLessThanOrEqual(last);
    }
  });
});

