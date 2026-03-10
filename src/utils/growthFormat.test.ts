import { describe, expect, it } from 'vitest';
import {
  PERCENTAGE_METRIC_IDS,
  isPercentageMetric,
  formatGrowthChange,
  formatGrowthChangeShort,
} from './growthFormat';

describe('growthFormat', () => {
  it('includes key percentage metric ids', () => {
    expect(isPercentageMetric('inflationCPI')).toBe(true);
    expect(isPercentageMetric('unemploymentRate')).toBe(true);
    expect(PERCENTAGE_METRIC_IDS.has('pop0_14Pct')).toBe(true);
  });

  describe('formatGrowthChange (bps path)', () => {
    it('uses bps for percentage metrics with previous defaulting to 0', () => {
      const result = formatGrowthChange(1.5, null, 'YoY', 'inflationCPI');
      expect(result).toBe('+150 bps YoY');
    });

    it('computes bps difference between current and previous', () => {
      const result = formatGrowthChange(2.0, 1.5, 'YoY', 'unemploymentRate');
      // (2.0 - 1.5) * 100 = 50 bps
      expect(result).toBe('+50 bps YoY');
    });
  });

  describe('formatGrowthChange (relative % path)', () => {
    it('returns null when previous is null or zero', () => {
      expect(formatGrowthChange(10, null, 'YoY', 'gdpNominal')).toBeNull();
      expect(formatGrowthChange(10, 0, 'YoY', 'gdpNominal')).toBeNull();
    });

    it('computes relative percentage change with sign and one decimal', () => {
      const up = formatGrowthChange(110, 100, 'YoY', 'gdpNominal');
      const down = formatGrowthChange(90, 100, 'YoY', 'gdpNominal');
      expect(up).toBe('+10.0% YoY');
      expect(down).toBe('-10.0% YoY');
    });
  });

  describe('formatGrowthChangeShort', () => {
    it('behaves like formatGrowthChange but without freq label for bps', () => {
      const result = formatGrowthChangeShort(2.0, 1.5, 'unemploymentRate');
      expect(result).toBe('+50 bps');
    });

    it('returns null for invalid inputs', () => {
      expect(formatGrowthChangeShort(Number.NaN, 10, 'gdpNominal')).toBeNull();
    });

    it('formats relative percent change for non-percentage metrics', () => {
      const result = formatGrowthChangeShort(110, 100, 'gdpNominal');
      expect(result).toBe('+10.0%');
    });
  });
});

