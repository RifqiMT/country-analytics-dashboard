# User stories

**Format:** As a **[persona]** I want **[capability]** so that **[outcome]**.  
Acceptance notes are indicative; automated tests may not cover all UI flows.

**IDs** align with **TRACEABILITY_MATRIX.md** where noted.

---

## Country Dashboard

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-D1 | As a **country analyst**, I want to **search and select a country by name or code** so that **I can load its dashboard**. | `CountrySelect` resolves to ISO3; invalid codes are not offered. |
| US-D2 | As a **country analyst**, I want to **set From/To years with quick presets** so that **I can switch between full history and recent windows**. | Presets use current calendar year as upper bound; inputs clamped via `clampSpanStart` / `clampSpanEnd`. |
| US-D3 | As a **country analyst**, I want to **see KPI cards with year-over-year change** where possible so that **I can spot momentum**. | YoY uses latest vs prior year with value; rules differ for rates vs levels (`Dashboard.tsx`). |
| US-D4 | As a **country analyst**, I want to **toggle chart vs table and open full screen** so that **I can present or inspect values**. | `ChartTableToggle`: chart/table, Escape/Close, body scroll lock. |
| US-D5 | As a **country analyst**, I want to **export dashboard CSV** so that **I can analyze offline**. | Export uses merged year keys across loaded bundle. |
| US-D6 | As a **country analyst**, I want to **refresh cached data** so that **I can pull recent API updates**. | `POST /api/cache/clear` + UI reload path. |
| US-D7 | As a **country analyst**, I want to **open a multi-chart group in fullscreen and step between views** so that **I can present a narrative without scrolling the page**. | `VisualizationStepper` + `VizGalleryContext`; Previous/Next in overlay. |
| US-D8 | As a **country analyst**, I want to **switch chart granularity (e.g. annual vs grouped periods)** where offered so that **I can reduce noise on long spans**. | `chartGranularity.ts` + dashboard controls where enabled. |
| US-D9 | As a **country analyst**, I want to **compare peers in a comparison table** so that **I can benchmark KPIs**. | `DashboardComparisonTable` + `GET /api/dashboard/comparison`. |

---

## Global Analytics

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-G1 | As a **benchmarking lead**, I want to **pick a year and metric** so that **I see a global snapshot**. | API returns `dataYear` vs `requestedYear` when fallback applies. |
| US-G2 | As a **benchmarking lead**, I want to **filter the table by region and category** so that **I can narrow peers**. | Categories include general, financial, health, education (per API contract). |
| US-G3 | As a **benchmarking lead**, I want to **export the table** so that **I can share rankings**. | CSV download from UI. |
| US-G4 | As a **benchmarking lead**, I want to **see world aggregate (WLD) series where exposed** so that **I can compare a country to global trends**. | `GET /api/global/wld-series`; dashboard WLD cards in gallery context. |

---

## PESTEL and Porter

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-P1 | As a **student**, I want to **run PESTEL for a selected country** so that **I get a structured framework**. | Returns JSON analysis + `attribution` array; works without Groq (data scaffold). |
| US-P2 | As a **student**, I want to **choose an industry sector for Porter** so that **forces are contextualized**. | `GET /api/ilo-isic-divisions` populates sector control. |
| US-P3 | As a **strategy reader**, I want to **SWOT quadrants without duplicated bullets** so that **the analysis reads professionally**. | Server merge uses cross-quadrant deduplication and prose polish (`pestelAnalysis.ts`). |
| US-P4 | As a **student**, I want to **see what data and retrieval were used** so that **I can cite limitations**. | `attribution` strings in API response; guardrails in docs. |

---

## Business Analytics

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-B1 | As an **instructor**, I want to **plot two metrics globally with correlation** so that **I can teach association vs causation**. | `GET /api/analysis/correlation-global`; optional IQR exclusion; `highlight` ISO3. |
| US-B2 | As an **analyst**, I want to **correlate two metrics over time for one country** so that **I can explore co-movement**. | `POST /api/analysis/correlation` with overlapping years. |
| US-B3 | As an **instructor**, I want to **inspect regression residuals** so that **I can discuss fit and heteroscedasticity**. | Residuals chart/table path in `BusinessAnalytics.tsx` with copy on interpretation. |

