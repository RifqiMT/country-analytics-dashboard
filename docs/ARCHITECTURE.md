# Architecture – Country Analytics Platform

This document describes the **data flow**, **component boundaries**, and **technical architecture** of the Country Analytics Platform. It is maintained in line with the **Product Documentation Standard** (`PRODUCT_DOCUMENTATION_STANDARD.md`) and supports engineering onboarding and feature→code mapping. It complements the **tech stack** and **tech guidelines** described in the README and PRD. Professional wording is used throughout for ease of reading.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx (Root)                            │
│  - Main tabs (Country | Global | PESTEL | Porter 5 Forces | Business Analytics | Chat | Source)         │
│  - Global view sub-tabs: Map | Global table | Global Charts                          │
│  - Global state: mainTab, globalViewTab, mapMetricId, year       │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┬──────────────────┬──────────────────┬──────────────┐
        ▼                           ▼                           ▼                  ▼                  ▼                  ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Country     │           │   Global     │           │   PESTEL      │   │ Porter 5 / Biz │   │   Analytics   │   │   Source      │
│   Dashboard   │           │   Analytics  │           │   Tab         │   │ Analytics      │   │   Assistant   │   │   Tab         │
│               │           │               │           │               │   │ - Porter 5     │   │   (Chat)      │   │               │
│ - Selector   │           │ - Map         │           │ - PESTEL      │   │   industry +   │   │ - Chatbot     │   │ - Where data  │
│ - YearRange  │           │ - MapMetric  │           │   Section     │   │   Scatter     │   │   Section     │   │   appears     │
│ - Summary    │           │ - AllCountries│           │ - Generate/   │   │ - X/Y metrics │   │ - Suggestions │   │ - Search      │
│ - TimeSeries │           │   TableSection │          │   Refresh     │   │ - Pearson r   │   │ - Model/Key   │   │ - Filter chips│
│ - Macro      │           │ - Zoom, flag  │           │               │   │   & causation │   │   settings    │   │   (WB, IMF,   │
│   (economic  │           │   on hover    │           │               │   │               │   │               │   │   REST, etc.)  │
│   & health)  │           │               │           │               │   │               │   │               │   │ - Metric cards │
│ - Labour     │           │               │           │               │   │               │   │               │   │   (incl.       │
│   timeline   │           │               │           │               │   │               │   │               │   │   context)     │
│ - Population │           │               │           │               │   │               │   │               │   │               │
│   Structure  │           │               │           │               │   │               │   │               │   │               │
│ - CountryTable│          │               │           │               │   │               │   │               │   │               │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                           │                           │                  │                  │                  │
        └───────────────────────────┼───────────────────────────┼──────────────────┼──────────────────┘                  │
                                    ▼                             │                                     │                  │
                    ┌───────────────────────────────┐              │  (dashboardData / country context) │                  │
                    │   useCountryDashboard hook    │◄──────────────┴─────────────────────────────────────┘                  │
                    │   - countryCode, year range   │
                    │   - frequency, metricIds      │
                    │   - data, loading, error       │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   API Layer                    │
                    │   - worldBank.ts               │
                    │   - imf.ts                     │
                    │   - countryCodes.ts            │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   External APIs                │
                    │   - World Bank WDI             │
                    │   - IMF DataMapper             │
                    │   - REST Countries             │
                    │   - FlagCDN, World Atlas       │
                    └───────────────────────────────┘
                                    │
                                    │   Analytics Assistant
                                    ▼
                    ┌───────────────────────────────┐
                    │   /api/chat (Vite plugin)       │
                    │   - chatFallback.ts (Dashboard) │
                    │   - Groq (Llama 3.3 70B)       │
                    │   - Tavily / Serper (web)       │
                    │   - OpenAI, Anthropic, etc.     │
                    └───────────────────────────────┘
```

---

## 2. Data Flow

### 2.1 Country Dashboard Data Flow

```
User selects country + year range
         │
         ▼
