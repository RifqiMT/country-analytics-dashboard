# Product Documentation Standard

This document defines the **professional product documentation standard** for the **Country Analytics Platform**. All documentation must cover **product overview**, **product benefits**, **features**, **logics**, **business guidelines**, **tech guidelines**, **tech stacks**, and other elements required for product and engineering alignment. The standard ensures a single source of truth and consistent structure across core and supporting documents. **Professional wording** is used throughout to ease reading and stakeholder alignment.

---

## 1. Purpose

The documentation standard ensures:

- **Product managers and business stakeholders** can understand scope, features, success metrics, and business rules without reading code.
- **Designers and analysts** can align on personas, user stories, and feature behaviour.
- **Engineers** can onboard quickly and understand architecture, data flow, tech stack, and tech guidelines.
- **Single source of truth** for product overview, benefits, feature behaviour, data logic, and non-functional expectations. Wording is kept professional and scannable.

---

## 2. Documentation Structure

### 2.1 Core Documents

| Document | Owner | Purpose |
|----------|-------|---------|
| **README.md** | Engineering | High-level intro, **product overview**, **product benefits**, **features**, quickstart, **tech stack**, data sources, links to deeper docs |
| **docs/PRD.md** | Product | Single source of truth: problem, goals, scope, **features** (Country, Global, PESTEL, **Porter 5 Forces**, Business Analytics, Source, Analytics Assistant), **data rules and logic**, NFRs, **business and tech guidelines** |
| **docs/USER_PERSONAS.md** | Product | Target audiences, goals, pain points, success criteria, typical usage |
| **docs/USER_STORIES.md** | Product | Functional requirements as user stories, grouped by feature; acceptance criteria |
| **docs/METRICS_AND_OKRS.md** | Product | **Product metrics**, **OKR metrics** for the product team, instrumentation guidelines |
| **docs/ARCHITECTURE.md** | Engineering | Data flow, component boundaries, API layer, **tech stack** details |

### 2.2 Supporting Documents

| Document | Purpose |
|----------|---------|
| **docs/README.md** | Documentation index and quick links |
| **docs/PRODUCT_DOCUMENTATION_STANDARD.md** | This document – doc structure, ownership, change policy |
| **docs/PRODUCT_METRICS.md** | **Data metrics** (GDP, population, etc.) with formulas, WDI codes, and source references; how metrics feed the UI |
| **docs/VARIABLES.md** | All variables: **variable name**, **friendly name**, definition, formula, **location in the app**, **example**; **relationship chart** (derivation, data lineage, flow from sources to UI; how variables connect and are used in the app). Porter 5 parsed outputs documented as named variables. |
| **src/data/metricMetadata.ts** | Metric definitions, formulas, source links (code-as-docs for Source tab) |

---

## 3. Required Content Elements

All product and technical documentation should cover the following where applicable:

### 3.1 Product Overview

- **Value proposition**: What the product does and for whom
- **Target audience**: Strategy leads, economists, market managers, BI analysts (see USER_PERSONAS.md)
- **Key views**: Country Dashboard, Global Analytics (map, table, Global Charts), PESTEL, **Porter 5 Forces**, Business Analytics, Source, Analytics Assistant

### 3.2 Product Benefits

- Fast insights; credible data; intuitive UX; transparent methodology; AI-assisted analysis with source attribution; no login required

### 3.3 Features

