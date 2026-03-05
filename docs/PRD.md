# Product Requirements Document (PRD) – Country Analytics Platform

**Version:** 1.8  
**Last updated:** March 2026

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

Six main tabs:

- **Country dashboard** – Single-country deep dive
- **Global analytics** – Map and global tables (no correlation scatter in this tab)
- **PESTEL** – Generate and view PESTEL analysis for the selected country with structured sections and sources
- **Business Analytics** – Multi-metric correlation scatter (X/Y axes, highlight country), year selector, and correlation & causation analysis (Pearson r, p-value, interpretation)
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
  - **Health & demographics**: Total population, life expectancy, 0–14 / 15–64 / 65+ breakdown, child and maternal mortality, prevalence of undernourishment + YoY

#### 4.2.2 Year Range Filter

- Editable Start and End; clamped to [DATA_MIN_YEAR, DATA_MAX_YEAR]
- Presets: Full range, Last 10 years, Last 5 years
- Commit on Enter or blur

#### 4.2.3 Unified Time-Series Timeline

- Metrics: Core structural metrics – GDP Nominal, GDP PPP, GDP per capita (Nominal & PPP), Population, Life expectancy
- Frequency: Weekly, monthly, quarterly, annual (sub-annual interpolated)
- Metric chips to toggle series; tooltip with period-over-period change (WoW/MoM/QoQ/YoY)

#### 4.2.4 Macro Indicators Timeline

- Inflation (CPI), Lending interest rate, Government debt (% GDP), Unemployment rate, Poverty headcount ($2.15/day and national line), Under‑5 mortality, Maternal mortality, Prevalence of undernourishment
- Same frequency and resampling as unified timeline

#### 4.2.5 Labour / Unemployment Timeline

- Labour and unemployment metrics with same frequency and resampling as macro indicators timeline

#### 4.2.6 Population Pie

- 0–14, 15–64, 65+ with % and absolute counts for latest snapshot year

#### 4.2.7 Country Comparison Table

- Selected country vs average vs global total
- Toggle: Core metrics vs + Population age breakdown
- YoY for each metric

### 4.3 Global Analytics

#### 4.3.1 Common Behaviour

- Year filter independent of country dashboard
- Tabs: Map vs Global table

#### 4.3.2 Global Map

- **Metric selector**: 20+ metrics across Financial (GDP, debt, inflation, interest, unemployment, poverty), Demographics & Health (population, age structure, life expectancy), Geography, Government
- Choropleth shading; tooltip: country name, flag, metric value, effective year
- Map does not sync with country dashboard selection

#### 4.3.3 Global Tables

- **General**: Country (with flag emoji), Code, Region, Government type, Head of government, Total area, EEZ
- **Financial**: Country (with flag emoji), GDP Nominal, GDP PPP, GDP/Capita, GDP/Capita PPP, Gov. debt (USD), Inflation, Gov. debt (% GDP), Lending rate, Unemployment rate, Poverty headcount ($2.15/day and national line) + YoY
- **Health & demographics**: Country (with flag emoji), Pop total, Pop 0–14, Pop 15–64, Pop 65+, Life expectancy, Under‑5 mortality, Maternal mortality, Prevalence of undernourishment + YoY
- All numeric columns sortable asc/desc
- Code column hidden in Financial and Health views

#### 4.3.4 Business Analytics (Dedicated Tab)

- **Correlation scatter**: X and Y metric selectors; choose any two numeric metrics from the global dataset (e.g. GDP per capita vs life expectancy). Plot all countries as points; selected country (from Country dashboard) highlighted.
- **Year selector**: Data year for scatter and correlation (defaults to dashboard end year).
- **Correlation & causation analysis**: Pearson correlation coefficient (r), approximate p-value, interpretation text, and causation/context note with disclaimer that correlation does not imply causation.
- **Use case**: Inspect correlation and outliers across countries; explore market positioning; hypothesis generation.

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

### 4.6 PESTEL Analysis

- **Tab**: Dedicated PESTEL tab in main navigation
- **Input**: Selected country (from Country dashboard); optional refresh
- **Output**: Structured analysis with the following **section order**:
  1. **PESTEL Analysis** – Chart with bullet points per PESTEL factor (Political, Economic, Social, Technological, Environmental, Legal)
  2. **SWOT Analysis** – 2×2 grid with **one bullet per sentence** for Strengths, Weaknesses, Opportunities, Threats
  3. **Comprehensive Analysis** – Full report (excluding extracted sections below) with source
  4. **Strategic Implications for Business (PESTEL-SWOT)** – Narrative from the PESTEL–SWOT matrix
  5. **New Market Analysis** – **At least 5 bullet points** (market attractiveness, peer comparison, strategic implications)
  6. **Key Takeaways** – **At least 5 bullet points** summarising opportunities and threats
  7. **Recommendations** – **At least 5 bullet points** (investors, businesses, policymakers, risk mitigation, priority actions)
- **Context**: Uses country context and dashboard data; generation via LLM (same infrastructure as Analytics assistant)
- **Behaviour**: User triggers generate/refresh; response rendered in tab with clear sectioning and attribution
- **Bullet minimums**: Prompt and guidelines require New Market Analysis, Key Takeaways, and Recommendations each to have at least 5 bullet points

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
- Extended correlation views (e.g. correlation matrix, clustering, advanced filtering) building on the current scatterplot
- Additional providers (OECD, WHO) with ETL precedence rules
- Saved dashboards and shareable URLs
