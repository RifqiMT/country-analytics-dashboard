# Product Requirements Document (PRD) – Country Analytics Platform

**Version:** 1.6  
**Last updated:** March 2025

---

## 1. Problem Statement

Decision-makers, analysts, and researchers often need to compare countries across **financial**, **demographic**, and **basic health** dimensions. Public data is available (e.g. World Bank, IMF, UN) but:

- Raw APIs and downloads are fragmented and difficult to use
- Combining indicators, deriving YoY changes, and building visual comparisons is time-consuming
- Many tools are either too simple (static charts) or too complex (full BI suites)

The **Country Analytics Platform** provides a focused, opinionated UI to:

- Explore a single country in depth
- Compare that country to an average country and global aggregates
- Rank and compare all countries using a consistent set of metrics
- Understand data methodology via the Source tab
- Ask natural-language questions about metrics, methodology, and general knowledge via the Analytics Assistant

---

## 2. Goals and Non-Goals

### 2.1 Goals

| ID | Goal | Description |
|----|------|-------------|
| **G1** | Fast insight for a single country | Clean summary of financial, demographic, health metrics with YoY deltas |
| **G2** | Intuitive global comparison | Sorting, ranking, map and tables with consistent definitions |
| **G3** | Credible and explainable data | Well-documented public sources; clear fallbacks; Source tab with formulas and source links |
| **G4** | Analyst-friendly UX | Smooth time navigation, frequency toggles, search, filter chips |
| **G5** | AI-assisted analysis | Analytics assistant with year-based routing (Groq for period ≤ current year − 2, Tavily for recent/current), Tavily as selectable model, and source attribution |

### 2.2 Non-Goals (Current Version)

- No user authentication, multi-tenant features, or saved workspaces
- No offline mode or CSV/image export from the UI
- No in-app ETL merging multiple primary providers beyond World Bank + IMF fallbacks
- Taiwan excluded (no World Bank WDI coverage)

---

## 3. Personas Summary

See `USER_PERSONAS.md` for full detail.

| Persona | Role | Primary Need |
|---------|------|--------------|
| **P1** | Regional Strategy Lead | Quick comparisons for board reports |
| **P2** | Country Economist / Policy Analyst | Structural trends, narratives |
| **P3** | Market Expansion Manager | Market size, growth, demographics |
| **P4** | Data / BI Analyst | First-pass exploration, validation |

---

## 4. Scope and Features

### 4.1 Main Navigation

Four main tabs:

- **Country dashboard** – Single-country deep dive
- **Global analytics** – Map and global tables
- **Source** – Metric definitions, formulas, data source links, Analytics Assistant flow
- **Analytics assistant** – Chat for questions about metrics, methodology, and general knowledge

### 4.2 Country Dashboard

#### 4.2.1 Summary Header

- **Inputs**: Selected country (ISO2; default `ID`), year range (default 2000–DATA_MAX_YEAR)
- **Outputs**:
  - Country name, ISO2, ISO3, flag, region, income level, capital city
  - Data window text (e.g. "2000–2024")
  - **General**: Timezone, currency (name, code, symbol), land area, total area, EEZ
  - **Economy**: Currency with symbol alongside name and code
  - **Financial**: GDP Nominal, GDP PPP, GDP per capita (Nominal & PPP), Gov. debt (USD), Gov. debt (% GDP), Inflation, Lending rate, Unemployment rate, Poverty headcount ($2.15/day and national line) + YoY
  - **Health & demographics**: Total population, life expectancy, 0–14 / 15–64 / 65+ breakdown + YoY, plus under‑5 mortality, maternal mortality ratio, and prevalence of undernourishment where available

#### 4.2.2 Year Range Filter

- Editable Start and End; clamped to [DATA_MIN_YEAR, DATA_MAX_YEAR]
- Presets: Full range, Last 10 years, Last 5 years
- Commit on Enter or blur

