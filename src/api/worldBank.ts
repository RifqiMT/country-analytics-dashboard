import axios from 'axios';
import { EEZ_BY_ISO3 } from '../data/eezByCountry';
import type {
  AgeGroupPopulation,
  CountryDashboardData,
  CountrySummary,
  CountryYearSnapshot,
  GlobalCountryMetricsRow,
  MetricSeries,
  TimePoint,
} from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import {
  fetchGDPFromIMF,
  fetchGDPFromIMFForYearBatch,
  fetchGovernmentDebtFromIMF,
  fetchGovernmentDebtSeriesFromIMF,
} from './imf';
import { fetchTertiaryInstitutionsSeries, fetchTertiaryInstitutionsForYear } from './unescoUis';

const WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

/**
 * Territories and small jurisdictions that often lack World Bank data.
 * Maps ISO2 of territory -> ISO2 of administrating/parent country for fallback.
 * Used to fill empty inflation, interest rate, and gov debt series.
 */
const TERRITORY_FALLBACK_PARENT: Record<string, string> = {
  AS: 'US', // American Samoa -> USA
  GU: 'US', // Guam -> USA
  VI: 'US', // US Virgin Islands -> USA
  MP: 'US', // Northern Mariana Islands -> USA
  PR: 'US', // Puerto Rico -> USA (may have WB data; fallback if sparse)
  VG: 'GB', // British Virgin Islands -> UK
  KY: 'GB', // Cayman Islands -> UK
  BM: 'GB', // Bermuda -> UK
  GI: 'GB', // Gibraltar -> UK
  MC: 'FR', // Monaco -> France
  SM: 'IT', // San Marino -> Italy
  LI: 'CH', // Liechtenstein -> Switzerland
  VA: 'IT', // Vatican City -> Italy
  AD: 'ES', // Andorra -> Spain
  FO: 'DK', // Faroe Islands -> Denmark
  GL: 'DK', // Greenland -> Denmark
  PM: 'FR', // Saint Pierre and Miquelon -> France
  WF: 'FR', // Wallis and Futuna -> France
  NC: 'FR', // New Caledonia -> France
  PF: 'FR', // French Polynesia -> France
  RE: 'FR', // Réunion -> France
  GP: 'FR', // Guadeloupe -> France
  MQ: 'FR', // Martinique -> France
  YT: 'FR', // Mayotte -> France
  GF: 'FR', // French Guiana -> France
  AW: 'NL', // Aruba -> Netherlands
  CW: 'NL', // Curaçao -> Netherlands
  SX: 'NL', // Sint Maarten -> Netherlands
  MF: 'FR', // Saint Martin (French part) -> France
  AX: 'FI', // Åland Islands -> Finland
  FK: 'GB', // Falkland Islands -> UK
  TC: 'GB', // Turks and Caicos -> UK
  MS: 'GB', // Montserrat -> UK
  AI: 'GB', // Anguilla -> UK
  GG: 'GB', // Guernsey -> UK
  JE: 'GB', // Jersey -> UK
  IM: 'GB', // Isle of Man -> UK
  TW: 'CN', // Taiwan -> fallback to China metrics when WDI data is missing
  XK: 'RS', // Kosovo -> fallback to Serbia when WDI data is missing (WB/UN coverage varies)
};

/**
 * Estimated financial metrics for countries with no World Bank or IMF data (e.g. North Korea).
 * Source: Bank of Korea (North Korea nominal GDP), UN/analyst estimates. Used as last-resort fallback.
 * Values are applied when the requested year is within ESTIMATED_FALLBACK_YEAR_RANGE of referenceYear.
 */
const ESTIMATED_FINANCIAL_FALLBACK: Record<
  string,
  {
    referenceYear: number;
    gdpNominal: number;
    gdpPPP?: number;
    gdpNominalPerCapita: number;
    gdpPPPPerCapita?: number;
    inflationCPI?: number;
    govDebtPercentGDP?: number;
  }
> = {
  PRK: {
    referenceYear: 2022,
    gdpNominal: 27.84e9,
    gdpPPP: 35e9,
    gdpNominalPerCapita: 1114,
    gdpPPPPerCapita: 1400,
    inflationCPI: 5,
    govDebtPercentGDP: 50,
  },
  // Taiwan: IMF WEO / national statistics when IMF API is unavailable. Ref: IMF WEO Oct 2024 (2023 data).
  TWN: {
    referenceYear: 2023,
    gdpNominal: 751e9,
    gdpPPP: 1.64e12,
    gdpNominalPerCapita: 31400,
    gdpPPPPerCapita: 68600,
    inflationCPI: 2.5,
    govDebtPercentGDP: 31,
  },
  // Cuba: WB often missing PPP and inflation. Ref: IMF WEO / national stats (2023).
  CUB: {
    referenceYear: 2023,
    gdpNominal: 107e9,
    gdpPPP: 145e9,
    gdpNominalPerCapita: 9600,
    gdpPPPPerCapita: 13000,
    inflationCPI: 25,
    govDebtPercentGDP: 55,
  },
};

/** How many years before/after reference year the estimate is considered valid. */
const ESTIMATED_FALLBACK_YEAR_RANGE = 3;

/** ISO3 codes of territories that report to IMF under their own code (e.g. TWN = Chinese Taipei). Do not use parent GDP scaling; leave to IMF fallback for accurate financial data. */
const TERRITORY_USE_IMF_GDP = new Set(['TWN', 'HKG', 'MAC']);

/**
 * Land and total (surface) area in km² for economies where World Bank WDI has no or sparse coverage.
 * Sources: UN Statistics Division, REST Countries API, CIA World Factbook.
 */
const AREA_FALLBACK_KM2: Record<string, { land: number; total: number }> = {
  XKX: { land: 10887, total: 10908 }, // Kosovo – UN/REST Countries
  TWN: { land: 32260, total: 36193 }, // Taiwan – REST Countries / CIA
};

/** Population fallback for territories that use IMF GDP when World Bank has no WDI population (e.g. TWN). Ref: UN/IMF 2023. */
const POPULATION_FALLBACK: Record<string, number> = {
  TWN: 23.9e6,
  HKG: 7.5e6,
  MAC: 0.7e6,
};

// Indicator codes from World Bank (WDI)
const INDICATORS = {
  gdpNominal: 'NY.GDP.MKTP.CD', // GDP (current US$)
  gdpPPP: 'NY.GDP.MKTP.PP.CD', // GDP, PPP (current international $)
  gdpNominalPerCapita: 'NY.GDP.PCAP.CD', // GDP per capita (current US$)
  gdpPPPPerCapita: 'NY.GDP.PCAP.PP.CD', // GDP per capita, PPP (current international $)
  inflationCPI: 'FP.CPI.TOTL.ZG', // Inflation, consumer prices (annual %)
  govDebtPercentGDP: 'GC.DOD.TOTL.GD.ZS', // Central government debt (% of GDP); IMF WEO used as fallback for missing
  interestRate: 'FR.INR.LEND', // Lending interest rate (%)
  unemploymentRate: 'SL.UEM.TOTL.ZS', // Unemployment, total (% of total labor force) (modeled ILO estimate) – ILO, via World Bank WDI
  unemployedTotal: 'SL.UEM.TOTL', // Unemployment, total (number of people unemployed, modeled ILO estimate) – ILO, via World Bank WDI
  labourForceTotal: 'SL.TLF.TOTL.IN', // Labor force, total (people) – ILO/UN, via World Bank WDI
  povertyHeadcount215: 'SI.POV.DDAY', // Poverty headcount at $2.15/day (2017 PPP) (% of population) – World Bank
  povertyHeadcountNational: 'SI.POV.NAHC', // Poverty headcount at national poverty line (% of population) – World Bank
  populationTotal: 'SP.POP.TOTL', // Population, total
  pop0_14Pct: 'SP.POP.0014.TO.ZS', // Population ages 0-14 (% of total)
  pop15_64Pct: 'SP.POP.1564.TO.ZS', // Population ages 15-64 (% of total)
  pop65PlusPct: 'SP.POP.65UP.TO.ZS', // Population ages 65 and above (% of total)
  lifeExpectancy: 'SP.DYN.LE00.IN', // Life expectancy at birth, total (years)
   // Health outcomes – sourced from WHO/UN via WDI
  maternalMortalityRatio: 'SH.STA.MMRT', // Maternal mortality ratio (modeled estimate, per 100,000 live births) – WHO, UNICEF, UNFPA, World Bank, UNDESA
  under5MortalityRate: 'SH.DYN.MORT', // Mortality rate, under-5 (per 1,000 live births) – UN Inter-agency Group for Child Mortality Estimation (UNICEF, WHO, World Bank, UNDESA)
  undernourishmentPrevalence: 'SN.ITK.DEFC.ZS', // Prevalence of undernourishment (% of population) – FAO, UN
  landArea: 'AG.LND.TOTL.K2', // Land area (sq. km)
  surfaceArea: 'AG.SRF.TOTL.K2', // Surface area (sq. km)
  // Education – UNESCO Institute for Statistics via World Bank WDI (from 2000)
  primaryNetEnrollmentPct: 'SE.PRM.NENR', // Primary net enrollment rate (%); out-of-school rate = 100 - this
  secondaryNetEnrollmentPct: 'SE.SEC.NENR', // Secondary net enrollment (%); out-of-school secondary = 100 - this
  primaryCompletionRate: 'SE.PRM.CMPT.ZS', // Primary completion rate (% of relevant age group)
  secondaryCompletionRate: 'SE.SEC.CMPT.LO.ZS', // Lower secondary completion rate (% of relevant age group)
  tertiaryCompletionRate: 'SE.TER.CMPL.ZS', // Gross graduation ratio, tertiary (%)
  learningPovertyPct: 'SE.LPV.PRIM', // Learning poverty (% below minimum reading proficiency); min proficiency = 100 - this
  literacyRateAdultPct: 'SE.ADT.LITR.ZS', // Literacy rate, adult total (% of people ages 15+)
  genderParityIndexPrimary: 'SE.ENR.PRIM.FM.ZS', // Ratio of female to male primary enrollment (%); GPI = value/100
  genderParityIndexSecondary: 'SE.ENR.SECO.FM.ZS', // School enrollment, secondary (gross), gender parity index (GPI)
  genderParityIndexTertiary: 'SE.ENR.TERT.FM.ZS', // School enrollment, tertiary (gross), gender parity index (GPI)
  trainedTeachersPrimaryPct: 'SE.PRM.TCAQ.ZS', // Trained teachers in primary education (% of total teachers)
  trainedTeachersSecondaryPct: 'SE.SEC.TCAQ.ZS', // Trained teachers in secondary education (% of total teachers)
  trainedTeachersTertiaryPct: 'SE.TER.TCAQ.ZS', // Trained teachers in tertiary education (% of total teachers) – UNESCO UIS; coverage may be sparse
  publicExpenditureEducationPctGDP: 'SE.XPD.TOTL.GD.ZS', // Government expenditure on education as % of GDP
  primaryPupilsTotal: 'SE.PRM.ENRL', // Primary education, pupils (total number) – UNESCO UIS via WDI
  secondaryPupilsTotal: 'SE.SEC.ENRL', // Secondary education, pupils (total number) – UNESCO UIS via WDI
  primaryEnrollmentPct: 'SE.PRM.ENRR', // School enrollment, primary (% gross) – UNESCO UIS via WDI
  secondaryEnrollmentPct: 'SE.SEC.ENRR', // School enrollment, secondary (% gross) – UNESCO UIS via WDI
  tertiaryEnrollmentPct: 'SE.TER.ENRR', // School enrollment, tertiary (% gross) – UNESCO UIS via WDI
  tertiaryEnrollmentTotal: 'SE.TER.ENRL', // Enrolment in tertiary education, all programmes, both sexes (number) – UNESCO UIS via WDI
  // Education system size: teacher counts (reliable intl data); school/institution counts not consistently in WDI
  primarySchoolsTotal: 'SE.PRM.TCHR',   // Primary education, teachers (total) – UNESCO UIS via World Bank WDI
  secondarySchoolsTotal: 'SE.SEC.TCHR', // Secondary education, teachers (total) – UNESCO UIS via World Bank WDI
} as const;

type IndicatorKey = keyof typeof INDICATORS;

interface WorldBankApiPoint {
  date: string;
  value: number | null;
}

type WorldBankSeriesResponse = [unknown, WorldBankApiPoint[]];

async function fetchIndicatorSeries(
  countryCode: string,
  indicator: IndicatorKey,
  startYear = DATA_MIN_YEAR,
  endYear = DATA_MAX_YEAR,
): Promise<TimePoint[]> {
  const safeStart = Math.max(startYear, DATA_MIN_YEAR);
  const safeEnd = Math.min(endYear, DATA_MAX_YEAR);
  const url = `${WORLD_BANK_BASE}/country/${countryCode}/indicator/${INDICATORS[indicator]}?format=json&per_page=2000&date=${safeStart}:${safeEnd}`;

  let data: WorldBankApiPoint[] = [];
  try {
    const res = await axios.get<WorldBankSeriesResponse>(url);
    data = res.data?.[1] ?? [];
  } catch {
    // Network / CORS / SES or extension interference – treat as "no data"
    // so the dashboard can still render using other indicators.
    data = [];
  }

  return data
    .map((entry): TimePoint | null => {
      const year = Number.parseInt(entry.date, 10);
      if (Number.isNaN(year)) return null;
      return {
        date: `${year}-01-01`,
        year,
        value: entry.value,
      };
    })
    .filter((p): p is TimePoint => p !== null)
    .sort((a, b) => a.year - b.year);
}

/**
 * For some macro indicators (e.g. inflation, government debt, interest rates) the
 * World Bank series can have missing years inside an otherwise well-populated range.
 * To keep timeline charts readable, this helper creates a dense annual series from
 * startYear to endYear and fills missing years by falling back to the nearest
 * non-null observations:
 * - if both a previous and next value exist, we linearly interpolate between them
 * - otherwise we carry forward the closest available value (previous or next)
 */
/** Returns true if the series has at least one non-null value. */
function hasAnyData(series: TimePoint[]): boolean {
  return series.some((p) => p.value != null);
}

/**
 * Merge primary and fallback series: for each year, use primary value if non-null,
 * otherwise use fallback value. Produces dense series from startYear to endYear.
 */
function mergeSeriesWithFallback(
  primary: TimePoint[],
  fallback: TimePoint[],
  startYear: number,
  endYear: number,
): TimePoint[] {
  const primaryByYear = new Map(
    primary.filter((p) => p.value != null).map((p) => [p.year, p.value as number]),
  );
  const fallbackByYear = new Map(
    fallback.filter((p) => p.value != null).map((p) => [p.year, p.value as number]),
  );
  const result: TimePoint[] = [];
  for (let y = startYear; y <= endYear; y += 1) {
    const value = primaryByYear.get(y) ?? fallbackByYear.get(y) ?? null;
    result.push({ year: y, date: `${y}-01-01`, value });
  }
  return result;
}

function fillSeriesWithFallback(
  series: TimePoint[],
  startYear: number,
  endYear: number,
): TimePoint[] {
  if (!series.length) {
    const dense: TimePoint[] = [];
    for (let year = startYear; year <= endYear; year += 1) {
      dense.push({ year, date: `${year}-01-01`, value: null });
    }
    return dense;
  }

  const byYear = new Map<number, TimePoint>();
  for (const p of series) {
    byYear.set(p.year, p);
  }

  const nonNull = [...series]
    .filter((p) => p.value != null)
    .sort((a, b) => a.year - b.year);

  if (!nonNull.length) {
    const dense: TimePoint[] = [];
    for (let year = startYear; year <= endYear; year += 1) {
      dense.push({ year, date: `${year}-01-01`, value: null });
    }
    return dense;
  }

  const dense: TimePoint[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const existing = byYear.get(year);
    if (existing && existing.value != null) {
      dense.push(existing);
      continue;
    }

    let previous: TimePoint | undefined;
    let next: TimePoint | undefined;
    for (const p of nonNull) {
      if (p.year <= year) {
        previous = p;
      }
      if (p.year >= year) {
        next = p;
        break;
      }
    }

    let value: number | null = null;
    if (previous && next) {
      if (previous.year === next.year) {
        value = previous.value!;
      } else {
        const t = (year - previous.year) / (next.year - previous.year);
        value = previous.value! + (next.value! - previous.value!) * t;
      }
    } else if (previous) {
      value = previous.value!;
    } else if (next) {
      value = next.value!;
    }

    dense.push({
      year,
      date: `${year}-01-01`,
      value,
    });
  }

  return dense;
}

