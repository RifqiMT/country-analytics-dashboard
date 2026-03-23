# Country Analytics Platform

Country Analytics Platform is an enterprise analytics and decision-support application for country intelligence.
It combines a deterministic metrics pipeline, analyst-facing visual analytics, and governed AI-assisted interpretation.

The platform is designed for teams that need trustworthy answers for country comparison, strategic planning, and evidence-backed narrative generation.

## Product overview

The product unifies six primary capabilities:

1. **Country Dashboard**  
   Country-level trend and comparison analytics with multi-domain indicators.
2. **Global Analytics**  
   Cross-country map, global country tables, and world aggregate charts.
3. **Analytics Assistant**  
   Platform-grounded assistant with routing, citation controls, and optional verified-web mode.
4. **PESTEL analysis**  
   Structured macro-environment analysis with SWOT, market implications, and recommendations.
5. **Porter Five Forces analysis**  
   Industry attractiveness analysis by country and ILO-ISIC sector.
6. **Business Analytics**  
   Correlation/regression diagnostics and narrative synthesis for variable-pair analysis.

## Product benefits

- **Trust and consistency**: one metric catalog, one variable dictionary, one implementation-aligned API contract.
- **Faster decision cycles**: analytics, strategic frameworks, and narratives are generated in one workflow.
- **Evidence transparency**: the app distinguishes selected year vs actual data year and records source behavior.
- **Governed AI behavior**: assistant, PESTEL, and Porter flows use grounding plus deterministic fallback paths.
- **Cross-functional alignment**: PRD, personas, stories, metrics/OKRs, guardrails, and traceability share one documentation baseline.

## Feature logic and business rules (high level)

- **Data-first logic**: platform analytics are grounded in metric series and deterministic processing before narrative generation.
- **Year-bound logic**: input years are clamped to supported ranges; sparse series can use controlled fill/fallback behavior.
- **Safety logic**: when model/web dependencies are unavailable or low-confidence, the product falls back to deterministic scaffolds.
- **Governance logic**: requirement-to-code mapping and technical/business guardrails are documented and release-gated.

## Tech stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Core data**: World Bank WDI-first pipeline, with controlled enrichments and gap-fill strategies
- **LLM orchestration**: Groq with use-case specific model/fallback routing
- **Live web retrieval (optional)**: Tavily for verified-web answers and time-sensitive context

## Quick start

1) Install dependencies

```bash
npm install
npm -C backend install
npm -C frontend install
```

2) Configure environment

Create `backend/.env`:

```env
PORT=4000
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
```

3) Run development servers

```bash
npm -C backend run dev
npm -C frontend run dev
```

4) Build validation gate

```bash
npm run build
```

## Documentation map

Start with `docs/README.md` for the full enterprise reading path.

Core references:
- Product requirements: `docs/PRD.md`
- Personas and user stories: `docs/USER_PERSONAS.md`, `docs/USER_STORIES.md`
- Architecture and API contracts: `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`
- Variables and metrics: `docs/VARIABLES.md`, `docs/METRIC_CATALOG.md`
- Product metrics and OKRs: `docs/METRICS_AND_OKRS.md`
- Design standards: `docs/DESIGN_GUIDELINES.md`
- AI behavior and analysis methods: `docs/ASSISTANT_BEHAVIOR.md`, `docs/ANALYSIS_METHODS.md`
- Guardrails and traceability: `docs/GUARDRAILS.md`, `docs/TRACEABILITY_MATRIX.md`
- Documentation governance standard: `docs/PRODUCT_DOCUMENTATION_STANDARD.md`

## Most-used API endpoints

- `GET /api/health`
- `GET /api/metrics`
- `GET /api/country/:cca3/series`
- `GET /api/dashboard/comparison`
- `GET /api/global/snapshot`
- `GET /api/global/table`
- `POST /api/assistant/chat`
- `POST /api/analysis/pestel`
- `POST /api/analysis/porter`
- `GET /api/analysis/correlation-global`
- `POST /api/analysis/business/correlation-narrative`

Full endpoint contracts are in `docs/API_REFERENCE.md`.
