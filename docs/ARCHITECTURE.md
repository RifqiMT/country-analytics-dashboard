# Architecture – Country Analytics Platform

This document describes the data flow, component boundaries, and technical architecture of the Country Analytics Platform.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx (Root)                            │
│  - Main tabs (Country | Global | Source | Chat)                  │
│  - Global state: mainTab, globalViewTab, mapMetricId, year       │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┬──────────────────┐
        ▼                           ▼                           ▼                  ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐   ┌───────────────┐
│   Country     │           │   Global     │           │   Source      │   │   Analytics   │
│   Dashboard   │           │   Analytics  │           │   Tab         │   │   Assistant   │
│               │           │               │           │               │   │   (Chat)      │
│ - Selector   │           │ - Map         │           │ - Search      │   │ - Chatbot     │
│ - YearRange  │           │ - MapMetric  │           │ - Filter chips│   │   Section     │
│ - Summary    │           │ - MapSection │           │ - Metric cards│   │ - Suggestions │
│ - TimeSeries │           │ - AllCountries│          │               │   │ - Model/Key   │
│ - Macro      │           │   TableSection │          │               │   │   settings    │
│ - Population │           │               │           │               │   │               │
│ - CountryTable│          │               │           │               │   │               │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘   └───────┬───────┘
        │                           │                           │                  │
        └───────────────────────────┼───────────────────────────┘                  │
                                    ▼                                             │
                    ┌───────────────────────────────┐                              │
                    │   useCountryDashboard hook    │◄─────────────────────────────┘
                    │   - countryCode, year range   │   (dashboardData passed to ChatbotSection)
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
                    │   - OpenAI API (if key set)     │
                    │   - chatFallback.ts (else)      │
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
         ├─► fetchIndicatorSeries(countryCode, indicator, ...) × 14 indicators
         │         └─► World Bank /country/{code}/indicator/{id}
         │
         ├─► [If territory with empty data] fetch from parent country
         │         └─► TERRITORY_FALLBACK_PARENT map
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
         ├─► [API key available] → OpenAI API
         │         └─► systemPrompt from buildChatSystemPrompt(chatContext.ts)
         │         └─► Context: metric metadata, country summary, global data
         │
         └─► [No API key] → getFallbackResponse(chatFallback.ts)
                   └─► Rule-based: rankings, comparisons, single-metric, methodology, regions
         │
         ▼
Response streamed (LLM) or returned (fallback)
         │
         ▼
ChatbotSection renders message
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
└── PopulationPieSection
    └── PieChart (Recharts)
└── MacroIndicatorsTimelineSection
    └── LineChart (Recharts)
└── CountryTableSection
```

### 3.2 Global Analytics

```
App
└── MapMetricToolbar
└── WorldMapSection
    └── ComposableMap (react-simple-maps)
    └── Geographies
└── AllCountriesTableSection
    └── Table (General | Financial | Health)
```

### 3.3 Source Tab

```
App
└── SourceSection
    └── Search input
    └── Filter chips
    └── Suggestions dropdown
    └── Metric cards (by category)
```

### 3.4 Analytics Assistant

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
| `chatFallback.ts` | `getFallbackResponse()` – rule-based answers for rankings, comparisons, methodology |
| `vite-plugin-chat-api.ts` | `/api/chat` middleware – proxies to OpenAI or fallback |

### 4.4 Key Data Structures

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

### 7.3 Global Metrics

- Gov debt and lending rate: world median when country has no data
- Latest non-null: used for sparse indicators (inflation, interest, gov debt)

### 7.4 Analytics Assistant Fallback

When no OpenAI API key is set, `chatFallback.ts` provides rule-based answers for:

- Single-metric lookups ("What is Indonesia's GDP?")
- Rankings ("Top 10 countries by GDP per capita")
- Comparisons ("Compare Indonesia to Malaysia")
- Region filters ("Top 5 Asian countries by GDP")
- Growth rankings (YoY when two years of data exist)
- Methodology questions
- Catch-all for data-style questions