#### 4.2.3 Unified Time-Series Timeline

- Metrics: GDP Nominal, GDP PPP, GDP per capita (Nominal & PPP), Population, Life expectancy
- Frequency: Weekly, monthly, quarterly, annual (sub-annual interpolated)
- Metric chips to toggle series; tooltip with period-over-period change (WoW/MoM/QoQ/YoY)

#### 4.2.4 Macro Indicators Timeline

- Metrics: Inflation (CPI), Government debt (% GDP), Lending interest rate, Unemployment rate, Poverty headcount ($2.15/day and national line), under‑5 mortality rate, maternal mortality ratio, prevalence of undernourishment
- Same frequency and resampling as unified timeline (weekly, monthly, quarterly, yearly; sub‑annual views interpolated)

#### 4.2.5 Population Pie

- 0–14, 15–64, 65+ with % and absolute counts for latest snapshot year

#### 4.2.6 Country Comparison Table

- Selected country vs average vs global total
- Toggle: Core metrics vs + Population age breakdown
- YoY for each metric

### 4.3 Global Analytics

#### 4.3.1 Common Behaviour

- Year filter independent of country dashboard
- Tabs: Map vs Global table

#### 4.3.2 Global Map

- **Metric selector**: Rich set of metrics across Financial (GDP, debt, inflation, lending rate, unemployment, poverty), Demographics & Health (population, age structure, life expectancy, under‑5 and maternal mortality, undernourishment), Geography (land area, total area, EEZ), and Government (region, government type, head of government)
- Choropleth shading; tooltip: country name, flag, metric value, effective year
- Map does not sync with country dashboard selection

#### 4.3.3 Global Tables

- **General**: Country (with flag emoji), Code, Region, Government type, Head of government, Total area, EEZ
- **Financial**: Country (with flag emoji), GDP Nominal, GDP PPP, GDP/Capita, GDP/Capita PPP, Gov. debt (USD), Inflation, Gov. debt (% GDP), Lending rate, Unemployment rate, Poverty headcount ($2.15/day), Poverty headcount (national line) + YoY
- **Health & demographics**: Country (with flag emoji), Pop total, Pop 0–14, Pop 15–64, Pop 65+, Life expectancy, under‑5 mortality rate, maternal mortality ratio, prevalence of undernourishment + YoY
- All numeric columns sortable asc/desc
- Code column hidden in Financial and Health views

### 4.4 Source Tab

- **Analytics Assistant flow**: Documents year-based routing (Groq for period ≤ current year − 2, Tavily for recent/current)
- **Search**: By metric name, description, formula, or source (dynamic filtering)
- **Filter chips**: World Bank, IMF, Sea Around Us, Marine Regions
- **Suggestions dropdown**: Matching metrics when typing; click to scroll to metric
- **Metric cards**: Label, description, formula, unit, source links with external-link icons

### 4.5 Analytics Assistant

#### 4.5.1 Cascading Flow (Year-Based Routing)

**Cutoff:** current year − 2. Questions about period ≤ cutoff use Groq; period after (or "now") use Tavily first.

| Step | Source | When Used |
|------|--------|-----------|
| 1 | **Dashboard data** | Rule-based answers for rankings, comparisons, single-metric lookups, methodology; or when rule-based returns generic help for out-of-scope questions |
| 2 | **Web search (Tavily/Serper)** | General-knowledge about period **after** current year − 2 (e.g. "now", "2026"); or when **Tavily Web Search** is selected as model |
| 3 | **Groq (Llama 3.3 70B)** | General-knowledge about period ≤ current year − 2 (e.g. "in 2023"); or when web search fails |
| 4 | **Other LLMs** | User-selected model (OpenAI, Anthropic, Google, OpenRouter, **Tavily Web Search**) when user or server key is set |

#### 4.5.2 Source Attribution

Each response displays a source label:

