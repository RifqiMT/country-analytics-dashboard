## Product Requirements Document (PRD) – Country Analytics Platform

### 1. Problem statement

Decision‑makers, analysts, and researchers often need to compare countries across **financial**, **demographic**, and **basic health** dimensions. Public data is available (e.g. World Bank, UN, WHO) but:

- The raw APIs and downloads are fragmented and difficult to use.
- Combining indicators, deriving YoY changes, and building visual comparisons is time‑consuming.
- Many tools are either too simple (static charts) or too complex (full BI suites).

The **Country Analytics Platform** provides a focused, opinionated UI to:

- Explore a single country in depth.
- Compare that country to an average country and global aggregates.
- Rank and compare all countries using a consistent set of metrics.

---

### 2. Goals and non‑goals

#### 2.1 Goals

- **G1 – Fast insight for a single country**
  - Present a clean, high‑level summary of financial, demographic, and health metrics.
  - Make YoY deltas and structural composition (age groups) immediately visible.

- **G2 – Intuitive global comparison**
  - Enable sorting and ranking across all countries for key metrics.
  - Provide a global view by map and tables with consistent definitions.

- **G3 – Credible and explainable data**
  - Use only well‑documented public sources (World Bank WDI, REST Countries).
  - Clearly communicate data ranges, gaps, and fallbacks.

- **G4 – Analyst‑friendly UX**
  - Smooth time navigation (year range, sub‑annual interpolation).
  - Exportable insights via clear visuals and consistent formatting.

#### 2.2 Non‑goals (for this version)

- No user authentication, multi‑tenant features, or saved workspaces.
- No offline mode or CSV export from the UI.
- No in‑app ETL across multiple primary providers (e.g. merging IMF + OECD + national statistics); the current implementation focuses on **World Bank WDI** as source of truth.

---

### 3. Personas (summary)

See `USER_PERSONAS.md` for full detail.

- **P1 – Regional Strategy Lead (primary)**
  - Needs quick comparisons across countries and regions for planning and board reports.
- **P2 – Country Economist / Policy Analyst**
  - Needs to understand structural trends and build narratives around GDP, demographics, and health.
- **P3 – Corporate Market Expansion Manager**
  - Wants to evaluate market size, growth, and demographic structure for prioritisation.
- **P4 – Data / BI Analyst**
  - Uses the app for quick exploration before moving to a BI tool or notebook.

---

### 4. Scope and features

#### 4.1 Country dashboard

**4.1.1 Summary header**

- **Inputs**:
  - Selected country (ISO2; default `ID` – Indonesia).
  - Selected year range (defaults: 2000 to `DATA_MAX_YEAR`).
- **Outputs**:
  - Country name, ISO2, ISO3, flag, region, income level, capital city.
  - Data window text (e.g. “2000–2024”), based on actual available years.
  - **General**:
    - Timezone (from REST Countries).
    - Currency (name, code, symbol).
    - Land area & total area (latest non‑null values).
  - **Financial metrics** (latest non‑null up to end year):
    - GDP Nominal, GDP PPP, GDP per capita (Nominal), GDP per capita (PPP).
    - YoY % computed over the last two available annual points for each metric.
  - **Health & demographics**:
    - Total population + YoY.
    - Life expectancy at birth + YoY.
    - 0–14, 15–64, 65+: percentage of population and absolute values + YoY (based on share series).

**4.1.2 Year range filter**

- Editable **Start** and **End** year fields:
  - Clamped to `[DATA_MIN_YEAR, DATA_MAX_YEAR]`.
  - Start cannot exceed End; End cannot precede Start.
  - Commit on Enter or blur (debounced behaviour to avoid excessive network calls).
- Preset pills:
  - **Full range** – `startYear = DATA_MIN_YEAR`, `endYear = DATA_MAX_YEAR`.
  - **Last 10 years** – if available, otherwise clamped to earliest year.
  - **Last 5 years** – similar logic.

**4.1.3 Unified time‑series timeline**

- Metrics:
  - Financial: GDP Nominal, GDP PPP, GDP per capita (Nominal), GDP per capita (PPP).
  - Demographic: Population (total).
  - Health: Life expectancy.
- Frequency toggle:
  - Weekly, monthly, quarterly, annual.
  - Non‑annual frequencies use interpolated points from the annual series.
- Behaviour:
  - Users can toggle metric chips on/off; at least one series must remain selected.
  - Tooltip (per x‑value) shows:
    - Metric label and compact value.
    - Period‑over‑period change:
      - WoW / MoM / QoQ / YoY depending on frequency.
      - Categorised as up / down / flat and colour‑coded.
  - X‑axis labels adapt to frequency (e.g. `Jan 2024`, `Q1 2024`, `2008`).

**4.1.4 Population pie & details**

