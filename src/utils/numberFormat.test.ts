import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatPercentage, formatYearRange } from './numberFormat';

describe('numberFormat', () => {
  describe('formatCompactNumber', () => {
    it('returns dash for nullish or NaN', () => {
      expect(formatCompactNumber(null)).toBe('–');
      expect(formatCompactNumber(undefined as unknown as number)).toBe('–');
      expect(formatCompactNumber(Number.NaN)).toBe('–');
    });

    it('formats small numbers with locale separators', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(123)).toBe('123');
      expect(formatCompactNumber(1234)).toBe('1.23k');
    });

    it('formats thousands, millions, billions and trillions with suffixes', () => {
      expect(formatCompactNumber(1_234)).toBe('1.23k');
      expect(formatCompactNumber(1_234_567)).toBe('1.23 Mn');
      expect(formatCompactNumber(1_234_000_000)).toBe('1.23 Bn');
      expect(formatCompactNumber(1_234_000_000_000)).toBe('1.23 Tn');
    });

    it('preserves sign for negative values', () => {
      expect(formatCompactNumber(-1_234)).toBe('-1.23k');
      expect(formatCompactNumber(-1_234_567)).toBe('-1.23 Mn');
    });
  });

  describe('formatPercentage', () => {
    it('returns dash for nullish or NaN', () => {
      expect(formatPercentage(null)).toBe('–');
      expect(formatPercentage(undefined as unknown as number)).toBe('–');
      expect(formatPercentage(Number.NaN)).toBe('–');
    });

    it('formats with default 1 decimal', () => {
      expect(formatPercentage(1)).toBe('1.0%');
      expect(formatPercentage(1.234)).toBe('1.2%');
    });

    it('allows custom decimals', () => {
      expect(formatPercentage(1.234, { decimals: 2 })).toBe('1.23%');
    });
  });

  describe('formatYearRange', () => {
    it('returns single year when start equals end', () => {
      expect(formatYearRange(2020, 2020)).toBe('2020');
    });

    it('returns range when years differ', () => {
      expect(formatYearRange(2000, 2020)).toBe('2000–2020');
    });
  });
});