useCountryDashboard.fetchCountryDashboardData(countryCode, startYear, endYear)
         │
         ├─► fetchCountryMetadata(countryCode)
         │         └─► World Bank /country/{code}
         │         └─► REST Countries /alpha/{iso2}
         │
         ├─► fetchIndicatorSeries(countryCode, indicator, ...) × many indicators
         │         └─► World Bank /country/{code}/indicator/{id}
         │
         ├─► [If territory with empty data] fetch from parent country
         │         └─► TERRITORY_FALLBACK_PARENT map
         │
         ├─► [If Taiwan / missing WDI] synthetic country entry; metrics from parent or regional medians
         │         └─► fetchCountryMetadata: REST Countries fallback
         │
         ├─► [If GDP empty] fetchGDPFromIMF(iso3, ...)
         │         └─► IMF DataMapper NGDPD@WEO
         │
         └─► [If gov debt empty] fetchGovernmentDebtSeriesFromIMF(iso3, ...)
                   └─► IMF DataMapper GGXWDG_NGDP@WEO
         │
         ▼
fillSeriesWithFallback, mergeSeriesWithFallback
         │
         ▼
CountryDashboardData (summary, series, latestSnapshot)
         │
         ▼
Components (SummarySection, TimeSeriesSection, etc.)
```

### 2.2 Global Metrics Data Flow

```
User selects year (Global view)
         │
         ▼
fetchGlobalCountryMetricsForYear(year)
         │
         ├─► [Cached?] Return from in-memory cache
         │
         ├─► fetchGlobalIndicatorForYear(indicator, year) × 7
         ├─► fetchGlobalIndicatorLatestUpToYear(indicator, year) × 3
         ├─► fetchGlobalStaticIndicator(indicator) × 2
         ├─► fetchGovernmentDebtFromIMF(iso3Codes, year)
         │
         ▼
Merge by country (ISO3); build GlobalCountryMetricsRow[]
         │
         ▼
WorldMapSection / AllCountriesTableSection
```

### 2.3 Analytics Assistant Data Flow

The assistant uses a **cascading, year-based flow**. Each response includes a **source** label (e.g. "Dashboard data", "Llama 3.3 70B (Groq)", "Web search").

```
User sends message
         │
         ▼
ChatbotSection POST /api/chat
         │
         ├─► Payload: messages, systemPrompt, model, apiKey, dashboardSnapshot, globalData, globalDataByYear
         │
         ▼
vite-plugin-chat-api.ts middleware
         │
         ├─► Step 1: getFallbackResponse(chatFallback.ts)
         │         └─► Rule-based: rankings, comparisons, single-metric lookups, yearly time-series summaries, methodology, regions
         │         └─► If answer found → return { content, source: "Dashboard data" }
         │         └─► If generic help or out-of-scope (leaders, religion, culture, **location/geography**, etc.) → continue
         │
         ├─► Step 2: For PESTEL – fetch TAVILY (web search) supplement first; inject into system prompt
         │
         ├─► Step 3: LLM cascade for questions outside global data
         │         └─► **GROQ (Llama 3.3 70B)** first as primary LLM (for PESTEL, after TAVILY supplement)
         │         └─► **TAVILY / Serper (web search)** for latest or current-period when GROQ unavailable or for supplementary context
         │         └─► If success → return { content, source: model label or "Web search" }
         │
         ├─► Step 4: User-selected LLM (OpenAI, Anthropic, Google, OpenRouter, etc.)
         │         └─► Uses client apiKey or server env key
         │         └─► If success → return { content, source: model label }
         │
         └─► Fallback: Rule-based again with setup hint, except for pure location/geography questions where a safe guidance message is returned instead of metrics
         │
         ▼
ChatbotSection renders message + source line
```

### 2.4 Porter 5 Forces Data Flow

```
User opens Porter 5 Forces tab, selects country (from dashboard) + industry (ILO/ISIC division), clicks Generate
         │
         ▼
