# User Personas – Country Analytics Platform

This document describes the **target audiences** for the Country Analytics Platform: their roles, goals, pain points, success criteria, and typical usage. It is maintained in line with the **Product Documentation Standard** (`PRODUCT_DOCUMENTATION_STANDARD.md`) and serves as the single source of truth for product and design alignment. Personas inform feature prioritisation and user stories in `USER_STORIES.md`. They reflect **product benefits** from the user’s perspective (fast insights, credible data, AI-assisted analysis with TAVILY-first and GROQ-second flow, etc.).

---

## Persona 1 – Regional Strategy Lead (Primary)

### Profile

| Attribute | Detail |
|-----------|--------|
| **Role** | VP / Director of Strategy for a regional business unit (e.g. APAC, EMEA) |
| **Context** | Prepares quarterly business and board reviews; needs fast, reliable answers |
| **Technical level** | Comfortable with dashboards; prefers visual over raw data |

### Goals

- Quickly understand which countries are growing fastest in GDP and population
- Prepare slides and narratives for board reviews
- Identify outlier markets that merit deeper attention or investment

### Pain Points

- Raw datasets are time-consuming to clean
- Internal BI dashboards are often slow or narrowly scoped
- Needs something fast for "day-before-the-meeting" questions

### Success Criteria

- Can answer "Where are our top 10 growth markets?" in under 5 minutes
- Can screenshot or share clear visuals that executives understand immediately
- Uses both Country dashboard and Global analytics for comprehensive view

### Typical Usage

- Starts with Country dashboard for a key market
- Switches to Global analytics (map, table, or **global charts**) to compare regions and aggregates
- Uses **Porter 5 Forces** tab to generate competitive analysis for a specific country and industry (e.g. Indonesia food manufacturing) for strategy or board materials
- Sorts global table by GDP or population for rankings
- Uses Analytics assistant for quick comparisons (e.g. "Compare Indonesia to Malaysia")
- Uses Analytics assistant for quick **location/geography** and neighbour questions (e.g. "Which continent is Ukraine in?", "Neighbouring countries of Indonesia?") with up-to-date web search

---

## Persona 2 – Country Economist / Policy Analyst

### Profile

| Attribute | Detail |
|-----------|--------|
| **Role** | Economist in central bank, ministry, multilateral, or think tank |
| **Context** | Tracks medium-to-long-term trends; builds research narratives |
| **Technical level** | Strong data literacy; cares about methodology |

### Goals

- Track medium-to-long-term trends in GDP, demographics, and life expectancy
- Compare one country to peers and global distribution
- Spot structural shifts (ageing population, slowing GDP per capita)

### Pain Points

- Existing tools either too simplistic (static charts) or too heavy (full statistical packages)
- Wants strong defaults around data quality and clear methodology
- Needs to cite sources and understand formulas

### Success Criteria

- Can quickly validate whether a hypothesis is consistent with WDI/IMF data
- Can export or re-create key visuals in research reports with minimal manual work
- Uses Source tab to verify metric definitions and data provenance

### Typical Usage

- Deep dive on one country with year range adjustment
- Uses unified timeline with multiple metrics for correlation
- Uses **Global correlation scatter** (in Business Analytics tab) to compare two metrics (e.g. GDP per capita vs life expectancy) and highlight the selected country
- Uses **Business Analytics** tab: correlation scatter (X/Y metrics, highlight country) and correlation & causation analysis (Pearson r, p-value)
- Uses **PESTEL** tab to generate structured Political, Economic, Social, Technological, Environmental, Legal analysis using **most up-to-date** global data and current-year web supplement, with sources
- Uses **Porter 5 Forces** tab to generate industry-level competitive analysis for the selected country and a chosen ILO/ISIC sector (e.g. food manufacturing, construction), with **chart visualization** (five bullet points per force) and inline citations
- Checks Source tab for government debt formula and IMF fallback
- Asks Analytics assistant about methodology and data sources; relies on source attribution (Dashboard data, TAVILY/Web search, GROQ, other LLMs) to assess answer provenance
- Asks Analytics assistant **location/geography** questions when needed for narrative context (e.g. "Where is X located?") and expects general-knowledge sources (not dashboard metrics)

