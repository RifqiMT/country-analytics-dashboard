# User personas

These personas guide prioritization, copy tone, and feature depth for the Country Analytics Platform. They are **composite** profiles—not individual customers.

---

## Persona 1 — **Maya, Country Risk Analyst**

| Attribute | Detail |
|-----------|--------|
| **Role** | Works in corporate strategy or sovereign risk; compares economies for investment or partnership decisions. |
| **Goals** | Quickly see macro fiscal and social context for a country; export figures for memos; sanity-check trends over 10–20 years. |
| **Behaviors** | Uses Country Dashboard first; cares about debt, growth, inflation, unemployment, demographics; may open Global Analytics for peer context. |
| **Frustrations** | Inconsistent definitions across websites; charts that break when years have missing data; unclear whether a point is reported or modeled. |
| **Platform needs** | Clear metric labels, YoY hints, comparison table, CSV export, Sources page, provenance in tooltips where available. |
| **Tech comfort** | High; tolerates dense tables and multiple charts. |

---

## Persona 2 — **Diego, Global Benchmarking Lead**

| Attribute | Detail |
|-----------|--------|
| **Role** | NGO or multilateral program officer ranking countries on education or health proxies. |
| **Goals** | Map and rank countries for one indicator; filter by region; understand which year the map actually represents. |
| **Behaviors** | Lives on **Global Analytics**; downloads CSV; cross-checks a few countries on the dashboard. |
| **Frustrations** | Maps that show empty years without explanation; region filters that disagree with national classifications. |
| **Platform needs** | `requestedYear` vs `dataYear` messaging, region filter, category presets, export. |
| **Tech comfort** | Medium. |

---

## Persona 3 — **Aisha, MBA Strategy Student**

| Attribute | Detail |
|-----------|--------|
| **Role** | Completing coursework on PESTEL and Porter; needs defensible citations. |
| **Goals** | Produce a structured environmental scan tied to real indicators; understand limitations of proxy-based forces. |
| **Behaviors** | Uses **PESTEL** and **Porter** after skimming the dashboard; may try **Assistant** for synthesis. |
| **Frustrations** | Generic AI text with no sources; jargon-heavy macro series without plain-language hints. |
| **Platform needs** | Data-only fallback when no LLM keys; attribution strings; strategy pages that state data vs inference. |
| **Tech comfort** | Medium; prefers guided UI over raw APIs. |

---

## Persona 4 — **Dr. Chen, Economics Instructor**

| Attribute | Detail |
|-----------|--------|
| **Role** | Teaches development economics; demonstrates correlation and distribution concepts. |
| **Goals** | Show scatter plots and correlation across countries; illustrate interpolation and missing data caveats. |
| **Behaviors** | **Business Analytics** (global correlation), **Country Dashboard** for single-country stories, **Sources** for definitions. |
| **Frustrations** | Tools that hide methodology; students confused by PPP vs nominal. |
| **Platform needs** | Clear axis labels (`shortLabel`), optional IQR exclusion, reading list from official sources. |
| **Tech comfort** | High for concepts; expects stable URLs and reproducible exports for assignments. |

---

## Cross-persona design implications

- **Progressive disclosure:** KPI cards → charts → full screen → group slideshow for dense dashboard sections.
- **Trust copy:** Short notes on publisher lag, interpolation, and WLD proxy (see README and Guardrails).
- **Optional AI:** Never the only path; always show structured data or fallback text when keys are missing.
