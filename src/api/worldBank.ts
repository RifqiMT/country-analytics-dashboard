import axios from 'axios';
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

const WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

// Indicator codes from World Bank (WDI)
const INDICATORS = {
  gdpNominal: 'NY.GDP.MKTP.CD', // GDP (current US$)
  gdpPPP: 'NY.GDP.MKTP.PP.CD', // GDP, PPP (current international $)
  gdpNominalPerCapita: 'NY.GDP.PCAP.CD', // GDP per capita (current US$)
  gdpPPPPerCapita: 'NY.GDP.PCAP.PP.CD', // GDP per capita, PPP (current international $)
  populationTotal: 'SP.POP.TOTL', // Population, total
  pop0_14Pct: 'SP.POP.0014.TO.ZS', // Population ages 0-14 (% of total)
  pop15_64Pct: 'SP.POP.1564.TO.ZS', // Population ages 15-64 (% of total)
  pop65PlusPct: 'SP.POP.65UP.TO.ZS', // Population ages 65 and above (% of total)
  lifeExpectancy: 'SP.DYN.LE00.IN', // Life expectancy at birth, total (years)
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
  const url = `${WORLD_BANK_BASE}/country/all/indicator/${INDICATORS[indicator]}?format=json&per_page=20000&date=${safeYear}:${safeYear}`;
  const res = await axios.get<WorldBankIndicatorResponse>(url);
  const [, data] = res.data;
  return data;
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

  // Enrich with timezone, currency, and area metadata from REST Countries.
  try {
    const restUrl = `https://restcountries.com/v3.1/alpha/${summary.iso2Code}?fields=timezones,currencies,area`;
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
    }
  } catch {
    // If REST Countries enrichment fails, fall back to World Bank-only metadata.
  }

  return summary;
}

export async function fetchAllCountries(): Promise<CountrySummary[]> {
  const url = `${WORLD_BANK_BASE}/country?format=json&per_page=400`;
  const res = await axios.get<[unknown, any[]]>(url);
  const [, data] = res.data;

  return data
    .filter((item) => item.region?.id !== 'NA' && item.id && item.iso2Code)
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
  const [
    summary,
    gdpNominal,
    gdpPPP,
    gdpNominalPerCapita,
    gdpPPPPerCapita,
    population,
    lifeExpectancy,
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
      fetchIndicatorSeries(countryCode, 'populationTotal', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'lifeExpectancy', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'pop0_14Pct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'pop15_64Pct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'pop65PlusPct', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'landArea', startYear, endYear),
      fetchIndicatorSeries(countryCode, 'surfaceArea', startYear, endYear),
    ]);

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
  const effectiveStart = sortedYears[0] ?? startYear;
  const effectiveEnd = sortedYears[sortedYears.length - 1] ?? endYear;

  const latestYear = sortedYears[sortedYears.length - 1];
  let latestSnapshot: CountryYearSnapshot | undefined;
  if (latestYear) {
    const year = latestYear;

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
        },
        geography: {
          landAreaKm2: landAreaValue,
          totalAreaKm2: surfaceAreaValue ?? landAreaValue,
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
  async function loadForYear(year: number): Promise<GlobalCountryMetricsRow[]> {
    const validIso3 = await getWorldBankCountryIso3Set();
    const [
      gdpNominal,
      gdpPPP,
      gdpNominalPerCapita,
      gdpPPPPerCapita,
      populationTotal,
      lifeExpectancy,
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
      fetchGlobalIndicatorForYear('populationTotal', year),
      // Life expectancy changes slowly; use latest non-null value.
      fetchGlobalStaticIndicator('lifeExpectancy'),
      fetchGlobalIndicatorForYear('pop0_14Pct', year),
      fetchGlobalIndicatorForYear('pop15_64Pct', year),
      fetchGlobalIndicatorForYear('pop65PlusPct', year),
      // Land/surface area are essentially static; use the latest non-null value.
      fetchGlobalStaticIndicator('landArea'),
      fetchGlobalStaticIndicator('surfaceArea'),
    ]);

    const byIso3 = new Map<string, GlobalCountryMetricsRow>();

    const apply = (
      rows: WorldBankIndicatorRow[],
      key: keyof Omit<
        GlobalCountryMetricsRow,
        'iso2Code' | 'iso3Code' | 'name' | 'year'
      >,
    ) => {
      for (const row of rows) {
        if (!row.countryiso3code) continue;
        const iso3 = row.countryiso3code.toUpperCase();
        // Keep only real countries that exist in REST Countries; skip aggregates/regions.
        if (!validIso3.has(iso3)) continue;

        const existing =
          byIso3.get(iso3) ??
          {
            iso2Code: undefined,
            iso3Code: iso3,
            name:
              iso3 === 'PSE'
                ? 'Palestine (West Bank and Gaza)'
                : row.country.value,
            year,
          };

        (existing as any)[key] = row.value;
        byIso3.set(iso3, existing);
      }
    };

    apply(gdpNominal, 'gdpNominal');
    apply(gdpPPP, 'gdpPPP');
    apply(gdpNominalPerCapita, 'gdpNominalPerCapita');
    apply(gdpPPPPerCapita, 'gdpPPPPerCapita');
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
    }

    const rows = Array.from(byIso3.values());
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

  const safePreferred = Math.min(
    Math.max(preferredYear, DATA_MIN_YEAR),
    DATA_MAX_YEAR,
  );
  return loadForYear(safePreferred);
}


