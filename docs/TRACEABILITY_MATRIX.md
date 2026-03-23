# Enterprise Traceability Matrix

| Req ID | Requirement | Implementation | Validation |
| --- | --- | --- | --- |
| FR-01 | Country dashboard trends | `frontend/src/pages/Dashboard.tsx` | UI + API checks |
| FR-02 | Global table/snapshot | `frontend/src/pages/GlobalAnalytics.tsx` | fallback checks |
| FR-03 | Assistant grounded response | `backend/src/index.ts` | citation/safety checks |
| FR-04 | Verified web handling | `backend/src/index.ts` | prompt benchmark |
| FR-05 | PESTEL module | `frontend/src/pages/Pestel.tsx` | schema + fallback |
| FR-06 | Porter module | `frontend/src/pages/Porter.tsx` | grounding checks |
| FR-07 | Business analytics | `frontend/src/pages/BusinessAnalytics.tsx` | numeric QA |

## Constraint mapping

| Constraint | Control |
| --- | --- |
| No fabricated current-events facts | verified-web safety + fallback |
| No citation placeholder leakage | output sanitizer |
| Metric scope fidelity | strict metric extraction |
