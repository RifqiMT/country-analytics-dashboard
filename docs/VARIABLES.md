# Variables Documentation – Country Analytics Platform

This document is the **single reference** for all variables used in the Country Analytics Platform: **data metrics** (displayed in the UI), **configuration constants**, and **environment variables**. Each entry includes the **variable name**, **friendly name** (human-readable label), **definition**, **formula** (where applicable), **location in the app**, and a concrete **example**. A **variable relationship and usage** section describes how variables connect (e.g. derived metrics) and flow through the application. The document is maintained in line with the **Product Documentation Standard** (`PRODUCT_DOCUMENTATION_STANDARD.md`).

**Related:** Per-metric metadata for the Source tab is defined in `src/data/metricMetadata.ts`. For engagement and OKR metrics, see `METRICS_AND_OKRS.md`. For product data metrics overview, see `PRODUCT_METRICS.md`.

---

## 1. Data Metrics (UI Variables)

These variables correspond to metrics shown in the Country Dashboard, Global view (map, table, Global Charts), Business Analytics, PESTEL context, and Analytics Assistant. IDs align with `MetricId` and related types in `src/types.ts`.

### 1.1 Financial

| Variable name | Friendly name | Definition | Formula | Location in app | Example |
|---------------|---------------|------------|---------|-----------------|---------|
| `gdpNominal` | GDP (Nominal, US$) | Gross domestic product at market prices in current US dollars. Measures total value of goods and services produced within the country. | GDP = C + I + G + (X − M); converted at official exchange rates. | Summary (Financial), Unified Timeline, Country Comparison, Global map/table/charts, Business Analytics scatter, Source tab. | 1.4T USD (Indonesia 2023). |
| `gdpPPP` | GDP (PPP, Intl$) | Gross domestic product in international dollars adjusted for purchasing power parity. Enables comparison of living standards across countries. | GDP (PPP) = GDP × PPP conversion factor. | Summary (Financial), Unified Timeline, Country Comparison, Global map/table/charts, Business Analytics, Source tab. | 4.2T Intl$. |
| `gdpNominalPerCapita` | GDP per Capita (Nominal, US$) | Average economic output per person in current US dollars. | GDP / Population. | Summary (Financial), Unified Timeline, Country Comparison, Global map/table/charts, Business Analytics scatter, Source tab. | 5,100 USD. |
| `gdpPPPPerCapita` | GDP per Capita (PPP, Intl$) | Average purchasing power per person in PPP terms. | GDP (PPP) / Population. | Summary (Financial), Unified Timeline, Country Comparison, Global map/table/charts, Business Analytics, Source tab. | 15,200 Intl$. |
| `inflationCPI` | Inflation (CPI, %) | Annual percentage change in the consumer price index. Measures the rate at which prices of a basket of consumer goods and services change. | ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100. | Summary (Financial), Macro Indicators Timeline (economic), Global map/table/charts, Source tab. | 3.5%. |
| `interestRate` | Lending interest rate (%) | The rate charged by banks on loans to prime customers. Reflects cost of borrowing and monetary policy stance. | Reported as annual average of bank lending rates. | Summary (Financial), Macro Indicators Timeline (economic), Global map/table/charts, Source tab. | 8.2%. |
| `govDebtPercentGDP` | Government debt (% of GDP) | General government gross debt as a percentage of GDP. Measures the government's total debt relative to the size of the economy. | (Total government debt / GDP) × 100. | Summary (Financial), Macro Indicators Timeline (economic), Global map/table/charts, Source tab. | 39.2%. |
| `govDebtUSD` | Government debt (USD) | Total government gross debt in current US dollars. Derived from GDP and government debt as percentage of GDP. | GDP × (Gov. debt % GDP / 100). | Summary (Financial), Country Comparison, Global map/table/charts, Source tab. | 548B USD. |
| `unemploymentRate` | Unemployment rate (% of labour force) | Share of the labour force that is without work but available for and seeking employment. | (Unemployed / Labour force) × 100. | Summary (Financial), Macro Indicators Timeline (economic), Labour timeline, Global map/table/charts, Source tab. | 5.4%. |
| `unemployedTotal` | Unemployed (number of people) | Total number of people without work but available for and seeking employment. Based on ILO-modelled estimates. | Labour force × (Unemployment rate / 100) or ILO-modelled estimate. | Unemployed & Labour Force Timeline, Global table/charts, Source tab. | 7.2M people. |
| `labourForceTotal` | Labour force (total) | Total labour force: people ages 15 and older who supply labour for the production of goods and services. Includes employed and unemployed persons seeking work. | Employed + Unemployed (seeking work). | Unemployed & Labour Force Timeline, Global table/charts, Source tab. | 134M people. |
| `povertyHeadcount215` | Poverty headcount ($2.15/day, %) | Percentage of population living below the international poverty line of $2.15 a day (2017 PPP). Extreme poverty measure aligned with UN SDGs. | Share of population with consumption or income below $2.15/day (2017 PPP). | Summary (Financial), Macro Indicators Timeline (economic), Global map/table/charts, Source tab. | 2.5%. |
| `povertyHeadcountNational` | Poverty headcount (national line, %) | Percentage of population living below the national poverty line. Each country defines its own threshold based on local costs of living. | Share below the country-specific national poverty line. | Summary (Financial), Macro Indicators Timeline (economic), Global map/table/charts, Source tab. | 9.4%. |

