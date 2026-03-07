export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type FinancialMetricId =
  | 'gdpNominal'
  | 'gdpPPP'
  | 'gdpNominalPerCapita'
  | 'gdpPPPPerCapita'
  | 'inflationCPI'
  | 'govDebtPercentGDP'
  | 'govDebtUSD'
  | 'interestRate'
  | 'unemploymentRate'
  | 'unemployedTotal'
  | 'labourForceTotal'
  | 'povertyHeadcount215'
  | 'povertyHeadcountNational';

export type PopulationMetricId = 'populationTotal';

export type HealthMetricId =
  | 'lifeExpectancy'
  | 'maternalMortalityRatio'
  | 'under5MortalityRate'
  | 'undernourishmentPrevalence'
  | 'pop0_14Share'
  | 'pop15_64Share'
  | 'pop65PlusShare';

export type EducationMetricId =
  | 'outOfSchoolPrimaryPct'
  | 'primaryCompletionRate'
  | 'minProficiencyReadingPct'
  | 'preprimaryEnrollmentPct'
  | 'literacyRateAdultPct'
  | 'genderParityIndexPrimary'
  | 'trainedTeachersPrimaryPct'
  | 'publicExpenditureEducationPctGDP';

export type MetricId = FinancialMetricId | PopulationMetricId | HealthMetricId | EducationMetricId;

export interface TimePoint {
  date: string; // ISO date, typically Jan 1st of the year or synthetic sub-periods
  year: number;
  value: number | null;
}

export interface MetricSeries {
  id: MetricId;
  label: string;
  unit: string;
  points: TimePoint[];
}

export interface AgeGroupShare {
  id: '0_14' | '15_64' | '65_plus';
  label: string;
  percentageOfPopulation: number | null;
}

export interface AgeGroupPopulation extends AgeGroupShare {
  absolute: number | null;
}

export interface PopulationBreakdown {
  year: number;
  total: number | null;
  groups: AgeGroupPopulation[];
}

export interface CountrySummary {
  iso2Code: string;
  iso3Code?: string;
  name: string;
  region?: string;
  incomeLevel?: string;
  capitalCity?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  currencyCode?: string;
  currencyName?: string;
  currencySymbol?: string;
  /** Descriptive government system from REST Countries, e.g. "presidential republic". */
  government?: string;
  /** Simplified head-of-government role, e.g. "President", "Prime Minister", "Monarch". */
  headOfGovernmentType?: string;
  /** Government type classification, e.g. "Federal republic", "Parliamentary democracy". */
  governmentType?: string;
}

export interface CountryYearSnapshot {
  country: CountrySummary;
  year: number;
  metrics: {
    financial: {
      gdpNominal?: number | null;
      gdpPPP?: number | null;
      gdpNominalPerCapita?: number | null;
      gdpPPPPerCapita?: number | null;
      inflationCPI?: number | null;
      govDebtPercentGDP?: number | null;
      govDebtUSD?: number | null;
      interestRate?: number | null;
      unemploymentRate?: number | null;
      unemployedTotal?: number | null;
      labourForceTotal?: number | null;
      povertyHeadcount215?: number | null;
      povertyHeadcountNational?: number | null;
    };
    population: {
      total?: number | null;
      ageBreakdown?: PopulationBreakdown;
    };
    health: {
      lifeExpectancy?: number | null;
      maternalMortalityRatio?: number | null;
      under5MortalityRate?: number | null;
      undernourishmentPrevalence?: number | null;
    };
    education?: {
      outOfSchoolPrimaryPct?: number | null;
      primaryCompletionRate?: number | null;
      minProficiencyReadingPct?: number | null;
      preprimaryEnrollmentPct?: number | null;
      literacyRateAdultPct?: number | null;
      genderParityIndexPrimary?: number | null;
      trainedTeachersPrimaryPct?: number | null;
      publicExpenditureEducationPctGDP?: number | null;
    };
    geography?: {
      landAreaKm2?: number | null;
      totalAreaKm2?: number | null;
      eezKm2?: number | null;
    };
  };
}

export interface CountryDashboardData {
  summary: CountrySummary;
  range: {
    startYear: number;
    endYear: number;
  };
  series: {
    financial: MetricSeries[];
    population: MetricSeries[];
    health: MetricSeries[];
    education: MetricSeries[];
  };
  latestSnapshot?: CountryYearSnapshot;
}

export interface GlobalCountryMetricsRow {
  iso2Code: string;
  iso3Code?: string;
  name: string;
  year: number;
  gdpNominal?: number | null;
  gdpPPP?: number | null;
  gdpNominalPerCapita?: number | null;
  gdpPPPPerCapita?: number | null;
  inflationCPI?: number | null;
  govDebtPercentGDP?: number | null;
  govDebtUSD?: number | null;
  interestRate?: number | null;
  povertyHeadcount215?: number | null;
  povertyHeadcountNational?: number | null;
  populationTotal?: number | null;
  lifeExpectancy?: number | null;
  unemploymentRate?: number | null;
  unemployedTotal?: number | null;
  labourForceTotal?: number | null;
  maternalMortalityRatio?: number | null;
  under5MortalityRate?: number | null;
  undernourishmentPrevalence?: number | null;
  // Population age group breakdown (absolute counts, derived from % shares)
  population0_14?: number | null;
  population15_64?: number | null;
  population65Plus?: number | null;
  // Internal helper fields for percentage shares (used to derive absolutes)
  pop0_14Pct?: number | null;
  pop15_64Pct?: number | null;
  pop65PlusPct?: number | null;
  // Education (UNESCO/World Bank WDI, from 2000 to latest)
  outOfSchoolPrimaryPct?: number | null;
  primaryCompletionRate?: number | null;
  minProficiencyReadingPct?: number | null;
  preprimaryEnrollmentPct?: number | null;
  literacyRateAdultPct?: number | null;
  genderParityIndexPrimary?: number | null;
  trainedTeachersPrimaryPct?: number | null;
  publicExpenditureEducationPctGDP?: number | null;
  // Area metrics (sq. km)
  landAreaKm2?: number | null;
  totalAreaKm2?: number | null;
  eezKm2?: number | null;
  // Categorical metadata (region, government)
  region?: string;
  headOfGovernmentType?: string;
  governmentType?: string;
}


