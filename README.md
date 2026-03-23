# Country Analytics Platform

Country Analytics Platform is an enterprise-grade web app for country intelligence and evidence-based analysis.

It helps users:
- Explore country indicators over time (dashboard + comparisons)
- Understand global patterns (maps + global tables + world aggregates)
- Generate structured strategic narratives (PESTEL, Porter Five Forces)
- Run business analytics to explore relationships between indicators (correlation/regression)
- Ask an Analytics Assistant for ranked comparisons and explanation grounded in platform evidence (with optional verified live web grounding)

## Product benefits (why this exists)

1. **Single source of truth for metrics**  
All indicator definitions, units, and derivations are centralized and documented in `docs/METRIC_CATALOG.md`.

2. **Evidence-bound explanations**  
Assistant outputs are scoped to platform metrics and can be web-grounded for time-sensitive questions.

3. **Consistent year handling**  
The product makes “requested year” vs “data year used” explicit, reducing the risk of stale interpretations.

4. **Release governance support**  
Traceability and guardrails documents help keep AI and analytics behavior auditable.

## Core features

- Country Dashboard
- Global Analytics (map, regional/category tables, world aggregate series)
- Analytics Assistant (routing + citations + deterministic fallback)
- PESTEL Analysis
- Porter Five Forces Analysis
- Business Analytics (metric correlation + regression diagnostics + narrative generation)
- Sources and Metrics Explorer (searchable metric dictionary)

## How the AI assistant stays safe (high level)

The assistant follows an evidence hierarchy:
1. Platform evidence: standardized metric series and deterministic comparison tables
2. Verified web evidence (optional): live retrieval with citations for time-sensitive claims
3. AI synthesis: only after scope and grounding controls apply

When evidence is insufficient, the system uses deterministic scaffold/fallback outputs rather than guessing.

## Tech stack (implementation overview)

- Frontend: React + TypeScript (Vite), Tailwind-like utility styling
- Backend: Node.js + Express + TypeScript
- Metrics/data: World Bank WDI-first pipeline with controlled enrichments and gap-fill behavior
- LLM: Groq model routing with use-case specific fallback chains (optional via API keys)
- Web retrieval: Tavily (optional, for verified-web grounding paths)

## Quick start (local)

1. Install dependencies

```bash
npm install
npm -C backend install
npm -C frontend install
```

2. Configure environment

Create `backend/.env`:

```env
PORT=4000
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
```

3. Run development

```bash
npm -C backend run dev
npm -C frontend run dev
```

Environment variables and request parameters are documented in:
- `docs/VARIABLES.md`
- `docs/API_REFERENCE.md`

## Where to start (documentation map)

Use `docs/README.md` for the recommended reading order:
- PRD → personas/stories → architecture → API reference → metric/catalog docs → assistant behavior → guardrails → traceability.

## Key endpoints (most used)

- `POST /api/assistant/chat`
- `POST /api/analysis/pestel`
- `POST /api/analysis/porter`
- `GET /api/analysis/correlation-global`
- `POST /api/analysis/business/correlation-narrative`

Full endpoint contracts: `docs/API_REFERENCE.md`