### 1.2 Population

| Variable name | Friendly name | Definition | Formula | Location in app | Example |
|---------------|---------------|------------|---------|-----------------|---------|
| `populationTotal` | Population, total | Total population based on the de facto definition, counting all residents regardless of legal status or citizenship. | Census and intercensal estimates; UN projections. | Summary (Health & demographics), Unified Timeline, Population Structure, Country Comparison, Global map/table/charts, Source tab. | 277M people. |
| `pop0_14Share` | Population 0–14 (% of total) | Percentage of total population aged 0 to 14 years. Part of the youth dependency ratio. | (Pop 0–14 / Total population) × 100. | Summary (Health & demographics), Population Structure timeline, Country Comparison (age breakdown), Global map/table/charts, Source tab. | 24.1%. |
| `pop15_64Share` | Population 15–64 (% of total) | Percentage of total population aged 15 to 64 years. Represents the working-age population. | (Pop 15–64 / Total population) × 100. | Summary (Health & demographics), Population Structure timeline, Country Comparison (age breakdown), Global map/table/charts, Source tab. | 68.2%. |
| `pop65PlusShare` | Population 65+ (% of total) | Percentage of total population aged 65 years and above. Part of the old-age dependency ratio. | (Pop 65+ / Total population) × 100. | Summary (Health & demographics), Population Structure timeline, Country Comparison (age breakdown), Global map/table/charts, Source tab. | 7.7%. |
| `populationByAgeAbsolute` | Population by age group (absolute count) | Absolute number of people in each age band (0–14, 15–64, 65+). Derived from total population and age-group share of total. | Total population × (Age-group share % / 100). | Population Structure timeline (tooltip and table show % and absolute, e.g. 25.3% · 65.2 Mn), Source tab. | 66.8M (0–14). |

### 1.3 Health

| Variable name | Friendly name | Definition | Formula | Location in app | Example |
|---------------|---------------|------------|---------|-----------------|---------|
| `lifeExpectancy` | Life expectancy at birth | Number of years a newborn would live if prevailing patterns of mortality at birth were to stay the same throughout life. | Period life expectancy from mortality tables. | Summary (Health & demographics), Unified Timeline, Global map/table/charts, Business Analytics, Source tab. | 69.2 years. |
| `maternalMortalityRatio` | Maternal mortality ratio (per 100,000 live births) | Number of women who die from pregnancy-related causes while pregnant or within 42 days of pregnancy termination, per 100,000 live births. | (Maternal deaths / Live births) × 100,000. | Summary (Health & demographics), Macro Indicators Timeline (health), Global map/table/charts, Source tab. | 173 per 100k. |
| `under5MortalityRate` | Under-5 mortality rate (per 1,000 live births) | Probability per 1,000 that a newborn will die before reaching age five, if subject to current age-specific mortality rates. | Probability of dying before age 5, expressed per 1,000 live births. | Summary (Health & demographics), Macro Indicators Timeline (health), Global map/table/charts, Source tab. | 22 per 1,000. |
| `undernourishmentPrevalence` | Prevalence of undernourishment (% of population) | Share of the population whose habitual food consumption is insufficient to provide the dietary energy levels required for a normal active and healthy life. | (Population with insufficient dietary energy intake / Total population) × 100. | Summary (Health & demographics), Macro Indicators Timeline (health), Global map/table/charts, Source tab. | 8.4%. |