- Shows population breakdown for **latest snapshot year**:
  - 0–14, 15–64, 65+ as slices with % and absolute counts.
  - Legend styled with Indonesian palette, clear labels, and compact number formatting.

**4.1.5 Country comparison card**

- Year = latest snapshot year.
- Rows:
  - GDP Nominal, GDP PPP, GDP per capita (Nominal), GDP per capita (PPP), Total population.
  - Optional block: age‑group populations (0–14, 15–64, 65+) toggled via “Core metrics” vs “+ Population age breakdown”.
- For each metric:
  - Columns: Selected country level, Selected country YoY, Average country level + YoY, Global total level + YoY.
  - YoY computed using:
    - Selected country: from its series.
    - Avg / Global: aggregated across all available countries (`GlobalCountryMetricsRow`) between current and previous year.

---

### 5. Global analytics

#### 5.1 Global view – common behaviour

- **Year filter**:
  - Numeric input with clamping to `[DATA_MIN_YEAR, DATA_MAX_YEAR]`.
  - Debounced commit on blur or Enter.
  - Independent of the country dashboard year range.

- **Main tabs**:
  - `Map` vs `Global table` – **filters are decoupled** from country dashboard.

#### 5.2 Global map

- Metric selector:
  - GDP Nominal, GDP PPP, GDP per capita (Nominal), GDP per capita (PPP), Population total.
- Behaviour:
  - Choropleth shading based on data quantiles or min–max per selected metric.
  - Tooltip shows:
    - Country name (World Bank / REST Countries canonical name).
    - Flag via ISO2 code.
    - Selected metric value (compact format).
    - Effective year used (handles year fallback for missing data).
  - Map does **not** sync country selection or filters with the country dashboard.

#### 5.3 Global tables

All tables:

- One row per **country** (no aggregates or regions).
- Fully sortable: clicking a header toggles between asc/desc; default sort per view:
  - General: total area descending.
  - Financial: GDP Nominal descending.
  - Health & demographics: total population descending.
- Display values use compact formatting (k, Mn, Bn, Tn) and stacked **YoY** where applicable.

**5.3.1 General table**

- Columns:
  - Country, Code, Total area (km²).
- Data:
  - `totalAreaKm2` from surface area (`AG.SRF.TOTL.K2`) or land area fallback (`AG.LND.TOTL.K2`).
  - No YoY (area is treated as static; latest non‑null per country).

**5.3.2 Financial table**

- Columns:
  - Country, Code, GDP Nominal, GDP PPP, GDP / Capita, GDP / Capita PPP.
- For each metric:
  - Main value: current year.
  - Secondary line: YoY % based on previous year where available.

**5.3.3 Health & demographics table**

- Columns:
  - Country, Code, Pop total, Pop 0–14, Pop 15–64, Pop 65+, Life expectancy.
- Population metrics:
  - Absolute counts derived from total population and age‑group % shares for the selected year.
  - YoY % for total and each age group (based on change in counts).
- Life expectancy:
  - Uses the latest non‑null value from WDI for each country (static across years).
  - YoY is only shown where two consecutive annual values exist; otherwise omitted.

---

### 6. Data rules and edge cases

- **Missing years**:
  - If a specific year has no data at all for a metric, the global loader:
    - Steps backwards (`year‑1`, `year‑2`, …) until it finds a year with data, within `[DATA_MIN_YEAR, DATA_MAX_YEAR]`.
  - Charts and tables always show the **effective year** where data came from.

- **Countries without data**:
  - Countries with no relevant data for a metric are still listed but show `–`.
  - Sorting puts rows with null values at the bottom when sorting descending.

- **Country naming**:
  - `PSE` (West Bank and Gaza) is normalised to **“Palestine (West Bank and Gaza)”**.
  - Taiwan is not included because the World Bank does not provide full WDI coverage; integrating other providers is out of scope for this version (see future work).

---

### 7. Non‑functional requirements

- **Performance**
  - Initial country dashboard load in < 2.5s on a typical broadband connection.
  - Global tables load in < 3s for any valid year, assuming World Bank API responsiveness.
  - UI interactions (filters, toggles) should feel instantaneous; use debouncing around year inputs.

- **Resilience**
  - Network failures should show friendly error banners, not blank screens.
  - Partial data:
    - Components must handle `null` and missing metrics gracefully.
    - Never crash on undefined series; show “–” where needed.

- **Accessibility**
  - Sufficient contrast with the light Indonesian palette (white background, strong text colours).
  - Keyboard navigation for:
    - Country search suggestions.
    - Toggle buttons and pills.

---

### 8. Future work (not yet implemented)

- Export capabilities (CSV / image export for charts and tables).
- Multi‑metric correlation views (scatterplots between GDP per capita and life expectancy, etc.).
- Additional data providers (IMF, OECD, WHO detailed health metrics) and an ETL layer that merges indicators with explicit precedence rules.
- Saved dashboards and sharing links with predefined filters and countries.