- **Dashboard data** – Rule-based answers from World Bank, IMF, Sea Around Us data
- **Model label** – e.g. "Llama 3.3 70B (Groq)", "GPT-4o"
- **Web search** – Tavily or Serper results

#### 4.5.3 Out-of-Scope Handling

Queries about religion, culture, leaders, capital, language, independence day, etc. are **not** answered with dashboard metrics. They are routed to Groq or web search. Rule-based fallback returns generic help with setup instructions.

#### 4.5.4 Context and Behaviour

- **Context**: Uses selected country summary, global data (top 50 by GDP, top 20 by GDP per capita), metric metadata
- **Suggestions**: Quick-start prompts (e.g. "Compare Indonesia to Malaysia", "Top 10 countries by GDP")
- **Settings**: Model selection (including **Tavily Web Search**); API key input (localStorage)
- **General-knowledge**: LLM instructed to use Wikipedia links; not mention "Dashboard data"

---

## 5. Data Rules and Edge Cases

### 5.1 Data Sources

| Source | Purpose |
|--------|---------|
| World Bank WDI | Primary: GDP, population, health, geography, inflation, interest, gov debt |
| IMF WEO | Fallback for GDP and government debt when WB empty |
| REST Countries | Timezone, currency, area, government type, head of government |
| Sea Around Us / Marine Regions | EEZ (static data) |

### 5.2 Fallbacks

- **IMF**: Government debt (% GDP), GDP (Nominal) when World Bank returns empty
- **Territory parent**: 30+ territories (e.g. American Samoa, Andorra, British Virgin Islands) use parent country for inflation and interest rate when WB empty

### 5.3 Missing Data

- If a year has no data, global loader steps backwards until data found
- Countries with no data show "–"; sorting puts nulls at bottom when descending
- Charts and tables handle null gracefully; no crashes

### 5.4 Country Naming

- Palestine (West Bank and Gaza) for PSE
- Taiwan excluded (no WDI coverage)

---

## 6. Non-Functional Requirements

### 6.1 Performance

- Initial country dashboard load < 2.5s on typical broadband
- Global tables load < 3s for any valid year
- UI interactions (filters, toggles) feel instantaneous; debounce year inputs

### 6.2 Resilience

- Network failures show friendly error banners
- Partial data: components handle null; show "–" where needed
- Never crash on undefined series

### 6.3 Accessibility

- Sufficient contrast (light palette)
- Keyboard navigation for country search, toggles, pills
- ARIA labels on interactive elements

---

## 7. Tech Guidelines

- **Types**: `src/types.ts` for domain types
- **API layer**: `src/api/*`; never call APIs from components
- **Formatting**: `src/utils/numberFormat.ts`, `src/utils/timeSeries.ts`
- **Metric metadata**: `src/data/metricMetadata.ts` for Source tab
- **Chat**: `src/utils/chatContext.ts`, `src/utils/chatFallback.ts`, `vite-plugin-chat-api.ts`, `src/config/llm.ts`
- **Config**: Add required keys to `.env`; see `.env.example` for variable names; never commit real keys

---

## 8. Business Guidelines

- **Data credibility**: All metrics cite primary sources (World Bank, IMF, Sea Around Us); Source tab documents every formula and link
- **Transparency**: Analytics Assistant responses show source attribution (Dashboard data, model label, or Web search)
- **Out-of-scope handling**: Religion, culture, leaders, capital, language queries are routed to LLM/web search – never answered with dashboard metrics
- **Territory handling**: 30+ territories use parent-country fallback for inflation/interest when World Bank returns empty
- **Country naming**: Palestine (West Bank and Gaza) for PSE; Taiwan excluded (no WDI coverage)

---

## 9. Future Work (Not Yet Implemented)

- Export (CSV, image)
- Deep-dive correlation workspaces (saveable scatterplot configurations and narratives)
- Additional providers (OECD, extended WHO / UN datasets) with ETL precedence rules
- Saved dashboards and shareable URLs
