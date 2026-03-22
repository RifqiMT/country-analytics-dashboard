# Product requirements document (PRD)

**Product:** Country Analytics Platform  
**Document type:** Living PRD (aligned to current repository state)

---

## 1. Vision

Deliver an **analyst-grade, browser-based workspace** for comparing and explaining country-level economic, demographic, health, education, and labour indicators from **approximately 2000 through the current calendar year** (subject to publisher release lag), with transparent sourcing, optional AI-assisted narrative, and export paths for further analysis.

## 2. Problem statement

Policy analysts, strategists, and students often juggle spreadsheets, multiple institutional portals, and inconsistent series definitions. The platform **unifies** a curated metric set, **densifies** time ranges for charting, **documents** provenance where enriched, and surfaces **global and country** views in one cohesive application—without requiring user accounts for core open-data features.

## 3. Goals

| Goal | Description |
|------|-------------|
| **G1 — Coverage** | Support a broad WDI-aligned catalog with IMF, UNESCO UIS, and metadata from REST Countries, World Bank Country API, Wikidata (select fields), and Sea Around Us (EEZ) where configured. |
| **G2 — Trust** | Expose data providers (`/api/data-providers`, Sources page), metric dictionary (`/api/metrics`), and optional per-point `provenance` on country series. |
| **G3 — Usability** | Country dashboard with KPIs, charts, tables, comparison table, CSV export; global map/table; strategy views (PESTEL, Porter); exploratory analytics (correlation); assistant with dashboard-grounded context. |
| **G4 — Operability** | Observable API activity (transport panel), user-visible toasts for request outcomes, cache clear for refresh, production build path documented. |

## 4. Non-goals (current scope)

- **No first-party authentication** or multi-tenant tenancy in the open-data MVP.
- **No real-time market data** or proprietary vendor feeds beyond documented public APIs.
- **WHO** and other institutions not yet wired in `metrics.ts` are out of scope until explicitly added.
- **Guaranteed “latest year” equality** across all indicators: publishers release at different times; the API may use carry-forward, interpolation, or WLD proxy per documented pipeline—not a substitute for audited national accounts.

## 5. Primary users

See [USER_PERSONAS.md](./USER_PERSONAS.md). In summary: **Country analyst**, **Global benchmarker**, **Strategy learner**, **Educator**.

## 6. Feature summary

| Area | Route | Description |
|------|-------|-------------|
| Country Dashboard | `/` | Country search (ISO3), year range with presets, KPI cards (YoY where applicable), accordion sections (financial, health, education, labour), Recharts line charts with chart/table toggle, granularity toggle, visualization groups with stacked embed and **group fullscreen** slideshow (Previous/Next), comparison table, timezone card, exports. |
| Global Analytics | `/global` | Year picker, metric snapshot, choropleth map (year fallback when sparse), bar chart, filterable table by region/category, CSV export. |
| PESTEL | `/pestel` | Data digest from dashboard series; optional Tavily + Groq structured JSON; data-only fallback without API keys. |
| Porter 5 Forces | `/porter` | Industry sector (ILO ISIC list), same AI pattern as PESTEL; data-only template fallback. |
| Business Analytics | `/business` | Global correlation/scatter (two metrics, year range, optional IQR exclusion, country highlight); country-level correlation; residuals view. |
| Analytics Assistant | `/assistant` | Chat UI; dashboard block when country selected; optional Tavily + Groq; attribution lines in response. |
| Sources | `/sources` | Searchable metric catalog from API, provider narrative. |

## 7. Functional requirements (selected)

- **FR-1:** User can select any supported ISO3 country and a `[start, end]` year range bounded by `MIN_DATA_YEAR` and current calendar year (frontend `maxSelectableYear`).
- **FR-2:** Country series endpoint returns aligned yearly points for requested metrics; unknown metric IDs return HTTP 400.
- **FR-3:** Global snapshot returns `requestedYear` vs resolved `dataYear` when WDI is sparse for the requested year.
- **FR-4:** PESTEL/Porter return structured payloads mergeable with LLM output when `GROQ_API_KEY` is set.
- **FR-5:** Full-screen chart/table modals lock body scroll, support Escape/Close, and use enlarged Recharts tick styles via `.cap-viz-fullscreen`.

## 8. Success criteria (product)

- Users complete a **country overview** (select country, scan KPIs, open one full-screen chart) without documentation.
- **Exports** open in Excel/Sheets with sensible column headers.
- **Sources** page answers “where does this metric come from?” for any catalogued ID.
- Optional AI paths **degrade gracefully** when API keys are absent.

## 9. Dependencies & configuration

| Variable | Role |
|----------|------|
| `GROQ_API_KEY` | Enables LLM narratives (Assistant, PESTEL, Porter). |
| `TAVILY_API_KEY` | Optional web context before LLM. |
| `PORT` | API listen port (default 4000). |

## 10. Release / maintenance notes

- **Cache:** Country series responses cached (~20 min TTL); `POST /api/cache/clear` invalidates in-memory cache.
- **Metric UI labels:** `shortLabel` from backend centralizes compact strings for charts and selectors.

---

*Last aligned to application routes in `frontend/src/App.tsx` and API surface in `backend/src/index.ts`.*