- Per-tab feature lists with clear descriptions
- Country Dashboard (summary, year range, unified timeline, macro indicators, labour timeline, population structure, comparison table)
- Global Analytics (map, global table, **region filter**, Global Charts)
- PESTEL (generate, section order, chart exports, data recency)
- **Porter 5 Forces** (country + ILO/ISIC industry division, generate, **chart with 5 bullets per force** (standard cross layout), **Comprehensive Analysis**, **New Market Analysis** (5 bullets), **Key Takeaways** (5 bullets), **Recommendations** (5 bullets), inline citations only, **chart PNG export**, TAVILY → GROQ → others)
- **Export behaviour**: Summary cards (PNG, CSV); **Country trends & timelines** subsections (chart view → PNG, table view → CSV); Country Comparison table (CSV); **Global Charts** subsections (chart → PNG, table → CSV); PESTEL chart and SWOT chart (PNG); Porter's Five Forces chart (PNG). **Filename convention**: all export filenames use a **sanitised segment** (alphanumeric and hyphens only) for country/scope and section name, via `sanitizeFilenameSegment()` in `src/utils/filename.ts`; pattern: country/scope + section + year + type (e.g. `Indonesia-Macro-Indicators-2024-chart.png`).
- **Region filter**: Dynamic, searchable region dropdown in Global Analytics; limits map, table, and Global Charts to one region (or "All regions").
- Business Analytics (correlation scatter, **year range** start–end, **data preparation** missing + IQR outliers, **exclude IQR outliers** option, **executive summary table**, **residuals vs fitted**, **subgroup by region**, **actionable insight**, **causation disclaimer** and **next steps**)
- Source tab (where metrics appear, search, filter chips, metric cards)
- Analytics Assistant (cascading flow, source attribution, model selection, out-of-scope handling)

### 3.4 Logics

- **Product logic**: What the product does, why, and how features behave (filters, defaults, fallbacks)
- **Data logic**: Latest non-null, year fallback, territory/IMF fallbacks (including **per-country IMF gov debt fallback** for economies like China when World Bank has no debt series), Taiwan handling
- **Analytics Assistant logic**: Dashboard data first for in-scope metrics; then **TAVILY (web search) first** for latest supplementary information; **GROQ second** as the primary LLM; then other LLMs. Year-based routing; out-of-scope (location/geography, leaders, etc.) never answered with dashboard metrics.

### 3.5 Business Guidelines

- Data credibility: all metrics cite primary sources; Source tab documents every formula and link
- Transparency: each chat response displays source attribution
- Out-of-scope handling: religion, culture, leaders, capital, language, location/geography routed to LLM/web search – never answered with dashboard metrics
- Territory handling: 30+ territories use parent-country fallback for inflation/interest when World Bank returns empty
- Taiwan: included with synthetic country entry; data fallbacks when WDI has no direct coverage
- Country naming: Palestine (West Bank and Gaza) for PSE

### 3.6 Tech Guidelines

- **Types**: `src/types.ts` for domain types
- **API layer**: `src/api/*`; never call APIs from components
- **Formatting**: `src/utils/numberFormat.ts`, `src/utils/timeSeries.ts`
- **Metric metadata**: `src/data/metricMetadata.ts` for Source tab
- **Chat**: `src/utils/chatContext.ts`, `src/utils/chatFallback.ts`, `vite-plugin-chat-api.ts`, `src/config/llm.ts`
- **Config**: Add required keys to `.env`; see `.env.example` for variable names; never commit real keys

### 3.7 Tech Stack

- **Framework**: React 18
- **Language**: TypeScript 5.9
- **Build**: Vite 7
- **HTTP**: Axios
- **Charts**: Recharts
- **Map**: react-simple-maps, d3-geo, d3-scale
- **Styling**: CSS (App.css, index.css)
- **Custom**: vite-plugin-chat-api.ts for `/api/chat` middleware

---

## 4. Document Content Guidelines

### 4.1 README (Root)

Must include: **Product overview** (value proposition, target audience, key views); **Product benefits**; **Features** summary per tab; **Tech stack** (framework, language, build, HTTP, charts, map, styling; key dependencies; custom infrastructure); **Architecture** high-level flow; **Data sources & business rules**; **Getting started** (prerequisites, install, run, API keys, build); **Development guidelines** (security, tech conventions, adding features); **Documentation index**.

### 4.2 PRD (Product Requirements Document)