### 1.4 Geography

| Variable name | Friendly name | Definition | Formula | Location in app | Example |
|---------------|---------------|------------|---------|-----------------|---------|
| `landAreaKm2` | Land area | Total land area in square kilometres, excluding area under inland water bodies, national claims to continental shelf, and exclusive economic zones. | Sum of land surface areas. | Summary (General – geography), Global map/table (General), Source tab. | 1,811,570 km². |
| `totalAreaKm2` | Total area | Total surface area including land and water bodies within international boundaries and coastlines. | Land area + inland water bodies. | Summary (General), Global map/table (General), Source tab. | 1,916,907 km². |
| `eezKm2` | Exclusive Economic Zone (EEZ) | Marine area extending 200 nautical miles from the coast over which a country has special rights regarding exploration and use of marine resources. | Defined by UN Convention on the Law of the Sea. | Summary (General – geography), Global map/table (General), Source tab. | 6,159,032 km². |

### 1.5 Context / Country Metadata

| Variable name | Friendly name | Definition | Formula | Location in app | Example |
|---------------|---------------|------------|---------|-----------------|---------|
| `region` | Region | Geographic or economic region of the country (e.g. East Asia & Pacific, Sub-Saharan Africa). Used for filtering, peer comparison, and PESTEL. | World Bank regional classification. | Summary (General), Global table (General), Map metric selector, PESTEL/Assistant context, Source tab. | East Asia & Pacific. |
| `incomeLevel` | Income level | World Bank income classification (e.g. High income, Upper middle income, Low income). Based on GNI per capita; updated annually. | World Bank analytical classification (GNI per capita). | Summary (General), Global table, PESTEL/Assistant context, Source tab. | Upper middle income. |
| `governmentType` | Government type | Form of government or political system (e.g. Federal republic, Parliamentary democracy). | — | Summary (General), Global table (General), Map metric selector, PESTEL/Assistant context, Source tab. | Presidential republic. |
| `headOfGovernmentType` | Head of government | Title of the chief executive (e.g. President, Prime Minister, Monarch). | — | Summary (General), Global table (General), Assistant context, Source tab. | President. |
| `capitalCity` | Capital city | Capital or seat of government. | — | Summary (General), PESTEL/Assistant context, Source tab. | Jakarta. |
| `currency` | Currency | Official currency: name, ISO code (e.g. IDR, USD), and symbol where available. | — | Summary (General – Economy), Assistant context, Source tab. | Indonesian rupiah (IDR), symbol Rp. |
| `timezone` | Timezone | Primary timezone of the country (e.g. Asia/Jakarta, Europe/Paris). IANA timezone database. | — | Summary (General), Assistant context, Source tab. | Asia/Jakarta. |
| `locationAndGeography` | Location & geographic context | Where a country is located, which continent or region it belongs to, and its neighbouring or bordering countries. Not stored as a dashboard metric; answered by the Analytics Assistant via LLM and web search. | — | Analytics Assistant only (e.g. "Where is Indonesia located?", "Neighbouring countries of France"); documented in Source tab under Country metadata & context. | "Indonesia is in Southeast Asia; neighbours: Malaysia, Papua New Guinea, Timor-Leste." |

---

## 2. Configuration Constants

Defined in `src/config.ts` and used for year bounds and data coverage across the application.

| Variable name | Friendly name | Definition | Formula / Rule | Location in app | Example |
|---------------|---------------|------------|----------------|-----------------|---------|
| `DATA_MIN_YEAR` | Earliest data year | Earliest year allowed for data and filters. Aligns with typical World Bank WDI coverage. | Fixed constant. | Year range selector (Country Dashboard and Business Analytics), global data fetches. | 2000. |
| `DATA_MAX_YEAR` | Latest data year | Latest year considered "available" given data publication lag. Macro data is typically fully available with up to two years of lag. | currentYear − 2. | Year range selector, global data, PESTEL peer comparison year. | 2023 when current year is 2025. |

