# Enterprise Traceability Matrix

## Requirement to Implementation Mapping

| Req ID | Requirement | Primary Implementation | Supporting Files | Validation |
| --- | --- | --- | --- | --- |
| FR-01 | Country dashboard indicators and trends | `frontend/src/pages/Dashboard.tsx` | `backend/src/index.ts`, `backend/src/worldBank.ts` | Manual UX + API checks |
| FR-02 | Global table and snapshots | `frontend/src/pages/GlobalAnalytics.tsx` | `backend/src/globalTable.ts`, `backend/src/globalSnapshot.ts` | Snapshot year fallback test |
| FR-03 | Assistant grounded answers with citations | `backend/src/index.ts` (`/api/assistant/chat`) | `assistantCitationContext.ts`, `assistantIntel.ts` | Citation/safety gate verification |
| FR-04 | Verified web mode for time-sensitive non-metrics | `backend/src/index.ts` deterministic verified path | `assistantTavilyFallback.ts` | Prompt benchmark checks |
| FR-05 | PESTEL analysis generation | `frontend/src/pages/Pestel.tsx` | `backend/src/pestelAnalysis.ts`, `/api/analysis/pestel` | JSON schema + fallback checks |
| FR-06 | Porter analysis generation | `frontend/src/pages/Porter.tsx` | `backend/src/porterAnalysis.ts`, `/api/analysis/porter` | Grounding and fallback checks |
| FR-07 | Business correlation analysis | `frontend/src/pages/BusinessAnalytics.tsx` | `backend/src/correlationGlobal.ts` | Numeric sanity checks |
| FR-08 | Country comparison in assistant with % of top | deterministic comparison table | `backend/src/index.ts` | Table output validation |
| FR-09 | Persisted business analysis across feature navigation | `frontend/src/pages/BusinessAnalytics.tsx` | `frontend/src/lib/businessCorrelationCache.ts` | Navigation persistence QA |
| FR-10 | Source transparency UI | `frontend/src/pages/Sources.tsx` | `backend/src/metrics.ts` | Source coverage spot check |

## Business and Compliance Links

| Policy/Constraint ID | Description | Technical Control |
| --- | --- | --- |
| GR-01 | No fabricated current-events facts | verified-web safety gates + deterministic fallback |
| GR-02 | No placeholder citations in user output | assistant reply polish sanitizer |
| GR-03 | Metric scope fidelity for comparisons | strict metric extraction logic |
| GR-04 | Data-year transparency | latest observation + year shown in outputs |
