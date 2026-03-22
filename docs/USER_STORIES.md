# User stories

Format: **As a** [persona] **I want** [capability] **so that** [outcome].  
Acceptance notes are indicative; automated tests may not cover all UI flows.

---

## Country Dashboard

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-D1 | As a **country analyst**, I want to **search and select a country by name or code** so that **I can load its dashboard**. | `CountrySelect` resolves to ISO3; invalid codes are not offered. |
| US-D2 | As a **country analyst**, I want to **set From/To years with quick presets** so that **I can switch between full history and recent windows**. | Presets use current calendar year as upper bound; inputs clamped via `clampSpanStart` / `clampSpanEnd`. |
| US-D3 | As a **country analyst**, I want to **see KPI cards with year-over-year change** where possible so that **I can spot momentum**. | YoY uses latest vs prior year with value; rules differ for rates vs levels (see `Dashboard.tsx`). |
| US-D4 | As a **country analyst**, I want to **toggle chart vs table and open full screen** so that **I can present or inspect values**. | `ChartTableToggle`: chart/table, Escape/Close, body scroll lock; group fullscreen opens slideshow for multi-chart groups. |
| US-D5 | As a **country analyst**, I want to **export dashboard CSV** so that **I can analyze offline**. | Export uses merged year keys across loaded bundle. |
| US-D6 | As a **country analyst**, I want to **refresh cached data** so that **I can pull recent API updates**. | `POST /api/cache/clear` + reload tick. |

## Global Analytics

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-G1 | As a **benchmarking lead**, I want to **pick a year and metric** so that **I see a global snapshot**. | API returns `dataYear` vs `requestedYear` when fallback applies. |
| US-G2 | As a **benchmarking lead**, I want to **filter the table by region and category** so that **I can narrow peers**. | Categories: general, financial, health, education. |
| US-G3 | As a **benchmarking lead**, I want to **export the table** so that **I can share rankings**. | CSV download from UI. |

## PESTEL & Porter

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-P1 | As a **student**, I want to **run PESTEL for a selected country** so that **I get a structured framework**. | Returns JSON analysis + attribution; works without Groq (data-only). |
| US-P2 | As a **student**, I want to **choose an industry sector for Porter** so that **forces are contextualized**. | Uses ILO ISIC division list from `/api/ilo-isic-divisions`. |

## Business Analytics

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-B1 | As an **instructor**, I want to **plot two metrics globally with correlation** so that **I can teach association vs causation**. | `GET /api/analysis/correlation-global`; optional IQR exclusion; highlight country. |
| US-B2 | As an **analyst**, I want to **correlate two metrics over time for one country** so that **I can explore co-movement**. | `POST /api/analysis/correlation` with overlapping years. |

## Assistant

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-A1 | As a **user**, I want to **ask questions with optional country context** so that **answers respect dashboard series**. | Injects digest block when ISO3 valid; lists sources in reply metadata. |

## Observability & trust

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-O1 | As a **power user**, I want to **see API call outcomes and timings** so that **I can debug slow responses**. | `ApiToastStack` + `ApiTransportPanel`. |
| US-O2 | As a **user**, I want to **read metric definitions and providers** so that **I can cite official sources**. | `/sources` + `/api/metrics` + `/api/data-providers`. |