---

## 3. Environment Variables

Used for API keys and optional server/client configuration. Template: `.env.example`. **Never commit real keys.** Obtain keys from each provider's developer console.

| Variable name | Friendly name | Definition | Use | Location in app | Example (placeholder) |
|---------------|---------------|------------|-----|-----------------|------------------------|
| `GROQ_API_KEY` | Groq API key (server-side) | Groq API key for server-side LLM calls. | Free-tier LLM when no user key is provided. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_GROQ_API_KEY` | Groq API key (client-side, optional) | Groq API key baked into the frontend build. | Public or demo use when no server key. | Chat tab when no server key. | your-key-here |
| `TAVILY_API_KEY` | Tavily API key | Tavily API key for web search. | Real-time answers; PESTEL supplemental search; general-knowledge when Groq cannot answer. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_TAVILY_API_KEY` | Tavily API key (client-side, optional) | Tavily API key for client-side use. | Baked into build for public/demo. | Chat tab settings when applicable. | your-key-here |
| `SERPER_API_KEY` | Serper API key (alternative web search) | Serper API key for web search. | Used when Tavily is not set. | Vite plugin `/api/chat`. | your-key-here |
| `OPENAI_API_KEY` | OpenAI API key (server-side) | OpenAI API key for server-side calls. | When user selects an OpenAI model. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_OPENAI_API_KEY` | OpenAI API key (client-side, optional) | OpenAI API key baked into the build. | Chat tab settings. | Chat tab. | your-key-here |
| `ANTHROPIC_API_KEY` | Anthropic API key (server-side) | Anthropic API key for Claude models. | When user selects an Anthropic model. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key (client-side, optional) | Anthropic API key baked into the build. | Chat tab settings. | Chat tab. | your-key-here |
| `GOOGLE_AI_API_KEY` | Google AI API key (server-side) | Google AI API key for Gemini models. | When user selects a Google AI model. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_GOOGLE_AI_API_KEY` | Google AI API key (client-side, optional) | Google AI API key baked into the build. | Chat tab settings. | Chat tab. | your-key-here |
| `OPENROUTER_API_KEY` | OpenRouter API key (server-side) | OpenRouter API key for multi-model access. | When user selects an OpenRouter model. | Vite plugin `/api/chat`. | your-key-here |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key (client-side, optional) | OpenRouter API key baked into the build. | Chat tab settings. | Chat tab. | your-key-here |

---

## 4. World Bank Indicator Codes (WDI)

Used by `src/api/worldBank.ts` when calling the World Bank API. These codes map to the data metrics above.

| Variable (metric) | WDI Code |
|-------------------|----------|
| GDP (current US$) | NY.GDP.MKTP.CD |
| GDP, PPP | NY.GDP.MKTP.PP.CD |
| GDP per capita (current US$) | NY.GDP.PCAP.CD |
| GDP per capita, PPP | NY.GDP.PCAP.PP.CD |
| Inflation, consumer prices | FP.CPI.TOTL.ZG |
| Central government debt (% of GDP) | GC.DOD.TOTL.GD.ZS |
| Lending interest rate | FR.INR.LEND |
| Unemployment, total (% of labour force) | SL.UEM.TOTL.ZS |
| Unemployed, total | SL.UEM.TOTL |
| Labor force, total | SL.TLF.TOTL.IN |
| Poverty $2.15/day (2017 PPP) | SI.POV.DDAY |
| Poverty, national line | SI.POV.NAHC |
| Population, total | SP.POP.TOTL |
| Population 0–14 (% of total) | SP.POP.0014.TO.ZS |
| Population 15–64 (% of total) | SP.POP.1564.TO.ZS |
| Population 65+ (% of total) | SP.POP.65UP.TO.ZS |
| Life expectancy at birth | SP.DYN.LE00.IN |
| Maternal mortality ratio | SH.STA.MMRT |
| Under-5 mortality rate | SH.DYN.MORT |
| Prevalence of undernourishment | SN.ITK.DEFC.ZS |
| Land area | AG.LND.TOTL.K2 |
| Surface area | AG.SRF.TOTL.K2 |

