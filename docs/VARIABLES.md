# Variables Documentation

This document covers environment variables, API request variables, key derived variables, and their relationships.

## 1) Environment Variables

| Variable Name | Friendly Name | Definition | Formula / Rule | App Location | Example |
| --- | --- | --- | --- | --- | --- |
| `PORT` | API Port | Backend listening port | Integer parse, defaults to 4000 | `backend/src/index.ts` | `4000` |
| `GROQ_API_KEY` | LLM API Key | Enables Groq model calls | Required for LLM generation paths | `backend/src/llm.ts` | `gsk_***` |
| `TAVILY_API_KEY` | Web Retrieval Key | Enables live web retrieval | Required for Tavily web context | `backend/src/llm.ts` | `tvly-***` |
| `DISABLE_BOOTSTRAP_WARMUP` | Warmup Switch | Disables startup data warmup | `true` skips warmup route | `backend/src/index.ts` | `true` |
| `GROQ_MODEL_*` | Model Overrides | Use-case model selection override | env override > default chain | `backend/src/llm.ts` | `GROQ_MODEL_ASSISTANT=...` |

## 2) API Request Variables

| Variable Name | Friendly Name | Definition | Formula / Rule | App Location | Example |
| --- | --- | --- | --- | --- | --- |
| `countryCode` | Focus Country | ISO3 country context | Uppercase ISO3 validation | Assistant and analysis endpoints | `IDN` |
| `metricX` | Variable 1 / X Metric | First metric in comparison or correlation | Must exist in metric catalog | Business analytics endpoints | `gdp_per_capita` |
| `metricY` | Variable 2 / Y Metric | Second metric in comparison or correlation | Must exist in metric catalog | Business analytics endpoints | `life_expectancy` |
| `start`, `end` | Year Range | Analysis window | Clamped by data bounds | Series/snapshot/comparison endpoints | `2005`, `2026` |
| `excludeIqr` | Outlier Exclusion | Toggle IQR outlier exclusion | Boolean string parse | Correlation endpoints | `true` |
| `webSearchPriority` | Web-First Mode | Force web retrieval priority | True bypasses platform-skip behavior | `/api/assistant/chat` | `true` |

## 3) Key Derived Variables (Product Logic)

| Variable Name | Friendly Name | Definition | Formula | App Location | Example |
| --- | --- | --- | --- | --- | --- |
| `yoy` | Year-over-Year Change | Relative annual change in series value | `(latest - prior) / abs(prior) * 100` | `backend/src/index.ts` | `+4.3%` |
| `correlation` | Pearson Correlation | Linear relationship strength | Pearson r over valid points | `backend/src/correlationGlobal.ts` | `0.62` |
| `rSquared` | Explained Variance Proxy | Share of variance captured by linear fit | `r^2` | `backend/src/correlationGlobal.ts` | `0.38` |
| `residual` | Fit Error | Difference between observed and fitted Y | `y - (intercept + slope*x)` | `backend/src/correlationGlobal.ts` | `-1.7` |
| `% of top` | Relative to Top Metric Value | Country value vs highest value by metric in comparison table | `(value / max(metric_values)) * 100` | deterministic comparison reply | `83.4% of top` |

## 4) Variable Relationship Chart

```mermaid
flowchart TD
  A[countryCode] --> B[fetchCountryBundle]
  X[metricX] --> C[Correlation Engine]
  Y[metricY] --> C
  R[start/end] --> B
  R --> C
  C --> D[correlation, slope, intercept, residuals]
  D --> E[Business narrative endpoint]

  M[Assistant message] --> I[intent classifier]
  I -->|statistics_drill/country_compare| P[Platform data blocks [D#]]
  I -->|general_web / verified| W[Tavily web context [W1]]
  P --> L[LLM prompt]
  W --> L
  L --> O[Assistant reply]
  O --> S[Safety gates + fallback]
```

## 5) Notes

- Canonical metric variable definitions are maintained in `METRIC_CATALOG.md` (sourced from `backend/src/metrics.ts`).
- Keep variable names stable for API consumers; when introducing new variables, document default behavior and validation.
