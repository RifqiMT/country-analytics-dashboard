# Documentation Index

This folder contains product and technical documentation for the **Country Analytics Platform**.

---

## Core Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Product Requirements Document – problem, goals, scope, features (Country, Global, PESTEL, Business Analytics, Source, Analytics assistant), NFRs, business and tech guidelines |
| [USER_PERSONAS.md](USER_PERSONAS.md) | Target personas – roles, goals, pain points, success criteria, use of PESTEL and Business Analytics (correlation) |
| [USER_STORIES.md](USER_STORIES.md) | User stories by feature area – Country, Global (map, tables), PESTEL, Business Analytics, Source, Analytics assistant |

---

## Supporting Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data flow, component hierarchy (including PESTEL, Business Analytics correlation scatter), API layer, Analytics Assistant and PESTEL flow |
| [METRICS_AND_OKRS.md](METRICS_AND_OKRS.md) | **Engagement metrics and OKRs** – north-star, feature-level metrics (including PESTEL, Business Analytics), instrumentation guidelines, product team cadence |
| [PRODUCT_METRICS.md](PRODUCT_METRICS.md) | **Data metrics** – GDP, population, health, etc.: formulas, WDI codes, sources; product logic (how metrics feed the UI) |
| [PRODUCT_DOCUMENTATION_STANDARD.md](PRODUCT_DOCUMENTATION_STANDARD.md) | Doc structure, ownership, change policy, feature→code mapping, security |

---

## Quick Links

- [Main README](../README.md) – Product overview, getting started, tech stack
- [src/data/metricMetadata.ts](../src/data/metricMetadata.ts) – Metric definitions (code-as-docs)
- [.env.example](../.env.example) – Environment variable template (never commit real keys)