Porter5ForcesSection: buildPorter5ForcesSystemPrompt(dashboardData, globalMetrics, industrySectorId)
         │
         ▼
POST /api/chat with porter5ForcesRequest: true, industrySector: "<division label>"
         │
         ├─► fetchPorter5ForcesSupplementWebSearch(countryName, industrySector, year) [TAVILY]
         ├─► Inject supplement into system prompt
         ├─► GROQ (Llama) generates analysis (Chart Summary block with 5 bullets per force, then Executive Summary + 2 paras per force, then ## New Market Analysis, ## Key Takeaways, ## Recommendations each with 5 bullets; inline citations only; no ---)
         └─► Return { content, source: model label }
         │
         ▼
Porter5ForcesSection: parsePorter5ChartSummary(analysis) → { chartData, textWithoutChart }
         ├─► parseNewMarketAnalysis(textWithoutChart) → { newMarketBullets, textAfterNewMarket }
         ├─► parseKeyTakeaways(textAfterNewMarket) → { keyTakeawaysBullets, textAfterKeyTakeaways }
         ├─► parseRecommendations(textAfterKeyTakeaways) → { recommendationsBullets, textForComprehensive }
         ├─► stripTrailingOrphanParagraph(textForComprehensive) → comprehensiveText
         │
         ▼
Display order: Porter5Chart (when chartData present) → Comprehensive Analysis card → New Market Analysis card (5 bullets) → Key Takeaways card (5 bullets) → Recommendations card (5 bullets) → Source attribution (model label)
```

---

## 3. Component Hierarchy

### 3.1 Country Dashboard

```
App
└── CountrySelector
└── YearRangeSelector
└── SummarySection
    └── GeneralCard
    └── FinancialCard
    └── HealthCard
└── TimeSeriesSection
    └── LineChart (Recharts)
    └── CustomTooltip
└── MacroIndicatorsTimelineSection (variant: economic)
    └── LineChart (Recharts)
└── MacroIndicatorsTimelineSection (variant: health)
    └── LineChart (Recharts)
└── LabourUnemploymentTimelineSection
    └── LineChart (Recharts), dual Y-axis
└── PopulationStructureSection
    └── LineChart (Recharts), age-group shares + absolute
└── CountryTableSection
```

### 3.2 Global Analytics

```
App
└── MapMetricToolbar
└── WorldMapSection
    └── ZoomableGroup (zoom, reset)
    └── ComposableMap (react-simple-maps)
    └── Geographies (flag on hover)
└── AllCountriesTableSection
    └── Table (General | Financial | Health)
└── GlobalChartsSection
    └── Unified, economic, health, population-structure aggregates (globalAggregates.ts)
    └── Frequency + chart/table view
```

### 3.3 Business Analytics

```
App
└── BusinessAnalyticsSection
    └── Year selector, highlight country selector
    └── CorrelationScatterPlot
        └── X/Y metric selectors
        └── Scatter chart (Recharts)
    └── Correlation & causation analysis (Pearson r, p-value, interpretation, causation note)
```

### 3.4 Porter 5 Forces Tab

```
App
└── Porter5ForcesSection
    └── Country selector (same as Country dashboard)
    └── Industry dropdown (ILO/ISIC divisions, grouped by section; iloIndustrySectors.ts)
    └── Generate / Refresh button
    └── parsePorter5ChartSummary(analysis) → chartData + textWithoutChart
    └── parseNewMarketAnalysis(textWithoutChart) → newMarketBullets + textAfterNewMarket
    └── parseKeyTakeaways(textAfterNewMarket) → keyTakeawaysBullets + textAfterKeyTakeaways
    └── parseRecommendations(textAfterKeyTakeaways) → recommendationsBullets + textForComprehensive
    └── stripTrailingOrphanParagraph(textForComprehensive) → comprehensiveText
    └── Display order (porter5-sections wrapper):
        ├── Porter5Chart (when chartData present): standard cross layout (centre = Competitive Rivalry; top/left/right/bottom = Threat of New Entry, Supplier Power, Buyer Power, Threat of Substitution); 5 bullets per force; thin connectors to centre
        ├── Comprehensive Analysis card: formatPorterContent(comprehensiveText); inline citations only (stripOptionalSourcesSection); source attribution
        ├── New Market Analysis card: 5 bullets (newMarketBullets)
        ├── Key Takeaways card: 5 bullets (keyTakeawaysBullets)
        └── Recommendations card: 5 bullets (recommendationsBullets)
```

### 3.5 PESTEL Tab

```
App
└── PESTELSection
    └── Country context (from useCountryDashboard)
    └── Global metrics for DATA_MAX_YEAR (most up-to-date peer comparison)
    └── Supplemental web search (current year) via vite-plugin-chat-api
    └── Generate / Refresh button
    └── Rendered output in section order: PESTEL Analysis (chart), SWOT Analysis (sentence-level bullets), Comprehensive Analysis, Strategic Implications for Business (PESTEL-SWOT), New Market Analysis (≥5 bullets), Key Takeaways (≥5 bullets), Recommendations (≥5 bullets)
    └── Chart export: Download PESTEL chart and SWOT chart as high-resolution PNG (html2canvas)
    └── Sources and hyperlinks (where applicable)
```

### 3.6 Source Tab

```
App
└── SourceSection
    └── Where metrics and information appear (collapsible: minimise/expand via header; Country Dashboard, Global, Global Charts, PESTEL, Business Analytics, Analytics Assistant)
    └── Analytics Assistant flow (year-based: Groq for period ≤ current year − 2, Tavily for recent)
    └── Search input
    └── Filter chips (World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO)
    └── Suggestions dropdown
    └── Metric cards (Financial, Population, Health, Geography, Country metadata & context)
```

### 3.7 Analytics Assistant

```
App
└── ChatbotSection
    └── Header (title, model dropdown, settings)
    └── Messages area (user / assistant bubbles)
    └── Welcome + suggestion chips (when empty)
    └── Input form (input, send button)
    └── Settings panel (API key input)
```

---

## 4. API Layer

### 4.1 worldBank.ts

| Function | Purpose |
|----------|---------|
| `fetchIndicatorSeries` | Single indicator for one country over year range |
| `fetchCountryMetadata` | Country metadata from WB + REST Countries |
| `fetchCountryDashboardData` | Full dashboard data for one country |
| `fetchGlobalCountryMetricsForYear` | All countries, one year (cached) |
| `fetchAllCountries` | Country list for selector |

### 4.2 imf.ts

| Function | Purpose |
|----------|---------|
| `fetchGovernmentDebtSeriesFromIMF` | Gov debt % GDP for one country |
| `fetchGovernmentDebtFromIMF` | Gov debt for multiple countries, one year |
| `fetchGDPFromIMF` | Nominal GDP fallback for territories |

### 4.3 Chat Layer

| Module | Purpose |
|--------|---------|
| `chatContext.ts` | `buildChatSystemPrompt()` – system prompt with metric metadata, country context, global data |
| `chatFallback.ts` | `getFallbackResponse()` – rule-based answers for rankings, comparisons, methodology; out-of-scope returns generic help |
| `pestelContext.ts` | PESTEL prompt building; uses DATA_MAX_YEAR for peer comparison; **TAVILY** supplement (current year) fetched first, then **GROQ** to generate report; used by PESTEL tab |
| **porter5ForcesContext.ts** | **Porter 5 Forces prompt building** – country, ILO/ISIC industry division, global data (DATA_MAX_YEAR), Chart Summary + Executive Summary + 2 paras per force + **New Market Analysis** (5 bullets) + **Key Takeaways** (5 bullets) + **Recommendations** (5 bullets); **inline citations only** (no separate Sources section); no --- in output |
| `vite-plugin-chat-api.ts` | `/api/chat` middleware – year-based routing; source attribution; PESTEL and **Porter 5 Forces** generation; **fetchPorter5ForcesSupplementWebSearch()** (TAVILY) then GROQ for Porter 5 Forces |

### 4.4 Business Analytics

| Module | Purpose |
|--------|---------|
| `BusinessAnalyticsSection.tsx` | Tab UI: year selector, highlight country, CorrelationScatterPlot, correlation & causation block |
| `CorrelationScatterPlot.tsx` | X/Y metric selectors, scatter chart, tooltip; uses global metrics for selected year |
| `correlationAnalysis.ts` | `computeCorrelationAnalysis()` – Pearson r, p-value, interpretation text, causation note |

### 4.5 Key Data Structures

- **CountrySummary**: iso2, iso3, name, region, currency, governmentType, headOfGovernmentType, etc.
- **CountryDashboardData**: summary, range, series, latestSnapshot
- **GlobalCountryMetricsRow**: iso2, iso3, name, year, all metric columns, region, governmentType, headOfGovernmentType
- **MetricSeries**: id, label, unit, points (TimePoint[])

---

## 5. Utilities

| Module | Purpose |
|--------|---------|
| `timeSeries.ts` | Resample annual series to weekly/monthly/quarterly |
| `numberFormat.ts` | formatCompactNumber, formatPercentage, formatYearRange |
| `globalAggregates.ts` | Compute global aggregates for GlobalChartsSection (unified, economic, health, population structure) from global metrics |

---

## 6. Configuration

| Config | Value |
|--------|-------|
| `DATA_MIN_YEAR` | 2000 |
| `DATA_MAX_YEAR` | currentYear - 2 |
| Default country | ID (Indonesia) |

---

## 7. Fallback Logic

### 7.1 Territory Fallbacks

30+ territories map to parent country (e.g. AS→US, VG→GB) for inflation and interest rate when World Bank returns empty.

### 7.2 IMF Fallbacks

- **Government debt**: IMF WEO when WB empty
- **GDP**: IMF NGDPD when WB empty (territories)

### 7.3 Taiwan

- **Country list**: Synthetic entry (TW, TWN) added when not in World Bank list so Taiwan appears in selectors and map.
- **Metrics**: When World Bank WDI has no direct data, use fallback (e.g. parent or regional/world medians) per `worldBank.ts` logic.
- **Metadata**: REST Countries used for country metadata when World Bank returns empty.

### 7.4 Global Metrics

- Gov debt and lending rate: world median when country has no data
- Latest non-null: used for sparse indicators (inflation, interest, gov debt)

### 7.5 Analytics Assistant Flow (Year-Based Routing)

**Cutoff:** current year − 2. Implied year from query ("now", explicit year, or no year → "now").

1. **Dashboard data** – `chatFallback.ts` provides rule-based answers for:
   - Single-metric lookups ("What is Indonesia's GDP?")
   - Rankings ("Top 10 countries by GDP per capita")
   - Comparisons ("Compare Indonesia to Malaysia")
   - Region filters ("Top 5 Asian countries by GDP")
   - Growth rankings (YoY when two years of data exist)
   - Methodology questions
   - Out-of-scope (religion, culture, leaders, etc.) returns generic help → triggers next step

2. **Web search (Tavily/Serper)** – For general-knowledge about period after current year − 2 (or "now"); or when Tavily Web Search is selected as model. **TAVILY is used first** for PESTEL supplemental context (current year) before the LLM generates the report.

3. **GROQ** – Llama 3.3 70B as the **primary LLM** (first LLM tried after TAVILY supplement for PESTEL). Used for period ≤ current year − 2, or when web search does not apply. Server env key in .env.

4. **Other LLMs** – User API key or server env keys for OpenAI, Anthropic, Google, OpenRouter.
