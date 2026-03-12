# Country Analytics Platform

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)](https://vitejs.dev/)

An **analyst-grade web application** for exploring country-level financial, demographic, health, and education metrics from 2000 to the latest available year. Powered by **World Bank WDI**, **IMF WEO**, **UNESCO UIS** (via WDI), **REST Countries**, **Sea Around Us**, and other trusted public data sources. Government debt (% of GDP) is filled automatically from **IMF WEO** when World Bank has no data (e.g. China).

---

## Table of Contents

- [Product Overview](#1-product-overview)
- [Product Benefits](#2-product-benefits)
- [Features](#3-features)
- [Tech Stack](#4-tech-stack)
- [Architecture](#5-architecture)
- [Data Sources & Business Rules](#6-data-sources--business-rules)
- [Getting Started](#7-getting-started)
- [Development Guidelines](#8-development-guidelines)
- [Documentation Index](#9-documentation-index)

---

## 1. Product Overview

### 1.1 Core Value Proposition

The Country Analytics Platform provides a **single, unified interface** to:

- **Explore** a country in depth across GDP, population, age structure, life expectancy, government debt, and geography
- **Compare** countries with time trends, YoY changes, cross-country rankings, and side-by-side comparisons
- **Understand** data methodology via the Source tab with descriptions, formulas, and source links
- **Ask** natural-language questions via the Analytics Assistant with cascading logic: **Dashboard data first** for all metrics the dashboards and tables cover; for supplementary and general-knowledge answers: **TAVILY (web search) first** for latest information, **GROQ second** as the primary LLM, then **other LLMs** as fallback. Source attribution is shown for every response. **Porter 5 Forces** and **PESTEL** use the same order (TAVILY supplement then GROQ) for industry and country strategy reports.

### 1.2 Target Audience

| Audience | Use Case |
|----------|----------|
| **Strategy & analytics teams** | Board reports, regional planning, market prioritisation |
| **Country / regional heads** | Quick country snapshots and peer comparisons |
| **Economists & policy analysts** | Trend analysis, structural shifts, research validation |
| **Market expansion managers** | Market sizing, demographic structure, growth evaluation |
| **Researchers & students** | Clean, explorable interface over public macro data |

### 1.3 Key Views

| View | Description |
|------|-------------|
| **Country dashboard** | Deep dive on a single country with summary cards, timelines, macro indicators, **Education Enrollment & Teaching Workforce**, **Schools & universities (institution counts)**, labour/unemployment, population structure, and comparison |
| **Global analytics** | Interactive choropleth map, full global country table, and **global macro charts** (unified, economic, health, **Education Enrollment & Teaching Workforce**, **Schools & Universities (Institution Counts)**, population structure aggregates). **Region filter**: dynamic, searchable filter limits map, table, and charts to one region (or "All regions") for focused comparison. |
| **PESTEL** | Generate and view PESTEL analysis: PESTEL chart, SWOT Analysis (sentence-level bullets), Comprehensive Analysis, Strategic Implications (PESTEL–SWOT), New Market Analysis, Key Takeaways, Recommendations (≥5 bullets each). Uses **most up-to-date** global data (DATA_MAX_YEAR) and current-year web supplement; **download PESTEL and SWOT charts as PNG** |
| **Porter 5 Forces** | Generate Porter Five Forces analysis by country and ILO/ISIC industry division; **Porter's Five Forces chart** (standard cross layout with five bullet points per force); **Comprehensive Analysis**; **New Market Analysis** (5 bullets); **Key Takeaways** (5 bullets); **Recommendations** (5 bullets); inline citations only; TAVILY → GROQ → others |
| **Business Analytics** | **Year range** (start–end, inclusive); multi-metric correlation scatter (X/Y axes, highlight country); **data preparation** (missing removed, IQR outliers flagged or excluded); scatter **title** "Scatter Plot: [X] vs [Y] | Corr = [r]" with **trend line and 95% CI**; **correlation & causation analysis**: executive summary table (Pearson r, P-value, R², Beta), strength band (weak/moderate/strong), **residuals vs fitted** plot, **subgroup by region** table, explicit "Correlation does NOT imply causation" disclaimer, **actionable insight**, and **next steps** when causation is not supported |
| **Source** | Metric definitions, formulas, data source links, and Analytics Assistant flow |
| **Analytics assistant** | Chat for questions about metrics, methodology, location/geography, and general knowledge |

---

## 2. Product Benefits

- **Fast insights** – Single-country summary with YoY deltas in seconds
- **Credible data** – World Bank WDI, IMF WEO, REST Countries, Sea Around Us; fallbacks for territories
- **Intuitive UX** – Searchable country selector, year presets, frequency toggles
- **Transparent methodology** – Source tab documents every metric with formulas and source links
- **AI-assisted analysis** – Analytics Assistant uses **Dashboard data first** for in-scope metrics; for general-knowledge and supplementary information: **TAVILY (web search) first** for real-time data, **GROQ second** as the primary LLM, then **other LLMs**. PESTEL uses the same order: TAVILY supplement (current year) then GROQ to generate the report. Source attribution on every response.
- **Source attribution** – Each chat response shows its source (Dashboard data, model name, or Web search)
- **No login required** – Public data, no authentication or workspace setup

---

## 3. Features

### 3.1 Country Dashboard

| Feature | Description |
|---------|-------------|
| **Country selector** | Search by name, ISO2, or ISO3; keyboard navigation; suggestive filter |
| **Year range** | Start/End (2000–currentYear−2); presets: Full, Last 10, Last 5 |
| **Summary section** | General (region, income, government, capital, timezone, currency, geography), Financial (GDP, debt, inflation, interest, unemployment, poverty + YoY), Health & demographics (population, life expectancy, age groups, child & maternal mortality, undernourishment + YoY) |
| **Unified time-series** | Line chart for core structural metrics (GDP levels & per-capita, population, life expectancy); frequency: weekly/monthly/quarterly/yearly; metric chips; chart/table view; tooltip with period-over-period change |
| **Macro indicators timeline** | **Economic & financial**: Inflation, lending interest rate, government debt (% GDP), unemployment, poverty. **Health** (separate section): Under‑5 mortality, maternal mortality, undernourishment. Each section has independent frequency dropdown and chart/table view; metric chips to show/hide series. |
| **Unemployed & labour force timeline** | Unemployed (number) and labour force (total) with dual Y-axis; same frequency and view options as macro sections; metric chips; growth (WoW/MoM/QoQ/YoY) in tooltip and table |
| **Education Enrollment & Teaching Workforce** | Education metrics (out-of-school, completion, minimum reading proficiency, adult literacy, GPI, **trained teachers**, education expenditure) in a dedicated Education timeline with the same UI pattern as Macro Indicators (frequency dropdown, chart/table view, metric chips). Teacher-focused series (primary, secondary, tertiary) are clearly labelled as teachers, not institutions. |
| **Schools & universities (institution counts)** | Dedicated subsection for **estimated numbers of primary schools, secondary schools, and tertiary institutions**. Uses derived metrics `primarySchoolCount`, `secondarySchoolCount`, `tertiaryInstitutionCount` calculated from enrollment using typical average sizes (250 pupils per primary school, 500 per secondary school, 5,000 students per tertiary institution). UI mirrors **Unemployed & labour force**: independent frequency, chart/table views, metric chips, export to PNG (chart) or CSV (table). Labels and tooltips clearly indicate that counts are **estimated** and based on UNESCO UIS enrollment via World Bank WDI. |
| **Population structure** | Timeline of population by age group (0–14, 15–64, 65+): shares (% of total) and simplified absolute counts (derived from total × share). Frequency dropdown, chart/table view, metric chips; tooltip and table show % and absolute (e.g. 25.3% · 65.2 Mn). World Bank WDI. |
| **Country comparison table** | Selected country vs average vs global total; optional age breakdown; YoY for each metric |

**Country trends & timelines** (the timeline subsections above) and **Global Charts** support **chart view → PNG export** and **table view → CSV export**. Summary cards and Country Comparison table also support PNG/CSV. PESTEL and SWOT charts, and the Porter's Five Forces chart, support **PNG download**. All export filenames use a **sanitised segment** (alphanumeric and hyphens only) for country/scope and section name (e.g. `Indonesia-Macro-Indicators-2024-chart.png`); see `src/utils/filename.ts` (`sanitizeFilenameSegment`) and PRD §4.8.

### 3.2 Global Analytics

| Feature | Description |
|---------|-------------|
| **Region filter** | Dynamic, searchable region dropdown (e.g. East Asia & Pacific, Sub-Saharan Africa). Limits map, global table, and global charts to the selected region; "All regions" shows worldwide data. |
| **Map view** | Choropleth with 20+ metrics across Financial (GDP, debt, inflation, interest, unemployment, poverty), Demographics & Health (population, age structure, life expectancy), Education, Geography, and Government. **Zoom** in/out and reset; **hover** shows country name, flag (proportionally on shape), metric value, effective year. Respects region filter. |
| **Year selector** | Independent of country dashboard |
| **Global table** | General (area, region, government type, head of government), Financial (GDP, debt, inflation, lending rate, unemployment, poverty + YoY), Health & demographics (population, age groups, life expectancy, under‑5 mortality, maternal mortality, undernourishment + YoY). Sortable columns; respects region filter. |
| **Global charts** | Aggregated global time-series: unified (GDP, GDP per capita, population, life expectancy), economic (inflation, debt, interest, unemployment, poverty), health (under‑5, maternal mortality, undernourishment), **Education Enrollment & Teaching Workforce** (teacher and enrollment-focused indicators), **Schools & Universities (Institution Counts)** (estimated counts of primary schools, secondary schools, tertiary institutions), and population structure (age-group shares). Frequency and chart/table view. Data respects region filter; education institution counts use the same derived assumptions (250/500/5,000) and clearly indicate they are estimates, not official UIS institution tallies. |
| **Sorting** | All numeric columns sortable asc/desc; flag emojis in country column |

### 3.3 PESTEL

| Feature | Description |
|---------|-------------|
| **PESTEL tab** | Dedicated view for PESTEL (Political, Economic, Social, Technological, Environmental, Legal) analysis of the selected country; **download PESTEL and SWOT charts as PNG** (filenames sanitised; see export convention above) |
| **Section order** | PESTEL Analysis (chart), SWOT Analysis (one bullet per sentence), Comprehensive Analysis (full report), Strategic Implications for Business (PESTEL-SWOT), New Market Analysis, Key Takeaways, Recommendations |
| **Bullet minimums** | New Market Analysis, Key Takeaways, and Recommendations each have at least 5 bullet points (enforced via prompt) |
| **Generate / refresh** | Trigger generation with current country context; responses include sources and hyperlinks where applicable |
| **Context-aware** | Uses selected country and dashboard data; global metrics and peer comparison use **DATA_MAX_YEAR** (most up-to-date); supplemental web search uses **current year** |

### 3.4 Porter 5 Forces

| Feature | Description |
|---------|-------------|
| **Porter 5 Forces tab** | Dedicated view for Porter Five Forces analysis of the selected country in a chosen **ILO/ISIC industry division** (e.g. Manufacture of food products, Construction). Uses **latest global data** (DATA_MAX_YEAR) and **TAVILY → GROQ → others** for generation. |
| **Section order** | Output is displayed in this order: **Porter's Five Forces Analysis** (chart), **Comprehensive Analysis** (Executive Summary + five forces narrative), **New Market Analysis** (5 bullets), **Key Takeaways** (5 bullets), **Recommendations** (5 bullets), then **Top 10 Products** and **Top 10 Companies** tables. Each bullet section is in its own card; each table appears in its own card beneath the narrative sections. |
| **Porter's Five Forces chart** | **Standard framework layout**: centre hub = Competitive Rivalry; top / left / right / bottom = Threat of New Entry, Supplier Power, Buyer Power, Threat of Substitution. Each force displays **five bullet points** of summarised analysis. Thin connectors point toward the centre. Chart appears first when the model outputs the chart summary block. |
| **Country + industry selector** | Same country as Country dashboard; **industry dropdown** grouped by ILO section (A–U) with division-level options (2-digit division code + label). Default division: 10 (Manufacture of food products). |
| **Narrative structure** | **Chart summary** (5 bullets per force, parsed for the chart) then **Executive Summary** (1 paragraph) and **five forces**, each with exactly two paragraphs; then **New Market Analysis**, **Key Takeaways**, and **Recommendations**, each with exactly 5 summarized bullet points. No horizontal rule (---) in output. |
| **Top 10 Products** | A Markdown table listing the **latest top 10 products** associated with the selected country and industry, sorted by **revenue/market size in descending order**. Columns: Product (linked), Description, Manufacturer (linked), Market/Revenue with year, Sources (hyperlinked references). Rendered as a responsive HTML table in its own card. |
| **Top 10 Companies** | A Markdown table listing the **latest top 10 companies** most relevant to the selected country and industry, sorted by **revenue/market size in descending order**. Columns: Company (linked), Description, Market/Revenue with year, Sources (hyperlinked references). Layout and styling mirror the **Top 10 Products** section. |
| **Citations** | **All citations and sources are inline** (merged into the narrative with Markdown hyperlinks). No separate "Sources" section or bullet list at the end. |
| **Generate / refresh** | User triggers generation; response shows the chart (if parsed), then Comprehensive Analysis, New Market Analysis, Key Takeaways, Recommendations, and the **Top 10 Products/Companies** tables in separate cards, plus source attribution (e.g. Llama 3.1 8B (Groq)). **Download Porter's Five Forces chart as PNG** (sanitised filename; see export convention in §3.1). |

### 3.5 Business Analytics

| Feature | Description |
|---------|-------------|
| **Year range** | Start year and end year (inclusive); data from all years in range are combined (each country–year is a point). Syncs with dashboard on load; user can change range. |
| **Exclude IQR outliers** | Checkbox to remove points flagged as outliers (univariate IQR: &gt;1.5×IQR from Q1/Q3 on X or Y). When unchecked, outliers remain in the scatter and correlation. |
| **Correlation scatter** | X and Y metric selectors; plot uses cleaned data (missing removed; optionally excluding IQR outliers). Selected country highlighted. **Chart title**: "Scatter Plot: [X] vs [Y] | Corr = [r]". **Trend line** (linear regression) and **95% confidence interval** band. |
| **Data preparation** | Summary: points removed for missing X/Y; count of IQR-outlier points flagged; points used (n) after cleaning. |
| **Executive summary table** | Metric | Value | Interpretation: Pearson r, P-value, R², Beta (slope). Strength band: \|r\|&lt;0.3 weak, 0.3–0.7 moderate, &gt;0.7 strong. |
| **Correlation & causation** | Pearson r, p-value, interpretation, and quantified sentence: "A 1-unit increase in X predicts [beta] change in Y (p=…)." **Residuals vs fitted** plot (heteroscedasticity check). **Subgroup analysis by region**: table of r, n, p-value per region (consistency). Explicit **"Correlation does NOT imply causation"** disclaimer; causation/context note; **actionable insight** paragraph; **if causation not supported** recommended next steps (subgroup, time-series, multiple regression, RCTs/IV). |
| **Country highlight** | Selected country from Country dashboard is highlighted on the scatter; changing country updates highlight. |

### 3.6 Source Tab

| Feature | Description |
|---------|-------------|
| **Where metrics and information appear** | Collapsible (minimisable) section describing how data is used in Country Dashboard, Global view (map, table, Global Charts), PESTEL, Business Analytics, and Analytics Assistant; users can expand or minimise via the section header |
| **Search** | By metric name, description, formula, or source |
| **Filter chips** | World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO |
| **Suggestions dropdown** | Matching metrics when typing; click to scroll to metric |
| **Metric cards** | Grouped by category: Financial, Population, Health, Geography, **Country metadata & context** (region, income level, government type, head of government, capital, currency, timezone, location & geographic context). Each card: label, description, formula, unit, source links with external-link icons |

### 3.7 Analytics Assistant (Chat)

| Feature | Description |
|---------|-------------|
| **Year-based routing** | Period ≤ current year − 2 → Groq; period after (or "now") → Tavily (web search) first |
| **Model selection** | Multiple providers (OpenAI, Groq, Anthropic, Google, OpenRouter, **Tavily Web Search**); tiers: Best, Balanced, Fast |
| **Source attribution** | Each response shows source: "Dashboard data", model label, or "Web search" |
| **Context-aware** | Uses metric metadata, selected country context, and global data. For **time-series questions** over a specific range (e.g. "from 2010 to 2024"), the client proactively fetches any missing years within the requested window before calling `/api/chat`, so rule-based summaries can cover the full overlapping years instead of a single point. |
| **Out-of-scope handling** | Religion, culture, leaders, capital, language, **location/geography** (e.g. "Where is X?", "Which continent?", "Neighbouring countries") routed to LLM/web search; never answered with dashboard metrics |
| **Suggestions** | Quick-start prompts for common questions, presented as a **grouped toolbar** (e.g. Country overview, Comparisons & rankings, Time series, Definitions & methodology, Geography & general knowledge, Business & strategy). The toolbar can be **shown/hidden as a whole**, and each group title can be **expanded or collapsed** independently for a clean, professional UX. |

### 3.8 Data Fallbacks

- **IMF WEO** – Government debt (% of GDP) and GDP when World Bank has no data. Government debt is filled via batch and per-country fallback so that countries such as **China** (which often lack World Bank debt series) receive data from IMF WEO automatically.
- **Territory fallbacks** – Inflation and interest rate from parent country (e.g. American Samoa → US) for 30+ territories
- **Taiwan** – Synthetic country entry in the country list; metrics use fallback to parent (e.g. China) or regional/global medians when World Bank WDI has no direct coverage. Metadata from REST Countries where available.

---

## 4. Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 |
| **Language** | TypeScript 5.9 |
| **Build** | Vite 7 |
| **HTTP** | Axios |
| **Charts** | Recharts |
| **Map** | react-simple-maps, d3-geo, d3-scale |
| **Styling** | CSS (App.css, index.css) |

### Key Dependencies

```
axios, d3-geo, d3-scale, html2canvas, react, react-dom, react-simple-maps, recharts
```

### Custom Infrastructure

- **vite-plugin-chat-api.ts** – Custom Vite plugin adding:
  - `/api/chat` middleware; cascading routing (Dashboard data → Groq → Tavily → other LLMs) with year-based rules and explicit source attribution for every answer.
  - `/api/country-dashboard` middleware; **server-side cache** for `CountryDashboardData` with 24‑hour TTL per (`countryCode`, `startYear`, `endYear`, `refreshToken`) key.
  - **Background warm-up** of the country-dashboard cache on server start: `warmDashboardCacheForAllCountries()` fetches the full country list and preloads dashboard data for all countries over `[DATA_MIN_YEAR, DATA_MAX_YEAR]` using a small worker pool. This means that, by default, most countries load from cache the first time they are selected instead of hitting World Bank live.
  - **Explicit refresh hook** for the Country Dashboard: the **"Refresh all data"** button increments a `refreshTrigger`, which is forwarded as `refreshToken` to `/api/country-dashboard`. Any change in `refreshToken` forces a cache miss so that the latest upstream World Bank/IMF/UN/UNESCO data and ETL backfills are re-fetched.
  - `/api/export-global-csv` middleware; runs `scripts/export-global-csv.mjs` to export all global metrics to CSV files under `exports/worldbank/`.
  - `scripts/etl-country-metrics.ts` ETL helper; materialises canonical **country‑year snapshots** (`GlobalCountryMetricsRow[]`) into `etl-cache/country_metrics_{year}.json`. `fetchGlobalCountryMetricsForYear()` prefers these snapshots on the server, keeping Global Analytics and Country Dashboard summary backfills aligned on a single upstream pipeline.

---

## 5. Architecture

### 5.1 High-Level Flow

```
User → App.tsx (tabs: Country | Global | PESTEL | Porter 5 Forces | Business Analytics | Chat | Source)
         ↓
    useCountryDashboard (country, year range)
         ↓
    /api/country-dashboard (server cache, 24h TTL)
         ↓
    fetchCountryDashboardData / fetchGlobalCountryMetricsForYear
         ↓
    worldBank.ts (WDI) + imf.ts (fallbacks) + REST Countries
         ↓
    Components (Summary, TimeSeries, Map, Tables, Business Analytics, Source, Chatbot, PESTEL)
```

### 5.2 Key Modules

| Module | Purpose |
|--------|---------|
| `src/App.tsx` | Layout, main tabs (Country / Global / PESTEL / Business Analytics / Chat / Source), footer |
| `src/hooks/useCountryDashboard.ts` | Data loading, country/year/frequency state (including macro economic, macro health, labour, population-structure frequencies) |
| `src/api/worldBank.ts` | WDI API, global metrics, territory and Taiwan fallbacks |
| `src/api/imf.ts` | IMF DataMapper fallbacks (gov debt with per-country fallback for broad coverage, GDP) |
| `src/components/*` | SummarySection, TimeSeriesSection, MacroIndicatorsTimelineSection (economic & health), EducationTimelineSection, LabourUnemploymentTimelineSection, PopulationStructureSection, CountryTableSection, WorldMapSection, MapMetricToolbar, **RegionFilter**, AllCountriesTableSection, GlobalChartsSection (unified, economic, health, education, population structure), PESTELSection, **Porter5ForcesSection**, BusinessAnalyticsSection, CorrelationScatterPlot, SourceSection, ChatbotSection |
| `src/utils/porter5ForcesContext.ts` | Porter 5 Forces system prompt (country, industry division, global data, Executive Summary + 2 paras per force; inline citations only) |
| `src/utils/chatContext.ts` | System prompt builder for LLM |
| `src/utils/chatFallback.ts` | Rule-based fallback for dashboard-style questions |
| `src/utils/pestelContext.ts` | PESTEL prompt building and generation context for selected country |
| `src/utils/correlationAnalysis.ts` | **Data preparation** (missing removal, IQR outlier flagging/removal), **linear regression** (slope, intercept, R², fitted, residuals, 95% CI), Pearson r, **strength band** (weak/moderate/strong), **subgroup correlations by region**, **executive summary table**, **actionable insight**, and **causation next steps** for Business Analytics |
| `src/utils/timeSeries.ts` | Resampling for timelines |
| `src/config/llm.ts` | LLM model definitions, provider config |
| `src/data/metricMetadata.ts` | Metric descriptions, formulas, source links (including context/country metadata) |
| `src/types.ts` | Domain types |

See `docs/ARCHITECTURE.md` for detailed data flow and component boundaries.

---

## 6. Data Sources & Business Rules

### 6.1 Primary Sources

| Source | Purpose |
|--------|---------|
| **World Bank WDI** | GDP, population, health, geography, inflation, interest, gov debt (where available), education (UNESCO UIS via WDI) |
| **IMF WEO** | Fallback for GDP and government debt when World Bank has no data (e.g. China); per-country request ensures broad coverage |
| **REST Countries** | Timezone, currency, area, government type, head of government |
| **Sea Around Us / Marine Regions** | EEZ (Exclusive Economic Zone) |
| **FlagCDN** | Country flags |

### 6.2 Coverage Window

- `DATA_MIN_YEAR = 2000`
- `DATA_MAX_YEAR = currentYear - 2` (data lag assumption)

### 6.3 Business Rules

- **Latest value**: Dashboard uses latest non-null value up to selected end year
- **Missing years**: Global loader steps backwards until data found
- **Territories**: 30+ territories use parent-country fallback for inflation/interest
- **Taiwan**: Included in country list (synthetic entry); metrics use fallback (e.g. parent or regional medians) when WDI has no direct data; metadata from REST Countries
- **Country naming**: Palestine (West Bank and Gaza) for PSE
- **Source attribution**: Analytics Assistant responses show source (Dashboard data, model label, or Web search)
- **Out-of-scope**: Religion, culture, leaders, capital, language, **location/geography** (e.g. "Where is X located?", "Which continent is Y in?", "Neighbouring countries of Z") routed to LLM/web search – never answered with dashboard metrics

### 6.4 Business Guidelines

- **Data credibility**: All metrics cite primary sources; Source tab documents every formula and link
- **Transparency**: Each chat response displays its source
- **No login required**: Public data, no authentication or workspace setup

All documentation is structured according to the **Product Documentation Standard** (`docs/PRODUCT_DOCUMENTATION_STANDARD.md`), which defines required content (product overview, benefits, features, logics, business and tech guidelines, tech stack) and links to PRD, personas, user stories, metrics, **variables** (including relationship chart), and architecture.

---

## 7. Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
cd country-analytics-platform
npm install
npm run setup   # creates .env from .env.example if missing
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

### Analytics Assistant

The **Analytics assistant** tab uses a cascading, year-based flow:

1. **Dashboard data** – Rule-based answers for rankings, comparisons, time-series summaries, and methodology (no keys required).
2. **TAVILY (web search)** – Latest or current-period questions and supplementary information; used first for real-time context when keys are configured.
3. **GROQ (Llama 3.3 70B)** – Primary LLM for general-knowledge and structured analysis (e.g. PESTEL report generation) when dashboard data cannot answer.
4. **Other LLMs** – User-selected models (OpenAI, Anthropic, Google, OpenRouter, etc.); **Tavily Web Search** is also available as a direct model in the dropdown.

**To enable LLM and web search:**

1. Run `npm run setup` (creates `.env` if missing) or copy `.env.example` to `.env`
2. Add the required environment variables (see `.env.example` for variable names)
3. Obtain keys from each provider's developer console – **never commit real keys**
4. Run `npm run dev` or `npm run preview` (the chat API does **not** run in a static build)

The chat API runs in both dev and preview modes. Users can also add their own keys via **Settings** in the chat tab.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 8. Development Guidelines

### Security

- **Never commit API keys.** Use placeholders in `.env.example`. Store real keys only in `.env` (gitignored).
- **Pre-commit hook**: Run `npm run install-hooks` to block accidental commits of key patterns.
- **Documentation**: Do not publish API keys or URLs to key provisioning pages in docs or code.

### Tech Guidelines

- **Types**: Keep cross-cutting types in `src/types.ts`
- **API layer**: Add integrations in `src/api/*`; never call APIs from components
- **Formatting**: Use `src/utils/numberFormat.ts` and `src/utils/timeSeries.ts` for numbers and resampling
- **Metric metadata**: `src/data/metricMetadata.ts` for Source tab; add new metrics with description, formula, sources
- **Chat**: `src/utils/chatContext.ts`, `src/utils/chatFallback.ts`, `vite-plugin-chat-api.ts`, `src/config/llm.ts`

### Code Conventions

- **Config**: Add required keys to `.env`; see `.env.example` for variable names
- **Error messages**: Use generic "add required keys to .env" – do not list specific variable names in user-facing copy

### Adding Features

1. Update `docs/PRD.md` for new requirements
2. Add user stories to `docs/USER_STORIES.md`
3. Extend `docs/METRICS_AND_OKRS.md` if new events/KPIs
4. Update `src/data/metricMetadata.ts` for new metrics

---

## 9. Documentation Index

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation index and quick links |
| [docs/PRODUCT_DOCUMENTATION_STANDARD.md](docs/PRODUCT_DOCUMENTATION_STANDARD.md) | How we structure and maintain product docs |
| [docs/PRD.md](docs/PRD.md) | Full product requirements document |
| [docs/USER_PERSONAS.md](docs/USER_PERSONAS.md) | Target personas and their needs |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | User stories by feature area |
| [docs/METRICS_AND_OKRS.md](docs/METRICS_AND_OKRS.md) | Engagement metrics, OKRs, instrumentation |
| [docs/PRODUCT_METRICS.md](docs/PRODUCT_METRICS.md) | Data metrics (GDP, population, etc.) with formulas and sources |
| [docs/VARIABLES.md](docs/VARIABLES.md) | All variables: **variable name**, **friendly name**, definition, formula, **location in the app**, **example**; **relationship chart** (how variables connect and flow through the app) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow and component architecture |

---

## Credits

**Developed, managed, and maintained by [Rifqi Tjahyono](https://rifqi-tjahyono.com/)**  
[LinkedIn](https://www.linkedin.com/in/rifqi-tjahjono/) · [Personal Website](https://rifqi-tjahyono.com/)
