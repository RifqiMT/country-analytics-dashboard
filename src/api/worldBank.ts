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
import { getNumericCountryCodeMap } from './countryCodes';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import {
  fetchGDPFromIMF,
  fetchGovernmentDebtFromIMF,
  fetchGovernmentDebtSeriesFromIMF,
} from './imf';

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
  AX: 'FI', // Åland Islands -> Finland
  FK: 'GB', // Falkland Islands -> UK
  TC: 'GB', // Turks and Caicos -> UK
  MS: 'GB', // Montserrat -> UK
  AI: 'GB', // Anguilla -> UK
  GG: 'GB', // Guernsey -> UK
  JE: 'GB', // Jersey -> UK
  IM: 'GB', // Isle of Man -> UK
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

  const res = await axios.get<WorldBankSeriesResponse>(url);
  const [, data] = res.data;

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
  const [, data] = res.data;
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
  const [, data] = res.data;

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
  const [, data] = res.data;

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
  const url = `${WORLD_BANK_BASE}/country/${countryCode}?format=json`;
  const res = await axios.get<[unknown, any[]]>(url);
  const [, data] = res.data;
  const info = data[0];

  const summary: CountrySummary = {
    iso2Code: info.iso2Code,
    iso3Code: info.id,
    name: info.name,
    region: info.region?.value,
    incomeLevel: info.incomeLevel?.value,
    capitalCity: info.capitalCity,
    latitude: info.latitude ? Number(info.latitude) : null,
    longitude: info.longitude ? Number(info.longitude) : null,
  };

  // Enrich with timezone, currency, area, and name from REST Countries.
  let officialName: string | undefined;
  try {
    const restUrl = `https://restcountries.com/v3.1/alpha/${summary.iso2Code}?fields=timezones,currencies,area,government,name`;
    const restRes = await axios.get<any>(restUrl);
    const restData = Array.isArray(restRes.data) ? restRes.data[0] : restRes.data;
    if (restData) {
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
    }
  } catch {
    // If REST Countries enrichment fails, fall back to World Bank-only metadata.
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
    const [, data] = res.data;

    // Only individual countries: exclude aggregates and region/income/lending groups.
    // Items with region.id === 'NA' are aggregates; also exclude by known aggregate codes.
    return data
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
      )
      .sort((a, b) => a.name.localeCompare(b.name));
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

  const macroStartYear = Math.min(startYear, 1990);
  const parentIso2 = TERRITORY_FALLBACK_PARENT[countryCode.toUpperCase()];

  // Fallback for territories with empty macro data: use parent country's series.
  let inflationCPIRawFinal = inflationCPIRaw;
  let interestRateRawFinal = interestRateRaw;
  if (parentIso2 && (!hasAnyData(inflationCPIRaw) || !hasAnyData(interestRateRaw))) {
    const [parentInflation, parentInterest] = await Promise.all([
      !hasAnyData(inflationCPIRaw)
        ? fetchIndicatorSeries(parentIso2, 'inflationCPI', macroStartYear, endYear)
        : Promise.resolve([]),
      !hasAnyData(interestRateRaw)
        ? fetchIndicatorSeries(parentIso2, 'interestRate', macroStartYear, endYear)
        : Promise.resolve([]),
    ]);
    if (parentInflation.length) inflationCPIRawFinal = parentInflation;
    if (parentInterest.length) interestRateRawFinal = parentInterest;
  }

  const inflationCPI = fillSeriesWithFallback(
    inflationCPIRawFinal,
    startYear,
    endYear,
  );
  let govDebtPercentGDP = fillSeriesWithFallback(
    govDebtPercentGDPRaw,
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
      const candidates = series.filter(
        (p) => p.year <= maxYear && p.value != null,
      );
      if (!candidates.length) return null;
      return candidates[candidates.length - 1].value ?? null;
    };

    const populationBreakdown = await buildPopulationBreakdown(year, countryCode);
    const landAreaValue = latestNonNullUpToYear(landAreaSeries, year);
    const surfaceAreaValue = latestNonNullUpToYear(surfaceAreaSeries, year);

    latestSnapshot = {
      country: summary,
      year,
      metrics: {
        financial: {
          gdpNominal: latestNonNullUpToYear(gdpNominal, year),
          gdpPPP: latestNonNullUpToYear(gdpPPP, year),
          gdpNominalPerCapita: latestNonNullUpToYear(
            gdpNominalPerCapita,
            year,
          ),
          gdpPPPPerCapita: latestNonNullUpToYear(gdpPPPPerCapita, year),
          inflationCPI: latestNonNullUpToYear(inflationCPI, year),
          govDebtPercentGDP: latestNonNullUpToYear(
            govDebtPercentGDP,
            year,
          ),
          govDebtUSD: (() => {
            const gdp = latestNonNullUpToYear(gdpNominal, year);
            const pct = latestNonNullUpToYear(govDebtPercentGDP, year);
            if (gdp != null && pct != null && pct > 0) return (gdp * pct) / 100;
            return null;
          })(),
          interestRate: latestNonNullUpToYear(interestRate, year),
          unemploymentRate: latestNonNullUpToYear(unemploymentRate, year),
          povertyHeadcount215: latestNonNullUpToYear(povertyHeadcount215, year),
          povertyHeadcountNational: latestNonNullUpToYear(povertyHeadcountNational, year),
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

  async function loadForYear(year: number): Promise<GlobalCountryMetricsRow[]> {
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
    ] = await Promise.all([
      fetchGlobalIndicatorForYear('gdpNominal', year),
      fetchGlobalIndicatorForYear('gdpPPP', year),
      fetchGlobalIndicatorForYear('gdpNominalPerCapita', year),
      fetchGlobalIndicatorForYear('gdpPPPPerCapita', year),
      fetchGlobalIndicatorLatestUpToYear('inflationCPI', year),
      fetchGlobalIndicatorLatestUpToYear('govDebtPercentGDP', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('interestRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('unemploymentRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('povertyHeadcount215', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('povertyHeadcountNational', year, 1990),
      fetchGlobalIndicatorForYear('populationTotal', year),
      // Life expectancy changes slowly; use latest non-null value.
      fetchGlobalStaticIndicator('lifeExpectancy'),
      fetchGlobalIndicatorLatestUpToYear('maternalMortalityRatio', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('under5MortalityRate', year, 1990),
      fetchGlobalIndicatorLatestUpToYear('undernourishmentPrevalence', year, 1990),
      fetchGlobalIndicatorForYear('pop0_14Pct', year),
      fetchGlobalIndicatorForYear('pop15_64Pct', year),
      fetchGlobalIndicatorForYear('pop65PlusPct', year),
      // Land/surface area are essentially static; use the latest non-null value.
      fetchGlobalStaticIndicator('landArea'),
      fetchGlobalStaticIndicator('surfaceArea'),
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
        // Keep null; world median fallback will apply below
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

    const rows = Array.from(byIso3.values());

    // Fallback: fill missing Gov. debt and Lending rate with world median so
    // countries like France still show an indicative value when source has no data.
    const govDebtValues = rows.map((r) => r.govDebtPercentGDP).filter((v): v is number => v != null && Number.isFinite(v));
    const interestRateValues = rows.map((r) => r.interestRate).filter((v): v is number => v != null && Number.isFinite(v));
    const median = (arr: number[]) => {
      if (!arr.length) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    };
    const worldMedianGovDebt = median(govDebtValues);
    const worldMedianInterestRate = median(interestRateValues);
    for (const row of rows) {
      if (row.govDebtPercentGDP == null && worldMedianGovDebt != null) {
        row.govDebtPercentGDP = worldMedianGovDebt;
      }
      if (row.interestRate == null && worldMedianInterestRate != null) {
        row.interestRate = worldMedianInterestRate;
      }
      // Government debt in USD = GDP × (gov debt % / 100)
      if (
        row.gdpNominal != null &&
        row.govDebtPercentGDP != null &&
        row.govDebtPercentGDP > 0
      ) {
        row.govDebtUSD = (row.gdpNominal * row.govDebtPercentGDP) / 100;
      }
    }

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

  const promise = loadForYear(safePreferred);
  cache.set(safePreferred, promise);
  return promise;
}


