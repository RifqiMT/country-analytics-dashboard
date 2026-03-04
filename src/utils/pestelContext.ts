/**
 * Builds the system prompt for comprehensive PESTEL analysis based on country dashboard data.
 * Uses World Bank, IMF, and available macro data.
 */
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { formatCompactNumber, formatPercentage } from './numberFormat';
import type { CountryDashboardData, GlobalCountryMetricsRow, MetricSeries } from '../types';

function formatValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  if (unit === '%' || unit.includes('%')) return formatPercentage(value);
  const num = formatCompactNumber(value);
  if (unit === 'People') return `${num} people`;
  if (unit === 'Years') return `${num} years`;
  return `${num} ${unit}`;
}

function getTrend(series: MetricSeries | undefined): string {
  if (!series?.points?.length) return '';
  const valid = series.points.filter((p) => p.value != null && !Number.isNaN(p.value));
  if (valid.length < 2) return '';
  const first = valid[0].value!;
  const last = valid[valid.length - 1].value!;
  if (first === 0) return '';
  const pct = ((last - first) / first) * 100;
  const sign = pct >= 0 ? '+' : '';
  return ` (${sign}${pct.toFixed(1)}% over period)`;
}

/**
 * Build peer comparison summary for market analysis (from global metrics).
 */
function buildPeerComparisonContext(
  globalMetrics: GlobalCountryMetricsRow[],
  targetIso2: string,
  year: number,
): string {
  const target = globalMetrics.find(
    (r) => r.iso2Code?.toUpperCase() === targetIso2.toUpperCase(),
  );
  if (!target) return '';

  const region = target.region ?? 'Unknown';
  const targetGdpPc = target.gdpNominalPerCapita ?? target.gdpPPPPerCapita ?? 0;

  // Region peers: same region, sorted by GDP per capita
  const regionPeers = globalMetrics
    .filter(
      (r) =>
        r.region === region &&
        r.year === year &&
        (r.gdpNominalPerCapita != null || r.gdpPPPPerCapita != null),
    )
    .map((r) => ({
      name: r.name,
      iso2: r.iso2Code,
      gdpPc: r.gdpNominalPerCapita ?? r.gdpPPPPerCapita ?? 0,
      population: r.populationTotal ?? 0,
      lifeExp: r.lifeExpectancy ?? 0,
      inflation: r.inflationCPI ?? 0,
      debt: r.govDebtPercentGDP ?? 0,
    }))
    .sort((a, b) => b.gdpPc - a.gdpPc);

  const targetRank =
    regionPeers.findIndex((r) => r.iso2?.toUpperCase() === targetIso2.toUpperCase()) + 1;
  const top5 = regionPeers.slice(0, 5);
  const lines: string[] = [
    `## Peer comparison (${region}, year ${year})`,
    `- ${target.name} ranks ${targetRank} of ${regionPeers.length} in the region by GDP per capita.`,
    `- Top 5 peers by GDP per capita: ${top5.map((p) => `${p.name} (${formatCompactNumber(p.gdpPc)} USD)`).join(', ')}`,
  ];

  if (regionPeers.length >= 3) {
    const medianGdpPc = regionPeers[Math.floor(regionPeers.length / 2)].gdpPc;
    const aboveMedian = targetGdpPc >= medianGdpPc;
    lines.push(
      `- ${target.name} is ${aboveMedian ? 'above' : 'below'} regional median GDP per capita (${formatCompactNumber(medianGdpPc)} USD).`,
    );
  }

  return lines.join('\n');
}

/**
 * Build a system prompt for comprehensive PESTEL analysis.
 * PESTEL = Political, Economic, Social, Technological, Environmental, Legal.
 */
