# Product Documentation Standard

This document defines how we structure and maintain product and technical documentation for the **Country Analytics Platform**.

---

## 1. Purpose

The documentation standard ensures:

- **Product managers and business stakeholders** can understand scope, features, and success metrics
- **Designers and analysts** can align on personas and user stories
- **Engineers** can onboard quickly and understand architecture, data flow, and tech guidelines

---

## 2. Documentation Structure

### 2.1 Core Documents

| Document | Owner | Purpose |
|----------|-------|---------|
| **README.md** | Engineering | High-level intro, quickstart, tech stack, links to deeper docs |
| **docs/PRD.md** | Product | Single source of truth for what the product does: problem, goals, scope, features, NFRs |
| **docs/USER_PERSONAS.md** | Product | Target audiences, goals, pain points, success criteria |
| **docs/USER_STORIES.md** | Product | Functional requirements as user stories, grouped by feature |
| **docs/METRICS_AND_OKRS.md** | Product | Product metrics, OKRs, instrumentation guidelines |
| **docs/ARCHITECTURE.md** | Engineering | Data flow, component boundaries, API layer |

### 2.2 Supporting Documents

| Document | Purpose |
|----------|---------|
| **docs/PRODUCT_DOCUMENTATION_STANDARD.md** | This document – doc structure, ownership, change policy |
| **docs/PRODUCT_METRICS.md** | Data metrics (GDP, population, etc.) with formulas and WDI codes |
| **src/data/metricMetadata.ts** | Metric definitions, formulas, source URLs (code-as-docs) |

---

## 3. Document Content Guidelines

### 3.1 PRD (Product Requirements Document)

- Focus on **what** and **why**, not low-level implementation
- Capture:
  - Exact behaviour of filters, ranges, default values
  - Data fallbacks (e.g. "use latest non-null up to selected year")
  - Edge cases (countries without data, territory fallbacks, Palestine naming)
- Reference primary components and API modules

### 3.2 User Personas

- 3–5 detailed personas
- Each persona: role, goals, pain points, success criteria, typical usage
- Ground in realistic scenarios (e.g. "Regional Strategy Lead for APAC")

### 3.3 User Stories

- Independently testable
- Grouped by UI section: Country dashboard, Global analytics, Source tab, Time-series
- Map to personas and PRD sections

### 3.4 Metrics & OKRs

- Each product metric: name, definition, owner, source, target
- OKRs with measurable key results
- Instrumentation event naming convention

### 3.5 Architecture

- High-level data flow diagram (text or Mermaid)
- Component hierarchy and responsibilities
- API layer and external integrations

---

## 4. Versioning and Ownership

### 4.1 Source of Truth

- Latest committed files in `main` are canonical
- External slide decks or docs should reference this repo, not diverge

### 4.2 Ownership

| Domain | Documents |
|--------|-----------|
| **Product** | PRD, USER_PERSONAS, USER_STORIES, METRICS_AND_OKRS |
| **Engineering** | README (tech sections), ARCHITECTURE, config, API docs |
| **Cross-domain** | Major feature changes require co-review |

### 4.3 Change Policy

For every feature PR that changes user-visible behaviour:

| Change Type | Update |
|-------------|--------|
| New requirement | PRD |
| New story or closed story | USER_STORIES |
| New events or KPIs | METRICS_AND_OKRS |
| New metric or source | metricMetadata.ts, PRD |
| Architecture change | ARCHITECTURE, README |

---

## 5. Style and Formatting

- **Markdown** with `###` section headings (never `#` in docs consumed inside codebase)
- Bulleted lists for requirements and acceptance criteria
- Tables for metrics definitions and feature summaries
- **Bold** for key concepts (e.g. **North-star metric**, **In scope**)
- Short, scannable paragraphs

---

## 6. Mapping Docs to Code

### 6.1 Feature → Code Mapping

| PRD Section | Primary Components | API Modules |
|--------------|-------------------|-------------|
| Country dashboard | SummarySection, CountrySelector, YearRangeSelector | worldBank.ts |
| Time-series | TimeSeriesSection, MacroIndicatorsTimelineSection | worldBank.ts, timeSeries.ts |
| Population | PopulationPieSection | worldBank.ts |
| Country comparison | CountryTableSection | worldBank.ts |
| Global map | WorldMapSection, MapMetricToolbar | worldBank.ts |
| Global tables | AllCountriesTableSection | worldBank.ts |
| Source tab | SourceSection | metricMetadata.ts |

### 6.2 Reading Order

1. README.md → PRD.md → USER_STORIES.md
2. src/App.tsx (layout, tabs)
3. src/hooks/useCountryDashboard.ts (data flow)
4. src/api/worldBank.ts (data definitions, business rules)

---

## 7. Extending This Standard

When adding major functionality (e.g. new health metrics, trade data, ESG scores):

1. **PRD** – New problem/goals, feature requirements, business rules
2. **USER_STORIES** – New stories tagged by persona
3. **METRICS_AND_OKRS** – New metrics, events, OKR updates
4. **metricMetadata.ts** – New metric entries with description, formula, sources
5. **README** – Update feature summary if it affects product pitch
