/**
 * Builds the system prompt for the analytics chatbot based on app data sources and metrics.
 */
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

export function buildChatSystemPrompt(
  dashboardData?: CountryDashboardData | null,
  globalData?: GlobalRowForPrompt[] | null,
  globalDataByYear?: Record<number, GlobalRowForPrompt[]> | null,
): string {
  const metricsContext = METRIC_METADATA.map((m) => {
    const sources = m.sources.map((s) => s.name).join(', ');
    return `- **${m.label}** (${m.id}): ${m.description} Unit: ${m.unit}. Sources: ${sources}.${m.formula ? ` Formula: ${m.formula}` : ''}`;
  }).join('\n');

  const dataSourceSummary = `
## Data sources in this application
- **World Bank WDI**: World Development Indicators (GDP, population, inflation, debt, health, geography)
- **IMF World Economic Outlook**: GDP and government debt data
- **UN / WHO**: Population and health statistics
- **Sea Around Us / Marine Regions**: Exclusive Economic Zone (EEZ) data
- Data coverage: typically 2000 to latest available (with ~2 year lag)
`;

  let countryContext = '';
  if (dashboardData) {
    const s = dashboardData.summary;
    const snap = dashboardData.latestSnapshot;
    countryContext = `
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
      countryContext += `
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

  let globalContext = '';
  if (globalDataByYear && Object.keys(globalDataByYear).length > 0) {
    const years = Object.keys(globalDataByYear)
      .map(Number)
      .sort((a, b) => b - a);
    globalContext = '\n## Global data by year – use for rankings, multi-country, and any combination of metrics\n';
    for (const y of years) {
      const rows = globalDataByYear[y];
      if (!rows?.length) continue;
      const top50ByGdp = [...rows]
        .filter((r) => (r.gdpNominal ?? 0) > 0)
        .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0))
        .slice(0, 50);
      const top20ByGdpPc = [...rows]
        .filter((r) => (r.gdpNominalPerCapita ?? 0) > 0)
        .sort((a, b) => (b.gdpNominalPerCapita ?? 0) - (a.gdpNominalPerCapita ?? 0))
        .slice(0, 20);
      globalContext += `\n### Year ${y} (top 50 by GDP nominal – use for rankings and combinations)\n`;
      globalContext += top50ByGdp
        .map(
          (r) =>
            `${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, PPP ${formatValue(r.gdpPPP ?? null, '')}, GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, PPPpc ${formatValue(r.gdpPPPPerCapita ?? null, '')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, DebtUSD ${formatValue(r.govDebtUSD ?? null, 'USD')}, IntRate ${formatValue(r.interestRate ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, Area ${formatValue(r.totalAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, Age0-14 ${formatValue(r.pop0_14Pct ?? null, '%')}, Age15-64 ${formatValue(r.pop15_64Pct ?? null, '%')}, Age65+ ${formatValue(r.pop65PlusPct ?? null, '%')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`,
        )
        .join('\n');
      globalContext += `\n\n### Year ${y} (top 20 by GDP per capita – use for "top N by GDP per capita")\n`;
      globalContext += top20ByGdpPc
        .map(
          (r) =>
            `${r.name}: GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`,
        )
        .join('\n');
      globalContext += '\n';
    }
  } else if (globalData && globalData.length > 0) {
    const top20 = [...globalData]
      .filter((r) => (r.gdpNominal ?? 0) > 0)
      .sort((a, b) => (b.gdpNominal ?? 0) - (a.gdpNominal ?? 0))
      .slice(0, 20);
    globalContext = `
## Global data (top 20 by GDP) – use for comparison and "all countries" questions
${top20.map((r, i) => `${i + 1}. ${r.name}: GDP ${formatValue(r.gdpNominal ?? null, 'USD')}, PPP ${formatValue(r.gdpPPP ?? null, '')}, GDPpc ${formatValue(r.gdpNominalPerCapita ?? null, 'USD')}, PPPpc ${formatValue(r.gdpPPPPerCapita ?? null, '')}, Pop ${formatValue(r.populationTotal ?? null, 'People')}, Life exp ${formatValue(r.lifeExpectancy ?? null, 'Years')}, Inflation ${formatValue(r.inflationCPI ?? null, '%')}, Debt ${formatValue(r.govDebtPercentGDP ?? null, '%')}, IntRate ${formatValue(r.interestRate ?? null, '%')}, Land ${formatValue(r.landAreaKm2 ?? null, 'km²')}, EEZ ${formatValue(r.eezKm2 ?? null, 'km²')}, GovType ${r.governmentType ?? 'N/A'}, HeadGov ${r.headOfGovernmentType ?? 'N/A'}`).join('\n')}
`;
  }

  return `You are a helpful analytics assistant for the Country Analytics Platform. You help users understand the data, metrics, and sources available in this dashboard.

## Core principle: UNLIMITED COMBINATIONS
- **NEVER omit requested data.** When the user asks for a COMBINATION of metrics (e.g. "GDP, inflation, and government type for top 5 countries"), include EVERY requested metric in your response. Combine freely: rankings + government info, multiple countries + specific metrics, region + any metric.
- **Extract ALL implied requests.** "List of X and Y based on top N by Z" means: (1) rank by Z, (2) for each country show X and Y. Include all of: X, Y, Z.
- **Use exact values from context.** Never invent numbers. If data is in the context (Global data, Latest values), cite it. Use N/A only when truly missing.

## Your role
- Answer questions about the metrics, their definitions, formulas, and data sources
- **Single country + any metric(s)**: Use values from context. For "all information" include: Country info (region, capital, currency, government, GovType, HeadGov), Financial (GDP nominal/PPP, per capita, inflation, interest rate, debt % and USD), Population (total, age 0–14/15–64/65+%), Health (life expectancy), Geography (land, total area, EEZ).
- **Rankings + extra metrics**: "Top N by X" with "and Y, Z" → return ranked list with X, Y, Z for each country. GovType, HeadGov, inflation, debt, etc. are all in the data.
- **Compare X to Y / X vs Y**: Return a SIDE-BY-SIDE comparison of those specific countries. "Compare Indonesia to Malaysia" → show Indonesia's AND Malaysia's metrics (GDP, population, life expectancy, inflation, debt, etc.). NEVER return a generic "X compared to world" when the user asked to compare two specific countries.
- **Year-specific**: Use the year from the query. "From 2023" or "in 2023" → use 2023 data.
- **Region-filtered**: "Top 5 Asian countries" → filter by region, then rank.
- If asked about a country NOT in the context, suggest selecting it in the Country dashboard or using the Global tab
- Be concise but complete. Use markdown for clarity.

## Available metrics
${metricsContext}
${dataSourceSummary}
${countryContext}
${globalContext}

## Guidelines
- Base answers on the metrics and sources listed above
- **COMBINATIONS**: When the user asks for multiple things (e.g. "GDP, government type, and inflation for top 5 countries"), include ALL of them. Never omit a requested metric.
- **RANKINGS**: Always return actual ranked data with values, never definitions. Include any extra metrics the user asked for (GovType, HeadGov, inflation, debt, etc.).
- **COMPARE X TO Y**: When user compares two countries by name, show BOTH countries' data side-by-side. Never substitute a "country vs world" response.
- **OVERVIEW**: For "all information" or "overview", output every section: Country info, Financial, Population & health, Geography. Never truncate.
- **EXACT VALUES**: Use numbers from the context. Never invent or approximate. N/A only when missing.
- If outside scope, politely redirect. Cite sources (World Bank, IMF) when relevant. For methodology, use the formulas above.`;
}
