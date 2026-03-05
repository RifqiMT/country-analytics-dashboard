# User Stories – Country Analytics Platform

Stories are grouped by feature area and mapped to personas from `USER_PERSONAS.md`.

---

## 1. Country Dashboard

### US-1.1 – Select country

- **As a** Regional Strategy Lead  
- **I want to** search and select a country by name or code  
- **So that** I can quickly switch the dashboard focus  

**Acceptance criteria:**
- Search supports partial matches on name, ISO2, and ISO3
- Keyboard navigation (↑/↓/Enter) works in the suggestion list

---

### US-1.2 – See high-level summary

- **As a** Country Economist  
- **I want to** see key financial, demographic, and health metrics for the selected country  
- **So that** I can understand its macro context at a glance  

**Acceptance criteria:**
- Summary shows latest non-null GDP metrics, population, age breakdown, life expectancy
- Economy section shows currency with code and symbol
- Data window clearly indicates the actual years covered

---

### US-1.3 – Adjust year range

- **As an** Analyst  
- **I want to** adjust the year range (start/end)  
- **So that** I can focus on a specific historical window  

**Acceptance criteria:**
- Inputs clamp to the valid global window
- "Full range", "Last 10 years", and "Last 5 years" presets update the dashboard immediately

---

## 2. Time-Series & Charts

### US-2.1 – Switch time frequency

- **As a** Policy Analyst  
- **I want to** toggle between annual and sub-annual frequencies  
- **So that** I can inspect trends with different levels of granularity  

**Acceptance criteria:**
- Frequency switches between weekly, monthly, quarterly, yearly
- Sub-annual views clearly indicate they are interpolated

---

### US-2.2 – Compare metrics on one chart

- **As a** Strategy Lead  
- **I want to** overlay financial, population, and health metrics on a single timeline  
- **So that** I can visually correlate them  

**Acceptance criteria:**
- At least one metric is always active
- Legend and tag toggles align with the selected metrics
- Tooltip shows values with units and period-over-period change

---

### US-2.3 – Understand period-over-period change

- **As a** Market Expansion Manager  
- **I want to** see how much a metric changed since the previous period  
- **So that** I can better judge momentum  

**Acceptance criteria:**
- Tooltip shows % change (WoW/MoM/QoQ/YoY) where previous data exists
- Up/down/flat states are colour-coded and use simple wording

---

## 3. Population & Age Structure

### US-3.1 – See age group breakdown

- **As a** Market Expansion Manager  
- **I want to** see population by age groups (shares and absolute counts)  
- **So that** I can infer product portfolio relevance  

**Acceptance criteria:**
- **Population Structure** section shows timeline of 0–14, 15–64, 65+ as % of total and simplified absolute counts (e.g. 65.2 Mn)
- Frequency dropdown and chart/table view; metric chips to show/hide series
- Tooltip and table show both percentage and absolute with growth (WoW/MoM/QoQ/YoY) where applicable

---

### US-3.2 – See age group trends

- **As a** Country Economist  
- **I want to** see YoY and period-over-period changes in age groups  
- **So that** I can detect ageing or youth bulges  

**Acceptance criteria:**
- Age-group rows in the summary and tables include YoY % where two years are available
- Population Structure timeline shows trends over time with selectable frequency

---

## 4. Country Comparison

### US-4.1 – Compare to global context

- **As a** Regional Strategy Lead  
- **I want to** compare a country's GDP and population to the average country and global total  
- **So that** I can understand its relative weight  

**Acceptance criteria:**
- Comparison card shows selected country, simple average, and global totals for each metric
- YoY lines appear as secondary text under each value

---

### US-4.2 – Toggle extra demographic detail

- **As an** Analyst  
- **I want to** optionally expand age-group comparison rows  
- **So that** I can see more detail without cluttering the default view  

**Acceptance criteria:**
- Core metrics vs "+ Population age breakdown" toggle works without reloading data

---

## 5. Global Analytics – Map

### US-5.1 – Visualise metric on world map

- **As a** Policy Analyst  
- **I want to** colour countries by a selected metric  
- **So that** I can see spatial patterns at a glance  

**Acceptance criteria:**
- Metric selector includes Financial, Demographics, Geography, Government categories
- Countries without data are shown with a neutral colour

---

