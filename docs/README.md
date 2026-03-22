# Country Analytics Platform — Documentation

This folder contains the canonical product and engineering documentation for the **Country Analytics Platform**. Start here, then follow the links below.

| Document | Purpose |
|----------|---------|
| [PRODUCT_DOCUMENTATION_STANDARD.md](./PRODUCT_DOCUMENTATION_STANDARD.md) | How documentation in this repo is structured, maintained, and reviewed |
| [PRD.md](./PRD.md) | Product requirements: vision, scope, features, and success criteria |
| [USER_PERSONAS.md](./USER_PERSONAS.md) | Primary audiences, goals, and constraints |
| [USER_STORIES.md](./USER_STORIES.md) | User stories and acceptance-oriented scenarios |
| [VARIABLES.md](./VARIABLES.md) | Variable dictionary, examples, and relationship overview |
| [METRICS_AND_OKRS.md](./METRICS_AND_OKRS.md) | Product health metrics and suggested OKRs for the team |
| [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) | Visual language, themes, components, and accessibility |
| [TRACEABILITY_MATRIX.md](./TRACEABILITY_MATRIX.md) | Requirements → implementation → verification mapping |
| [GUARDRAILS.md](./GUARDRAILS.md) | Business and technical limits, compliance, and safe use |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow, and key modules |

**Source of truth for metric definitions:** `backend/src/metrics.ts` and `GET /api/metrics` (includes `shortLabel` from `backend/src/metricShortLabels.ts`).

**Repository root:** [README.md](../README.md) — quick start, stack, and operational notes.
