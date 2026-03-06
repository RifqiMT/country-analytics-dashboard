/**
 * Fallback responses when no LLM API key is configured.
 * Uses metric metadata and dashboard snapshot to answer common questions.
 */
import { DATA_MAX_YEAR } from '../config';
import { METRIC_METADATA } from '../data/metricMetadata';
import { formatCompactNumber, formatPercentage } from './numberFormat';

export interface GlobalCountryRowForFallback {
  name: string;
  iso2Code: string;
  gdpNominal?: number | null;
  gdpPPP?: number | null;
  gdpNominalPerCapita?: number | null;
  gdpPPPPerCapita?: number | null;
  populationTotal?: number | null;
  lifeExpectancy?: number | null;
  inflationCPI?: number | null;
  govDebtPercentGDP?: number | null;
  govDebtUSD?: number | null;
  interestRate?: number | null;
  unemploymentRate?: number | null;
  unemployedTotal?: number | null;
  labourForceTotal?: number | null;
  povertyHeadcount215?: number | null;
  povertyHeadcountNational?: number | null;
  maternalMortalityRatio?: number | null;
  under5MortalityRate?: number | null;
  undernourishmentPrevalence?: number | null;
  population0_14?: number | null;
  population15_64?: number | null;
  population65Plus?: number | null;
  landAreaKm2?: number | null;
  totalAreaKm2?: number | null;
  eezKm2?: number | null;
  pop0_14Pct?: number | null;
  pop15_64Pct?: number | null;
  pop65PlusPct?: number | null;
  region?: string;
  headOfGovernmentType?: string | null;
  governmentType?: string | null;
}

