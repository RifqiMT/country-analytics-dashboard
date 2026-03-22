# Product requirements document (PRD)

**Product:** Country Analytics Platform  
**Document type:** Living PRD (aligned to current repository state)  
**Companion index:** [docs/README.md](./README.md)

---

## 1. Vision

Deliver an **analyst-grade, browser-based workspace** for comparing and explaining country-level economic, demographic, health, education, and labour indicators from **approximately 2000 through the current calendar year** (subject to publisher release lag), with transparent sourcing, optional AI-assisted narrative, and export paths for further analysis.

---

## 2. Problem statement

Policy analysts, strategists, educators, and students often juggle spreadsheets, multiple institutional portals, and inconsistent series definitions. The platform **unifies** a curated metric catalog, **densifies** time ranges for charting, **documents** provenance where enriched, and surfaces **global and country** views in one cohesive application—without requiring user accounts for core open-data features.

---

## 3. Business value and benefits

| Stakeholder | Value |
|-------------|--------|
| **Corporate / sovereign analysts** | Faster country screening, consistent definitions, exportable views for memos and committees. |
| **Multilateral and NGO teams** | Global rankings and filters with explicit year resolution when data are sparse. |
| **Educators and students** | Reproducible charts, correlation teaching tools, and strategy frameworks (PESTEL, Porter) grounded in real series. |
| **Product and data teams** | Documented pipeline, traceability matrix, and guardrails reduce onboarding cost and compliance surprises. |

---

## 4. Goals

| ID | Goal | Description |
|----|------|-------------|
| **G1 — Coverage** | Support a broad WDI-aligned catalog (currently **48** metrics) with IMF, UNESCO UIS, and metadata from REST Countries, World Bank Country API, Wikidata (select fields), and Sea Around Us (EEZ) where configured. |
| **G2 — Trust** | Expose data providers (`GET /api/data-providers`), metric dictionary (`GET /api/metrics`), and optional per-point `provenance` on country series. |
| **G3 — Usability** | Country dashboard with KPIs, charts, tables, comparison table, CSV export; global map/table; strategy views (PESTEL, Porter); exploratory analytics (correlation, residuals); assistant with dashboard-grounded context. |
| **G4 — Operability** | Observable API activity (transport panel), user-visible toasts, cache clear, optional bootstrap cache warmup, production build path documented. |
| **G5 — Responsible AI** | LLM outputs are optional, grounded where configured, and degrade to structured or template content without API keys. |

---

## 5. Non-goals (current scope)

- **No first-party authentication** or multi-tenant tenancy in the open-data MVP.
- **No real-time market data** or proprietary vendor feeds beyond documented public APIs.
- **WHO** and other institutions not yet wired in `metrics.ts` are out of scope until explicitly added.
- **Guaranteed “latest year” equality** across all indicators: publishers release at different times; the API may use carry-forward, interpolation, or WLD proxy per documented pipeline—not a substitute for audited national accounts.
- **No guarantee** that AI narrative matches a specific consulting style in all edge cases; prompts and post-processing aim for professional prose and deduplicated SWOT quadrants.

---

## 6. Primary users

See [USER_PERSONAS.md](./USER_PERSONAS.md). Summary: **Country analyst**, **Global benchmarker**, **Strategy learner**, **Economics instructor**, **Internal product/engineering stakeholder**.

---

## 7. Feature summary

| Area | Route | Description |
|------|-------|-------------|
| **Country Dashboard** | `/` | ISO3 search, year range with presets, KPI cards (YoY where applicable), accordion sections (financial, health & demographics, education, labour), Recharts lines with chart/table toggle, optional chart granularity (annual vs grouped periods), visualization groups with stacked embed and **group fullscreen** slideshow (Previous/Next), peer comparison table, timezone card, CSV export. |
| **Global Analytics** | `/global` | Year picker, metric snapshot, choropleth map (**requestedYear** vs **dataYear** when WDI is sparse), bar chart, filterable table by region and category, CSV export. |
| **PESTEL** | `/pestel` | Indicator digest from catalog subset; optional Tavily + Groq structured JSON; server-side merge with data scaffold, cross-quadrant SWOT deduplication, client-facing prose polish; data-only fallback without API keys. |
| **Porter 5 Forces** | `/porter` | Industry sector from **ILO ISIC** divisions via API; same optional AI pattern as PESTEL; data-only template fallback. |
| **Business Analytics** | `/business` | Global Pearson correlation and scatter (optional IQR exclusion, country highlight); country pairwise correlation over time; **residuals** view for regression diagnostics education. |
| **Analytics Assistant** | `/assistant` | Chat UI with dashboard-grounded digest when a country is selected; optional Tavily + Groq; markdown-oriented rendering and attribution metadata where implemented; suggested prompts by category. |
| **Sources** | `/sources` | Searchable metric catalog and data provider narrative from the API. |

---

## 8. Functional requirements

