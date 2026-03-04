/**
 * Builds the system prompt for the analytics chatbot based on app data sources and metrics.
 */
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { METRIC_METADATA } from '../data/metricMetadata';
import { formatCompactNumber, formatPercentage } from './numberFormat';
import type { CountryDashboardData } from '../types';

function formatValue(
  value: number | null | undefined,
  unit: string,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  if (unit === '%' || unit.includes('%')) return formatPercentage(value);
  const num = formatCompactNumber(value);
  if (unit === 'People') return `${num} people`;
  if (unit === 'Years') return `${num} years`;
  return `${num} ${unit}`;
}

export interface GlobalRowForPrompt {
  name: string;
  iso2Code?: string;
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

/** When true, produces a much shorter prompt for free-tier APIs (e.g. Groq) with strict TPM limits. */
export interface BuildChatSystemPromptOptions {
  compact?: boolean;
  /** Current user query – used to include requested countries and year in context. */
  userQuery?: string;
  /** Year of globalData when globalDataByYear is empty (from dashboard). */
  effectiveYear?: number;
}

function parseRequestedYear(q: string): number | null {
  const m = q.match(/\b(20[0-2][0-9])\b/);
  return m ? parseInt(m[1], 10) : null;
}

function parseRequestedCountries(q: string, availableNames: string[]): string[] {
  const found: string[] = [];
  const qLower = q.toLowerCase();
  for (const name of availableNames) {
    if (name.length < 4) continue;
    if (qLower.includes(name.toLowerCase())) found.push(name);
  }
  return found;
}

export function buildChatSystemPrompt(
  dashboardData?: CountryDashboardData | null,
  globalData?: GlobalRowForPrompt[] | null,
  globalDataByYear?: Record<number, GlobalRowForPrompt[]> | null,
  options?: BuildChatSystemPromptOptions,
): string {
  const compact = options?.compact ?? false;
  const userQuery = options?.userQuery ?? '';
  const requestedYear = parseRequestedYear(userQuery);
  const allCountryNames = [
    ...(globalData ?? []),
    ...Object.values(globalDataByYear ?? {}).flat(),
  ]
    .map((r) => r.name)
    .filter((n, i, arr) => arr.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
  const requestedCountries = parseRequestedCountries(userQuery, allCountryNames);
  const metricsContext = compact
    ? METRIC_METADATA.map((m) => `- ${m.label} (${m.id}): ${m.unit}`).join('\n')
    : METRIC_METADATA.map((m) => {
        const sources = m.sources.map((s) => s.name).join(', ');
        return `- **${m.label}** (${m.id}): ${m.description} Unit: ${m.unit}. Sources: ${sources}.${m.formula ? ` Formula: ${m.formula}` : ''}`;
      }).join('\n');

  const dataSourceSummary = compact
    ? `Sources: World Bank WDI, IMF WEO, Sea Around Us. Data: ${DATA_MIN_YEAR}–${DATA_MAX_YEAR} (current year minus 2).`
    : `
## Data sources in this application
- **World Bank WDI**: World Development Indicators (GDP, population, inflation, debt, health, geography)
- **IMF World Economic Outlook**: GDP and government debt data
- **UN / WHO**: Population and health statistics
- **Sea Around Us / Marine Regions**: Exclusive Economic Zone (EEZ) data
- Data coverage: ${DATA_MIN_YEAR} to ${DATA_MAX_YEAR} (current year minus 2).
`;

  let countryContext = '';
  if (dashboardData) {
    const s = dashboardData.summary;
    const snap = dashboardData.latestSnapshot;
    countryContext = compact
      ? `\n## Selected: ${s.name} (${s.region ?? 'N/A'})\n`
      : `
## Currently selected country – USE THIS DATA when answering questions about ${s.name}
- Country: ${s.name} (${s.iso2Code})
- Region: ${s.region ?? 'N/A'}
- Income level: ${s.incomeLevel ?? 'N/A'}
- Capital: ${s.capitalCity ?? 'N/A'}
- Currency: ${s.currencyName ?? s.currencyCode ?? 'N/A'}
- Government: ${s.government ?? s.governmentType ?? 'N/A'}
- Government type: ${s.governmentType ?? 'N/A'}
- Head of government: ${s.headOfGovernmentType ?? 'N/A'}
- Timezone: ${s.timezone ?? 'N/A'}
- Data range: ${dashboardData.range.startYear}–${dashboardData.range.endYear}
`;
    if (snap?.metrics) {
      const f = snap.metrics.financial;
      const p = snap.metrics.population;
      const h = snap.metrics.health;
      const g = snap.metrics.geography;
      const year = snap.year;
      countryContext += compact
        ? `GDP ${formatValue(f?.gdpNominal ?? null, 'USD')}, Pop ${formatValue(p?.total ?? null, 'People')}, LifeExp ${formatValue(h?.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(f?.inflationCPI ?? null, '%')}, Debt ${formatValue(f?.govDebtPercentGDP ?? null, '%')}\n`
        : `
### Latest values for ${s.name} (year ${year}) – cite ALL when asked for "all information"
- GDP (Nominal): ${formatValue(f?.gdpNominal ?? null, 'USD')}
- GDP (PPP): ${formatValue(f?.gdpPPP ?? null, 'Intl$')}
- GDP per capita (Nominal): ${formatValue(f?.gdpNominalPerCapita ?? null, 'USD')}
- GDP per capita (PPP): ${formatValue(f?.gdpPPPPerCapita ?? null, 'Intl$')}
- Inflation (CPI): ${formatValue(f?.inflationCPI ?? null, '%')}
- Lending interest rate: ${formatValue(f?.interestRate ?? null, '%')}
- Government debt (% GDP): ${formatValue(f?.govDebtPercentGDP ?? null, '%')}
- Government debt (USD): ${formatValue(f?.govDebtUSD ?? null, 'USD')}
- Population: ${formatValue(p?.total ?? null, 'People')}
- Life expectancy: ${formatValue(h?.lifeExpectancy ?? null, 'Years')}
`;
      if (!compact) {
        if (p?.ageBreakdown?.groups?.length) {
          countryContext += `- Age 0–14: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '0_14')?.percentageOfPopulation ?? null)} of population
- Age 15–64: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '15_64')?.percentageOfPopulation ?? null)} of population
- Age 65+: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '65_plus')?.percentageOfPopulation ?? null)} of population
`;
        }
        if (g) {
          countryContext += `- Land area: ${formatValue(g.landAreaKm2 ?? null, 'km²')}
- Total area: ${formatValue(g.totalAreaKm2 ?? null, 'km²')}
- EEZ: ${formatValue(g.eezKm2 ?? null, 'km²')}
`;
        }
      }
    }
  }

  const LIMIT = compact ? 15 : 50;
  const LIMIT_GDPPC = compact ? 10 : 20;
  const YEARS_LIMIT = compact ? 1 : 999;

  let globalContext = '';
  if (globalDataByYear && Object.keys(globalDataByYear).length > 0) {
    const allYears = Object.keys(globalDataByYear)
      .map(Number)
      .sort((a, b) => b - a);
    const years =
      requestedYear && allYears.includes(requestedYear)
        ? [requestedYear, ...allYears.filter((y) => y !== requestedYear)].slice(0, YEARS_LIMIT)
        : allYears.slice(0, YEARS_LIMIT);
    globalContext = compact
      ? `\n## Global data – Year ${years[0]} (use for rankings, multi-country)\n`
      : '\n## Global data by year – use for rankings, multi-country, and any combination of metrics\n';
    for (const y of years) {
      const rows = globalDataByYear[y];
      if (!rows?.length) continue;
      const topByGdpBase = [...rows]
        .filter((r) => (r.gdpNominal ?? 0) > 0)
        .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0));
      const requestedRows = requestedCountries
        .map((name) => rows.find((r) => r.name.toLowerCase() === name.toLowerCase()))
        .filter((r): r is GlobalRowForPrompt => r != null && !topByGdpBase.slice(0, LIMIT).some((t) => t.name.toLowerCase() === r.name.toLowerCase()));
      const topByGdp = [...topByGdpBase.slice(0, LIMIT)];
      for (const r of requestedRows) {
        if (!topByGdp.some((t) => t.name.toLowerCase() === r.name.toLowerCase())) {
          topByGdp.push(r);
        }
      }
      const topByGdpPc = [...rows]
        .filter((r) => (r.gdpNominalPerCapita ?? 0) > 0)
        .sort((a, b) => (b.gdpNominalPerCapita ?? 0) - (a.gdpNominalPerCapita ?? 0))
        .slice(0, LIMIT_GDPPC);
      if (!compact) {
        globalContext += `\n### Year ${y} (top ${LIMIT} by GDP nominal – use for rankings and combinations)\n`;
      }
      globalContext += compact
        ? topByGdp.map((r) => `${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, LifeExp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}`).join('\n')
        : topByGdp
            .map(
              (r) =>
                `${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, PPP ${formatValue(r.gdpPPP ?? null, '')}, GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, PPPpc ${formatValue(r.gdpPPPPerCapita ?? null, '')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, DebtUSD ${formatValue(r.govDebtUSD ?? null, 'USD')}, IntRate ${formatValue(r.interestRate ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, Area ${formatValue(r.totalAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, Age0-14 ${formatValue(r.pop0_14Pct ?? null, '%')}, Age15-64 ${formatValue(r.pop15_64Pct ?? null, '%')}, Age65+ ${formatValue(r.pop65PlusPct ?? null, '%')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`,
            )
            .join('\n');
      if (!compact && topByGdpPc.length > 0) {
        globalContext += `\n\n### Year ${y} (top ${LIMIT_GDPPC} by GDP per capita – use for "top N by GDP per capita")\n`;
        globalContext += topByGdpPc
          .map(
            (r) =>
              `${r.name}: GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`,
          )
          .join('\n');
      }
      globalContext += '\n';
    }
  } else if (globalData && globalData.length > 0) {
    const topNBase = [...globalData]
      .filter((r) => (r.gdpNominal ?? 0) > 0)
      .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0));
    const topN = [...topNBase.slice(0, LIMIT)];
    for (const name of requestedCountries) {
      const r = globalData.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (r && !topN.some((t) => t.name.toLowerCase() === r.name.toLowerCase())) {
        topN.push(r);
      }
    }
    globalContext = compact
      ? '\n## Global (top 15 by GDP)\n' + topN.map((r) => `${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, LifeExp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}`).join('\n') + '\n'
      : `
## Global data (top ${LIMIT} by GDP) – use for comparison and "all countries" questions
${topN.map((r, i) => `${i + 1}. ${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, PPP ${formatValue(r.gdpPPP ?? null, '')}, GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, PPPpc ${formatValue(r.gdpPPPPerCapita ?? null, '')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, IntRate ${formatValue(r.interestRate ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`).join('\n')}
`;
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const cutoffRule = `Today is ${today}. For general-knowledge questions (e.g. leaders, presidents, independence day, current events), provide the most current information you know. Consider recent elections, leadership changes, or events that may have occurred since your training. Do NOT say "my knowledge cutoff". Do NOT mention "Dashboard data". Instead, add a Wikipedia link for verification, e.g. "For more: [Indonesia – Wikipedia](https://en.wikipedia.org/wiki/Indonesia)". Keep responses confident and concise.`;
  const intro = compact
    ? `You are an analytics assistant for the Country Analytics Platform. Answer from the data below when available. For general questions (leaders, presidents, current events), answer directly – do not refuse. Use exact values. Be concise. ${cutoffRule}`
    : `You are a helpful analytics assistant for the Country Analytics Platform. You help users understand the data, metrics, and sources available in this dashboard.

## Core principle: UNLIMITED COMBINATIONS
- **NEVER omit requested data.** When the user asks for a COMBINATION of metrics (e.g. "GDP, inflation, and government type for top 5 countries"), include EVERY requested metric in your response. Combine freely: rankings + government info, multiple countries + specific metrics, region + any metric.
- **Extract ALL implied requests.** "List of X and Y based on top N by Z" means: (1) rank by Z, (2) for each country show X and Y. Include all of: X, Y, Z.
- **Use exact values from context.** Never invent numbers. If data is in the context (Global data, Latest values), cite it. Use N/A only when truly missing.

## Your role
- Answer questions about the metrics, their definitions, formulas, and data sources
- **Single country + any metric(s)**: Use values from context. For "all information" include: Country info (region, capital, currency, government, GovType, HeadGov), Financial (GDP nominal/PPP, per capita, inflation, interest rate, debt % and USD), Population (total, age 0–14/15–64/65+%), Health (life expectancy), Geography (land, total area, EEZ).
- **Rankings + extra metrics**: "Top N by X" with "and Y, Z" → return ranked list with X, Y, Z for each country. GovType, HeadGov, inflation, debt, etc. are all in the data.
- **Compare X to Y / X vs Y**: Return a SIDE-BY-SIDE comparison of those specific countries. "Compare Indonesia to Malaysia" → show Indonesia's AND Malaysia's metrics (GDP, population, life expectancy, inflation, debt, etc.). NEVER return a generic "X compared to world" when the user asked to compare two specific countries.
- **Year-specific**: Data is available for ${DATA_MIN_YEAR}–${DATA_MAX_YEAR}. When the user asks for a year (e.g. "GDP in 2020", "from 2023"), use that year's data from the context. Never substitute a different year.
- **Region-filtered**: "Top 5 Asian countries" → filter by region, then rank.
- If asked about a country NOT in the context for metrics, suggest selecting it in the Country dashboard or using the Global tab
- **General questions**: When asked about leaders, presidents, independence day, culture, or current events (e.g. "who is the president of Indonesia"), answer directly. Do NOT refuse or say "outside scope". Do NOT mention "Dashboard data". Instead, when helpful, add a Wikipedia link, e.g. "For more: [Indonesia – Wikipedia](https://en.wikipedia.org/wiki/Indonesia)".
- Be concise but complete. Use markdown for clarity.
- **Data recency**: Today is ${today}. Provide the most current information you know for general-knowledge questions. Consider recent elections, leadership changes, or events. Do NOT say "my knowledge cutoff". Do NOT mention "Dashboard data". Add a Wikipedia link for verification, e.g. "For more: [Country name – Wikipedia](https://en.wikipedia.org/wiki/Country_name)".`;

  const hasRequestedYearData =
    requestedYear &&
    (globalDataByYear?.[requestedYear]?.length || (globalData?.length && options?.effectiveYear === requestedYear));
  const yearNote = hasRequestedYearData
    ? ` The data below IS for year ${requestedYear} – present it as ${requestedYear} data.`
    : '';
  const guidelines = compact
    ? `Use data from context. Data covers ${DATA_MIN_YEAR}–${DATA_MAX_YEAR}. When the user asks for a year in that range, use that year's data – do not substitute.${yearNote} For general questions (leaders, presidents, current events), answer directly – do not refuse. ${cutoffRule}`
    : `
## Guidelines
- Base answers on the metrics and sources listed above
- **COMBINATIONS**: When the user asks for multiple things (e.g. "GDP, government type, and inflation for top 5 countries"), include ALL of them. Never omit a requested metric.
- **RANKINGS**: Always return actual ranked data with values, never definitions. Include any extra metrics the user asked for (GovType, HeadGov, inflation, debt, etc.).
- **COMPARE X TO Y**: When user compares two countries by name, show BOTH countries' data side-by-side. Never substitute a "country vs world" response.
- **OVERVIEW**: For "all information" or "overview", output every section: Country info, Financial, Population & health, Geography. Never truncate.
- **EXACT VALUES**: Use numbers from the context. Never invent or approximate. N/A only when missing.
- **GENERAL QUESTIONS**: When asked about leaders, presidents, independence day, culture, or current events, answer directly. Do NOT refuse or say "outside scope". Do NOT mention "Dashboard data". Instead, when helpful, add a Wikipedia link, e.g. "For more: [Indonesia – Wikipedia](https://en.wikipedia.org/wiki/Indonesia)".
- For methodology, cite sources (World Bank, IMF). Cite sources when relevant.`;

  return `${intro}

## Available metrics
${metricsContext}
${dataSourceSummary}
${countryContext}
${globalContext}
${guidelines}`;
}
