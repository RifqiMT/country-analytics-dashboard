# Variables Documentation – Country Analytics Platform

This document lists **all variables** used in the application: **data metrics** (displayed in the UI), **configuration constants**, and **environment variables**. Each entry includes variable name, definition, formula (where applicable), and example.

**Related:** Per-metric metadata for the Source tab is defined in `src/data/metricMetadata.ts`. For engagement and OKR metrics, see `METRICS_AND_OKRS.md`. For product data metrics overview, see `PRODUCT_METRICS.md`.

---

## 1. Data Metrics (UI Variables)

These variables correspond to metrics shown in the Country Dashboard, Global view (map, table, charts), Business Analytics, PESTEL context, and Analytics Assistant. IDs match `MetricId` and related types in `src/types.ts`.

### 1.1 Financial

| Variable name | Definition | Formula | Example |
|---------------|------------|---------|---------|
| `gdpNominal` | Gross domestic product at market prices, current US$ | GDP = C + I + G + (X − M); converted at official exchange rates | 1.4T USD (Indonesia 2023) |
| `gdpPPP` | GDP in international dollars (PPP) | GDP (PPP) = GDP × PPP conversion factor | 4.2T Intl$ |
| `gdpNominalPerCapita` | GDP per person, current US$ | GDP / Population | 5,100 USD |
| `gdpPPPPerCapita` | GDP per person, PPP | GDP (PPP) / Population | 15,200 Intl$ |
| `inflationCPI` | Annual % change in consumer price index | ((CPI_t − CPI_{t−1}) / CPI_{t−1}) × 100 | 3.5% |
| `interestRate` | Bank lending rate (annual average) | Reported as annual average of bank lending rates | 8.2% |
| `govDebtPercentGDP` | General government gross debt as % of GDP | (Total government debt / GDP) × 100 | 39.2% |
| `govDebtUSD` | Government gross debt in current US$ | GDP × (Gov. debt % GDP / 100) | 548B USD |
| `unemploymentRate` | Unemployed as % of labour force | (Unemployed / Labour force) × 100 | 5.4% |
| `unemployedTotal` | Number of people unemployed, seeking work | Labour force × (Unemployment rate / 100) or ILO-modelled | 7.2M people |
| `labourForceTotal` | Total labour force (employed + unemployed seeking work) | Employed + Unemployed (seeking work) | 134M people |
| `povertyHeadcount215` | % of population below $2.15/day (2017 PPP) | Share with consumption/income below $2.15/day | 2.5% |
| `povertyHeadcountNational` | % of population below national poverty line | Share below country-specific poverty line | 9.4% |

### 1.2 Population

| Variable name | Definition | Formula | Example |
|---------------|------------|---------|---------|
| `populationTotal` | Total population (de facto) | Census and intercensal estimates; UN projections | 277M people |
| `pop0_14Share` | Population aged 0–14 as % of total | (Pop 0–14 / Total population) × 100 | 24.1% |
| `pop15_64Share` | Population aged 15–64 as % of total | (Pop 15–64 / Total population) × 100 | 68.2% |
| `pop65PlusShare` | Population aged 65+ as % of total | (Pop 65+ / Total population) × 100 | 7.7% |
| `populationByAgeAbsolute` | Absolute count per age band (0–14, 15–64, 65+) | Total population × (Age-group share % / 100) | 66.8M (0–14) |

### 1.3 Health

| Variable name | Definition | Formula | Example |
|---------------|------------|---------|---------|
| `lifeExpectancy` | Life expectancy at birth (years) | Period life expectancy from mortality tables | 69.2 years |
| `maternalMortalityRatio` | Maternal deaths per 100,000 live births | (Maternal deaths / Live births) × 100,000 | 173 per 100k |
| `under5MortalityRate` | Under-5 deaths per 1,000 live births | Probability of dying before age 5, per 1,000 | 22 per 1,000 |
| `undernourishmentPrevalence` | % of population with insufficient dietary energy | (Insufficient energy intake population / Total) × 100 | 8.4% |

### 1.4 Geography

| Variable name | Definition | Formula | Example |
|---------------|------------|---------|---------|
| `landAreaKm2` | Land area (excluding water bodies, EEZ) | Sum of land surface areas | 1,811,570 km² |
| `totalAreaKm2` | Total surface area (land + inland water) | Land area + inland water bodies | 1,916,907 km² |
| `eezKm2` | Exclusive Economic Zone area | Defined by UN Convention on the Law of the Sea | 6,159,032 km² |