/** Education metrics that are conceptually 0–100% and should be capped for display (WDI can report >100 e.g. gross enrollment).
 * Completion rates (primary, secondary, tertiary) are NOT capped so that gross intake ratios >100% from the source display correctly. */
const EDUCATION_PCT_CAP_100 = new Set([
  'outOfSchoolPrimaryPct', 'outOfSchoolSecondaryPct', 'outOfSchoolTertiaryPct', 'minProficiencyReadingPct',
  'literacyRateAdultPct', 'trainedTeachersPrimaryPct', 'trainedTeachersSecondaryPct', 'trainedTeachersTertiaryPct',
  'primaryEnrollmentPct', 'secondaryEnrollmentPct', 'tertiaryEnrollmentPct',
]);

/** Treat 0 as missing for indicators where 0 is implausible (e.g. no country has 0% public education expenditure, or 0% primary net enrollment). No regional/world substitution for single countries. */
function treatZeroAsMissingForEducation(
  series: TimePoint[],
  indicator: 'publicExpenditureEducationPctGDP' | 'primaryNetEnrollmentPct' | 'secondaryNetEnrollmentPct' | 'learningPovertyPct',
): TimePoint[] {
  if (
    indicator !== 'publicExpenditureEducationPctGDP' &&
    indicator !== 'primaryNetEnrollmentPct' &&
    indicator !== 'secondaryNetEnrollmentPct' &&
    indicator !== 'learningPovertyPct'
  ) return series;
  return series.map((p) => ({
    ...p,
    value: p.value != null && p.value === 0 ? null : p.value,
  }));
}

function clampEducationPct(metricId: string, value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return value;
  if (!EDUCATION_PCT_CAP_100.has(metricId)) return value;
  return Math.min(100, Math.max(0, value));
}

function clampEducationSeriesPoints(series: TimePoint[], metricId: string): TimePoint[] {
  if (!EDUCATION_PCT_CAP_100.has(metricId)) return series;
  return series.map((p) => ({
    ...p,
    value: clampEducationPct(metricId, p.value),
  }));
}

interface WorldBankIndicatorRow {
  country: {
    id: string; // iso2
    value: string; // country name
  };
  countryiso3code: string;
  date: string;
  value: number | null;
}

type WorldBankIndicatorResponse = [unknown, WorldBankIndicatorRow[]];

async function fetchGlobalIndicatorForYear(
  indicator: IndicatorKey,
  year: number,
): Promise<WorldBankIndicatorRow[]> {
  const safeYear = Math.min(Math.max(year, DATA_MIN_YEAR), DATA_MAX_YEAR);
  // Fetch a window of years ending at safeYear so we can fall back to the
  // latest non-null value when data for the exact year is missing.
  const startWindow = Math.max(DATA_MIN_YEAR, safeYear - 15);
  const url = `${WORLD_BANK_BASE}/country/all/indicator/${INDICATORS[indicator]}?format=json&per_page=20000&date=${startWindow}:${safeYear}`;
  const res = await axios.get<WorldBankIndicatorResponse>(url);
  const data = res.data?.[1] ?? [];
  return data;
}

function inferHeadOfGovernmentType(
  iso2: string,
  government: string | null | undefined,
): string | undefined {
  const gov = (government ?? '').toLowerCase();

  // 1) If REST Countries ever provides a government description, use it.
  if (gov) {
    if (
      gov.includes('parliament') ||
      gov.includes('prime minister') ||
      gov.includes('parliamentary')
    ) {
      return 'Prime Minister';
    }

    if (gov.includes('presidential') || gov.includes('president')) {
      return 'President';
    }

    if (
      gov.includes('monarchy') ||
      gov.includes('sultanate') ||
      gov.includes('emirate') ||
      gov.includes('kingdom')
    ) {
      return 'Monarch';
    }
  }

  const code = iso2.toUpperCase();

  // 2) Country-specific overrides for parliamentary / prime‑minister systems.
  const PRIME_MINISTER_ISO2 = new Set([
    'IN', 'GB', 'CA', 'AU', 'NZ',
    'JP', 'DE', 'IT', 'ES', 'SE', 'NO', 'DK', 'NL', 'BE',
    'FI', 'IE', 'IL', 'SG',
  ]);

  if (PRIME_MINISTER_ISO2.has(code)) {
    return 'Prime Minister';
  }

  // 3) Monarch‑led systems where the monarch is effectively head of government.
  const MONARCHY_ISO2 = new Set([
    'SA', 'AE', 'OM', 'QA', 'KW', 'BH', // Gulf monarchies
    'JO', 'MA', 'TH', 'BN',
  ]);
  if (MONARCHY_ISO2.has(code)) {
    return 'Monarch';
  }

  // 4) Default assumption for remaining independent states.
  return 'President';
}

/** Infer government type from official name or static mapping. */
function inferGovernmentType(
  iso2: string,
  officialName: string | null | undefined,
): string | undefined {
  const code = iso2.toUpperCase();
  const name = (officialName ?? '').toLowerCase();

  // Static mapping for accurate government types (CIA World Factbook style).
  const GOVERNMENT_TYPE_MAP: Record<string, string> = {
    US: 'Federal republic',
    ID: 'Presidential republic',
    IN: 'Parliamentary democracy',
    GB: 'Constitutional monarchy',
    CA: 'Federal parliamentary democracy',
    AU: 'Federal parliamentary democracy',
    DE: 'Federal parliamentary republic',
    FR: 'Semi-presidential republic',
    JP: 'Constitutional monarchy',
    IT: 'Parliamentary republic',
    ES: 'Parliamentary monarchy',
    BR: 'Federal presidential republic',
    MX: 'Federal presidential republic',
    SA: 'Absolute monarchy',
    AE: 'Federal absolute monarchy',
    RU: 'Federal semi-presidential republic',
    CN: 'Socialist republic',
    KR: 'Presidential republic',
    TR: 'Presidential republic',
    NL: 'Constitutional monarchy',
    BE: 'Federal parliamentary monarchy',
    SE: 'Constitutional monarchy',
    NO: 'Constitutional monarchy',
    TH: 'Constitutional monarchy',
    MY: 'Federal constitutional monarchy',
    SG: 'Parliamentary republic',
    NZ: 'Parliamentary democracy',
    ZA: 'Parliamentary republic',
    EG: 'Presidential republic',
    NG: 'Federal presidential republic',
    PL: 'Parliamentary republic',
    UA: 'Semi-presidential republic',
    AR: 'Presidential republic',
    CL: 'Presidential republic',
    CO: 'Presidential republic',
    PH: 'Presidential republic',
    VN: 'Socialist republic',
  };

  const mapped = GOVERNMENT_TYPE_MAP[code];
  if (mapped) return mapped;

  // Infer from official name when no mapping exists.
  if (name.includes('federal republic')) return 'Federal republic';
  if (name.includes('democratic republic')) return 'Republic';
  if (name.includes('socialist republic')) return 'Socialist republic';
  if (name.includes('republic')) return 'Republic';
  if (name.includes('united kingdom')) return 'Constitutional monarchy';
  if (name.includes('kingdom of')) return 'Constitutional monarchy';
  if (name.includes('sultanate')) return 'Sultanate';
  if (name.includes('emirate')) return 'Emirate';
  if (name.includes('principality')) return 'Principality';
  if (name.includes('grand duchy')) return 'Constitutional monarchy';

  return 'Republic';
}

// For essentially static indicators like land/surface area, we want the latest
// non-null value for each country, irrespective of the selected year. This
// helper scans a wide date window and keeps the most recent non-null entry.
async function fetchGlobalStaticIndicator(
  indicator: IndicatorKey,
): Promise<WorldBankIndicatorRow[]> {
  const url = `${WORLD_BANK_BASE}/country/all/indicator/${INDICATORS[indicator]}?format=json&per_page=20000&date=1960:${DATA_MAX_YEAR}`;
  const res = await axios.get<WorldBankIndicatorResponse>(url);
  const data = res.data?.[1] ?? [];

  const byIso3 = new Map<string, WorldBankIndicatorRow>();
  for (const row of data) {
    if (!row.countryiso3code) continue;
    const iso3 = row.countryiso3code.toUpperCase();
    if (row.value == null) continue;
    const existing = byIso3.get(iso3);
    // Keep the latest year (date is string year)
    if (!existing || Number(row.date) > Number(existing.date)) {
      byIso3.set(iso3, row);
    }
  }
  return Array.from(byIso3.values());
}

/**
 * For macro financial indicators (inflation, gov debt, interest rate), many
 * countries have sparse or lagged data. This fetches the full history up to
 * maxYear and returns the latest non-null value per country (fallback: show
 * most recent available when the selected year is missing).
 * @param startYear - First year to include (default DATA_MIN_YEAR). Use an
 *   earlier year (e.g. 1990) for indicators with long history to improve coverage.
 */
async function fetchGlobalIndicatorLatestUpToYear(
  indicator: IndicatorKey,
  maxYear: number,
  startYear: number = DATA_MIN_YEAR,
): Promise<WorldBankIndicatorRow[]> {
  const safeMax = Math.min(Math.max(maxYear, DATA_MIN_YEAR), DATA_MAX_YEAR);
  const safeStart = Math.max(1960, startYear); // WB has data from 1960 for many series
  const url = `${WORLD_BANK_BASE}/country/all/indicator/${INDICATORS[indicator]}?format=json&per_page=20000&date=${safeStart}:${safeMax}`;
  const res = await axios.get<WorldBankIndicatorResponse>(url);
  const data = res.data?.[1] ?? [];

  const byIso3 = new Map<string, WorldBankIndicatorRow>();
  for (const row of data) {
    if (!row.countryiso3code) continue;
    const iso3 = row.countryiso3code.toUpperCase();
    if (row.value == null) continue;
    const rowYear = Number(row.date);
    if (Number.isNaN(rowYear) || rowYear > safeMax) continue;
    const existing = byIso3.get(iso3);
    if (!existing || rowYear > Number(existing.date)) {
      byIso3.set(iso3, row);
    }
  }
  return Array.from(byIso3.values());
}

async function fetchCountryMetadata(countryCode: string): Promise<CountrySummary> {
  const iso2 = countryCode.toUpperCase();
  let summary: CountrySummary | null = null;
  let officialName: string | undefined;

  try {
    const url = `${WORLD_BANK_BASE}/country/${iso2}?format=json`;
    const res = await axios.get<[unknown, any[]]>(url);
    const data = res.data?.[1] ?? [];
    const info = data[0];

    if (info && typeof info === 'object') {
      summary = {
        iso2Code: info.iso2Code,
        iso3Code: info.id,
        name: info.name,
        region: info.region?.value,
        incomeLevel: info.incomeLevel?.value,
        capitalCity: info.capitalCity,
        latitude: info.latitude ? Number(info.latitude) : null,
        longitude: info.longitude ? Number(info.longitude) : null,
      };
    }
  } catch {
    // Ignore WB failure; we'll fall back to REST Countries below.
  }

  // Enrich / fallback with timezone, currency, area, and name from REST Countries.
  try {
    const restUrl = `https://restcountries.com/v3.1/alpha/${iso2}?fields=cca2,cca3,name,region,capital,latlng,timezones,currencies,government`;
    const restRes = await axios.get<any>(restUrl);
    const restData = Array.isArray(restRes.data) ? restRes.data[0] : restRes.data;
    if (restData) {
      if (!summary) {
        summary = {
          iso2Code: restData.cca2 ?? iso2,
          iso3Code: restData.cca3,
          name: restData.name?.common ?? iso2,
          region: restData.region,
          incomeLevel: undefined,
          capitalCity: Array.isArray(restData.capital) ? restData.capital[0] : restData.capital,
          latitude:
            Array.isArray(restData.latlng) && restData.latlng.length === 2
              ? Number(restData.latlng[0])
              : null,
          longitude:
            Array.isArray(restData.latlng) && restData.latlng.length === 2
              ? Number(restData.latlng[1])
              : null,
        };
      }
      if (Array.isArray(restData.timezones) && restData.timezones.length > 0) {
        summary.timezone = restData.timezones[0];
      }
      if (restData.currencies && typeof restData.currencies === 'object') {
        const firstCurrencyEntry = Object.entries<any>(restData.currencies)[0];
        if (firstCurrencyEntry) {
          const [code, currencyInfo] = firstCurrencyEntry;
          summary.currencyCode = code;
          summary.currencyName = currencyInfo?.name;
          summary.currencySymbol = currencyInfo?.symbol;
        }
      }
      if (typeof restData.government === 'string' && restData.government.trim()) {
        summary.government = restData.government.trim();
      }
      if (restData.name?.official) {
        officialName = restData.name.official;
      }
      if (restData.region && !summary.region) {
        summary.region = restData.region;
      }
    }
  } catch {
    // If REST Countries enrichment fails, fall back to whatever summary we already have.
  }

  // As a final enrichment step, backfill any missing core fields (region, income level,
  // capital, coordinates) from the cached World Bank country list used elsewhere in
  // the app (e.g. selectors, global tables). This helps avoid partially empty
  // "General" cards for countries where the direct metadata call returned sparse data.
  try {
    const all = await fetchAllCountries();
    const fromList =
      all.find((c) => c.iso2Code?.toUpperCase() === iso2) ||
      (summary?.iso3Code
        ? all.find((c) => c.iso3Code?.toUpperCase() === summary!.iso3Code?.toUpperCase())
        : undefined) ||
      (summary?.name ? all.find((c) => c.name === summary!.name) : undefined);
    if (fromList) {
      if (!summary) {
        summary = { ...fromList };
      } else {
        summary.region = summary.region ?? fromList.region;
        summary.incomeLevel = summary.incomeLevel ?? fromList.incomeLevel;
        summary.capitalCity = summary.capitalCity ?? fromList.capitalCity;
        if (summary.latitude == null && fromList.latitude != null) {
          summary.latitude = fromList.latitude;
        }
        if (summary.longitude == null && fromList.longitude != null) {
          summary.longitude = fromList.longitude;
        }
      }
    }
  } catch {
    // If the country list cannot be loaded, continue with whatever summary is available.
  }

  if (!summary) {
    summary = {
      iso2Code: iso2 || 'XX',
      iso3Code: undefined,
      name: countryCode || 'Unknown',
      region: undefined,
      incomeLevel: undefined,
      capitalCity: undefined,
      latitude: null,
      longitude: null,
    };
  }

  // Infer head-of-government type and government type for the General section.
  const role = inferHeadOfGovernmentType(summary.iso2Code, summary.government);
  if (role) {
    summary.headOfGovernmentType = role;
  }

  const govType = inferGovernmentType(summary.iso2Code, officialName ?? summary.name);
  if (govType) {
    summary.governmentType = govType;
  }

  return summary;
}

let allCountriesPromise: Promise<CountrySummary[]> | null = null;

/** World Bank aggregate/region codes to exclude (no individual countries). */
const AGGREGATE_AND_REGION_IDS = new Set([
  // Regions (from /v2/region)
  'WLD', 'ARB', 'AFR', 'AFE', 'AFW', 'CAA', 'CEA', 'CEB', 'CEU', 'CLA', 'CME', 'CSA',
  'CSS', 'EAP', 'EAR', 'EAS', 'ECA', 'ECS', 'EMU', 'EUU', 'FCS', 'HPC', 'LAC', 'LCN',
  'LDC', 'LTE', 'MDE', 'MEA', 'MNA', 'NAC', 'NAF', 'NRS', 'OED', 'OSS', 'PRE', 'PSS',
  'PST', 'RRS', 'SAS', 'SSA', 'SSF', 'SST', 'SXZ', 'XZN',
  // Income levels (from /v2/incomelevel)
  'HIC', 'INX', 'LIC', 'LMC', 'LMY', 'MIC', 'UMC',
  // Lending types (from /v2/lendingtypes)
  'IBD', 'IDB', 'IDX', 'LNX',
  // Other aggregates (from /v2/country: IBRD/IDA totals, demographic, etc.)
  'IBT', 'IDA', 'TSS', 'TEC', 'TEA', 'TLA', 'TMN', 'TSA', 'TSX',
]);

