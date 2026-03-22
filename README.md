# Country Analytics Platform

An **analyst-grade web application** for exploring country-level economic, demographic, health, education, and labour indicators from approximately **2000 through the current calendar year** (subject to publisher release schedules). The product unifies World Bank WDI–aligned series with selective IMF, UNESCO UIS, and metadata providers, and exposes optional AI-assisted narrative for strategy and Q&A workflows.

**Product story:** [Country Analytics Sidekick](https://rifqi-tjahyono.com/%f0%9f%9a%80-country-analytics-sidekick-country-analysis-pestel-porters-without-the-spreadsheet-sweat-%f0%9f%92%bc%e2%9c%a8/)

---

## Documentation suite

Canonical product and engineering documentation lives in **`docs/`**:

| Document | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Index of all documentation |
| [docs/PRD.md](./docs/PRD.md) | Product requirements, scope, and success criteria |
| [docs/USER_PERSONAS.md](./docs/USER_PERSONAS.md) | Target users and needs |
| [docs/USER_STORIES.md](./docs/USER_STORIES.md) | User stories and acceptance notes |
| [docs/VARIABLES.md](./docs/VARIABLES.md) | Variables, **48** metric definitions, examples, relationship diagram |
| [docs/METRICS_AND_OKRS.md](./docs/METRICS_AND_OKRS.md) | Product health metrics and example OKRs |
| [docs/DESIGN_GUIDELINES.md](./docs/DESIGN_GUIDELINES.md) | Typography, colors, components, PESTEL/Porter themes |
| [docs/TRACEABILITY_MATRIX.md](./docs/TRACEABILITY_MATRIX.md) | Requirements → implementation mapping |
| [docs/GUARDRAILS.md](./docs/GUARDRAILS.md) | Data, AI, legal, and technical limitations |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, API summary, data pipeline |
| [docs/PRODUCT_DOCUMENTATION_STANDARD.md](./docs/PRODUCT_DOCUMENTATION_STANDARD.md) | How documentation is maintained |

---

## Product overview

| Capability | Description |
|------------|-------------|
| **Country Dashboard** | ISO3 country search, year range with **quick preset dropdown**, KPI cards (YoY where applicable), accordion sections (financial, health & demographics, education, labour), Recharts line charts with **chart / table toggle**, optional **chart granularity** (annual vs grouped periods), **comparison table**, timezone card, CSV export. Multi-chart groups use a **stacked layout** on the page; **Full screen** opens a **group slideshow** with Previous/Next between views. |
| **Global Analytics** | Year and metric selection, choropleth map (with **requestedYear vs dataYear** when WDI is sparse), bar chart, filterable table by region and category, CSV export. |
| **PESTEL & Porter** | Data digest from dashboard metrics; optional **Tavily** + **Groq** JSON narrative; **data-only fallback** without API keys. Porter uses **ILO ISIC** divisions from the API. |
| **Business Analytics** | **Global** Pearson correlation and scatter (optional IQR exclusion, country highlight); **country** pairwise correlation over time; residuals exploration. |
| **Analytics Assistant** | Chat UI with **dashboard-grounded** context when a country is selected; optional web + Groq; attribution in responses. |
| **Sources** | Searchable metric dictionary and **data provider** narrative from the API. |
| **Observability** | **API transport** panel (bottom-left) and **toasts** (bottom-right) for request outcomes and timing. |

---

## Benefits (why teams use it)

- **Single workspace** for macro, social, and education proxies with consistent **short labels** across charts, tables, and selectors (`shortLabel` from `GET /api/metrics`).
- **Transparent pipeline**: merge order (WDI → alternate WDI → IMF → UIS for configured metrics), gap completion, and optional **`provenance`** on series points for audit trails.
- **No login required** for core open-data paths; API keys for AI stay **server-side**.
- **Export-first**: CSV from dashboard sections, global table, and comparison views for memo and model workflows.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **Data** | [World Bank WDI](https://data.worldbank.org/) (primary), [IMF WEO DataMapper](https://www.imf.org/external/datamapper/api/v1) (gap-fill where configured), [UNESCO UIS API](https://api.uis.unesco.org/) (selected education metrics), [REST Countries](https://restcountries.com/) v3.1, [World Bank Country API](https://datahelpdesk.worldbank.org/knowledgebase/articles/898590-country-api-queries), [Wikidata](https://query.wikidata.org/) (enrichment when REST Countries omits government fields), [Sea Around Us](https://www.seaaroundus.org/) (EEZ where available) |
| **Optional AI** | [Groq](https://groq.com/) (chat), [Tavily](https://tavily.com/) (search) |

**Provider catalog:** `GET /api/data-providers` — also summarized in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

**Metric catalog:** 48 definitions in `backend/src/metrics.ts`; API adds `shortLabel` via `backend/src/metricShortLabels.ts`.

**Resilience:** Shared outbound `User-Agent`, retries on HTTP **429** / **5xx** for configured institutions. Country series responses are cached in memory (~20 minutes TTL); `POST /api/cache/clear` clears the cache.

**Series processing (summary):** Pagination from WDI, densification over the requested year range, cross-metric fills (e.g. implied per-capita splits, OOSC proxies), short terminal carry-forward, range completion (edge fill, interior interpolation with **GDP growth on step fill**), optional **WLD** proxy for remaining nulls, **% clamping** where applicable. See README notes below and `docs/GUARDRAILS.md`.

---

## Quick start

```bash
cd country-analytics-platform
npm install
cp .env.example .env
# Optional: GROQ_API_KEY, TAVILY_API_KEY in .env for AI features
npm run dev
```

- **API:** `http://localhost:4000`  
- **UI:** `http://localhost:5173` (proxies `/api` to the backend)

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | API listen port (default `4000`) |
| `GROQ_API_KEY` | Enables LLM paths (Assistant, PESTEL, Porter) |
| `GROQ_MODEL` | Optional model override |
| `TAVILY_API_KEY` | Optional web retrieval before LLM |

---

## Production build

```bash
npm run build
PORT=4000 node backend/dist/index.js
# Serve frontend/dist with any static host; reverse-proxy /api to the API
```

For a **single-origin** deploy, serve the SPA and route `/api` to the Node process, or set the frontend API base URL to your API origin.

---

## Implementation notes (data)

- **IMF WEO:** For `gov_debt_pct_gdp`, IMF `GGXWDG_NGDP` fills null years after WDI primary and secondary codes.
- **Government debt (US$):** WDI `GC.DOD.TOTL.CD` is sparse for many economies; the backend may estimate `(gov_debt_pct_gdp / 100) × nominal GDP (US$)` when the level series is missing.
- **REST Countries:** At most **10** `fields` per request; the backend merges multiple field sets.
- **Global year:** Map and snapshot endpoints may return **`dataYear` &lt; `requestedYear`** when the current-year WDI slice is empty — by design.
- **Sea Around Us:** Many ISO codes return 404; a **static EEZ fallback** table is used. Respect [SAU citation policy](https://www.seaaroundus.org/citation-policy/) if extending fisheries use.
- **WHO:** Not wired in the current metric catalog; extend `metrics.ts` to add.
- **Authentication:** No first-party login in the open MVP; keep secrets out of the client bundle.

---

## License

MIT (adjust as needed).