---

## 5. TypeScript Types (Key Domain Variables)

From `src/types.ts`; these type names represent structured data used across the application.

| Type / interface | Definition | Location in app |
|------------------|------------|-----------------|
| `Frequency` | Time-series frequency (weekly, monthly, quarterly, yearly). | Timeline sections (Unified, Macro economic/health, Labour, Population Structure), Global Charts. |
| `MetricId` | Union of all numeric metric IDs. | Map metric toolbar, Business Analytics X/Y selectors, metric metadata. |
| `TimePoint` | Single point in a time series (date, year, value). | All timeline and chart components. |
| `MetricSeries` | Time series for one metric (id, label, unit, points). | TimeSeriesSection, MacroIndicatorsTimelineSection, LabourUnemploymentTimelineSection, PopulationStructureSection, GlobalChartsSection. |
| `CountrySummary` | Country metadata (name, codes, region, currency, government, etc.). | SummarySection, chatContext, pestelContext, ChatbotSection, PESTELSection. |
| `CountryDashboardData` | Full dashboard payload for one country (summary, range, series, latestSnapshot). | useCountryDashboard, SummarySection, all Country tab sections. |
| `GlobalCountryMetricsRow` | One row of global metrics for one country-year. | WorldMapSection, AllCountriesTableSection, GlobalChartsSection, BusinessAnalyticsSection, correlationAnalysis. |
| `CountryYearSnapshot` | Snapshot of all metrics for one country-year. | chatFallback, chatContext, PESTEL context. |

---

## 6. Data Quality and Fallbacks

- **Latest non-null:** The dashboard uses the latest non-null value up to the selected end year.
- **Year fallback:** The global loader steps backwards when a chosen year has no data.
- **Territory fallback:** 30+ territories use the parent country for inflation and interest rate (see `TERRITORY_FALLBACK_PARENT` in `worldBank.ts`).
- **IMF fallback:** Government debt (% GDP) and GDP (nominal) when World Bank returns empty.
- **Missing display:** "–" for null; no NaN or broken charts.

For full business rules and edge cases, see `docs/PRD.md` (Section 5) and `docs/PRODUCT_METRICS.md` (Section 9).

---

## 7. Variable Relationships and Usage in the App

This section describes how variables **connect to each other** (e.g. derived metrics) and how they **flow through the application** from data sources to the UI.

### 7.1 Derived Variables

Some variables are **derived** from other variables (in the API layer or in the UI). The table below lists the derivation relationship for data lineage.

| Variable name | Friendly name | Formula | Input variables |
|---------------|---------------|---------|-----------------|
| `gdpNominalPerCapita` | GDP per Capita (Nominal, US$) | GDP / Population | `gdpNominal`, `populationTotal` |
| `gdpPPPPerCapita` | GDP per Capita (PPP, Intl$) | GDP (PPP) / Population | `gdpPPP`, `populationTotal` |
| `govDebtUSD` | Government debt (USD) | GDP × (Gov. debt % GDP / 100) | `gdpNominal`, `govDebtPercentGDP` |
| `populationByAgeAbsolute` | Population by age group (absolute count) | Total population × (Age-group share % / 100) | `populationTotal`, `pop0_14Share` / `pop15_64Share` / `pop65PlusShare` |

All other data metrics in Section 1 are **primary** (sourced directly from World Bank WDI, IMF, REST Countries, Sea Around Us, or Marine Regions).

### 7.2 Variable Relationship Chart (Derivation)

The following diagram shows how **derived variables** depend on **primary variables**. Arrows point from inputs to the derived metric.

```mermaid
flowchart LR
  subgraph Primary["Primary variables"]
    gdpNominal[gdpNominal]
    gdpPPP[gdpPPP]
    populationTotal[populationTotal]
    govDebtPercentGDP[govDebtPercentGDP]
    pop0_14[pop0_14Share]
    pop15_64[pop15_64Share]
    pop65[pop65PlusShare]
  end
  subgraph Derived["Derived variables"]
    gdpPC[gdpNominalPerCapita]
    gdpPPPpc[gdpPPPPerCapita]
    govDebtUSD[govDebtUSD]
    popByAge[populationByAgeAbsolute]
  end
  gdpNominal --> gdpPC
  populationTotal --> gdpPC
  gdpPPP --> gdpPPPpc
  populationTotal --> gdpPPPpc
  gdpNominal --> govDebtUSD
  govDebtPercentGDP --> govDebtUSD
  populationTotal --> popByAge
  pop0_14 --> popByAge
  pop15_64 --> popByAge
  pop65 --> popByAge
```