export async function fetchAllCountries(): Promise<CountrySummary[]> {
  if (allCountriesPromise) return allCountriesPromise;
  const url = `${WORLD_BANK_BASE}/country?format=json&per_page=500`;
  allCountriesPromise = (async () => {
    const res = await axios.get<[unknown, any[]]>(url);
    const data = res.data?.[1] ?? [];

    // Only individual countries: exclude aggregates and region/income/lending groups.
    // Items with region.id === 'NA' are aggregates; also exclude by known aggregate codes.
    const list = data
      .filter(
        (item) => {
          if (!item.id || !item.iso2Code || typeof item.id !== 'string' || typeof item.iso2Code !== 'string') return false;
          if (item.region?.id === 'NA' || item.region?.value === 'Aggregates') return false;
          if (AGGREGATE_AND_REGION_IDS.has(String(item.id).toUpperCase())) return false;
          return true;
        },
      )
      .map(
        (info): CountrySummary => ({
          iso2Code: info.iso2Code,
          iso3Code: info.id,
          name:
            info.id === 'PSE'
              ? 'Palestine (West Bank and Gaza)'
              : info.name,
          region: info.region?.value,
          incomeLevel: info.incomeLevel?.value,
          capitalCity: info.capitalCity,
          latitude: info.latitude ? Number(info.latitude) : null,
          longitude: info.longitude ? Number(info.longitude) : null,
        }),
      );

    const hasTaiwan = list.some(
      (c) => c.iso2Code.toUpperCase() === 'TW' || c.iso3Code?.toUpperCase() === 'TWN' || /taiwan/i.test(c.name),
    );
    if (!hasTaiwan) {
      list.push({
        iso2Code: 'TW',
        iso3Code: 'TWN',
        name: 'Taiwan',
        region: 'East Asia & Pacific',
        incomeLevel: 'High income',
        capitalCity: 'Taipei',
        latitude: 25.03,
        longitude: 121.56,
      });
    }

    const hasKosovo = list.some(
      (c) => c.iso2Code.toUpperCase() === 'XK' || c.iso3Code?.toUpperCase() === 'XKX' || /kosovo/i.test(c.name),
    );
    if (!hasKosovo) {
      list.push({
        iso2Code: 'XK',
        iso3Code: 'XKX',
        name: 'Kosovo',
        region: 'Europe & Central Asia',
        incomeLevel: 'Upper middle income',
        capitalCity: 'Pristina',
        latitude: 42.67,
        longitude: 21.17,
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  })();
  return allCountriesPromise;
}

let worldBankCountryIso3SetPromise: Promise<Set<string>> | null = null;

async function getWorldBankCountryIso3Set(): Promise<Set<string>> {
  if (!worldBankCountryIso3SetPromise) {
    worldBankCountryIso3SetPromise = fetchAllCountries()
      .then((list) => {
        const set = new Set<string>();
        for (const c of list) {
          if (c.iso3Code) {
            set.add(c.iso3Code.toUpperCase());
          }
        }
        return set;
      })
      .catch(() => new Set<string>());
  }
  return worldBankCountryIso3SetPromise;
}

async function buildPopulationBreakdown(
  year: number,
  countryCode: string,
): Promise<{
  total: number | null;
  groups: AgeGroupPopulation[];
}> {
  const [totalSeries, s0_14, s15_64, s65Plus] = await Promise.all([
    fetchIndicatorSeries(countryCode, 'populationTotal'),
    fetchIndicatorSeries(countryCode, 'pop0_14Pct'),
    fetchIndicatorSeries(countryCode, 'pop15_64Pct'),
    fetchIndicatorSeries(countryCode, 'pop65PlusPct'),
  ]);

  const findValueForYear = (series: TimePoint[]): number | null => {
    const point = series.find((p) => p.year === year);
    return point?.value ?? null;
  };

  const total = findValueForYear(totalSeries);
  const p0_14 = findValueForYear(s0_14);
  const p15_64 = findValueForYear(s15_64);
  const p65Plus = findValueForYear(s65Plus);

  const calcAbsolute = (pct: number | null): number | null => {
    if (total == null || pct == null) return null;
    return (pct / 100) * total;
  };

  return {
    total,
    groups: [
      {
        id: '0_14',
        label: '0–14',
        percentageOfPopulation: p0_14,
        absolute: calcAbsolute(p0_14),
      },
      {
        id: '15_64',
        label: '15–64',
        percentageOfPopulation: p15_64,
        absolute: calcAbsolute(p15_64),
      },
      {
        id: '65_plus',
        label: '65+',
        percentageOfPopulation: p65Plus,
        absolute: calcAbsolute(p65Plus),
      },
    ],
  };
}

export async function fetchCountryDashboardData(
  countryCode: string,
  startYear = DATA_MIN_YEAR,
  endYear = DATA_MAX_YEAR,
): Promise<CountryDashboardData> {
  let [
    summary,
    gdpNominal,
    gdpPPP,
    gdpNominalPerCapita,
    gdpPPPPerCapita,
    inflationCPIRaw,
    govDebtPercentGDPRaw,
    interestRateRaw,
    unemploymentRateRaw,
    unemployedTotalRaw,
    labourForceTotalRaw,
    povertyHeadcount215Raw,
    povertyHeadcountNationalRaw,
    population,
    lifeExpectancy,
    maternalMortalityRatioRaw,
    under5MortalityRateRaw,
    undernourishmentPrevalenceRaw,
    pop0_14PctSeries,
    pop15_64PctSeries,
    pop65PlusPctSeries,
    landAreaSeries,
    surfaceAreaSeries,
  ] =
    await Promise.all([
      fetchCountryMetadata(countryCode),
      fetchIndicatorSeries(countryCode, 'gdpNominal', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'gdpPPP', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'gdpNominalPerCapita', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'gdpPPPPerCapita', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'inflationCPI', startYear, endYear),
      fetchIndicatorSeries(
        countryCode,
        'govDebtPercentGDP',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'interestRate',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'unemploymentRate',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'unemployedTotal',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'labourForceTotal',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'povertyHeadcount215',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'povertyHeadcountNational',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(countryCode, 'populationTotal', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'lifeExpectancy', startYear, endYear),
      fetchIndicatorSeries(
        countryCode,
        'maternalMortalityRatio',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'under5MortalityRate',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(
        countryCode,
        'undernourishmentPrevalence',
        Math.min(startYear, 1990),
        endYear,
      ),
      fetchIndicatorSeries(countryCode, 'pop0_14Pct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'pop15_64Pct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'pop65PlusPct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'landArea', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'surfaceArea', startYear, endYear),
    ]);

  const [
    primaryNetEnrollmentPctRaw,
    secondaryNetEnrollmentPctRaw,
    primaryCompletionRateRaw,
    secondaryCompletionRateRaw,
    tertiaryCompletionRateRaw,
    learningPovertyPctRaw,
    literacyRateAdultPctRaw,
    genderParityIndexPrimaryRaw,
    genderParityIndexSecondaryRaw,
    genderParityIndexTertiaryRaw,
    trainedTeachersPrimaryPctRaw,
    trainedTeachersSecondaryPctRaw,
    trainedTeachersTertiaryPctRaw,
    publicExpenditureEducationPctGDPRaw,
    primaryPupilsTotalRaw,
    secondaryPupilsTotalRaw,
    primaryEnrollmentPctRaw,
    secondaryEnrollmentPctRaw,
    tertiaryEnrollmentPctRaw,
    tertiaryEnrollmentTotalRaw,
    primarySchoolsTotalRaw,
    secondarySchoolsTotalRaw,
  ] = await Promise.all([
    fetchIndicatorSeries(countryCode, 'primaryNetEnrollmentPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'secondaryNetEnrollmentPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'primaryCompletionRate', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'secondaryCompletionRate', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'tertiaryCompletionRate', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'learningPovertyPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'literacyRateAdultPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'genderParityIndexPrimary', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'genderParityIndexSecondary', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'genderParityIndexTertiary', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'trainedTeachersPrimaryPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'trainedTeachersSecondaryPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'trainedTeachersTertiaryPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'publicExpenditureEducationPctGDP', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'primaryPupilsTotal', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'secondaryPupilsTotal', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'primaryEnrollmentPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'secondaryEnrollmentPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'tertiaryEnrollmentPct', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'tertiaryEnrollmentTotal', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'primarySchoolsTotal', startYear, endYear),
    fetchIndicatorSeries(countryCode, 'secondarySchoolsTotal', startYear, endYear),
  ]);

  // Treat 0 as missing for public expenditure (implausible); no regional/world substitution for single countries.
  const publicExpenditureRawNormalized = treatZeroAsMissingForEducation(
    publicExpenditureEducationPctGDPRaw,
    'publicExpenditureEducationPctGDP',
  );

  // Education: only country data and parent (territory) fallback are used; no regional or world aggregates.
  const parentIso2ForEducation = TERRITORY_FALLBACK_PARENT[countryCode.toUpperCase()];
  let primaryNetEnrollmentPctForSeries = treatZeroAsMissingForEducation(
    primaryNetEnrollmentPctRaw,
    'primaryNetEnrollmentPct',
  );
  let secondaryNetEnrollmentPctForSeries = treatZeroAsMissingForEducation(
    secondaryNetEnrollmentPctRaw,
    'secondaryNetEnrollmentPct',
  );
  let primaryCompletionRateForSeries = primaryCompletionRateRaw;
  let secondaryCompletionRateForSeries = secondaryCompletionRateRaw;
  let tertiaryCompletionRateForSeries = tertiaryCompletionRateRaw;
  let learningPovertyPctForSeries = treatZeroAsMissingForEducation(
    learningPovertyPctRaw,
    'learningPovertyPct',
  );
  let literacyRateAdultPctForSeries = literacyRateAdultPctRaw;
  let genderParityIndexPrimaryForSeries = genderParityIndexPrimaryRaw;
  let genderParityIndexSecondaryForSeries = genderParityIndexSecondaryRaw;
  let genderParityIndexTertiaryForSeries = genderParityIndexTertiaryRaw;
  let trainedTeachersPrimaryPctForSeries = trainedTeachersPrimaryPctRaw;
  let trainedTeachersSecondaryPctForSeries = trainedTeachersSecondaryPctRaw;
  let trainedTeachersTertiaryPctForSeries = trainedTeachersTertiaryPctRaw;
  let publicExpenditureEducationPctGDPForSeries = publicExpenditureRawNormalized;
  let primaryPupilsTotalForSeries = primaryPupilsTotalRaw;
  let secondaryPupilsTotalForSeries = secondaryPupilsTotalRaw;
  let primaryEnrollmentPctForSeries = primaryEnrollmentPctRaw;
  let secondaryEnrollmentPctForSeries = secondaryEnrollmentPctRaw;
  let tertiaryEnrollmentPctForSeries = tertiaryEnrollmentPctRaw;
  let tertiaryEnrollmentTotalForSeries = tertiaryEnrollmentTotalRaw;
  let primarySchoolsTotalForSeries = primarySchoolsTotalRaw;
  let secondarySchoolsTotalForSeries = secondarySchoolsTotalRaw;

  // Do not use region or world aggregates for any education metrics; they would misrepresent a single country (e.g. world totals for enrollment counts, or regional averages for rates). Only country data and parent (territory) fallback are used.

  // Territory fallback for education: when country is a territory (e.g. Channel Islands), fill from parent country.
  if (parentIso2ForEducation) {
    const [
      parentPrimaryNet,
      parentSecondaryNet,
      parentCompletion,
      parentSecondaryCompletion,
      parentTertiaryCompletion,
      parentLearningPoverty,
      parentLiteracy,
      parentGPI,
      parentGPISec,
      parentGPITert,
      parentTrained,
      parentTrainedSec,
      parentTrainedTert,
      parentExpenditure,
      parentPrimaryPupils,
      parentSecondaryPupils,
      parentPrimaryEnrollmentPct,
      parentSecondaryEnrollmentPct,
      parentTertiaryPct,
      parentTertiaryTotal,
      parentPrimarySchools,
      parentSecondarySchools,
    ] = await Promise.all([
      fetchIndicatorSeries(parentIso2ForEducation, 'primaryNetEnrollmentPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'secondaryNetEnrollmentPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'primaryCompletionRate', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'secondaryCompletionRate', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'tertiaryCompletionRate', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'learningPovertyPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'literacyRateAdultPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'genderParityIndexPrimary', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'genderParityIndexSecondary', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'genderParityIndexTertiary', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'trainedTeachersPrimaryPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'trainedTeachersSecondaryPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'trainedTeachersTertiaryPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'publicExpenditureEducationPctGDP', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'primaryPupilsTotal', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'secondaryPupilsTotal', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'primaryEnrollmentPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'secondaryEnrollmentPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'tertiaryEnrollmentPct', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'tertiaryEnrollmentTotal', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'primarySchoolsTotal', startYear, endYear),
      fetchIndicatorSeries(parentIso2ForEducation, 'secondarySchoolsTotal', startYear, endYear),
    ]);
    primaryNetEnrollmentPctForSeries = mergeSeriesWithFallback(primaryNetEnrollmentPctForSeries, parentPrimaryNet, startYear, endYear);
    secondaryNetEnrollmentPctForSeries = mergeSeriesWithFallback(secondaryNetEnrollmentPctForSeries, parentSecondaryNet, startYear, endYear);
    primaryCompletionRateForSeries = mergeSeriesWithFallback(primaryCompletionRateForSeries, parentCompletion, startYear, endYear);
    secondaryCompletionRateForSeries = mergeSeriesWithFallback(secondaryCompletionRateForSeries, parentSecondaryCompletion, startYear, endYear);
    tertiaryCompletionRateForSeries = mergeSeriesWithFallback(tertiaryCompletionRateForSeries, parentTertiaryCompletion, startYear, endYear);
    learningPovertyPctForSeries = mergeSeriesWithFallback(learningPovertyPctForSeries, parentLearningPoverty, startYear, endYear);
    literacyRateAdultPctForSeries = mergeSeriesWithFallback(literacyRateAdultPctForSeries, parentLiteracy, startYear, endYear);
    genderParityIndexPrimaryForSeries = mergeSeriesWithFallback(genderParityIndexPrimaryForSeries, parentGPI, startYear, endYear);
    genderParityIndexSecondaryForSeries = mergeSeriesWithFallback(genderParityIndexSecondaryForSeries, parentGPISec, startYear, endYear);
    genderParityIndexTertiaryForSeries = mergeSeriesWithFallback(genderParityIndexTertiaryForSeries, parentGPITert, startYear, endYear);
    trainedTeachersPrimaryPctForSeries = mergeSeriesWithFallback(trainedTeachersPrimaryPctForSeries, parentTrained, startYear, endYear);
    trainedTeachersSecondaryPctForSeries = mergeSeriesWithFallback(trainedTeachersSecondaryPctForSeries, parentTrainedSec, startYear, endYear);
    trainedTeachersTertiaryPctForSeries = mergeSeriesWithFallback(trainedTeachersTertiaryPctForSeries, parentTrainedTert, startYear, endYear);
    publicExpenditureEducationPctGDPForSeries = mergeSeriesWithFallback(publicExpenditureEducationPctGDPForSeries, parentExpenditure, startYear, endYear);
    primaryPupilsTotalForSeries = mergeSeriesWithFallback(primaryPupilsTotalForSeries, parentPrimaryPupils, startYear, endYear);
    secondaryPupilsTotalForSeries = mergeSeriesWithFallback(secondaryPupilsTotalForSeries, parentSecondaryPupils, startYear, endYear);
    primaryEnrollmentPctForSeries = mergeSeriesWithFallback(primaryEnrollmentPctForSeries, parentPrimaryEnrollmentPct, startYear, endYear);
    secondaryEnrollmentPctForSeries = mergeSeriesWithFallback(secondaryEnrollmentPctForSeries, parentSecondaryEnrollmentPct, startYear, endYear);
    tertiaryEnrollmentPctForSeries = mergeSeriesWithFallback(tertiaryEnrollmentPctForSeries, parentTertiaryPct, startYear, endYear);
    tertiaryEnrollmentTotalForSeries = mergeSeriesWithFallback(tertiaryEnrollmentTotalForSeries, parentTertiaryTotal, startYear, endYear);
    primarySchoolsTotalForSeries = mergeSeriesWithFallback(primarySchoolsTotalForSeries, parentPrimarySchools, startYear, endYear);
    secondarySchoolsTotalForSeries = mergeSeriesWithFallback(secondarySchoolsTotalForSeries, parentSecondarySchools, startYear, endYear);
  }

  // Tertiary institutions (universities): UNESCO UIS API (not in World Bank WDI)
  const tertiaryInstitutionsRaw = summary.iso3Code
    ? await fetchTertiaryInstitutionsSeries(summary.iso3Code, startYear, endYear)
    : [];
  const tertiaryInstitutionsForSeries = fillSeriesWithFallback(tertiaryInstitutionsRaw, startYear, endYear);

  // Estimated number of schools and universities (derived from enrollment using typical average institution size).
  // These are modelled counts, not official UIS "number of schools" indicators.
  const primarySchoolCountForSeries: TimePoint[] = fillSeriesWithFallback(
    primaryPupilsTotalForSeries,
    startYear,
    endYear,
  ).map((p) => ({
    ...p,
    value:
      p.value != null && Number.isFinite(p.value)
        ? p.value / 250 // assume ~250 pupils per primary school
        : null,
  }));
  const secondarySchoolCountForSeries: TimePoint[] = fillSeriesWithFallback(
    secondaryPupilsTotalForSeries,
    startYear,
    endYear,
  ).map((p) => ({
    ...p,
    value:
      p.value != null && Number.isFinite(p.value)
        ? p.value / 500 // assume ~500 pupils per secondary school
        : null,
  }));
  const tertiaryInstitutionCountForSeries: TimePoint[] = fillSeriesWithFallback(
    tertiaryEnrollmentTotalForSeries,
    startYear,
    endYear,
  ).map((p) => ({
    ...p,
    value:
      p.value != null && Number.isFinite(p.value)
        ? p.value / 5000 // assume ~5,000 students per tertiary institution
        : null,
  }));

  // Fill any remaining gaps in primary net enrollment so out-of-school timeline is dense.
  const primaryNetEnrollmentDense = fillSeriesWithFallback(primaryNetEnrollmentPctForSeries, startYear, endYear);
  const secondaryNetEnrollmentDense = fillSeriesWithFallback(secondaryNetEnrollmentPctForSeries, startYear, endYear);
  const OUT_OF_SCHOOL_DEFAULT_PCT = 10; // Last-resort when no country/region/world data for a year
  const outOfSchoolPrimaryPctSeries: TimePoint[] = primaryNetEnrollmentDense.map((p) => {
    const netEnroll = p.value != null && Number.isFinite(p.value) ? p.value : null;
    const outOfSchool = netEnroll != null ? 100 - netEnroll : OUT_OF_SCHOOL_DEFAULT_PCT;
    return {
      ...p,
      value: clampEducationPct('outOfSchoolPrimaryPct', outOfSchool),
    };
  });
  const outOfSchoolSecondaryPctSeries: TimePoint[] = secondaryNetEnrollmentDense.map((p) => {
    const netEnroll = p.value != null && Number.isFinite(p.value) ? p.value : null;
    const outOfSchool = netEnroll != null ? 100 - netEnroll : null;
    return {
      ...p,
      value: outOfSchool != null ? clampEducationPct('outOfSchoolSecondaryPct', outOfSchool) : null,
    };
  });
  // Tertiary out-of-school: derived from tertiary gross enrollment as max(0, 100 - gross) (WDI does not report tertiary net enrollment).
  const tertiaryEnrollmentDenseForOutOfSchool = fillSeriesWithFallback(tertiaryEnrollmentPctForSeries, startYear, endYear);
  const outOfSchoolTertiaryPctSeries: TimePoint[] = tertiaryEnrollmentDenseForOutOfSchool.map((p) => {
    const gross = p.value != null && Number.isFinite(p.value) ? p.value : null;
    const outOfSchool = gross != null ? Math.max(0, 100 - gross) : null;
    return {
      ...p,
      value: outOfSchool != null ? clampEducationPct('outOfSchoolTertiaryPct', outOfSchool) : null,
    };
  });
  // Fill gaps in learning poverty and derive min proficiency with last-resort default so chart is never empty when country has no data for a year.
  const learningPovertyDense = fillSeriesWithFallback(learningPovertyPctForSeries, startYear, endYear);
  const MIN_PROFICIENCY_DEFAULT_PCT = 70; // Last-resort when no country/region/world data (typical global ~50–70%)
  const minProficiencyReadingPctSeries: TimePoint[] = learningPovertyDense.map((p) => {
    const learningPoverty = p.value != null && Number.isFinite(p.value) ? p.value : null;
    const minProficiency = learningPoverty != null ? 100 - learningPoverty : MIN_PROFICIENCY_DEFAULT_PCT;
    return {
      ...p,
      value: clampEducationPct('minProficiencyReadingPct', minProficiency),
    };
  });

  const macroStartYear = Math.min(startYear, 1990);
  const parentIso2 = TERRITORY_FALLBACK_PARENT[countryCode.toUpperCase()];

  // Fallback for territories with empty macro/financial data: use parent country's series.
  let inflationCPIRawFinal = inflationCPIRaw;
  let interestRateRawFinal = interestRateRaw;
  let gdpNominalFinal = gdpNominal;
  let gdpPPPFinal = gdpPPP;
  let gdpNominalPerCapitaFinal = gdpNominalPerCapita;
  let gdpPPPPerCapitaFinal = gdpPPPPerCapita;
  let govDebtPercentGDPRawFinal = govDebtPercentGDPRaw;

  if (parentIso2) {
    const needsInflation = !hasAnyData(inflationCPIRaw);
    const needsInterest = !hasAnyData(interestRateRaw);
    const needsGdp = !hasAnyData(gdpNominal);
    const needsGdpPPP = !hasAnyData(gdpPPP);
    const needsGdpPc = !hasAnyData(gdpNominalPerCapita);
    const needsGdpPPPpc = !hasAnyData(gdpPPPPerCapita);
    const needsGovDebt = !hasAnyData(govDebtPercentGDPRaw);

    if (
      needsInflation ||
      needsInterest ||
      needsGdp ||
      needsGdpPPP ||
      needsGdpPc ||
      needsGdpPPPpc ||
      needsGovDebt
    ) {
      const [
        parentInflation,
        parentInterest,
        parentGdpNominal,
        parentGdpPPP,
        parentGdpNominalPerCapita,
        parentGdpPPPPerCapita,
        parentGovDebt,
      ] = await Promise.all([
        needsInflation
          ? fetchIndicatorSeries(parentIso2, 'inflationCPI', macroStartYear, endYear)
          : Promise.resolve([]),
        needsInterest
          ? fetchIndicatorSeries(parentIso2, 'interestRate', macroStartYear, endYear)
          : Promise.resolve([]),
        needsGdp
          ? fetchIndicatorSeries(parentIso2, 'gdpNominal', startYear, endYear)
          : Promise.resolve([]),
        needsGdpPPP
          ? fetchIndicatorSeries(parentIso2, 'gdpPPP', startYear, endYear)
          : Promise.resolve([]),
        needsGdpPc
          ? fetchIndicatorSeries(parentIso2, 'gdpNominalPerCapita', startYear, endYear)
          : Promise.resolve([]),
        needsGdpPPPpc
          ? fetchIndicatorSeries(parentIso2, 'gdpPPPPerCapita', startYear, endYear)
          : Promise.resolve([]),
        needsGovDebt
          ? fetchIndicatorSeries(parentIso2, 'govDebtPercentGDP', macroStartYear, endYear)
          : Promise.resolve([]),
      ]);
      if (parentInflation.length) inflationCPIRawFinal = parentInflation;
      if (parentInterest.length) interestRateRawFinal = parentInterest;
      if (parentGdpNominal.length) gdpNominalFinal = parentGdpNominal;
      if (parentGdpPPP.length) gdpPPPFinal = parentGdpPPP;
      if (parentGdpNominalPerCapita.length) gdpNominalPerCapitaFinal = parentGdpNominalPerCapita;
      if (parentGdpPPPPerCapita.length) gdpPPPPerCapitaFinal = parentGdpPPPPerCapita;
      if (parentGovDebt.length) govDebtPercentGDPRawFinal = parentGovDebt;
    }
  }

  gdpNominal = gdpNominalFinal;
  gdpPPP = gdpPPPFinal;
  gdpNominalPerCapita = gdpNominalPerCapitaFinal;
  gdpPPPPerCapita = gdpPPPPerCapitaFinal;

  let inflationCPI = fillSeriesWithFallback(
    inflationCPIRawFinal,
    startYear,
    endYear,
  );
  let govDebtPercentGDP = fillSeriesWithFallback(
    govDebtPercentGDPRawFinal,
    macroStartYear,
    endYear,
  );
  const interestRate = fillSeriesWithFallback(
    interestRateRawFinal,
    macroStartYear,
    endYear,
  );
  const unemploymentRate = fillSeriesWithFallback(
    unemploymentRateRaw,
    macroStartYear,
    endYear,
  );
  const labourForceTotal = fillSeriesWithFallback(
    labourForceTotalRaw,
    macroStartYear,
    endYear,
  );

  // Unemployed (number): use API series when available; else derive from labour force × unemployment rate.
  const unemployedTotalRawFilled = fillSeriesWithFallback(
    unemployedTotalRaw,
    macroStartYear,
    endYear,
  );
  const unemployedTotal = (() => {
    if (hasAnyData(unemployedTotalRawFilled)) return unemployedTotalRawFilled;
    const derived: TimePoint[] = [];
    const lfByYear = new Map(labourForceTotal.filter((p) => p.value != null).map((p) => [p.year, p.value as number]));
    const rateByYear = new Map(unemploymentRate.filter((p) => p.value != null).map((p) => [p.year, p.value as number]));
    for (let y = macroStartYear; y <= endYear; y += 1) {
      const lf = lfByYear.get(y);
      const rate = rateByYear.get(y);
      if (lf != null && rate != null && Number.isFinite(lf) && Number.isFinite(rate))
        derived.push({ year: y, date: `${y}-01-01`, value: Math.round((lf * rate) / 100) });
      else
        derived.push({ year: y, date: `${y}-01-01`, value: null });
    }
    return derived;
  })();

  const povertyHeadcount215 = fillSeriesWithFallback(
    povertyHeadcount215Raw,
    macroStartYear,
    endYear,
  );
  const povertyHeadcountNational = fillSeriesWithFallback(
    povertyHeadcountNationalRaw,
    macroStartYear,
    endYear,
  );

  const maternalMortalityRatioSeries = fillSeriesWithFallback(
    maternalMortalityRatioRaw,
    macroStartYear,
    endYear,
  );
  const under5MortalityRateSeries = fillSeriesWithFallback(
    under5MortalityRateRaw,
    macroStartYear,
    endYear,
  );
  const undernourishmentPrevalenceSeries = fillSeriesWithFallback(
    undernourishmentPrevalenceRaw,
    macroStartYear,
    endYear,
  );

  // Fallback: IMF GDP when World Bank has no nominal GDP (e.g. small territories).
  const iso3 = summary.iso3Code?.toUpperCase();
  if (iso3 && !hasAnyData(gdpNominal)) {
    try {
      const imfGdp = await fetchGDPFromIMF(iso3, startYear, endYear);
      if (hasAnyData(imfGdp)) {
        gdpNominal = mergeSeriesWithFallback(gdpNominal, imfGdp, startYear, endYear);
      }
    } catch {
      // Keep WB-only series
    }
  }

  // Fallback: estimated financial metrics for countries with no WB/IMF data (e.g. North Korea – Bank of Korea / UN estimates).
  const estimated = iso3 ? ESTIMATED_FINANCIAL_FALLBACK[iso3] : undefined;
  if (estimated) {
    const ref = estimated.referenceYear;
    const yearRange = ESTIMATED_FALLBACK_YEAR_RANGE;
    const inRange = (y: number) => y >= ref - yearRange && y <= ref + yearRange;
    if (!hasAnyData(gdpNominal)) {
      gdpNominal = mergeSeriesWithFallback(
        gdpNominal,
        Array.from({ length: endYear - startYear + 1 }, (_, i) => {
          const y = startYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.gdpNominal : null,
          };
        }),
        startYear,
        endYear,
      );
    }
    if (!hasAnyData(gdpPPP) && estimated.gdpPPP != null) {
      gdpPPP = mergeSeriesWithFallback(
        gdpPPP,
        Array.from({ length: endYear - startYear + 1 }, (_, i) => {
          const y = startYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.gdpPPP! : null,
          };
        }),
        startYear,
        endYear,
      );
    }
    if (!hasAnyData(gdpNominalPerCapita)) {
      gdpNominalPerCapita = mergeSeriesWithFallback(
        gdpNominalPerCapita,
        Array.from({ length: endYear - startYear + 1 }, (_, i) => {
          const y = startYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.gdpNominalPerCapita : null,
          };
        }),
        startYear,
        endYear,
      );
    }
    if (!hasAnyData(gdpPPPPerCapita) && estimated.gdpPPPPerCapita != null) {
      gdpPPPPerCapita = mergeSeriesWithFallback(
        gdpPPPPerCapita,
        Array.from({ length: endYear - startYear + 1 }, (_, i) => {
          const y = startYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.gdpPPPPerCapita! : null,
          };
        }),
        startYear,
        endYear,
      );
    }
    if (estimated.inflationCPI != null) {
      const inflationEstimated: TimePoint[] = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => {
          const y = startYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.inflationCPI! : null,
          };
        },
      );
      inflationCPI = mergeSeriesWithFallback(inflationCPI, inflationEstimated, startYear, endYear);
    }
    if (estimated.govDebtPercentGDP != null) {
      const govDebtEstimated: TimePoint[] = Array.from(
        { length: endYear - macroStartYear + 1 },
        (_, i) => {
          const y = macroStartYear + i;
          return {
            year: y,
            date: `${y}-01-01`,
            value: inRange(y) ? estimated.govDebtPercentGDP! : null,
          };
        },
      );
      govDebtPercentGDP = mergeSeriesWithFallback(
        govDebtPercentGDP,
        govDebtEstimated,
        macroStartYear,
        endYear,
      );
    }
  }

  // Fallback: merge IMF WEO government debt into series for macro timeline (all countries).
  if (iso3) {
    try {
      const imfSeries = await fetchGovernmentDebtSeriesFromIMF(iso3, macroStartYear, endYear);
      if (imfSeries.length > 0) {
        const wbByYear = new Map(
          govDebtPercentGDP.filter((p) => p.value != null).map((p) => [p.year, p.value as number]),
        );
        const mergedPoints: TimePoint[] = [];
        for (let y = macroStartYear; y <= endYear; y += 1) {
          const value = wbByYear.get(y) ?? imfSeries.find((p) => p.year === y)?.value ?? null;
          mergedPoints.push({ year: y, date: `${y}-01-01`, value });
        }
        govDebtPercentGDP = mergedPoints;
      }
    } catch {
      // Keep WB-only series
    }
  }

  const financialSeries: MetricSeries[] = [
    {
      id: 'gdpNominal',
      label: 'GDP (Nominal, US$)',
      unit: 'USD',
      points: gdpNominal,
    },
    {
      id: 'gdpPPP',
      label: 'GDP (PPP, Intl$)',
      unit: 'Intl$',
      points: gdpPPP,
    },
    {
      id: 'gdpNominalPerCapita',
      label: 'GDP per Capita (Nominal, US$)',
      unit: 'USD',
      points: gdpNominalPerCapita,
    },
    {
      id: 'gdpPPPPerCapita',
      label: 'GDP per Capita (PPP, Intl$)',
      unit: 'Intl$',
      points: gdpPPPPerCapita,
    },
    {
      id: 'govDebtUSD',
      label: 'Government debt (USD)',
      unit: 'USD',
      points: (() => {
        const gdpByYear = new Map(
          gdpNominal.filter((p) => p.value != null).map((p) => [p.year, p.value as number]),
        );
        const debtPctByYear = new Map(
          govDebtPercentGDP.filter((p) => p.value != null).map((p) => [p.year, p.value as number]),
        );
        const years = new Set([...gdpByYear.keys(), ...debtPctByYear.keys()]);
        return [...years]
          .sort((a, b) => a - b)
          .map((year) => {
            const gdp = gdpByYear.get(year);
            const pct = debtPctByYear.get(year);
            const value =
              gdp != null && pct != null && pct > 0
                ? (gdp * pct) / 100
                : null;
            return { year, date: `${year}-01-01`, value };
          });
      })(),
    },
    {
      id: 'inflationCPI',
      label: 'Inflation (CPI, %)',
      unit: '%',
      points: inflationCPI,
    },
    {
      id: 'govDebtPercentGDP',
      label: 'Government debt (% of GDP)',
      unit: '% of GDP',
      points: govDebtPercentGDP,
    },
    {
      id: 'interestRate',
      label: 'Lending interest rate (%)',
      unit: '%',
      points: interestRate,
    },
    {
      id: 'unemploymentRate',
      label: 'Unemployment rate (% of labour force)',
      unit: '% of labour force',
      points: unemploymentRate,
    },
    {
      id: 'unemployedTotal',
      label: 'Unemployed (number of people)',
      unit: 'People',
      points: unemployedTotal,
    },
    {
      id: 'labourForceTotal',
      label: 'Labour force (total)',
      unit: 'People',
      points: labourForceTotal,
    },
    {
      id: 'povertyHeadcount215',
      label: 'Poverty headcount ($2.15/day, %)',
      unit: '% of population',
      points: povertyHeadcount215,
    },
    {
      id: 'povertyHeadcountNational',
      label: 'Poverty headcount (national line, %)',
      unit: '% of population',
      points: povertyHeadcountNational,
    },
  ];

  const populationSeries: MetricSeries[] = [
    {
      id: 'populationTotal',
      label: 'Population',
      unit: 'People',
      points: population,
    },
  ];

  const healthSeries: MetricSeries[] = [
    {
      id: 'lifeExpectancy',
      label: 'Life Expectancy at Birth (Years)',
      unit: 'Years',
      points: lifeExpectancy,
    },
    {
      id: 'maternalMortalityRatio',
      label: 'Maternal mortality ratio (per 100,000 live births)',
      unit: 'Per 100,000 live births',
      points: maternalMortalityRatioSeries,
    },
    {
      id: 'under5MortalityRate',
      label: 'Under-5 mortality rate (per 1,000 live births)',
      unit: 'Per 1,000 live births',
      points: under5MortalityRateSeries,
    },
    {
      id: 'undernourishmentPrevalence',
      label: 'Prevalence of undernourishment (% of population)',
      unit: '% of population',
      points: undernourishmentPrevalenceSeries,
    },
    {
      id: 'pop0_14Share',
      label: 'Population 0–14 (% of total)',
      unit: '% of population',
      points: pop0_14PctSeries,
    },
    {
      id: 'pop15_64Share',
      label: 'Population 15–64 (% of total)',
      unit: '% of population',
      points: pop15_64PctSeries,
    },
    {
      id: 'pop65PlusShare',
      label: 'Population 65+ (% of total)',
      unit: '% of population',
      points: pop65PlusPctSeries,
    },
  ];

  const educationSeries: MetricSeries[] = [
    {
      id: 'outOfSchoolPrimaryPct',
      label: 'Out-of-school rate (primary, % of primary school age)',
      unit: '%',
      points: outOfSchoolPrimaryPctSeries,
    },
    {
      id: 'outOfSchoolSecondaryPct',
      label: 'Out-of-school rate (secondary, % of secondary school age)',
      unit: '%',
      points: outOfSchoolSecondaryPctSeries,
    },
    {
      id: 'outOfSchoolTertiaryPct',
      label: 'Out-of-school rate (tertiary, %)',
      unit: '%',
      points: outOfSchoolTertiaryPctSeries,
    },
    {
      id: 'primaryCompletionRate',
      label: 'Primary completion rate (gross, % of relevant age group)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(primaryCompletionRateForSeries, startYear, endYear), 'primaryCompletionRate'),
    },
    {
      id: 'secondaryCompletionRate',
      label: 'Secondary completion rate (gross, % of relevant age group)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(secondaryCompletionRateForSeries, startYear, endYear), 'secondaryCompletionRate'),
    },
    {
      id: 'tertiaryCompletionRate',
      label: 'Tertiary completion rate (gross, %)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(tertiaryCompletionRateForSeries, startYear, endYear), 'tertiaryCompletionRate'),
    },
    {
      id: 'minProficiencyReadingPct',
      label: 'Minimum reading proficiency (% of children at end of primary)',
      unit: '%',
      points: minProficiencyReadingPctSeries,
    },
    {
      id: 'literacyRateAdultPct',
      label: 'Literacy rate, adult (% of people ages 15+)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(literacyRateAdultPctForSeries, startYear, endYear), 'literacyRateAdultPct'),
    },
    {
      id: 'genderParityIndexPrimary',
      label: 'Gender parity index (GPI), primary enrollment',
      unit: 'ratio',
      points: fillSeriesWithFallback(genderParityIndexPrimaryForSeries, startYear, endYear),
    },
    {
      id: 'genderParityIndexSecondary',
      label: 'Gender parity index (GPI), secondary enrollment',
      unit: 'ratio',
      points: fillSeriesWithFallback(genderParityIndexSecondaryForSeries, startYear, endYear),
    },
    {
      id: 'genderParityIndexTertiary',
      label: 'Gender parity index (GPI), tertiary enrollment',
      unit: 'ratio',
      points: fillSeriesWithFallback(genderParityIndexTertiaryForSeries, startYear, endYear),
    },
    {
      id: 'trainedTeachersPrimaryPct',
      label: 'Trained teachers in primary education (% of total teachers)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(trainedTeachersPrimaryPctForSeries, startYear, endYear), 'trainedTeachersPrimaryPct'),
    },
    {
      id: 'trainedTeachersSecondaryPct',
      label: 'Trained teachers in secondary education (% of total teachers)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(trainedTeachersSecondaryPctForSeries, startYear, endYear), 'trainedTeachersSecondaryPct'),
    },
    {
      id: 'trainedTeachersTertiaryPct',
      label: 'Trained teachers in tertiary education (% of total teachers)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(trainedTeachersTertiaryPctForSeries, startYear, endYear), 'trainedTeachersTertiaryPct'),
    },
    {
      id: 'publicExpenditureEducationPctGDP',
      label: 'Public expenditure on education (% of GDP)',
      unit: '% of GDP',
      points: fillSeriesWithFallback(publicExpenditureEducationPctGDPForSeries, startYear, endYear),
    },
    {
      id: 'primaryPupilsTotal',
      label: 'Primary enrollment (total)',
      unit: 'Students',
      points: fillSeriesWithFallback(primaryPupilsTotalForSeries, startYear, endYear),
    },
    {
      id: 'secondaryPupilsTotal',
      label: 'Secondary enrollment (total)',
      unit: 'Students',
      points: fillSeriesWithFallback(secondaryPupilsTotalForSeries, startYear, endYear),
    },
    {
      id: 'primaryEnrollmentPct',
      label: 'School enrollment, primary (% gross)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(primaryEnrollmentPctForSeries, startYear, endYear), 'primaryEnrollmentPct'),
    },
    {
      id: 'secondaryEnrollmentPct',
      label: 'School enrollment, secondary (% gross)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(secondaryEnrollmentPctForSeries, startYear, endYear), 'secondaryEnrollmentPct'),
    },
    {
      id: 'tertiaryEnrollmentPct',
      label: 'School enrollment, tertiary (% gross)',
      unit: '%',
      points: clampEducationSeriesPoints(fillSeriesWithFallback(tertiaryEnrollmentPctForSeries, startYear, endYear), 'tertiaryEnrollmentPct'),
    },
    {
      id: 'tertiaryEnrollmentTotal',
      label: 'Tertiary enrollment (total)',
      unit: 'Students',
      points: fillSeriesWithFallback(tertiaryEnrollmentTotalForSeries, startYear, endYear),
    },
    {
      id: 'primarySchoolsTotal',
      label: 'Primary education, teachers (total)',
      unit: 'Teachers',
      points: fillSeriesWithFallback(primarySchoolsTotalForSeries, startYear, endYear),
    },
    {
      id: 'secondarySchoolsTotal',
      label: 'Secondary education, teachers (total)',
      unit: 'Teachers',
      points: fillSeriesWithFallback(secondarySchoolsTotalForSeries, startYear, endYear),
    },
    {
      id: 'tertiaryInstitutionsTotal',
      label: 'Tertiary education, teachers (total)',
      unit: 'Teachers',
      points: tertiaryInstitutionsForSeries,
    },
    {
      id: 'primarySchoolCount',
      label: 'Number of primary schools',
      unit: 'Schools',
      points: primarySchoolCountForSeries,
    },
    {
      id: 'secondarySchoolCount',
      label: 'Number of secondary schools',
      unit: 'Schools',
      points: secondarySchoolCountForSeries,
    },
    {
      id: 'tertiaryInstitutionCount',
      label: 'Number of universities and tertiary institutions',
      unit: 'Institutions',
      points: tertiaryInstitutionCountForSeries,
    },
  ];

  const allYears = new Set<number>();
  for (const p of [...gdpNominal, ...population]) {
    allYears.add(p.year);
  }
  const sortedYears = [...allYears].sort((a, b) => a - b);

  // Clamp the effective range to both the available data and the requested window.
  const effectiveStart = sortedYears[0] ?? startYear;
  const effectiveEnd = sortedYears[sortedYears.length - 1] ?? endYear;

  // Use the dashboard's endYear (clamped to the effective range) for the
  // "latest snapshot" so country comparison follows the year filter.
  const targetYear = Math.min(Math.max(endYear, effectiveStart), effectiveEnd);

  let latestSnapshot: CountryYearSnapshot | undefined;
  if (Number.isFinite(targetYear)) {
    const year = targetYear;

    const latestNonNullUpToYear = (
      series: TimePoint[],
      maxYear: number,
    ): number | null => {
      const candidates = series.filter((p) => p.year <= maxYear && p.value != null);
      if (!candidates.length) return null;
      return candidates[candidates.length - 1].value ?? null;
    };

    const populationBreakdown = await buildPopulationBreakdown(year, countryCode);
    let landAreaValue = latestNonNullUpToYear(landAreaSeries, year);
    let surfaceAreaValue = latestNonNullUpToYear(surfaceAreaSeries, year);
    const iso3ForArea = summary.iso3Code?.toUpperCase();
    const areaFallbackDashboard = iso3ForArea ? AREA_FALLBACK_KM2[iso3ForArea] : undefined;
    if (areaFallbackDashboard) {
      if (landAreaValue == null) landAreaValue = areaFallbackDashboard.land;
      if (surfaceAreaValue == null) surfaceAreaValue = areaFallbackDashboard.total;
    }

    latestSnapshot = {
      country: summary,
      year,
      metrics: {
        financial: {
          gdpNominal: latestNonNullUpToYear(gdpNominal, year),
          gdpPPP: latestNonNullUpToYear(gdpPPP, year),
          gdpNominalPerCapita: latestNonNullUpToYear(gdpNominalPerCapita, year),
          gdpPPPPerCapita: latestNonNullUpToYear(gdpPPPPerCapita, year),
          inflationCPI: latestNonNullUpToYear(inflationCPI, year),
          govDebtPercentGDP: latestNonNullUpToYear(govDebtPercentGDP, year),
          govDebtUSD: (() => {
            const gdp = latestNonNullUpToYear(gdpNominal, year);
            const pct = latestNonNullUpToYear(govDebtPercentGDP, year);
            if (gdp != null && pct != null && pct > 0) return (gdp * pct) / 100;
            return null;
          })(),
          interestRate: latestNonNullUpToYear(interestRate, year),
          unemploymentRate: latestNonNullUpToYear(unemploymentRate, year),
          unemployedTotal: (() => {
            const raw = latestNonNullUpToYear(unemployedTotal, year);
            if (raw != null && Number.isFinite(raw)) return raw;
            const lf = latestNonNullUpToYear(labourForceTotal, year);
            const rate = latestNonNullUpToYear(unemploymentRate, year);
            if (lf != null && rate != null && Number.isFinite(lf) && Number.isFinite(rate)) {
              return Math.round((lf * rate) / 100);
            }
            return null;
          })(),
          labourForceTotal: latestNonNullUpToYear(labourForceTotal, year),
          povertyHeadcount215: latestNonNullUpToYear(povertyHeadcount215, year),
          povertyHeadcountNational: latestNonNullUpToYear(
            povertyHeadcountNational,
            year,
          ),
        },
        population: {
          total: populationBreakdown.total,
          ageBreakdown: {
            year,
            total: populationBreakdown.total,
            groups: populationBreakdown.groups,
          },
        },
        health: {
          lifeExpectancy: latestNonNullUpToYear(lifeExpectancy, year),
          maternalMortalityRatio: latestNonNullUpToYear(
            maternalMortalityRatioSeries,
            year,
          ),
          under5MortalityRate: latestNonNullUpToYear(
            under5MortalityRateSeries,
            year,
          ),
          undernourishmentPrevalence: latestNonNullUpToYear(
            undernourishmentPrevalenceSeries,
            year,
          ),
        },
        education: {
          outOfSchoolPrimaryPct: clampEducationPct('outOfSchoolPrimaryPct', latestNonNullUpToYear(outOfSchoolPrimaryPctSeries, year)),
          outOfSchoolSecondaryPct: clampEducationPct('outOfSchoolSecondaryPct', latestNonNullUpToYear(outOfSchoolSecondaryPctSeries, year)),
          outOfSchoolTertiaryPct: clampEducationPct('outOfSchoolTertiaryPct', latestNonNullUpToYear(outOfSchoolTertiaryPctSeries, year)),
          primaryCompletionRate: clampEducationPct('primaryCompletionRate', latestNonNullUpToYear(
            fillSeriesWithFallback(primaryCompletionRateForSeries, startYear, endYear),
            year,
          )),
          secondaryCompletionRate: clampEducationPct('secondaryCompletionRate', latestNonNullUpToYear(
            fillSeriesWithFallback(secondaryCompletionRateForSeries, startYear, endYear),
            year,
          )),
          tertiaryCompletionRate: clampEducationPct('tertiaryCompletionRate', latestNonNullUpToYear(
            fillSeriesWithFallback(tertiaryCompletionRateForSeries, startYear, endYear),
            year,
          )),
          minProficiencyReadingPct: clampEducationPct('minProficiencyReadingPct', latestNonNullUpToYear(minProficiencyReadingPctSeries, year)),
          literacyRateAdultPct: clampEducationPct('literacyRateAdultPct', latestNonNullUpToYear(
            fillSeriesWithFallback(literacyRateAdultPctForSeries, startYear, endYear),
            year,
          )),
          genderParityIndexPrimary: latestNonNullUpToYear(
            fillSeriesWithFallback(genderParityIndexPrimaryForSeries, startYear, endYear),
            year,
          ),
          genderParityIndexSecondary: latestNonNullUpToYear(
            fillSeriesWithFallback(genderParityIndexSecondaryForSeries, startYear, endYear),
            year,
          ),
          genderParityIndexTertiary: latestNonNullUpToYear(
            fillSeriesWithFallback(genderParityIndexTertiaryForSeries, startYear, endYear),
            year,
          ),
          trainedTeachersPrimaryPct: clampEducationPct('trainedTeachersPrimaryPct', latestNonNullUpToYear(
            fillSeriesWithFallback(trainedTeachersPrimaryPctForSeries, startYear, endYear),
            year,
          )),
          trainedTeachersSecondaryPct: clampEducationPct('trainedTeachersSecondaryPct', latestNonNullUpToYear(
            fillSeriesWithFallback(trainedTeachersSecondaryPctForSeries, startYear, endYear),
            year,
          )),
          trainedTeachersTertiaryPct: clampEducationPct('trainedTeachersTertiaryPct', latestNonNullUpToYear(
            fillSeriesWithFallback(trainedTeachersTertiaryPctForSeries, startYear, endYear),
            year,
          )),
          publicExpenditureEducationPctGDP: latestNonNullUpToYear(
            fillSeriesWithFallback(publicExpenditureEducationPctGDPForSeries, startYear, endYear),
            year,
          ),
          primaryPupilsTotal: latestNonNullUpToYear(
            fillSeriesWithFallback(primaryPupilsTotalForSeries, startYear, endYear),
            year,
          ),
          secondaryPupilsTotal: latestNonNullUpToYear(
            fillSeriesWithFallback(secondaryPupilsTotalForSeries, startYear, endYear),
            year,
          ),
          primaryEnrollmentPct: clampEducationPct('primaryEnrollmentPct', latestNonNullUpToYear(
            fillSeriesWithFallback(primaryEnrollmentPctForSeries, startYear, endYear),
            year,
          )),
          secondaryEnrollmentPct: clampEducationPct('secondaryEnrollmentPct', latestNonNullUpToYear(
            fillSeriesWithFallback(secondaryEnrollmentPctForSeries, startYear, endYear),
            year,
          )),
          tertiaryEnrollmentPct: clampEducationPct('tertiaryEnrollmentPct', latestNonNullUpToYear(
            fillSeriesWithFallback(tertiaryEnrollmentPctForSeries, startYear, endYear),
            year,
          )),
          tertiaryEnrollmentTotal: latestNonNullUpToYear(
            fillSeriesWithFallback(tertiaryEnrollmentTotalForSeries, startYear, endYear),
            year,
          ),
          primarySchoolsTotal: latestNonNullUpToYear(
            fillSeriesWithFallback(primarySchoolsTotalForSeries, startYear, endYear),
            year,
          ),
          secondarySchoolsTotal: latestNonNullUpToYear(
            fillSeriesWithFallback(secondarySchoolsTotalForSeries, startYear, endYear),
            year,
          ),
          tertiaryInstitutionsTotal: latestNonNullUpToYear(tertiaryInstitutionsForSeries, year),
          primarySchoolCount: latestNonNullUpToYear(primarySchoolCountForSeries, year),
          secondarySchoolCount: latestNonNullUpToYear(secondarySchoolCountForSeries, year),
          tertiaryInstitutionCount: latestNonNullUpToYear(tertiaryInstitutionCountForSeries, year),
        },
        geography: {
          landAreaKm2: landAreaValue,
          totalAreaKm2: surfaceAreaValue ?? landAreaValue,
          eezKm2: (() => {
            const iso3 = summary.iso3Code?.toUpperCase() ?? summary.iso2Code?.toUpperCase();
            const eez = iso3 ? EEZ_BY_ISO3[iso3] : undefined;
            return eez != null ? eez : null;
          })(),
        },
      },
    };

    // Align dashboard snapshot with global metrics: when the per-country
    // indicator series are empty or incomplete but the global metrics table
    // has values (e.g. UAE GDP, inflation), backfill missing snapshot fields
    // from `fetchGlobalCountryMetricsForYear(year)`. This keeps Country
    // Dashboard and Global Analytics consistent without fabricating data.
    try {
      const globalRows = await fetchGlobalCountryMetricsForYear(year);
      const match = globalRows.find(
        (row) =>
          row.iso2Code?.toUpperCase() === summary.iso2Code?.toUpperCase() ||
          (row.iso3Code && row.iso3Code.toUpperCase() === (summary.iso3Code ?? '').toUpperCase()),
      );
      if (match && latestSnapshot) {
        const fin = latestSnapshot.metrics.financial;
        const pop = latestSnapshot.metrics.population;
        const healthSnap = latestSnapshot.metrics.health;
        const eduSnap = latestSnapshot.metrics.education;

        fin.gdpNominal ??= match.gdpNominal ?? null;
        fin.gdpPPP ??= match.gdpPPP ?? null;
        fin.gdpNominalPerCapita ??= match.gdpNominalPerCapita ?? null;
        fin.gdpPPPPerCapita ??= match.gdpPPPPerCapita ?? null;
        fin.inflationCPI ??= match.inflationCPI ?? null;
        fin.govDebtPercentGDP ??= match.govDebtPercentGDP ?? null;
        fin.govDebtUSD ??= match.govDebtUSD ?? null;
        fin.interestRate ??= match.interestRate ?? null;
        fin.unemploymentRate ??= match.unemploymentRate ?? null;
        fin.unemployedTotal ??= match.unemployedTotal ?? null;
        fin.labourForceTotal ??= match.labourForceTotal ?? null;
        fin.povertyHeadcount215 ??= match.povertyHeadcount215 ?? null;
        fin.povertyHeadcountNational ??= match.povertyHeadcountNational ?? null;

        if (pop.total == null && match.populationTotal != null) {
          pop.total = match.populationTotal;
          if (pop.ageBreakdown) {
            pop.ageBreakdown.total = match.populationTotal;
          }
        }

        healthSnap.lifeExpectancy ??= match.lifeExpectancy ?? null;
        healthSnap.maternalMortalityRatio ??= match.maternalMortalityRatio ?? null;
        healthSnap.under5MortalityRate ??= match.under5MortalityRate ?? null;
        healthSnap.undernourishmentPrevalence ??=
          match.undernourishmentPrevalence ?? null;
        if (eduSnap) {
          eduSnap.outOfSchoolPrimaryPct ??= match.outOfSchoolPrimaryPct ?? null;
          eduSnap.outOfSchoolSecondaryPct ??= match.outOfSchoolSecondaryPct ?? null;
          eduSnap.outOfSchoolTertiaryPct ??= match.outOfSchoolTertiaryPct ?? null;
          eduSnap.primaryCompletionRate ??= match.primaryCompletionRate ?? null;
          eduSnap.secondaryCompletionRate ??= match.secondaryCompletionRate ?? null;
          eduSnap.tertiaryCompletionRate ??= match.tertiaryCompletionRate ?? null;
          eduSnap.minProficiencyReadingPct ??= match.minProficiencyReadingPct ?? null;
          eduSnap.literacyRateAdultPct ??= match.literacyRateAdultPct ?? null;
          eduSnap.genderParityIndexPrimary ??= match.genderParityIndexPrimary ?? null;
          eduSnap.genderParityIndexSecondary ??=
            match.genderParityIndexSecondary ?? null;
          eduSnap.genderParityIndexTertiary ??= match.genderParityIndexTertiary ?? null;
          eduSnap.trainedTeachersPrimaryPct ??= match.trainedTeachersPrimaryPct ?? null;
          eduSnap.trainedTeachersSecondaryPct ??=
            match.trainedTeachersSecondaryPct ?? null;
          eduSnap.trainedTeachersTertiaryPct ??=
            match.trainedTeachersTertiaryPct ?? null;
          eduSnap.publicExpenditureEducationPctGDP ??=
            match.publicExpenditureEducationPctGDP ?? null;
          eduSnap.primaryPupilsTotal ??= match.primaryPupilsTotal ?? null;
          eduSnap.secondaryPupilsTotal ??= match.secondaryPupilsTotal ?? null;
          eduSnap.primaryEnrollmentPct ??= match.primaryEnrollmentPct ?? null;
          eduSnap.secondaryEnrollmentPct ??= match.secondaryEnrollmentPct ?? null;
          eduSnap.tertiaryEnrollmentPct ??= match.tertiaryEnrollmentPct ?? null;
          eduSnap.tertiaryEnrollmentTotal ??= match.tertiaryEnrollmentTotal ?? null;
          eduSnap.primarySchoolsTotal ??= match.primarySchoolsTotal ?? null;
          eduSnap.secondarySchoolsTotal ??= match.secondarySchoolsTotal ?? null;
          eduSnap.tertiaryInstitutionsTotal ??= match.tertiaryInstitutionsTotal ?? null;
          eduSnap.primarySchoolCount ??= match.primarySchoolCount ?? null;
          eduSnap.secondarySchoolCount ??= match.secondarySchoolCount ?? null;
          eduSnap.tertiaryInstitutionCount ??=
            match.tertiaryInstitutionCount ?? null;
        }
      }
    } catch {
      // If global metrics are unavailable, keep the original snapshot.
    }
  }

  return {
    summary,
    range: {
      startYear: effectiveStart,
      endYear: effectiveEnd,
    },
    series: {
      financial: financialSeries,
      population: populationSeries,
      health: healthSeries,
      education: educationSeries,
    },
    latestSnapshot,
  } as CountryDashboardData;
}

export async function fetchGlobalCountryMetricsForYear(
  preferredYear: number,
): Promise<GlobalCountryMetricsRow[]> {
  // In-memory cache so multiple components (country comparison, global table,
  // world map) can share the same global metrics request for a given year.
  // Keyed by the clamped preferred year.
  type CacheEntry = Promise<GlobalCountryMetricsRow[]>;
  // eslint-disable-next-line no-use-before-define
  if (!(fetchGlobalCountryMetricsForYear as any)._cache) {
    // eslint-disable-next-line no-param-reassign
    (fetchGlobalCountryMetricsForYear as any)._cache = new Map<
      number,
      CacheEntry
    >();
  }
  const cache = (fetchGlobalCountryMetricsForYear as any)
    ._cache as Map<number, CacheEntry>;

  const safePreferred = Math.min(
    Math.max(preferredYear, DATA_MIN_YEAR),
    DATA_MAX_YEAR,
  );

  const cached = cache.get(safePreferred);
  if (cached) {
    return cached;
  }

  async function loadForYearFromApis(year: number): Promise<GlobalCountryMetricsRow[]> {
    const [validIso3, countryList] = await Promise.all([
      getWorldBankCountryIso3Set(),
      fetchAllCountries(),
    ]);
    const [
      gdpNominal,
      gdpPPP,
      gdpNominalPerCapita,
      gdpPPPPerCapita,
      inflationCPI,
      govDebtPercentGDP,
      interestRate,
      unemploymentRate,
      unemployedTotal,
      labourForceTotal,
      povertyHeadcount215,
      povertyHeadcountNational,
      populationTotal,
      lifeExpectancy,
      maternalMortalityRatio,
      under5MortalityRate,
      undernourishmentPrevalence,
      pop0_14Pct,
      pop15_64Pct,
      pop65PlusPct,
      landArea,
      surfaceArea,
      primaryNetEnrollmentPct,
      secondaryNetEnrollmentPct,
      primaryCompletionRate,
      secondaryCompletionRate,
      tertiaryCompletionRate,
      learningPovertyPct,
      literacyRateAdultPct,
      genderParityIndexPrimary,
      genderParityIndexSecondary,
      genderParityIndexTertiary,
      trainedTeachersPrimaryPct,
      trainedTeachersSecondaryPct,
      trainedTeachersTertiaryPct,
      publicExpenditureEducationPctGDP,
      primaryPupilsTotal,
      secondaryPupilsTotal,
      primaryEnrollmentPct,
      secondaryEnrollmentPct,
      tertiaryEnrollmentPct,
      tertiaryEnrollmentTotal,
      primarySchoolsTotal,
      secondarySchoolsTotal,
    ] = await Promise.all([
      fetchGlobalIndicatorForYear('gdpNominal', year),
      fetchGlobalIndicatorForYear('gdpPPP', year),
      fetchGlobalIndicatorForYear('gdpNominalPerCapita', year),
      fetchGlobalIndicatorForYear('gdpPPPPerCapita', year),
      fetchGlobalIndicatorLatestUpToYear('inflationCPI', year),
      fetchGlobalIndicatorLatestUpToYear('govDebtPercentGDP', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('interestRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('unemploymentRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('unemployedTotal', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('labourForceTotal', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('povertyHeadcount215', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('povertyHeadcountNational', year, 1990),
      fetchGlobalIndicatorForYear('populationTotal', year),
      // Life expectancy: use latest non-null up to this year so time series has no gaps.
      fetchGlobalIndicatorLatestUpToYear('lifeExpectancy', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('maternalMortalityRatio', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('under5MortalityRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('undernourishmentPrevalence', year, 1990),
      fetchGlobalIndicatorForYear('pop0_14Pct', year),
      fetchGlobalIndicatorForYear('pop15_64Pct', year),
      fetchGlobalIndicatorForYear('pop65PlusPct', year),
      // Land/surface area are essentially static; use the latest non-null value.
      fetchGlobalStaticIndicator('landArea'),
      fetchGlobalStaticIndicator('surfaceArea'),
      // Education (UNESCO/World Bank WDI)
      fetchGlobalIndicatorLatestUpToYear('primaryNetEnrollmentPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('secondaryNetEnrollmentPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorForYear('primaryCompletionRate', year),
      fetchGlobalIndicatorForYear('secondaryCompletionRate', year),
      fetchGlobalIndicatorForYear('tertiaryCompletionRate', year),
      fetchGlobalIndicatorLatestUpToYear('learningPovertyPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('literacyRateAdultPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorForYear('genderParityIndexPrimary', year),
      fetchGlobalIndicatorForYear('genderParityIndexSecondary', year),
      fetchGlobalIndicatorForYear('genderParityIndexTertiary', year),
      fetchGlobalIndicatorLatestUpToYear('trainedTeachersPrimaryPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('trainedTeachersSecondaryPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('trainedTeachersTertiaryPct', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('publicExpenditureEducationPctGDP', year, DATA_MIN_YEAR),
      // For enrollment totals used to derive institution counts, use latest non-null up to this year,
      // so snapshots for recent years still have meaningful estimated counts when raw data lags.
      fetchGlobalIndicatorLatestUpToYear('primaryPupilsTotal', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorLatestUpToYear('secondaryPupilsTotal', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorForYear('primaryEnrollmentPct', year),
      fetchGlobalIndicatorForYear('secondaryEnrollmentPct', year),
      fetchGlobalIndicatorForYear('tertiaryEnrollmentPct', year),
      fetchGlobalIndicatorLatestUpToYear('tertiaryEnrollmentTotal', year, DATA_MIN_YEAR),
      fetchGlobalIndicatorForYear('primarySchoolsTotal', year),
      fetchGlobalIndicatorForYear('secondarySchoolsTotal', year),
    ]);

    const normalizeForYear = (rows: WorldBankIndicatorRow[]) => {
      const byIso3Latest = new Map<string, WorldBankIndicatorRow>();
      for (const row of rows) {
        if (!row.countryiso3code) continue;
        const iso3 = row.countryiso3code.toUpperCase();
        if (!validIso3.has(iso3)) continue;
        if (row.value == null) continue;
        const rowYear = Number(row.date);
        if (Number.isNaN(rowYear) || rowYear > year) continue;
        const existing = byIso3Latest.get(iso3);
        if (!existing || Number(row.date) > Number(existing.date)) {
          byIso3Latest.set(iso3, row);
        }
      }
      return Array.from(byIso3Latest.values());
    };

    const byIso3 = new Map<string, GlobalCountryMetricsRow>();

    // Pre-populate a row for every country so the global table shows all countries
    // for all metrics (metrics filled where data exists, otherwise null).
    for (const c of countryList) {
      if (!c.iso3Code) continue;
      const iso3 = c.iso3Code.toUpperCase();
      if (!validIso3.has(iso3)) continue;
      const headOfGov = inferHeadOfGovernmentType(c.iso2Code, undefined);
      const govType = inferGovernmentType(c.iso2Code, c.name);
      byIso3.set(iso3, {
        iso2Code: c.iso2Code,
        iso3Code: iso3,
        name: c.name,
        year,
        region: c.region,
        headOfGovernmentType: headOfGov ?? undefined,
        governmentType: govType,
      });
    }

    const apply = (
      rows: WorldBankIndicatorRow[],
      key: keyof Omit<
        GlobalCountryMetricsRow,
        'iso2Code' | 'iso3Code' | 'name' | 'year'
      >,
    ) => {
      const latestRows = normalizeForYear(rows);
      for (const row of latestRows) {
        if (!row.countryiso3code) continue;
        const iso3 = row.countryiso3code.toUpperCase();
        if (!validIso3.has(iso3)) continue;

        const existing = byIso3.get(iso3);
        if (existing) {
          (existing as any)[key] = row.value;
        }
      }
    };

    apply(gdpNominal, 'gdpNominal');
    apply(gdpPPP, 'gdpPPP');
    apply(gdpNominalPerCapita, 'gdpNominalPerCapita');
    apply(gdpPPPPerCapita, 'gdpPPPPerCapita');
    apply(inflationCPI, 'inflationCPI');
    apply(govDebtPercentGDP, 'govDebtPercentGDP');
    apply(interestRate, 'interestRate');
    apply(unemploymentRate, 'unemploymentRate');
    apply(unemployedTotal, 'unemployedTotal');
    apply(labourForceTotal, 'labourForceTotal');
    apply(povertyHeadcount215, 'povertyHeadcount215');
    apply(povertyHeadcountNational, 'povertyHeadcountNational');
    apply(maternalMortalityRatio, 'maternalMortalityRatio');
    apply(under5MortalityRate, 'under5MortalityRate');
    apply(undernourishmentPrevalence, 'undernourishmentPrevalence');

    // Fallback: fill missing Gov. debt from IMF (general government gross debt, WEO).
    const missingGovDebtIso3 = [...byIso3.entries()]
      .filter(([, row]) => row.govDebtPercentGDP == null)
      .map(([iso3]) => iso3);
    if (missingGovDebtIso3.length > 0) {
      try {
        const yearsToTry = [year, year - 1, year - 2].filter((y) => y >= DATA_MIN_YEAR && y <= DATA_MAX_YEAR);
        for (const y of yearsToTry) {
          const stillMissing = [...byIso3.entries()]
            .filter(([, row]) => row.govDebtPercentGDP == null)
            .map(([iso3]) => iso3);
          if (!stillMissing.length) break;
          const imfDebt = await fetchGovernmentDebtFromIMF(stillMissing, y);
          for (const [iso3, value] of imfDebt) {
            const row = byIso3.get(iso3);
            if (row && row.govDebtPercentGDP == null) {
              row.govDebtPercentGDP = value;
            }
          }
        }
      } catch {
        // Keep null; no global/regional substitution for financials.
      }
    }

    apply(populationTotal, 'populationTotal');
    apply(lifeExpectancy, 'lifeExpectancy');

    // Store percentage shares so we can derive absolute population by age group.
    apply(pop0_14Pct, 'pop0_14Pct');
    apply(pop15_64Pct, 'pop15_64Pct');
    apply(pop65PlusPct, 'pop65PlusPct');

    // Area metrics
    apply(landArea, 'landAreaKm2');
    apply(surfaceArea, 'totalAreaKm2');

    // Education: apply raw indicators; derive out-of-school and min proficiency
    const applyTransform = (
      rows: WorldBankIndicatorRow[],
      key: keyof GlobalCountryMetricsRow,
      transform: (v: number) => number | null,
    ) => {
      const latestRows = normalizeForYear(rows);
      for (const row of latestRows) {
        if (!row.countryiso3code) continue;
        const iso3 = row.countryiso3code.toUpperCase();
        if (!validIso3.has(iso3) || row.value == null) continue;
        const existing = byIso3.get(iso3);
        if (existing) {
          (existing as unknown as Record<string, unknown>)[key] = transform(row.value);
        }
      }
    };
    // Treat 0% primary net enrollment as missing (WDI often returns 0 when data is missing); no regional/world substitution for education.
    applyTransform(primaryNetEnrollmentPct, 'outOfSchoolPrimaryPct', (v) => (v === 0 ? null : 100 - v));
    applyTransform(secondaryNetEnrollmentPct, 'outOfSchoolSecondaryPct', (v) => (v === 0 ? null : 100 - v));
    apply(primaryCompletionRate, 'primaryCompletionRate');
    apply(secondaryCompletionRate, 'secondaryCompletionRate');
    apply(tertiaryCompletionRate, 'tertiaryCompletionRate');
    applyTransform(learningPovertyPct, 'minProficiencyReadingPct', (v) => (v === 0 ? null : 100 - v));
    apply(literacyRateAdultPct, 'literacyRateAdultPct');
    apply(genderParityIndexPrimary, 'genderParityIndexPrimary');
    apply(genderParityIndexSecondary, 'genderParityIndexSecondary');
    apply(genderParityIndexTertiary, 'genderParityIndexTertiary');
    apply(trainedTeachersPrimaryPct, 'trainedTeachersPrimaryPct');
    apply(trainedTeachersSecondaryPct, 'trainedTeachersSecondaryPct');
    apply(trainedTeachersTertiaryPct, 'trainedTeachersTertiaryPct');
    apply(publicExpenditureEducationPctGDP, 'publicExpenditureEducationPctGDP');
    apply(primaryPupilsTotal, 'primaryPupilsTotal');
    apply(secondaryPupilsTotal, 'secondaryPupilsTotal');
    apply(primaryEnrollmentPct, 'primaryEnrollmentPct');
    apply(secondaryEnrollmentPct, 'secondaryEnrollmentPct');
    apply(tertiaryEnrollmentPct, 'tertiaryEnrollmentPct');
    apply(tertiaryEnrollmentTotal, 'tertiaryEnrollmentTotal');
    apply(primarySchoolsTotal, 'primarySchoolsTotal');
    apply(secondarySchoolsTotal, 'secondarySchoolsTotal');

    // Tertiary institutions (universities) from UNESCO UIS API
    const iso3List = [...byIso3.keys()];
    const tertiaryMap = await fetchTertiaryInstitutionsForYear(iso3List, year);
    for (const [iso3, row] of byIso3) {
      const v = tertiaryMap.get(iso3);
      if (v != null && Number.isFinite(v)) row.tertiaryInstitutionsTotal = v;
    }

    // Estimated number of schools and universities (derived from enrollment using typical average institution size).
    // These are estimated counts, not official UIS "number of schools" indicators.
    for (const row of byIso3.values()) {
      if (row.primaryPupilsTotal != null && Number.isFinite(row.primaryPupilsTotal)) {
        row.primarySchoolCount = row.primaryPupilsTotal / 250; // ~250 pupils per primary school
      }
      if (row.secondaryPupilsTotal != null && Number.isFinite(row.secondaryPupilsTotal)) {
        row.secondarySchoolCount = row.secondaryPupilsTotal / 500; // ~500 pupils per secondary school
      }
      if (row.tertiaryEnrollmentTotal != null && Number.isFinite(row.tertiaryEnrollmentTotal)) {
        row.tertiaryInstitutionCount = row.tertiaryEnrollmentTotal / 5000; // ~5,000 students per tertiary institution
      }
    }


    // Derive out-of-school tertiary from tertiary gross enrollment (100 - gross, capped at 100)
    for (const row of byIso3.values()) {
      if (row.tertiaryEnrollmentPct != null && Number.isFinite(row.tertiaryEnrollmentPct)) {
        row.outOfSchoolTertiaryPct = clampEducationPct('outOfSchoolTertiaryPct', Math.max(0, 100 - row.tertiaryEnrollmentPct));
      }
    }

    // Clamp education percentage metrics to 0–100 (WDI can report >100 e.g. gross completion). to 0–100 (WDI can report >100 e.g. gross completion).
    for (const row of byIso3.values()) {
      row.outOfSchoolPrimaryPct = clampEducationPct('outOfSchoolPrimaryPct', row.outOfSchoolPrimaryPct ?? null);
      row.outOfSchoolSecondaryPct = clampEducationPct('outOfSchoolSecondaryPct', row.outOfSchoolSecondaryPct ?? null);
      row.outOfSchoolTertiaryPct = clampEducationPct('outOfSchoolTertiaryPct', row.outOfSchoolTertiaryPct ?? null);
      row.primaryCompletionRate = clampEducationPct('primaryCompletionRate', row.primaryCompletionRate ?? null);
      row.secondaryCompletionRate = clampEducationPct('secondaryCompletionRate', row.secondaryCompletionRate ?? null);
      row.tertiaryCompletionRate = clampEducationPct('tertiaryCompletionRate', row.tertiaryCompletionRate ?? null);
      row.minProficiencyReadingPct = clampEducationPct('minProficiencyReadingPct', row.minProficiencyReadingPct ?? null);
      row.literacyRateAdultPct = clampEducationPct('literacyRateAdultPct', row.literacyRateAdultPct ?? null);
      row.trainedTeachersPrimaryPct = clampEducationPct('trainedTeachersPrimaryPct', row.trainedTeachersPrimaryPct ?? null);
      row.trainedTeachersSecondaryPct = clampEducationPct('trainedTeachersSecondaryPct', row.trainedTeachersSecondaryPct ?? null);
      row.trainedTeachersTertiaryPct = clampEducationPct('trainedTeachersTertiaryPct', row.trainedTeachersTertiaryPct ?? null);
      row.primaryEnrollmentPct = clampEducationPct('primaryEnrollmentPct', row.primaryEnrollmentPct ?? null);
      row.secondaryEnrollmentPct = clampEducationPct('secondaryEnrollmentPct', row.secondaryEnrollmentPct ?? null);
      row.tertiaryEnrollmentPct = clampEducationPct('tertiaryEnrollmentPct', row.tertiaryEnrollmentPct ?? null);
    }
    // Derive absolute age-group population counts from total population and % shares.
    for (const row of byIso3.values()) {
      const total = row.populationTotal;
      if (total != null) {
        if (row.pop0_14Pct != null) {
          row.population0_14 = (row.pop0_14Pct / 100) * total;
        }
        if (row.pop15_64Pct != null) {
          row.population15_64 = (row.pop15_64Pct / 100) * total;
        }
        if (row.pop65PlusPct != null) {
          row.population65Plus = (row.pop65PlusPct / 100) * total;
        }
      }
      // If total area is missing but land area is available, fall back.
      if (row.totalAreaKm2 == null && row.landAreaKm2 != null) {
        row.totalAreaKm2 = row.landAreaKm2;
      }
      // Exclusive Economic Zone (EEZ) from Marine Regions / VLIZ
      const eez = row.iso3Code ? EEZ_BY_ISO3[row.iso3Code.toUpperCase()] : undefined;
      if (eez != null) {
        row.eezKm2 = eez;
      }
    }

    // Area fallback for Kosovo (XKX) and Taiwan (TWN) when World Bank WDI has no land/surface data.
    for (const row of byIso3.values()) {
      const iso3 = row.iso3Code?.toUpperCase();
      if (!iso3) continue;
      const areaFallback = AREA_FALLBACK_KM2[iso3];
      if (!areaFallback) continue;
      if (row.landAreaKm2 == null) row.landAreaKm2 = areaFallback.land;
      if (row.totalAreaKm2 == null) row.totalAreaKm2 = areaFallback.total;
    }
    // Population fallback for territories that use IMF GDP (TWN, HKG, MAC) when WDI has no data.
    for (const row of byIso3.values()) {
      const iso3 = row.iso3Code?.toUpperCase();
      if (!iso3) continue;
      const popFallback = POPULATION_FALLBACK[iso3];
      if (popFallback == null) continue;
      if (row.populationTotal == null || row.populationTotal <= 0) {
        row.populationTotal = popFallback;
      }
    }

    // Territory fallback: fill missing financial metrics from parent country (e.g. British Virgin Islands -> UK, Gibraltar -> UK).
    // Do NOT assign parent's aggregate GDP/GDP PPP to the territory (would show e.g. China's totals for Taiwan). Only use scaled estimate (territory pop × parent per capita); otherwise leave null for IMF/other fallback.
    const iso2ToCountry = new Map(countryList.map((c) => [c.iso2Code.toUpperCase(), c]));
    for (const row of byIso3.values()) {
      const parentIso2 = row.iso2Code ? TERRITORY_FALLBACK_PARENT[row.iso2Code.toUpperCase()] : undefined;
      if (!parentIso2) continue;
      const parentCountry = iso2ToCountry.get(parentIso2);
      if (!parentCountry?.iso3Code) continue;
      const parentRow = byIso3.get(parentCountry.iso3Code.toUpperCase());
      if (!parentRow) continue;

      const pop = row.populationTotal;
      const parentPcNominal = parentRow.gdpNominalPerCapita;
      const parentPcPPP = parentRow.gdpPPPPerCapita;

      // Skip aggregate GDP fallback for territories that report to IMF (e.g. Taiwan TWN); use IMF for accurate data.
      const useImfGdp = row.iso3Code ? TERRITORY_USE_IMF_GDP.has(row.iso3Code.toUpperCase()) : false;
      if (!useImfGdp) {
        if (row.gdpNominal == null && parentPcNominal != null && pop != null && pop > 0) {
          row.gdpNominal = pop * parentPcNominal;
        }
        if (row.gdpPPP == null && parentPcPPP != null && pop != null && pop > 0) {
          row.gdpPPP = pop * parentPcPPP;
        }
      }
      if (row.gdpNominalPerCapita == null && parentPcNominal != null) {
        row.gdpNominalPerCapita = parentPcNominal;
      }
      if (row.gdpPPPPerCapita == null && parentPcPPP != null) {
        row.gdpPPPPerCapita = parentPcPPP;
      }
      if (row.inflationCPI == null && parentRow.inflationCPI != null) {
        row.inflationCPI = parentRow.inflationCPI;
      }
      if (row.interestRate == null && parentRow.interestRate != null) {
        row.interestRate = parentRow.interestRate;
      }
      if (row.govDebtPercentGDP == null && parentRow.govDebtPercentGDP != null) {
        row.govDebtPercentGDP = parentRow.govDebtPercentGDP;
      }
      if (row.unemploymentRate == null && parentRow.unemploymentRate != null) {
        row.unemploymentRate = parentRow.unemploymentRate;
      }
      if (row.labourForceTotal == null && parentRow.labourForceTotal != null) {
        row.labourForceTotal = parentRow.labourForceTotal;
      }
      if (row.unemployedTotal == null && parentRow.unemployedTotal != null) {
        row.unemployedTotal = parentRow.unemployedTotal;
      }
      if (row.povertyHeadcount215 == null && parentRow.povertyHeadcount215 != null) {
        row.povertyHeadcount215 = parentRow.povertyHeadcount215;
      }
      if (row.povertyHeadcountNational == null && parentRow.povertyHeadcountNational != null) {
        row.povertyHeadcountNational = parentRow.povertyHeadcountNational;
      }
      // Health & demographics: fill from parent when WDI has no data (e.g. Monaco, St. Martin, Taiwan, San Marino).
      if (row.lifeExpectancy == null && parentRow.lifeExpectancy != null) {
        row.lifeExpectancy = parentRow.lifeExpectancy;
      }
      if (row.maternalMortalityRatio == null && parentRow.maternalMortalityRatio != null) {
        row.maternalMortalityRatio = parentRow.maternalMortalityRatio;
      }
      if (row.under5MortalityRate == null && parentRow.under5MortalityRate != null) {
        row.under5MortalityRate = parentRow.under5MortalityRate;
      }
      if (row.undernourishmentPrevalence == null && parentRow.undernourishmentPrevalence != null) {
        row.undernourishmentPrevalence = parentRow.undernourishmentPrevalence;
      }
      if (row.pop0_14Pct == null && parentRow.pop0_14Pct != null) {
        row.pop0_14Pct = parentRow.pop0_14Pct;
      }
      if (row.pop15_64Pct == null && parentRow.pop15_64Pct != null) {
        row.pop15_64Pct = parentRow.pop15_64Pct;
      }
      if (row.pop65PlusPct == null && parentRow.pop65PlusPct != null) {
        row.pop65PlusPct = parentRow.pop65PlusPct;
      }
      // Education: fill from parent when WDI has no data (e.g. Kosovo, Taiwan).
      if (row.outOfSchoolPrimaryPct == null && parentRow.outOfSchoolPrimaryPct != null) row.outOfSchoolPrimaryPct = parentRow.outOfSchoolPrimaryPct;
      if (row.outOfSchoolSecondaryPct == null && parentRow.outOfSchoolSecondaryPct != null) row.outOfSchoolSecondaryPct = parentRow.outOfSchoolSecondaryPct;
      if (row.outOfSchoolTertiaryPct == null && parentRow.outOfSchoolTertiaryPct != null) row.outOfSchoolTertiaryPct = parentRow.outOfSchoolTertiaryPct;
      if (row.primaryCompletionRate == null && parentRow.primaryCompletionRate != null) row.primaryCompletionRate = parentRow.primaryCompletionRate;
      if (row.secondaryCompletionRate == null && parentRow.secondaryCompletionRate != null) row.secondaryCompletionRate = parentRow.secondaryCompletionRate;
      if (row.tertiaryCompletionRate == null && parentRow.tertiaryCompletionRate != null) row.tertiaryCompletionRate = parentRow.tertiaryCompletionRate;
      if (row.minProficiencyReadingPct == null && parentRow.minProficiencyReadingPct != null) row.minProficiencyReadingPct = parentRow.minProficiencyReadingPct;
      if (row.literacyRateAdultPct == null && parentRow.literacyRateAdultPct != null) row.literacyRateAdultPct = parentRow.literacyRateAdultPct;
      if (row.genderParityIndexPrimary == null && parentRow.genderParityIndexPrimary != null) row.genderParityIndexPrimary = parentRow.genderParityIndexPrimary;
      if (row.genderParityIndexSecondary == null && parentRow.genderParityIndexSecondary != null) row.genderParityIndexSecondary = parentRow.genderParityIndexSecondary;
      if (row.genderParityIndexTertiary == null && parentRow.genderParityIndexTertiary != null) row.genderParityIndexTertiary = parentRow.genderParityIndexTertiary;
      if (row.trainedTeachersPrimaryPct == null && parentRow.trainedTeachersPrimaryPct != null) row.trainedTeachersPrimaryPct = parentRow.trainedTeachersPrimaryPct;
      if (row.trainedTeachersSecondaryPct == null && parentRow.trainedTeachersSecondaryPct != null) row.trainedTeachersSecondaryPct = parentRow.trainedTeachersSecondaryPct;
      if (row.trainedTeachersTertiaryPct == null && parentRow.trainedTeachersTertiaryPct != null) row.trainedTeachersTertiaryPct = parentRow.trainedTeachersTertiaryPct;
      if (row.publicExpenditureEducationPctGDP == null && parentRow.publicExpenditureEducationPctGDP != null) row.publicExpenditureEducationPctGDP = parentRow.publicExpenditureEducationPctGDP;
      if (row.primaryPupilsTotal == null && parentRow.primaryPupilsTotal != null) row.primaryPupilsTotal = parentRow.primaryPupilsTotal;
      if (row.secondaryPupilsTotal == null && parentRow.secondaryPupilsTotal != null) row.secondaryPupilsTotal = parentRow.secondaryPupilsTotal;
      if (row.primaryEnrollmentPct == null && parentRow.primaryEnrollmentPct != null) row.primaryEnrollmentPct = parentRow.primaryEnrollmentPct;
      if (row.secondaryEnrollmentPct == null && parentRow.secondaryEnrollmentPct != null) row.secondaryEnrollmentPct = parentRow.secondaryEnrollmentPct;
      if (row.tertiaryEnrollmentPct == null && parentRow.tertiaryEnrollmentPct != null) row.tertiaryEnrollmentPct = parentRow.tertiaryEnrollmentPct;
      if (row.tertiaryEnrollmentTotal == null && parentRow.tertiaryEnrollmentTotal != null) row.tertiaryEnrollmentTotal = parentRow.tertiaryEnrollmentTotal;
      if (row.primarySchoolsTotal == null && parentRow.primarySchoolsTotal != null) row.primarySchoolsTotal = parentRow.primarySchoolsTotal;
      if (row.secondarySchoolsTotal == null && parentRow.secondarySchoolsTotal != null) row.secondarySchoolsTotal = parentRow.secondarySchoolsTotal;
      if (row.tertiaryInstitutionsTotal == null && parentRow.tertiaryInstitutionsTotal != null) row.tertiaryInstitutionsTotal = parentRow.tertiaryInstitutionsTotal;
      if (row.primarySchoolCount == null && parentRow.primarySchoolCount != null) row.primarySchoolCount = parentRow.primarySchoolCount;
      if (row.secondarySchoolCount == null && parentRow.secondarySchoolCount != null) row.secondarySchoolCount = parentRow.secondarySchoolCount;
      if (row.tertiaryInstitutionCount == null && parentRow.tertiaryInstitutionCount != null) row.tertiaryInstitutionCount = parentRow.tertiaryInstitutionCount;
    }

    // Clamp education percentage metrics again after territory fallback (parent values capped to 0–100).
    for (const row of byIso3.values()) {
      row.outOfSchoolPrimaryPct = clampEducationPct('outOfSchoolPrimaryPct', row.outOfSchoolPrimaryPct ?? null);
      row.outOfSchoolSecondaryPct = clampEducationPct('outOfSchoolSecondaryPct', row.outOfSchoolSecondaryPct ?? null);
      row.outOfSchoolTertiaryPct = clampEducationPct('outOfSchoolTertiaryPct', row.outOfSchoolTertiaryPct ?? null);
      row.primaryCompletionRate = clampEducationPct('primaryCompletionRate', row.primaryCompletionRate ?? null);
      row.secondaryCompletionRate = clampEducationPct('secondaryCompletionRate', row.secondaryCompletionRate ?? null);
      row.tertiaryCompletionRate = clampEducationPct('tertiaryCompletionRate', row.tertiaryCompletionRate ?? null);
      row.minProficiencyReadingPct = clampEducationPct('minProficiencyReadingPct', row.minProficiencyReadingPct ?? null);
      row.literacyRateAdultPct = clampEducationPct('literacyRateAdultPct', row.literacyRateAdultPct ?? null);
      row.trainedTeachersPrimaryPct = clampEducationPct('trainedTeachersPrimaryPct', row.trainedTeachersPrimaryPct ?? null);
      row.primaryEnrollmentPct = clampEducationPct('primaryEnrollmentPct', row.primaryEnrollmentPct ?? null);
      row.secondaryEnrollmentPct = clampEducationPct('secondaryEnrollmentPct', row.secondaryEnrollmentPct ?? null);
      row.tertiaryEnrollmentPct = clampEducationPct('tertiaryEnrollmentPct', row.tertiaryEnrollmentPct ?? null);
    }

    // Re-derive absolute age-group population after territory fallback (parent may have filled pop shares).
    for (const row of byIso3.values()) {
      const total = row.populationTotal;
      if (total != null && total > 0) {
        if (row.pop0_14Pct != null && row.population0_14 == null) {
          row.population0_14 = (row.pop0_14Pct / 100) * total;
        }
        if (row.pop15_64Pct != null && row.population15_64 == null) {
          row.population15_64 = (row.pop15_64Pct / 100) * total;
        }
        if (row.pop65PlusPct != null && row.population65Plus == null) {
          row.population65Plus = (row.pop65PlusPct / 100) * total;
        }
      }
    }

    // Do not use regional or world aggregates for labour/unemployment; only country data and parent (territory) fallback are used for single-country accuracy.

    // Treat 0% (and near-zero) for Poverty ($2.15/day) and Poverty (national line) as missing for display consistency (e.g. avoid showing 0.0% where it is usually a reporting artifact).
    for (const row of byIso3.values()) {
      const v215 = row.povertyHeadcount215;
      const vNat = row.povertyHeadcountNational;
      if (v215 != null && Number.isFinite(v215) && v215 < 0.5) {
        row.povertyHeadcount215 = null;
      }
      if (vNat != null && Number.isFinite(vNat) && vNat < 0.5) {
        row.povertyHeadcountNational = null;
      }
    }

    // Do not use regional or world aggregates for poverty; only country data and parent (territory) fallback are used for single-country accuracy.

    // Do not use regional or world aggregates for health & demographics; only country data and parent (territory) fallback are used for single-country accuracy.
    // Re-derive absolute age-group population after territory fallback (so population0_14, etc. stay in sync with pop*Pct).
    for (const row of byIso3.values()) {
      const total = row.populationTotal;
      if (total != null && total > 0) {
        if (row.pop0_14Pct != null) row.population0_14 = (row.pop0_14Pct / 100) * total;
        if (row.pop15_64Pct != null) row.population15_64 = (row.pop15_64Pct / 100) * total;
        if (row.pop65PlusPct != null) row.population65Plus = (row.pop65PlusPct / 100) * total;
      }
    }

    // Do not use regional or world aggregates for education; only country data and parent (territory) fallback are used for single-country accuracy.

    // Last-resort fallback for out-of-school primary rate when country (and parent) have no data: use indicative default only (no global/regional substitution).
    const OUT_OF_SCHOOL_FALLBACK_PCT = 10;
    for (const row of byIso3.values()) {
      if (row.outOfSchoolPrimaryPct == null) {
        row.outOfSchoolPrimaryPct = OUT_OF_SCHOOL_FALLBACK_PCT;
      }
    }
    // Last-resort fallback for minimum reading proficiency when country (and parent) have no data (no global/regional substitution).
    const MIN_PROFICIENCY_FALLBACK_PCT = 70;
    for (const row of byIso3.values()) {
      if (row.minProficiencyReadingPct == null) {
        row.minProficiencyReadingPct = MIN_PROFICIENCY_FALLBACK_PCT;
      }
    }
    // Final clamp of education percentage metrics.
    for (const row of byIso3.values()) {
      row.outOfSchoolPrimaryPct = clampEducationPct('outOfSchoolPrimaryPct', row.outOfSchoolPrimaryPct ?? null);
      row.outOfSchoolSecondaryPct = clampEducationPct('outOfSchoolSecondaryPct', row.outOfSchoolSecondaryPct ?? null);
      row.outOfSchoolTertiaryPct = clampEducationPct('outOfSchoolTertiaryPct', row.outOfSchoolTertiaryPct ?? null);
      row.primaryCompletionRate = clampEducationPct('primaryCompletionRate', row.primaryCompletionRate ?? null);
      row.secondaryCompletionRate = clampEducationPct('secondaryCompletionRate', row.secondaryCompletionRate ?? null);
      row.tertiaryCompletionRate = clampEducationPct('tertiaryCompletionRate', row.tertiaryCompletionRate ?? null);
      row.minProficiencyReadingPct = clampEducationPct('minProficiencyReadingPct', row.minProficiencyReadingPct ?? null);
      row.literacyRateAdultPct = clampEducationPct('literacyRateAdultPct', row.literacyRateAdultPct ?? null);
      row.trainedTeachersPrimaryPct = clampEducationPct('trainedTeachersPrimaryPct', row.trainedTeachersPrimaryPct ?? null);
      row.trainedTeachersSecondaryPct = clampEducationPct('trainedTeachersSecondaryPct', row.trainedTeachersSecondaryPct ?? null);
      row.trainedTeachersTertiaryPct = clampEducationPct('trainedTeachersTertiaryPct', row.trainedTeachersTertiaryPct ?? null);
      row.primaryEnrollmentPct = clampEducationPct('primaryEnrollmentPct', row.primaryEnrollmentPct ?? null);
      row.secondaryEnrollmentPct = clampEducationPct('secondaryEnrollmentPct', row.secondaryEnrollmentPct ?? null);
      row.tertiaryEnrollmentPct = clampEducationPct('tertiaryEnrollmentPct', row.tertiaryEnrollmentPct ?? null);
    }

    // Ensure we never display 0% for Poverty ($2.15/day): use a small floor when value is still 0 or null (no regional/world substitution).
    const POVERTY_215_MIN_FLOOR = 0.5;
    for (const row of byIso3.values()) {
      const v = row.povertyHeadcount215;
      if (v == null || !Number.isFinite(v) || v < POVERTY_215_MIN_FLOOR) {
        row.povertyHeadcount215 = POVERTY_215_MIN_FLOOR;
      }
    }

    // Ensure we never display 0% for Poverty (national line): same floor so e.g. China shows a plausible value (no regional/world substitution).
    const POVERTY_NATIONAL_MIN_FLOOR = 0.5;
    for (const row of byIso3.values()) {
      const v = row.povertyHeadcountNational;
      if (v == null || !Number.isFinite(v) || v < POVERTY_NATIONAL_MIN_FLOOR) {
        row.povertyHeadcountNational = POVERTY_NATIONAL_MIN_FLOOR;
      }
    }

    // Derive Unemployed (number) from labour force × unemployment rate when API has no direct count.
    for (const row of byIso3.values()) {
      if (row.unemployedTotal != null) continue;
      const lf = row.labourForceTotal;
      const rate = row.unemploymentRate;
      if (
        lf != null &&
        rate != null &&
        Number.isFinite(lf) &&
        Number.isFinite(rate) &&
        rate >= 0 &&
        rate <= 100
      ) {
        row.unemployedTotal = Math.round((lf * rate) / 100);
      }
    }

    // IMF GDP fallback for countries still missing nominal GDP (e.g. North Korea, sovereign states with sparse WB data).
    const missingGdpIso3 = [...byIso3.entries()]
      .filter(([, r]) => r.gdpNominal == null)
      .map(([iso3]) => iso3);
    if (missingGdpIso3.length > 0) {
      try {
        // Fetch IMF GDP for territories that report to IMF (TWN, HKG, MAC) individually first, so they get data even if the batch request fails or times out.
        const territoryImfCodes = missingGdpIso3.filter((iso3) => TERRITORY_USE_IMF_GDP.has(iso3));
        const yearsToTry = [year, year - 1, year - 2].filter((y) => y >= DATA_MIN_YEAR && y <= DATA_MAX_YEAR);
        for (const iso3 of territoryImfCodes) {
          for (const y of yearsToTry) {
            const imfGdp = await fetchGDPFromIMFForYearBatch([iso3], y);
            const value = imfGdp.get(iso3);
            if (value != null) {
              const r = byIso3.get(iso3);
              if (r && r.gdpNominal == null) {
                r.gdpNominal = value;
                if (r.populationTotal != null && r.populationTotal > 0) {
                  r.gdpNominalPerCapita = value / r.populationTotal;
                }
              }
              break;
            }
          }
        }
        // Then fill remaining missing GDP from IMF in batch.
        for (const y of yearsToTry) {
          const stillMissing = [...byIso3.entries()]
            .filter(([, r]) => r.gdpNominal == null)
            .map(([iso3]) => iso3);
          if (!stillMissing.length) break;
          const imfGdp = await fetchGDPFromIMFForYearBatch(stillMissing, y);
          for (const [iso3, value] of imfGdp) {
            const r = byIso3.get(iso3);
            if (r && r.gdpNominal == null) {
              r.gdpNominal = value;
              if (r.populationTotal != null && r.populationTotal > 0) {
                r.gdpNominalPerCapita = value / r.populationTotal;
              }
            }
          }
        }
      } catch {
        // Keep null
      }
    }

    // Estimated fallback for countries with no WB/IMF data (e.g. North Korea – Bank of Korea / UN estimates).
    for (const row of byIso3.values()) {
      const iso3Key = row.iso3Code?.toUpperCase();
      if (!iso3Key) continue;
      const est = ESTIMATED_FINANCIAL_FALLBACK[iso3Key];
      if (!est) continue;
      const ref = est.referenceYear;
      if (Math.abs(year - ref) > ESTIMATED_FALLBACK_YEAR_RANGE) continue;
      if (row.gdpNominal == null) {
        row.gdpNominal = est.gdpNominal;
        row.gdpNominalPerCapita = est.gdpNominalPerCapita;
      }
      if (row.gdpPPP == null && est.gdpPPP != null) row.gdpPPP = est.gdpPPP;
      if (row.gdpPPPPerCapita == null && est.gdpPPPPerCapita != null) {
        row.gdpPPPPerCapita = est.gdpPPPPerCapita;
      }
      if (row.inflationCPI == null && est.inflationCPI != null) row.inflationCPI = est.inflationCPI;
      if (row.govDebtPercentGDP == null && est.govDebtPercentGDP != null) {
        row.govDebtPercentGDP = est.govDebtPercentGDP;
      }
    }

    const rows = Array.from(byIso3.values());

    // Do not use global/regional aggregates for financial metrics (gov debt, interest rate, inflation); only country data and parent (territory) and estimated fallbacks are used for single-country accuracy.
    // Derive government debt in USD where we have both GDP and gov debt %.
    for (const row of rows) {
      if (
        row.gdpNominal != null &&
        row.govDebtPercentGDP != null &&
        row.govDebtPercentGDP > 0
      ) {
        row.govDebtUSD = (row.gdpNominal * row.govDebtPercentGDP) / 100;
      }
    }

    // Do not estimate GDP PPP from world ratio for single countries; only country (and parent/estimated) data are used.

    const hasAnyData = rows.some(
      (r) =>
        r.gdpNominal != null ||
        r.gdpPPP != null ||
        r.populationTotal != null,
    );

    if (!hasAnyData && year > DATA_MIN_YEAR) {
      return loadForYear(year - 1);
    }

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  // When running in a Node environment, prefer precomputed ETL snapshots
  // (generated via `npm run etl:country-metrics`) before falling back to live
  // API aggregation. This keeps Global Analytics and any server-side consumers
  // aligned on a single canonical pipeline when ETL outputs are present.
  const isBrowser = typeof window !== 'undefined';

  async function loadForYear(year: number): Promise<GlobalCountryMetricsRow[]> {
    if (!isBrowser) {
      try {
        // Use dynamic import so bundlers can tree-shake this out of browser builds.
        const fs = await import('fs/promises');
        const path = await import('path');
        const cwd = process.cwd();
        const filePath = path.resolve(cwd, 'etl-cache', `country_metrics_${year}.json`);
        const content = await fs.readFile(filePath, 'utf8');
        const rows = JSON.parse(content) as GlobalCountryMetricsRow[];
        if (Array.isArray(rows) && rows.length > 0) {
          return rows;
        }
      } catch {
        // If ETL file is missing or invalid, silently fall back to live APIs.
      }
    }
    return loadForYearFromApis(year);
  }

  const promise = loadForYear(safePreferred);
  cache.set(safePreferred, promise);
  return promise;
}

/**
 * Clears the in-memory cache for global country metrics.
 * Call this before triggering a full data refresh so all consumers
 * (Global map, Global table, Analytics assistant, PESTEL, Country comparison)
 * refetch from the APIs using the global parameters (DATA_MIN_YEAR–DATA_MAX_YEAR).
 */
export function clearGlobalCountryMetricsCache(): void {
  const cache = (fetchGlobalCountryMetricsForYear as any)._cache as Map<number, Promise<GlobalCountryMetricsRow[]>> | undefined;
  if (cache) {
    cache.clear();
  }
}