export function buildPestelSystemPrompt(
  dashboardData?: CountryDashboardData | null,
  globalMetrics?: GlobalCountryMetricsRow[] | null,
): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dataSourceNote = `
## Data sources used (include these as hyperlinks when citing in your analysis)

Use Markdown links: [Source Name](URL) when referencing data in your text.

- **World Bank WDI** – GDP, population, inflation, interest rate, government debt, poverty, health, geography: https://data.worldbank.org/indicator
- **World Bank Country Data** – country profiles: https://data.worldbank.org/country
- **IMF World Economic Outlook** – GDP and government debt: https://www.imf.org/external/datamapper
- **REST Countries** – Government type, head of government, currency, timezone (no public API docs; cite as "REST Countries API")
- **Sea Around Us / Marine Regions** – Exclusive Economic Zone (EEZ): https://www.searoundus.org/
- **Marine Regions** – EEZ boundaries: https://www.marineregions.org/
- Data coverage: ${DATA_MIN_YEAR} to ${DATA_MAX_YEAR} (current year minus 2).
`;

  let countryContext = '';
  let trendsContext = '';
  let peerContext = '';

  if (dashboardData) {
    const s = dashboardData.summary;
    const snap = dashboardData.latestSnapshot;
    const f = snap?.metrics?.financial;
    const p = snap?.metrics?.population;
    const h = snap?.metrics?.health;
    const g = snap?.metrics?.geography;
    const year = snap?.year ?? dashboardData.range.endYear;
    const { series } = dashboardData;

    const gdpSeries = series?.financial?.find((x) => x.id === 'gdpNominal');
    const popSeries = series?.population?.find((x) => x.id === 'populationTotal');
    const lifeSeries = series?.health?.find((x) => x.id === 'lifeExpectancy');
    const inflSeries = series?.financial?.find((x) => x.id === 'inflationCPI');
    const debtSeries = series?.financial?.find((x) => x.id === 'govDebtPercentGDP');
    const under5Series = series?.health?.find((x) => x.id === 'under5MortalityRate');
    const maternalSeries = series?.health?.find((x) => x.id === 'maternalMortalityRatio');
    const malnutritionSeries = series?.health?.find(
      (x) => x.id === 'undernourishmentPrevalence',
    );

    trendsContext = `
## Time-series trends (${dashboardData.range.startYear}–${dashboardData.range.endYear})
- GDP (Nominal): ${getTrend(gdpSeries) || 'N/A'}
- Population: ${getTrend(popSeries) || 'N/A'}
- Life expectancy: ${getTrend(lifeSeries) || 'N/A'}
- Under-5 mortality: ${getTrend(under5Series) || 'N/A'}
- Maternal mortality: ${getTrend(maternalSeries) || 'N/A'}
- Malnutrition (undernourishment): ${getTrend(malnutritionSeries) || 'N/A'}
- Inflation: ${getTrend(inflSeries) || 'N/A'}
- Government debt (% GDP): ${getTrend(debtSeries) || 'N/A'}
`;

    countryContext = `
## Country: ${s.name} (${s.iso2Code})

### Political
- Government: ${s.government ?? s.governmentType ?? 'N/A'}
- Government type: ${s.governmentType ?? 'N/A'}
- Head of government: ${s.headOfGovernmentType ?? 'N/A'}

### Economic (year ${year})
- GDP (Nominal): ${formatValue(f?.gdpNominal ?? null, 'USD')}
- Poverty ($2.15/day): ${formatValue(f?.povertyHeadcount215 ?? null, '%')}
- Poverty (national line): ${formatValue(f?.povertyHeadcountNational ?? null, '%')}
- GDP (PPP): ${formatValue(f?.gdpPPP ?? null, 'Intl$')}
- GDP per capita (Nominal): ${formatValue(f?.gdpNominalPerCapita ?? null, 'USD')}
- GDP per capita (PPP): ${formatValue(f?.gdpPPPPerCapita ?? null, 'Intl$')}
- Inflation (CPI): ${formatValue(f?.inflationCPI ?? null, '%')}
- Lending interest rate: ${formatValue(f?.interestRate ?? null, '%')}
- Government debt (% GDP): ${formatValue(f?.govDebtPercentGDP ?? null, '%')}
- Government debt (USD): ${formatValue(f?.govDebtUSD ?? null, 'USD')}

### Social
- Population: ${formatValue(p?.total ?? null, 'People')}
- Life expectancy: ${formatValue(h?.lifeExpectancy ?? null, 'Years')}
- Under-5 mortality (per 1,000): ${formatValue(
          h?.under5MortalityRate ?? null,
          '',
        )}
- Maternal mortality (per 100,000): ${formatValue(
          h?.maternalMortalityRatio ?? null,
          '',
        )}
- Prevalence of undernourishment: ${formatValue(
          h?.undernourishmentPrevalence ?? null,
          '%',
        )}
`;
    if (p?.ageBreakdown?.groups?.length) {
      countryContext += `- Age 0–14: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '0_14')?.percentageOfPopulation ?? null)} of population
- Age 15–64: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '15_64')?.percentageOfPopulation ?? null)} of population
- Age 65+: ${formatPercentage(p.ageBreakdown.groups.find((x) => x.id === '65_plus')?.percentageOfPopulation ?? null)} of population
`;
    }

    countryContext += `
### Environmental
- Land area: ${formatValue(g?.landAreaKm2 ?? null, 'km²')}
- Total area: ${formatValue(g?.totalAreaKm2 ?? null, 'km²')}
- EEZ (Exclusive Economic Zone): ${formatValue(g?.eezKm2 ?? null, 'km²')}

### Other context
- Region: ${s.region ?? 'N/A'}
- Income level: ${s.incomeLevel ?? 'N/A'}
- Capital: ${s.capitalCity ?? 'N/A'}
- Currency: ${s.currencyName ?? s.currencyCode ?? 'N/A'}
- Timezone: ${s.timezone ?? 'N/A'}
- Data range: ${dashboardData.range.startYear}–${dashboardData.range.endYear}
`;
  }

  if (globalMetrics?.length && dashboardData?.summary?.iso2Code) {
    const year =
      dashboardData.latestSnapshot?.year ?? dashboardData.range.endYear;
    peerContext = buildPeerComparisonContext(
      globalMetrics,
      dashboardData.summary.iso2Code,
      year,
    );
  }

  const referenceFormat = `
## Reference format – each PESTEL element: up to 2 summarized paragraphs

**Political factors**: Write up to 2 concise paragraphs. Summarise: government structure and stability; geopolitical stance; corruption and bureaucracy; policy continuity.

**Economic factors**: Write up to 2 paragraphs. Summarise: domestic consumption and market size; GDP growth and commodity dependence; FDI and investment climate; inflation and currency.

**Social factors**: Write up to 2 paragraphs. Summarise: demographics (age, population); diversity; urbanization; education and skills; cultural norms.

**Technological factors**: Write up to 2 paragraphs. Summarise: digitalization; government digital initiatives; startup ecosystem; infrastructure and digital divides.

**Environmental factors**: Write up to 2 paragraphs. Summarise: climate vulnerability; emissions and land use; government climate commitments; natural resources; ESG expectations.

**Legal factors**: Write up to 2 paragraphs. Summarise: legal system; economic law reforms; sector regulations; labour laws; IP and tax.

**Strategic implications for business (PESTEL–SWOT matrix)**:
- **Opportunities**: 4–6 bullet points
- **Risks and challenges**: 4–6 bullet points
`;

  const instructions = `
## Your task
Produce a **comprehensive PESTEL analysis** for the country above. Today is ${today}.

Your analysis MUST be thorough, professional, and suitable for strategic decision-making (e.g. market entry, investment, policy review). Use ALL data provided, including time-series trends. Follow the reference format below for structure, depth, and style.
${referenceFormat}

## Required structure – follow this exact format

### Executive summary
- 3–5 sentences summarising the key macro-environmental factors for ${dashboardData?.summary?.name ?? 'the country'}
- Highlight the most significant opportunities and risks

---

### Political factors
Write up to 2 summarized paragraphs. Cover government structure and stability, geopolitical stance, corruption and bureaucracy, policy continuity. Use exact data where available; supplement with web search results when provided.

### Economic factors
Write up to 2 summarized paragraphs. Cover domestic consumption and market size, GDP growth and commodity dependence, FDI and investment climate, inflation and currency. Use GDP, inflation, debt, and trend data from the context.

### Social factors
Write up to 2 summarized paragraphs. Cover demographics (population, age structure), diversity, urbanization, education and skills, cultural norms. Use population, life expectancy, and age-breakdown data.

### Technological factors
Write up to 2 summarized paragraphs. Cover digitalization, government digital initiatives, startup ecosystem, infrastructure dispersion, adoption of emerging tech. Use supplemental web data when provided.

### Environmental factors
Write up to 2 summarized paragraphs. Cover climate vulnerability, emissions and land use, government climate commitments, natural resources (land, EEZ), ESG expectations. Use land area, EEZ, and supplemental web data.

### Legal factors
Write up to 2 summarized paragraphs. Cover legal system, economic law reforms, sector regulations, labour laws, IP and tax. Use supplemental web data when provided.

---

### Strategic implications for business (PESTEL–SWOT matrix)
**Opportunities:**
- 4–6 bullet points (e.g. large consumer market, digital growth, government-supported sectors, ESG investments)

**Risks and challenges:**
- 4–6 bullet points (e.g. regulatory complexity, climate vulnerability, skills gaps, commodity/currency exposure)

---

### New market analysis
- **Market attractiveness**: Assess the country as a new market. Consider market size, purchasing power, growth potential, stability.
- **Peer comparison**: Use peer comparison data above (if provided) to position the country.
- **Strategic implications**: Who should consider this market? What sectors fit best? Main barriers and enablers?

---

### Key takeaways
- 4–6 bullet points summarising the main opportunities and threats across all PESTEL dimensions

### Recommendations
- **For investors**: Entry/exit timing, sector focus, risk-adjusted considerations
- **For businesses**: Market entry strategy, key sectors, operational considerations
- **For policymakers**: Priority reforms, alignment with standards
- **Risk mitigation**: Top 3–5 risks and concrete mitigation steps
- **Priority actions**: 3–5 specific, time-bound actions

### Sources
- List 3–6 key data sources used in the analysis as hyperlinks, e.g. [World Bank WDI](https://data.worldbank.org/indicator), [IMF Datamapper](https://www.imf.org/external/datamapper). Include any web search sources from the supplemental data when used.

## Guidelines
- **Use exact numbers** from the data; never invent figures
- **Supplemental web data**: If a "Supplemental web data for PESTEL" section is provided, use it to enrich Technological, Legal, Political, and Environmental dimensions. Prioritise this real-time data over inference. Cite or reference it where relevant.
- **Cite trends** from the time-series when available (e.g. "GDP grew by X% over the period")
- **Be concise**: Each PESTEL dimension must have at most 2 summarized paragraphs
- **Strategic focus**: Always tie analysis to implications for business, investment, or policy
- **Markdown**: Use ## and ### headers, bullet lists, **bold** for emphasis
- **Length**: Aim for 800–1200 words total (2 paragraphs per PESTEL dimension, plus PESTEL–SWOT matrix, new market analysis, and recommendations)
- **Sources and hyperlinks**: When citing data, include the source name as a hyperlink. Example: "GDP grew by 5% ([World Bank WDI](https://data.worldbank.org/indicator))." Use the URLs provided in "Data sources used" above. For supplemental web search results, use the URLs from the snippets when available. Add at least 2–4 inline source links across the analysis where data is cited.
`;

  return `You are a senior strategic analyst producing comprehensive PESTEL (Political, Economic, Social, Technological, Environmental, Legal) analyses for the Country Analytics Platform. Your output is used for market entry, investment due diligence, and policy review.
${dataSourceNote}
${countryContext}
${trendsContext}
${peerContext ? `\n${peerContext}\n` : ''}
${instructions}`;
}