### US-5.2 – Inspect country details on hover

- **As a** Strategy Lead  
- **I want to** see a tooltip for each country with its metric value, name, and flag  
- **So that** I can answer specific follow-up questions  

**Acceptance criteria:**
- Tooltip shows country name, flag (proportionally on country shape on hover), value, and effective data year
- Map supports zoom in/out and reset
- Tooltip stays in sync with hovered country

---

## 5a. Business Analytics – Correlation Scatter & Causation

### US-5a.1 – Compare two metrics across countries

- **As a** Country Economist or BI Analyst  
- **I want to** open the Business Analytics tab, choose two metrics (X and Y), and see all countries plotted  
- **So that** I can inspect correlation and outliers (e.g. GDP per capita vs life expectancy)  

**Acceptance criteria:**
- X and Y metric selectors offer numeric metrics from the global dataset
- Plot shows all countries as points; selected country (from Country dashboard) is highlighted
- Year selector controls data year for scatter and correlation
- Correlation & causation block shows Pearson r, p-value, interpretation, and causation note with disclaimer

### US-5a.2 – Identify selected country on scatter

- **As a** Strategy Lead  
- **I want to** see the currently selected country highlighted on the correlation scatter in Business Analytics  
- **So that** I can quickly see where it sits relative to others  

**Acceptance criteria:**
- Selected country is visually distinct (e.g. colour/size); other countries use a neutral style
- Changing the country in the Country dashboard updates the highlight when Business Analytics tab is open

### US-5a.3 – Understand correlation and causation

- **As a** Country Economist  
- **I want to** see Pearson correlation (r), p-value, and a short interpretation plus causation/context note  
- **So that** I can assess relationship strength and avoid conflating correlation with causation  

**Acceptance criteria:**
- Correlation block shows r, n, and p-value (when computable)
- Interpretation text and causation disclaimer are visible below the scatter
- Insufficient data (e.g. fewer than 3 countries with both metrics) shows a friendly message

---

## 6. Global Analytics – Tables

### US-6.1 – Rank countries by metric

- **As any** analyst persona  
- **I want to** sort global tables by any metric  
- **So that** I can quickly rank countries  

**Acceptance criteria:**
- Clicking a column header toggles between ascending and descending
- Sorting applies independently within each sub-toggle (General, Financial, Health & demographics)

---

### US-6.2 – Focus on high-level dimensions

- **As a** Strategy Lead  
- **I want to** separate views for general, financial, and health/demographic metrics  
- **So that** tables remain readable  

**Acceptance criteria:**
- Sub-toggles switch between three distinct column layouts
- Each layout has a clear default sort
- Country column shows flag emoji for quick identification

---

### US-6.3 – See YoY at a glance

- **As a** Policy Analyst  
- **I want to** YoY information visible but not overwhelming  
- **So that** I can quickly understand directionality  

**Acceptance criteria:**
- Each numeric cell shows main value (top line) and YoY (secondary line) where applicable
- If YoY cannot be calculated, the line is omitted

---

## 7. Source Tab

### US-7.1 – Search metrics

- **As a** Data/BI Analyst  
- **I want to** search metrics by name, description, formula, or source  
- **So that** I can quickly find relevant definitions  

**Acceptance criteria:**
- Search filters metrics in real time
- Filter chips (World Bank, IMF, REST Countries, Sea Around Us, Marine Regions, ILO, WHO, UN, FAO) filter by data source
- Section "Where metrics and information appear" explains how data is used in Country Dashboard, Global view, PESTEL, Business Analytics, and Analytics Assistant

---

### US-7.2 – Understand metric definitions

- **As a** Country Economist  
- **I want to** see description, formula, and source links for each metric, including country metadata  
- **So that** I can trust and cite the data  

**Acceptance criteria:**
- Each metric card shows label, description, formula (if applicable), unit
- Categories include Financial, Population, Health, Geography, **Country metadata & context** (region, income level, government type, head of government, capital, currency)
- Source links open in new tab with external-link icon

---

## 8. Analytics Assistant

### US-8.1 – Ask questions about metrics and methodology

- **As a** Data/BI Analyst  
- **I want to** ask natural-language questions about metrics, sources, and methodology  
- **So that** I can get quick answers without leaving the app  

