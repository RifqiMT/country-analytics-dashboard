/**
 * Builds the system prompt for Porter Five Forces analysis.
 * Uses latest global data (DATA_MAX_YEAR) and country + ILO industry/sector context.
 * Separate from PESTEL; used only by the Porter 5 Forces feature.
 */
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { formatCompactNumber, formatPercentage } from './numberFormat';
import type { CountryDashboardData, GlobalCountryMetricsRow } from '../types';
import { getIndustryDivisionLabelShort } from '../data/iloIndustrySectors';

function formatValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  if (unit === '%' || unit.includes('%')) return formatPercentage(value);
  const num = formatCompactNumber(value);
  if (unit === 'People') return `${num} people`;
  if (unit === 'Years') return `${num} years`;
  return `${num} ${unit}`;
}

/**
 * Build peer comparison summary for the industry context (from global metrics).
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
  return lines.join('\n');
}

/**
 * Build system prompt for Porter Five Forces analysis.
 * Output: 1 paragraph comprehensive analysis + 2 paragraphs per force.
 */
export function buildPorter5ForcesSystemPrompt(
  dashboardData?: CountryDashboardData | null,
  globalMetrics?: GlobalCountryMetricsRow[] | null,
  globalMetricsYear?: number,
  industrySectorId?: string,
): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const industryLabel = industrySectorId ? getIndustryDivisionLabelShort(industrySectorId) : 'general industry';
  const year = globalMetricsYear ?? dashboardData?.latestSnapshot?.year ?? dashboardData?.range?.endYear ?? DATA_MAX_YEAR;

  const dataSourceNote = `
## Data sources (use for inline citations – merge with text)

When citing data or facts in your analysis, use **Markdown hyperlinks** inline: \`[Source Name](URL)\`. Example: "GDP per capita stands at 5,100 USD ([World Bank WDI](https://data.worldbank.org/indicator))."

- **World Bank WDI** – GDP, population, inflation, government debt, labour: https://data.worldbank.org/indicator
- **IMF World Economic Outlook** – GDP and government debt: https://www.imf.org/external/datamapper
- **REST Countries** – Government type, currency, timezone
- **ILO / ISIC** – Industry and sector classification: https://ilostat.ilo.org/methods/concepts-and-definitions/classification-economic-activities/
- Data coverage: ${DATA_MIN_YEAR} to ${DATA_MAX_YEAR}. Global and peer comparison use latest available year (${DATA_MAX_YEAR}).
`;

  let countryContext = '';
  let peerContext = '';

  if (dashboardData) {
    const s = dashboardData.summary;
    const snap = dashboardData.latestSnapshot;
    const f = snap?.metrics?.financial;
    const p = snap?.metrics?.population;
    const h = snap?.metrics?.health;
    const snapYear = snap?.year ?? dashboardData.range.endYear;

    countryContext = `
## Country: ${s.name} (${s.iso2Code})

### Economic (year ${snapYear})
- GDP (Nominal): ${formatValue(f?.gdpNominal ?? null, 'USD')}
- GDP per capita (Nominal): ${formatValue(f?.gdpNominalPerCapita ?? null, 'USD')}
- GDP per capita (PPP): ${formatValue(f?.gdpPPPPerCapita ?? null, 'Intl$')}
- Inflation (CPI): ${formatValue(f?.inflationCPI ?? null, '%')}
- Government debt (% GDP): ${formatValue(f?.govDebtPercentGDP ?? null, '%')}
- Unemployment rate: ${formatValue(f?.unemploymentRate ?? null, '%')}
- Labour force: ${formatValue(f?.labourForceTotal ?? null, 'People')}

### Demographics & health
- Population: ${formatValue(p?.total ?? null, 'People')}
- Life expectancy: ${formatValue(h?.lifeExpectancy ?? null, 'Years')}

### Context
- Region: ${s.region ?? 'N/A'}
- Income level: ${s.incomeLevel ?? 'N/A'}
- Government type: ${s.governmentType ?? 'N/A'}
- Currency: ${s.currencyName ?? s.currencyCode ?? 'N/A'}
- Data range: ${dashboardData.range.startYear}–${dashboardData.range.endYear}
`;
  }

  if (globalMetrics?.length && dashboardData?.summary?.iso2Code) {
    const peerYear = globalMetricsYear ?? dashboardData.latestSnapshot?.year ?? dashboardData.range?.endYear;
    peerContext = buildPeerComparisonContext(
      globalMetrics,
      dashboardData.summary.iso2Code,
      peerYear,
    );
  }

  const instructions = `
## Your task

Produce a **Porter Five Forces** analysis for **${dashboardData?.summary?.name ?? 'the selected country'}** in the **${industryLabel}** sector. Today is ${today}.

Use the **most up-to-date** information: the metrics below use the latest available year (${DATA_MAX_YEAR}). Use any supplemental web search results provided to enrich your analysis with the latest industry and country context.

**Required structure – follow exactly:**

You must start your response with the **Porter 5 Forces Chart Summary** block below. This block is used to render a visual chart. Then continue directly with the Executive Summary and the full analysis (do not add a horizontal rule or \`---\`).

### Step 1: Porter 5 Forces Chart Summary (must appear first)

For the chart, provide **exactly 5 bullet points** per force. Each bullet must be one short, concise sentence (summarised analysis). Output the following structure exactly—use these exact headings and replace the brackets with your analysis. Do not wrap this block in code fences.

## Porter 5 Forces Chart Summary

### 1. Threat of new entrants
- [Bullet 1 – one short sentence]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### 2. Bargaining power of suppliers
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### 3. Bargaining power of buyers
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### 4. Threat of substitutes
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### 5. Competitive rivalry
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### Executive Summary (1 paragraph)
Write **exactly one paragraph** (4–6 sentences) that summarises the overall competitive intensity and attractiveness of the **${industryLabel}** sector in **${dashboardData?.summary?.name ?? 'the country'}**. Synthesise the five forces into a single, coherent overview. Do not use bullet points in this paragraph. **Include at least one inline citation** with a hyperlink (e.g. [World Bank WDI](https://data.worldbank.org/indicator)) where you cite a metric or fact.

### 1. Threat of new entrants
Write **exactly two paragraphs**. Cover: barriers to entry (capital, regulation, economies of scale, branding); threat from new competitors; ease of entry/exit in this country and sector. Use full sentences; no bullet lists. **Where you cite data or external sources, use inline Markdown links** like [Source Name](URL) merged into the sentence.

### 2. Bargaining power of suppliers
Write **exactly two paragraphs**. Cover: concentration of suppliers; switching costs; importance of inputs to the industry; supplier power in this country and sector. Use full sentences; no bullet lists. **Include inline citations with hyperlinks** when referencing data or web search results.

### 3. Bargaining power of buyers
Write **exactly two paragraphs**. Cover: concentration of buyers; price sensitivity; switching costs; buyer power in this country and sector. Use full sentences; no bullet lists. **Merge citations into the text** using [Source](URL) format where relevant.

### 4. Threat of substitutes
Write **exactly two paragraphs**. Cover: availability of substitute products or services; relative price and performance; threat level in this country and sector. Use full sentences; no bullet lists. **Cite sources inline with hyperlinks** when using statistics or external information.

### 5. Competitive rivalry (industry competition)
Write **exactly two paragraphs**. Cover: number and size of competitors; rate of industry growth; differentiation; exit barriers; intensity of rivalry in this country and sector. Use full sentences; no bullet lists. **Include hyperlinked citations** in the narrative where you reference data or supplemental web results.

### Step 2: New Market Analysis (after the five forces above)

After the five forces sections, add a **New Market Analysis** section. This section must synthesise the Porter five forces into a **comprehensive new market analysis**. Provide **exactly 5 summarized, concise bullet points**. Each bullet must be one short sentence that captures a key implication for entering or operating in this market (e.g. attractiveness, risks, opportunities, or strategic takeaways derived from the five forces). Use this exact heading and format. **Do not add any narrative paragraphs before or after the bullet list**—only the heading and the 5 bullets.

## New Market Analysis
- [Bullet 1 – one concise sentence]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### Step 3: Key Takeaways (immediately after New Market Analysis)

**Immediately after** the New Market Analysis section (with **no** narrative paragraphs in between), add a **Key Takeaways** section. Do not insert any text between the two sections—only the two headings and their bullet lists. This section must provide a **comprehensive takeaways analysis** based on the Porter five forces. Provide **exactly 5 summarized, concise bullet points**. Each bullet must be one short sentence that captures a key strategic takeaway or conclusion from the five forces analysis (e.g. overall attractiveness, main risks, critical success factors, or recommendations). Use this exact heading and format:

## Key Takeaways
- [Bullet 1 – one concise sentence]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

### Step 4: Recommendations (immediately after Key Takeaways)

**Immediately after** the Key Takeaways section (with **no** narrative paragraphs in between), add a **Recommendations** section. Do not insert any text between Key Takeaways and Recommendations—only the two headings and their bullet lists. This section must provide a **recommendations analysis** based on the Porter five forces. Provide **exactly 5 summarized, concise bullet points**. Each bullet must be one short sentence that gives a clear, actionable recommendation derived from the five forces (e.g. how to strengthen position, mitigate threats, or capture opportunities). Use this exact heading and format:

## Recommendations
- [Bullet 1 – one concise sentence]
- [Bullet 2]
- [Bullet 3]
- [Bullet 4]
- [Bullet 5]

## Guidelines
- **Recommendations**: Immediately after "Key Takeaways" (with no paragraphs in between), output the "## Recommendations" heading followed by exactly 5 bullet points. Each bullet must be one concise, actionable recommendation based on your five forces analysis. Do not add any narrative text between Key Takeaways and Recommendations.
- **Key Takeaways**: Immediately after "New Market Analysis" (with no paragraphs in between), output the "## Key Takeaways" heading followed by exactly 5 bullet points. Do not add any narrative text between the two sections.
- **New Market Analysis**: After the five forces (each with two paragraphs), output the "## New Market Analysis" heading followed by exactly 5 bullet points—no extra paragraphs before or after the list.
- **Chart summary**: You must output the "Porter 5 Forces Chart Summary" block first, with exactly 5 bullet points under each of the 5 force headings. Use short, summarised sentences suitable for a chart. Then continue directly with the Executive Summary (do not type \`---\` or a horizontal rule).
- Use exact numbers from the data when relevant; never invent figures.
- **Citations and sources**: Put **all** citations and sources **inline** in the narrative using hyperlinks: [Source Name](URL). Do **not** add a separate "Sources" section, bullet list, or reference list at the end—every source must be merged into the text where it is cited (e.g. "Unemployment is 5.4% ([World Bank WDI](https://data.worldbank.org/indicator)).").
- Each of the five forces must have **exactly two paragraphs**.
- The Executive Summary must be **exactly one paragraph** (no bullets).
- Be concise and professional; suitable for strategy and investment decisions.
- Use Markdown: ## and ### headers, **bold** for emphasis. Use the supplemental web data when provided to enrich industry- and country-specific content; cite those web results inline with their URLs when used.
`;

  return `You are a senior strategy analyst producing Porter Five Forces analyses for the Country Analytics Platform. Your output is used for industry attractiveness assessment and competitive strategy.
${dataSourceNote}
${countryContext}
${peerContext ? `\n${peerContext}\n` : ''}
**Industry / sector (ILO–ISIC):** ${industryLabel}
${instructions}`;
}
