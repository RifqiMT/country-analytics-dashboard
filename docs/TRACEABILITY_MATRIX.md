# Traceability matrix

Maps **product intent** to **implementation anchors** for the Country Analytics Platform. Use for release reviews, QA planning, and onboarding.

**Legend:** ✓ = implemented in current codebase; (partial) = subset or optional path.

| Req / story ID | Requirement (summary) | Primary UI | Primary API / module | Verification hint |
|----------------|----------------------|------------|----------------------|-------------------|
| PRD FR-1 | Country + year range selection | `Dashboard.tsx`, `CountrySelect`, `YearRangePresetDropdown` | `GET /api/country/:cca3/series` | Change country and range; series reloads; 400 on bad metrics |
| PRD FR-2 | Metric validation | `Sources.tsx`, all callers | `GET /api/metrics`, `METRIC_BY_ID` in `index.ts` | Request unknown metric → 400 |
| PRD FR-3 | Global year fallback | `GlobalAnalytics.tsx` | `GET /api/global/snapshot`, `globalSnapshot.ts` | Pick future-empty year; `dataYear` ≤ `requestedYear` |
| PRD FR-4 | PESTEL structured output | `Pestel.tsx` | `POST /api/analysis/pestel`, `pestelAnalysis.ts` | JSON shape + attribution array |
| PRD FR-5 | Fullscreen modals | `ChartTableToggle`, `DashboardComparisonTable`, stepper overlay | — | Escape closes; body scroll locked |
| US-D1 | Country search | `CountrySelect.tsx` | `GET /api/countries` | Typeahead returns ISO3 |
| US-D2 | Year presets | `YearRangePresetDropdown.tsx` | Query `start`/`end` on series | Full / 10 / 5 year behavior |
| US-D4 | Chart/table/group FS | `ChartTableToggle.tsx`, `VisualizationStepper.tsx`, `VizGalleryContext.tsx` | — | Full screen opens group nav only in overlay |
| US-G1–G3 | Global analytics | `GlobalAnalytics.tsx` | `/api/global/*` | Map + table + export |
| US-P1–P2 | Strategy pages | `Pestel.tsx`, `Porter.tsx` | `/api/analysis/*` | With/without Groq |
| US-B1 | Global correlation | `BusinessAnalytics.tsx`, `CorrelationScatter.tsx` | `GET /api/analysis/correlation-global` | r matches manual spot check |
| US-B2 | Country correlation | `BusinessAnalytics.tsx` | `POST /api/analysis/correlation` | n & points for overlap years |
| US-A1 | Assistant | `Assistant.tsx` | `POST /api/assistant/chat` | Reply includes attribution |
| US-O1 | API observability | `ApiTransportPanel.tsx`, `ApiToastStack.tsx` | `api.ts` transport hooks | Panel shows paths and status |
| US-O2 | Sources | `Sources.tsx` | `GET /api/metrics`, `GET /api/data-providers` | Search metrics |

## Non-functional traceability

| Concern | Implementation |
|---------|----------------|
| Caching | `cache.ts`, `countrySeriesCacheKey`, TTL in `index.ts` |
| Retries | `httpClient.ts` (429/5xx) for configured providers |
| Metric labels | `metricShortLabels.ts` + `metricDisplay.ts` |
| Year bounds | `backend/src/yearBounds.ts`, `frontend/src/lib/yearBounds.ts` |

## Change control

When adding a feature:

1. Add or update a row in this matrix (or linked user story).
2. Update `PRD.md` scope if user-visible behavior changes.
3. Update `VARIABLES.md` if new metrics or query parameters are introduced.