**Acceptance criteria:**
- Assistant answers questions about metric definitions, formulas, and data sources
- When API key is set, LLM provides contextual answers
- When no API key, rule-based fallback answers methodology and data-style questions

---

### US-8.2 – Get rankings and comparisons

- **As a** Regional Strategy Lead  
- **I want to** ask "top N countries by X" or "compare X to Y"  
- **So that** I can get ranked lists and side-by-side comparisons  

**Acceptance criteria:**
- Rankings return real data (e.g. top 10 by GDP per capita), not "metrics available"
- Comparisons return side-by-side data for requested countries, not "X vs world"
- Fallback mode supports rankings and comparisons without LLM

---

### US-8.3 – Use quick-start suggestions

- **As a** Market Expansion Manager  
- **I want to** click a suggestion chip to ask a common question  
- **So that** I can get started without typing  

**Acceptance criteria:**
- Suggestion chips (e.g. "Compare Indonesia to Malaysia") populate the input and send on click
- Suggestions cover overview, comparison, rankings, and methodology

---

### US-8.4 – See source attribution for each answer

- **As a** Country Economist  
- **I want to** see which source produced each assistant response  
- **So that** I can assess answer provenance and trust  

**Acceptance criteria:**
- Each assistant message displays a source line: "Dashboard data", model label (e.g. Llama 3.3 70B), or "Web search"
- Source reflects year-based routing: Groq for period ≤ current year − 2, Tavily for recent/current

---

### US-8.5 – Configure model and API key

- **As an** Analyst  
- **I want to** choose the LLM model and optionally provide my own API key  
- **So that** I can use the assistant with my preferred setup  

**Acceptance criteria:**
- Model dropdown: multiple providers and tiers (Best, Balanced, Fast), including **Tavily Web Search**
- Settings panel allows API key input (stored in localStorage per provider)
- Tavily Web Search uses server key; no client key needed

---

### US-8.6 – Get real-time answers for current period

- **As a** Strategy Lead  
- **I want to** ask about current leaders or recent events (e.g. "who is the president now")  
- **So that** I get up-to-date answers from web search  

**Acceptance criteria:**
- Questions about period after current year − 2 (or "now") use Tavily (web search) first
- Questions about period ≤ current year − 2 use Groq
- Selecting Tavily Web Search as model forces web search for all general-knowledge queries

---

## 9. PESTEL

### US-9.1 – Generate PESTEL analysis for selected country

- **As a** Strategy Lead or Country Economist  
- **I want to** open the PESTEL tab and generate a PESTEL (Political, Economic, Social, Technological, Environmental, Legal) analysis for the selected country  
- **So that** I can use it in reports or strategy discussions  

**Acceptance criteria:**
- PESTEL tab shows current country; user can trigger generate/refresh
- Output is structured in this order: PESTEL Analysis (chart), SWOT Analysis (one bullet per sentence), Comprehensive Analysis, Strategic Implications for Business (PESTEL-SWOT), New Market Analysis, Key Takeaways, Recommendations
- New Market Analysis, Key Takeaways, and Recommendations each contain at least 5 bullet points
- Where applicable, responses include sources and hyperlinks

### US-9.2 – Use PESTEL with country context

- **As a** BI Analyst  
- **I want to** have PESTEL generation use the same country as the Country dashboard  
- **So that** I don’t have to re-select the country  

**Acceptance criteria:**
- Changing the country in the Country dashboard updates the context for PESTEL; user can refresh to regenerate for the new country

---

## 10. Reliability and Data Quality

### US-10.1 – Handle missing data gracefully

- **As any** user  
- **I do not want** the app to error or show confusing outputs when data is missing  

**Acceptance criteria:**
- "–" is shown for missing values; no broken charts or NaN
- For global metrics, loader falls back to earlier years when a year is completely empty
- Territories with no WB data use IMF or parent-country fallbacks where applicable
- Taiwan appears in country list with synthetic entry; metrics use fallback (e.g. parent or regional medians) when WDI has no direct data

---

### US-10.2 – Communicate methodology

- **As a** Data/BI Analyst  
- **I want to** understand at a high level how metrics are computed  
- **So that** I can trust and re-use them  

**Acceptance criteria:**
- README and PRD document indicator codes, date ranges, and fallback rules
- Source tab provides per-metric documentation with API links