---

## Persona 3 – Market Expansion Manager

### Profile

| Attribute | Detail |
|-----------|--------|
| **Role** | Corporate manager responsible for geographic expansion |
| **Context** | Evaluates market size, growth, and demographic structure |
| **Technical level** | Non-technical; needs narrative-friendly interface |

### Goals

- Compare market size and growth across potential target countries
- Look at population age structure to infer demand for product lines
- Share simple, data-driven stories with non-technical executives

### Pain Points

- Raw economics data hard to connect with product/marketing decisions
- Needs narrative-friendly, non-technical interface
- Often depends on data team for simple questions

### Success Criteria

- Can shortlist 3–5 countries based on GDP, GDP per capita, and demographics
- Can answer follow-ups during meetings without needing a data team
- Uses **Population Structure** timeline (age-group shares and absolute counts over time) and comparison table age breakdown for product portfolio relevance

### Typical Usage

- Uses Country selector to compare 2–3 target markets
- Focuses on GDP per capita and **Population Structure** timeline (age-group shares and absolute counts over time)
- Expands age breakdown in comparison table for detailed view
- Asks Analytics assistant "Compare Indonesia to Malaysia" for quick side-by-side data
- Asks Analytics assistant **neighbour and regional context** questions (e.g. bordering countries, continent) when preparing market entry notes

---

## Persona 4 – Data / BI Analyst

### Profile

| Attribute | Detail |
|-----------|--------|
| **Role** | Analyst or data engineer supporting strategy, finance, or policy teams |
| **Context** | Uses app as first-pass exploration before deeper models |
| **Technical level** | High; validates data quality and consistency |

### Goals

- Use app as first-pass exploration before building deeper models
- Validate that new data integrations or local datasets are consistent with WDI ranges
- Reduce bespoke exploratory notebooks and ad-hoc visualisations

### Pain Points

- Repetitive Jupyter / BI setup for simple exploratory questions
- Maintains many temporary, one-off visualisations
- Stakeholders need quick answers without full BI setup

### Success Criteria

- Fewer bespoke exploratory notebooks and ad-hoc visualisations
- Can provide stakeholders with a link to the app instead of spreadsheet screenshots
- Uses Source tab to document methodology for stakeholders

### Typical Usage

- Explores multiple countries and year ranges
- Uses Global table with sorting for quick rankings
- Uses **Business Analytics** tab to explore relationships between metrics (e.g. GDP per capita vs under‑5 mortality) and highlight selected country; reviews Pearson correlation and causation note
- Uses **PESTEL** tab for structured country-level PESTEL analysis with **most up-to-date** information (global data for latest year, current-year web supplement) and sources before building reports
- References Source tab for data definitions and API links
- Uses Analytics assistant for rankings and methodology questions
- Uses Analytics assistant for **out-of-scope checks** (location/geography, leaders) while verifying that metric answers remain sourced from dashboard data

---

## Persona Summary Matrix

| Persona | Primary Tab | Key Features |
|---------|-------------|--------------|
| Strategy Lead | Country + Global + **Porter 5 Forces** + Business Analytics + Chat | Map, global table sort, Porter 5 Forces (country + industry), correlation scatter (Business Analytics), comparison, Analytics assistant |
| Economist | Country + Global + PESTEL + **Porter 5 Forces** + Business Analytics + Source + Chat | Timeline, year range, correlation scatter & causation (Business Analytics), PESTEL and Porter 5 Forces (latest data), metric definitions, methodology questions |
| Market Manager | Country + Chat | Summary, Population Structure timeline (age groups + absolute), age breakdown, quick comparisons |
| BI Analyst | All | Global table, Global charts, Business Analytics (correlation scatter), PESTEL, **Porter 5 Forces**, Source tab, sorting, Analytics assistant |
