# Documentation Index – Country Analytics Platform

This folder contains product and technical documentation for the **Country Analytics Platform**. All documents are maintained to cover **product overview**, **product benefits**, **features**, **logic**, **business and tech guidelines**, **tech stack**, and **data metrics**. The structure follows the **Product Documentation Standard** (`PRODUCT_DOCUMENTATION_STANDARD.md`). Professional wording is used throughout for ease of reading. Use this index to locate the right document for product, design, or engineering needs.

---

## Core Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | **Product Requirements Document** – problem statement, goals, scope, features (Country Dashboard, Global Analytics, PESTEL, **Porter 5 Forces**, Business Analytics, Source, Analytics Assistant), data rules, NFRs, business and tech guidelines. Includes Analytics Assistant routing (TAVILY first, GROQ second, others) and out-of-scope handling (e.g. location/geography), PESTEL/SWOT chart exports, **Porter 5 Forces (country + industry; output order: chart, Comprehensive Analysis, New Market Analysis, Key Takeaways, Recommendations—each with 5 bullets where applicable; inline citations only; no ---)**. |
| [USER_PERSONAS.md](USER_PERSONAS.md) | **Target personas** – roles, goals, pain points, success criteria. Covers use of PESTEL, **Porter 5 Forces**, Business Analytics (**year range**, **data preparation**, **executive summary**, **residuals**, **subgroup by region**, **actionable insight**, **causation disclaimer**), and Population Structure. |
| [USER_STORIES.md](USER_STORIES.md) | **User stories** by feature area – Country Dashboard, Time-series, Population & age structure, Global (map, tables, Global Charts), Business Analytics (**year range**, **data prep**, **exclude IQR outliers**, **executive summary**, **residuals**, **subgroup**, **actionable insight**, **causation next steps**), Source, Analytics Assistant (incl. safe location/geography), PESTEL (incl. chart downloads), **Porter 5 Forces** (generate, chart with 5 bullets per force; section order and cards; industry selector; inline citations), reliability and data quality. |

---

## Supporting Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Data flow and component architecture** – high-level flow, Country Dashboard and Global data flow, **Business Analytics flow** (prepareScatterData, linearRegression, regressionCI, subgroupCorrelations, executive summary, residuals plot; correlationAnalysis.ts), Analytics Assistant flow (TAVILY supplement, GROQ, others), **Porter 5 Forces flow** (parsing: chart summary, New Market Analysis, Key Takeaways, Recommendations; display order; TAVILY supplement, GROQ, inline citations), component hierarchy (timelines, PESTEL with PNG exports, **Porter5ForcesSection** with five cards, Global Charts, **Business Analytics** with year range and causation block, Source, Chat), API layer, fallbacks (territory, Taiwan). |
| [METRICS_AND_OKRS.md](METRICS_AND_OKRS.md) | **Product metrics and OKR metrics** – north-star and core engagement metrics, feature-level metrics (Country, Global, Source, PESTEL incl. chart exports, **Porter 5 Forces**, **Business Analytics** incl. year range and exclude-outliers usage, Analytics Assistant), OKR objectives and key results for the product team, instrumentation guidelines, product team cadence. |
| [PRODUCT_METRICS.md](PRODUCT_METRICS.md) | **Data metrics** – GDP, population, health, geography, context/metadata (incl. timezone, location & geography). Formulas, WDI codes, sources; how metrics feed the UI; Source tab reference (incl. collapsible “Where metrics appear”). |
| [VARIABLES.md](VARIABLES.md) | **Variables** – every variable (data metrics, config, env): **variable name**, **friendly name**, definition, formula, **location in the app**, **example**; **relationship chart** (how variables connect and flow through the app from sources to UI). |
| [PRODUCT_DOCUMENTATION_STANDARD.md](PRODUCT_DOCUMENTATION_STANDARD.md) | **Doc structure, ownership, change policy** – required content elements (product overview, benefits, features, logics, business/tech guidelines, tech stack), feature→code mapping, security. |

---

## Quick Links

- [Main README](../README.md) – Product overview, getting started, tech stack
- [src/data/metricMetadata.ts](../src/data/metricMetadata.ts) – Metric definitions including Country metadata & context (code-as-docs)
- [.env.example](../.env.example) – Environment variable template (never commit real keys)