- Focus on **what** and **why**, not low-level implementation
- Capture: exact behaviour of filters, ranges, default values; all main tabs and sub-features (including **Porter 5 Forces** (country + industry, inline citations only, chart PNG export), Business Analytics and PESTEL section order and bullet requirements); **export behaviour** (what is exported per section—PNG vs CSV—and **filename convention**: sanitised segment for country/scope and section name, e.g. `sanitizeFilenameSegment()` in `src/utils/filename.ts`); data fallbacks; edge cases; Analytics Assistant cascading flow and source attribution; **out-of-scope handling** (location/geography, neighbours – never return dashboard metrics; safe guidance and route to LLM/web search)
- **PESTEL output structure**: PESTEL Analysis chart (downloadable as PNG), SWOT Analysis (sentence-level bullets), Comprehensive Analysis, Strategic Implications, New Market Analysis (≥5 bullets), Key Takeaways (≥5 bullets), Recommendations (≥5 bullets)
- **PESTEL data recency**: DATA_MAX_YEAR for global/peer data; **TAVILY (web search)** for current-year supplemental information; **GROQ** used as the first LLM to generate the report after the supplement is injected into the system prompt.
- Reference primary components and API modules

### 4.3 User Personas

- 3–5 detailed personas with role, goals, pain points, success criteria, typical usage
- Include use of Business Analytics (correlation scatter, causation analysis) and PESTEL where relevant
- Ground in realistic scenarios (e.g. Regional Strategy Lead for APAC)

### 4.4 User Stories

- Independently testable; grouped by UI section: Country dashboard, Global analytics, PESTEL, Business Analytics, Source, Analytics assistant, Time-series
- Map to personas and PRD sections

### 4.5 Metrics & OKRs

- **Product metrics**: North-star and core engagement metrics; feature-level metrics (Country, Global, Business Analytics, Source, Chat, PESTEL)
- **OKR metrics**: Objectives and key results for the product team; measurable key results
- Each product metric: name, definition, owner, source, target where applicable
- Instrumentation event naming convention

### 4.6 Architecture

- High-level data flow diagram (text or Mermaid)
- Component hierarchy and responsibilities (including Business Analytics, PESTEL section structure)
- API layer and external integrations
- Analytics Assistant flow (cascading routing; Tavily Web Search selectable)

### 4.7 Product Metrics (Data) and Variables

- **PRODUCT_METRICS.md**: How metrics feed the UI; per-metric ID, label, unit, formula, fallback; WDI codes and data quality rules
- **VARIABLES.md**: Every variable (data metrics, config, env) with **variable name**, **friendly name**, definition, formula (where applicable), **location in the app**, **example**; and a **relationship chart** showing how variables connect (derived from primary inputs) and flow through the app from data sources to UI areas. Porter 5 parsed outputs (chart summary, New Market Analysis, Key Takeaways, Recommendations bullets) are documented where they represent named variables or structures used in the app.

---

## 5. Versioning and Ownership

### 5.1 Source of Truth

- Latest committed files in `main` are canonical
- External slide decks or docs should reference this repo, not diverge

### 5.2 Ownership

| Domain | Documents |
|--------|-----------|
| **Product** | PRD, USER_PERSONAS, USER_STORIES, METRICS_AND_OKRS |
| **Engineering** | README (tech sections), ARCHITECTURE, config, API docs |
| **Cross-domain** | Major feature changes require co-review |

### 5.3 Change Policy

For every feature PR that changes user-visible behaviour:

| Change Type | Update |
|-------------|--------|
| New requirement | PRD |
| New story or closed story | USER_STORIES |
| New events or KPIs | METRICS_AND_OKRS |
| New metric or source | metricMetadata.ts, PRD, PRODUCT_METRICS, VARIABLES |
| Architecture change | ARCHITECTURE, README |
| New tab or major feature | README, PRD, USER_PERSONAS, USER_STORIES, METRICS_AND_OKRS |

---

## 6. Style and Formatting

- **Markdown** with `###` section headings (never `#` in docs consumed inside codebase)
- Bulleted lists for requirements and acceptance criteria
- Tables for metrics definitions and feature summaries
- **Bold** for key concepts (e.g. **North-star metric**, **In scope**)
- Short, scannable paragraphs; professional wording for ease of reading

---

## 7. Mapping Docs to Code

### 7.1 Feature → Code Mapping

