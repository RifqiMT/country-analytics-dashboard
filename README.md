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
- **Ask** natural-language questions via the Analytics Assistant (year-based routing: Groq for period ≤ current year − 2, Tavily for recent/current)

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
| **Global analytics** | Interactive choropleth map and multi-view tables for all countries |
| **PESTEL** | Generate and view PESTEL analysis: PESTEL chart, SWOT Analysis (sentence-level bullets), Comprehensive Analysis, Strategic Implications for Business (PESTEL-SWOT), New Market Analysis, Key Takeaways, Recommendations (at least 5 bullet points each for New Market, Key Takeaways, Recommendations) |
| **Business Analytics** | Multi-metric correlation scatter (X/Y axes, highlight country), year selector, and correlation & causation analysis (Pearson r, p-value, interpretation) |
| **Source** | Metric definitions, formulas, data source links, and Analytics Assistant flow |
| **Analytics assistant** | Chat for questions about metrics, methodology, and general knowledge |

---

## 2. Product Benefits

- **Fast insights** – Single-country summary with YoY deltas in seconds
- **Credible data** – World Bank WDI, IMF WEO, REST Countries, Sea Around Us; fallbacks for territories
- **Intuitive UX** – Searchable country selector, year presets, frequency toggles
- **Transparent methodology** – Source tab documents every metric with formulas and source links
- **AI-assisted analysis** – Analytics assistant with year-based routing: Groq for period ≤ current year − 2, Tavily (web search) for recent/current; Tavily also selectable as a model
- **Source attribution** – Each chat response shows its source (Dashboard data, model name, or Web search)
- **No login required** – Public data, no authentication or workspace setup

---

## 3. Features

### 3.1 Country Dashboard

| Feature | Description |
|---------|-------------|
| **Country selector** | Search by name, ISO2, or ISO3; keyboard navigation |
| **Year range** | Start/End (2000–currentYear−2); presets: Full, Last 10, Last 5 |
| **Summary section** | General (region, income, government, capital, timezone, currency, geography), Financial (GDP, debt, inflation, interest, unemployment, poverty + YoY), Health & demographics (population, life expectancy, age groups, child & maternal mortality, undernourishment + YoY) |
| **Unified time-series** | Line chart for core structural metrics (GDP levels & per-capita, population, life expectancy); frequency: weekly/monthly/quarterly/yearly; metric chips; tooltip with period-over-period change |
| **Macro indicators timeline** | Inflation, lending interest rate, government debt (% GDP), unemployment, poverty, and key health burden metrics (under‑5 mortality, maternal mortality, undernourishment) |
| **Labour / unemployment timeline** | Labour and unemployment metrics with same frequency and resampling as macro timeline |
| **Population pie** | 0–14, 15–64, 65+ with % and absolute counts |
| **Country comparison table** | Selected country vs average vs global total; optional age breakdown |

### 3.2 Global Analytics

| Feature | Description |
|---------|-------------|
| **Map view** | Choropleth with 20+ metrics across Financial (GDP, debt, inflation, interest, unemployment, poverty), Demographics & Health (population, age structure, life expectancy), Geography, and Government |
| **Year selector** | Independent of country dashboard |
| **Map tooltip** | Country name, flag, metric value, effective year |
| **Global table** | General (area, region, government type, head of government), Financial (GDP, debt, inflation, lending rate, unemployment, poverty + YoY), Health & demographics (population, age groups, life expectancy, under‑5 mortality, maternal mortality, undernourishment + YoY) |
| **Sorting** | All numeric columns sortable asc/desc; flag emojis in country column |

### 3.3 PESTEL

| Feature | Description |
|---------|-------------|
| **PESTEL tab** | Dedicated view for PESTEL (Political, Economic, Social, Technological, Environmental, Legal) analysis of the selected country |
| **Section order** | PESTEL Analysis (chart), SWOT Analysis (one bullet per sentence), Comprehensive Analysis (full report), Strategic Implications for Business (PESTEL-SWOT), New Market Analysis, Key Takeaways, Recommendations |
| **Bullet minimums** | New Market Analysis, Key Takeaways, and Recommendations each have at least 5 bullet points (enforced via prompt) |
| **Generate / refresh** | Trigger generation with current country context; responses include sources and hyperlinks where applicable |
| **Context-aware** | Uses selected country and dashboard data to produce structured analysis |

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
| **Analytics Assistant flow** | Documents year-based routing: Groq (period ≤ current year − 2), Tavily (recent/current) |
| **Search** | By metric name, description, formula, or source |
| **Filter chips** | World Bank, IMF, Sea Around Us, Marine Regions |
| **Suggestions dropdown** | Matching metrics when typing; click to scroll to metric |
| **Metric cards** | Label, description, formula, unit, source links with external-link icons |

