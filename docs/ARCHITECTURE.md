# Architecture

## 1. System Overview

- Frontend SPA (React + TypeScript)
- Backend API (Express + TypeScript)
- Indicator data pipeline centered on World Bank WDI with controlled enrichments
- LLM and web-retrieval augmentation for assistant and strategy modules

## 2. Frontend Modules

- `pages/Dashboard.tsx`
- `pages/GlobalAnalytics.tsx`
- `pages/Assistant.tsx`
- `pages/Pestel.tsx`
- `pages/Porter.tsx`
- `pages/BusinessAnalytics.tsx`
- shared components for charts/tables/export dialogs

## 3. Backend Modules

- `index.ts` route composition and assistant orchestration
- `worldBank.ts` metric fetch and bundle assembly
- `globalSnapshot.ts`, `globalTable.ts`, `dashboardComparison.ts`
- `assistantIntel.ts`, `assistantCitationContext.ts`, `assistantTavilyFallback.ts`
- `pestelAnalysis.ts`, `porterAnalysis.ts`, `correlationGlobal.ts`
- `llm.ts` provider integration and model fallback chains

## 4. Major API Endpoints

- Health/meta: `/api/health`, `/api/metrics`, `/api/data-providers`, `/api/countries`
- Country analytics: `/api/country/:cca3`, `/api/country/:cca3/series`, `/api/dashboard/comparison`
- Global analytics: `/api/global/snapshot`, `/api/global/table`, `/api/global/wld-series`, `/api/compare`
- Assistant: `/api/assistant/chat`
- Strategy: `/api/analysis/pestel`, `/api/analysis/porter`
- Business analytics: `/api/analysis/correlation-global`, `/api/analysis/correlation`, `/api/analysis/business/correlation-narrative`

## 5. Assistant Runtime Flow (Simplified)

1. Classify intent and determine required evidence mode.
2. Build platform blocks (if metric-scoped).
3. Fetch Tavily context (if required by mode).
4. Compact evidence with citation IDs.
5. Use deterministic path for selected intents, else LLM generation.
6. Apply safety gates and fallback if grounding constraints fail.

## 6. Caching and Persistence

- Backend in-memory cache for selected route responses.
- Frontend session storage for persisted analysis states (e.g., business analytics).

## 7. Reliability Notes

- Deterministic fallback paths are first-class, not edge-case behavior.
- Safety gates are mandatory for verified-web current-events answers.