### 7.3 Variable Usage Flow in the App

The following diagram shows how variables **flow from data sources** into **data structures** and then into **app areas** (screens and features).

```mermaid
flowchart TB
  subgraph Sources["Data sources"]
    WDI[World Bank WDI]
    IMF[IMF WEO]
    REST[REST Countries]
    SAU[Sea Around Us / Marine Regions]
  end
  subgraph DataLayer["Data layer"]
    CDD[CountryDashboardData]
    GCM[GlobalCountryMetricsRow]
    Meta[metricMetadata.ts]
  end
  subgraph AppAreas["App areas"]
    Summary[Country Dashboard: Summary]
    Timeline[Country Dashboard: Timelines]
    Compare[Country Comparison]
    Map[Global: Map]
    Table[Global: Table]
    Charts[Global: Charts]
    BA[Business Analytics]
    PESTEL[PESTEL context]
    Chat[Analytics Assistant]
    Source[Source tab]
  end
  WDI --> CDD
  WDI --> GCM
  IMF --> CDD
  IMF --> GCM
  REST --> CDD
  SAU --> GCM
  CDD --> Summary
  CDD --> Timeline
  CDD --> Compare
  CDD --> PESTEL
  CDD --> Chat
  GCM --> Map
  GCM --> Table
  GCM --> Charts
  GCM --> BA
  Meta --> Source
  Meta --> Chat
```

**Legend:** **CountryDashboardData** feeds the Country Dashboard (Summary, Timelines, Country Comparison), PESTEL context, and Analytics Assistant context. **GlobalCountryMetricsRow** feeds the Global map, table, Global Charts, and Business Analytics scatter. **metricMetadata.ts** feeds the Source tab and Assistant system prompt.

### 7.4 Quick Reference: Variable → App Area

| App area | Variables used (key) |
|----------|----------------------|
| **Summary (General)** | region, incomeLevel, governmentType, headOfGovernmentType, capitalCity, currency, timezone, landAreaKm2, totalAreaKm2, eezKm2 |
| **Summary (Financial)** | gdpNominal, gdpPPP, gdpNominalPerCapita, gdpPPPPerCapita, govDebtPercentGDP, govDebtUSD, inflationCPI, interestRate, unemploymentRate, povertyHeadcount215, povertyHeadcountNational |
| **Summary (Health & demographics)** | populationTotal, pop0_14Share, pop15_64Share, pop65PlusShare, lifeExpectancy, maternalMortalityRatio, under5MortalityRate, undernourishmentPrevalence |
| **Unified Timeline** | gdpNominal, gdpPPP, gdpNominalPerCapita, gdpPPPPerCapita, populationTotal, lifeExpectancy |
| **Macro Indicators (economic)** | inflationCPI, interestRate, govDebtPercentGDP, unemploymentRate, povertyHeadcount215, povertyHeadcountNational |
| **Macro Indicators (health)** | maternalMortalityRatio, under5MortalityRate, undernourishmentPrevalence |
| **Labour timeline** | unemployedTotal, labourForceTotal |
| **Population Structure** | populationTotal, pop0_14Share, pop15_64Share, pop65PlusShare, populationByAgeAbsolute |
| **Country Comparison** | All financial, population, health, geography (selected country vs average vs global) |
| **Global map** | Any numeric metric + region, governmentType (from Map metric selector) |
| **Global table** | All metrics per country-year (General, Financial, Health & demographics columns) |
| **Global Charts** | Same as Global table, aggregated (unified, economic, health, population-structure series) |
| **Business Analytics** | Any two numeric metrics as X and Y (from global dataset) |
| **PESTEL / Analytics Assistant** | Country context (summary + metrics) and global data; location/geography from LLM and web search, not stored variables |
| **Source tab** | All variables documented in metric cards (Financial, Population, Health, Geography, Country metadata & context) |
