# API Reference

This document is the implementation-aligned API contract reference for the backend service.

## Conventions

- Base URL (local): `http://localhost:4000`
- Content type: JSON
- Error shape: `{ "error": "message" }`
- Year values are clamped to platform-supported data ranges.
- Metric IDs must exist in `backend/src/metrics.ts`.

## 1) Health and Metadata

### GET `/api/health`

Purpose: service liveness check.

Response:

```json
{ "ok": true }
```

### GET `/api/metrics`

Purpose: return full metric catalog with short labels.

Response (array):

```json
[
  {
    "id": "gdp_per_capita",
    "label": "GDP per capita (Nominal, current US$)",
    "unit": "US$",
    "source": "World Bank",
    "category": "financial",
    "shortLabel": "GDP per capita"
  }
]
```

### GET `/api/data-providers`

Purpose: return provider metadata used by the platform.

### GET `/api/ilo-isic-divisions`

Purpose: return available ILO ISIC divisions for labor analytics views.

### GET `/api/countries`

Purpose: return valid country list (ISO3 filtered, name sorted).

Common errors:
- `502` provider fetch failed

## 2) Country and Dashboard APIs

### GET `/api/country/:cca3`

Purpose: return country profile with enrichments.

Path params:
- `cca3`: ISO3 country code

Response includes:
- base country profile
- government and head-of-government title (when available)
- `eezSqKm` (for non-landlocked countries where available)
- `worldBankProfile` with income/lending context

Common errors:
- `404` country not found
- `500` internal retrieval error

### GET `/api/country/:cca3/wb-profile`

Purpose: return World Bank country profile object for ISO3.

### GET `/api/dashboard/comparison`

Purpose: return comparison block used by dashboard comparison table.

Query params:
- `cca3` (required): ISO3 country code
- `year` (optional): numeric target year

Common errors:
- `400` invalid or missing `cca3`
- `500` internal error

### GET `/api/country/:cca3/series`

Purpose: return metric series bundle for one country.

Query params:
- `metrics` (optional): comma-separated metric IDs; defaults to all metrics
- `start` (optional): start year
- `end` (optional): end year

Response shape:

```json
{
  "gdp_per_capita": [
    { "year": 2022, "value": 4788.12, "source": "wdi", "isImputed": false }
  ],
  "life_expectancy": [
    { "year": 2022, "value": 71.2, "source": "wdi", "isImputed": false }
  ]
}
```

Common errors:
- `400` unknown metric ID
- `500` internal error

## 3) Global Analytics APIs

### GET `/api/global/snapshot`

Purpose: return global cross-country snapshot for one metric with year fallback.

Query params:
- `metric` (optional, default `gdp`)
- `year` (optional; requested target year)

Response:

```json
{
  "metricId": "gdp",
  "requestedYear": 2025,
  "dataYear": 2023,
  "year": 2023,
  "rows": [
    { "cca3": "IDN", "name": "Indonesia", "value": 1391141234567.8 }
  ]
}
```

Common errors:
- `400` unknown metric

### GET `/api/global/table`

Purpose: return global table view by category and region.

Query params:
- `year` (optional)
- `region` (optional, default `All`)
- `category` (optional, one of `general|financial|health|education`)

Common errors:
- `400` invalid category

### GET `/api/global/wld-series`

Purpose: return world aggregate (`WLD`) series bundle for selected metrics.

Query params:
- `metrics` (required): comma-separated metric IDs
- `start` (optional)
- `end` (optional)

Common errors:
- `400` missing metrics
- `400` unknown metric ID

### GET `/api/compare`

Purpose: return one-metric series for multiple countries.

Query params:
- `countries` (required): comma-separated ISO3 codes
- `metric` (optional, default `gdp_per_capita`)
- `start` (optional)
- `end` (optional)

Response:

```json
{
  "metricId": "gdp_per_capita",
  "series": {
    "IDN": [{ "year": 2020, "value": 3870.56 }],
    "BRA": [{ "year": 2020, "value": 6796.84 }]
  }
}
```

Common errors:
- `400` countries required
- `400` unknown metric

## 4) Operational APIs

### POST `/api/cache/clear`

Purpose: clear in-memory cache and reset warmup gate.

Response:

```json
{ "ok": true }
```

### POST `/api/bootstrap/warm`

Purpose: trigger async cache warmup for country metric bundles.

Response when enabled:

```json
{
  "status": "started",
  "message": "Prefetching full country metric bundles into server cache (runs in background)."
}
```

Response when disabled:

```json
{
  "status": "skipped",
  "reason": "DISABLE_BOOTSTRAP_WARMUP"
}
```

## 5) Assistant API

