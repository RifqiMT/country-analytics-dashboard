# Documentation Index – Country Analytics Platform

This folder contains product and technical documentation for the **Country Analytics Platform**. All documents are maintained to cover **product overview**, **product benefits**, **features**, **logic**, **business and tech guidelines**, **tech stack**, and **data metrics**. The structure follows the **Product Documentation Standard** (`PRODUCT_DOCUMENTATION_STANDARD.md`). Professional wording is used throughout for ease of reading. Use this index to locate the right document for product, design, or engineering needs.

---

## Core Documents

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | **Product Requirements Document** – problem statement, goals, scope, features (Country Dashboard, Global Analytics with **region filter**, PESTEL, **Porter 5 Forces**, Business Analytics, Source, Analytics Assistant), **export behaviour** (PNG/CSV for timelines, Global Charts, comparison table, summary cards, PESTEL/SWOT and Porter 5 chart; **filename convention** §4.8), data rules (incl. **IMF gov debt per-country fallback** e.g. China), NFRs, business and tech guidelines. Includes Analytics Assistant routing (TAVILY, GROQ, others) and out-of-scope handling; PESTEL/SWOT and Porter 5 Forces output structure. |
| [USER_PERSONAS.md](USER_PERSONAS.md) | **Target personas** – roles, goals, pain points, success criteria. Covers use of PESTEL, **Porter 5 Forces**, Business Analytics (**year range**, **data preparation**, **executive summary**, **residuals**, **subgroup by region**, **actionable insight**, **causation disclaimer**), and Population Structure. |
| [USER_STORIES.md](USER_STORIES.md) | **User stories** by feature area – Country Dashboard, Time-series (incl. **Education timeline** US-2.4, **export timeline as PNG/CSV** US-2.5), Population & age structure, Global (map, **region filter** US-5.3, tables, **Global Charts** incl. **education** aggregates and **export** US-5b.2), Business Analytics (year range, data prep, exclude IQR outliers, executive summary, residuals, subgroup, actionable insight, causation next steps), Source (filter chips incl. **UNESCO**), Analytics Assistant (incl. safe location/geography), PESTEL (incl. chart downloads), **Porter 5 Forces** (generate, chart with 5 bullets per force; section order and cards; industry selector; **chart PNG download** US-9b.5; inline citations), reliability and data quality. |

---

## Supporting Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Data flow and component architecture** – high-level flow, Country Dashboard (incl. **Education timeline**) and Global data flow (**region filter**; map/table/charts filter by `globalRegion`), **Global Charts** (unified, economic, health, **education**, population structure), **Business Analytics flow** (prepareScatterData, correlationAnalysis.ts), Analytics Assistant flow, **Porter 5 Forces flow**, component hierarchy (timelines, **EducationTimelineSection**, **RegionFilter**, GlobalChartsSection, PESTEL, Porter5ForcesSection, Business Analytics, Source, Chat), API layer, fallbacks (incl. **IMF gov debt per-country fallback** e.g. China). |
| [METRICS_AND_OKRS.md](METRICS_AND_OKRS.md) | **Product metrics and OKR metrics** – north-star and core engagement metrics, feature-level metrics (Country incl. **timeline export** CD-5, Global incl. **region filter** GR-1 and **Global Charts export** GC-4, Source, PESTEL incl. chart exports, **Porter 5 Forces** incl. **chart export** PF-6, **Business Analytics** incl. year range and exclude-outliers usage, Analytics Assistant), OKR objectives and key results for the product team, instrumentation guidelines (incl. **timeline.section_exported**, **global.charts_section_exported**, **porter5.chart_downloaded**), product team cadence. |
| [PRODUCT_METRICS.md](PRODUCT_METRICS.md) | **Data metrics** – GDP, population, health, geography, context/metadata (incl. timezone, location & geography). Formulas, WDI codes, sources; how metrics feed the UI; Source tab reference (incl. collapsible “Where metrics appear”). |
| [VARIABLES.md](VARIABLES.md) | **Variables** – every variable (data metrics, config, env): **variable name**, **friendly name**, definition, formula, **location in the app**, **example**; **relationship chart** (derivation and data lineage) and **usage flow** (how variables connect and flow from sources to UI, incl. **globalRegion** / **globalRegions** for region filter; **gov debt IMF per-country fallback** e.g. China; **export filename** via **sanitizeFilenameSegment** and filename pattern). |
| [PRODUCT_DOCUMENTATION_STANDARD.md](PRODUCT_DOCUMENTATION_STANDARD.md) | **Doc structure, ownership, change policy** – required content elements (product overview, benefits, features, logics, business/tech guidelines, tech stack), feature→code mapping, security. |

---

## Quick Links

- [Main README](../README.md) – Product overview, getting started, tech stack
- [src/data/metricMetadata.ts](../src/data/metricMetadata.ts) – Metric definitions including Country metadata & context (code-as-docs)
- [.env.example](../.env.example) – Environment variable template (never commit real keys)