---

## Analytics Assistant

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-A1 | As a **user**, I want to **ask questions with optional country context** so that **answers respect dashboard series when metrics are on-topic**. | Valid ISO3 loads bundle; `questionInvokesFocusCountryPlatformMetrics` may omit focus snapshot for off-scope general questions; attribution notes omission when applicable. |
| US-A2 | As a **user**, I want to **browse grouped starter prompts** so that **I can discover rankings, comparisons, web, and literacy workflows**. | `ASSISTANT_SUGGESTION_CATEGORIES` (six groups, ≥25 prompts each); empty-state accordions + composer **Prompts** menu. |
| US-A3 | As a **user**, I want to **read formatted replies (tables, links, bold, citation chips)** so that **answers are scannable**. | `MessageContent`: GFM tables, `[D#]`/`[W#]` superscripts/links, **Web source** section split; consecutive **duplicate tables** collapsed in UI. |
| US-A4 | As a **user**, I want to **choose Web-first vs Auto routing** so that **I control how often live search runs**. | `webSearchPriority: true` when UI mode is Web-first; server respects `assistantMode: "web_priority"`. |
| US-A5 | As a **benchmarking user**, I want **global ranking tables prepended by the platform** so that **I see authoritative ranks before narrative**. | `buildAssistantRankingPayload` markdown prepended to reply; LLM instructed prose-only for ranking turns; `stripRedundantRankingTablesFromLlmMarkdown` removes echo tables. |
| US-A6 | As a **user**, I want **inline citations mapped to tooltips and links** so that **I can trace numbers to platform or web**. | API returns `citations: { D, W }`; `MessageContent` renders chips. |
| US-A7 | As a **user**, I want a **source-based persona banner** so that **I understand how the answer was grounded**. | `resolveAssistantAnswerPresentation(attribution, citations)` → category label + name + title + description. |
| US-A8 | As a **user**, I want **executable Steps & actions** so that **I can jump to country, Sources, dashboard, starters, or answer mode without hunting the UI**. | Details panel: scroll/focus country, links, expand starters / open Prompts, set Web-first or Auto. |
| US-A9 | As a **user**, I want **reliable assistant responses under API stress** so that **fallback models and Tavily path activate when Groq fails**. | `groqChatWithFallbackForUseCase`, transport retry, timeouts, backoff; optional `tavilyAssistantFallbackReply`. |
| US-A10 | As a **product owner**, I want **routing and LLM lines in a footer** so that **I can debug intent and model without exposing machinery in the main prose**. | `attribution` array; “Routing:” line under reply. |

---

## Sources and catalog

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-S1 | As a **user**, I want to **search metrics by name or id** so that **I find definitions before exporting**. | `Sources.tsx` + `GET /api/metrics`. |
| US-S2 | As a **user**, I want to **read how providers are combined** so that **I trust merged series**. | `GET /api/data-providers` narrative on Sources page. |

---

## Observability, performance, and trust

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-O1 | As a **power user**, I want to **see API call outcomes and timings** so that **I can debug slow responses**. | `ApiToastStack` + `ApiTransportPanel` + `api.ts` transport hooks. |
| US-O2 | As a **user**, I want to **benefit from warm cache after first load** so that **navigation feels fast**. | SPA triggers `POST /api/bootstrap/warm` (202 + background work, or 200 skipped if server `DISABLE_BOOTSTRAP_WARMUP=1`). |

---

## Technical enablers (for platform owners)

| ID | Story | Acceptance notes |
|----|--------|-------------------|
| US-T1 | As an **operator**, I want to **clear in-memory cache** so that **I can recover from stale publisher data without restart**. | `POST /api/cache/clear`. |
| US-T2 | As an **engineer**, I want to **document new metrics in one catalog** so that **UI and API stay aligned**. | `metrics.ts` + `metricShortLabels.ts` + **VARIABLES.md**. |