### POST `/api/assistant/chat`

Purpose: generate grounded assistant answer for ranking/comparison/overview/general web questions.

Request body:

```json
{
  "message": "Compare Indonesia and Brazil on GDP per capita and population",
  "countryCode": "IDN",
  "webSearchPriority": true,
  "assistantMode": "web_priority"
}
```

Fields:
- `message` (required): user question
- `countryCode` (optional): focus ISO3
- `webSearchPriority` (optional): force retrieval priority to web
- `assistantMode` (optional): `web_priority` also activates web-priority behavior

Response:

```json
{
  "reply": "...",
  "attribution": ["Intent: ...", "LLM: ...", "Web: ..."],
  "citations": {
    "D": { "1": "platform evidence..." },
    "W": { "1": "web evidence..." }
  }
}
```

Behavior notes:
- Ranking and country-comparison intents can use deterministic table-first generation.
- Time-sensitive non-metric questions may use deterministic verified-web mode.
- Safety gates can replace weak model output with grounded fallback text.

Common errors:
- `400` message required

## 6) Strategy Analysis APIs

### POST `/api/analysis/pestel`

Purpose: generate PESTEL + SWOT + comprehensive sections for a country.

Request body:

```json
{
  "countryCode": "IDN",
  "year": 2025
}
```

Response shape:

```json
{
  "analysis": {
    "pestelDimensions": [],
    "swot": {},
    "comprehensiveSections": [],
    "strategicBusiness": [],
    "newMarketAnalysis": [],
    "keyTakeaways": [],
    "recommendations": []
  },
  "attribution": ["..."]
}
```

Common errors:
- `400` invalid/missing `countryCode`

### POST `/api/analysis/porter`

Purpose: generate Porter Five Forces analysis for a country/industry pair.

Request body:

```json
{
  "countryCode": "IDN",
  "year": 2025,
  "industrySector": "10 - Manufacture of food products"
}
```

Response shape:

```json
{
  "analysis": {
    "forces": [],
    "comprehensiveSections": [],
    "strategicImplications": [],
    "keyTakeaways": [],
    "recommendations": []
  },
  "attribution": ["..."]
}
```

Common errors:
- `400` invalid/missing `countryCode`

## 7) Business Analytics APIs

### GET `/api/analysis/correlation-global`

Purpose: compute global cross-country correlation and regression diagnostics.

Query params:
- `metricX` (optional, default `gdp_per_capita`)
- `metricY` (optional, default `life_expectancy`)
- `start` (optional)
- `end` (optional)
- `excludeIqr` (optional boolean)
- `highlight` (optional ISO3)

Response includes:
- selected metric IDs and labels
- normalized year bounds
- `correlation`, `pValue`, `rSquared`, `slope`, `intercept`
- points, subgroup breakdowns, and outlier diagnostics

Common errors:
- `400` unknown `metricX` or `metricY`

### POST `/api/analysis/business/correlation-narrative`

Purpose: convert computed correlation statistics into structured narrative.

Request body: accepts selected metric IDs/labels, stats from correlation endpoint, subgroup info, optional `highlightStats` and `residualDiagnostics`.

Response:

```json
{
  "narrative": {
    "associationParagraphs": ["...", "..."],
    "correlationBullets": ["...", "...", "..."],
    "causationParagraph": "...",
    "causationHypotheses": ["...", "...", "..."],
    "recommendedAnalyses": ["...", "...", "..."]
  },
  "modelUsed": null,
  "triedModels": []
}
```

Behavior notes:
- If no Groq key is configured, backend returns deterministic fallback narrative.
- If LLM output fails schema checks, backend retries stricter JSON pass before fallback.

Common errors:
- `400` unknown `metricX` or `metricY`

### POST `/api/analysis/correlation`

Purpose: compute single-country X/Y correlation across overlapping years.

Request body:

```json
{
  "countryCode": "IDN",
  "metricX": "gdp_per_capita",
  "metricY": "life_expectancy"
}
```

Response:

```json
{
  "n": 18,
  "correlation": 0.74,
  "points": [{ "x": 4788.12, "y": 71.2 }],
  "metricX": "gdp_per_capita",
  "metricY": "life_expectancy",
  "labelX": "GDP per capita",
  "labelY": "Life expectancy"
}
```

Common errors:
- `400` missing/invalid `countryCode`
- `400` unknown metric

## 8) Error Handling Summary

- `400`: request validation error (missing required fields, unknown metric IDs, invalid category)
- `404`: resource not found (country profile lookup)
- `500`: internal server failure
- `502`: upstream data provider failure (country list path)

For integration stability, clients should handle all error statuses and display graceful fallback messaging.
