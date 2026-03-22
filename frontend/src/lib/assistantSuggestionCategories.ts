/**
 * Starter prompts for Analytics Assistant — grouped for professional workflows.
 * The API uses the dashboard’s selected country (synced from Country Dashboard).
 */

export type AssistantSuggestionCategory = {
  id: string;
  /** Short label shown in the accordion header */
  title: string;
  /** One-line scope for the category */
  subtitle: string;
  prompts: string[];
};

/** At least 10 prompts per category (aligned with platform / WDI-backed metrics). */
export const ASSISTANT_SUGGESTION_CATEGORIES: AssistantSuggestionCategory[] = [
  {
    id: "strategic-overview",
    title: "Strategic overview",
    subtitle: "Executive-style briefings tied to your focus country",
    prompts: [
      "Give me a concise executive overview of the selected country.",
      "What headline macro story do the latest dashboard series tell for the selected country?",
      "What are the main economic strengths and vulnerabilities visible in platform data for the selected country?",
      "Summarize fiscal and debt trajectory for the selected country using dashboard series.",
      "How does human development on the dashboard (health and education proxies) look for the selected country?",
      "What demographic shifts (youth vs aging shares) matter for policy in the selected country?",
      "Draft bullet talking points I could use internally on the selected country’s macro picture.",
      "What three indicators would you watch first for early warning on the selected country?",
      "How exposed is the selected country to inflation and interest-rate stress per the dashboard?",
      "Give a risk-and-opportunity summary for the selected country grounded in the figures available here.",
    ],
  },
  {
    id: "rankings-benchmarks",
    title: "Rankings & benchmarks",
    subtitle: "Global leaderboards (tabular answers from platform data)",
    prompts: [
      "Top 10 countries by GDP",
      "Top 10 countries by population",
      "Top 15 countries by GDP per capita",
      "Top 10 countries by inflation (consumer prices)",
      "Top 10 countries by unemployment rate",
      "Top 10 countries by life expectancy",
      "Top 10 countries by government debt as % of GDP",
      "Top 10 countries by poverty headcount at $2.15 a day",
      "Top 10 countries by GDP growth (annual %)",
      "Top 10 countries by GDP at purchasing power parity",
    ],
  },
  {
    id: "comparative",
    title: "Comparative analysis",
    subtitle: "Side-by-side views across economies",
    prompts: [
      "Compare the selected country to Thailand, Singapore, USA, Malaysia, and Germany on GDP, population, unemployment, and inflation.",
      "Compare the selected country to Brazil, Singapore, USA, France, and Germany on GDP, population, unemployment, and inflation.",
      "Compare the selected country to Malaysia on GDP, population, and inflation.",
      "Compare the selected country to Singapore on GDP per capita and population.",
      "Compare the selected country to Thailand on GDP growth, unemployment, and inflation.",
      "Compare the selected country to Vietnam on GDP per capita (nominal and PPP) and population.",
      "Compare the selected country to the Philippines on lending interest rate, inflation, and real interest rate.",
      "Compare the selected country to India on population, GDP, and GDP per capita.",
      "Compare the selected country to China on GDP, GDP growth, and government debt % of GDP.",
      "Compare the selected country to Japan on life expectancy, population ages 65+, and GDP per capita.",
      "Compare the selected country to Brazil on poverty headcount, inflation, and unemployment.",
      "Compare the selected country to the United States on GDP, GDP per capita, and population.",
    ],
  },
  {
    id: "macro-labour",
    title: "Macro, labour & prices",
    subtitle: "Deeper indicator narratives",
    prompts: [
      "Summarize inflation, lending rates, and GDP growth for the selected country.",
      "Explain unemployment and labor-force context for the selected country in plain language.",
      "How do nominal vs PPP GDP per capita differ for the selected country, and why might both matter?",
      "Walk through central government debt (% of GDP and US$) for the selected country.",
      "Describe labor force participation and unemployment together for the selected country.",
      "What does the real interest rate series suggest for the selected country’s financial conditions?",
      "How does poverty at international vs national lines compare for the selected country?",
      "Summarize population structure: youth share, aging share, and total population trend.",
      "Connect GDP growth and inflation for the selected country over recent years in plain language.",
      "Explain government debt trajectory relative to GDP growth for the selected country.",
    ],
  },
  {
    id: "geography-trust",
    title: "Geography & data literacy",
    subtitle: "Reference facts and how to read sources",
    prompts: [
      "Where is the selected country located (region, subregion, and capital)?",
      "How should I interpret dashboard statistics versus web search results on this platform?",
      "What is the difference between nominal GDP and GDP at PPP in one paragraph using the selected country?",
      "Which metrics on this dashboard come from World Bank WDI vs IMF gap-fills, and why does it matter?",
      "Why might ranking tables show a different year than my country card — how should I read that?",
      "What does “latest available year” mean for a series, and how do I spot it in answers?",
      "How are unemployment percentages defined here (labour force concepts) for the selected country?",
      "When should I trust a table of top countries versus a single-country narrative from the assistant?",
      "What are limitations of cross-country education or health metrics when comparing rich and poor economies?",
      "Where can I read formal definitions and source URLs for the metrics behind the assistant’s numbers?",
    ],
  },
];

export const ASSISTANT_SUGGESTION_COUNT = ASSISTANT_SUGGESTION_CATEGORIES.reduce(
  (n, c) => n + c.prompts.length,
  0
);
