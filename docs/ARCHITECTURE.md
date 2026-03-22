# Architecture

## 1. System context

```mermaid
flowchart LR
  subgraph clients [Browser]
    SPA[React SPA Vite]
  end
  subgraph api [Node API]
    EX[Express]
    WB[worldBank / series]
    GS[globalSnapshot]
    LLM[llm Groq Tavily]
  end
  subgraph external [External services]
    WDI[World Bank WDI]
    IMF[IMF WEO DataMapper]
    UIS[UNESCO UIS API]
    RC[REST Countries]
    WD[WB Country API]
    WD2[Wikidata]
    SAU[Sea Around Us]
  end
  SPA -->|HTTP JSON| EX
  EX --> WB
  WB --> WDI
  WB --> IMF
  WB --> UIS
  EX --> RC
  EX --> WD
  EX --> WD2
  EX --> SAU
  EX --> GS
  GS --> WDI
  EX --> LLM
```

## 2. Repository layout

| Path | Responsibility |
|------|----------------|
| `frontend/` | React 18, TypeScript, Vite, Tailwind, React Router, Recharts |
| `backend/` | Express API, metric catalog, ingestion, merge pipeline, cache |
| `package.json` (root) | Workspaces; `npm run dev` runs backend + frontend concurrently |

## 3. Frontend routes

| Path | Page component |
|------|----------------|
| `/` | `Dashboard.tsx` |
| `/global` | `GlobalAnalytics.tsx` |
| `/pestel` | `Pestel.tsx` |
| `/porter` | `Porter.tsx` |
| `/business` | `BusinessAnalytics.tsx` |
| `/assistant` | `Assistant.tsx` |
| `/sources` | `Sources.tsx` |

Shared chrome: `Layout.tsx` (nav, footer, `ApiToastStack`, `ApiTransportPanel`).

## 4. Backend API surface (summary)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/metrics` | Metric dictionary + `shortLabel` |
| GET | `/api/data-providers` | Institution roles and merge narrative |
| GET | `/api/countries` | ISO3 country list |
| GET | `/api/country/:cca3` | REST Countries + Wikidata + EEZ enrichment |
| GET | `/api/country/:cca3/wb-profile` | WB income/region metadata |
| GET | `/api/country/:cca3/series` | Time-series bundle (query: `metrics`, `start`, `end`) |
| GET | `/api/dashboard/comparison` | Peer comparison rows |
| GET | `/api/global/snapshot` | Map/table snapshot for one metric + year fallback |
| GET | `/api/global/table` | Wide table by region/category |
| GET | `/api/global/wld-series` | World aggregate WLD series |
| GET | `/api/compare` | Multi-country single metric series |
| GET | `/api/analysis/correlation-global` | Pearson r + scatter points |
| GET | `/api/ilo-isic-divisions` | Porter sector list |
| POST | `/api/cache/clear` | Clear server cache |
| POST | `/api/bootstrap/warm` | Background warmup of country metric bundles (**202** + `started`, or **200** + `skipped` if `DISABLE_BOOTSTRAP_WARMUP=1`) |
| POST | `/api/assistant/chat` | Assistant with optional Groq/Tavily |
| POST | `/api/analysis/pestel` | PESTEL analysis |
| POST | `/api/analysis/porter` | Porter analysis |
| POST | `/api/analysis/correlation` | Country pairwise correlation |

## 5. Data pipeline (country series)

High-level order (see `dataProviders.ts` for narrative):

1. Fetch **primary WDI** code per metric; optional **fallback WDI** code for null years.
2. Merge **IMF WEO** where `imfWeoIndicator` is defined (null years only).
3. Merge **UNESCO UIS** where `uisIndicatorId` is defined (null years only).
4. Apply **cross-metric derivations** (e.g. implied per-capita splits, OOSC proxies, age-band consistency) in `seriesCompletion` / related modules.
5. Apply **range completion**: edge fill, interior interpolation (except GDP growth step rule), short terminal carry-forward, optional **WLD proxy** for remaining nulls.
6. Clamp percentage-like series to 0–100 where applicable.
7. Attach **`provenance`** on points for audit (e.g. `reported`, `imf_weo`, `interpolated`, `wld_proxy`).

Cache: SHA-truncated key over sorted metric IDs + country + range; TTL ~20 minutes.

## 6. Key frontend modules

| Module | Role |
|--------|------|
| `api.ts` | Typed `getJson` / `postJson`, tracks transport for panel/toasts |
| `lib/chartSeries.ts` | Merge series for Recharts, labour-derived rows |
| `lib/chartGranularity.ts` | Annual vs multi-year aggregation |
| `lib/metricDisplay.ts` | `shortLabel` + catalog labels |
| `components/charts/ChartTableToggle.tsx` | Chart/table + local fullscreen + group fullscreen handoff |
| `components/charts/VisualizationStepper.tsx` | Stacked embed + group fullscreen slideshow |
| `components/charts/VizGalleryContext.tsx` | Context for group fullscreen routing |
| `components/pestel/*` | PESTEL layout, themes (`pestelTheme.ts`), SWOT grid |
| `components/porter/*` | Porter forces hub, themes (`porterTheme.ts`) |
| `components/assistant/MessageContent.tsx` | Assistant reply rendering (e.g. markdown) |

## 7. Strategy and AI pipeline (summary)

- **PESTEL / Porter:** Build an indicator digest from the catalog and country bundle; optional Tavily retrieval; optional Groq JSON generation; **sanitize** LLM partials against indicators, static profile, and web corpus (`pestelGrounding.ts`); **merge** with the data scaffold (`mergePestelAnalysis` in `pestelAnalysis.ts`); **polish** user-visible strings. SWOT quadrants are deduplicated across strengths / weaknesses / opportunities / threats when padding merged lists.
- **Assistant:** Chat completion with optional dashboard digest injection and Tavily search; responses include attribution metadata when the route attaches it.

## 8. Build & deploy

- **Dev:** `npm run dev` — API `:4000`, Vite `:5173` with proxy `/api`.
- **Prod:** `npm run build` — `backend/dist` + `frontend/dist`; serve SPA and reverse-proxy `/api` to Node, or single-origin static + API as documented in root README.

## 9. Security notes

- API keys **only** on server (`dotenv`); never bundled to the client.
- CORS `origin: true` for development flexibility; tighten for production if needed.
- JSON body limit 1 MB on Express.
