import { describe, expect, it } from 'vitest';
import {
  getFallbackResponse,
  FALLBACK_GENERIC_HELP_MARKER,
  type GlobalCountryRowForFallback,
  type DashboardSnapshotForFallback,
} from './chatFallback';
import { DATA_MAX_YEAR } from '../config';

const globalRow: GlobalCountryRowForFallback = {
  name: 'Indonesia',
  iso2Code: 'ID',
  gdpNominal: 1_000_000_000_000,
  gdpNominalPerCapita: 4000,
  populationTotal: 270_000_000,
  lifeExpectancy: 72,
  inflationCPI: 3,
  govDebtPercentGDP: 40,
  govDebtUSD: 400_000_000_000,
  interestRate: 5,
  region: 'East Asia & Pacific',
  headOfGovernmentType: 'President',
  governmentType: 'Republic',
};

const snapshot: DashboardSnapshotForFallback = {
  countryName: 'Indonesia',
  year: DATA_MAX_YEAR,
  summary: {
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
      unemploymentRate: 5,
      unemployedTotal: 5_000_000,
      labourForceTotal: 100_000_000,
      povertyHeadcount215: 5,
      povertyHeadcountNational: 10,
    },
    population: {
      total: 270_000_000,
      ageBreakdown: {
        groups: [
          { id: '0_14', percentageOfPopulation: 25 },
          { id: '15_64', percentageOfPopulation: 68 },
          { id: '65_plus', percentageOfPopulation: 7 },
        ],
      },
    },
    health: {
      lifeExpectancy: 72,
      maternalMortalityRatio: 120,
      under5MortalityRate: 20,
      undernourishmentPrevalence: 5,
    },
    geography: {
      landAreaKm2: 1_900_000,
      totalAreaKm2: 1_900_000,
      eezKm2: 6_000_000,
    },
  },
};

describe('chatFallback.getFallbackResponse', () => {
  it('returns generic help marker for pure geography/location questions', () => {
    const res = getFallbackResponse('Where is Indonesia located?', snapshot, [globalRow], null);
    expect(res).toBe(FALLBACK_GENERIC_HELP_MARKER);
  });

  it('returns country overview for "all information" style query', () => {
    const res = getFallbackResponse('Give me all information about Indonesia', snapshot, [globalRow], null);
    expect(res).toContain('Indonesia – Full overview');
    expect(res).toContain('GDP (Nominal)');
    expect(res).toContain('Population:');
    expect(res).toContain('Life expectancy:');
  });

  it('returns ranking style answer for top countries by GDP', () => {
    const res = getFallbackResponse(
      'Top 5 countries by GDP',
      null,
      [globalRow],
      null,
    );
    expect(res).toContain('Top 5 countries');
  });

  it('returns default help for generic help queries', () => {
    const res = getFallbackResponse('help', snapshot, [globalRow], null);
    expect(res).toContain('I can help with questions about **all metrics**');
  });
});

