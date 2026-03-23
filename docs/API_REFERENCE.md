# API Reference

This reference explains endpoints in practical terms for readers without backend experience.

## Conventions
- Base URL: `http://localhost:4000`
- Errors: `{ "error": "message" }`
- Metric IDs must exist in metric catalog.

## Key endpoints

### GET `/api/health`
Returns service liveness.

### GET `/api/metrics`
Returns metric catalog used in the app.

### GET `/api/countries`
Returns country list with ISO3 codes.

### GET `/api/country/:cca3/series`
Returns time series for selected metrics.
Query: `metrics`, `start`, `end`.

### GET `/api/global/snapshot`
Returns global cross-country metric values with year fallback.

### POST `/api/assistant/chat`
Generates grounded assistant response.
Body includes `message`, optional `countryCode`, optional `webSearchPriority`.

### POST `/api/analysis/pestel`
Generates PESTEL structured output.

### POST `/api/analysis/porter`
Generates Porter Five Forces output.

### GET `/api/analysis/correlation-global`
Computes global correlation/regression diagnostics.

### POST `/api/analysis/business/correlation-narrative`
Builds narrative interpretation from computed stats.

## Common status codes
- `400` invalid request
- `404` not found
- `500` internal failure
- `502` upstream provider issue
