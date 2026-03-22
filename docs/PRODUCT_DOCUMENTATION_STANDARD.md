# Product documentation standard

This standard applies to all product-facing documentation under `docs/` and to the root `README.md` for the Country Analytics Platform.

## 1. Principles

- **Single source of truth.** Numeric definitions and institution names follow `backend/src/metrics.ts` and `backend/src/dataProviders.ts`. Do not duplicate conflicting formulas in prose; reference the code or API when precision matters.
- **Audience-aware.** Separate *what the product does* (PRD, personas, stories) from *how it is built* (architecture, guardrails). Executives read PRD and metrics; engineers read architecture and variables.
- **Versioned with the product.** When behavior changes (new route, new metric, new env var), update the relevant doc in the same change set whenever practical.
- **Professional tone.** Use clear, complete sentences. Prefer neutral, precise language over marketing superlatives.

## 2. Required document set

| Artifact | Minimum contents |
|----------|------------------|
| README (root) | Stack, quick start, high-level features, deployment notes, links to `docs/` |
| PRD | Vision, scope, personas summary, feature list, non-goals, release assumptions |
| User personas | Named roles, goals, frustrations, platform touchpoints |
| User stories | “As a … I want … so that …” plus acceptance notes where helpful |
| Variables | IDs, friendly names, definitions, formulas or source logic, UI/API location, examples |
| Metrics & OKRs | North-star and health metrics; OKR examples for product/engineering |
| Design guidelines | Color, typography, navigation, component patterns, motion/accessibility |
| Traceability | Requirements or stories mapped to routes, components, and APIs |
| Guardrails | Data limitations, legal/safety, AI usage, performance, and operational boundaries |

## 3. Formatting conventions

- Use **Markdown** with `##` / `###` headings; one H1 per file (title).
- Use tables for dictionaries and matrices; use [Mermaid](https://mermaid.js.org/) for diagrams where it aids maintenance (e.g. variable relationships).
- **Code and paths:** `` `snake_case` `` for metric IDs and file paths; **bold** sparingly for emphasis.
- **Links:** Prefer relative links within the repo; external links for institutions and APIs.

## 4. Review and ownership

- **Product-facing changes** (PRD, personas, stories, metrics definitions for stakeholders): product owner or delegate reviews.
- **Technical accuracy** (variables, architecture, guardrails): engineering review against `backend/` and `frontend/`.
- **Design changes** (tokens, components): align `DESIGN_GUIDELINES.md` with `frontend/tailwind.config.js`, `frontend/src/index.css`, and shared layout components.

## 5. Changelog discipline

For significant releases, add a short subsection to `PRD.md` (Release notes) or maintain `CHANGELOG.md` at repo root if the team adopts it. At minimum, note: date, breaking API/UI changes, new metrics, and new environment variables.
