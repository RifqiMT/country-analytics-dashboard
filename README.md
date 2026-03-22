# Country Analytics Platform

An **analyst-grade web application** for exploring country-level economic, demographic, health, education, and labour indicators from approximately **2000 through the current calendar year** (subject to publisher release schedules). The product unifies World Bank WDI–aligned series with selective IMF, UNESCO UIS, and metadata providers, and exposes optional AI-assisted narrative for strategy and Q&A workflows.

**Product story:** [Country Analytics Sidekick](https://rifqi-tjahyono.com/%f0%9f%9a%80-country-analytics-sidekick-country-analysis-pestel-porters-without-the-spreadsheet-sweat-%f0%9f%92%bc%e2%9c%a8/)

---

## Documentation suite

Canonical product and engineering documentation lives in **`docs/`** and follows [**docs/PRODUCT_DOCUMENTATION_STANDARD.md**](./docs/PRODUCT_DOCUMENTATION_STANDARD.md) (structure, ownership, and review expectations).

| Document | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Documentation index and **map** (Mermaid) |
| [docs/PRODUCT_DOCUMENTATION_STANDARD.md](./docs/PRODUCT_DOCUMENTATION_STANDARD.md) | Professional documentation standard (governance, glossary, checklist) |
| [docs/PRD.md](./docs/PRD.md) | Product requirements: vision, scope, features, FR/NFR, success criteria |
| [docs/USER_PERSONAS.md](./docs/USER_PERSONAS.md) | Target users, journeys, and success signals |
| [docs/USER_STORIES.md](./docs/USER_STORIES.md) | User stories with acceptance-oriented notes |
| [docs/VARIABLES.md](./docs/VARIABLES.md) | Environment and API variables, derived UI series, **48**-metric catalog, PESTEL digest keys, relationship diagrams |
| [docs/METRICS_AND_OKRS.md](./docs/METRICS_AND_OKRS.md) | Product health metrics and example OKRs for product/engineering |
| [docs/DESIGN_GUIDELINES.md](./docs/DESIGN_GUIDELINES.md) | Typography, app shell colors, **PESTEL/SWOT/Porter** theme hex values, components, accessibility |
| [docs/TRACEABILITY_MATRIX.md](./docs/TRACEABILITY_MATRIX.md) | Enterprise-style requirements → UI / API / module → verification |
| [docs/GUARDRAILS.md](./docs/GUARDRAILS.md) | Data methodology, AI, legal, security, and operational limits |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, full API summary, data pipeline, strategy/AI overview |

---

## Product overview

| Capability | Description |
|------------|-------------|
| **Country Dashboard** | ISO3 country search, year range with **quick preset dropdown**, KPI cards (YoY where applicable), accordion sections (financial, health & demographics, education, labour), Recharts line charts with **chart / table toggle**, optional **chart granularity** (annual vs grouped periods), **comparison table**, timezone card, CSV export. Multi-chart groups use a **stacked layout**; **Full screen** opens a **group slideshow** with Previous/Next between views. |
| **Global Analytics** | Year and metric selection, choropleth map (with **requestedYear vs dataYear** when WDI is sparse), bar chart, filterable table by region and category, CSV export, WLD series where exposed. |
| **PESTEL & Porter** | Data digest from dashboard metrics (PESTEL uses a defined subset—see `docs/VARIABLES.md`); optional **Tavily** + **Groq** JSON narrative; server-side **merge**, **SWOT cross-quadrant deduplication**, and **client prose polish**; **data-only fallback** without API keys. Porter uses **ILO ISIC** divisions from the API. |
| **Business Analytics** | **Global** Pearson correlation and scatter (optional IQR exclusion, country highlight); **country** pairwise correlation over time; **residuals** exploration for teaching fit diagnostics. |
| **Analytics Assistant** | Chat UI with **dashboard-grounded** context when a country is selected; **Tavily** live search for time-sensitive facts with strict “no guessing” prompts when excerpts are missing; optional Groq; suggestion categories; markdown-oriented reply rendering; attribution in responses. **Set `TAVILY_API_KEY`** for accurate current-events answers. |
| **Sources** | Searchable metric dictionary and **data provider** narrative from the API. |
| **Observability** | **API transport** chip (header) and **toasts** (bottom-right) for request outcomes and timing. |

---

## Benefits (why teams use it)

- **Single workspace** for macro, social, and education proxies with consistent **short labels** across charts, tables, and selectors (`shortLabel` from `GET /api/metrics`).
- **Transparent pipeline**: merge order (WDI → alternate WDI → IMF → UIS for configured metrics), gap completion, and optional **`provenance`** on series points for audit trails.
- **No login required** for core open-data paths; API keys for AI stay **server-side**.
- **Export-first**: CSV from dashboard sections, global table, and comparison views for memo and model workflows.
- **Documented traceability**: PRD, user stories, variables, and a **traceability matrix** map intent to code for audits and onboarding.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **Data** | [World Bank WDI](https://data.worldbank.org/) (primary), [IMF WEO DataMapper](https://www.imf.org/external/datamapper/api/v1) (gap-fill where configured), [UNESCO UIS API](https://api.uis.unesco.org/) (selected education metrics), [REST Countries](https://restcountries.com/) v3.1, [World Bank Country API](https://datahelpdesk.worldbank.org/knowledgebase/articles/898590-country-api-queries), [Wikidata](https://query.wikidata.org/) (enrichment when REST Countries omits government fields), [Sea Around Us](https://www.seaaroundus.org/) (EEZ where available) |
| **Optional AI** | [Groq](https://groq.com/) (chat / JSON), [Tavily](https://tavily.com/) (search) |

**Provider catalog:** `GET /api/data-providers` — also summarized in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

**Metric catalog:** **48** definitions in `backend/src/metrics.ts`; API adds `shortLabel` via `backend/src/metricShortLabels.ts`.

**Resilience:** Shared outbound `User-Agent`, retries on HTTP **429** / **5xx** for configured institutions. Country series responses are cached in memory (~20 minutes TTL); `POST /api/cache/clear` clears the cache.

**First session load:** When the SPA loads, the UI prefetches `/api/countries`, `/api/metrics`, and `/api/data-providers`, and `POST /api/bootstrap/warm` asks the server to **fill the cache** with the full metric bundle (all catalog metrics, full default year span) for **WLD and every REST country**—matching `GET /api/country/:cca3/series`. Warmup responds with **202** and runs in the **background**; navigation then hits warm cache entries. With **`DISABLE_BOOTSTRAP_WARMUP=1`** on the API, the same endpoint returns **200** with `status: "skipped"` and does not enqueue work.

**Series processing (summary):** Pagination from WDI, densification over the requested year range, cross-metric fills (e.g. implied per-capita splits, OOSC proxies), short terminal carry-forward, range completion (edge fill, interior interpolation with **GDP growth on step fill**), optional **WLD** proxy for remaining nulls, **% clamping** where applicable. See [docs/GUARDRAILS.md](./docs/GUARDRAILS.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

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
| `GROQ_MODEL` | Optional shared primary if a use-case-specific model is unset |
| `GROQ_MODEL_PESTEL`, `GROQ_MODEL_PORTER`, `GROQ_MODEL_ASSISTANT` | Per-feature Groq primary models (see `docs/VARIABLES.md` and `backend/src/llm.ts`) |
| `GROQ_FALLBACK_MODELS_*`, `GROQ_FALLBACK_MODELS` | Per-feature and global fallback chains on 429/5xx |
| `TAVILY_API_KEY` | Optional web retrieval before LLM |
| `DISABLE_BOOTSTRAP_WARMUP` | If `1` on the **server**, skip background cache fill when `POST /api/bootstrap/warm` is called |

---

## Production build

```bash
npm run build
PORT=4000 node backend/dist/index.js
# Serve frontend/dist with any static host; reverse-proxy /api to the API
```

For a **single-origin** deploy, serve the SPA and route `/api` to the Node process, or set the frontend API base URL to your API origin.

---

## API quick reference (see Architecture for full list)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/country/:cca3/series` | Main time-series bundle |
| POST | `/api/bootstrap/warm` | Cache warmup (**202** started, or **200** skipped if disabled) |
| POST | `/api/cache/clear` | Invalidate in-memory series cache |
| POST | `/api/analysis/pestel`, `/api/analysis/porter` | Strategy JSON + attribution |
| POST | `/api/assistant/chat` | Assistant |

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
