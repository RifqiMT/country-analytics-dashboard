# Documentation Index

This folder contains product and technical documentation for the **Country Analytics Platform**. All documents are maintained to cover product overview, benefits, features, logic, business and tech guidelines, tech stack, and data metrics.

---

## Core Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Product Requirements Document – problem, goals, scope, features (Country, Global, PESTEL, Business Analytics, Source, Analytics assistant), Analytics Assistant routing and out-of-scope handling (incl. location/geography), PESTEL/SWOT chart exports, data rules, NFRs, business and tech guidelines |
| [USER_PERSONAS.md](USER_PERSONAS.md) | Target personas – roles, goals, pain points, success criteria, use of PESTEL, Business Analytics (correlation), and Population Structure |
| [USER_STORIES.md](USER_STORIES.md) | User stories by feature area – Country, Time-series, Population & age structure, Global (map, tables), Business Analytics, Source, Analytics assistant (incl. safe location/geography), PESTEL (incl. chart downloads) |

---

## Supporting Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data flow, component hierarchy (Country Dashboard timelines, PESTEL with PNG exports, Business Analytics, Source, Analytics Assistant), API layer, fallbacks (territory, Taiwan) |
| [METRICS_AND_OKRS.md](METRICS_AND_OKRS.md) | **Engagement metrics and OKRs** – north-star, feature-level metrics (Country, Global, Source, PESTEL incl. chart exports, Business Analytics), instrumentation guidelines, product team cadence |
| [PRODUCT_METRICS.md](PRODUCT_METRICS.md) | **Data metrics** – GDP, population, health, geography, context/metadata; formulas, WDI codes, sources; how metrics feed the UI; Source tab reference |
| [PRODUCT_DOCUMENTATION_STANDARD.md](PRODUCT_DOCUMENTATION_STANDARD.md) | Doc structure, ownership, change policy, feature→code mapping, security |

---

## Quick Links

- [Main README](../README.md) – Product overview, getting started, tech stack
- [src/data/metricMetadata.ts](../src/data/metricMetadata.ts) – Metric definitions including Country metadata & context (code-as-docs)
- [.env.example](../.env.example) – Environment variable template (never commit real keys)