### 1.5 Context / Country Metadata

| Variable name | Definition | Formula | Example |
|---------------|------------|---------|---------|
| `region` | Geographic or economic region | World Bank regional classification | East Asia & Pacific |
| `incomeLevel` | World Bank income classification | Based on GNI per capita | Upper middle income |
| `governmentType` | Form of government | — | Presidential republic |
| `headOfGovernmentType` | Title of chief executive | — | President |
| `capitalCity` | Capital or seat of government | — | Jakarta |
| `currency` | Official currency (code, name, symbol) | — | Indonesian rupiah (IDR) |

---

## 2. Configuration Constants

Defined in `src/config.ts` and used for year bounds and data coverage.

| Variable name | Definition | Formula / Rule | Example |
|---------------|------------|----------------|---------|
| `DATA_MIN_YEAR` | Earliest year for data and filters | Fixed constant | 2000 |
| `DATA_MAX_YEAR` | Latest year considered “available” | currentYear − 2 (data lag assumption) | 2023 (when current year is 2025) |

---

## 3. Environment Variables

Used for API keys and optional server/client configuration. Template: `.env.example`. **Never commit real keys.**

| Variable name | Definition | Formula / Use | Example (placeholder) |
|---------------|------------|---------------|------------------------|
| `GROQ_API_KEY` | Groq API key (server-side) | Used for free-tier LLM when no user key | your-key-here |
| `VITE_GROQ_API_KEY` | Groq API key (client-side, optional) | Baked into build for public/demo | your-key-here |
| `TAVILY_API_KEY` | Tavily API key for web search | Used for real-time and PESTEL supplemental search | your-key-here |
| `SERPER_API_KEY` | Serper API key (alternative web search) | Used when Tavily not set | your-key-here |
| `OPENAI_API_KEY` | OpenAI API key (server-side) | Used when user selects OpenAI model | your-key-here |
| `VITE_OPENAI_API_KEY` | OpenAI API key (client-side, optional) | Baked into build | your-key-here |
| `ANTHROPIC_API_KEY` | Anthropic API key (server-side) | Used for Claude models | your-key-here |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key (client-side, optional) | Baked into build | your-key-here |
| `GOOGLE_AI_API_KEY` | Google AI API key (server-side) | Used for Gemini models | your-key-here |
| `VITE_GOOGLE_AI_API_KEY` | Google AI API key (client-side, optional) | Baked into build | your-key-here |
| `OPENROUTER_API_KEY` | OpenRouter API key (server-side) | Used for OpenRouter models | your-key-here |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key (client-side, optional) | Baked into build | your-key-here |

---

## 4. World Bank Indicator Codes (WDI)

Used by `src/api/worldBank.ts` when calling the World Bank API.

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

From `src/types.ts`; these type names represent structured data used across the app.

| Type / interface | Definition | Example use |
|------------------|------------|-------------|
| `Frequency` | Time-series frequency | `'weekly' \| 'monthly' \| 'quarterly' \| 'yearly'` |
| `MetricId` | Union of all numeric metric IDs | `'gdpNominal' \| 'populationTotal' \| ...` |
| `TimePoint` | Single point in a time series | `{ date, year, value }` |
| `MetricSeries` | Time series for one metric | `{ id, label, unit, points }` |
| `CountrySummary` | Country metadata | iso2, name, region, currency, governmentType, etc. |
| `CountryDashboardData` | Full dashboard payload | summary, range, series, latestSnapshot |
| `GlobalCountryMetricsRow` | One row of global metrics for one year | All metric columns + region, governmentType |
| `CountryYearSnapshot` | Snapshot of all metrics for one country-year | country, year, metrics { financial, population, health, geography } |

---

## 6. Data Quality and Fallbacks

- **Latest non-null:** Dashboard uses latest non-null value up to selected end year.
- **Year fallback:** Global loader steps backwards when a year has no data.
- **Territory fallback:** 30+ territories use parent country for inflation and interest rate (see `TERRITORY_FALLBACK_PARENT` in `worldBank.ts`).
- **IMF fallback:** Government debt (% GDP) and GDP (nominal) when World Bank returns empty.
- **Missing display:** "–" for null; no NaN or broken charts.

For full business rules and edge cases, see `docs/PRD.md` (Section 5) and `docs/PRODUCT_METRICS.md` (Section 9).
