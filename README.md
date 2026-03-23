# Country Analytics Platform

Country Analytics Platform is an enterprise-grade country intelligence workspace for macro, social, health, and policy analysis.

It combines:
- Dashboard-grade indicator analytics (country and global)
- AI-assisted narrative generation with explicit citation grounding
- Strategy frameworks (PESTEL, Porter)
- Business analytics (multi-country metric comparison and correlation)

## Product Benefits

- Single source of truth for country indicators and derived insights
- Faster executive analysis with auditable AI outputs
- Structured comparison workflows for policy, investment, and market strategy teams
- Consistent user experience across dashboard, assistant, and strategic modules

## Core Features

- Country Dashboard (KPIs, trend charts, comparison tables, exports)
- Global Analytics (snapshot tables, map views, world aggregate series)
- Analytics Assistant (platform-grounded + web-grounded modes with citation mapping)
- PESTEL Analysis
- Porter Five Forces Analysis
- Business Analytics (cross-country comparison and correlation)
- Sources and metric definitions explorer

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind-like utility styling patterns
- Backend: Node.js, Express, TypeScript
- Data: World Bank WDI-first pipeline with controlled enrichments and fallbacks
- LLM: Groq model routing with use-case-specific fallback chains
- Web retrieval: Tavily (recency-biased, relevance-filtered)

## Quick Start

### 1) Install dependencies

```bash
npm install
npm -C backend install
npm -C frontend install
```

### 2) Configure environment

Create `backend/.env` (see `docs/VARIABLES.md`):

```env
PORT=4000
GROQ_API_KEY=...
TAVILY_API_KEY=...
```

### 3) Run development

```bash
npm -C backend run dev
npm -C frontend run dev
```

## Key API Surfaces

- `POST /api/assistant/chat`
- `POST /api/analysis/pestel`
- `POST /api/analysis/porter`
- `GET /api/analysis/correlation-global`
- `POST /api/analysis/business/correlation-narrative`

Full contracts: `docs/API_REFERENCE.md`

## Documentation Map

See `docs/README.md` for the complete documentation index and ownership model.
