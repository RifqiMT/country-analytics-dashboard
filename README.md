# Country Analytics Platform

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)](https://vitejs.dev/)

An **analyst-grade web application** for exploring country-level financial, demographic, and health metrics from 2000 to the latest available year. Powered by **World Bank WDI**, **IMF WEO**, **REST Countries**, **Sea Around Us**, and other trusted public data sources.

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
- **Ask** natural-language questions via the Analytics Assistant with cascading logic: **Dashboard data → Groq → Tavily (web search) → other LLMs**

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
| **Country dashboard** | Deep dive on a single country with summary cards, timelines, macro indicators, labour/unemployment, and comparison |
| **Global analytics** | Interactive choropleth map, full global country table, and **global macro charts** (unified, economic, health, population structure aggregates) for cross-country comparison |
| **PESTEL** | Generate and view PESTEL analysis: PESTEL chart, SWOT Analysis (sentence-level bullets), Comprehensive Analysis, Strategic Implications (PESTEL–SWOT), New Market Analysis, Key Takeaways, Recommendations (≥5 bullets each). Uses **most up-to-date** global data (DATA_MAX_YEAR) and current-year web supplement; **download PESTEL and SWOT charts as PNG** |
| **Business Analytics** | Multi-metric correlation scatter (X/Y axes, highlight country), year selector, and correlation & causation analysis (Pearson r, p-value, interpretation) |
| **Source** | Metric definitions, formulas, data source links, and Analytics Assistant flow |
| **Analytics assistant** | Chat for questions about metrics, methodology, location/geography, and general knowledge |

---

## 2. Product Benefits

- **Fast insights** – Single-country summary with YoY deltas in seconds
- **Credible data** – World Bank WDI, IMF WEO, REST Countries, Sea Around Us; fallbacks for territories
- **Intuitive UX** – Searchable country selector, year presets, frequency toggles
- **Transparent methodology** – Source tab documents every metric with formulas and source links
- **AI-assisted analysis** – Analytics assistant with **cascading logic**: Dashboard data first for all metrics the dashboards/tables cover; for anything outside that or when global data cannot answer, use **Groq** first, then **Tavily (web search)**, then other LLMs. Tavily Web Search is also selectable as a model.
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
| **Population structure** | Timeline of population by age group (0–14, 15–64, 65+): shares (% of total) and simplified absolute counts (derived from total × share). Frequency dropdown, chart/table view, metric chips; tooltip and table show % and absolute (e.g. 25.3% · 65.2 Mn). World Bank WDI. |
| **Country comparison table** | Selected country vs average vs global total; optional age breakdown; YoY for each metric |

### 3.2 Global Analytics

| Feature | Description |
|---------|-------------|
| **Map view** | Choropleth with 20+ metrics across Financial (GDP, debt, inflation, interest, unemployment, poverty), Demographics & Health (population, age structure, life expectancy), Geography, and Government. **Zoom** in/out and reset; **hover** shows country name, flag (proportionally on shape), metric value, effective year. |
| **Year selector** | Independent of country dashboard |
| **Global table** | General (area, region, government type, head of government), Financial (GDP, debt, inflation, lending rate, unemployment, poverty + YoY), Health & demographics (population, age groups, life expectancy, under‑5 mortality, maternal mortality, undernourishment + YoY) |
| **Global charts** | Aggregated global time-series: unified (GDP, GDP per capita, population, life expectancy), economic (inflation, debt, interest, unemployment, poverty), health (under‑5, maternal mortality, undernourishment), population structure (age-group shares). Frequency and chart/table view. |
| **Sorting** | All numeric columns sortable asc/desc; flag emojis in country column |

### 3.3 PESTEL

| Feature | Description |
|---------|-------------|
| **PESTEL tab** | Dedicated view for PESTEL (Political, Economic, Social, Technological, Environmental, Legal) analysis of the selected country; **download PESTEL and SWOT charts as PNG** |
| **Section order** | PESTEL Analysis (chart), SWOT Analysis (one bullet per sentence), Comprehensive Analysis (full report), Strategic Implications for Business (PESTEL-SWOT), New Market Analysis, Key Takeaways, Recommendations |
| **Bullet minimums** | New Market Analysis, Key Takeaways, and Recommendations each have at least 5 bullet points (enforced via prompt) |
| **Generate / refresh** | Trigger generation with current country context; responses include sources and hyperlinks where applicable |
| **Context-aware** | Uses selected country and dashboard data; global metrics and peer comparison use **DATA_MAX_YEAR** (most up-to-date); supplemental web search uses **current year** |

### 3.4 Business Analytics

| Feature | Description |
|---------|-------------|
| **Correlation scatter** | Choose X and Y metrics; plot all countries; highlight selected country (from Country dashboard); inspect correlation |
| **Year selector** | Data year for scatter and correlation (syncs with dashboard year by default) |
| **Correlation & causation analysis** | Pearson correlation coefficient (r), approximate p-value, interpretation text, and causation/context note with disclaimer |
| **Country highlight** | Selected country from Country dashboard is highlighted on the scatter; changing country updates highlight |

### 3.5 Source Tab

| Feature | Description |
|---------|-------------|
| **Where metrics and information appear** | Collapsible (minimisable) section describing how data is used in Country Dashboard, Global view (map, table, Global Charts), PESTEL, Business Analytics, and Analytics Assistant; users can expand or minimise via the section header |
| **Search** | By metric name, description, formula, or source |
| **Filter chips** | World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO |
| **Suggestions dropdown** | Matching metrics when typing; click to scroll to metric |
| **Metric cards** | Grouped by category: Financial, Population, Health, Geography, **Country metadata & context** (region, income level, government type, head of government, capital, currency, timezone, location & geographic context). Each card: label, description, formula, unit, source links with external-link icons |

### 3.6 Analytics Assistant (Chat)

| Feature | Description |
|---------|-------------|
| **Year-based routing** | Period ≤ current year − 2 → Groq; period after (or "now") → Tavily (web search) first |
| **Model selection** | Multiple providers (OpenAI, Groq, Anthropic, Google, OpenRouter, **Tavily Web Search**); tiers: Best, Balanced, Fast |
| **Source attribution** | Each response shows source: "Dashboard data", model label, or "Web search" |
| **Context-aware** | Uses metric metadata, selected country context, and global data |
| **Out-of-scope handling** | Religion, culture, leaders, capital, language, **location/geography** (e.g. "Where is X?", "Which continent?", "Neighbouring countries") routed to LLM/web search; never answered with dashboard metrics |
| **Suggestions** | Quick-start prompts for common questions |

### 3.7 Data Fallbacks

- **IMF WEO** – Government debt and GDP when World Bank has no data
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

- **vite-plugin-chat-api.ts** – Custom Vite plugin adding `/api/chat` middleware; cascading routing (Dashboard data → Groq → Tavily → other LLMs) with year-based rules

---

## 5. Architecture

### 5.1 High-Level Flow

```
User → App.tsx (tabs: Country | Global | PESTEL | Business Analytics | Chat | Source)
         ↓
    useCountryDashboard (country, year range)
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
| `src/api/imf.ts` | IMF DataMapper fallbacks (gov debt, GDP) |
| `src/components/*` | SummarySection, TimeSeriesSection, MacroIndicatorsTimelineSection (economic & health variants), LabourUnemploymentTimelineSection, PopulationStructureSection, CountryTableSection, WorldMapSection, MapMetricToolbar, AllCountriesTableSection, PESTELSection, BusinessAnalyticsSection, CorrelationScatterPlot, SourceSection, ChatbotSection |
| `src/utils/chatContext.ts` | System prompt builder for LLM |
| `src/utils/chatFallback.ts` | Rule-based fallback for dashboard-style questions |
| `src/utils/pestelContext.ts` | PESTEL prompt building and generation context for selected country |
| `src/utils/correlationAnalysis.ts` | Pearson correlation and causation interpretation for Business Analytics |
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
| **World Bank WDI** | GDP, population, health, geography, inflation, interest, gov debt |
| **IMF WEO** | Fallback for GDP and government debt |
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

### 6.5 Product Logic & Guidelines

- **Product logic** (what the product does, why, and how features behave) is defined in `docs/PRD.md` (scope, features, data rules, business guidelines).
- **Documentation standard**: All product and technical documentation is structured according to `docs/PRODUCT_DOCUMENTATION_STANDARD.md`, which covers document ownership, content guidelines (README, PRD, personas, user stories, metrics, variables, architecture), feature→code mapping, and security.
- **Security**: Do not publish API keys or key-provisioning URLs in docs or code; use `.env` and `.env.example` placeholders only.

---

## 7. Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
cd country-analytics-dashboard
npm install
npm run setup   # creates .env from .env.example if missing
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

### Analytics Assistant

The **Analytics assistant** tab uses cascading, year-based routing:

1. **Dashboard data** – Rule-based answers for rankings, comparisons, time-series summaries, and methodology (no keys required)
2. **Groq (Llama 3.3 70B)** – General-knowledge questions about period ≤ current year − 2 (e.g. "in 2023"), or when dashboard data cannot answer
3. **Tavily (web search)** – Latest or current-period questions (e.g. "now", explicit near-current years) and general-knowledge not covered by Groq or dashboard data
4. **Other LLMs** – User-selected models (OpenAI, Anthropic, Google, OpenRouter, etc.); **Tavily Web Search** is also available as a direct model

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
| [docs/VARIABLES.md](docs/VARIABLES.md) | All variables: **variable name**, **friendly name**, definition, formula, **location in the app**, example; **relationship chart** (derivation and app flow) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow and component architecture |

---

## Credits

**Developed, managed, and maintained by [Rifqi Tjahyono](https://rifqi-tjahyono.com/)**  
[LinkedIn](https://www.linkedin.com/in/rifqi-tjahjono/) · [Personal Website](https://rifqi-tjahyono.com/)
