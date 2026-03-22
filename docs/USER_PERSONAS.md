# User personas

These personas guide prioritization, copy tone, and feature depth for the Country Analytics Platform. They are **composite** profiles—not individual customers.

---

## Persona 1 — **Maya, Country Risk Analyst**

| Attribute | Detail |
|-----------|--------|
| **Role** | Works in corporate strategy or sovereign risk; compares economies for investment or partnership decisions. |
| **Goals** | Quickly see macro fiscal and social context for a country; export figures for memos; sanity-check trends over 10–20 years. |
| **Behaviors** | Uses **Country Dashboard** first; cares about debt, growth, inflation, unemployment, demographics; opens **Global Analytics** for peer context; may run **PESTEL** for committee packs; uses **Analytics Assistant** for ranked lists and multi-country comparisons with **prepended tables** and **[D#]** cites. |
| **Frustrations** | Inconsistent definitions across websites; charts that break when years have missing data; unclear whether a point is reported or modeled. |
| **Platform needs** | Clear metric labels, YoY hints, comparison table, CSV export, **Sources** page, provenance in tooltips where available. |
| **Success signals** | Exports used in live presentations; repeat visits to the same country across weeks. |
| **Tech comfort** | High; tolerates dense tables and multiple charts. |

---

## Persona 2 — **Diego, Global Benchmarking Lead**

| Attribute | Detail |
|-----------|--------|
| **Role** | NGO or multilateral program officer ranking countries on education or health proxies. |
| **Goals** | Map and rank countries for one indicator; filter by region; understand which year the map actually represents. |
| **Behaviors** | Lives on **Global Analytics**; downloads CSV; cross-checks a few countries on the dashboard; may ask **Analytics Assistant** for “top N” lists and read **prepended ranking tables** plus prose. |
| **Frustrations** | Maps that show empty years without explanation; region filters that disagree with national classifications. |
| **Platform needs** | `requestedYear` vs `dataYear` messaging, region filter, category presets, export. |
| **Success signals** | CSV shared with program teams; fewer “which year is this?” questions after copy improvements. |
| **Tech comfort** | Medium. |

---

## Persona 3 — **Aisha, MBA Strategy Student**

| Attribute | Detail |
|-----------|--------|
| **Role** | Completing coursework on PESTEL and Porter; needs defensible citations. |
| **Goals** | Produce a structured environmental scan tied to real indicators; understand limitations of proxy-based forces. |
| **Behaviors** | Uses **PESTEL** and **Porter** after skimming the dashboard; tries **Analytics Assistant** for synthesis with attribution. |
| **Frustrations** | Generic AI text with no sources; jargon-heavy macro series without plain-language hints; duplicated bullets across SWOT quadrants. |
| **Platform needs** | Data-only fallback when no LLM keys; attribution strings; strategy pages that separate **data** from **inference**; professional narrative tone. |
| **Success signals** | Submissions cite indicator years from the dashboard; understands when web context was unavailable. |
| **Tech comfort** | Medium; prefers guided UI over raw APIs. |

---

## Persona 4 — **Dr. Chen, Economics Instructor**

| Attribute | Detail |
|-----------|--------|
| **Role** | Teaches development economics; demonstrates correlation, distribution, and regression intuition. |
| **Goals** | Show scatter plots and correlation across countries; illustrate interpolation and missing-data caveats; discuss residuals. |
| **Behaviors** | **Business Analytics** (global correlation, residuals), **Country Dashboard** for single-country stories, **Sources** for definitions. |
| **Frustrations** | Tools that hide methodology; students confused by PPP vs nominal; tools that imply causation from correlation. |
| **Platform needs** | Clear axis labels (`shortLabel`), optional IQR exclusion, residuals view, reading list from official sources. |
| **Success signals** | Assignments reproduce charts with stated year ranges and metric IDs. |
| **Tech comfort** | High for concepts; expects stable URLs and reproducible exports. |

---

## Persona 5 — **Sam, Internal Product Owner**

| Attribute | Detail |
|-----------|--------|
| **Role** | Owns roadmap and stakeholder communication for the platform inside an organization or as a maintainer of the open repo. |
| **Goals** | Keep documentation truthful; trace features to code; communicate guardrails to legal and data partners. |
| **Behaviors** | Reads **PRD**, **TRACEABILITY_MATRIX**, **GUARDRAILS**; validates **VARIABLES** when metrics ship; tracks **Assistant** routing and citation behavior when changing `assistantIntel` or LLM prompts. |
| **Frustrations** | Docs that lag the codebase; unclear ownership of AI behavior; missing env var documentation. |
| **Platform needs** | **PRODUCT_DOCUMENTATION_STANDARD**, concise release notes, OKR scaffolding in **METRICS_AND_OKRS**. |
| **Success signals** | Onboarding new engineers without ad-hoc tours; audit questions answered from **GUARDRAILS** and **VARIABLES**. |
| **Tech comfort** | Medium–high; comfortable with Git and API concepts. |

---

## Cross-persona design implications

- **Progressive disclosure:** KPI cards → charts → full screen → group slideshow for dense dashboard sections.
- **Trust copy:** Short notes on publisher lag, interpolation, and WLD proxy (see root **README** and **GUARDRAILS**).
- **Optional AI:** Never the only path; structured data or template text when keys are missing; attribution when AI is used.
- **Assistant transparency:** Source-category chips and routing footers help users see **platform vs web** grounding; off-scope questions avoid irrelevant **dashboard metric** injection.
- **Correlation and residuals:** Language and UI should reinforce **association**, not **causation**.
