# Product documentation standard

This standard applies to all product-facing documentation under `docs/` and to the root **`README.md`** for the **Country Analytics Platform**. It is written for product, design, engineering, and compliance stakeholders who rely on a single, consistent documentation system.

---

## 1. Purpose and scope

- **Purpose:** Ensure every important behavior of the application—user-facing, analytical, and operational—is discoverable, traceable, and aligned with the source code.
- **Scope:** The `country-analytics-platform` repository. External data publishers (World Bank, IMF, UNESCO, etc.) remain the authority for **underlying statistical definitions**; this repo documents **how** those series are selected, merged, exposed, and presented.

---

## 2. Principles

| Principle | Meaning |
|-----------|---------|
| **Single source of truth** | Numeric catalog and institution wiring follow `backend/src/metrics.ts` and `backend/src/dataProviders.ts`. Prose must not contradict code; when in doubt, cite the file or `GET /api/metrics`. |
| **Audience-aware layering** | Executives and PMs: PRD, personas, OKRs, high-level README. Practitioners: user stories, variables, design guidelines. Engineers: architecture, guardrails, traceability. |
| **Version with the product** | Same change set should update code **and** affected docs (new route, metric, env var, or UI pattern) whenever practical. |
| **Professional tone** | Clear, complete sentences; neutral precision over marketing language; defined acronyms on first use in each major document. |
| **Traceability** | Material requirements map to implementation and verification paths via `TRACEABILITY_MATRIX.md`. |

---

## 3. Required document set

| Artifact | Minimum contents | Primary audience |
|----------|------------------|------------------|
| **README** (root) | Stack, quick start, environment contract, feature overview, deployment, links to `docs/` | Everyone |
| **docs/README.md** | Index and short description of each doc | Everyone |
| **PRD** | Vision, problem, goals, non-goals, feature inventory, functional and non-functional requirements, success criteria, dependencies | Product, leadership |
| **User personas** | Named composite roles, goals, frustrations, platform touchpoints | Product, UX, content |
| **User stories** | “As a … I want … so that …” plus acceptance-oriented notes | Product, QA, engineering |
| **Variables** | IDs, friendly names, definitions, formulas or source logic, UI/API location, examples; relationship diagrams where useful | Engineering, analysts |
| **Metrics & OKRs** | North-star and health metrics; example OKRs for product and engineering | Product, leadership |
| **Design guidelines** | Color (including feature themes), typography, components, motion, accessibility | Design, frontend |
| **Traceability matrix** | Requirements and stories → UI, API, modules, verification hints | QA, release management |
| **Guardrails** | Data methodology limits, AI safety, legal positioning, security and ops boundaries | Everyone building or selling the product |
| **Architecture** | Context diagrams, routes, API surface, data pipeline, key modules | Engineering |
| **CHANGELOG** (`docs/CHANGELOG.md`) | Dated notes when documentation or described product behavior is aligned to a release (optional but recommended for enterprise audit trails) | Product, engineering |

---

## 4. Formatting conventions

- **Markdown** with one H1 per file; use `##` / `###` for structure.
- **Tables** for dictionaries, environment variables, and traceability matrices.
- **Mermaid** for architecture and variable lineage where it improves maintenance.
- **Code and paths:** `` `snake_case` `` for metric IDs and repository paths; **bold** sparingly.
- **Links:** Relative links inside the repo; authoritative external links for institutions and third-party APIs.

---

## 5. Enterprise-style governance

### 5.1 Document ownership (recommended)

| Document type | Suggested owner | Review trigger |
|---------------|-----------------|----------------|
| PRD, personas, stories | Product owner or delegate | Scope or positioning change |
| Variables, architecture, guardrails | Engineering lead | Pipeline, API, or metric catalog change |
| Design guidelines | Design + frontend lead | New tokens, themes, or shared components |
| Metrics & OKRs | Product + data | Instrumentation or goal cycle |
| Traceability matrix | Product or QA | Release candidate, major feature |

### 5.2 Definition of “done” for documentation

A feature is **documentation-complete** when:

1. **PRD** or user stories reflect the behavior (or a deliberate deferral).
2. **TRACEABILITY_MATRIX** includes at least one row linking intent to UI/API.
3. **VARIABLES** (or **ARCHITECTURE**) is updated if new parameters, metrics, or env vars appear.
4. **GUARDRAILS** is updated if data, AI, or compliance assumptions shift.

### 5.3 Change and version notes

For significant releases, add a dated subsection under **PRD → Release / maintenance notes** or adopt a root **`CHANGELOG.md`**. Record: breaking API or UI changes, new metrics, new environment variables, and removed features.

---

## 6. Glossary (repository usage)

| Term | Usage in this product |
|------|------------------------|
| **WDI** | World Bank World Development Indicators—primary statistical source for most catalog metrics. |
| **CCA3 / ISO3** | Three-letter country code used in URLs and APIs (e.g. `IDN`). |
| **Digest** | Compact indicator block passed into PESTEL/Porter/Assistant grounding; metric keys are listed in `backend/src/pestelDigestKeys.ts` for PESTEL. |
| **Data-only / scaffold** | Structured analysis generated without LLM keys, from indicators and templates. |
| **Provenance** | Per-point metadata on some series (e.g. reported vs interpolated); not every point carries it. |
| **Citation map (`D` / `W`)** | Parallel JSON on `POST /api/assistant/chat`: `citations.D` maps numeric ids to platform lines; `citations.W` maps to at most one web excerpt for inline **[W1]** chips in the UI. |
| **Prepended ranking block** | For global leaderboard questions, the API may concatenate **platform-built markdown tables** before the LLM narrative so the UI shows authoritative ranks first; the model is instructed **not** to repeat them as pipe tables. |
| **Web-first (Assistant)** | Client sends `webSearchPriority: true` (or `assistantMode: "web_priority"`) so Tavily is not skipped on platform-heavy intents when fresh retrieval is required. |

---

## 7. Alignment with code (maintenance checklist)

When merging a feature branch, verify:

- [ ] `frontend/src/App.tsx` routes match **ARCHITECTURE** and **PRD** feature table.
- [ ] `backend/src/index.ts` registered routes match **ARCHITECTURE** API summary.
- [ ] `backend/src/metrics.ts` length matches **VARIABLES** catalog count claim.
- [ ] `.env.example` matches **VARIABLES** environment section.
- [ ] Assistant pipeline modules (`backend/src/assistantIntel.ts`, `assistantCitationContext.ts`, `assistantTavilyFallback.ts`, `assistantReplyTableDedupe.ts`, `assistantPromptBudget.ts`; `frontend/src/lib/assistantAnswerPresentation.ts`, `assistantSuggestionCategories.ts`) are reflected in **ARCHITECTURE**, **GUARDRAILS**, and **TRACEABILITY_MATRIX** when behavior changes.

---

*This standard itself should be updated when the team adopts new artifact types (e.g. formal RFCs, ADRs) or compliance frameworks.*
