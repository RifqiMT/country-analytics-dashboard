import { describe, expect, it } from 'vitest';
import { buildChatSystemPrompt, type GlobalRowForPrompt } from './chatContext';
import type { CountryDashboardData } from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';

describe('chatContext.buildChatSystemPrompt', () => {
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
    series: { financial: [], population: [], health: [], education: [] },
    latestSnapshot: {
      country: {
        iso2Code: 'ID',
        name: 'Indonesia',
      },
      year: DATA_MAX_YEAR,
      metrics: {
        financial: {
          gdpNominal: 1_000_000_000_000,
          gdpPPP: 3_000_000_000_000,
          gdpNominalPerCapita: 4000,
          gdpPPPPerCapita: 12000,
          inflationCPI: 3,
          govDebtPercentGDP: 40,
          govDebtUSD: 400_000_000_000,
          interestRate: 5,
        },
        population: {
          total: 270_000_000,
          ageBreakdown: {
            year: DATA_MAX_YEAR,
            total: 270_000_000,
            groups: [
              { id: '0_14', label: '0-14', percentageOfPopulation: 25, absolute: 67_500_000 },
              { id: '15_64', label: '15-64', percentageOfPopulation: 68, absolute: 183_600_000 },
              { id: '65_plus', label: '65+', percentageOfPopulation: 7, absolute: 18_900_000 },
            ],
          },
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

  const globalRow: GlobalRowForPrompt = {
    name: 'Indonesia',
    iso2Code: 'ID',
    gdpNominal: 1_000_000_000_000,
    gdpPPP: 3_000_000_000_000,
    gdpNominalPerCapita: 4000,
    gdpPPPPerCapita: 12000,
    populationTotal: 270_000_000,
    lifeExpectancy: 72,
    inflationCPI: 3,
    govDebtPercentGDP: 40,
    govDebtUSD: 400_000_000_000,
    interestRate: 5,
    landAreaKm2: 1_900_000,
    totalAreaKm2: 1_900_000,
    eezKm2: 6_000_000,
    pop0_14Pct: 25,
    pop15_64Pct: 68,
    pop65PlusPct: 7,
    region: 'East Asia & Pacific',
    headOfGovernmentType: 'President',
    governmentType: 'Republic',
  };

  it('builds a rich prompt containing metrics, sources and guidelines', () => {
    const prompt = buildChatSystemPrompt(
      dashboardData,
      [globalRow],
      { [DATA_MAX_YEAR]: [globalRow] },
      { userQuery: 'GDP and inflation of Indonesia in 2020', compact: false, effectiveYear: DATA_MAX_YEAR },
    );

    expect(prompt).toContain('Country Analytics Platform');
    expect(prompt).toContain('World Bank WDI');
    expect(prompt).toContain('Indonesia');
    expect(prompt).toContain('GDP (Nominal)');
    expect(prompt).toContain('Inflation (CPI)');
    expect(prompt).toContain('## Global data');
    expect(prompt).toContain('## Guidelines');
  });

  it('supports compact mode for free-tier usage', () => {
    const prompt = buildChatSystemPrompt(
      undefined,
      [globalRow],
      null,
      { userQuery: 'Top 5 countries by GDP', compact: true },
    );

    expect(prompt).toContain('You are an analytics assistant');
    expect(prompt).toContain('Sources: World Bank WDI, IMF WEO');
    expect(prompt.length).toBeGreaterThan(0);
  });
});

