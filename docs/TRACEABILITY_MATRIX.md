# Traceability matrix

Maps **product intent** to **implementation anchors** for the Country Analytics Platform. Use for release reviews, QA planning, compliance checklists, and onboarding.

**Legend:** ✓ = implemented in current codebase; *(partial)* = optional or environment-dependent path.

---

## Functional traceability

| Req / story ID | Requirement (summary) | Primary UI | Primary API / module | Verification hint |
|----------------|----------------------|------------|----------------------|-------------------|
| PRD FR-1 | Country + year range selection | `Dashboard.tsx`, `CountrySelect`, `YearRangePresetDropdown` | `GET /api/country/:cca3/series` | Change country and range; series reloads; 400 on bad metrics |
| PRD FR-2 | Metric validation | `Sources.tsx`, all callers | `GET /api/metrics`, `METRIC_BY_ID` in `index.ts` | Unknown metric → 400 |
| PRD FR-3 | Global year fallback | `GlobalAnalytics.tsx` | `GET /api/global/snapshot`, `globalSnapshot.ts` | Future-empty year → `dataYear` ≤ `requestedYear` |
| PRD FR-4 | PESTEL structured output | `Pestel.tsx` | `POST /api/analysis/pestel`, `pestelAnalysis.ts`, `pestelGrounding.ts` | JSON shape + `attribution`; merge with scaffold |
| PRD FR-5 | Fullscreen modals | `ChartTableToggle`, `DashboardComparisonTable`, stepper overlay | — | Escape closes; body scroll locked; `.cap-viz-fullscreen` ticks |
| PRD FR-6 | Bootstrap cache warmup | SPA first load | `POST /api/bootstrap/warm`, `dataWarmup.ts`, `index.ts` | 202 + `started` or 200 + `skipped`; faster navigation when warm |
| PRD FR-7 | Short labels in API | All chart consumers | `GET /api/metrics`, `metricShortLabels.ts` | `shortLabel` present per metric |
| PRD FR-8 | Assistant chat | `Assistant.tsx`, `MessageContent.tsx` | `POST /api/assistant/chat`, `llm.ts` | Reply + metadata; optional Tavily |
| US-D1 | Country search | `CountrySelect.tsx` | `GET /api/countries` | Typeahead → ISO3 |
| US-D2 | Year presets | `YearRangePresetDropdown.tsx` | `start`/`end` query params | Presets clamp correctly |
| US-D4–D9 | Chart/table/FS/granularity/comparison | `Dashboard.tsx`, `ChartTableToggle.tsx`, `VisualizationStepper.tsx` | Comparison: `GET /api/dashboard/comparison` | Fullscreen + slideshow + export |
| US-G1–G4 | Global analytics + WLD | `GlobalAnalytics.tsx` | `/api/global/snapshot`, `/api/global/table`, `/api/global/wld-series` | Map + table + CSV |
| US-P1–P4 | Strategy pages + SWOT quality | `Pestel.tsx`, `Porter.tsx` | `/api/analysis/pestel`, `/api/analysis/porter` | With/without Groq; deduped SWOT |
| US-B1–B3 | Correlation + residuals | `BusinessAnalytics.tsx`, `CorrelationScatter.tsx` | `GET /api/analysis/correlation-global`, `POST /api/analysis/correlation` | r, scatter, residuals copy |
| US-A1–A3 | Assistant UX | `Assistant.tsx` | `assistant/chat` | Suggestions, markdown rendering |
| US-S1–S2 | Sources | `Sources.tsx` | `GET /api/metrics`, `GET /api/data-providers` | Search + provider narrative |
| US-O1–O2 | API observability + warm | `ApiTransportPanel.tsx`, `ApiToastStack.tsx`, bootstrap caller | `api.ts`, `POST /api/bootstrap/warm` | Panel + toasts + 202 warm |
| US-T1 | Cache clear | UI control | `POST /api/cache/clear` | Cache invalidated |

---

## Non-functional traceability

| Concern | Implementation |
|---------|----------------|
| **Caching** | `cache.ts`, `countrySeriesCacheKey`, TTL in `index.ts` |
| **Retries** | `httpClient.ts` (429/5xx) for configured providers |
| **Metric labels** | `metricShortLabels.ts`, `metricDisplay.ts` |
| **Year bounds** | `backend/src/yearBounds.ts`, `frontend/src/lib/yearBounds.ts` |
| **PESTEL digest** | `pestelDigestKeys.ts` → digest build in `index.ts` |
| **PESTEL merge / polish** | `mergePestelAnalysis`, `polishPestelAnalysisForClient`, `ensureFiveBullets` in `pestelAnalysis.ts` |
| **CORS / body limit** | `index.ts` Express config (see **GUARDRAILS**) |

---

## Change control

When adding a feature:

1. Add or update a row in this matrix (or linked **USER_STORIES.md**).
2. Update **PRD.md** if user-visible scope changes.
3. Update **VARIABLES.md** for new metrics, query parameters, or environment variables.
4. Update **ARCHITECTURE.md** for new routes or pipeline stages.
5. Update **GUARDRAILS.md** if data, AI, or legal assumptions shift.

---

*Matrix maintained alongside **PRODUCT_DOCUMENTATION_STANDARD.md**.*
