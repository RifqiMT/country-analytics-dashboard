# User Personas – Country Analytics Platform

This document describes the target audiences for the Country Analytics Platform, their goals, pain points, and success criteria. Personas inform feature prioritisation and user stories in `USER_STORIES.md`.

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
- Switches to Global analytics map to compare regions
- Sorts global table by GDP or population for rankings
- Uses Analytics assistant for quick comparisons (e.g. "Compare Indonesia to Malaysia")

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
- Checks Source tab for government debt formula and IMF fallback
- Asks Analytics assistant about methodology and data sources; relies on source attribution (Dashboard data, Groq, Web search) and year-based routing (Groq for older period, Tavily for recent) to assess answer provenance

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
- Uses population pie and age breakdown for product portfolio relevance

### Typical Usage

- Uses Country selector to compare 2–3 target markets
- Focuses on GDP per capita and population age structure
- Expands age breakdown in comparison table for detailed view
- Asks Analytics assistant "Compare Indonesia to Malaysia" for quick side-by-side data

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
- References Source tab for data definitions and API links
- Uses Analytics assistant for rankings and methodology questions

---

## Persona Summary Matrix

| Persona | Primary Tab | Key Features |
|---------|-------------|--------------|
| Strategy Lead | Country + Global + Chat | Map, global table sort, comparison, Analytics assistant |
| Economist | Country + Source + Chat | Timeline, year range, metric definitions, methodology questions |
| Market Manager | Country + Chat | Summary, population pie, age breakdown, quick comparisons |
| BI Analyst | All | Global table, Source tab, sorting, Analytics assistant |