### 3.6 Analytics Assistant (Chat)

| Feature | Description |
|---------|-------------|
| **Year-based routing** | Period ≤ current year − 2 → Groq; period after (or "now") → Tavily (web search) first |
| **Model selection** | Multiple providers (OpenAI, Groq, Anthropic, Google, OpenRouter, **Tavily Web Search**); tiers: Best, Balanced, Fast |
| **Source attribution** | Each response shows source: "Dashboard data", model label, or "Web search" |
| **Context-aware** | Uses metric metadata, selected country context, and global data |
| **Out-of-scope handling** | Religion, culture, leaders, capital, language routed to LLM/web search; no dashboard metrics |
| **Suggestions** | Quick-start prompts for common questions |

### 3.7 Data Fallbacks

- **IMF WEO** – Government debt and GDP when World Bank has no data
- **Territory fallbacks** – Inflation and interest rate from parent country (e.g. American Samoa → US) for 30+ territories

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
axios, d3-geo, d3-scale, react, react-dom, react-simple-maps, recharts
```

### Custom Infrastructure

- **vite-plugin-chat-api.ts** – Custom Vite plugin adding `/api/chat` middleware; year-based Groq vs Tavily routing

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
| `src/hooks/useCountryDashboard.ts` | Data loading, country/year/frequency state |
| `src/api/worldBank.ts` | WDI API, global metrics, territory fallbacks |
| `src/api/imf.ts` | IMF DataMapper fallbacks (gov debt, GDP) |
| `src/components/*` | Presentational components including ChatbotSection, PESTELSection, BusinessAnalyticsSection, CorrelationScatterPlot |
| `src/utils/chatContext.ts` | System prompt builder for LLM |
| `src/utils/chatFallback.ts` | Rule-based fallback for dashboard-style questions |
| `src/utils/pestelContext.ts` | PESTEL prompt building and generation context for selected country |
| `src/utils/correlationAnalysis.ts` | Pearson correlation and causation interpretation for Business Analytics |
| `src/config/llm.ts` | LLM model definitions, provider config |
| `src/data/metricMetadata.ts` | Metric descriptions, formulas, source links |
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
- **Country naming**: Palestine (West Bank and Gaza); Taiwan excluded (no WDI coverage)
- **Source attribution**: Analytics Assistant responses show source (Dashboard data, model label, or Web search)
- **Out-of-scope**: Religion, culture, leaders, capital, language routed to LLM/web search – never answered with dashboard metrics

### 6.4 Business Guidelines

- **Data credibility**: All metrics cite primary sources; Source tab documents every formula and link
- **Transparency**: Each chat response displays its source
- **No login required**: Public data, no authentication or workspace setup

### 6.5 Product Logic & Guidelines

- **Product logic** (what the product does, why, and how features behave) is defined in `docs/PRD.md` (scope, features, data rules, business guidelines).
- **Documentation and change policy** (how we structure docs, ownership, feature→code mapping) are in `docs/PRODUCT_DOCUMENTATION_STANDARD.md`.
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

The **Analytics assistant** tab uses year-based routing:

1. **Dashboard data** – Rule-based answers for rankings, comparisons, methodology (no keys required)
2. **Tavily (web search)** – General-knowledge about period after current year − 2 (e.g. "now", "2026")
3. **Groq** – General-knowledge about period ≤ current year − 2 (e.g. "in 2023"); or when web search fails
4. **Other LLMs** – User-selected models (OpenAI, Anthropic, etc.); **Tavily Web Search** is also selectable

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
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data flow and component architecture |

---

## Credits

**Developed, managed, and maintained by [Rifqi Tjahyono](https://rifqi-tjahyono.com/)**  
[LinkedIn](https://www.linkedin.com/in/rifqi-tjahjono/) · [Personal Website](https://rifqi-tjahyono.com/)