export interface DashboardSnapshotForFallback {
  countryName: string;
  year: number;
  summary?: {
    region?: string;
    incomeLevel?: string;
    capitalCity?: string;
    currencyCode?: string;
    currencyName?: string;
    government?: string;
    governmentType?: string;
    headOfGovernmentType?: string;
    timezone?: string;
  };
  metrics: {
    financial?: {
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
    population?: {
      total?: number | null;
      ageBreakdown?: {
        groups?: Array<{ id: string; percentageOfPopulation?: number | null }>;
      };
    };
    health?: {
      lifeExpectancy?: number | null;
      maternalMortalityRatio?: number | null;
      under5MortalityRate?: number | null;
      undernourishmentPrevalence?: number | null;
    };
    geography?: {
      landAreaKm2?: number | null;
      totalAreaKm2?: number | null;
      eezKm2?: number | null;
    };
  };
}

/** When fallback returns content containing this, the rule-based answer was generic; plugin may try a free LLM. */
export const FALLBACK_GENERIC_HELP_MARKER = 'For full conversational answers, add your';

function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesQuery(text: string, keywords: string[]): boolean {
  const t = normalizeQuery(text);
  return keywords.some((k) => t.includes(k.toLowerCase()));
}

function countryMatchesQuery(q: string, countryName: string): boolean {
  const nameParts = countryName.toLowerCase().split(/\s+/);
  return nameParts.some((p) => p.length > 2 && q.includes(p));
}

function formatVal(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A';
  if (unit === '%') return formatPercentage(v);
  return formatCompactNumber(v);
}

function parseRequestedYear(q: string): number | null {
  const m = q.match(/\b(20[0-2][0-9])\b/);
  return m ? parseInt(m[1], 10) : null;
}

/** Parse year range from query.
 * Supports:
 * - "from 2020 to 2024"
 * - "from 2020 to latest/now/current"
 * - "between 2020 and 2024"
 * - "between 2020 and the latest"
 * - "since 2020" / "from 2020 onwards"
 */
function parseRequestedYearRange(q: string): { fromYear: number; toYear: number } | null {
  const fromToExplicit = q.match(/from\s+(20[0-2][0-9])\s+(?:to|until|through|till)\s+(20[0-2][0-9])/i);
  if (fromToExplicit) {
    const fromYear = parseInt(fromToExplicit[1], 10);
    const toYear = parseInt(fromToExplicit[2], 10);
    return { fromYear, toYear };
  }

  const fromToLatest = q.match(
    /from\s+(20[0-2][0-9])\s+(?:to|until|through|till)\s+(?:latest|now|current|present|the latest)/i,
  );
  if (fromToLatest) {
    const fromYear = parseInt(fromToLatest[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const betweenExplicit = q.match(
    /between\s+(20[0-2][0-9])\s+(?:and|-|to)\s+(20[0-2][0-9])/i,
  );
  if (betweenExplicit) {
    const fromYear = parseInt(betweenExplicit[1], 10);
    const toYear = parseInt(betweenExplicit[2], 10);
    return { fromYear, toYear };
  }

  const betweenLatest = q.match(
    /between\s+(20[0-2][0-9])\s+(?:and|-|to)\s+(?:latest|now|current|present|the latest)/i,
  );
  if (betweenLatest) {
    const fromYear = parseInt(betweenLatest[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const sinceMatch = q.match(
    /(?:since|from)\s+(20[0-2][0-9])\b(?:\s+(?:onwards|forward|until\s+now|until\s+current|until\s+latest))?/i,
  );
  if (sinceMatch) {
    const fromYear = parseInt(sinceMatch[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  const fromOnly = q.match(/from\s+(20[0-2][0-9])/i);
  if (fromOnly) {
    const fromYear = parseInt(fromOnly[1], 10);
    return { fromYear, toYear: DATA_MAX_YEAR };
  }

  return null;
}

/** Map user region terms to World Bank region substrings for filtering */
const REGION_TERMS: Record<string, string[]> = {
  asia: ['east asia', 'south asia', 'central asia', 'asia'],
  europe: ['europe', 'central asia'],
  'latin america': ['latin america', 'caribbean'],
  africa: ['sub-saharan africa', 'north africa', 'africa'],
  'middle east': ['middle east', 'north africa'],
  'north america': ['north america'],
  oceania: ['pacific', 'oceania'],
};

function parseRegion(q: string): string | null {
  const qLower = q.toLowerCase();
  for (const term of Object.keys(REGION_TERMS)) {
    if (qLower.includes(term)) return term;
  }
  return null;
}

function filterByRegion<T extends { region?: string | null }>(
  rows: T[],
  regionTerm: string,
): T[] {
  const substrings = REGION_TERMS[regionTerm];
  if (!substrings) return rows;
  return rows.filter((r) => {
    const rRegion = (r.region ?? '').toLowerCase();
    return substrings.some((s) => rRegion.includes(s));
  });
}

/** Map query phrases to metric keys for single-metric lookups */
const METRIC_SYNONYMS: Array<{ pattern: RegExp; key: keyof GlobalCountryRowForFallback; label: string; format: (v: number | null) => string }> = [
  { pattern: /gdp\s*(nominal|usd)?|economy|market size|economic size/i, key: 'gdpNominal', label: 'GDP (Nominal)', format: (v) => formatVal(v, '') + ' USD' },
  { pattern: /gdp\s*ppp|ppp|purchasing power/i, key: 'gdpPPP', label: 'GDP (PPP)', format: (v) => formatVal(v, '') + ' Intl$' },
  { pattern: /gdp\s*per\s*capita|per capita\s*(nominal)?|gdppercapita|living standard/i, key: 'gdpNominalPerCapita', label: 'GDP per capita (Nominal)', format: (v) => formatVal(v, '') + ' USD' },
  { pattern: /ppp\s*per\s*capita|ppp\s*capita/i, key: 'gdpPPPPerCapita', label: 'GDP per capita (PPP)', format: (v) => formatVal(v, '') + ' Intl$' },
  { pattern: /population|people|pop\b|demographic size/i, key: 'populationTotal', label: 'Population', format: (v) => formatVal(v, '') + ' people' },
  { pattern: /life\s*expectancy|longevity|life exp/i, key: 'lifeExpectancy', label: 'Life expectancy', format: (v) => formatVal(v, '') + ' years' },
  { pattern: /inflation|cpi|price change/i, key: 'inflationCPI', label: 'Inflation', format: (v) => formatPercentage(v) },
  { pattern: /(government\s*)?debt\s*(%|percent|of gdp)/i, key: 'govDebtPercentGDP', label: 'Government debt (% GDP)', format: (v) => formatPercentage(v) },
  { pattern: /debt\s*(in\s*)?(usd|dollars?)|government debt usd/i, key: 'govDebtUSD', label: 'Government debt (USD)', format: (v) => formatVal(v, '') + ' USD' },
  { pattern: /interest\s*rate|lending\s*rate|borrowing cost/i, key: 'interestRate', label: 'Lending interest rate', format: (v) => formatPercentage(v) },
  { pattern: /unemployment\s*rate|jobless\s*rate|unemployment\s*%/i, key: 'unemploymentRate', label: 'Unemployment rate (%)', format: (v) => formatPercentage(v) },
  { pattern: /unemployed\s*(people|persons?|number)|number\s*of\s*unemployed|people\s*unemployed/i, key: 'unemployedTotal', label: 'Unemployed (number)', format: (v) => formatVal(v, '') + ' people' },
  { pattern: /labour\s*force|labor\s*force|workforce\s*size|total\s*labour|total\s*labor/i, key: 'labourForceTotal', label: 'Labour force (total)', format: (v) => formatVal(v, '') + ' people' },
  { pattern: /poverty\s*\$2\.15|poverty\s*2\.15|2\.15.*poverty|extreme poverty|poverty\s*headcount/i, key: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)', format: (v) => formatPercentage(v) },
  { pattern: /poverty\s*national|national\s*poverty\s*line|poverty\s*line/i, key: 'povertyHeadcountNational', label: 'Poverty (national line, %)', format: (v) => formatPercentage(v) },
  { pattern: /poverty|poor\s*people|people in poverty/i, key: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)', format: (v) => formatPercentage(v) },
  { pattern: /land\s*area|land size|land\s*km/i, key: 'landAreaKm2', label: 'Land area', format: (v) => formatVal(v, '') + ' km²' },
  { pattern: /total\s*area|surface\s*area|country\s*size|area\s*km/i, key: 'totalAreaKm2', label: 'Total area', format: (v) => formatVal(v, '') + ' km²' },
  { pattern: /eez|exclusive economic|maritime\s*area/i, key: 'eezKm2', label: 'EEZ', format: (v) => formatVal(v, '') + ' km²' },
  { pattern: /age\s*0[- ]?14|youth|children\s*%/i, key: 'pop0_14Pct', label: 'Age 0–14 (% of population)', format: (v) => formatPercentage(v) },
  { pattern: /age\s*15[- ]?64|working\s*age|labor\s*force\s*%/i, key: 'pop15_64Pct', label: 'Age 15–64 (% of population)', format: (v) => formatPercentage(v) },
  { pattern: /age\s*65|elderly|senior|65\+|old age/i, key: 'pop65PlusPct', label: 'Age 65+ (% of population)', format: (v) => formatPercentage(v) },
  { pattern: /maternal\s*mortality|maternal\s*death|mmr\b|mothers?\s*dying|pregnancy\s*death/i, key: 'maternalMortalityRatio', label: 'Maternal mortality (per 100k)', format: (v) => (v != null ? formatVal(v, '') + ' per 100k' : 'N/A') },
  { pattern: /under[- ]?5\s*mortality|child\s*mortality|under\s*five|u5mr|infant\s*mortality|under5/i, key: 'under5MortalityRate', label: 'Under-5 mortality (per 1k)', format: (v) => (v != null ? formatVal(v, '') + ' per 1k' : 'N/A') },
  { pattern: /undernourish|malnutrition|hunger|food\s*insecurity|undernutrition/i, key: 'undernourishmentPrevalence', label: 'Undernourishment (%)', format: (v) => formatPercentage(v) },
  { pattern: /population\s*0[- ]?14|youth\s*population|children\s*population|pop\s*0[- ]?14\s*(count|number)/i, key: 'population0_14', label: 'Population 0–14 (count)', format: (v) => formatVal(v, '') + ' people' },
  { pattern: /population\s*15[- ]?64|working[- ]?age\s*population|pop\s*15[- ]?64\s*(count|number)/i, key: 'population15_64', label: 'Population 15–64 (count)', format: (v) => formatVal(v, '') + ' people' },
  { pattern: /population\s*65|elderly\s*population|senior\s*population|pop\s*65\+\s*(count|number)/i, key: 'population65Plus', label: 'Population 65+ (count)', format: (v) => formatVal(v, '') + ' people' },
];

function parseSingleMetricIntent(q: string): (typeof METRIC_SYNONYMS)[0] | null {
  for (const m of METRIC_SYNONYMS) {
    if (m.pattern.test(q)) return m;
  }
  return null;
}

/** All metrics with patterns to detect user intent – supports unlimited combinations */
type MetricKey = keyof GlobalCountryRowForFallback;
const ALL_METRIC_DEFS: Array<{
  key: MetricKey;
  label: string;
  patterns: RegExp[];
  format: (r: GlobalCountryRowForFallback) => string;
}> = [
  { key: 'gdpNominal', label: 'GDP (Nominal)', patterns: [/gdp\s*(nominal|usd)?\b|economy|market size|economic size|gross domestic/i], format: (r) => formatVal(r.gdpNominal ?? null, '') + ' USD' },
  { key: 'gdpPPP', label: 'GDP (PPP)', patterns: [/gdp\s*ppp|ppp\b|purchasing power/i], format: (r) => formatVal(r.gdpPPP ?? null, '') + ' Intl$' },
  { key: 'gdpNominalPerCapita', label: 'GDP per capita', patterns: [/gdp\s*per\s*capita|per capita|gdppercapita|living standard|richest|poorest/i], format: (r) => formatVal(r.gdpNominalPerCapita ?? null, '') + ' USD' },
  { key: 'gdpPPPPerCapita', label: 'GDP per capita (PPP)', patterns: [/ppp\s*per\s*capita|ppp\s*capita/i], format: (r) => formatVal(r.gdpPPPPerCapita ?? null, '') + ' Intl$' },
  { key: 'populationTotal', label: 'Population', patterns: [/population|people|pop\b|demographic size|most populous|least populous/i], format: (r) => formatVal(r.populationTotal ?? null, '') + ' people' },
  { key: 'lifeExpectancy', label: 'Life expectancy', patterns: [/life\s*expectancy|longevity|life exp/i], format: (r) => formatVal(r.lifeExpectancy ?? null, '') + ' years' },
  { key: 'inflationCPI', label: 'Inflation', patterns: [/inflation|cpi|price change/i], format: (r) => formatPercentage(r.inflationCPI ?? null) },
  { key: 'govDebtPercentGDP', label: 'Gov debt (% GDP)', patterns: [/debt\s*(%|percent|of gdp)|gov.*debt\s*%/i], format: (r) => formatPercentage(r.govDebtPercentGDP ?? null) },
  { key: 'govDebtUSD', label: 'Gov debt (USD)', patterns: [/debt\s*(usd|dollars?)|government debt usd/i], format: (r) => formatVal(r.govDebtUSD ?? null, '') + ' USD' },
  { key: 'interestRate', label: 'Interest rate', patterns: [/interest\s*rate|lending\s*rate|borrowing cost/i], format: (r) => formatPercentage(r.interestRate ?? null) },
  { key: 'unemploymentRate', label: 'Unemployment rate (%)', patterns: [/unemployment\s*rate|jobless\s*rate|unemployment\s*%/i], format: (r) => formatPercentage(r.unemploymentRate ?? null) },
  { key: 'unemployedTotal', label: 'Unemployed (number)', patterns: [/unemployed\s*(people|persons?|number)|number\s*of\s*unemployed|people\s*unemployed/i], format: (r) => formatVal(r.unemployedTotal ?? null, '') + ' people' },
  { key: 'labourForceTotal', label: 'Labour force (total)', patterns: [/labour\s*force|labor\s*force|workforce\s*size|total\s*labour|total\s*labor/i], format: (r) => formatVal(r.labourForceTotal ?? null, '') + ' people' },
  { key: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)', patterns: [/poverty\s*\$2\.15|poverty\s*2\.15|2\.15.*poverty|extreme poverty|poverty\s*headcount|poverty|poor\s*people|people in poverty/i], format: (r) => formatPercentage(r.povertyHeadcount215 ?? null) },
  { key: 'povertyHeadcountNational', label: 'Poverty (national line, %)', patterns: [/poverty\s*national|national\s*poverty\s*line|poverty\s*line/i], format: (r) => formatPercentage(r.povertyHeadcountNational ?? null) },
  { key: 'landAreaKm2', label: 'Land area', patterns: [/land\s*area|land size|land\s*km/i], format: (r) => (r.landAreaKm2 != null ? formatVal(r.landAreaKm2, '') + ' km²' : 'N/A') },
  { key: 'totalAreaKm2', label: 'Total area', patterns: [/total\s*area|surface\s*area|country\s*size|area\s*km/i], format: (r) => (r.totalAreaKm2 != null ? formatVal(r.totalAreaKm2, '') + ' km²' : 'N/A') },
  { key: 'eezKm2', label: 'EEZ', patterns: [/eez|exclusive economic|maritime\s*area/i], format: (r) => (r.eezKm2 != null ? formatVal(r.eezKm2, '') + ' km²' : 'N/A') },
  { key: 'pop0_14Pct', label: 'Age 0–14%', patterns: [/age\s*0[- ]?14|youth|children\s*%/i], format: (r) => formatPercentage(r.pop0_14Pct ?? null) },
  { key: 'pop15_64Pct', label: 'Age 15–64%', patterns: [/age\s*15[- ]?64|working\s*age|labor\s*force/i], format: (r) => formatPercentage(r.pop15_64Pct ?? null) },
  { key: 'pop65PlusPct', label: 'Age 65+%', patterns: [/age\s*65|elderly|senior|65\+|old age/i], format: (r) => formatPercentage(r.pop65PlusPct ?? null) },
  { key: 'maternalMortalityRatio', label: 'Maternal mortality (per 100k)', patterns: [/maternal\s*mortality|maternal\s*death|mmr\b|mothers?\s*dying|pregnancy\s*death/i], format: (r) => (r.maternalMortalityRatio != null ? formatVal(r.maternalMortalityRatio, '') + ' per 100k' : 'N/A') },
  { key: 'under5MortalityRate', label: 'Under-5 mortality (per 1k)', patterns: [/under[- ]?5\s*mortality|child\s*mortality|under\s*five|u5mr|infant\s*mortality|under5/i], format: (r) => (r.under5MortalityRate != null ? formatVal(r.under5MortalityRate, '') + ' per 1k' : 'N/A') },
  { key: 'undernourishmentPrevalence', label: 'Undernourishment (%)', patterns: [/undernourish|malnutrition|hunger|food\s*insecurity|undernutrition/i], format: (r) => formatPercentage(r.undernourishmentPrevalence ?? null) },
  { key: 'population0_14', label: 'Population 0–14 (count)', patterns: [/population\s*0[- ]?14|youth\s*population|children\s*population|pop\s*0[- ]?14\s*(count|number)/i], format: (r) => (r.population0_14 != null ? formatVal(r.population0_14, '') + ' people' : 'N/A') },
  { key: 'population15_64', label: 'Population 15–64 (count)', patterns: [/population\s*15[- ]?64|working[- ]?age\s*population|pop\s*15[- ]?64\s*(count|number)/i], format: (r) => (r.population15_64 != null ? formatVal(r.population15_64, '') + ' people' : 'N/A') },
  { key: 'population65Plus', label: 'Population 65+ (count)', patterns: [/population\s*65|elderly\s*population|senior\s*population|pop\s*65\+\s*(count|number)/i], format: (r) => (r.population65Plus != null ? formatVal(r.population65Plus, '') + ' people' : 'N/A') },
  { key: 'governmentType', label: 'Gov type', patterns: [/government\s*type|gov\s*type|political system|form of government|political/i], format: (r) => r.governmentType ?? 'N/A' },
  { key: 'headOfGovernmentType', label: 'Head of gov', patterns: [/head\s*of\s*government|head\s*of\s*gov|leader|head of state/i], format: (r) => r.headOfGovernmentType ?? 'N/A' },
  { key: 'region', label: 'Region', patterns: [/region|geographic\s*region/i], format: (r) => r.region ?? 'N/A' },
];

function parseAllRequestedMetrics(q: string): Array<{ key: MetricKey; label: string; format: (r: GlobalCountryRowForFallback) => string }> {
  const wantsAll = /all\s*(information|data|metrics|info)|everything|complete|full\s*(overview|information|data)|comprehensive|include\s*all|each\s*and\s*every/i.test(q);
  if (wantsAll) return ALL_METRIC_DEFS.map((m) => ({ key: m.key, label: m.label, format: m.format }));
  const found: Array<{ key: MetricKey; label: string; format: (r: GlobalCountryRowForFallback) => string }> = [];
  const seen = new Set<MetricKey>();
  for (const m of ALL_METRIC_DEFS) {
    if (m.patterns.some((p) => p.test(q)) && !seen.has(m.key)) {
      seen.add(m.key);
      found.push({ key: m.key, label: m.label, format: m.format });
    }
  }
  return found;
}

type RankingMetric =
  | 'gdpNominal' | 'gdpPPP' | 'gdpNominalPerCapita' | 'gdpPPPPerCapita'
  | 'populationTotal' | 'lifeExpectancy' | 'inflationCPI' | 'govDebtPercentGDP'
  | 'interestRate' | 'unemploymentRate' | 'unemployedTotal' | 'labourForceTotal'
  | 'povertyHeadcount215' | 'povertyHeadcountNational'
  | 'maternalMortalityRatio' | 'under5MortalityRate' | 'undernourishmentPrevalence'
  | 'population0_14' | 'population15_64' | 'population65Plus'
  | 'landAreaKm2' | 'totalAreaKm2' | 'eezKm2';

function parseRankingRequest(q: string): {
  isRanking: boolean;
  n: number;
  direction: 'top' | 'low';
  metric: RankingMetric;
  region?: string | null;
} | null {
  const rankingKeywords = [
    'top 10', 'top 20', 'top 50', 'top 100', 'top 5', 'top 15', 'top 30',
    'top 3', 'top 4', 'top 2', 'top 6', 'top 7', 'top 8', 'top 9',
    'low 10', 'low 20', 'low 50', 'low 100', 'low 5', 'bottom 10', 'bottom 100',
    'highest', 'lowest', 'ranked', 'ranking', 'top countries', 'list of countries',
    'countries by', 'by gdp', 'by population', 'by life expectancy', 'by inflation',
    'top ten', 'top hundred', 'low ten', 'low hundred',
    'which country', 'what country', 'which nation', 'largest', 'smallest',
    'in terms of', 'shortlist', 'short list', 'best markets', 'growth markets',
    'fastest growing', 'slowest', 'biggest', 'richest', 'poorest', 'most populous',
    'least populous', 'list of', 'show me', 'based on', 'according to',
  ];
  const hasRankingPattern =
    rankingKeywords.some((k) => q.includes(k)) ||
    /(?:top|low|bottom)\s*\d+\s*countr/i.test(q) ||
    /list\s+of\s+(?:government|gdp|population|inflation)/i.test(q) ||
    (/\d+\s*countr/i.test(q) && /(?:by|in terms of|gdp|population|per capita|inflation|life expectancy|based on)/i.test(q));
  if (!hasRankingPattern) return null;

  const region = parseRegion(q);
  const nMatch = q.match(/\b(?:top|low|bottom)\s*(\d+)\b/i) ?? q.match(/\b(\d+)\s*countries?\b/i) ?? q.match(/\b(?:shortlist|short list)\s*(\d+)/i);
  const wordN: Record<string, number> = { ten: 10, twenty: 20, fifty: 50, hundred: 100 };
  const wordMatch = q.match(/\b(?:top|low|bottom)\s*(ten|twenty|fifty|hundred)\b/i);
  const isSingle = /which country|what country|which nation|highest|lowest|largest|smallest/.test(q);
  const n = isSingle
    ? 1
    : nMatch
      ? Math.min(200, Math.max(1, parseInt(nMatch[1], 10)))
      : wordMatch
        ? wordN[wordMatch[1].toLowerCase()]
        : 10;

  const isLow = /low|bottom|lowest/.test(q);
  const direction = isLow ? 'low' : 'top';

  if (/population|by population|most populous|least populous/i.test(q)) return { isRanking: true, n, direction, metric: 'populationTotal', region };
  if (/life expectancy|life exp|longevity/i.test(q)) return { isRanking: true, n, direction, metric: 'lifeExpectancy', region };
  if (/inflation|by inflation/i.test(q)) return { isRanking: true, n, direction, metric: 'inflationCPI', region };
  if (/debt|gov.*debt|by debt/i.test(q)) return { isRanking: true, n, direction, metric: 'govDebtPercentGDP', region };
  if (/interest rate|by interest/i.test(q)) return { isRanking: true, n, direction, metric: 'interestRate', region };
  if (/unemployment\s*rate|by unemployment\s*rate|jobless\s*rate/i.test(q)) return { isRanking: true, n, direction, metric: 'unemploymentRate', region };
  if (/unemployed|number of unemployed|by unemployed|most unemployed/i.test(q)) return { isRanking: true, n, direction, metric: 'unemployedTotal', region };
  if (/labour\s*force|labor\s*force|workforce|by labour|by labor/i.test(q)) return { isRanking: true, n, direction, metric: 'labourForceTotal', region };
  if (/maternal\s*mortality|maternal\s*death|mmr|mothers?\s*dying|pregnancy\s*death|by maternal/i.test(q)) return { isRanking: true, n, direction, metric: 'maternalMortalityRatio', region };
  if (/under[- ]?5\s*mortality|child\s*mortality|under\s*five|u5mr|infant\s*mortality|by under.?5|by child mortality/i.test(q)) return { isRanking: true, n, direction, metric: 'under5MortalityRate', region };
  if (/undernourish|malnutrition|hunger|food\s*insecurity|by undernourish|by malnutrition/i.test(q)) return { isRanking: true, n, direction, metric: 'undernourishmentPrevalence', region };
  if (/population\s*0[- ]?14|youth\s*population|children\s*population|by youth population/i.test(q)) return { isRanking: true, n, direction, metric: 'population0_14', region };
  if (/population\s*15[- ]?64|working[- ]?age\s*population|by working age/i.test(q)) return { isRanking: true, n, direction, metric: 'population15_64', region };
  if (/population\s*65|elderly\s*population|senior\s*population|by elderly|by senior population/i.test(q)) return { isRanking: true, n, direction, metric: 'population65Plus', region };
  if (/poverty|by poverty|poorest countries|richest.*poverty|poverty rate/i.test(q)) return { isRanking: true, n, direction, metric: 'povertyHeadcount215', region };
  if (/land area|by land|land area/i.test(q)) return { isRanking: true, n, direction, metric: 'landAreaKm2', region };
  if (/total area|surface area|by area/i.test(q)) return { isRanking: true, n, direction, metric: 'totalAreaKm2', region };
  if (/eez|exclusive economic|maritime|by eez/i.test(q)) return { isRanking: true, n, direction, metric: 'eezKm2', region };
  if (/gdp per capita|per capita|gdppercapita|richest|poorest|living standard/i.test(q)) return { isRanking: true, n, direction, metric: 'gdpNominalPerCapita', region };
  if (/ppp per capita|ppp capita/i.test(q)) return { isRanking: true, n, direction, metric: 'gdpPPPPerCapita', region };
  if (/ppp|purchasing power/i.test(q)) return { isRanking: true, n, direction, metric: 'gdpPPP', region };
  if (/biggest|largest|smallest|market size|economic size/i.test(q) && !/gdp per capita|per capita/i.test(q)) return { isRanking: true, n, direction, metric: 'gdpNominal', region };
  return { isRanking: true, n, direction, metric: 'gdpNominal', region };
}

function parseCountryNames(
  q: string,
  availableNames: string[],
): string[] {
  const found: string[] = [];
  const qLower = q.toLowerCase();
  for (const name of availableNames) {
    if (name.length < 4) continue;
    const nameLower = name.toLowerCase();
    if (qLower.includes(nameLower)) found.push(name);
  }
  if (found.length > 0) return found;
  const commonCountries = [
    'Indonesia', 'Ukraine', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines',
    'Japan', 'China', 'India', 'Brazil', 'Mexico', 'Germany', 'France', 'United Kingdom',
    'United States', 'Russia', 'South Korea', 'Australia', 'Canada', 'South Africa',
  ];
  for (const name of commonCountries) {
    if (qLower.includes(name.toLowerCase())) found.push(name);
  }
  return found;
}

function formatCountryOverview(
  r: GlobalCountryRowForFallback,
  year: number,
): string[] {
  const lines = [
    `**${r.name}** (${year})`,
    `- Region: ${r.region ?? 'N/A'}`,
    `- GDP (Nominal): ${formatVal(r.gdpNominal ?? null, '')} USD`,
    `- GDP (PPP): ${formatVal(r.gdpPPP ?? null, '')} Intl$`,
    `- GDP per capita (Nominal): ${formatVal(r.gdpNominalPerCapita ?? null, '')} USD`,
    `- GDP per capita (PPP): ${formatVal(r.gdpPPPPerCapita ?? null, '')} Intl$`,
    `- Population: ${formatVal(r.populationTotal ?? null, '')} people`,
    `- Life expectancy: ${formatVal(r.lifeExpectancy ?? null, '')} years`,
    `- Inflation: ${formatPercentage(r.inflationCPI ?? null)}`,
    `- Lending interest rate: ${formatPercentage(r.interestRate ?? null)}`,
    `- Unemployment rate: ${formatPercentage(r.unemploymentRate ?? null)}`,
    ...(r.unemployedTotal != null ? [`- Unemployed (number): ${formatVal(r.unemployedTotal, '')} people`] : []),
    ...(r.labourForceTotal != null ? [`- Labour force (total): ${formatVal(r.labourForceTotal, '')} people`] : []),
    `- Government debt: ${formatPercentage(r.govDebtPercentGDP ?? null)} of GDP`,
    `- Government debt: ${formatVal(r.govDebtUSD ?? null, '')} USD`,
    ...(r.povertyHeadcount215 != null ? [`- Poverty ($2.15/day): ${formatPercentage(r.povertyHeadcount215)}`] : []),
    ...(r.povertyHeadcountNational != null ? [`- Poverty (national line): ${formatPercentage(r.povertyHeadcountNational)}`] : []),
    ...(r.pop0_14Pct != null ? [`- Age 0–14: ${formatPercentage(r.pop0_14Pct)} of population`] : []),
    ...(r.pop15_64Pct != null ? [`- Age 15–64: ${formatPercentage(r.pop15_64Pct)} of population`] : []),
    ...(r.pop65PlusPct != null ? [`- Age 65+: ${formatPercentage(r.pop65PlusPct)} of population`] : []),
    ...(r.population0_14 != null ? [`- Population 0–14 (count): ${formatVal(r.population0_14, '')} people`] : []),
    ...(r.population15_64 != null ? [`- Population 15–64 (count): ${formatVal(r.population15_64, '')} people`] : []),
    ...(r.population65Plus != null ? [`- Population 65+ (count): ${formatVal(r.population65Plus, '')} people`] : []),
    ...(r.maternalMortalityRatio != null ? [`- Maternal mortality: ${formatVal(r.maternalMortalityRatio, '')} per 100k live births`] : []),
    ...(r.under5MortalityRate != null ? [`- Under-5 mortality: ${formatVal(r.under5MortalityRate, '')} per 1k live births`] : []),
    ...(r.undernourishmentPrevalence != null ? [`- Undernourishment: ${formatPercentage(r.undernourishmentPrevalence)} of population`] : []),
    `- Land area: ${r.landAreaKm2 != null ? formatVal(r.landAreaKm2, '') + ' km²' : 'N/A'}`,
    `- Total area: ${r.totalAreaKm2 != null ? formatVal(r.totalAreaKm2, '') + ' km²' : 'N/A'}`,
    `- EEZ: ${r.eezKm2 != null ? formatVal(r.eezKm2, '') + ' km²' : 'N/A'}`,
    ...(r.governmentType != null ? [`- Government type: ${r.governmentType}`] : []),
    ...(r.headOfGovernmentType != null ? [`- Head of government: ${r.headOfGovernmentType}`] : []),
    '',
  ];
  return lines;
}

const OUT_OF_SCOPE_FALLBACK =
  /\b(?:religion|religions|relgiions)\b|(?:religion|religions)\s+(?:in|of)\s+|(?:culture|cultural)\s+(?:of|in)\s+|(?:language|languages)\s+(?:of|in)\s+|(?:president|prime\s+minister|leader|capital)\s+(?:of|in)\s+|(?:independence|national)\s+day|who\s+is\s+(?:the\s+)?(?:president|leader)|where\s+(?:is\s+)?\w+\s+(?:is\s+)?located|(?:where\s+is|location\s+of)\s+\w+|(?:in\s+)?which\s+continent|which\s+continent\s+is|neighbor(?:ing)?\s+countries?\s+(?:of|around)\s+\w+|which\s+countries\s+border\s+\w+|borders?\s+(?:with|of)\s+\w+/i;

/** True if the query is asking about location/geography (not dashboard metrics). */
function isLocationOrGeographyQuery(normalizedQ: string): boolean {
  const s = normalizedQ.trim();

  // If the user mentions "where", "location", "continent", "neighbour", or "border"
  // and does NOT mention any explicit metric keyword, treat as pure location/geography.
  const hasMetricKeyword = /\b(gdp|population|inflation|debt|unemployment|life expectancy|poverty|per capita|growth|rate|metric|data)\b/i.test(
    s,
  );
  const hasGeoCue = /\bwhere\b|\blocation\b|\bcontinent\b|neighbor(?:ing)?\b|neighbour(?:ing)?\b|border(?:s)?\b/i.test(
    s,
  );
  if (hasGeoCue && !hasMetricKeyword) return true;

  if (
    /where\s+.+\s+located|location\s+of\s+.+|(?:in\s+)?which\s+continent|which\s+continent\s+is/i.test(
      s,
    )
  ) {
    return true;
  }
  if (
    /neighbor(?:ing)?\s+countries?\s+(?:of|around)\s+\w+|which\s+countries\s+border\s+\w+|borders?\s+(?:with|of)\s+\w+/i.test(
      s,
    )
  ) {
    return true;
  }
  if (
    /where\s+is\s+\w+|where\s+\w+\s+is\b/i.test(s) &&
    (s.includes('located') || s.includes('location') || s.length < 35)
  ) {
    return true;
  }
  return false;
}

export function getFallbackResponse(
  userMessage: string,
  dashboardSnapshot?: DashboardSnapshotForFallback | null,
  globalData?: GlobalCountryRowForFallback[] | null,
  globalDataByYear?: Record<number, GlobalCountryRowForFallback[]> | null,
): string {
  const q = normalizeQuery(userMessage);

  // Fallback 1: Location/geography questions first – never return dashboard metrics for these
  if (isLocationOrGeographyQuery(q)) {
    return `I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt, interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, and government type. Ask for a country by name, "Top N by [metric]", or "compare X and Y". For questions about **location or geography** (e.g. where a country is located, which continent, who its neighbouring countries are), use the LLM or web search. For full conversational answers, add your API key in Settings.`;
  }

  if (OUT_OF_SCOPE_FALLBACK.test(q)) {
    return `I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt, interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, and government type. Ask for a country by name, "Top N by [metric]", or "compare X and Y". For questions about religion, culture, **location or geography** (e.g. where a country is located, which continent, neighbouring countries), or current leaders, use the LLM or web search. For full conversational answers, add your API key in Settings.`;
  }

  const isSummary = matchesQuery(q, ['summary', 'summarize', 'brief', 'overview in brief']);
  const isComparison = matchesQuery(q, ['compare', 'comparison', 'vs', 'versus', 'relative to', 'rank', 'ranking']);
  const isAllCountries = matchesQuery(q, ['all countries', 'every country', 'global', 'worldwide', 'list countries', 'top countries']);

  const requestedYear = parseRequestedYear(q);
  const dataByYear = globalDataByYear ?? (globalData ? { [dashboardSnapshot?.year ?? DATA_MAX_YEAR]: globalData } : null);
  const effectiveYear = requestedYear && dataByYear?.[requestedYear]
    ? requestedYear
    : Object.keys(dataByYear ?? {})
        .map(Number)
        .filter((y) => !Number.isNaN(y))
        .sort((a, b) => b - a)[0] ?? DATA_MAX_YEAR;
  const effectiveData = effectiveYear && dataByYear ? dataByYear[effectiveYear] : globalData;

  const isMultiCountry = matchesQuery(q, [' and ', ' & ', ' both ', ' countries', ' to ', ' vs ', ' versus ']);
  const allCountryNames = dataByYear
    ? [...new Set(Object.values(dataByYear).flatMap((rows) => rows.map((r) => r.name)))]
    : effectiveData?.map((r) => r.name) ?? [];
  const requestedCountries = parseCountryNames(q, allCountryNames);

  const isSelectedCountry = dashboardSnapshot && requestedCountries.length === 1
    && requestedCountries[0].toLowerCase() === dashboardSnapshot.countryName.toLowerCase();

  const singleMetricIntent = parseSingleMetricIntent(q);

  const yearlyDataPattern =
    /yearly|annually|year\s*by\s*year|year\s*basis|annually\s*basis|from\s*20[0-2][0-9]|since\s*20[0-2][0-9]|between\s*20[0-2][0-9]\s+(?:and|-|to)\s*(?:20[0-2][0-9]|latest|now|current|the latest)|to\s*latest|all\s*data|each\s*year|monthly|quarterly|weekly/i;
  const subAnnualPattern = /weekly|monthly|quarterly/i;
  const wantsYearlyTimeSeries =
    yearlyDataPattern.test(q) &&
    (requestedCountries.length >= 1 || allCountryNames.length > 0 || /indonesia|ukraine|malaysia|singapore|brazil|india|china|japan/i.test(q)) &&
    dataByYear &&
    Object.keys(dataByYear).length >= 1;

  if (wantsYearlyTimeSeries && dataByYear) {
    const allYears = Object.keys(dataByYear)
      .map((k) => (typeof k === 'string' && /^\d+$/.test(k) ? parseInt(k, 10) : Number(k)))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => a - b);
    const yearRange = parseRequestedYearRange(userMessage);
    let years = yearRange
      ? allYears.filter((y) => y >= yearRange.fromYear && y <= yearRange.toYear)
      : allYears;

    const requestedSpanLabel = yearRange ? `${yearRange.fromYear}–${yearRange.toYear}` : null;
    const availableSpanLabel =
      allYears.length > 0 ? `${allYears[0]}–${allYears[allYears.length - 1]}` : null;
    let coverageNote: string | null = null;

    if (yearRange) {
      if (years.length === 0 && allYears.length > 0) {
        years = allYears;
        coverageNote = `_Note: data for your requested range (${requestedSpanLabel}) is **not available** in the global dataset currently loaded. Showing the closest available years instead (${availableSpanLabel})._`;
      } else if (years.length > 0 && availableSpanLabel && requestedSpanLabel) {
        const coversFrom = years[0] === yearRange.fromYear;
        const coversTo = years[years.length - 1] === yearRange.toYear;
        if (!coversFrom || !coversTo) {
          coverageNote = `_Note: data for your requested range (${requestedSpanLabel}) is **partially available**. Data is loaded for ${availableSpanLabel} and the overlapping years are shown._`;
        }
      }
  }
    const countriesToShow =
      requestedCountries.length >= 1
        ? requestedCountries
        : /all\s*(data|countries?|metrics?)|every\s*country|show\s*all/i.test(userMessage)
          ? [...new Set(Object.values(dataByYear).flatMap((rows) => rows.map((r) => r.name)))].slice(0, 20)
          : [];
    const keyMetrics = [
      { key: 'gdpNominal' as const, label: 'GDP', format: (v: number | null) => formatVal(v, '') + ' USD' },
      { key: 'populationTotal' as const, label: 'Population', format: (v: number | null) => formatVal(v, '') + ' people' },
      { key: 'lifeExpectancy' as const, label: 'LifeExp', format: (v: number | null) => (v != null && !Number.isNaN(v) ? formatVal(v, '') + ' years' : 'N/A') },
      { key: 'inflationCPI' as const, label: 'Inflation', format: (v: number | null) => formatPercentage(v) },
      { key: 'govDebtPercentGDP' as const, label: 'Debt', format: (v: number | null) => formatPercentage(v) },
    ];
    const lines: string[] = [];
    if (subAnnualPattern.test(q)) {
      lines.push(
        'The dashboard provides **weekly, monthly, quarterly, and yearly** views in the Time Series chart, interpolated from annual data. Below is the **yearly** data from the source:',
        '',
      );
    }
    const lookup = (y: number) => (dataByYear as Record<string | number, GlobalCountryRowForFallback[]>)[y] ?? (dataByYear as Record<string | number, GlobalCountryRowForFallback[]>)[String(y)];
    const findRow = (rows: GlobalCountryRowForFallback[] | undefined, searchName: string) => {
      if (!rows) return undefined;
      const s = searchName.toLowerCase();
      return (
        rows.find((x) => (x.name ?? '').toLowerCase() === s) ??
        rows.find((x) => (x.name ?? '').toLowerCase().startsWith(s)) ??
        rows.find((x) => s.startsWith((x.name ?? '').toLowerCase()))
      );
    };
    for (const countryName of countriesToShow.length > 0 ? countriesToShow : allCountryNames.slice(0, 10)) {
      lines.push(`**${countryName}** – yearly data (${years[0] ?? '?'}–${years[years.length - 1] ?? '?'}):`);
      lines.push('');
      let hasAnyForCountry = false;
      for (const y of years.length > 0 ? years : allYears) {
        const rows = lookup(y);
        const r = findRow(rows, countryName);
        if (r) {
          hasAnyForCountry = true;
          const parts = keyMetrics.map((m) => `${m.label}: ${m.format(r[m.key] ?? null)}`);
          const hasAny = parts.some((s) => !s.endsWith(': N/A'));
          if (hasAny) {
            lines.push(`**${y}:** ${parts.join(' | ')}`);
          } else {
            lines.push(`**${y}:** (limited data – check Time Series chart)`);
          }
        }
      }
      if (!hasAnyForCountry) {
        lines.push(`_No data available for ${countryName} in the requested range. Data may be sparse for some countries/years in the source._`);
      }
      lines.push('');
    }
    if (coverageNote) {
      lines.push(coverageNote);
      lines.push('');
    }
    if (lines.length > 2) return lines.join('\n');
  }
  const requestedMetrics = parseAllRequestedMetrics(q);
  const wantsSpecificMetrics = requestedMetrics.length > 0 && requestedMetrics.length < ALL_METRIC_DEFS.length;

  if (
    requestedCountries.length === 1 &&
    effectiveData &&
    effectiveData.length > 0 &&
    singleMetricIntent &&
    requestedMetrics.length <= 1 &&
    !matchesQuery(q, ['overview', 'all information', 'all data', 'all metrics', 'full', 'complete', 'everything', 'summary'])
  ) {
    const countryName = requestedCountries[0];
    const r = effectiveData.find((x) => x.name.toLowerCase() === countryName.toLowerCase());
    if (r) {
      const val = r[singleMetricIntent.key];
      if (val != null && !Number.isNaN(val)) {
        return `**${r.name} – ${singleMetricIntent.label}** (${effectiveYear}): ${singleMetricIntent.format(val as number)}.`;
      }
    }
  }

  if (requestedCountries.length >= 1 && effectiveData && effectiveData.length > 0 && wantsSpecificMetrics && !isSelectedCountry) {
    const lines: string[] = [];
    for (const countryName of requestedCountries) {
      const r = effectiveData.find((x) => x.name.toLowerCase() === countryName.toLowerCase());
      if (r) {
        const parts = requestedMetrics.map((m) => `${m.label}: ${m.format(r)}`).filter((s) => !s.endsWith(': N/A'));
        if (parts.length > 0) {
          lines.push(`**${r.name}** (${effectiveYear})`);
          lines.push(parts.map((p) => `- ${p}`).join('\n'));
          lines.push('');
        }
      }
    }
    if (lines.length > 0) return lines.join('\n');
  }

  if (requestedCountries.length === 1 && effectiveData && effectiveData.length > 0 && !isSelectedCountry) {
    if (isLocationOrGeographyQuery(q)) {
      return `I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt, interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, and government type. Ask for a country by name, "Top N by [metric]", or "compare X and Y". For questions about **location or geography** (e.g. where a country is located, which continent), use the LLM or web search. For full conversational answers, add your API key in Settings.`;
    }
    const countryName = requestedCountries[0];
    const r = effectiveData.find((x) => x.name.toLowerCase() === countryName.toLowerCase());
    if (r) {
      const lines = [
        `**${r.name} – Full overview (${effectiveYear})**`,
        '',
        ...formatCountryOverview(r, effectiveYear),
      ];
      return lines.join('\n');
    }
  }

  if (isComparison && requestedCountries.length >= 2 && effectiveData && effectiveData.length > 0) {
    const rows = requestedCountries
      .map((name) => effectiveData!.find((x) => x.name.toLowerCase() === name.toLowerCase()))
      .filter((r): r is GlobalCountryRowForFallback => r != null);
    if (rows.length >= 2) {
      const metricsToShow = requestedMetrics.length > 0 ? requestedMetrics : ALL_METRIC_DEFS.filter((m) => m.key !== 'region');
      const lines = [
        `**${rows.map((r) => r.name).join(' vs ')} – Comparison (${effectiveYear})**`,
        '',
      ];
      for (const r of rows) {
        lines.push(`**${r.name}**`);
        lines.push(...metricsToShow.slice(0, 12).map((m) => `- ${m.label}: ${m.format(r)}`));
        lines.push('');
      }
      const gdpVals = rows.map((r) => r.gdpNominal ?? 0).filter((v) => v > 0);
      if (gdpVals.length >= 2) {
        const [a, b] = gdpVals;
        const higher = a >= b ? rows[0].name : rows[1].name;
        const ratio = a >= b ? (a / b).toFixed(1) : (b / a).toFixed(1);
        lines.push(`_GDP: ${higher} is ~${ratio}× larger._`);
      }
      return lines.join('\n');
    }
  }

  if (isMultiCountry && requestedCountries.length >= 2 && effectiveData && effectiveData.length > 0) {
    const lines: string[] = [];
    if (wantsSpecificMetrics) {
      lines.push(`**${requestedCountries.join(' & ')}** (${effectiveYear})`);
      lines.push('');
      for (const countryName of requestedCountries) {
        const r = effectiveData.find((x) => x.name.toLowerCase() === countryName.toLowerCase());
        if (r) {
          const parts = requestedMetrics.map((m) => `${m.label}: ${m.format(r)}`).filter((s) => !s.endsWith(': N/A'));
          lines.push(`**${r.name}**`);
          lines.push(...parts.map((p) => `- ${p}`));
          lines.push('');
        }
      }
    } else {
      lines.push(`**${requestedCountries.join(' & ')} – Full overview (${effectiveYear})**`,
        '',
      );
      for (const countryName of requestedCountries) {
        const r = effectiveData.find((x) => x.name.toLowerCase() === countryName.toLowerCase());
        if (r) lines.push(...formatCountryOverview(r, effectiveYear));
      }
    }
    if (requestedYear && requestedYear !== effectiveYear && dataByYear) {
      lines.push(`_Note: ${requestedYear} data not loaded. Data shown for ${effectiveYear}._`);
    }
    return lines.join('\n');
  }

  if (dashboardSnapshot && countryMatchesQuery(q, dashboardSnapshot.countryName)) {
    if (isLocationOrGeographyQuery(q)) {
      return `I can help with **all metrics in this dashboard**: GDP (nominal, PPP, per capita), inflation, government debt, interest rate, unemployment (rate and number), labour force, poverty ($2.15/day and national line), population (total and age groups 0–14, 15–64, 65+), life expectancy, maternal mortality, under-5 mortality, undernourishment, land/total area, EEZ, region, and government type. Ask for a country by name, "Top N by [metric]", or "compare X and Y". For questions about **location or geography** (e.g. where a country is located, which continent), use the LLM or web search. For full conversational answers, add your API key in Settings.`;
    }
    if (wantsSpecificMetrics && requestedMetrics.length > 0) {
      const r = effectiveData?.find((x) => x.name.toLowerCase() === dashboardSnapshot.countryName.toLowerCase());
      if (r) {
        const parts = requestedMetrics.map((m) => `${m.label}: ${m.format(r)}`).filter((s) => !s.endsWith(': N/A'));
        if (parts.length > 0) {
          return [
            `**${dashboardSnapshot.countryName}** (${dashboardSnapshot.year})`,
            '',
            ...parts.map((p) => `- ${p}`),
          ].join('\n');
        }
      }
    }
    let { countryName, year, metrics } = dashboardSnapshot;
    if (requestedYear && dataByYear?.[requestedYear]) {
      const row = dataByYear[requestedYear].find(
        (r) => r.name.toLowerCase() === countryName.toLowerCase(),
      );
      if (row) {
        year = requestedYear;
        const ageGroups = [
          row.pop0_14Pct != null ? { id: '0_14' as const, percentageOfPopulation: row.pop0_14Pct } : null,
          row.pop15_64Pct != null ? { id: '15_64' as const, percentageOfPopulation: row.pop15_64Pct } : null,
          row.pop65PlusPct != null ? { id: '65_plus' as const, percentageOfPopulation: row.pop65PlusPct } : null,
        ].filter(Boolean) as Array<{ id: string; percentageOfPopulation?: number | null }>;
        metrics = {
          financial: {
            gdpNominal: row.gdpNominal,
            gdpPPP: row.gdpPPP,
            gdpNominalPerCapita: row.gdpNominalPerCapita,
            gdpPPPPerCapita: row.gdpPPPPerCapita,
            inflationCPI: row.inflationCPI,
            govDebtPercentGDP: row.govDebtPercentGDP,
            govDebtUSD: row.govDebtUSD,
            interestRate: row.interestRate,
            unemploymentRate: row.unemploymentRate,
            unemployedTotal: row.unemployedTotal,
            labourForceTotal: row.labourForceTotal,
            povertyHeadcount215: row.povertyHeadcount215,
            povertyHeadcountNational: row.povertyHeadcountNational,
          },
          population: {
            total: row.populationTotal,
            ageBreakdown: ageGroups.length ? { groups: ageGroups } : undefined,
          },
          health: {
            lifeExpectancy: row.lifeExpectancy,
            maternalMortalityRatio: row.maternalMortalityRatio,
            under5MortalityRate: row.under5MortalityRate,
            undernourishmentPrevalence: row.undernourishmentPrevalence,
          },
          geography: {
            landAreaKm2: row.landAreaKm2,
            totalAreaKm2: row.totalAreaKm2,
            eezKm2: row.eezKm2,
          },
        };
      }
    }
    const f = metrics.financial;
    const p = metrics.population;
    const h = metrics.health;

    if (isComparison && globalData && globalData.length > 0) {
      const myGdp = f?.gdpNominal ?? 0;
      const myGdpPc = f?.gdpNominalPerCapita ?? 0;
      const sortedByGdp = [...globalData]
        .filter((r) => (r.gdpNominal ?? 0) > 0)
        .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0));
      const myRank = sortedByGdp.findIndex((r) =>
        r.name.toLowerCase() === countryName.toLowerCase(),
      ) + 1;
      const top5 = sortedByGdp.slice(0, 5);
      const worldGdp = sortedByGdp.reduce((s, r) => s + (r.gdpNominal ?? 0), 0);
      const worldPop = sortedByGdp.reduce((s, r) => s + (r.populationTotal ?? 0), 0);
      const worldGdpPc = worldPop > 0 ? worldGdp / worldPop : 0;
      const gdpShare = worldGdp > 0 ? ((myGdp / worldGdp) * 100).toFixed(1) : 'N/A';
      const lines = [
        `**${countryName} – Comparison (${year})**`,
        '',
        `- **GDP rank**: #${myRank || '?'} of ${sortedByGdp.length} countries`,
        `- **Share of world GDP**: ${gdpShare}%`,
        `- **GDP per capita**: ${formatVal(myGdpPc, '')} USD (world avg: ${formatVal(worldGdpPc, '')} USD)`,
        '',
        '**Top 5 by GDP (nominal)**',
        ...top5.map((r, i) => `  ${i + 1}. ${r.name}: ${formatVal(r.gdpNominal ?? null, '')} USD`),
        '',
        'For side-by-side comparison, use the Global tab (Table view).',
      ];
      return lines.join('\n');
    }

    if (isComparison) {
      return `**Comparison for ${countryName}**\n\nFor country comparison, use the **Global tab** (Map or Table view) to sort and filter. You can also select another country in the Country dashboard and ask for its metrics to compare.`;
    }

    if (matchesQuery(q, ['gdp', 'economy', 'gross domestic'])) {
      const lines = [
        `**${countryName} – GDP data (${year})**`,
        '',
        `- **GDP (Nominal)**: ${formatVal(f?.gdpNominal ?? null, '')} USD`,
        `- **GDP (PPP)**: ${formatVal(f?.gdpPPP ?? null, '')} Intl$`,
        `- **GDP per capita (Nominal)**: ${formatVal(f?.gdpNominalPerCapita ?? null, '')} USD`,
        `- **GDP per capita (PPP)**: ${formatVal(f?.gdpPPPPerCapita ?? null, '')} Intl$`,
      ];
      return lines.join('\n');
    }

    if (matchesQuery(q, ['population', 'people', 'pop', 'demographics', 'demographic', 'age structure', 'age breakdown'])) {
      const total = formatVal(p?.total ?? null, '');
      const groups = p?.ageBreakdown?.groups ?? [];
      const age0 = groups.find((x) => x.id === '0_14')?.percentageOfPopulation;
      const age1 = groups.find((x) => x.id === '15_64')?.percentageOfPopulation;
      const age2 = groups.find((x) => x.id === '65_plus')?.percentageOfPopulation;
      const lines = [
        `**${countryName} – Population (${year})**`,
        '',
        `- **Total**: ${total} people`,
        ...(age0 != null ? [`- **Age 0–14**: ${formatPercentage(age0)}`] : []),
        ...(age1 != null ? [`- **Age 15–64**: ${formatPercentage(age1)}`] : []),
        ...(age2 != null ? [`- **Age 65+**: ${formatPercentage(age2)}`] : []),
      ];
      return lines.join('\n');
    }

    if (matchesQuery(q, ['life expectancy'])) {
      const le = formatVal(h?.lifeExpectancy ?? null, '');
      return `**${countryName} – Life expectancy** (${year}): ${le} years.`;
    }

    if (matchesQuery(q, ['inflation', 'cpi'])) {
      return `**${countryName} – Inflation** (${year}): ${formatPercentage(f?.inflationCPI ?? null)}.`;
    }

    if (matchesQuery(q, ['debt', 'government debt'])) {
      const lines = [
        `**${countryName} – Government debt** (${year})`,
        '',
        `- **% of GDP**: ${formatPercentage(f?.govDebtPercentGDP ?? null)}`,
        `- **USD**: ${formatVal(f?.govDebtUSD ?? null, '')} USD`,
      ];
      return lines.join('\n');
    }

    if (matchesQuery(q, ['interest rate', 'lending rate'])) {
      return `**${countryName} – Lending interest rate** (${year}): ${formatPercentage(f?.interestRate ?? null)}.`;
    }

    if (matchesQuery(q, ['unemployment rate', 'jobless rate'])) {
      return `**${countryName} – Unemployment rate** (${year}): ${formatPercentage(f?.unemploymentRate ?? null)}.`;
    }

    if (matchesQuery(q, ['unemployed', 'number of unemployed', 'people unemployed'])) {
      return `**${countryName} – Unemployed (number)** (${year}): ${formatVal(f?.unemployedTotal ?? null, '')} people.`;
    }

    if (matchesQuery(q, ['labour force', 'labor force', 'workforce', 'total labour', 'total labor'])) {
      return `**${countryName} – Labour force (total)** (${year}): ${formatVal(f?.labourForceTotal ?? null, '')} people.`;
    }

    if (matchesQuery(q, ['maternal mortality', 'maternal death', 'mmr', 'mothers dying', 'pregnancy death'])) {
      return `**${countryName} – Maternal mortality** (${year}): ${formatVal(h?.maternalMortalityRatio ?? null, '')} per 100,000 live births.`;
    }

    if (matchesQuery(q, ['under-5 mortality', 'under 5 mortality', 'child mortality', 'under five', 'u5mr', 'infant mortality'])) {
      return `**${countryName} – Under-5 mortality** (${year}): ${formatVal(h?.under5MortalityRate ?? null, '')} per 1,000 live births.`;
    }

    if (matchesQuery(q, ['undernourishment', 'malnutrition', 'hunger', 'food insecurity'])) {
      return `**${countryName} – Undernourishment** (${year}): ${formatPercentage(h?.undernourishmentPrevalence ?? null)} of population.`;
    }

    if (matchesQuery(q, ['poverty', 'poor', 'poverty rate'])) {
      const lines = [
        `**${countryName} – Poverty** (${year})`,
        '',
        `- **Poverty ($2.15/day)**: ${formatPercentage(f?.povertyHeadcount215 ?? null)}`,
        `- **Poverty (national line)**: ${formatPercentage(f?.povertyHeadcountNational ?? null)}`,
      ];
      return lines.join('\n');
    }

    const g = metrics.geography;
    if (matchesQuery(q, ['land area', 'land area km', 'land size'])) {
      return `**${countryName} – Land area** (${year}): ${g?.landAreaKm2 != null ? formatVal(g.landAreaKm2, '') + ' km²' : 'N/A'}.`;
    }
    if (matchesQuery(q, ['total area', 'surface area', 'area km', 'country size'])) {
      return `**${countryName} – Total area** (${year}): ${g?.totalAreaKm2 != null ? formatVal(g.totalAreaKm2, '') + ' km²' : 'N/A'}.`;
    }
    if (matchesQuery(q, ['eez', 'exclusive economic zone', 'maritime'])) {
      return `**${countryName} – EEZ** (${year}): ${g?.eezKm2 != null ? formatVal(g.eezKm2, '') + ' km²' : 'N/A'}.`;
    }

    if (isSummary) {
      const sum = dashboardSnapshot.summary;
      const pop = formatVal(p?.total ?? null, '');
      const gdp = formatVal(f?.gdpNominal ?? null, '');
      const le = formatVal(h?.lifeExpectancy ?? null, '');
      const infl = formatPercentage(f?.inflationCPI ?? null);
      const debt = formatPercentage(f?.govDebtPercentGDP ?? null);
      const regionPhrase = sum?.region ? `country in ${sum.region}` : 'country';
      const incomePhrase = sum?.incomeLevel ? ` (${sum.incomeLevel})` : '';
      const lines = [
        `**${countryName} – Summary (${year})**`,
        '',
        `${countryName} is a ${regionPhrase}${incomePhrase}. In ${year}, its GDP (nominal) was ${gdp} USD and population ${pop} people. Life expectancy at birth was ${le} years. Inflation stood at ${infl} and government debt at ${debt} of GDP.`,
        '',
        'For full metrics, ask for "all information" or "overview". For comparison with other countries, ask for "comparison" or use the Global tab.',
      ];
      return lines.join('\n');
    }

    const groups = p?.ageBreakdown?.groups ?? [];
    const age0 = groups.find((x) => x.id === '0_14')?.percentageOfPopulation;
    const age1 = groups.find((x) => x.id === '15_64')?.percentageOfPopulation;
    const age2 = groups.find((x) => x.id === '65_plus')?.percentageOfPopulation;

    const isOverviewOrAll =
      matchesQuery(q, [
        'overview',
        'all information',
        'all metrics',
        'all data',
        'complete',
        'everything',
        'include all',
        'include more',
        'full',
        'comprehensive',
        'related to',
        'information related',
      ]);

    if (isOverviewOrAll) {
      const sum = dashboardSnapshot.summary;
      const lines = [
        `**${countryName} – Full overview (${year})**`,
        '',
        '**Country info**',
        `- Region: ${sum?.region ?? 'N/A'}`,
        `- Income level: ${sum?.incomeLevel ?? 'N/A'}`,
        `- Capital: ${sum?.capitalCity ?? 'N/A'}`,
        `- Currency: ${sum?.currencyName ?? sum?.currencyCode ?? 'N/A'}`,
        `- Government: ${sum?.government ?? 'N/A'}`,
        `- Government type: ${sum?.governmentType ?? 'N/A'}`,
        `- Head of government: ${sum?.headOfGovernmentType ?? 'N/A'}`,
        `- Timezone: ${sum?.timezone ?? 'N/A'}`,
        '',
        '**Financial**',
        `- GDP (Nominal): ${formatVal(f?.gdpNominal ?? null, '')} USD`,
        `- GDP (PPP): ${formatVal(f?.gdpPPP ?? null, '')} Intl$`,
        `- GDP per capita (Nominal): ${formatVal(f?.gdpNominalPerCapita ?? null, '')} USD`,
        `- GDP per capita (PPP): ${formatVal(f?.gdpPPPPerCapita ?? null, '')} Intl$`,
        `- Inflation: ${formatPercentage(f?.inflationCPI ?? null)}`,
        `- Lending interest rate: ${formatPercentage(f?.interestRate ?? null)}`,
        `- Government debt: ${formatPercentage(f?.govDebtPercentGDP ?? null)} of GDP`,
        `- Government debt: ${formatVal(f?.govDebtUSD ?? null, '')} USD`,
        `- Poverty ($2.15/day): ${formatPercentage(f?.povertyHeadcount215 ?? null)}`,
        `- Poverty (national line): ${formatPercentage(f?.povertyHeadcountNational ?? null)}`,
        '',
        '**Population & health**',
        `- Population: ${formatVal(p?.total ?? null, '')} people`,
        ...(age0 != null ? [`- Age 0–14: ${formatPercentage(age0)} of population`] : []),
        ...(age1 != null ? [`- Age 15–64: ${formatPercentage(age1)} of population`] : []),
        ...(age2 != null ? [`- Age 65+: ${formatPercentage(age2)} of population`] : []),
        `- Life expectancy: ${formatVal(h?.lifeExpectancy ?? null, '')} years`,
        '',
        '**Geography**',
        `- Land area: ${g?.landAreaKm2 != null ? formatVal(g.landAreaKm2, '') + ' km²' : 'N/A'}`,
        `- Total area: ${g?.totalAreaKm2 != null ? formatVal(g.totalAreaKm2, '') + ' km²' : 'N/A'}`,
        `- EEZ: ${g?.eezKm2 != null ? formatVal(g.eezKm2, '') + ' km²' : 'N/A'}`,
      ];
      return lines.join('\n');
    }

    const lines = [
      `**${countryName} – Key metrics (${year})**`,
      '',
      `- GDP (Nominal): ${formatVal(f?.gdpNominal ?? null, '')} USD`,
      `- GDP (PPP): ${formatVal(f?.gdpPPP ?? null, '')} Intl$`,
      `- Population: ${formatVal(p?.total ?? null, '')} people`,
      `- Life expectancy: ${formatVal(h?.lifeExpectancy ?? null, '')} years`,
      `- Inflation: ${formatPercentage(f?.inflationCPI ?? null)}`,
      `- Government debt: ${formatPercentage(f?.govDebtPercentGDP ?? null)} of GDP`,
      ...(f?.povertyHeadcount215 != null ? [`- Poverty ($2.15/day): ${formatPercentage(f.povertyHeadcount215)}`] : []),
      ...(f?.povertyHeadcountNational != null ? [`- Poverty (national line): ${formatPercentage(f.povertyHeadcountNational)}`] : []),
    ];
    return lines.join('\n');
  }

  const rankingReq = parseRankingRequest(q);
  const isGrowthRequest = matchesQuery(q, ['growth', 'growing', 'fastest', 'slowest']) && Object.keys(dataByYear ?? {}).length >= 2;
  if (isGrowthRequest && effectiveData && effectiveData.length > 0 && dataByYear) {
    const years = Object.keys(dataByYear).map(Number).sort((a, b) => b - a);
    const currYear = years[0];
    const prevYear = years[1];
    const currRows = dataByYear[currYear] ?? [];
    const prevRows = dataByYear[prevYear] ?? [];
    const prevByCountry = new Map(prevRows.map((r) => [r.name.toLowerCase(), r]));
    const growthMetric: 'gdpNominal' | 'populationTotal' = /gdp|economy|market/i.test(q) ? 'gdpNominal' : /population|pop/i.test(q) ? 'populationTotal' : 'gdpNominal';
    type RowWithGrowth = GlobalCountryRowForFallback & { _growthPct: number };
    const withGrowth: RowWithGrowth[] = currRows
      .map((r) => {
        const prev = prevByCountry.get(r.name.toLowerCase());
        const currVal = r[growthMetric as keyof GlobalCountryRowForFallback] as number | null | undefined;
        const prevVal = prev ? (prev[growthMetric as keyof GlobalCountryRowForFallback] as number | null | undefined) : null;
        if (currVal == null || prevVal == null || prevVal === 0 || !Number.isFinite(currVal) || !Number.isFinite(prevVal)) return null;
        const pct = ((currVal - prevVal) / prevVal) * 100;
        return { ...r, _growthPct: pct };
      })
      .filter((x): x is RowWithGrowth => x != null && '_growthPct' in x);
    const region = parseRegion(q);
    let filtered: RowWithGrowth[] = withGrowth;
    if (region) filtered = filterByRegion(withGrowth, region);
    const sorted = [...filtered].sort((a, b) => (b._growthPct ?? 0) - (a._growthPct ?? 0));
    const n = 15;
    const slice = sorted.slice(0, n);
    const lines = [
      `**Top ${n} fastest-growing countries by ${growthMetric === 'gdpNominal' ? 'GDP' : 'Population'}** (${prevYear}→${currYear})`,
      '',
      ...slice.map((r, i) => `${i + 1}. **${r.name}**: ${(r as { _growthPct?: number })._growthPct?.toFixed(1) ?? '?'}% growth`),
      '',
      `Data: ${currYear} vs ${prevYear}. Use the **Global tab** for more.`,
    ];
    return lines.join('\n');
  }

  if (rankingReq && effectiveData && effectiveData.length > 0) {
    const { n, direction, metric, region } = rankingReq;
    let rankingData = effectiveData;
    if (region) rankingData = filterByRegion(rankingData, region);
    const metricLabels: Record<RankingMetric, string> = {
      gdpNominal: 'GDP (nominal)',
      gdpPPP: 'GDP (PPP)',
      gdpNominalPerCapita: 'GDP per capita (nominal)',
      gdpPPPPerCapita: 'GDP per capita (PPP)',
      populationTotal: 'Population',
      lifeExpectancy: 'Life expectancy',
      inflationCPI: 'Inflation',
      govDebtPercentGDP: 'Government debt (% GDP)',
      interestRate: 'Lending interest rate',
      unemploymentRate: 'Unemployment rate (%)',
      unemployedTotal: 'Unemployed (number)',
      labourForceTotal: 'Labour force (total)',
      povertyHeadcount215: 'Poverty ($2.15/day, %)',
      povertyHeadcountNational: 'Poverty (national line, %)',
      maternalMortalityRatio: 'Maternal mortality (per 100k)',
      under5MortalityRate: 'Under-5 mortality (per 1k)',
      undernourishmentPrevalence: 'Undernourishment (%)',
      population0_14: 'Population 0–14 (count)',
      population15_64: 'Population 15–64 (count)',
      population65Plus: 'Population 65+ (count)',
      landAreaKm2: 'Land area',
      totalAreaKm2: 'Total area',
      eezKm2: 'EEZ',
    };
    const getVal = (r: GlobalCountryRowForFallback) => {
      const v = r[metric];
      return v != null && !Number.isNaN(v) ? (v as number) : null;
    };
    const filtered = rankingData.filter((r) => getVal(r) !== null);
    const sorted =
      direction === 'top'
        ? [...filtered].sort((a, b) => (getVal(b) ?? 0) - (getVal(a) ?? 0))
        : [...filtered].sort((a, b) => (getVal(a) ?? 0) - (getVal(b) ?? 0));
    const slice = sorted.slice(0, n);
    const formatMetricVal = (r: GlobalCountryRowForFallback) => {
      const v = r[metric];
      if (metric === 'inflationCPI' || metric === 'govDebtPercentGDP' || metric === 'interestRate' || metric === 'unemploymentRate' || metric === 'povertyHeadcount215' || metric === 'povertyHeadcountNational' || metric === 'undernourishmentPrevalence') return formatPercentage(v ?? null);
      if (metric === 'lifeExpectancy') return formatVal(v ?? null, '') + ' years';
      if (metric === 'populationTotal' || metric === 'unemployedTotal' || metric === 'labourForceTotal' || metric === 'population0_14' || metric === 'population15_64' || metric === 'population65Plus') return formatVal(v ?? null, '');
      if (metric === 'maternalMortalityRatio') return (v != null ? formatVal(v, '') + ' per 100k' : 'N/A');
      if (metric === 'under5MortalityRate') return (v != null ? formatVal(v, '') + ' per 1k' : 'N/A');
      if (metric === 'landAreaKm2' || metric === 'totalAreaKm2' || metric === 'eezKm2') return formatVal(v ?? null, '') + ' km²';
      if (metric === 'gdpNominal' || metric === 'gdpPPP' || metric === 'gdpNominalPerCapita' || metric === 'gdpPPPPerCapita') return formatVal(v ?? null, '') + (metric === 'gdpPPP' || metric === 'gdpPPPPerCapita' ? ' Intl$' : ' USD');
      return formatVal(v ?? null, '');
    };
    const dirLabel = direction === 'top' ? 'Top' : 'Lowest';
    const regionLabel = region ? ` in ${region.charAt(0).toUpperCase() + region.slice(1)}` : '';
    const wantsAllInfo = matchesQuery(q, ['all information', 'list of all', 'full information', 'complete information', 'all data', 'all metrics', 'full overview']);
    const extraMetrics = parseAllRequestedMetrics(q);
    const lines = [
      `**${dirLabel} ${n} countries${regionLabel} by ${metricLabels[metric]}** (${effectiveYear})`,
      '',
      ...slice.map((r, i) => {
        const base = `${i + 1}. **${r.name}**: ${formatMetricVal(r)}`;
        const extras = extraMetrics
          .filter((em) => em.key !== metric)
          .map((em) => em.format(r))
          .filter((v) => v && v !== 'N/A');
        if (extras.length > 0) return `${base} — ${extras.join(' · ')}`;
        return base;
      }),
      '',
    ];
    if (wantsAllInfo && slice.length > 0) {
      const year = effectiveYear ?? new Date().getFullYear() - 2;
      lines.push('---');
      lines.push('');
      for (const r of slice) {
        lines.push(...formatCountryOverview(r, year));
      }
    }
    lines.push(`Total: ${sorted.length} countries with data. Use the **Global tab** for more.`);
    if (sorted.length < 30) {
      lines.push('');
      lines.push('_Tip: For the full global ranking, open the **Global** tab → Table view → sort by the desired metric._');
    }
    return lines.join('\n');
  }

  const regionForList = parseRegion(q);
  if (regionForList && effectiveData && effectiveData.length > 0 && matchesQuery(q, ['countries in', 'which countries', 'list countries', 'countries of', 'nations in', 'list of'])) {
    const filtered = filterByRegion(effectiveData, regionForList);
    const top20 = [...filtered]
      .filter((r) => (r.gdpNominal ?? 0) > 0)
      .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0))
      .slice(0, 20);
    const regionLabel = regionForList.charAt(0).toUpperCase() + regionForList.slice(1);
    const lines = [
      `**Countries in ${regionLabel}** (${effectiveYear})`,
      '',
      ...top20.map((r, i) => `${i + 1}. **${r.name}**: GDP ${formatVal(r.gdpNominal ?? null, '')} USD · Pop ${formatVal(r.populationTotal ?? null, '')}`),
      '',
      `Total: ${filtered.length} countries. Use the **Global tab** for the full table.`,
    ];
    return lines.join('\n');
  }

  if (isAllCountries && globalData && globalData.length > 0) {
    const sorted = [...globalData]
      .filter((r) => (r.gdpNominal ?? 0) > 0)
      .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0));
    const top15 = sorted.slice(0, 15);
    const lines = [
      `**Top 15 countries by GDP (nominal)**`,
      '',
      ...top15.map((r, i) =>
        `${i + 1}. **${r.name}**: ${formatVal(r.gdpNominal ?? null, '')} USD · Pop: ${formatVal(r.populationTotal ?? null, '')}`,
      ),
      '',
      `Total: ${sorted.length} countries with data. Use the **Global tab** for the full table and sorting.`,
    ];
    return lines.join('\n');
  }

  if (isAllCountries) {
    return `**All countries**\n\nTo view all countries' data, use the **Global tab** (Map or Table view). The assistant can provide detailed metrics for the currently selected country—select one in the Country dashboard first.`;
  }

  if (rankingReq && !effectiveData?.length) {
    return `**Ranking data**\n\nGlobal data may still be loading. Please wait a few seconds and **try your question again**—the assistant will then return the actual top or lowest countries by the metric you asked for.\n\nYou can also open the **Global** tab → **Table** view and sort by the metric (e.g. GDP, Population, Life expectancy) to see the full list immediately.`;
  }

  if (matchesQuery(q, ['world average', 'global average', 'worldwide average']) && effectiveData && effectiveData.length > 0) {
    const rows = effectiveData.filter((r) => (r.gdpNominal ?? 0) > 0 && (r.populationTotal ?? 0) > 0);
    const totalGdp = rows.reduce((s, r) => s + (r.gdpNominal ?? 0), 0);
    const totalPop = rows.reduce((s, r) => s + (r.populationTotal ?? 0), 0);
    const worldGdpPc = totalPop > 0 ? totalGdp / totalPop : 0;
    const avgLifeExp = rows.filter((r) => (r.lifeExpectancy ?? 0) > 0).reduce((s, r) => s + (r.lifeExpectancy ?? 0), 0) / Math.max(1, rows.filter((r) => (r.lifeExpectancy ?? 0) > 0).length);
    const lines = [
      `**World averages** (${effectiveYear}, ${rows.length} countries)`,
      '',
      `- **GDP per capita**: ${formatVal(worldGdpPc, '')} USD`,
      `- **Total GDP**: ${formatVal(totalGdp, '')} USD`,
      `- **Total population**: ${formatVal(totalPop, '')} people`,
      `- **Life expectancy (avg)**: ${formatVal(avgLifeExp, '')} years`,
    ];
    return lines.join('\n');
  }

  if (effectiveData && effectiveData.length > 0 && requestedCountries.length >= 1) {
    const looksLikeDataQuestion = /what|how|which|tell|show|give|list|get|find|compare|about|data|all/i.test(q);
    if (looksLikeDataQuestion && !rankingReq) {
      const metricsToShow = requestedMetrics.length > 0 ? requestedMetrics : ALL_METRIC_DEFS.slice(0, 12);
      const compactLines: string[] = [];
      for (const countryName of requestedCountries.slice(0, 10)) {
        const r = effectiveData.find((x) => (x.name ?? '').toLowerCase() === countryName.toLowerCase());
        if (r) {
          compactLines.push(`**${r.name}** (${effectiveYear})`);
          compactLines.push(...metricsToShow.map((m) => `- ${m.label}: ${m.format(r)}`));
          compactLines.push('');
        }
      }
      if (compactLines.length > 0) return compactLines.join('\n');
    }
  }

  if (effectiveData && effectiveData.length > 0 && /all\s*(data|countries?|metrics?)|show\s*all|every\s*country/i.test(q)) {
    const topRows = effectiveData.slice(0, 15);
    const metricsToShow = ALL_METRIC_DEFS.filter((m) => m.key !== 'region').slice(0, 8);
    const lines = [`**Available data** (${effectiveYear}, ${effectiveData.length} countries)`, ''];
    for (const r of topRows) {
      const parts = metricsToShow.map((m) => `${m.label}: ${m.format(r)}`).filter((s) => !s.endsWith(': N/A'));
      if (parts.length > 0) lines.push(`**${r.name}:** ${parts.join(' | ')}`);
    }
    if (lines.length > 2) return lines.join('\n');
  }

  const isMetricsListRequest = matchesQuery(q, ['metric', 'available', 'what data', 'what can']) ||
    (matchesQuery(q, ['show me']) && !rankingReq && !/(?:top|low)\s*\d+|in terms of|countries by|ranked|ranking/i.test(q));
  if (isMetricsListRequest) {
    const byCategory = METRIC_METADATA.reduce(
      (acc, m) => {
        const cat = m.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m.label);
        return acc;
      },
      {} as Record<string, string[]>,
    );
    const lines = [
      '**Metrics available in this dashboard:**',
      '',
      '**Financial:** ' + (byCategory.financial ?? []).join(', '),
      '**Population:** ' + (byCategory.population ?? []).join(', '),
      '**Health:** ' + (byCategory.health ?? []).join(', '),
      '**Geography:** ' + (byCategory.geography ?? []).join(', '),
      '',
      'Use the Country or Global tabs to explore the data. For detailed definitions, see the Source tab.',
    ];
    return lines.join('\n');
  }

  if (matchesQuery(q, ['gdp', 'ppp', 'nominal']) && !rankingReq)
    return `**GDP metrics:**\n\n- **GDP (Nominal, US$)**: Total value of goods and services produced, converted to current U.S. dollars using official exchange rates. Formula: GDP = C + I + G + (X − M).\n\n- **GDP (PPP, Intl$)**: Same as GDP but converted using purchasing power parity rates, which allows better comparison of living standards across countries.\n\n- **GDP per capita** is GDP divided by population. For exact values, ask "top 10 countries by GDP" or use the Global tab.`;

  if (matchesQuery(q, ['government debt', 'gov debt', 'debt']))
    return `**Government debt:**\n\n- **% of GDP**: Measures total government gross debt relative to the size of the economy. Formula: (Total government debt / GDP) × 100.\n\n- **USD**: Total debt in current U.S. dollars, derived from GDP and the debt %.\n\nSources: World Bank WDI, IMF World Economic Outlook.`;

  if (matchesQuery(q, ['population', 'age', '0-14', '15-64', '65', 'demographics', 'age structure', 'working age', 'youth', 'elderly']))
    return `**Population metrics:**\n\n- **Total population**: Total residents (de facto definition).\n\n- **Age breakdown**: 0–14 (youth), 15–64 (working-age), 65+ (65 and above). Each is shown as % of total and absolute counts. These help assess dependency ratios (youth and old-age).\n\nSource: World Bank WDI.`;

  if (matchesQuery(q, ['life expectancy']))
    return `**Life expectancy at birth**: Number of years a newborn would live if current mortality patterns stayed the same. Calculated from period life expectancy in mortality tables. Unit: years. Source: World Bank WDI.`;

  if (matchesQuery(q, ['maternal mortality', 'maternal death', 'mmr']))
    return `**Maternal mortality ratio**: Number of women who die from pregnancy-related causes while pregnant or within 42 days of pregnancy termination, per 100,000 live births. Aligned with SDG 3.1. Estimated jointly by WHO, UNICEF, UNFPA, World Bank and UN DESA. Unit: per 100,000 live births. Source: World Bank WDI.`;

  if (matchesQuery(q, ['under-5 mortality', 'under 5 mortality', 'child mortality', 'u5mr']))
    return `**Under-5 mortality rate**: Probability per 1,000 that a newborn will die before reaching age five, if subject to current age-specific mortality rates. SDG indicator. Estimated by UN Inter-agency Group (UNICEF, WHO, World Bank, UN DESA). Unit: per 1,000 live births. Source: World Bank WDI.`;

  if (matchesQuery(q, ['undernourishment', 'malnutrition', 'hunger']))
    return `**Prevalence of undernourishment**: Share of the population whose habitual food consumption is insufficient to provide the dietary energy required for a normal active and healthy life. SDG indicator 2.1.1. Unit: % of population. Source: FAO via World Bank WDI.`;

  if (matchesQuery(q, ['inflation', 'cpi']))
    return `**Inflation (CPI, %)**: Annual percentage change in the consumer price index. Measures how prices of a basket of consumer goods and services change over time. Formula: ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100. Source: World Bank WDI.`;

  if (matchesQuery(q, ['source', 'data', 'where', 'come from', 'who provides']))
    return `**Data sources:**\n\n- **World Bank WDI**: GDP, population, inflation, debt, health, geography\n- **IMF World Economic Outlook**: GDP and government debt data\n- **Sea Around Us / Marine Regions**: Exclusive Economic Zone (EEZ)\n\nData coverage: typically 2000 to latest available (with ~2 year lag). See the Source tab for detailed links.`;

  if (matchesQuery(q, ['eez', 'exclusive economic zone', 'maritime']))
    return `**Exclusive Economic Zone (EEZ)**: Marine area extending 200 nautical miles from the coast over which a country has special rights regarding exploration and use of marine resources. Defined by UN Convention on the Law of the Sea. Sources: Sea Around Us, Marine Regions.`;

  const defaultHelp = `I can help with questions about **all metrics** in this dashboard. Examples:

**Rankings (any metric)**
- "Top 10 countries by GDP" · "Lowest 5 by unemployment rate"
- "Top 20 by maternal mortality" · "Top 10 by labour force" · "Top 5 by undernourishment"

**Single or multiple countries**
- "GDP and inflation of Indonesia" · "Population and life expectancy for Brazil and Mexico"
- "Maternal mortality in Nigeria" · "Undernourishment for India and Bangladesh"
- "Overview of [country]" · "All information about [country]"

**Regions & methodology**
- "Top 5 Asian countries by population" · "Countries in Europe"
- "What is GDP?" · "How is inflation calculated?" · "Data sources"

**Full list:** Ask "What metrics are available?" or open the **Source** tab.

**Unlimited combinations** – You can ask for any mix of: GDP, PPP, per capita, population, life expectancy, inflation, debt, interest rate, unemployment, labour force, poverty, maternal mortality, under-5 mortality, undernourishment, land area, EEZ, age groups, government type, region. For full conversational answers, add your API key in Settings.`;

  if (matchesQuery(q, ['help', 'hello', 'hi', 'how to', 'how do i', 'get started', 'what can you'])) {
    return defaultHelp;
  }

  return defaultHelp;
}
