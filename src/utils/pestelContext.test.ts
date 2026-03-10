import { describe, expect, it } from 'vitest';
import { buildPestelSystemPrompt } from './pestelContext';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

describe('pestelContext.buildPestelSystemPrompt', () => {
  const dashboardData: CountryDashboardData = {
    summary: {
      iso2Code: 'ID',
      name: 'Indonesia',
      region: 'East Asia & Pacific',
      incomeLevel: 'Upper middle income',
      capitalCity: 'Jakarta',
      currencyCode: 'IDR',
      currencyName: 'Rupiah',
      government: 'Presidential republic',
      governmentType: 'Republic',
      headOfGovernmentType: 'President',
      timezone: 'Asia/Jakarta',
    },
    range: { startYear: DATA_MIN_YEAR, endYear: DATA_MAX_YEAR },
    series: {
      financial: [],
      population: [],
      health: [],
      education: [],
    },
    latestSnapshot: {
      country: {
        iso2Code: 'ID',
        name: 'Indonesia',
      },
      year: DATA_MAX_YEAR,
      metrics: {
        financial: {
          gdpNominal: 1_000_000_000_000,
          inflationCPI: 3,
          govDebtPercentGDP: 40,
        },
        population: {
          total: 270_000_000,
        },
        health: {
          lifeExpectancy: 72,
        },
        geography: {
          landAreaKm2: 1_900_000,
          totalAreaKm2: 1_900_000,
          eezKm2: 6_000_000,
        },
      },
    },
  };

  const globalMetrics: GlobalCountryMetricsRow[] = [
    {
      iso2Code: 'ID',
      name: 'Indonesia',
      year: DATA_MAX_YEAR,
      gdpNominalPerCapita: 4000,
      populationTotal: 270_000_000,
      lifeExpectancy: 72,
      inflationCPI: 3,
      govDebtPercentGDP: 40,
      region: 'East Asia & Pacific',
    },
    {
      iso2Code: 'MY',
      name: 'Malaysia',
      year: DATA_MAX_YEAR,
      gdpNominalPerCapita: 12000,
      populationTotal: 32_000_000,
      lifeExpectancy: 76,
      inflationCPI: 2,
      govDebtPercentGDP: 60,
      region: 'East Asia & Pacific',
    },
  ];

  it('builds a PESTEL prompt including country, trends, peers and instructions', () => {
    const prompt = buildPestelSystemPrompt(dashboardData, globalMetrics, DATA_MAX_YEAR);
    expect(prompt).toContain('comprehensive PESTEL');
    expect(prompt).toContain('Country: Indonesia');
    expect(prompt).toContain('Peer comparison');
    expect(prompt).toContain('Executive summary');
    expect(prompt).toContain('Political factors');
    expect(prompt).toContain('Strategic implications for business');
    expect(prompt).toContain('New market analysis');
    expect(prompt).toContain('Key takeaways');
  });
});