| ID | Requirement |
|----|-------------|
| **FR-1** | User can select any supported ISO3 country and a `[start, end]` year range bounded by `MIN_DATA_YEAR` and the current calendar year (frontend `maxSelectableYear`). |
| **FR-2** | Country series endpoint returns aligned yearly points for requested metrics; unknown metric IDs return HTTP **400**. |
| **FR-3** | Global snapshot returns `requestedYear` vs resolved `dataYear` when WDI is sparse for the requested year. |
| **FR-4** | PESTEL and Porter return structured JSON mergeable with LLM output when `GROQ_API_KEY` is set; otherwise return data scaffold without error. |
| **FR-5** | Full-screen chart/table modals lock body scroll, support Escape/Close, and use enlarged Recharts tick styles via `.cap-viz-fullscreen`. |
| **FR-6** | `POST /api/bootstrap/warm` enqueues background cache warmup (HTTP **202** with `{ status: "started" }`) so first navigation can hit warm entries; with server env `DISABLE_BOOTSTRAP_WARMUP=1`, returns **200** `{ status: "skipped" }` and no background work. |
| **FR-7** | `GET /api/metrics` returns catalog entries augmented with `shortLabel` for consistent UI copy. |
| **FR-8** | Assistant accepts chat messages and optional country context; responses include attribution metadata when the pipeline provides it. |

---

## 9. Non-functional requirements (selected)

| ID | Category | Requirement |
|----|----------|-------------|
| **NFR-1** | Performance | Country series responses are cached in memory (~20 min TTL); warmup reduces cold latency for common paths. |
| **NFR-2** | Reliability | HTTP client retries selective **429** / **5xx** for configured upstream providers. |
| **NFR-3** | Security | API secrets live server-side only (`dotenv`); JSON body limit **1 MB** on Express. |
| **NFR-4** | Maintainability | Metric definitions centralized in `metrics.ts`; labels in `metricShortLabels.ts`. |
| **NFR-5** | AI safety | PESTEL uses low temperature, grounding filters, and merge with scaffold; see **GUARDRAILS.md**. |

---

## 10. Success criteria (product)

- Users complete a **country overview** (select country, scan KPIs, open one full-screen chart) without reading internal documentation.
- **Exports** open in Excel or Google Sheets with sensible column headers.
- **Sources** page answers “where does this metric come from?” for any catalogued ID.
- Optional AI paths **degrade gracefully** when API keys are absent.
- Global map copy or UI explains **data year** when it differs from the selected year.

---

## 11. Product logic (high level)

1. **Ingestion:** Per metric, primary WDI code; optional alternate WDI; IMF WEO and UNESCO UIS fill null years where configured.
2. **Completion:** Cross-metric derivations, range completion (edge fill, interpolation with GDP-growth step rule for growth series), short tail carry-forward, optional WLD proxy, percentage clamping where applicable.
3. **Presentation:** Frontend merges series for charts; dashboard adds derived **unemployed** count from unemployment rate × labour force for labour visualizations.
4. **Strategy / AI:** Digest keys for PESTEL grounding are fixed in `pestelDigestKeys.ts`. LLM output is parsed, sanitized against evidence, merged with scaffold, and polished for client-facing text.

*Detail:* [ARCHITECTURE.md](./ARCHITECTURE.md), [GUARDRAILS.md](./GUARDRAILS.md).

---

## 12. Dependencies and configuration

| Variable | Role |
|----------|------|
| `GROQ_API_KEY` | Enables LLM narratives (Assistant, PESTEL, Porter). |
| `GROQ_MODEL`, `GROQ_MODEL_PESTEL`, `GROQ_MODEL_PORTER`, `GROQ_MODEL_ASSISTANT` | Model routing per feature (see `backend/src/llm.ts`). |
| `GROQ_FALLBACK_MODELS_*`, `GROQ_FALLBACK_MODELS` | Fallback chains on retryable errors. |
| `TAVILY_API_KEY` | Optional web context before or alongside Groq. |
| `PORT` | API listen port (default **4000**). |
| `DISABLE_BOOTSTRAP_WARMUP` | If `1` on the **server**, skip enqueueing background cache warmup when the SPA calls `POST /api/bootstrap/warm`. |

Full dictionary: [VARIABLES.md](./VARIABLES.md), `.env.example`.

---

## 13. Release and maintenance notes

- **Cache:** `POST /api/cache/clear` invalidates in-memory country series cache for the process.
- **Metric UI labels:** `shortLabel` from the API centralizes compact strings for charts and selectors.
- **Documentation:** Feature changes should update **TRACEABILITY_MATRIX.md** and any affected doc in the same release when practical.

### 13.1 Recent documentation alignment (living)

- PESTEL: merged analysis with **cross-quadrant SWOT deduplication** and **prose polish** to reduce scaffolding language in client output.
- API: **`POST /api/bootstrap/warm`** documented for first-session performance behavior.

---

*Last aligned to `frontend/src/App.tsx`, `backend/src/index.ts`, and `backend/src/metrics.ts`.*
