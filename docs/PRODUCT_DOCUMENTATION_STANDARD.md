## Product documentation standard

This document defines how we structure and maintain product and technical documentation for the **Country Analytics Platform**.

The goal is to make the repository self‑explanatory for:

- Product managers and business stakeholders
- Designers and analysts
- Engineers onboarding to the codebase

---

### 1. Documentation structure

All product documentation lives under `docs/` and follows this structure:

- `README.md`
  - High‑level introduction, quickstart, tech stack, and links to deeper docs.

- `docs/PRD.md`
  - Single source of truth for **what the product does**:
    - Problem statement and objectives
    - In‑scope / out‑of‑scope features
    - Detailed feature requirements and business rules
    - Non‑functional requirements (performance, reliability, accessibility)

- `docs/USER_PERSONAS.md`
  - Describes the target audiences and their needs.
  - Each persona includes goals, pain points, success criteria, and typical usage scenarios.

- `docs/USER_STORIES.md`
  - Functional requirements expressed as user stories grouped by persona and feature area.
  - Stories map one‑to‑one or many‑to‑one with sections of the PRD.

- `docs/METRICS_AND_OKRS.md`
  - Product metrics and KPIs.
  - Product‑team OKRs and how they map to user‑facing metrics and telemetry.

Additional optional documents:

- `ARCHITECTURE.md` (if needed in future)
  - System diagrams, data flow, and component boundaries.

---

### 2. Versioning and ownership

- **Source of truth**:
  - The latest committed files in `main` are the canonical docs.
  - Any slide decks or external docs should reference this repository but not diverge from it.

- **Ownership**:
  - **Product** owns: `PRD.md`, `USER_PERSONAS.md`, `USER_STORIES.md`, `METRICS_AND_OKRS.md`.
  - **Engineering** owns: technical sections of `README.md`, architecture notes in `PRD.md`, and any future `ARCHITECTURE.md`.
  - Changes that cross both domains (e.g. adding a new major feature) should be co‑reviewed by product and engineering.

- **Change policy**:
  - For every feature PR that changes user‑visible behaviour, include updates to:
    - PRD (if it adds or changes a requirement)
    - User stories (if it adds a new story or closes one)
    - Metrics (if it adds new events or KPIs)

---

### 3. Level of detail expectations

**PRD**

- Focuses on *what* and *why*, not low‑level implementation.
- Captures:
  - Exact behaviour of filters, ranges, default values.
  - Data fallbacks (e.g. “use latest non‑null up to the selected year”).
  - Edge cases (e.g. countries without data, differences in naming like “West Bank and Gaza” for Palestine).

**User personas**

- 3–5 detailed personas are enough.
- Each persona should be realistic and grounded in how someone would actually use the platform (e.g. “Regional Strategy Lead for APAC”).

**User stories**

- Each story must be independently testable.
- Stories should be grouped into themes that map to UI sections:
  - Country dashboard
  - Global analytics – map
  - Global analytics – tables
  - Time‑series & charts

**Metrics & OKRs**

- Each product metric specifies:
  - Name
  - Definition
  - Owner (product/analytics)
  - Source (front‑end event, backend log, external tool)
  - Target / threshold if applicable

---

### 4. Style and formatting

- Use **Markdown** with:
  - `###` section headings (never `#` in docs consumed inside the codebase).
  - Bulleted lists for requirements and acceptance criteria.
  - Tables for metrics definitions where helpful.
- Use **bold** for key concepts (e.g. **North‑star metric**, **In scope**, **Out of scope**).
- Keep paragraphs short and scannable.

---

### 5. Mapping docs to code

- Each key feature in `PRD.md` should reference:
  - Primary components (e.g. `SummarySection`, `TimeSeriesSection`).
  - Relevant API modules (e.g. `worldBank.ts`, `countryCodes.ts`).

- When reading code:
  - Start with `README.md` → `PRD.md` → `USER_STORIES.md`.
  - Then open:
    - `src/App.tsx` for high‑level layout and routing.
    - `src/hooks/useCountryDashboard.ts` for data‑loading logic.
    - `src/api/worldBank.ts` for data definitions and business rules.

---

### 6. How to extend this standard

When you add major functionality (e.g. new health metrics, trade data, or ESG scores):

1. Update `PRD.md` with:
   - New problem statement and goals (if needed).
   - New feature requirements and business rules.
2. Add new user stories to `USER_STORIES.md` and tag them by persona.
3. Extend `METRICS_AND_OKRS.md` with:
   - New product metrics and event names.
   - Any updates to OKRs.
4. Add a short note to `README.md` if the change materially affects how the product is pitched.