| PRD Section | Primary Components | API / Utils |
|-------------|--------------------|--------------|
| Country dashboard | SummarySection, CountrySelector, YearRangeSelector | worldBank.ts |
| Time-series & macro | TimeSeriesSection, MacroIndicatorsTimelineSection (economic, health), **EducationTimelineSection**, LabourUnemploymentTimelineSection, PopulationStructureSection | worldBank.ts, timeSeries.ts |
| Population structure | PopulationStructureSection (age-group shares + absolute over time) | worldBank.ts, timeSeries.ts |
| Country comparison | CountryTableSection | worldBank.ts |
| Global map | WorldMapSection, RegionFilter (region filter), MapMetricToolbar | worldBank.ts |
| Global tables | AllCountriesTableSection (region prop; respects region filter) | worldBank.ts |
| Global charts | GlobalChartsSection (region prop; unified, economic, health, **education**, population structure; respects region filter) | worldBank.ts, globalAggregates.ts, timeSeries.ts |
| Business Analytics | BusinessAnalyticsSection, CorrelationScatterPlot | worldBank.ts, correlationAnalysis.ts |
| **Porter 5 Forces** | **Porter5ForcesSection** (country + industry selector, **Porter5Chart** with standard cross layout, generate; **Comprehensive Analysis**, **New Market Analysis**, **Key Takeaways**, **Recommendations** in separate cards; inline citations) | **porter5ForcesContext.ts**, **iloIndustrySectors.ts**, LLM via chat API (TAVILY supplement, then GROQ); chart and block parsing (`parsePorter5ChartSummary`, `parseNewMarketAnalysis`, `parseKeyTakeaways`, `parseRecommendations`) and rendering in section |
| PESTEL | PESTELSection (DATA_MAX_YEAR for global data; current year for web supplement) | pestelContext.ts, LLM via chat API; PESTEL/SWOT charts export via html2canvas |
| Source tab | SourceSection | metricMetadata.ts (Financial, Population, Health, Geography, Context). Collapsible "Where metrics and information appear"; search, filter chips, suggestions, metric cards |
| Analytics assistant | ChatbotSection | chatContext.ts, chatFallback.ts, vite-plugin-chat-api.ts, llm.ts (location/geography → safe guidance, not metrics) |

### 7.2 Reading Order

1. README.md → PRD.md → USER_STORIES.md
2. src/App.tsx (layout, tabs: Country, Global, PESTEL, **Porter 5 Forces**, Business Analytics, Analytics Assistant, Source)
3. src/hooks/useCountryDashboard.ts (data flow, frequencies)
4. src/api/worldBank.ts (data definitions, business rules, fallbacks)
5. src/utils/chatContext.ts, chatFallback.ts (analytics assistant)
6. src/utils/porter5ForcesContext.ts, src/data/iloIndustrySectors.ts (Porter 5 Forces)
7. src/utils/pestelContext.ts (PESTEL prompt and generation)
8. src/components/BusinessAnalyticsSection.tsx, CorrelationScatterPlot.tsx, correlationAnalysis.ts (Business Analytics)
9. src/components/SourceSection.tsx, src/data/metricMetadata.ts (Source tab)
10. vite-plugin-chat-api.ts (chat API flow, PESTEL and Porter 5 Forces supplements)

**Product logic and business/tech guidelines:** See PRD (Sections 4–5, 7–8) and README Section 6.

---

## 8. Security and Privacy

- **Never publish API keys** in documentation, code comments, or examples
- Use generic placeholders (e.g. `your-key-here`) in `.env.example`; never commit real keys
- Refer to "obtain from provider's developer console" – do not include URLs to key provisioning pages
- In user-facing copy and error messages, use "add required keys to .env" or "see .env.example" instead of listing specific variable names

---

## 9. Extending This Standard

When adding major functionality (e.g. new health metrics, trade data):

1. **PRD** – New problem/goals, feature requirements, business rules
2. **USER_STORIES** – New stories tagged by persona
3. **METRICS_AND_OKRS** – New metrics, events, OKR updates
4. **metricMetadata.ts** – New metric entries with description, formula, sources
5. **PRODUCT_METRICS** – New data metric tables and WDI codes
6. **VARIABLES** – New variables with name, friendly name, definition, formula, location, example; update relationship chart if derived
7. **README** – Update feature summary if it affects product pitch
8. **ARCHITECTURE** – Update component hierarchy and data flow if needed
